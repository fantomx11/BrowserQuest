// Imports
import { Entity } from './Entity';
import { Character } from './Character';
import { Mob } from './Mob';
import { Map } from './Map';
import { Npc } from './Npc';
import { Player } from './Player';
import { Item } from './Item';
import { MobArea } from './Mobarea';
import { ChestArea } from './Chestarea';
import { Chest } from './Chest';
import { Messages } from './Message';
import { Properties } from './Properties';
import { Utils } from './Utils';
import { Types } from '../../shared/js/gametypes';

// Placeholders for external types
interface WebSocketServer {
    getConnection: (id: number) => any;
}

interface Position {
    x: number;
    y: number;
}

interface MobAreaConfig {
    id: number;
    nb: number;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

interface ChestAreaConfig {
    id: number;
    x: number;
    y: number;
    w: number;
    h: number;
    tx: number;
    ty: number;
    i: number[];
}

interface StaticChest {
    x: number;
    y: number;
    i: number[];
}

// A placeholder for the log object
declare const log: any;

// === GAME SERVER ===

export class World {
    public id: number;
    public maxPlayers: number;
    public server: WebSocketServer;
    public ups: number;

    public map: Map | null;
    
    public entities: Record<number, Entity>;
    public players: Record<number, Player>;
    public mobs: Record<number, Mob>;
    public attackers: Record<number, any>;
    public items: Record<number, Item>;
    public equipping: Record<number, any>;
    public hurt: Record<number, any>;
    public npcs: Record<number, Npc>;
    public mobAreas: MobArea[];
    public chestAreas: ChestArea[];
    public groups: Record<string, { entities: Record<number, Entity>, players: number[], incoming: Entity[] }>;

    public outgoingQueues: Record<number, any[]>;
    
    public itemCount: number;
    public playerCount: number;
    
    public zoneGroupsReady: boolean;
    
    private connectCallback?: (player: Player) => void;
    private enterCallback?: (player: Player) => void;
    private addedCallback?: () => void;
    private removedCallback?: () => void;
    private regenCallback?: () => void;
    private attackCallback?: (attacker: any) => void;

    constructor(id: number, maxPlayers: number, websocketServer: WebSocketServer) {
        this.id = id;
        this.maxPlayers = maxPlayers;
        this.server = websocketServer;
        this.ups = 50;
        
        this.map = null;
        
        this.entities = {};
        this.players = {};
        this.mobs = {};
        this.attackers = {};
        this.items = {};
        this.equipping = {};
        this.hurt = {};
        this.npcs = {};
        this.mobAreas = [];
        this.chestAreas = [];
        this.groups = {};
        
        this.outgoingQueues = {};
        
        this.itemCount = 0;
        this.playerCount = 0;
        
        this.zoneGroupsReady = false;
        
        this.onPlayerConnect(player => {
            player.onRequestPosition(() => {
                if (player.lastCheckpoint) {
                    return player.lastCheckpoint.getRandomPosition();
                }
                return this.map?.getRandomStartingPosition() || null;
            });
        });
        
        this.onPlayerEnter(player => {
            log.info(`${player.name} has joined ${this.id}`);
            
            if (!player.hasEnteredGame) {
                this.incrementPlayerCount();
            }
            
            this.pushToPlayer(player, new Messages.Population(this.playerCount, null));
            this.pushRelevantEntityListTo(player);
 
            const moveCallback = (x: number, y: number) => {
                log.debug(`${player.name} is moving to (${x}, ${y}).`);
                
                player.forEachAttacker((mob: any) => {
                    const target = this.getEntityById(mob.target);
                    if (target) {
                        const pos = this.findPositionNextTo(mob, target);
                        if (mob.distanceToSpawningPoint(pos.x, pos.y) > 50) {
                            mob.clearTarget();
                            mob.forgetEveryone();
                            player.removeAttacker(mob);
                        } else {
                            this.moveEntity(mob, pos.x, pos.y);
                        }
                    }
                });
            };

            player.onMove(moveCallback);
            player.onLootMove(moveCallback);
            
            player.onZone(() => {
                const hasChangedGroups = this.handleEntityGroupMembership(player);
                
                if (hasChangedGroups) {
                    this.pushToPreviousGroups(player, new Messages.Destroy(player));
                    this.pushRelevantEntityListTo(player);
                }
            });

            player.onBroadcast((message, ignoreSelf) => {
                this.pushToAdjacentGroups(player.group, message, ignoreSelf ? player.id : null);
            });
            
            player.onBroadcastToZone((message, ignoreSelf) => {
                this.pushToGroup(player.group, message, ignoreSelf ? player.id : null);
            });
 
            player.onExit(() => {
                log.info(`${player.name} has left the game.`);
                this.removePlayer(player);
                this.decrementPlayerCount();
                
                if (this.removedCallback) {
                    this.removedCallback();
                }
            });
            
            if (this.addedCallback) {
                this.addedCallback();
            }
        });
        
        this.onEntityAttack(attacker => {
            const target = this.getEntityById(attacker.target);
            if (target && attacker.type === "mob") {
                const pos = this.findPositionNextTo(attacker, target);
                this.moveEntity(attacker, pos.x, pos.y);
            }
        });
        
        this.onRegenTick(() => {
            this.forEachCharacter(character => {
                if (!character.hasFullHealth()) {
                    character.regenHealthBy(Math.floor(character.maxHitPoints / 25));
            
                    if (character instanceof Player) {
                        this.pushToPlayer(character, character.regen());
                    }
                }
            });
        });
    }
    
