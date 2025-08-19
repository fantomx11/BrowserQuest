import { Entity } from './Entity';
import { Messages } from './Message';
import { Types } from '../../shared/js/gametypes';
import { Utils } from './Utils';
// import * as _ from 'underscore';

// A placeholder for the log object, which is likely a separate utility.
declare const log: any;

// A generic interface to represent an entity with at least an ID
interface AttackingEntity {
    id: number;
}

export class Character extends Entity {
    public orientation: Types.Orientations;
    public hitPoints: number;
    public maxHitPoints: number;
    public target: number | null;

    private attackers: Record<number, AttackingEntity>;

    constructor(id: string | number, type: string, kind: number, x: number, y: number) {
        super(id, type, kind, x, y);

        this.orientation = Utils.randomOrientation();
        this.attackers = {};
        this.target = null;
        this.hitPoints = 0;
        this.maxHitPoints = 0;
    }

    // Overrides the base getState method to add character-specific state.
    public getState(): any[] {
        const baseState = super.getState();
        const characterState: any[] = [this.orientation];

        if (this.target !== null) {
            characterState.push(this.target);
        }

        return baseState.concat(characterState);
    }

    /**
     * Resets the character's hit points.
     * @param {number} maxHitPoints The new maximum hit points.
     */
    public resetHitPoints(maxHitPoints: number): void {
        this.maxHitPoints = maxHitPoints;
        this.hitPoints = this.maxHitPoints;
    }

    /**
     * Regenerates a specific amount of health, not exceeding max hit points.
     * @param {number} value The amount of health to regenerate.
     */
    public regenHealthBy(value: number): void {
        const newHitPoints = this.hitPoints + value;
        this.hitPoints = Math.min(newHitPoints, this.maxHitPoints);
    }

    /**
     * Checks if the character has full health.
     * @returns {boolean} True if health is full, otherwise false.
     */
    public hasFullHealth(): boolean {
        return this.hitPoints === this.maxHitPoints;
    }

    /**
     * Sets the character's target.
     * @param {AttackingEntity} entity The entity to target.
     */
    public setTarget(entity: AttackingEntity): void {
        this.target = entity.id;
    }

    /**
     * Clears the character's current target.
     */
    public clearTarget(): void {
        this.target = null;
    }

    /**
     * Checks if the character has a target.
     * @returns {boolean} True if the character has a target, otherwise false.
     */
    public hasTarget(): boolean {
        return this.target !== null;
    }

    /**
     * Creates an attack message.
     * @returns {Messages.Attack} The attack message.
     */
    public attack(): Messages.Attack {
        if (this.target === null) {
            throw new Error("Cannot attack without a target.");
        }
        return new Messages.Attack(this.id, this.target);
    }

    /**
     * Creates a health update message.
     * @returns {Messages.Health} The health message.
     */
    public health(): Messages.Health {
        return new Messages.Health(this.hitPoints, false);
    }

    /**
     * Creates a health regeneration message.
     * @returns {Messages.Health} The regeneration message.
     */
    public regen(): Messages.Health {
        return new Messages.Health(this.hitPoints, true);
    }

    /**
     * Adds an entity to the list of attackers.
     * @param {AttackingEntity} entity The entity to add.
     */
    public addAttacker(entity: AttackingEntity): void {
        if (entity) {
            this.attackers[entity.id] = entity;
        }
    }

    /**
     * Removes an entity from the list of attackers.
     * @param {AttackingEntity} entity The entity to remove.
     */
    public removeAttacker(entity: AttackingEntity): void {
        if (entity && entity.id in this.attackers) {
            delete this.attackers[entity.id];
            // log.debug(`${this.id} REMOVED ATTACKER ${entity.id}`);
        }
    }

    /**
     * Executes a callback for each attacker.
     * @param {(attacker: AttackingEntity) => void} callback The callback function.
     */
    public forEachAttacker(callback: (attacker: AttackingEntity) => void): void {
        for (const id in this.attackers) {
            if (Object.prototype.hasOwnProperty.call(this.attackers, id)) {
                callback(this.attackers[id]);
            }
        }
    }
}