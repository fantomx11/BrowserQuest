// Imports
import sanitizeHtml from 'sanitize-html';
import { Types } from '../../shared/js/gametypes';

// Use a namespace to group related utility functions
export namespace Utils {

    /**
     * Sanitizes a string by stripping unsafe tags and escaping as HTML entities.
     * @param {string} str The string to sanitize.
     * @returns {string} The sanitized string.
     */
    export function sanitize(str: string): string {
        return sanitizeHtml(str);
    }

    /**
     * Generates a random integer from 0 up to (but not including) a given range.
     * @param {number} range The upper bound (exclusive).
     * @returns {number} A random integer.
     */
    export function random(range: number): number {
        return Math.floor(Math.random() * range);
    }

    /**
     * Generates a random number within a specified range.
     * @param {number} min The minimum value (inclusive).
     * @param {number} max The maximum value (exclusive).
     * @returns {number} A random number.
     */
    export function randomRange(min: number, max: number): number {
        return min + (Math.random() * (max - min));
    }

    /**
     * Generates a random integer within a specified range.
     * @param {number} min The minimum value (inclusive).
     * @param {number} max The maximum value (inclusive).
     * @returns {number} A random integer.
     */
    export function randomInt(min: number, max: number): number {
        return min + Math.floor(Math.random() * (max - min + 1));
    }

    /**
     * Clamps a value between a minimum and maximum.
     * @param {number} min The minimum value.
     * @param {number} max The maximum value.
     * @param {number} value The value to clamp.
     * @returns {number} The clamped value.
     */
    export function clamp(min: number, max: number, value: number): number {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * Generates a random orientation.
     * @returns {Types.Orientations} A random orientation.
     */
    export function randomOrientation(): Types.Orientations {
        const r = Utils.random(4);

        if (r === 0) return Types.Orientations.LEFT;
        if (r === 1) return Types.Orientations.RIGHT;
        if (r === 2) return Types.Orientations.UP;
        return Types.Orientations.DOWN;
    }

    /**
     * Mixes a source object's properties into a target object.
     * @param {T} target The target object.
     * @param {U} source The source object.
     * @returns {T & U} The target object with the new properties.
     */
    export function Mixin<T, U>(target: T, source: U): T & U {
        if (source) {
            for (const key in source) {
                if (Object.prototype.hasOwnProperty.call(source, key)) {
                    (target as T & U)[key as keyof (T & U)] = source[key] as any;
                }
            }
        }
        return target as T & U;
    }

    /**
     * Calculates the Chebyshev distance between two points.
     * @param {number} x The x-coordinate of the first point.
     * @param {number} y The y-coordinate of the first point.
     * @param {number} x2 The x-coordinate of the second point.
     * @param {number} y2 The y-coordinate of the second point.
     * @returns {number} The Chebyshev distance.
     */
    export function distanceTo(x: number, y: number, x2: number, y2: number): number {
        const distX = Math.abs(x - x2);
        const distY = Math.abs(y - y2);

        return Math.max(distX, distY);
    }
}