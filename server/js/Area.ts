// Imports
import { Mob } from './Mob';
import { Utils } from './Utils';
import { World } from './Worldserver';

// Interfaces for better type safety and clarity
interface Position {
    x: number;
    y: number;
}

interface Entity {
    id: number;
    isDead: boolean;
    area?: Area;
}

export abstract class Area {
    public id: number;
    public x: number;
    public y: number;
    public width: number;
    public height: number;
    public world: World;
    public entities: Entity[];
    public hasCompletelyRespawned: boolean;
    public nbEntities: number = 0;

    private emptyCallback?: () => void;

    constructor(id: number, x: number, y: number, width: number, height: number, world: World) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.world = world;
        this.entities = [];
        this.hasCompletelyRespawned = true;
    }
    
    /**
     * Finds a random, valid position inside the area.
     * @returns {Position} A random, valid position.
     */
    protected getRandomPositionInsideArea(): Position {
        const pos: Position = { x: 0, y: 0 };
        let valid = false;
        
        while (!valid) {
            pos.x = this.x + Utils.random(this.width + 1);
            pos.y = this.y + Utils.random(this.height + 1);
            valid = this.world.isValidPosition(pos.x, pos.y);
        }
        return pos;
    }
    
    /**
     * Removes an entity from the area.
     * @param {Entity} entity The entity to remove.
     */
    public removeFromArea(entity: Entity): void {
        const index = this.entities.findIndex(e => e.id === entity.id);
        if (index > -1) {
            this.entities.splice(index, 1);
        }
        
        if (this.isEmpty() && this.hasCompletelyRespawned && this.emptyCallback) {
            this.hasCompletelyRespawned = false;
            this.emptyCallback();
        }
    }
    
    /**
     * Adds an entity to the area.
     * @param {Entity} entity The entity to add.
     */
    public addToArea(entity: Entity): void {
        if (entity) {
            this.entities.push(entity);
            entity.area = this;
            if (entity instanceof Mob) {
                this.world.addMob(entity);
            }
        }
        
        if (this.isFull()) {
            this.hasCompletelyRespawned = true;
        }
    }
    
    /**
     * Sets the expected number of entities for this area.
     * @param {number} nb The number of entities.
     */
    public setNumberOfEntities(nb: number): void {
        this.nbEntities = nb;
    }
    
    /**
     * Checks if the area is currently empty of living entities.
     * @returns {boolean} True if the area is empty, otherwise false.
     */
    public isEmpty(): boolean {
        return this.entities.every(entity => entity.isDead);
    }
    
    /**
     * Checks if the area is at its full capacity with living entities.
     * @returns {boolean} True if the area is full, otherwise false.
     */
    public isFull(): boolean {
        const livingEntities = this.entities.filter(entity => !entity.isDead);
        return livingEntities.length === this.nbEntities;
    }
    
    /**
     * Sets a callback function to be executed when the area becomes empty.
     * @param {() => void} callback The function to call.
     */
    public onEmpty(callback: () => void): void {
        this.emptyCallback = callback;
    }
}