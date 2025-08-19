import * as path from 'path';
import * as fs from 'fs/promises';
import { Utils } from './utils';
import { Checkpoint } from './checkpoint';

// Placeholders for external types
declare const log: any;

interface Position {
    x: number;
    y: number;
}

interface MapData {
    width: number;
    height: number;
    collisions: number[];
    roamingAreas: any;
    chestAreas: any;
    staticChests: any;
    staticEntities: any;
    doors: DoorData[];
    checkpoints: CheckpointData[];
}

interface DoorData {
    x: number;
    y: number;
    tx: number;
    ty: number;
}

interface CheckpointData {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    s: number;
}

// Helper functions (formerly outside the class)
const pos = (x: number, y: number): Position => {
    return { x, y };
};

const equalPositions = (pos1: Position, pos2: Position): boolean => {
    return pos1.x === pos2.x && pos1.y === pos2.y;
};

// Map class using modern inheritance
export class Map {
    public isLoaded: boolean;
    public width: number = 0;
    public height: number = 0;
    public collisions: number[] = [];
    public mobAreas: any;
    public chestAreas: any;
    public staticChests: any;
    public staticEntities: any;
    public grid: number[][] = [];
    public zoneWidth: number = 28;
    public zoneHeight: number = 12;
    public groupWidth: number = 0;
    public groupHeight: number = 0;
    public connectedGroups: Record<string, Position[]> = {};
    public checkpoints: Record<string, Checkpoint> = {};
    public startingAreas: Checkpoint[] = [];
    
    private readyFunc?: () => void;

    constructor(filepath: string) {
        this.isLoaded = false;
        this.loadMap(filepath);
    }
    
    private async loadMap(filepath: string): Promise<void> {
        try {
            await fs.access(filepath);
            const file = await fs.readFile(filepath, { encoding: 'utf8' });
            const json: MapData = JSON.parse(file);
            this.initMap(json);
        } catch (error) {
            log.error(`${filepath} doesn't exist or could not be read.`);
        }
    }

    public initMap(map: MapData): void {
        this.width = map.width;
        this.height = map.height;
        this.collisions = map.collisions;
        this.mobAreas = map.roamingAreas;
        this.chestAreas = map.chestAreas;
        this.staticChests = map.staticChests;
        this.staticEntities = map.staticEntities;
        this.isLoaded = true;
        
        this.groupWidth = Math.floor(this.width / this.zoneWidth);
        this.groupHeight = Math.floor(this.height / this.zoneHeight);
    
        this.initConnectedGroups(map.doors);
        this.initCheckpoints(map.checkpoints);
    
        if (this.readyFunc) {
            this.readyFunc();
        }
    }

    public ready(f: () => void): void {
        this.readyFunc = f;
    }

    public tileIndexToGridPosition(tileNum: number): Position {
        const getX = (num: number, w: number): number => {
            if (num === 0) return 0;
            return (num % w === 0) ? w - 1 : (num % w) - 1;
        };
    
        tileNum -= 1;
        const x = getX(tileNum + 1, this.width);
        const y = Math.floor(tileNum / this.width);
    
        return { x, y };
    }

    public GridPositionToTileIndex(x: number, y: number): number {
        return (y * this.width) + x + 1;
    }

    public generateCollisionGrid(): void {
        this.grid = [];
        if (this.isLoaded) {
            let tileIndex = 0;
            for (let i = 0; i < this.height; i++) {
                this.grid[i] = [];
                for (let j = 0; j < this.width; j++) {
                    this.grid[i][j] = this.collisions.includes(tileIndex) ? 1 : 0;
                    tileIndex++;
                }
            }
        }
    }

    public isOutOfBounds(x: number, y: number): boolean {
        return x <= 0 || x >= this.width || y <= 0 || y >= this.height;
    }

    public isColliding(x: number, y: number): boolean {
        if (this.isOutOfBounds(x, y)) return false;
        return this.grid[y][x] === 1;
    }
    
    public GroupIdToGroupPosition(id: string): Position {
        const posArray = id.split('-');
        return pos(parseInt(posArray[0]), parseInt(posArray[1]));
    }
    
    public forEachGroup(callback: (id: string) => void): void {
        for (let x = 0; x < this.groupWidth; x += 1) {
            for (let y = 0; y < this.groupHeight; y += 1) {
                callback(`${x}-${y}`);
            }
        }
    }
    
    public getGroupIdFromPosition(x: number, y: number): string {
        const gx = Math.floor((x - 1) / this.zoneWidth);
        const gy = Math.floor((y - 1) / this.zoneHeight);
        return `${gx}-${gy}`;
    }
    
    public getAdjacentGroupPositions(id: string): Position[] {
        const position = this.GroupIdToGroupPosition(id);
        const { x, y } = position;
        
        const list: Position[] = [
            pos(x - 1, y - 1), pos(x, y - 1), pos(x + 1, y - 1),
            pos(x - 1, y),     pos(x, y),     pos(x + 1, y),
            pos(x - 1, y + 1), pos(x, y + 1), pos(x + 1, y + 1)
        ];
        
        const connectedGroupPositions = this.connectedGroups[id] || [];
        connectedGroupPositions.forEach(connectedPosition => {
            if (!list.some(groupPos => equalPositions(groupPos, connectedPosition))) {
                list.push(connectedPosition);
            }
        });
        
        return list.filter(p => !(p.x < 0 || p.y < 0 || p.x >= this.groupWidth || p.y >= this.groupHeight));
    }
    
    public forEachAdjacentGroup(groupId: string, callback: (id: string) => void): void {
        if (groupId) {
            this.getAdjacentGroupPositions(groupId).forEach(p => {
                callback(`${p.x}-${p.y}`);
            });
        }
    }
    
    public initConnectedGroups(doors: DoorData[]): void {
        this.connectedGroups = {};
        doors.forEach(door => {
            const groupId = this.getGroupIdFromPosition(door.x, door.y);
            const connectedGroupId = this.getGroupIdFromPosition(door.tx, door.ty);
            const connectedPosition = this.GroupIdToGroupPosition(connectedGroupId);
            
            if (!this.connectedGroups[groupId]) {
                this.connectedGroups[groupId] = [];
            }
            this.connectedGroups[groupId].push(connectedPosition);
        });
    }
    
    public initCheckpoints(cpList: CheckpointData[]): void {
        this.checkpoints = {};
        this.startingAreas = [];
        
        cpList.forEach(cp => {
            const checkpoint = new Checkpoint(cp.id, cp.x, cp.y, cp.w, cp.h);
            this.checkpoints[checkpoint.id] = checkpoint;
            if (cp.s === 1) {
                this.startingAreas.push(checkpoint);
            }
        });
    }
    
    public getCheckpoint(id: string): Checkpoint | undefined {
        return this.checkpoints[id];
    }
    
    public getRandomStartingPosition(): Position | undefined {
        if (this.startingAreas.length === 0) return undefined;
        const i = Utils.randomInt(0, this.startingAreas.length - 1);
        const area = this.startingAreas[i];
        return area.getRandomPosition();
    }
}