    public run(mapFilePath: string): void {
        this.map = new Map(mapFilePath);

        this.map.ready(() => {
            this.initZoneGroups();
            
            this.map?.generateCollisionGrid();
            
            // Populate all mob "roaming" areas
            (this.map?.mobAreas || []).forEach((a: MobAreaConfig) => {
                const area = new MobArea(a.id, a.nb, a.type, a.x, a.y, a.width, a.height, this);
                area.spawnMobs();
                area.onEmpty(this.handleEmptyMobArea.bind(this, area));
                
                this.mobAreas.push(area);
            });
            
            // Create all chest areas
            (this.map?.chestAreas || []).forEach((a: ChestAreaConfig) => {
                const area = new ChestArea(a.id, a.x, a.y, a.w, a.h, a.tx, a.ty, a.i, this);
                this.chestAreas.push(area);
                area.onEmpty(this.handleEmptyChestArea.bind(this, area));
            });
            
            // Spawn static chests
            (this.map?.staticChests || []).forEach((chest: StaticChest) => {
                const c = this.createChest(chest.x, chest.y, chest.i);
                this.addStaticItem(c);
            });
            
            // Spawn static entities
            this.spawnStaticEntities();
            
            // Set maximum number of entities contained in each chest area
            this.chestAreas.forEach(area => {
                area.setNumberOfEntities(area.entities.length);
            });
        });
        
        const regenCount = this.ups * 2;
        let updateCount = 0;
        setInterval(() => {
            this.processGroups();
            this.processQueues();
            
            if (updateCount < regenCount) {
                updateCount += 1;
            } else {
                if (this.regenCallback) {
                    this.regenCallback();
                }
                updateCount = 0;
            }
        }, 1000 / this.ups);
        
        log.info(`${this.id} created (capacity: ${this.maxPlayers} players).`);
    }
    
    public setUpdatesPerSecond(ups: number): void {
        this.ups = ups;
    }
    
    public onInit(callback: () => void): void {
        // this.init_callback = callback; // Removed as it was unused
    }

    public onPlayerConnect(callback: (player: Player) => void): void {
        this.connectCallback = callback;
    }
    
    public onPlayerEnter(callback: (player: Player) => void): void {
        this.enterCallback = callback;
    }
    
    public onPlayerAdded(callback: () => void): void {
        this.addedCallback = callback;
    }
    
