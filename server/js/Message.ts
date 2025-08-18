// Imports
import * as _ from 'underscore';
import { Types } from '../../shared/js/gametypes';

// This file defines the structure of the data for each message type.
interface IEntity {
    id: number;
    getState(): any[];
    x: number;
    y: number;
}

interface IItem {
    id: number;
    kind: number;
}

interface IMob {
    id: number;
    kind: number;
    hatelist: { id: number }[];
}

interface IPlayer {
    id: number;
}

// The generic base class for all messages
export abstract class Message<T> {
    public abstract serialize(): T;
}

// A namespace to group all the message classes together
export namespace Messages {

    // Define the specific return types for each message using labeled tuples
    type SpawnMessageData = [messageType: Types.Messages.SPAWN, ...entityState: any[]];
    type DespawnMessageData = [messageType: Types.Messages.DESPAWN, entityId: number];
    type MoveMessageData = [messageType: Types.Messages.MOVE, entityId: number, x: number, y: number];
    type LootMoveMessageData = [messageType: Types.Messages.LOOTMOVE, entityId: number, itemId: number];
    type AttackMessageData = [messageType: Types.Messages.ATTACK, attackerId: number, targetId: number];
    type HealthMessageData = [messageType: Types.Messages.HEALTH, points: number, isRegen?: 1];
    type HitPointsMessageData = [messageType: Types.Messages.HP, maxHitPoints: number];
    type EquipItemMessageData = [messageType: Types.Messages.EQUIP, playerId: number, itemKind: number];
    type DropMessageData = [messageType: Types.Messages.DROP, mobId: number, itemId: number, itemKind: number, hatelist: number[]];
    type ChatMessageData = [messageType: Types.Messages.CHAT, playerId: number, message: string];
    type TeleportMessageData = [messageType: Types.Messages.TELEPORT, entityId: number, x: number, y: number];
    type DamageMessageData = [messageType: Types.Messages.DAMAGE, entityId: number, points: number];
    type PopulationMessageData = [messageType: Types.Messages.POPULATION, worldId: number, total: number];
    type KillMessageData = [messageType: Types.Messages.KILL, mobKind: number];
    type ListMessageData = [messageType: Types.Messages.LIST, ...ids: number[]];
    type DestroyMessageData = [messageType: Types.Messages.DESTROY, entityId: number];
    type BlinkMessageData = [messageType: Types.Messages.BLINK, itemId: number];

    export class Spawn extends Message<SpawnMessageData> {
        private entity: IEntity;
        constructor(entity: IEntity) {
            super();
            this.entity = entity;
        }
        public serialize(): SpawnMessageData {
            const spawn: any[] = [Types.Messages.SPAWN].concat(this.entity.getState());
            return spawn as SpawnMessageData;
        }
    }

    export class Despawn extends Message<DespawnMessageData> {
        private entityId: number;
        constructor(entityId: number) {
            super();
            this.entityId = entityId;
        }
        public serialize(): DespawnMessageData {
            return [Types.Messages.DESPAWN, this.entityId];
        }
    }

    export class Move extends Message<MoveMessageData> {
        private entity: IEntity;
        constructor(entity: IEntity) {
            super();
            this.entity = entity;
        }
        public serialize(): MoveMessageData {
            return [Types.Messages.MOVE, this.entity.id, this.entity.x, this.entity.y];
        }
    }

    export class LootMove extends Message<LootMoveMessageData> {
        private entity: IEntity;
        private item: IItem;
        constructor(entity: IEntity, item: IItem) {
            super();
            this.entity = entity;
            this.item = item;
        }
        public serialize(): LootMoveMessageData {
            return [Types.Messages.LOOTMOVE, this.entity.id, this.item.id];
        }
    }

    export class Attack extends Message<AttackMessageData> {
        private attackerId: number;
        private targetId: number;
        constructor(attackerId: number, targetId: number) {
            super();
            this.attackerId = attackerId;
            this.targetId = targetId;
        }
        public serialize(): AttackMessageData {
            return [Types.Messages.ATTACK, this.attackerId, this.targetId];
        }
    }

