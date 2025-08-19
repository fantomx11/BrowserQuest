import * as url from 'url';
import * as http from 'http';
import * as websocket from 'websocket';
import { Utils } from './Utils';
import * as miksagoConnection from 'websocket-server/lib/ws/connection';
import * as wsserver from 'ws';

// Placeholders for external types
declare const log: any;

// Use a namespace to group our WebSocket classes
export namespace WS {

  // --- Abstract Base Classes ---

  export abstract class Server {
    protected port: number;
    protected connections: Record<number, Connection> = {};
    protected connectionCallback?: (connection: Connection) => void;
    protected errorCallback?: (...args: any[]) => void;

    constructor(port: number) {
      this.port = port;
    }

    onConnect(callback: (connection: Connection) => void): void {
      this.connectionCallback = callback;
    }

    onError(callback: (...args: any[]) => void): void {
      this.errorCallback = callback;
    }

    abstract broadcast(message: any): void;

    forEachConnection(callback: (connection: Connection) => void): void {
      Object.values(this.connections).forEach(callback);
    }

    addConnection(connection: Connection): void {
      this.connections[connection.id] = connection;
    }

    removeConnection(id: number): void {
      delete this.connections[id];
    }

    getConnection(id: number): Connection | undefined {
      return this.connections[id];
    }
  }


  export abstract class Connection {
    public id: number;

    protected connection: any;
    protected server: Server;
    protected closeCallback?: () => void;
    protected listenCallback?: (message: any) => void;

    constructor(id: number, connection: any, server: Server) {
      this.id = id;
      this.connection = connection;
      this.server = server;
    }

    onClose(callback: () => void): void {
      this.closeCallback = callback;
    }

    listen(callback: (message: any) => void): void {
      this.listenCallback = callback;
    }

    abstract broadcast(message: any): void;

    abstract send(message: any): void;

    abstract sendUTF8(data: string): void;

    close(logError: string): void {
      log.info(`Closing connection to ${this.connection.remoteAddress}. Error: ${logError}`);
      this.connection.close();
    }
  }

  // --- Concrete Server and Connection Implementations ---

  export class MultiVersionWebsocketServer extends Server {
    private worlizeServerConfig: websocket.IBaseConfig = {
      maxReceivedFrameSize: 0x10000,
      maxReceivedMessageSize: 0x100000,
      fragmentOutgoingMessages: true,
      fragmentationThreshold: 0x4000,
      keepalive: true,
      keepaliveInterval: 20000,
      assembleFragments: true,
      disableNagleAlgorithm: true,
      closeTimeout: 5000,
      httpServer: null,
    };
    private httpServer: http.Server;
    private miksagoServer: wsserver.Server;
    private counter: number = 0;
    private statusCallback?: () => string;

    constructor(port: number) {
      super(port);

      this.httpServer = http.createServer((request, response) => {
        const pathname = url.parse(request.url || '').pathname;
        if (pathname === '/status' && this.statusCallback) {
          response.writeHead(200);
          response.write(this.statusCallback());
        } else {
          response.writeHead(404);
        }
        response.end();
      });

      this.httpServer.listen(port, () => {
        log.info(`Server is listening on port ${port}`);
      });

      this.miksagoServer = wsserver.createServer();
      this.miksagoServer.server = this.httpServer;
      this.miksagoServer.addListener('connection', (connection: miksagoConnection) => {
        (connection as any).remoteAddress = connection._socket.remoteAddress;
        (connection as any).sendUTF = connection.send;
        const c = new miksagoWebSocketConnection(this.createId(), connection, this);

        if (this.connectionCallback) {
          this.connectionCallback(c);
        }
        this.addConnection(c);
      });

      this.httpServer.on('upgrade', (req, socket, head) => {
        const secWebSocketVersion = req.headers['sec-websocket-version'] as string;
        if (typeof secWebSocketVersion !== 'undefined') {
          const wsRequest = new websocket.request(socket, req, this.worlizeServerConfig);
          try {
            wsRequest.readHandshake();
            const wsConnection = wsRequest.accept(wsRequest.requestedProtocols[0], wsRequest.origin);
            const c = new worlizeWebSocketConnection(this.createId(), wsConnection, this);

            if (this.connectionCallback) {
              this.connectionCallback(c);
            }
            this.addConnection(c);
          } catch (e: any) {
            console.log(`WebSocket Request unsupported by WebSocket-Node: ${e.toString()}`);
            return;
          }
        } else {
          if (req.method === 'GET' && req.headers.upgrade?.toLowerCase() === 'websocket' && req.headers.connection?.toLowerCase() === 'upgrade') {
            new miksagoConnection(this.miksagoServer.manager, this.miksagoServer.options, req, socket, head);
          }
        }
      });
    }

    private createId(): number {
      return parseInt(`5${Utils.random(99)}${this.counter++}`);
    }

    broadcast(message: any): void {
      this.forEachConnection(connection => {
        connection.send(message);
      });
    }

    onRequestStatus(callback: () => string): void {
      this.statusCallback = callback;
    }
  }


  export class worlizeWebSocketConnection extends Connection {
    constructor(id: number, connection: any, server: Server) {
      super(id, connection, server);

      this.connection.on('message', (message: { type: string, utf8Data: string }) => {
        if (this.listenCallback) {
          if (message.type === 'utf8') {
            try {
              this.listenCallback(JSON.parse(message.utf8Data));
            } catch (e) {
              if (e instanceof SyntaxError) {
                this.close('Received message was not valid JSON.');
              } else {
                throw e;
              }
            }
          }
        }
      });

      this.connection.on('close', () => {
        if (this.closeCallback) {
          this.closeCallback();
        }
        this.server.removeConnection(this.id);
      });
    }

    broadcast(message: any): void {
      this.server.broadcast(message);
    }

    send(message: any): void {
      let data: string;
      data = JSON.stringify(message);
      this.sendUTF8(data);
    }

    sendUTF8(data: string): void {
      this.connection.sendUTF(data);
    }
  }


  export class miksagoWebSocketConnection extends Connection {
    constructor(id: number, connection: any, server: Server) {
      super(id, connection, server);

      this.connection.addListener('message', (message: string) => {
        if (this.listenCallback) {
          try {
            this.listenCallback(JSON.parse(message));
          } catch (e: any) {
            this.close(`Received message was not valid JSON: ${message}`);
          }
        }
      });

      this.connection.on('close', () => {
        if (this.closeCallback) {
          this.closeCallback();
        }
        this.server.removeConnection(this.id);
      });
    }

    broadcast(message: any): void {
      this.server.broadcast(message);
    }

    send(message: any): void {
      let data: string;
      data = JSON.stringify(message);
      this.sendUTF8(data);
    }

    sendUTF8(data: string): void {
      this.connection.send(data);
    }
  }
}