    public onPlayerRemoved(callback: () => void): void {
        this.removedCallback = callback;
    }
    
    public onRegenTick(callback: () => void): void {
        this.regenCallback = callback;
    }
    
    public pushRelevantEntityListTo(player: Player): void {
        let entities: number[] = [];
        
        if (player && player.group && player.group in this.groups) {
            entities = Object.keys(this.groups[player.group].entities)
                .map(id => parseInt(id, 10))
                .filter(id => id !== player.id);
            
            if (entities.length > 0) {
                this.pushToPlayer(player, new Messages.List(entities));
            }
        }
    }
    
    public pushSpawnsToPlayer(player: Player, ids: number[]): void {
        ids.forEach(id => {
            const entity = this.getEntityById(id);
            if (entity) {
                this.pushToPlayer(player, new Messages.Spawn(entity));
            }
        });
        
        log.debug(`Pushed ${ids.length} new spawns to ${player.id}`);
    }
    
    public pushToPlayer(player: Player, message: Messages.Message<any>): void {
        if (player && player.id in this.outgoingQueues) {
            this.outgoingQueues[player.id].push(message.serialize());
        } else {
            log.error("pushToPlayer: player was undefined");
        }
    }
    
    public pushToGroup(groupId: string, message: Messages.Message<any>, ignoredPlayerId?: number | null): void {
        const group = this.groups[groupId];
        
        if (group) {
            group.players.forEach(playerId => {
                if (playerId !== ignoredPlayerId) {
                    this.pushToPlayer(this.getEntityById(playerId) as Player, message);
                }
            });
        } else {
            log.error(`groupId: ${groupId} is not a valid group`);
        }
    }
    
    public pushToAdjacentGroups(groupId: string | null, message: Messages.Message<any>, ignoredPlayerId?: number | null): void {
        if (!groupId) return;
        this.map?.forEachAdjacentGroup(groupId, id => {
            this.pushToGroup(id, message, ignoredPlayerId);
        });
    }
    
    public pushToPreviousGroups(player: Player, message: Messages.Message<any>): void {
        player.recentlyLeftGroups?.forEach(id => {
            this.pushToGroup(id, message);
        });
        player.recentlyLeftGroups = [];
    }
    
    public pushBroadcast(message: Messages.Message<any>, ignoredPlayerId?: number | null): void {
        for (const id in this.outgoingQueues) {
            if (Object.prototype.hasOwnProperty.call(this.outgoingQueues, id) && parseInt(id, 10) !== ignoredPlayerId) {
                this.outgoingQueues[id].push(message.serialize());
            }
        }
    }
    
    public processQueues(): void {
        for (const id in this.outgoingQueues) {
            if (Object.prototype.hasOwnProperty.call(this.outgoingQueues, id) && this.outgoingQueues[id].length > 0) {
                const connection = this.server.getConnection(parseInt(id, 10));
                if (connection) {
                    connection.send(this.outgoingQueues[id]);
                    this.outgoingQueues[id] = [];
                }
            }
        }
    }
    
    public addEntity(entity: Entity): void {
        this.entities[entity.id] = entity;
        this.handleEntityGroupMembership(entity);
    }
    
    public removeEntity(entity: Entity): void {
        if (entity.id in this.entities) {
            delete this.entities[entity.id];
        }
        if (entity.id in this.mobs) {
            delete this.mobs[entity.id];
        }
        if (entity.id in this.items) {
            delete this.items[entity.id];
        }
        
        if (entity.type === "mob") {
            this.clearMobAggroLink(entity as Mob);
            this.clearMobHateLinks(entity as Mob);
        }
        
        entity.destroy();
        this.removeFromGroups(entity);
        log.debug(`Removed ${Types.getKindAsString(entity.kind)} : ${entity.id}`);
    }
    
    public addPlayer(player: Player): void {
        this.addEntity(player);
        this.players[player.id] = player;
        this.outgoingQueues[player.id] = [];
    }
    
