// Placeholders for external types
declare const log: any;

interface Renderer {
    mobile: boolean;
    tilesize: number;
}

interface Entity {
    x: number;
    y: number;
    gridX: number;
    gridY: number;
}

// Export the Camera class as a module
export class Camera {
    public renderer: Renderer;
    public x: number = 0;
    public y: number = 0;
    public gridX: number = 0;
    public gridY: number = 0;
    public offset: number = 0.5;
    public gridW: number = 0;
    public gridH: number = 0;

    constructor(renderer: Renderer) {
        this.renderer = renderer;
        this.rescale();
    }

    /**
     * Rescales the camera's viewport based on the renderer's properties.
     */
    public rescale(): void {
        const factor = this.renderer.mobile ? 1 : 2;
        this.gridW = 15 * factor;
        this.gridH = 7 * factor;
        log.debug("---------");
        log.debug(`Factor: ${factor}`);
        log.debug(`W: ${this.gridW} H: ${this.gridH}`);
    }

    /**
     * Sets the camera's position based on pixel coordinates.
     * @param {number} x The x-coordinate in pixels.
     * @param {number} y The y-coordinate in pixels.
     */
    public setPosition(x: number, y: number): void {
        this.x = x;
        this.y = y;
        this.gridX = Math.floor(x / 16);
        this.gridY = Math.floor(y / 16);
    }

    /**
     * Sets the camera's position based on grid coordinates.
     * @param {number} x The x-coordinate in grid units.
     * @param {number} y The y-coordinate in grid units.
     */
    public setGridPosition(x: number, y: number): void {
        this.gridX = x;
        this.gridY = y;
        this.x = this.gridX * 16;
        this.y = this.gridY * 16;
    }

    /**
     * Centers the camera on a given entity.
     * @param {Entity} entity The entity to look at.
     */
    public lookAt(entity: Entity): void {
        const r = this.renderer;
        const x = Math.round(entity.x - (Math.floor(this.gridW / 2) * r.tilesize));
        const y = Math.round(entity.y - (Math.floor(this.gridH / 2) * r.tilesize));
        this.setPosition(x, y);
    }

    /**
     * Executes a callback for each position within the camera's viewport.
     * @param {(x: number, y: number) => void} callback The callback function.
     * @param {number} [extra=0] An optional extra border around the viewport.
     */
    public forEachVisiblePosition(callback: (x: number, y: number) => void, extra: number = 0): void {
        const startY = this.gridY - extra;
        const endY = this.gridY + this.gridH + (extra * 2);
        const startX = this.gridX - extra;
        const endX = this.gridX + this.gridW + (extra * 2);

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                callback(x, y);
            }
        }
    }
    
    /**
     * Checks if an entity is visible in the camera's viewport.
     * @param {Entity} entity The entity to check.
     * @returns {boolean} True if the entity is visible, false otherwise.
     */
    public isVisible(entity: Entity): boolean {
        return this.isVisiblePosition(entity.gridX, entity.gridY);
    }
    
    /**
     * Checks if a position is visible in the camera's viewport.
     * @param {number} x The x-coordinate in grid units.
     * @param {number} y The y-coordinate in grid units.
     * @returns {boolean} True if the position is visible, false otherwise.
     */
    public isVisiblePosition(x: number, y: number): boolean {
        return y >= this.gridY && y < this.gridY + this.gridH &&
               x >= this.gridX && x < this.gridX + this.gridW;
    }

    /**
     * Snaps the camera to a grid position based on an entity's location.
     * @param {Entity} entity The entity to focus on.
     */
    public focusEntity(entity: Entity): void {
        const w = this.gridW - 2;
        const h = this.gridH - 2;
        const x = Math.floor((entity.gridX - 1) / w) * w;
        const y = Math.floor((entity.gridY - 1) / h) * h;
        this.setGridPosition(x, y);
    }
}