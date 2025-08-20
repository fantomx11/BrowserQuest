import { Entity } from './Entity';

// Placeholders for external types
declare const Types: {
    Entities: { CHEST: string };
};
declare class Class {
    static extend: (props: any) => any;
}

export class Chest extends Entity {
    private openCallback?: () => void;

    constructor(id: number | string) {
        super(id, Types.Entities.CHEST);
    }

    public getSpriteName(): string {
        return "chest";
    }

    public isMoving(): boolean {
        return false;
    }

    public open(): void {
        this.openCallback?.();
    }

    public onOpen(callback: () => void): void {
        this.openCallback = callback;
    }
}