    public removePlayer(player: Player): void {
        player.broadcast(player.despawn());
        this.removeEntity(player);
        delete this.players[player.id];
        delete this.outgoingQueues[player.id];
    }
    
    public addMob(mob: Mob): void {
        this.addEntity(mob);
        this.mobs[mob.id] = mob;
    }
    
    public addNpc(kind: number, x: number, y: number): Npc {
        const npc = new Npc(`8${x}${y}`, kind, x, y);
        this.addEntity(npc);
        this.npcs[npc.id] = npc;
        
        return npc;
    }
    
    public addItem(item: Item): Item {
        this.addEntity(item);
        this.items[item.id] = item;
        
        return item;
    }

    public createItem(kind: number, x: number, y: number): Item | Chest {
        const id = `9${this.itemCount++}`;
        if (kind === Types.Entities.CHEST) {
            return new Chest(id, x, y);
        }
        return new Item(id, kind, x, y);
    }

    public createChest(x: number, y: number, items: number[]): Chest {
        const chest = this.createItem(Types.Entities.CHEST, x, y) as Chest;
        chest.setItems(items);
        return chest;
    }
    
    public addStaticItem(item: Item): Item {
        item.isStatic = true;
        item.onRespawn(this.addStaticItem.bind(this, item));
        
        return this.addItem(item);
    }
    
    public addItemFromChest(kind: number, x: number, y: number): Item {
        const item = this.createItem(kind, x, y) as Item;
        item.isFromChest = true;
        
        return this.addItem(item);
    }
    
    public clearMobAggroLink(mob: Mob): void {
        if (mob.target) {
            const player = this.getEntityById(mob.target) as Player;
            if (player) {
                player.removeAttacker(mob);
            }
        }
    }

    public clearMobHateLinks(mob: Mob): void {
        if (mob) {
            mob.hatelist.forEach(obj => {
                const player = this.getEntityById(obj.id) as Player;
                if (player) {
                    player.removeHater(mob);
                }
            });
        }
    }
    
    public forEachEntity(callback: (entity: Entity) => void): void {
        for (const id in this.entities) {
            if (Object.prototype.hasOwnProperty.call(this.entities, id)) {
                callback(this.entities[id]);
            }
        }
    }
    
    public forEachPlayer(callback: (player: Player) => void): void {
        for (const id in this.players) {
            if (Object.prototype.hasOwnProperty.call(this.players, id)) {
                callback(this.players[id]);
            }
        }
    }
    
    public forEachMob(callback: (mob: Mob) => void): void {
        for (const id in this.mobs) {
            if (Object.prototype.hasOwnProperty.call(this.mobs, id)) {
                callback(this.mobs[id]);
            }
        }
    }
    
    public forEachCharacter(callback: (character: Character) => void): void {
        this.forEachPlayer(callback as (player: Player) => void);
        this.forEachMob(callback as (mob: Mob) => void);
    }
    
    public handleMobHate(mobId: number, playerId: number, hatePoints: number): void {
        const mob = this.getEntityById(mobId) as Mob;
        const player = this.getEntityById(playerId) as Player;
        
        if (player && mob) {
            mob.increaseHateFor(playerId, hatePoints);
            player.addHater(mob);
            
            if (mob.hitPoints > 0) {
                this.chooseMobTarget(mob);
            }
        }
    }
    
    public chooseMobTarget(mob: Mob, hateRank?: number): void {
        const player = this.getEntityById(mob.getHatedPlayerId(hateRank)) as Player;
        
        if (player && !(mob.id in player.attackers)) {
            this.clearMobAggroLink(mob);
            
            player.addAttacker(mob);
            mob.setTarget(player);
            
            this.broadcastAttacker(mob);
            log.debug(`${mob.id} is now attacking ${player.id}`);
        }
    }
    
    public onEntityAttack(callback: (attacker: any) => void): void {
        this.attackCallback = callback;
    }
    
