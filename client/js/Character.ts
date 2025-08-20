import { Entity } from './entity';
import { Transition } from './transition';
import { Timer } from './timer';

// Placeholders for external types
declare const log: any;
declare const Types: {
    Orientations: {
        UP: number;
        DOWN: number;
        LEFT: number;
        RIGHT: number;
    };
    getOrientationAsString: (o: number) => string;
};
declare class Character extends Entity {
    id: number;
    kind: number;
    gridX: number;
    gridY: number;
    setAnimation(name: string, speed: number, count?: number, onEndCount?: () => void): void;
    currentAnimation: { name: string } | null;
    flipSpriteX: boolean;
    flipSpriteY: boolean;
    setDirty(): void;
    setGridPosition(x: number, y: number): void;
    setAnimation(name: string, speed: number, count?: number, onEndCount?: () => void): void;
    sprite: any;
    normalSprite: any;
    hurtSprite: any;
}

export class Character extends Entity {
    public orientation: Types.Orientations;
    public nextGridX: number = -1;
    public nextGridY: number = -1;
    public hitPoints: number = 0;
    public maxHitPoints: number = 0;
    public isDead: boolean = false;
    public attackingMode: boolean = false;
    public followingMode: boolean = false;
    public target: Character | null = null;
    public unconfirmedTarget: Character | null = null;
    public readonly movement: Transition;
    public readonly atkSpeed: number = 50;
    public readonly moveSpeed: number = 120;
    public readonly walkSpeed: number = 100;
    public readonly idleSpeed: number = 450;
    public path: number[][] | null = null;
    public newDestination: { x: number, y: number } | null = null;
    public adjacentTiles: Record<string, any> = {};
    public attackers: Record<number, Character> = {};

    private attackCooldown: Timer;
    private deathCallback?: () => void;
    private hasmovedCallback?: (character: Character) => void;
    private aggroCallback?: (character: Character) => void;
    private checkaggroCallback?: () => void;
    private beforeStepCallback?: () => void;
    private stepCallback?: () => void;
    private startPathingCallback?: (path: number[][]) => void;
    private stopPathingCallback?: (x: number, y: number) => void;
    private hurting: NodeJS.Timeout | null = null;
    private interrupted: boolean = false;

    constructor(id: number, kind: number) {
        super(id, kind);
        
        this.orientation = Types.Orientations.DOWN;
        this.movement = new Transition();
        this.attackCooldown = new Timer(800);
        this.attackers = {};
    }

    public clean(): void {
        Object.values(this.attackers).forEach(attacker => {
            attacker.disengage();
            attacker.idle();
        });
    }
    
    public setMaxHitPoints(hp: number): void {
        this.maxHitPoints = hp;
        this.hitPoints = hp;
    }
    
    public setDefaultAnimation(): void {
        this.idle();
    }
    
    public hasWeapon(): boolean {
        return false;
    }
    
    public hasShadow(): boolean {
        return true;
    }
    
    public animate(animation: string, speed: number, count?: number, onEndCount?: () => void): void {
        const orientedAnimations = ['atk', 'walk', 'idle'];
        let o = this.orientation;
        
        if (!(this.currentAnimation && this.currentAnimation.name === "death")) {
            this.flipSpriteX = false;
            this.flipSpriteY = false;
            
            if (orientedAnimations.includes(animation)) {
                const orientationString = o === Types.Orientations.LEFT ? "right" : Types.getOrientationAsString(o);
                animation += `_${orientationString}`;
                this.flipSpriteX = (o === Types.Orientations.LEFT);
            }
            this.setAnimation(animation, speed, count, onEndCount);
        }
    }
    
    public turnTo(orientation: Types.Orientations): void {
        this.orientation = orientation;
        this.idle();
    }

    public setOrientation(orientation: Types.Orientations): void {
        if (orientation) {
            this.orientation = orientation;
        }
    }

    public idle(orientation?: Types.Orientations): void {
        if (orientation) {
            this.setOrientation(orientation);
        }
        this.animate("idle", this.idleSpeed);
    }
    
    public hit(orientation?: Types.Orientations): void {
        if (orientation) {
            this.setOrientation(orientation);
        }
        this.animate("atk", this.atkSpeed, 1);
    }
    
