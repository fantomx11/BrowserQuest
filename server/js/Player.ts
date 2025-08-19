// Imports
import { Character } from "./Character";
import { Messages } from "./Message";
import { Utils } from "./Utils";
import { Properties } from "./Properties";
import { Formulas } from "./Formulas";
import { Checkpoint } from "./Checkpoint";
import { Types } from "../../shared/js/gametypes";
import { Mob } from "./Mob";

// Placeholders for external types
interface WorldServer {
    addPlayer: (player: Player) => void;
    enter_callback: (player: Player) => void;
    pushSpawnsToPlayer: (player: Player, message: number[]) => void;
    isValidPosition: (x: number, y: number) => boolean;
    handleMobHate: (mobId: number, playerId: number, hatePoints: number) => void;
    getEntityById: (id: number | string) => any;
    broadcastAttacker: (player: Player) => void;
    handleHurtEntity: (entity: Character, attacker?: Character, damage?: number) => void;
    pushToPlayer: (player: Player, message: Messages.Message<any>) => void;
    map: {
        getCheckpoint: (id: string) => Checkpoint | undefined;
        getRandomStartingPosition: () => any;
    };
    pushRelevantEntityListTo: (player: Player) => void;
}

interface Connection {
    id: number;
    listen: (callback: (message: any[]) => void) => void;
    onClose: (callback: () => void) => void;
    send: (message: any) => void;
    sendUTF8: (message: string) => void;
    close: (reason: string) => void;
}

// A placeholder for the log and format checker objects
declare const log: any;
declare function check(message: any[]): boolean;
declare class FormatChecker {}

export class Player extends Character {
    public hasEnteredGame: boolean;
    public isDead: boolean;
    public lastCheckpoint: Checkpoint | null;
    public name: string;
    public armor: number;
    public weapon: number;
    public armorLevel: number;
    public weaponLevel: number;
    public recentlyLeftGroups: string[] = [];

    private server: WorldServer;
    private connection: Connection;
    private haters: Record<number, Mob>;
    private formatChecker: FormatChecker;
    private disconnectTimeout: NodeJS.Timeout | null = null;
    private firepotionTimeout: NodeJS.Timeout | null = null;

    // Callbacks
    private moveCallback?: (x: number, y: number) => void;
    private lootMoveCallback?: (x: number, y: number) => void;
    private zoneCallback?: () => void;
    private messageCallback?: (message: any[]) => void;
    private broadcastCallback?: (message: Messages.Message<any>, ignoreSelf: boolean) => void;
    private broadcastZoneCallback?: (message: Messages.Message<any>, ignoreSelf: boolean) => void;
    private exitCallback?: () => void;
    private requestPositionCallback?: () => any;

