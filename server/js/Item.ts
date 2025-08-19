import { Entity } from './Entity';

// Interfaces for better type safety
interface DespawnParams {
    blinkCallback: () => void;
    despawnCallback: () => void;
    blinkingDuration: number;
    beforeBlinkDelay: number;
}

// Define the Item class that extends the Entity class
export class Item extends Entity {
    public isStatic: boolean;
    public isFromChest: boolean;
    private blinkTimeout?: NodeJS.Timeout;
    private despawnTimeout?: NodeJS.Timeout;
    private respawnCallback?: () => void;

    // The constructor calls the parent class's constructor
    constructor(id: string | number, kind: number, x: number, y: number) {
        super(id, "item", kind, x, y);
        this.isStatic = false;
        this.isFromChest = false;
    }

    /**
     * Handles the despawn sequence with a blink and a final despawn.
     * @param {DespawnParams} params Parameters for the despawn sequence.
     */
    public handleDespawn(params: DespawnParams): void {
        this.blinkTimeout = setTimeout(() => {
            params.blinkCallback();
            this.despawnTimeout = setTimeout(params.despawnCallback, params.blinkingDuration);
        }, params.beforeBlinkDelay);
    }

    /**
     * Overrides the base destroy method to clear timeouts and handle respawning.
     */
    public destroy(): void {
        super.destroy(); // Call the parent class's destroy method

        if (this.blinkTimeout) {
            clearTimeout(this.blinkTimeout);
        }
        if (this.despawnTimeout) {
            clearTimeout(this.despawnTimeout);
        }
        
        if (this.isStatic) {
            this.scheduleRespawn(30000);
        }
    }

    /**
     * Schedules a respawn for the item after a specified delay.
     * @param {number} delay The delay in milliseconds before respawning.
     */
    public scheduleRespawn(delay: number): void {
        setTimeout(() => {
            if (this.respawnCallback) {
                this.respawnCallback();
            }
        }, delay);
    }

    /**
     * Sets a callback function to be executed when the item respawns.
     * @param {() => void} callback The function to call on respawn.
     */
    public onRespawn(callback: () => void): void {
        this.respawnCallback = callback;
    }
}