    public walk(orientation?: Types.Orientations): void {
        if (orientation) {
            this.setOrientation(orientation);
        }
        this.animate("walk", this.walkSpeed);
    }
    
    public moveTo_(x: number, y: number): void {
        this.destination = { gridX: x, gridY: y };
        this.adjacentTiles = {};
        
        if (this.isMoving()) {
            this.continueTo(x, y);
        } else {
            const path = this.requestPathfindingTo(x, y);
            this.followPath(path);
        }
    }
    
    public requestPathfindingTo(x: number, y: number): number[][] {
        if (this.request_path_callback) {
            return this.request_path_callback(x, y);
        } else {
            log.error(`${this.id} couldn't request pathfinding to ${x}, ${y}`);
            return [];
        }
    }
    
    public onRequestPath(callback: (x: number, y: number) => number[][]): void {
        this.request_path_callback = callback;
    }
    
    public onStartPathing(callback: (path: number[][]) => void): void {
        this.startPathingCallback = callback;
    }
    
    public onStopPathing(callback: (x: number, y: number) => void): void {
        this.stopPathingCallback = callback;
    }

    public followPath(path: number[][]): void {
        if (path.length > 1) {
            this.path = path;
            this.step = 0;
            
            if (this.followingMode) {
                path.pop();
            }
            
            this.startPathingCallback?.(path);
            this.nextStep();
        }
    }

    public continueTo(x: number, y: number): void {
        this.newDestination = { x, y };
    }
    
    public updateMovement(): void {
        const p = this.path;
        if (!p) return;

        const i = this.step;
        if (i > 0) { // Ensure there is a previous step to compare against
            if (p[i][0] < p[i - 1][0]) {
                this.walk(Types.Orientations.LEFT);
            } else if (p[i][0] > p[i - 1][0]) {
                this.walk(Types.Orientations.RIGHT);
            } else if (p[i][1] < p[i - 1][1]) {
                this.walk(Types.Orientations.UP);
            } else if (p[i][1] > p[i - 1][1]) {
                this.walk(Types.Orientations.DOWN);
            }
        }
    }

    public updatePositionOnGrid(): void {
        if (!this.path) return;
        this.setGridPosition(this.path[this.step][0], this.path[this.step][1]);
    }

    public nextStep(): void {
        let stop = false;
        
        if (this.isMoving()) {
            this.beforeStepCallback?.();
            this.updatePositionOnGrid();
            this.checkAggro();
            
            if (this.interrupted) {
                stop = true;
                this.interrupted = false;
            } else {
                if (this.hasNextStep()) {
                    this.nextGridX = this.path?.[this.step + 1]?.[0] ?? -1;
                    this.nextGridY = this.path?.[this.step + 1]?.[1] ?? -1;
                }
                
                this.stepCallback?.();
                
                if (this.hasChangedItsPath()) {
                    const x = this.newDestination?.x;
                    const y = this.newDestination?.y;
                    this.newDestination = null;
                    if (x !== undefined && y !== undefined) {
                        const path = this.requestPathfindingTo(x, y);
                        if (path.length < 2) {
                            stop = true;
                        } else {
                            this.followPath(path);
                        }
                    } else {
                        stop = true;
                    }
                } else if (this.hasNextStep()) {
                    this.step++;
                    this.updateMovement();
                } else {
                    stop = true;
                }
            }
        }
        
        if (stop) {
            this.path = null;
            this.idle();
            this.stopPathingCallback?.(this.gridX, this.gridY);
        }
    }
    
    public onBeforeStep(callback: () => void): void {
        this.beforeStepCallback = callback;
    }
    
    public onStep(callback: () => void): void {
        this.stepCallback = callback;
    }

    public isMoving(): boolean {
        return this.path !== null;
    }

    public hasNextStep(): boolean {
        return !!this.path && this.path.length - 1 > this.step;
    }

    public hasChangedItsPath(): boolean {
        return this.newDestination !== null;
    }
    
    public isNear(character: Character, distance: number): boolean {
        const dx = Math.abs(this.gridX - character.gridX);
        const dy = Math.abs(this.gridY - character.gridY);
        return dx <= distance && dy <= distance;
    }
    
    public onAggro(callback: (character: Character) => void): void {
        this.aggroCallback = callback;
    }
    
    public onCheckAggro(callback: () => void): void {
        this.checkaggroCallback = callback;
    }

