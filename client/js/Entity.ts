export class Entity {
    public readonly id: number | string;
    public readonly kind: number;
    public name: string = "";
    public x: number = 0;
    public y: number = 0;
    public gridX: number = 0;
    public gridY: number = 0;
    public sprite: Sprite | null = null;
    public normalSprite: Sprite | null = null;
    public hurtSprite: Sprite | null = null;
    public flipSpriteX: boolean = false;
    public flipSpriteY: boolean = false;
    public animations: any = null;
    public currentAnimation: any | null = null;
    public shadowOffsetY: number = 0;
    public isLoaded: boolean = false;
    public isHighlighted: boolean = false;
    public visible: boolean = true;
    public isFading: boolean = false;
    public isDirty: boolean = false;

    private readyFunc?: () => void;
    private dirtyCallback?: (entity: Entity) => void;
    private blinking: number | null = null;
    private startFadingTime: number | null = null;
    
    constructor(id: number | string, kind: number) {
        this.id = id;
        this.kind = kind;
        this.setGridPosition(0, 0);
        this.setDirty();
    }

    public setName(name: string): void {
        this.name = name;
    }

    public setPosition(x: number, y: number): void {
        this.x = x;
        this.y = y;
    }

    public setGridPosition(x: number, y: number): void {
        this.gridX = x;
        this.gridY = y;
        this.setPosition(x * 16, y * 16);
    }

    public setSprite(sprite: Sprite): void {
        if (!sprite) {
            log.error(`${this.id} : sprite is null`, true);
            throw new Error("Sprite is null");
        }
        
        if (this.sprite && this.sprite.name === sprite.name) {
            return;
        }

        this.sprite = sprite;
        this.normalSprite = this.sprite;
        
        if (Types.isMob(this.kind) || Types.isPlayer(this.kind)) {
            this.hurtSprite = sprite.getHurtSprite();
        }

        this.animations = sprite.createAnimations();
        this.isLoaded = true;
        if (this.readyFunc) {
            this.readyFunc();
        }
    }

    public getSprite(): Sprite | null {
        return this.sprite;
    }

    public getSpriteName(): string {
        return Types.getKindAsString(this.kind);
    }

    public getAnimationByName(name: string): any | null {
        if (this.animations && name in this.animations) {
            return this.animations[name];
        }
        log.error(`No animation called ${name}`);
        return null;
    }

    public setAnimation(name: string, speed: number, count?: number, onEndCount?: () => void): void {
        if (!this.isLoaded) {
            this.logError("Not ready for animation");
            return;
        }

        if (this.currentAnimation && this.currentAnimation.name === name) {
            return;
        }
        
        const animation = this.getAnimationByName(name);
        if (animation) {
            this.currentAnimation = animation;
            if (name.startsWith("atk")) {
                this.currentAnimation.reset();
            }
            this.currentAnimation.setSpeed(speed);
            this.currentAnimation.setCount(count ?? 0, onEndCount || (() => this.idle()));
        }
    }

    public hasShadow(): boolean {
        return false;
    }

    public ready(f: () => void): void {
        this.readyFunc = f;
    }

    public clean(): void {
        this.stopBlinking();
    }

    private logInfo(message: string): void {
        log.info(`[${this.id}] ${message}`);
    }
    
    private logError(message: string): void {
        log.error(`[${this.id}] ${message}`);
    }

    public setHighlight(value: boolean): void {
        if (value === true && this.sprite?.silhouetteSprite) {
            this.sprite = this.sprite.silhouetteSprite;
            this.isHighlighted = true;
        } else if (this.normalSprite) {
            this.sprite = this.normalSprite;
            this.isHighlighted = false;
        }
    }

    public setVisible(value: boolean): void {
        this.visible = value;
    }

    public isVisible(): boolean {
        return this.visible;
    }

    public toggleVisibility(): void {
        this.visible = !this.visible;
    }
    
    public getDistanceToEntity(entity: Entity): number {
        const distX = Math.abs(entity.gridX - this.gridX);
        const distY = Math.abs(entity.gridY - this.gridY);
        return Math.max(distX, distY);
    }
    
    public isCloseTo(entity: Entity): boolean {
        if (!entity) return false;
        const dx = Math.abs(entity.gridX - this.gridX);
        const dy = Math.abs(entity.gridY - this.gridY);
        return dx < 30 && dy < 14;
    }
    
    public isAdjacent(entity: Entity): boolean {
        if (!entity) return false;
        return this.getDistanceToEntity(entity) <= 1;
    }
    
    public isAdjacentNonDiagonal(entity: Entity): boolean {
        if (!this.isAdjacent(entity)) return false;
        return this.gridX === entity.gridX || this.gridY === entity.gridY;
    }
    
    public isDiagonallyAdjacent(entity: Entity): boolean {
        return this.isAdjacent(entity) && !this.isAdjacentNonDiagonal(entity);
    }
    
    public forEachAdjacentNonDiagonalPosition(callback: (x: number, y: number, o: number) => void): void {
        callback(this.gridX - 1, this.gridY, Types.Orientations.LEFT);
        callback(this.gridX, this.gridY - 1, Types.Orientations.UP);
        callback(this.gridX + 1, this.gridY, Types.Orientations.RIGHT);
        callback(this.gridX, this.gridY + 1, Types.Orientations.DOWN);
    }

    public fadeIn(currentTime: number): void {
        this.isFading = true;
        this.startFadingTime = currentTime;
    }
    
    public blink(speed: number): void {
        this.stopBlinking();
        this.blinking = window.setInterval(() => {
            this.toggleVisibility();
        }, speed);
    }
    
    public stopBlinking(): void {
        if (this.blinking) {
            window.clearInterval(this.blinking);
            this.blinking = null;
        }
        this.setVisible(true);
    }
    
    public setDirty(): void {
        this.isDirty = true;
        this.dirtyCallback?.(this);
    }
    
    public onDirty(dirty_callback: (entity: Entity) => void): void {
        this.dirtyCallback = dirty_callback;
    }
}