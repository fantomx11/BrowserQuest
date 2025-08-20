// Define an interface for the entity to ensure it has the correct properties
interface Entity {
    gridX: number;
    gridY: number;
}

// Export the Area class as a module
export class Area {
    public readonly x: number;
    public readonly y: number;
    public readonly width: number;
    public readonly height: number;

    constructor(x: number, y: number, width: number, height: number) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    /**
     * Checks if an entity is contained within this area.
     * @param {Entity} entity The entity to check.
     * @returns {boolean} True if the entity is inside the area, false otherwise.
     */
    public contains(entity: Entity): boolean {
        if (!entity) {
            return false;
        }

        return entity.gridX >= this.x &&
               entity.gridY >= this.y &&
               entity.gridX < this.x + this.width &&
               entity.gridY < this.y + this.height;
    }
}