import { Timer } from './Timer';

// Define the Bubble class
export class Bubble {
    public readonly id: string;
    public readonly element: HTMLElement;
    public readonly timer: Timer;

    constructor(id: string, element: HTMLElement, time: number) {
        this.id = id;
        this.element = element;
        this.timer = new Timer(5000, time);
    }

    /**
     * Checks if the bubble's timer has expired.
     * @param {number} time The current timestamp.
     * @returns {boolean} True if the timer is over, otherwise false.
     */
    public isOver(time: number): boolean {
        return this.timer.isOver(time);
    }

    /**
     * Destroys the bubble's DOM element.
     */
    public destroy(): void {
        this.element.remove();
    }

    /**
     * Resets the bubble's timer.
     * @param {number} time The current timestamp.
     */
    public reset(time: number): void {
        this.timer.lastTime = time;
    }
}

// Define the BubbleManager class
export class BubbleManager {
    public readonly container: HTMLElement;
    public bubbles: Record<string, Bubble>;

    constructor(container: HTMLElement) {
        this.container = container;
        this.bubbles = {};
    }

    /**
     * Gets a bubble by its ID.
     * @param {string} id The ID of the bubble.
     * @returns {Bubble | null} The bubble object, or null if it doesn't exist.
     */
    public getBubbleById(id: string): Bubble | null {
        return this.bubbles[id] || null;
    }

    /**
     * Creates a new chat bubble or updates an existing one.
     * @param {string} id The ID of the bubble.
     * @param {string} message The message to display.
     * @param {number} time The current timestamp.
     */
    public create(id: string, message: string, time: number): void {
        const existingBubble = this.bubbles[id];
        if (existingBubble) {
            this.bubbles[id].reset(time);
            const paragraph = document.querySelector<HTMLParagraphElement>(`#${id} p`);
            if (paragraph) {
                paragraph.textContent = message;
            }
        } else {
            const bubbleElement = document.createElement('div');
            bubbleElement.id = id;
            bubbleElement.className = "bubble";
            bubbleElement.innerHTML = `<p>${message}</p><div class="thingy"></div>`;
            this.container.appendChild(bubbleElement);
            this.bubbles[id] = new Bubble(id, bubbleElement, time);
        }
    }

    /**
     * Updates all bubbles, destroying any that have expired.
     * @param {number} time The current timestamp.
     */
    public update(time: number): void {
        const bubblesToDelete: string[] = [];
        
        Object.values(this.bubbles).forEach(bubble => {
            if (bubble.isOver(time)) {
                bubble.destroy();
                bubblesToDelete.push(bubble.id);
            }
        });
        
        bubblesToDelete.forEach(id => {
            delete this.bubbles[id];
        });
    }

    /**
     * Destroys all existing bubbles.
     */
    public clean(): void {
        Object.values(this.bubbles).forEach(bubble => {
            bubble.destroy();
        });
        this.bubbles = {};
    }

    /**
     * Destroys a single bubble by its ID.
     * @param {string} id The ID of the bubble to destroy.
     */
    public destroyBubble(id: string): void {
        const bubble = this.getBubbleById(id);
        if (bubble) {
            bubble.destroy();
            delete this.bubbles[id];
        }
    }

    /**
     * Executes a callback for each active bubble.
     * @param {(bubble: Bubble) => void} callback The callback function.
     */
    public forEachBubble(callback: (bubble: Bubble) => void): void {
        Object.values(this.bubbles).forEach(callback);
    }
}