import { Utils } from "./Utils";

export namespace Formulas {
  export function dmg(weaponLevel: number, armorLevel: number) {
    const dealt = weaponLevel * Utils.randomInt(5, 10);
    const absorbed = armorLevel * Utils.randomInt(1, 3);
    const dmg = dealt - absorbed;

    if (dmg <= 0) {
      return Utils.randomInt(0, 3);
    } else {
      return dmg;
    }
  }

  export function gp(armorLevel: number) {
    const hp = 80 + ((armorLevel - 1) * 30);
    return hp;
  }

}
