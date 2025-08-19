import * as _ from 'underscore';

// Use enums for constant values to provide better readability and type-checking
export namespace Types {
    export enum Messages {
        HELLO = 0,
        WELCOME = 1,
        SPAWN = 2,
        DESPAWN = 3,
        MOVE = 4,
        LOOTMOVE = 5,
        AGGRO = 6,
        ATTACK = 7,
        HIT = 8,
        HURT = 9,
        HEALTH = 10,
        CHAT = 11,
        LOOT = 12,
        EQUIP = 13,
        DROP = 14,
        TELEPORT = 15,
        DAMAGE = 16,
        POPULATION = 17,
        KILL = 18,
        LIST = 19,
        WHO = 20,
        ZONE = 21,
        DESTROY = 22,
        HP = 23,
        BLINK = 24,
        OPEN = 25,
        CHECK = 26
    }

    export enum Entities {
        WARRIOR = 1,
        RAT = 2,
        SKELETON = 3,
        GOBLIN = 4,
        OGRE = 5,
        SPECTRE = 6,
        CRAB = 7,
        BAT = 8,
        WIZARD = 9,
        EYE = 10,
        SNAKE = 11,
        SKELETON2 = 12,
        BOSS = 13,
        DEATHKNIGHT = 14,
        FIREFOX = 20,
        CLOTHARMOR = 21,
        LEATHERARMOR = 22,
        MAILARMOR = 23,
        PLATEARMOR = 24,
        REDARMOR = 25,
        GOLDENARMOR = 26,
        FLASK = 35,
        BURGER = 36,
        CHEST = 37,
        FIREPOTION = 38,
        CAKE = 39,
        GUARD = 40,
        KING = 41,
        OCTOCAT = 42,
        VILLAGEGIRL = 43,
        VILLAGER = 44,
        PRIEST = 45,
        SCIENTIST = 46,
        AGENT = 47,
        RICK = 48,
        NYAN = 49,
        SORCERER = 50,
        BEACHNPC = 51,
        FORESTNPC = 52,
        DESERTNPC = 53,
        LAVANPC = 54,
        CODER = 55,
        SWORD1 = 60,
        SWORD2 = 61,
        REDSWORD = 62,
        GOLDENSWORD = 63,
        MORNINGSTAR = 64,
        AXE = 65,
        BLUESWORD = 66
    }

    export enum Orientations {
        UP = 1,
        DOWN = 2,
        LEFT = 3,
        RIGHT = 4
    }
}

// Type definitions for our lookup table
type EntityTypeString = "player" | "mob" | "weapon" | "armor" | "object" | "npc";
type KindData = [kind: Types.Entities, type: EntityTypeString];

const kinds: Record<string, KindData> = {
    warrior: [Types.Entities.WARRIOR, "player"],
    rat: [Types.Entities.RAT, "mob"],
    skeleton: [Types.Entities.SKELETON, "mob"],
    goblin: [Types.Entities.GOBLIN, "mob"],
    ogre: [Types.Entities.OGRE, "mob"],
    spectre: [Types.Entities.SPECTRE, "mob"],
    deathknight: [Types.Entities.DEATHKNIGHT, "mob"],
    crab: [Types.Entities.CRAB, "mob"],
    snake: [Types.Entities.SNAKE, "mob"],
    bat: [Types.Entities.BAT, "mob"],
    wizard: [Types.Entities.WIZARD, "mob"],
    eye: [Types.Entities.EYE, "mob"],
    skeleton2: [Types.Entities.SKELETON2, "mob"],
    boss: [Types.Entities.BOSS, "mob"],
    sword1: [Types.Entities.SWORD1, "weapon"],
    sword2: [Types.Entities.SWORD2, "weapon"],
    axe: [Types.Entities.AXE, "weapon"],
    redsword: [Types.Entities.REDSWORD, "weapon"],
    bluesword: [Types.Entities.BLUESWORD, "weapon"],
    goldensword: [Types.Entities.GOLDENSWORD, "weapon"],
    morningstar: [Types.Entities.MORNINGSTAR, "weapon"],
    firefox: [Types.Entities.FIREFOX, "armor"],
    clotharmor: [Types.Entities.CLOTHARMOR, "armor"],
    leatherarmor: [Types.Entities.LEATHERARMOR, "armor"],
    mailarmor: [Types.Entities.MAILARMOR, "armor"],
    platearmor: [Types.Entities.PLATEARMOR, "armor"],
    redarmor: [Types.Entities.REDARMOR, "armor"],
    goldenarmor: [Types.Entities.GOLDENARMOR, "armor"],
    flask: [Types.Entities.FLASK, "object"],
    cake: [Types.Entities.CAKE, "object"],
    burger: [Types.Entities.BURGER, "object"],
    chest: [Types.Entities.CHEST, "object"],
    firepotion: [Types.Entities.FIREPOTION, "object"],
    guard: [Types.Entities.GUARD, "npc"],
    villagegirl: [Types.Entities.VILLAGEGIRL, "npc"],
    villager: [Types.Entities.VILLAGER, "npc"],
    coder: [Types.Entities.CODER, "npc"],
    scientist: [Types.Entities.SCIENTIST, "npc"],
    priest: [Types.Entities.PRIEST, "npc"],
    king: [Types.Entities.KING, "npc"],
    rick: [Types.Entities.RICK, "npc"],
    nyan: [Types.Entities.NYAN, "npc"],
    sorcerer: [Types.Entities.SORCERER, "npc"],
    agent: [Types.Entities.AGENT, "npc"],
    octocat: [Types.Entities.OCTOCAT, "npc"],
    beachnpc: [Types.Entities.BEACHNPC, "npc"],
    forestnpc: [Types.Entities.FORESTNPC, "npc"],
    desertnpc: [Types.Entities.DESERTNPC, "npc"],
    lavanpc: [Types.Entities.LAVANPC, "npc"],
};

