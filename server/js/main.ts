import * as fs from 'fs';
import * as path from 'path';
import { Metrics } from './Metrics';
import { MultiVersionWebsocketServer } from './ws';
import { World } from './Worldserver';
import { Player } from './Player';

// Define interfaces for better type safety
interface Config {
    port: number;
    metrics_enabled: boolean;
    debug_level: 'error' | 'debug' | 'info';
    nb_players_per_world: number;
    map_filepath: string;
    nb_worlds: number;
}

interface WorldWithPlayerCount extends World {
    playerCount: number;
    updatePopulation: (totalPlayers?: number) => void;
}

function getWorldDistribution(worlds: WorldWithPlayerCount[]): number[] {
    return worlds.map(world => world.playerCount);
}

function getConfigFile(filePath: string): Promise<Config> {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, jsonString) => {
            if (err) {
                console.error('Could not open config file:', err.path);
                reject(err);
            } else {
                try {
                    const config: Config = JSON.parse(jsonString);
                    resolve(config);
                } catch (parseError) {
                    console.error('Error parsing config file:', parseError);
                    reject(parseError);
                }
            }
        });
    });
}

async function main(config: Config): Promise<void> {
    const server = new MultiVersionWebsocketServer(config.port);
    const metrics = config.metrics_enabled ? new Metrics(config) : null;
    const worlds: WorldWithPlayerCount[] = [];
    let lastTotalPlayers = 0;

    const log = new Log(Log.INFO); // Default to info
    switch (config.debug_level) {
        case 'error':
            log.level = Log.ERROR;
            break;
        case 'debug':
            log.level = Log.DEBUG;
            break;
        case 'info':
            log.level = Log.INFO;
            break;
    }
    
    // Check population every second
    if (metrics) {
        setInterval(() => {
            if (metrics.isReady) {
                metrics.getTotalPlayers(totalPlayers => {
                    if (totalPlayers !== lastTotalPlayers) {
                        lastTotalPlayers = totalPlayers;
                        worlds.forEach(world => world.updatePopulation(totalPlayers));
                    }
                });
            }
        }, 1000);
    }
    
    log.info('Starting BrowserQuest game server...');
    
    server.onConnect(connection => {
        let worldToJoin: WorldWithPlayerCount | undefined;
        
        const connect = () => {
            if (worldToJoin) {
                if (worldToJoin.connect_callback) {
                    worldToJoin.connect_callback(new Player(connection, worldToJoin));
                }
            }
        };

        if (metrics) {
            metrics.getOpenWorldCount(openWorldCount => {
                const openWorlds = worlds.slice(0, openWorldCount);
                worldToJoin = openWorlds.reduce((leastPopulated, currentWorld) => 
                    (currentWorld.playerCount < leastPopulated.playerCount) ? currentWorld : leastPopulated, openWorlds[0]);
                connect();
            });
        } else {
            worldToJoin = worlds.find(world => world.playerCount < config.nb_players_per_world);
            
            if (worldToJoin) {
                worldToJoin.updatePopulation();
                connect();
            }
        }
    });

    server.onError((...args: any[]) => {
        log.error(args.join(', '));
    });
    
    const onPopulationChange = async () => {
        if (metrics) {
            metrics.updatePlayerCounters(worlds, totalPlayers => {
                worlds.forEach(world => world.updatePopulation(totalPlayers));
            });
            metrics.updateWorldDistribution(getWorldDistribution(worlds));
        }
    };

    // Create all worlds
    for (let i = 0; i < config.nb_worlds; i++) {
        const world = new World(`world${i + 1}`, config.nb_players_per_world, server);
        world.run(config.map_filepath);
        worlds.push(world as WorldWithPlayerCount);
        
        if (metrics) {
            world.onPlayerAdded(onPopulationChange);
            world.onPlayerRemoved(onPopulationChange);
        }
    }
    
    server.onRequestStatus(() => {
        return JSON.stringify(getWorldDistribution(worlds));
    });
    
    if (config.metrics_enabled) {
        metrics?.ready(() => {
            onPopulationChange();
        });
    }
    
    process.on('uncaughtException', (e: Error) => {
        log.error('uncaughtException: ' + e.message);
    });
}

// Main execution block
const defaultConfigPath = './server/config.json';
const customConfigPath = process.argv[2] || './server/config_local.json';

(async () => {
    try {
        const localConfig = await getConfigFile(customConfigPath);
        await main(localConfig);
    } catch (localError) {
        try {
            const defaultConfig = await getConfigFile(defaultConfigPath);
            await main(defaultConfig);
        } catch (defaultError) {
            console.error('Server cannot start without a valid configuration file.');
            process.exit(1);
        }
    }
})();