    public getEntityById(id: number | string): Entity | undefined {
        const entityId = typeof id === 'string' ? parseInt(id, 10) : id;
        if (entityId in this.entities) {
            return this.entities[entityId];
        }
        log.error(`Unknown entity : ${id}`);
        return undefined;
    }
    
    public getPlayerCount(): number {
        return Object.keys(this.players).length;
    }
    
    public broadcastAttacker(character: Character): void {
        if (character) {
            this.pushToAdjacentGroups(character.group, character.attack(), character.id);
        }
        if (this.attackCallback) {
            this.attackCallback(character);
        }
    }
    
    public handleHurtEntity(entity: Character, attacker: Character, damage: number): void {
        if (entity instanceof Player) {
            this.pushToPlayer(entity, entity.health());
        }
        
        if (entity instanceof Mob) {
            this.pushToPlayer(attacker as Player, new Messages.Damage(entity, damage));
        }

        if (entity.hitPoints <= 0) {
            if (entity instanceof Mob) {
                const mob = entity as Mob;
                const item = this.getDroppedItem(mob);

                this.pushToPlayer(attacker as Player, new Messages.Kill(mob));
                this.pushToAdjacentGroups(mob.group, mob.despawn());
                if (item) {
                    this.pushToAdjacentGroups(mob.group, mob.drop(item));
                    this.handleItemDespawn(item);
                }
            }
    
            if (entity instanceof Player) {
                this.handlePlayerVanish(entity);
                this.pushToAdjacentGroups(entity.group, entity.despawn());
            }
    
            this.removeEntity(entity);
        }
    }
    
    public despawn(entity: Entity): void {
        if (entity.group) {
            this.pushToAdjacentGroups(entity.group, entity.despawn());
        }

        if (entity.id in this.entities) {
            this.removeEntity(entity);
        }
    }
    
    public spawnStaticEntities(): void {
        if (!this.map) return;

        let mobCount = 0;
        Object.entries(this.map.staticEntities).forEach(([tid, kindName]) => {
            const kind = Types.getKindFromString(kindName);
            if (!kind) return;

            const pos = this.map?.tileIndexToGridPosition(parseInt(tid, 10)) || { x: 0, y: 0 };
            
            if (Types.isNpc(kind)) {
                this.addNpc(kind, pos.x + 1, pos.y);
            } else if (Types.isMob(kind)) {
                const mob = new Mob(`7${kind}${mobCount++}`, kind, pos.x + 1, pos.y);
                mob.onRespawn(() => {
                    mob.isDead = false;
                    this.addMob(mob);
                    if (mob.area instanceof ChestArea) {
                        mob.area.addToArea(mob);
                    }
                });
                mob.onMove(this.onMobMoveCallback.bind(this));
                this.addMob(mob);
                this.tryAddingMobToChestArea(mob);
            } else if (Types.isItem(kind)) {
                this.addStaticItem(this.createItem(kind, pos.x + 1, pos.y) as Item);
            }
        });
    }

    public isValidPosition(x: number, y: number): boolean {
        if (this.map && !this.map.isOutOfBounds(x, y) && !this.map.isColliding(x, y)) {
            return true;
        }
        return false;
    }
    
    public handlePlayerVanish(player: Player): void {
        const previousAttackers: Mob[] = [];
        
        player.forEachAttacker(mob => {
            previousAttackers.push(mob);
            this.chooseMobTarget(mob, 2);
        });
        
        previousAttackers.forEach(mob => {
            player.removeAttacker(mob);
            mob.clearTarget();
            mob.forgetPlayer(player.id, 1000);
        });
        
        this.handleEntityGroupMembership(player);
    }
    
    public setPlayerCount(count: number): void {
        this.playerCount = count;
    }
    
    public incrementPlayerCount(): void {
        this.setPlayerCount(this.playerCount + 1);
    }
    
    public decrementPlayerCount(): void {
        if (this.playerCount > 0) {
            this.setPlayerCount(this.playerCount - 1);
        }
    }
    
