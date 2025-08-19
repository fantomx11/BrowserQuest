// Imports
import { Character } from "./Character";
import { Messages } from "./Message";
import { Properties } from "./Properties";
import { Utils } from "./Utils";
import { Item } from "./Item";
import { MobArea } from "./Mobarea";
import { ChestArea } from "./Chestarea";
import * as _ from "underscore";

// Interfaces for better type safety and clarity
interface HateObject {
    id: number;
    hate: number;
}

// Define the Mob class that extends the Character class
export class Mob extends Character {
    public spawningX: number;
    public spawningY: number;
    public armorLevel: number;
    public weaponLevel: number;
    public hatelist: HateObject[];
    public isDead: boolean;
    public area?: MobArea | ChestArea;

    private respawnTimeout: NodeJS.Timeout | null;
    private returnTimeout: NodeJS.Timeout | null;
    private respawnCallback?: () => void;
    private moveCallback?: (mob: Mob) => void;

    constructor(id: string | number, kind: number, x: number, y: number) {
        super(id, "mob", kind, x, y);
        
        this.updateHitPoints();
        this.spawningX = x;
        this.spawningY = y;
        this.armorLevel = Properties.getArmorLevel(this.kind)!;
        this.weaponLevel = Properties.getWeaponLevel(this.kind)!;
        this.hatelist = [];
        this.respawnTimeout = null;
        this.returnTimeout = null;
        this.isDead = false;
    }
    
    /**
     * Overrides the base destroy method to handle mob-specific cleanup and respawning.
     */
    public destroy(): void {
        this.isDead = true;
        this.hatelist = [];
        this.clearTarget();
        this.updateHitPoints();
        this.resetPosition();
        
        this.handleRespawn();
    }
    
    /**
     * Reduces the mob's hit points.
     * @param {number} points The amount of damage to receive.
     * @param {number} playerId The ID of the player dealing the damage.
     */
    public receiveDamage(points: number, playerId: number): void {
        this.hitPoints -= points;
    }
    
    /**
     * Checks if the mob already has a player on its hatelist.
     * @param {number} playerId The ID of the player to check for.
     * @returns {boolean} True if the player is on the hatelist, otherwise false.
     */
    public hates(playerId: number): boolean {
        return this.hatelist.some(obj => obj.id === playerId);
    }
    
    /**
     * Increases a player's hate for the mob, adding them to the hatelist if they don't exist.
     * @param {number} playerId The ID of the player.
     * @param {number} points The amount of hate to increase.
     */
    public increaseHateFor(playerId: number, points: number): void {
        const hatedPlayer = this.hatelist.find(obj => obj.id === playerId);
        
        if (hatedPlayer) {
            hatedPlayer.hate += points;
        } else {
            this.hatelist.push({ id: playerId, hate: points });
        }

        if (this.returnTimeout) {
            clearTimeout(this.returnTimeout);
            this.returnTimeout = null;
        }
    }
    
    /**
     * Gets the ID of the most-hated player.
     * @param {number} [hateRank] The hate rank (1 for most hated, 2 for second, etc.).
     * @returns {number | undefined} The ID of the hated player, or undefined if not found.
     */
    public getHatedPlayerId(hateRank?: number): number | undefined {
        const sorted = [...this.hatelist].sort((a, b) => a.hate - b.hate);
        const size = sorted.length;
        
        let index: number;
        if (hateRank && hateRank <= size) {
            index = size - hateRank;
        } else {
            index = size - 1;
        }

        return sorted[index]?.id;
    }
    
    /**
     * Forgets a specific player from the hatelist.
     * @param {number} playerId The ID of the player to forget.
     * @param {number} duration The duration before the mob returns to its spawning point.
     */
    public forgetPlayer(playerId: number, duration: number): void {
        this.hatelist = this.hatelist.filter(obj => obj.id !== playerId);
        
        if (this.hatelist.length === 0) {
            this.returnToSpawningPosition(duration);
        }
    }
    
    /**
     * Clears the entire hatelist and returns the mob to its spawning position.
     */
    public forgetEveryone(): void {
        this.hatelist = [];
        this.returnToSpawningPosition(1);
    }
    
    /**
     * Creates a Drop message for a given item.
     * @param {Item} item The item to drop.
     * @returns {Messages.Drop | undefined} A new Drop message, or undefined if no item is provided.
     */
    public drop(item: Item): Messages.Drop | undefined {
        if (item) {
            return new Messages.Drop(this, item);
        }
    }
    
    /**
     * Handles the mob's respawn logic.
     */
    public handleRespawn(): void {
        const delay = 30000;
        
        if (this.area instanceof MobArea) {
            this.area.respawnMob(this, delay);
        } else {
            if (this.area instanceof ChestArea) {
                this.area.removeFromArea(this);
            }
            
            setTimeout(() => {
                if (this.respawnCallback) {
                    this.respawnCallback();
                }
            }, delay);
        }
    }
    
    /**
     * Sets a callback function to be executed when the mob respawns.
     * @param {() => void} callback The function to call on respawn.
     */
    public onRespawn(callback: () => void): void {
        this.respawnCallback = callback;
    }
    
    /**
     * Resets the mob's position to its spawning point.
     */
    public resetPosition(): void {
        this.setPosition(this.spawningX, this.spawningY);
    }
    
    /**
     * Schedules the mob to return to its spawning position after a delay.
     * @param {number} [waitDuration] The duration in milliseconds to wait before returning.
     */
    public returnToSpawningPosition(waitDuration?: number): void {
        const delay = waitDuration || 4000;
        
        this.clearTarget();
        
        this.returnTimeout = setTimeout(() => {
            this.resetPosition();
            this.move(this.x, this.y);
        }, delay);
    }
    
    /**
     * Sets a callback function to be executed when the mob moves.
     * @param {(mob: Mob) => void} callback The function to call on move.
     */
    public onMove(callback: (mob: Mob) => void): void {
        this.moveCallback = callback;
    }
    
    /**
     * Updates the mob's position and triggers the move callback.
     * @param {number} x The new x-coordinate.
     * @param {number} y The new y-coordinate.
     */
    public move(x: number, y: number): void {
        this.setPosition(x, y);
        if (this.moveCallback) {
            this.moveCallback(this);
        }
    }
    
    /**
     * Resets the mob's hit points based on its kind.
     */
    public updateHitPoints(): void {
        this.resetHitPoints(Properties.getHitPoints(this.kind)!);
    }
    
    /**
     * Calculates the Chebyshev distance to the mob's spawning point.
     * @param {number} x The current x-coordinate.
     * @param {number} y The current y-coordinate.
     * @returns {number} The distance to the spawning point.
     */
    public distanceToSpawningPoint(x: number, y: number): number {
        return Utils.distanceTo(x, y, this.spawningX, this.spawningY);
    }
}