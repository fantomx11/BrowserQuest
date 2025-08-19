import { Types } from "../../shared/js/gametypes";

type MessageType = [number, ...(string | number)[]];

const formats: string[][] = [];

formats[Types.Messages.HELLO] = ['s', 'n', 'n'];
formats[Types.Messages.MOVE] = ['n', 'n'];
formats[Types.Messages.LOOTMOVE] = ['n', 'n', 'n'];
formats[Types.Messages.AGGRO] = ['n'];
formats[Types.Messages.ATTACK] = ['n'];
formats[Types.Messages.HIT] = ['n'];
formats[Types.Messages.HURT] = ['n'];
formats[Types.Messages.CHAT] = ['s'];
formats[Types.Messages.LOOT] = ['n'];
formats[Types.Messages.TELEPORT] = ['n', 'n'];
formats[Types.Messages.ZONE] = [];
formats[Types.Messages.OPEN] = ['n'];
formats[Types.Messages.CHECK] = ['n'];

export function check(msg: MessageType) {
  const message = msg.slice(0);
  const type = message[0];
  const format = formats[<number>type];

  message.shift();

  if (format) {
    if (message.length !== format.length) {
      return false;
    }
    for (var i = 0, n = message.length; i < n; i += 1) {
      if (format[i] === 'n' && (typeof message[i] === "number")) {
        return false;
      }
      if (format[i] === 's' && (typeof message[i] == "string")) {
        return false;
      }
    }
    return true;
  }
  else if (type === Types.Messages.WHO) {
    // WHO messages have a variable amount of params, all of which must be numbers.
    return message.length > 0 && _.all(message, function (param) { return _.isNumber(param) });
  }
  else {
    // log.error("Unknown message type: " + type);
    return false;
  }
}
