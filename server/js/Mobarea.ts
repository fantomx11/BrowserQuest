// Imports
import { Area } from './Area';
import { Mob } from './Mob';
import { Types } from '../../shared/js/gametypes';
import { Utils } from './Utils';
import { World } from './Worldserver';

// A placeholder for the Mob and World classes for type-checking
interface Position {
    x: number;
    y: number;
}

// MobArea class that extends the base Area class
export class MobArea extends Area {
    public nb: number;
    public kind: string;
    public respawns: any[];
    public world: World;

    constructor(id: number, nb: number, kind: string, x: number, y: number, width: number, height: number, world: World) {
        super(id, x, y, width, height, world);
        this.nb = nb;
        this.kind = kind;
        this.respawns = [];
        this.world = world;
        this.setNumberOfEntities(this.nb);
    }
    
    /**
     * Spawns the initial set of mobs for this area.
     */
    public spawnMobs(): void {
        for (let i = 0; i < this.nb; i += 1) {
            this.addToArea(this.createMobInsideArea());
        }
    }
    
    /**
     * Creates a new mob and places it randomly inside the area.
     * @returns {Mob} The newly created mob.
     */
    private createMobInsideArea(): Mob {
        const k = Types.getKindFromString(this.kind);
        if (k === undefined) {
            throw new Error(`Invalid mob kind: ${this.kind}`);
        }
        
        const pos = this.getRandomPositionInsideArea();
        const mob = new Mob('1' + this.id + '' + k + '' + this.entities.length, k, pos.x, pos.y);
        
        mob.onMove(this.world.onMobMoveCallback.bind(this.world));

        return mob;
    }
    
    /**
     * Handles the respawn process for a mob.
     * @param {Mob} mob The mob that needs to be respawned.
     * @param {number} delay The delay in milliseconds before respawning.
     */
    public respawnMob(mob: Mob, delay: number): void {
        this.removeFromArea(mob);
        
        setTimeout(() => {
            const pos = this.getRandomPositionInsideArea();
            
            mob.x = pos.x;
            mob.y = pos.y;
            mob.isDead = false;
            this.addToArea(mob);
            this.world.addMob(mob);
        }, delay);
    }

    /**
     * Initializes the roaming behavior for all mobs in this area.
     */
    public initRoaming(): void {
        setInterval(() => {
            this.entities.forEach(mob => {
                const canRoam = (Utils.random(20) === 1);
                
                if (canRoam) {
                    if (!mob.hasTarget() && !mob.isDead) {
                        const pos = this.getRandomPositionInsideArea();
                        mob.move(pos.x, pos.y);
                    }
                }
            });
        }, 500);
    }
    
    /**
     * Creates and returns a reward (a chest) at a random position within the area.
     * @returns {{ x: number, y: number, kind: number }} The reward object.
     */
    public createReward(): { x: number, y: number, kind: Types.Entities } {
        const pos = this.getRandomPositionInsideArea();
        
        return { x: pos.x, y: pos.y, kind: Types.Entities.CHEST };
    }
}