// Functions are now grouped within a namespace for better organization
export namespace Types {
    export const rankedWeapons: Entities[] = [
        Entities.SWORD1,
        Entities.SWORD2,
        Entities.AXE,
        Entities.MORNINGSTAR,
        Entities.BLUESWORD,
        Entities.REDSWORD,
        Entities.GOLDENSWORD
    ];

    export const rankedArmors: Entities[] = [
        Entities.CLOTHARMOR,
        Entities.LEATHERARMOR,
        Entities.MAILARMOR,
        Entities.PLATEARMOR,
        Entities.REDARMOR,
        Entities.GOLDENARMOR
    ];

    function getType(kind: Entities): EntityTypeString | undefined {
        for (const key in kinds) {
            if (Object.prototype.hasOwnProperty.call(kinds, key)) {
                if (kinds[key][0] === kind) {
                    return kinds[key][1];
                }
            }
        }
        return undefined;
    }

    export function getWeaponRank(weaponKind: Entities): number {
        return rankedWeapons.indexOf(weaponKind);
    }

    export function getArmorRank(armorKind: Entities): number {
        return rankedArmors.indexOf(armorKind);
    }

    export function isPlayer(kind: Entities): boolean {
        return getType(kind) === "player";
    }

    export function isMob(kind: Entities): boolean {
        return getType(kind) === "mob";
    }

    export function isNpc(kind: Entities): boolean {
        return getType(kind) === "npc";
    }

    export function isCharacter(kind: Entities): boolean {
        return isMob(kind) || isNpc(kind) || isPlayer(kind);
    }

    export function isArmor(kind: Entities): boolean {
        return getType(kind) === "armor";
    }

    export function isWeapon(kind: Entities): boolean {
        return getType(kind) === "weapon";
    }

    export function isObject(kind: Entities): boolean {
        return getType(kind) === "object";
    }

    export function isChest(kind: Entities): boolean {
        return kind === Entities.CHEST;
    }

    export function isItem(kind: Entities): boolean {
        return isWeapon(kind) || isArmor(kind) || (isObject(kind) && !isChest(kind));
    }

    export function isHealingItem(kind: Entities): boolean {
        return kind === Entities.FLASK || kind === Entities.BURGER;
    }

    export function isExpendableItem(kind: Entities): boolean {
        return isHealingItem(kind) || kind === Entities.FIREPOTION || kind === Entities.CAKE;
    }

    export function getKindFromString(kindName: string): Entities | undefined {
        return kinds[kindName]?.[0];
    }

    export function getKindAsString(kind: Entities): string | undefined {
        for (const key in kinds) {
            if (Object.prototype.hasOwnProperty.call(kinds, key) && kinds[key][0] === kind) {
                return key;
            }
        }
        return undefined;
    }

    export function forEachKind(callback: (kind: Entities, kindName: string) => void): void {
        for (const kindName in kinds) {
            if (Object.prototype.hasOwnProperty.call(kinds, kindName)) {
                callback(kinds[kindName][0], kindName);
            }
        }
    }

    export function forEachArmor(callback: (kind: Entities, kindName: string) => void): void {
        forEachKind((kind, kindName) => {
            if (isArmor(kind)) {
                callback(kind, kindName);
            }
        });
    }

    export function forEachMobOrNpcKind(callback: (kind: Entities, kindName: string) => void): void {
        forEachKind((kind, kindName) => {
            if (isMob(kind) || isNpc(kind)) {
                callback(kind, kindName);
            }
        });
    }

    export function forEachArmorKind(callback: (kind: Entities, kindName: string) => void): void {
        forEachKind((kind, kindName) => {
            if (isArmor(kind)) {
                callback(kind, kindName);
            }
        });
    }

    export function getOrientationAsString(orientation: Orientations): string | undefined {
        switch (orientation) {
            case Orientations.LEFT: return "left";
            case Orientations.RIGHT: return "right";
            case Orientations.UP: return "up";
            case Orientations.DOWN: return "down";
            default: return undefined;
        }
    }

    export function getRandomItemKind(): Entities {
        const all = _.union(rankedWeapons, rankedArmors),
            forbidden = [Entities.SWORD1, Entities.CLOTHARMOR],
            itemKinds = _.difference(all, forbidden),
            i = Math.floor(Math.random() * _.size(itemKinds));

        return itemKinds[i];
    }

    export function getMessageTypeAsString(type: Messages): string {
        const typeName = Messages[type];
        return typeName || "UNKNOWN";
    }
}