    constructor(connection: Connection, worldServer: WorldServer) {
        super(connection.id, "player", Types.Entities.WARRIOR, 0, 0);
        
        this.server = worldServer;
        this.connection = connection;
        this.name = "";
        this.armor = 0;
        this.weapon = 0;
        this.armorLevel = 0;
        this.weaponLevel = 0;
        this.hasEnteredGame = false;
        this.isDead = false;
        this.haters = {};
        this.lastCheckpoint = null;
        this.formatChecker = new FormatChecker();
        
        this.connection.listen(message => {
            const action = parseInt(message[0], 10);
            
            log.debug(`Received: ${message}`);
            if (!check(message)) {
                this.connection.close(`Invalid ${Types.getMessageTypeAsString(action)} message format: ${message}`);
                return;
            }
            
            if (!this.hasEnteredGame && action !== Types.Messages.HELLO) {
                this.connection.close(`Invalid handshake message: ${message}`);
                return;
            }
            if (this.hasEnteredGame && !this.isDead && action === Types.Messages.HELLO) {
                this.connection.close(`Cannot initiate handshake twice: ${message}`);
                return;
            }
            
            this.resetTimeout();
            
            if (action === Types.Messages.HELLO) {
                const sanitizedName = Utils.sanitize(message[1]);
                this.name = (sanitizedName === "") ? "lorem ipsum" : sanitizedName.substring(0, 15);
                
                this.kind = Types.Entities.WARRIOR;
                this.armor = message[2];
                this.weapon = message[3];
                this.equipArmor(this.armor);
                this.equipWeapon(this.weapon);
                this.orientation = Utils.randomOrientation();
                this.updateHitPoints();
                this.updatePosition();
                
                this.server.addPlayer(this);
                this.server.enter_callback(this);

                this.send(new Messages.Welcome(this.id, this.name, this.x, this.y, this.hitPoints).serialize());
                this.hasEnteredGame = true;
                this.isDead = false;
            }
            else if (action === Types.Messages.WHO) {
                const entityIds = message.slice(1).map((id: string) => parseInt(id, 10));
                this.server.pushSpawnsToPlayer(this, entityIds);
            }
            else if (action === Types.Messages.ZONE) {
                this.zoneCallback?.();
            }
            else if (action === Types.Messages.CHAT) {
                const msg = Utils.sanitize(message[1]);
                if (msg && msg !== "") {
                    const truncatedMsg = msg.substring(0, 60);
                    this.broadcastToZone(new Messages.Chat(this, truncatedMsg), false);
                }
            }
            else if (action === Types.Messages.MOVE) {
                const x = message[1];
                const y = message[2];
                
                if (this.server.isValidPosition(x, y)) {
                    this.setPosition(x, y);
                    this.clearTarget();
                    
                    this.broadcast(new Messages.Move(this));
                    this.moveCallback?.(this.x, this.y);
                }
            }
            else if (action === Types.Messages.LOOTMOVE) {
                const x = message[1];
                const y = message[2];
                const itemId = message[3];

                const item = this.server.getEntityById(itemId);
                if (item) {
                    this.setPosition(x, y);
                    this.clearTarget();
                    this.broadcast(new Messages.LootMove(this, item));
                    this.lootMoveCallback?.(this.x, this.y);
                }
            }
            else if (action === Types.Messages.AGGRO) {
                const mobId = message[1];
                this.server.handleMobHate(mobId, this.id, 5);
            }
            else if (action === Types.Messages.ATTACK) {
                const mob = this.server.getEntityById(message[1]);
                if (mob) {
                    this.setTarget(mob);
                    this.server.broadcastAttacker(this);
                }
            }
            else if (action === Types.Messages.HIT) {
                const mob = this.server.getEntityById(message[1]);
                if (mob) {
                    const dmg = Formulas.dmg(this.weaponLevel, mob.armorLevel);
                    if (dmg > 0) {
                        mob.receiveDamage(dmg, this.id);
                        this.server.handleMobHate(mob.id, this.id, dmg);
                        this.server.handleHurtEntity(mob, this, dmg);
                    }
                }
            }
            else if (action === Types.Messages.HURT) {
                const mob = this.server.getEntityById(message[1]);
                if (mob && this.hitPoints > 0) {
                    this.hitPoints -= Formulas.dmg(mob.weaponLevel, this.armorLevel);
                    this.server.handleHurtEntity(this);
                    
                    if (this.hitPoints <= 0) {
                        this.isDead = true;
                        if (this.firepotionTimeout) {
                            clearTimeout(this.firepotionTimeout);
                        }
                    }
                }
            }
            else if (action === Types.Messages.LOOT) {
                const item = this.server.getEntityById(message[1]);
                
                if (item) {
                    const kind = item.kind;
                    if (Types.isItem(kind)) {
                        this.broadcast(item.despawn());
                        this.server.removeEntity(item);
                        
                        if (kind === Types.Entities.FIREPOTION) {
                            this.updateHitPoints();
                            this.broadcast(this.equip(Types.Entities.FIREFOX));
                            this.firepotionTimeout = setTimeout(() => {
                                this.broadcast(this.equip(this.armor));
                                this.firepotionTimeout = null;
                            }, 15000);
                            this.send(new Messages.HitPoints(this.maxHitPoints).serialize());
                        } else if (Types.isHealingItem(kind)) {
                            let amount = 0;
                            switch (kind) {
                                case Types.Entities.FLASK: 
                                    amount = 40;
                                    break;
                                case Types.Entities.BURGER: 
                                    amount = 100;
                                    break;
                            }
                            
                            if (!this.hasFullHealth()) {
                                this.regenHealthBy(amount);
                                this.server.pushToPlayer(this, this.health());
                            }
                        } else if (Types.isArmor(kind) || Types.isWeapon(kind)) {
                            this.equipItem(item);
                            this.broadcast(this.equip(kind));
                        }
                    }
                }
            }
            else if (action === Types.Messages.TELEPORT) {
                const x = message[1];
                const y = message[2];
                
                if (this.server.isValidPosition(x, y)) {
                    this.setPosition(x, y);
                    this.clearTarget();
                    
                    this.broadcast(new Messages.Teleport(this));
                    
                    this.server.handlePlayerVanish(this);
                    this.server.pushRelevantEntityListTo(this);
                }
            }
            else if (action === Types.Messages.OPEN) {
                const chest = this.server.getEntityById(message[1]);
                if (chest instanceof Chest) {
                    this.server.handleOpenedChest(chest, this);
                }
            }
            else if (action === Types.Messages.CHECK) {
                const checkpoint = this.server.map.getCheckpoint(message[1]);
                if (checkpoint) {
                    this.lastCheckpoint = checkpoint;
                }
            }
            else {
                this.messageCallback?.(message);
            }
        });
        
        this.connection.onClose(() => {
            if (this.firepotionTimeout) {
                clearTimeout(this.firepotionTimeout);
            }
            if (this.disconnectTimeout) {
                clearTimeout(this.disconnectTimeout);
            }
            this.exitCallback?.();
        });
        
        this.connection.sendUTF8("go");
        this.resetTimeout();
    }
    
