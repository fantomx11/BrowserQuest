// Define an interface for the frame object to ensure it has the correct structure.
interface Frame {
    index: number;
    x: number;
    y: number;
}

// Export the Animation class as a module.
export class Animation {
    public readonly name: string;
    public readonly length: number;
    public readonly row: number;
    public readonly width: number;
    public readonly height: number;
    public speed: number = 0;
    public count: number = 0;

    private currentFrame: Frame;
    private lastTime: number = 0;
    private endcountCallback?: () => void;

    constructor(name: string, length: number, row: number, width: number, height: number) {
        this.name = name;
        this.length = length;
        this.row = row;
        this.width = width;
        this.height = height;
        this.currentFrame = { index: 0, x: 0, y: this.row * this.height };
        this.reset();
    }

    /**
     * Advances the animation to the next frame.
     */
    public tick(): void {
        let i = this.currentFrame.index;
        i = (i < this.length - 1) ? i + 1 : 0;

        if (this.count > 0) {
            if (i === 0) {
                this.count -= 1;
                if (this.count === 0) {
                    this.currentFrame.index = 0;
                    this.endcountCallback?.();
                    return;
                }
            }
        }

        this.currentFrame.x = this.width * i;
        this.currentFrame.y = this.height * this.row;
        this.currentFrame.index = i;
    }

    /**
     * Sets the speed of the animation.
     * @param {number} speed The new speed.
     */
    public setSpeed(speed: number): void {
        this.speed = speed;
    }

    /**
     * Sets a loop count and a callback for when the animation is finished.
     * @param {number} count The number of times to loop.
     * @param {() => void} onEndCount The callback function to run when done.
     */
    public setCount(count: number, onEndCount: () => void): void {
        this.count = count;
        this.endcountCallback = onEndCount;
    }

    /**
     * Checks if it's time to advance the animation.
     * @param {number} time The current timestamp.
     * @returns {boolean} True if it's time to animate, false otherwise.
     */
    public isTimeToAnimate(time: number): boolean {
        return (time - this.lastTime) > this.speed;
    }

    /**
     * Updates the animation state.
     * @param {number} time The current timestamp.
     * @returns {boolean} True if the animation advanced a frame, false otherwise.
     */
    public update(time: number): boolean {
        if (this.lastTime === 0 && this.name.startsWith("atk")) {
            this.lastTime = time;
        }

        if (this.isTimeToAnimate(time)) {
            this.lastTime = time;
            this.tick();
            return true;
        } else {
            return false;
        }
    }

    /**
     * Resets the animation to its starting state.
     */
    public reset(): void {
        this.lastTime = 0;
        this.currentFrame = { index: 0, x: 0, y: this.row * this.height };
    }
}