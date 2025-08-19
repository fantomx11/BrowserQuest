// Imports
import { Types } from '../../shared/js/gametypes';

// A placeholder for the log object, which is likely a separate utility.
declare const log: any;

// Interfaces for better type safety and clarity
interface DropRates {
    [key: string]: number;
}

interface MobProperties {
    drops: DropRates;
    hp: number;
    armor: number;
    weapon: number;
}

// A constant object to hold all the game properties.
const allProperties: Record<string, MobProperties> = {
    rat: {
        drops: {
            flask: 40,
            burger: 10,
            firepotion: 5
        },
        hp: 25,
        armor: 1,
        weapon: 1
    },
    skeleton: {
        drops: {
            flask: 40,
            mailarmor: 10,
            axe: 20,
            firepotion: 5
        },
        hp: 110,
        armor: 2,
        weapon: 2
    },
    goblin: {
        drops: {
            flask: 50,
            leatherarmor: 20,
            axe: 10,
            firepotion: 5
        },
        hp: 90,
        armor: 2,
        weapon: 1
    },
    ogre: {
        drops: {
            burger: 10,
            flask: 50,
            platearmor: 20,
            morningstar: 20,
            firepotion: 5
        },
        hp: 200,
        armor: 3,
        weapon: 2
    },
    spectre: {
        drops: {
            flask: 30,
            redarmor: 40,
            redsword: 30,
            firepotion: 5
        },
        hp: 250,
        armor: 2,
        weapon: 4
    },
    deathknight: {
        drops: {
            burger: 95,
            firepotion: 5
        },
        hp: 250,
        armor: 3,
        weapon: 3
    },
    crab: {
        drops: {
            flask: 50,
            axe: 20,
            leatherarmor: 10,
            firepotion: 5
        },
        hp: 60,
        armor: 2,
        weapon: 1
    },
    snake: {
        drops: {
            flask: 50,
            mailarmor: 10,
            morningstar: 10,
            firepotion: 5
        },
        hp: 150,
        armor: 3,
        weapon: 2
    },
    skeleton2: {
        drops: {
            flask: 60,
            platearmor: 15,
            bluesword: 15,
            firepotion: 5
        },
        hp: 200,
        armor: 3,
        weapon: 3
    },
    eye: {
        drops: {
            flask: 50,
            redarmor: 20,
            redsword: 10,
            firepotion: 5
        },
        hp: 200,
        armor: 3,
        weapon: 3
    },
    bat: {
        drops: {
            flask: 50,
            axe: 10,
            firepotion: 5
        },
        hp: 80,
        armor: 2,
        weapon: 1
    },
    wizard: {
        drops: {
            flask: 50,
            platearmor: 20,
            firepotion: 5
        },
        hp: 100,
        armor: 2,
        weapon: 6
    },
    boss: {
        drops: {
            goldensword: 100
        },
        hp: 700,
        armor: 6,
        weapon: 7
    }
};

// Use a namespace to group related functions and properties
export namespace Properties {

    /**
     * Gets the armor level for a given entity kind.
     * @param {Types.Entities} kind The entity kind.
     * @returns {number | undefined} The armor level, or undefined if not found.
     */
    export function getArmorLevel(kind: Types.Entities): number | undefined {
        try {
            const kindName = Types.getKindAsString(kind);
            if (kindName) {
                if (Types.isMob(kind)) {
                    return allProperties[kindName].armor;
                }
                return Types.getArmorRank(kind) + 1;
            }
        } catch (e) {
            log.error(`No level found for armor: ${Types.getKindAsString(kind)}`);
        }
    }

    /**
     * Gets the weapon level for a given entity kind.
     * @param {Types.Entities} kind The entity kind.
     * @returns {number | undefined} The weapon level, or undefined if not found.
     */
    export function getWeaponLevel(kind: Types.Entities): number | undefined {
        try {
            const kindName = Types.getKindAsString(kind);
            if (kindName) {
                if (Types.isMob(kind)) {
                    return allProperties[kindName].weapon;
                }
                return Types.getWeaponRank(kind) + 1;
            }
        } catch (e) {
            log.error(`No level found for weapon: ${Types.getKindAsString(kind)}`);
        }
    }

    /**
     * Gets the hit points for a given entity kind.
     * @param {Types.Entities} kind The entity kind.
     * @returns {number | undefined} The hit points, or undefined if not found.
     */
    export function getHitPoints(kind: Types.Entities): number | undefined {
        const kindName = Types.getKindAsString(kind);
        if (kindName) {
            return allProperties[kindName]?.hp;
        }
        return undefined;
    }
}