    public destroy(): void {
        super.destroy();

        // Clear attackers
        Object.values(this.attackers).forEach(mob => {
            mob.clearTarget();
        });
        this.attackers = {};
        
        // Clear haters
        Object.values(this.haters).forEach(mob => {
            mob.forgetPlayer(this.id, 0);
        });
        this.haters = {};
    }
    
    public getState(): any[] {
        const baseState = this.getBaseState();
        const playerState = [this.name, this.orientation, this.armor, this.weapon];

        if (this.target !== null) {
            playerState.push(this.target);
        }
        
        return baseState.concat(playerState);
    }
    
    public send(message: any): void {
        this.connection.send(message);
    }
    
    public broadcast(message: Messages.Message<any>, ignoreSelf: boolean = true): void {
        this.broadcastCallback?.(message, ignoreSelf);
    }
    
    public broadcastToZone(message: Messages.Message<any>, ignoreSelf: boolean = true): void {
        this.broadcastZoneCallback?.(message, ignoreSelf);
    }
    
    public onExit(callback: () => void): void {
        this.exitCallback = callback;
    }
    
    public onMove(callback: (x: number, y: number) => void): void {
        this.moveCallback = callback;
    }
    
    public onLootMove(callback: (x: number, y: number) => void): void {
        this.lootMoveCallback = callback;
    }
    
    public onZone(callback: () => void): void {
        this.zoneCallback = callback;
    }
    
    public onMessage(callback: (message: any[]) => void): void {
        this.messageCallback = callback;
    }
    
    public onBroadcast(callback: (message: Messages.Message<any>, ignoreSelf: boolean) => void): void {
        this.broadcastCallback = callback;
    }
    
    public onBroadcastToZone(callback: (message: Messages.Message<any>, ignoreSelf: boolean) => void): void {
        this.broadcastZoneCallback = callback;
    }
    
    public equip(kind: number): Messages.EquipItem {
        return new Messages.EquipItem(this, kind);
    }
    
    public addHater(mob: Mob): void {
        if (mob) {
            if (!(mob.id in this.haters)) {
                this.haters[mob.id] = mob;
            }
        }
    }
    
    public removeHater(mob: Mob): void {
        if (mob && mob.id in this.haters) {
            delete this.haters[mob.id];
        }
    }
    
    public forEachHater(callback: (mob: Mob) => void): void {
        Object.values(this.haters).forEach(callback);
    }
    
    public equipArmor(kind: number): void {
        this.armor = kind;
        this.armorLevel = Properties.getArmorLevel(kind) || 0;
    }
    
    public equipWeapon(kind: number): void {
        this.weapon = kind;
        this.weaponLevel = Properties.getWeaponLevel(kind) || 0;
    }
    
    public equipItem(item: Item): void {
        if (item) {
            log.debug(`${this.name} equips ${Types.getKindAsString(item.kind)}`);
            
            if (Types.isArmor(item.kind)) {
                this.equipArmor(item.kind);
                this.updateHitPoints();
                this.send(new Messages.HitPoints(this.maxHitPoints).serialize());
            } else if (Types.isWeapon(item.kind)) {
                this.equipWeapon(item.kind);
            }
        }
    }
    
    public updateHitPoints(): void {
        this.resetHitPoints(Formulas.hp(this.armorLevel));
    }
    
    public updatePosition(): void {
        if (this.requestPositionCallback) {
            const pos = this.requestPositionCallback();
            if (pos) {
                this.setPosition(pos.x, pos.y);
            }
        }
    }
    
    public onRequestPosition(callback: () => any): void {
        this.requestPositionCallback = callback;
    }
    
    public resetTimeout(): void {
        if (this.disconnectTimeout) {
            clearTimeout(this.disconnectTimeout);
        }
        this.disconnectTimeout = setTimeout(this.timeout.bind(this), 1000 * 60 * 15);
    }
    
    public timeout(): void {
        this.connection.sendUTF8("timeout");
        this.connection.close("Player was idle for too long");
    }
}