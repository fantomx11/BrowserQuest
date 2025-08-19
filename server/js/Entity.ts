// Imports
import { Messages } from './Message';
// import { Types } from '../../shared/js/Gametypes';
import { Utils } from './Utils';

// Interfaces to ensure type safety for method parameters
interface Position {
    x: number;
    y: number;
}

// The base class for all game entities
export abstract class Entity {
    public id: number;
    public type: string;
    public kind: number;
    public x: number;
    public y: number;

    constructor(id: string | number, type: string, kind: number, x: number, y: number) {
        this.id = parseInt(id.toString());
        this.type = type;
        this.kind = kind;
        this.x = x;
        this.y = y;
    }
    
    // Abstract method to force subclasses to implement their own logic
    public destroy(): void {
        // Default implementation can be empty or have shared logic
    }
    
    // Returns the base state data for serialization
    protected getBaseState(): [number, number, number, number] {
        return [
            this.id,
            this.kind,
            this.x,
            this.y
        ];
    }
    
    // Returns the full state data for serialization
    public getState(): any[] {
        return this.getBaseState();
    }
    
    // Creates a spawn message for this entity
    public spawn(): Messages.Spawn {
        return new Messages.Spawn(this);
    }
    
    // Creates a despawn message for this entity
    public despawn(): Messages.Despawn {
        return new Messages.Despawn(this.id);
    }
    
    // Sets the entity's position
    public setPosition(x: number, y: number): void {
        this.x = x;
        this.y = y;
    }
    
    // Returns a random position next to another entity
    public getPositionNextTo(entity: Entity): Position | null {
        if (!entity) {
            return null;
        }

        const pos: Position = { x: entity.x, y: entity.y };
        const r = Utils.random(4);
        
        if (r === 0) {
            pos.y -= 1;
        } else if (r === 1) {
            pos.y += 1;
        } else if (r === 2) {
            pos.x -= 1;
        } else if (r === 3) {
            pos.x += 1;
        }

        return pos;
    }
}