    public checkAggro(): void {
        this.checkaggroCallback?.();
    }
    
    public aggro(character: Character): void {
        this.aggroCallback?.(character);
    }
    
    public onDeath(callback: () => void): void {
        this.deathCallback = callback;
    }
    
    public lookAtTarget(): void {
        if (this.target) {
            this.turnTo(this.getOrientationTo(this.target));
        }
    }
    
    public go(x: number, y: number): void {
        if (this.isAttacking()) {
            this.disengage();
        } else if (this.followingMode) {
            this.followingMode = false;
            this.target = null;
        }
        this.moveTo_(x, y);
    }
    
    public follow(entity: Character): void {
        if (entity) {
            this.followingMode = true;
            this.moveTo_(entity.gridX, entity.gridY);
        }
    }
    
    public stop(): void {
        if (this.isMoving()) {
            this.interrupted = true;
        }
    }
    
    public engage(character: Character): void {
        this.attackingMode = true;
        this.setTarget(character);
        this.follow(character);
    }
    
    public disengage(): void {
        this.attackingMode = false;
        this.followingMode = false;
        this.removeTarget();
    }
    
    public isAttacking(): boolean {
        return this.attackingMode;
    }
    
    public getOrientationTo(character: Character): Types.Orientations {
        if (this.gridX < character.gridX) {
            return Types.Orientations.RIGHT;
        } else if (this.gridX > character.gridX) {
            return Types.Orientations.LEFT;
        } else if (this.gridY > character.gridY) {
            return Types.Orientations.UP;
        } else {
            return Types.Orientations.DOWN;
        }
    }
    
    public isAttackedBy(character: Character): boolean {
        return character.id in this.attackers;
    }
    
    public addAttacker(character: Character): void {
        if (!this.isAttackedBy(character)) {
            this.attackers[character.id] = character;
        } else {
            log.error(`${this.id} is already attacked by ${character.id}`);
        }
    }
    
    public removeAttacker(character: Character): void {
        if (this.isAttackedBy(character)) {
            delete this.attackers[character.id];
        } else {
            log.error(`${this.id} is not attacked by ${character.id}`);
        }
    }
    
    public forEachAttacker(callback: (attacker: Character) => void): void {
        Object.values(this.attackers).forEach(callback);
    }
    
    public setTarget(character: Character): void {
        if (this.target !== character) {
            if (this.hasTarget()) {
                this.removeTarget();
            }
            this.unconfirmedTarget = null;
            this.target = character;
        } else {
            log.debug(`${character.id} is already the target of ${this.id}`);
        }
    }
    
    public removeTarget(): void {
        if (this.target) {
            this.target.removeAttacker(this);
        }
        this.target = null;
    }
    
    public hasTarget(): boolean {
        return this.target !== null;
    }

    public waitToAttack(character: Character): void {
        this.unconfirmedTarget = character;
    }
    
    public isWaitingToAttack(character: Character): boolean {
        return this.unconfirmedTarget === character;
    }
    
    public canAttack(time: number): boolean {
        if (this.canReachTarget() && this.attackCooldown.isOver(time)) {
            return true;
        }
        return false;
    }
    
    public canReachTarget(): boolean {
        if (this.hasTarget() && this.isAdjacentNonDiagonal(this.target)) {
            return true;
        }
        return false;
    }
    
    public die(): void {
        this.removeTarget();
        this.isDead = true;
        this.deathCallback?.();
    }
    
    public onHasMoved(callback: (character: Character) => void): void {
        this.hasmovedCallback = callback;
    }
    
    public hasMoved(): void {
        this.setDirty();
        this.hasmovedCallback?.(this);
    }
    
    public hurt(): void {
        this.stopHurting();
        this.sprite = this.hurtSprite;
        this.hurting = setTimeout(this.stopHurting.bind(this), 75);
    }
    
    public stopHurting(): void {
        this.sprite = this.normalSprite;
        if (this.hurting) {
            clearTimeout(this.hurting);
            this.hurting = null;
        }
    }
    
    public setAttackRate(rate: number): void {
        this.attackCooldown = new Timer(rate);
    }

    public isAdjacentNonDiagonal(character: Character): boolean {
        const dx = Math.abs(this.gridX - character.gridX);
        const dy = Math.abs(this.gridY - character.gridY);
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    }
}