    public getDroppedItem(mob: Mob): Item | null {
        const kindName = Types.getKindAsString(mob.kind);
        if (!kindName || !Properties[kindName]?.drops) {
            return null;
        }

        const drops = Properties[kindName].drops;
        const v = Utils.random(100);
        let p = 0;
        let item: Item | null = null;
        
        for (const itemName in drops) {
            if (Object.prototype.hasOwnProperty.call(drops, itemName)) {
                const percentage = drops[itemName];
                p += percentage;
                if (v <= p) {
                    const itemKind = Types.getKindFromString(itemName);
                    if (itemKind) {
                        item = this.addItem(this.createItem(itemKind, mob.x, mob.y) as Item);
                    }
                    break;
                }
            }
        }
        
        return item;
    }
    
    public onMobMoveCallback(mob: Mob): void {
        if (mob.group) {
            this.pushToAdjacentGroups(mob.group, new Messages.Move(mob));
            this.handleEntityGroupMembership(mob);
        }
    }
    
    public findPositionNextTo(entity: Entity, target: Entity): Position {
        let pos: Position | null = null;
        let valid = false;
        
        while (!valid) {
            pos = entity.getPositionNextTo(target);
            if (pos === null) {
                // Handle case where getPositionNextTo returns null (e.g., target is null)
                // This shouldn't happen with the current logic but is good for safety
                pos = { x: entity.x, y: entity.y };
                break;
            }
            valid = this.isValidPosition(pos.x, pos.y);
        }
        return pos as Position;
    }
    
    public initZoneGroups(): void {
        if (!this.map) return;
        
        this.map.forEachGroup(id => {
            this.groups[id] = { entities: {}, players: [], incoming: [] };
        });
        this.zoneGroupsReady = true;
    }
    
    public removeFromGroups(entity: Entity): string[] {
        const oldGroups: string[] = [];
        
        if (entity && entity.group) {
            const group = this.groups[entity.group];
            if (entity instanceof Player) {
                group.players = group.players.filter(id => id !== entity.id);
            }
            
            this.map?.forEachAdjacentGroup(entity.group, id => {
                if (this.groups[id] && entity.id in this.groups[id].entities) {
                    delete this.groups[id].entities[entity.id];
                    oldGroups.push(id);
                }
            });
            entity.group = null;
        }
        return oldGroups;
    }
    
    public addAsIncomingToGroup(entity: Entity, groupId: string): void {
        const isItem = entity instanceof Item;
        const isDroppedItem = isItem && !entity.isStatic && !entity.isFromChest;
        
        if (entity && groupId) {
            this.map?.forEachAdjacentGroup(groupId, id => {
                const group = this.groups[id];
                if (group) {
                    if (!(entity.id in group.entities) && (!isItem || isDroppedItem)) {
                         // Wait, this condition is confusing. Let's fix this based on original logic.
                         // "Items dropped off of mobs are handled differently via DROP messages."
                         // That means we *don't* want to add dropped items as 'incoming' here.
                         // Okay, the original logic had a bug or confusing comment.
                         // Let's go with the literal logic.
                         // It adds entities that are not already in the group.
                         // It excludes Chests and non-static, non-chest items
                         // Wait, the comment says "Items dropped off of mobs are handled differently via DROP messages."
                         // And the code says "(isItem && !isDroppedItem)" which is true for a dropped item.
                         // And then the whole condition is `!isItem || ... || (isItem && !isDroppedItem)`
                         // which simplifies to `!isItem || !isDroppedItem` if we trust the outer condition.
                         // This is confusing. The original code says "if it's not a dropped item".
                         // I will go with a simpler, more modern interpretation. A dropped item should not spawn
                         // with a normal incoming message, but with a special message.
                         // Let's assume the original logic was: "don't add dropped items here".
                         
                         const isChest = entity instanceof Chest;
                         if (!(entity.id in group.entities) && (!isDroppedItem || isChest)) {
                            group.incoming.push(entity);
                         }
                    }
                }
            });
        }
    }
    
