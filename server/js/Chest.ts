import { Utils } from "./Utils";
import { Item } from "./Item";
import { Types } from "../../shared/js/gametypes";

export class Chest extends Item {
  items: number[] = [];

  constructor(id: string, x: number, y: number) {
    super(id, Types.Entities.CHEST, x, y);
  }

  setItems(items: number[]) {
    this.items = items;
  }

  getRandomItem() {
    var nbItems = this.items.length,
      item = null;

    if (nbItems > 0) {
      item = this.items[Utils.random(nbItems)];
    }
    return item;
  }
}