    export class Health extends Message<HealthMessageData> {
        private points: number;
        private isRegen: boolean;
        constructor(points: number, isRegen: boolean) {
            super();
            this.points = points;
            this.isRegen = isRegen;
        }
        public serialize(): HealthMessageData {
            const health: any[] = [Types.Messages.HEALTH, this.points];
            if (this.isRegen) {
                health.push(1);
            }
            return health as HealthMessageData;
        }
    }

    export class HitPoints extends Message<HitPointsMessageData> {
        private maxHitPoints: number;
        constructor(maxHitPoints: number) {
            super();
            this.maxHitPoints = maxHitPoints;
        }
        public serialize(): HitPointsMessageData {
            return [Types.Messages.HP, this.maxHitPoints];
        }
    }

    export class EquipItem extends Message<EquipItemMessageData> {
        private playerId: number;
        private itemKind: number;
        constructor(player: IPlayer, itemKind: number) {
            super();
            this.playerId = player.id;
            this.itemKind = itemKind;
        }
        public serialize(): EquipItemMessageData {
            return [Types.Messages.EQUIP, this.playerId, this.itemKind];
        }
    }

    export class Drop extends Message<DropMessageData> {
        private mob: IMob;
        private item: IItem;
        constructor(mob: IMob, item: IItem) {
            super();
            this.mob = mob;
            this.item = item;
        }
        public serialize(): DropMessageData {
            const hatelistIds = _.pluck(this.mob.hatelist, "id");
            return [Types.Messages.DROP, this.mob.id, this.item.id, this.item.kind, hatelistIds];
        }
    }

    export class Chat extends Message<ChatMessageData> {
        private playerId: number;
        private message: string;
        constructor(player: IPlayer, message: string) {
            super();
            this.playerId = player.id;
            this.message = message;
        }
        public serialize(): ChatMessageData {
            return [Types.Messages.CHAT, this.playerId, this.message];
        }
    }

    export class Teleport extends Message<TeleportMessageData> {
        private entity: IEntity;
        constructor(entity: IEntity) {
            super();
            this.entity = entity;
        }
        public serialize(): TeleportMessageData {
            return [Types.Messages.TELEPORT, this.entity.id, this.entity.x, this.entity.y];
        }
    }

    export class Damage extends Message<DamageMessageData> {
        private entity: IEntity;
        private points: number;
        constructor(entity: IEntity, points: number) {
            super();
            this.entity = entity;
            this.points = points;
        }
        public serialize(): DamageMessageData {
            return [Types.Messages.DAMAGE, this.entity.id, this.points];
        }
    }

    export class Population extends Message<PopulationMessageData> {
        private world: number;
        private total: number;
        constructor(world: number, total: number) {
            super();
            this.world = world;
            this.total = total;
        }
        public serialize(): PopulationMessageData {
            return [Types.Messages.POPULATION, this.world, this.total];
        }
    }

    export class Kill extends Message<KillMessageData> {
        private mob: IMob;
        constructor(mob: IMob) {
            super();
            this.mob = mob;
        }
        public serialize(): KillMessageData {
            return [Types.Messages.KILL, this.mob.kind];
        }
    }

    export class List extends Message<ListMessageData> {
        private ids: number[];
        constructor(ids: number[]) {
            super();
            this.ids = ids;
        }
        public serialize(): ListMessageData {
            return [Types.Messages.LIST, ...this.ids];
        }
    }

    export class Destroy extends Message<DestroyMessageData> {
        private entity: IEntity;
        constructor(entity: IEntity) {
            super();
            this.entity = entity;
        }
        public serialize(): DestroyMessageData {
            return [Types.Messages.DESTROY, this.entity.id];
        }
    }

    export class Blink extends Message<BlinkMessageData> {
        private item: IItem;
        constructor(item: IItem) {
            super();
            this.item = item;
        }
        public serialize(): BlinkMessageData {
            return [Types.Messages.BLINK, this.item.id];
        }
    }
}