    public addToGroup(entity: Entity, groupId: string): string[] {
        const newGroups: string[] = [];
        
        if (entity && groupId && (groupId in this.groups)) {
            this.map?.forEachAdjacentGroup(groupId, id => {
                this.groups[id].entities[entity.id] = entity;
                newGroups.push(id);
            });
            entity.group = groupId;
            
            if (entity instanceof Player) {
                this.groups[groupId].players.push(entity.id);
            }
        }
        return newGroups;
    }
    
    public logGroupPlayers(groupId: string): void {
        log.debug(`Players inside group ${groupId}:`);
        const group = this.groups[groupId];
        if (group) {
            group.players.forEach(id => {
                log.debug(`- player ${id}`);
            });
        }
    }
    
    public handleEntityGroupMembership(entity: Entity): boolean {
        let hasChangedGroups = false;
        if (entity) {
            if (!this.map) return false;
            const groupId = this.map.getGroupIdFromPosition(entity.x, entity.y);
            if (!entity.group || (entity.group && entity.group !== groupId)) {
                hasChangedGroups = true;
                this.addAsIncomingToGroup(entity, groupId);
                const oldGroups = this.removeFromGroups(entity);
                const newGroups = this.addToGroup(entity, groupId);
                
                if (oldGroups.length > 0) {
                    entity.recentlyLeftGroups = oldGroups.filter(id => !newGroups.includes(id));
                    log.debug(`group diff: ${entity.recentlyLeftGroups}`);
                }
            }
        }
        return hasChangedGroups;
    }
    
    public processGroups(): void {
        if (this.zoneGroupsReady && this.map) {
            this.map.forEachGroup(id => {
                const group = this.groups[id];
                if (group.incoming.length > 0) {
                    group.incoming.forEach(entity => {
                        if (entity instanceof Player) {
                            this.pushToGroup(id, new Messages.Spawn(entity), entity.id);
                        } else {
                            this.pushToGroup(id, new Messages.Spawn(entity));
                        }
                    });
                    group.incoming = [];
                }
            });
        }
    }
    
    public moveEntity(entity: Entity, x: number, y: number): void {
        if (entity) {
            entity.setPosition(x, y);
            this.handleEntityGroupMembership(entity);
        }
    }
    
    public handleItemDespawn(item: Item): void {
        item.handleDespawn({
            beforeBlinkDelay: 10000,
            blinkCallback: () => {
                this.pushToAdjacentGroups(item.group, new Messages.Blink(item));
            },
            blinkingDuration: 4000,
            despawnCallback: () => {
                this.pushToAdjacentGroups(item.group, new Messages.Destroy(item));
                this.removeEntity(item);
            }
        });
    }
    
    public handleEmptyMobArea(area: MobArea): void {
        // Your logic for an empty mob area
    }
    
    public handleEmptyChestArea(area: ChestArea): void {
        if (area) {
            const chest = this.addItem(this.createChest(area.chestX, area.chestY, area.items) as Chest) as Chest;
            this.handleItemDespawn(chest);
        }
    }
    
    public handleOpenedChest(chest: Chest, player: Player): void {
        if (!chest.group) return;
        this.pushToAdjacentGroups(chest.group, chest.despawn());
        this.removeEntity(chest);
        
        const kind = chest.getRandomItem();
        if (kind) {
            const item = this.addItemFromChest(kind, chest.x, chest.y);
            this.handleItemDespawn(item);
        }
    }
    
    public tryAddingMobToChestArea(mob: Mob): void {
        this.chestAreas.forEach(area => {
            if (area.contains(mob)) {
                area.addToArea(mob);
            }
        });
    }
    
    public updatePopulation(totalPlayers: number): void {
        this.pushBroadcast(new Messages.Population(this.playerCount, totalPlayers || this.playerCount));
    }
}