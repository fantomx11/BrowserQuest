// All entity classes must be imported for the factory to use them
import { Mobs } from './Mobs';
import { Items } from './Items';
import { NPCs } from './Npcs';
import { Warrior } from './Warrior';
import { Chest } from './Chest';

// Placeholders for external types
declare const log: any;
declare const Types: any;
declare const _: any;

// Define a type for a builder function
type EntityBuilder = (id: number | string, name?: string) => any;

export class EntityFactory {
    // The builders property is a Record mapping an Entity enum value to its builder function
    private builders: Record<number, EntityBuilder> = {};

    constructor() {
        this.initializeBuilders();
    }
    
    private initializeBuilders(): void {
        this.builders[Types.Entities.WARRIOR] = (id, name) => new Warrior(id, name);
        
        // Mobs
        this.builders[Types.Entities.RAT] = (id) => new Mobs.Rat(id);
        this.builders[Types.Entities.SKELETON] = (id) => new Mobs.Skeleton(id);
        this.builders[Types.Entities.SKELETON2] = (id) => new Mobs.Skeleton2(id);
        this.builders[Types.Entities.SPECTRE] = (id) => new Mobs.Spectre(id);
        this.builders[Types.Entities.DEATHKNIGHT] = (id) => new Mobs.Deathknight(id);
        this.builders[Types.Entities.GOBLIN] = (id) => new Mobs.Goblin(id);
        this.builders[Types.Entities.OGRE] = (id) => new Mobs.Ogre(id);
        this.builders[Types.Entities.CRAB] = (id) => new Mobs.Crab(id);
        this.builders[Types.Entities.SNAKE] = (id) => new Mobs.Snake(id);
        this.builders[Types.Entities.EYE] = (id) => new Mobs.Eye(id);
        this.builders[Types.Entities.BAT] = (id) => new Mobs.Bat(id);
        this.builders[Types.Entities.WIZARD] = (id) => new Mobs.Wizard(id);
        this.builders[Types.Entities.BOSS] = (id) => new Mobs.Boss(id);

        // Items
        this.builders[Types.Entities.SWORD2] = (id) => new Items.Sword2(id);
        this.builders[Types.Entities.AXE] = (id) => new Items.Axe(id);
        this.builders[Types.Entities.REDSWORD] = (id) => new Items.RedSword(id);
        this.builders[Types.Entities.BLUESWORD] = (id) => new Items.BlueSword(id);
        this.builders[Types.Entities.GOLDENSWORD] = (id) => new Items.GoldenSword(id);
        this.builders[Types.Entities.MORNINGSTAR] = (id) => new Items.MorningStar(id);
        this.builders[Types.Entities.MAILARMOR] = (id) => new Items.MailArmor(id);
        this.builders[Types.Entities.LEATHERARMOR] = (id) => new Items.LeatherArmor(id);
        this.builders[Types.Entities.PLATEARMOR] = (id) => new Items.PlateArmor(id);
        this.builders[Types.Entities.REDARMOR] = (id) => new Items.RedArmor(id);
        this.builders[Types.Entities.GOLDENARMOR] = (id) => new Items.GoldenArmor(id);
        this.builders[Types.Entities.FLASK] = (id) => new Items.Flask(id);
        this.builders[Types.Entities.FIREPOTION] = (id) => new Items.FirePotion(id);
        this.builders[Types.Entities.BURGER] = (id) => new Items.Burger(id);
        this.builders[Types.Entities.CAKE] = (id) => new Items.Cake(id);
        this.builders[Types.Entities.CHEST] = (id) => new Chest(id);

        // NPCs
        this.builders[Types.Entities.GUARD] = (id) => new NPCs.Guard(id);
        this.builders[Types.Entities.KING] = (id) => new NPCs.King(id);
        this.builders[Types.Entities.VILLAGEGIRL] = (id) => new NPCs.VillageGirl(id);
        this.builders[Types.Entities.VILLAGER] = (id) => new NPCs.Villager(id);
        this.builders[Types.Entities.CODER] = (id) => new NPCs.Coder(id);
        this.builders[Types.Entities.AGENT] = (id) => new NPCs.Agent(id);
        this.builders[Types.Entities.RICK] = (id) => new NPCs.Rick(id);
        this.builders[Types.Entities.SCIENTIST] = (id) => new NPCs.Scientist(id);
        this.builders[Types.Entities.NYAN] = (id) => new NPCs.Nyan(id);
        this.builders[Types.Entities.PRIEST] = (id) => new NPCs.Priest(id);
        this.builders[Types.Entities.SORCERER] = (id) => new NPCs.Sorcerer(id);
        this.builders[Types.Entities.OCTOCAT] = (id) => new NPCs.Octocat(id);
        this.builders[Types.Entities.BEACHNPC] = (id) => new NPCs.BeachNpc(id);
        this.builders[Types.Entities.FORESTNPC] = (id) => new NPCs.ForestNpc(id);
        this.builders[Types.Entities.DESERTNPC] = (id) => new NPCs.DesertNpc(id);
        this.builders[Types.Entities.LAVANPC] = (id) => new NPCs.LavaNpc(id);
    }

    public createEntity(kind: number, id: number | string, name?: string): any {
        if (kind === undefined || this.builders[kind] === undefined) {
            log.error(`Invalid Entity kind: ${kind}`);
            return;
        }

        const builder = this.builders[kind];
        return builder(id, name);
    }
}