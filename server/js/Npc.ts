import { Entity } from "./Entity";

export class Npc extends Entity {
  constructor(id: string | number, kind: number, x: number, y: number) {
    super(id, "npc", kind, x, y);
  }
}