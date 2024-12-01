import { Emitter } from "../component-emitter";
import { JSON, Number } from "../polyfill";
// import { deconstructPacket, reconstructPacket } from "./binary.js";
// import { isBinary, hasBinary } from "./is-binary.js";
// import debugModule from "debug"; // debug()

// const debug = debugModule("socket.io-parser"); // debug()

/**
 * These strings must not be used as event names, as they have a special meaning.
 */
const RESERVED_EVENTS = [
  "connect", // used on the client side
  "connect_error", // used on the client side
  "disconnect", // used on both sides
  "disconnecting", // used on the server side
  "newListener", // used by the Node.js EventEmitter
  "removeListener", // used by the Node.js EventEmitter
];

/**
 * Protocol version.
 *
 * @public
 */

export const protocol: number = 5;

export enum PacketType {
  CONNECT,
  DISCONNECT,
  EVENT,
  ACK,
  CONNECT_ERROR,
  BINARY_EVENT,
  BINARY_ACK,
}

export interface Packet {
  packetType: PacketType;
  nsp: string;
  data?: unknown;
  id?: number;
  attachments?: number;
}

/**
 * A socket.io Encoder instance
 */

export class Encoder {
  /**
   * Encoder constructor
   *
   * @param {function} replacer - custom replacer to pass down to JSON.parse
   */
  constructor(private replacer?: (this: any, key: string, value: any) => any) { }
  /**
   * Encode a packet as a single string if non-binary, or as a
   * buffer sequence, depending on packet type.
   *
   * @param {Object} obj - packet object
   */
  public encode(obj: Packet) {
    // $debug("encoding packet %j", obj);

    // if (obj.packetType === PacketType.EVENT || obj.packetType === PacketType.ACK) {
    //   if (hasBinary(obj)) {
    //     return this.encodeAsBinary({
    //       type:
    //         obj.type === PacketType.EVENT
    //           ? PacketType.BINARY_EVENT
    //           : PacketType.BINARY_ACK,
    //       nsp: obj.nsp,
    //       data: obj.data,
    //       id: obj.id,
    //     });
    //   }
    // }
    return [this.encodeAsString(obj)];
  }

  /**
   * Encode packet as string.
   */

  private encodeAsString(obj: Packet) {
    // first is type
    let str = "" + obj.packetType;

    // attachments if we have them
    if (
      obj.packetType === PacketType.BINARY_EVENT ||
      obj.packetType === PacketType.BINARY_ACK
    ) {
      str += obj.attachments + "-";
    }

    // if we have a namespace other than `/`
    // we append it followed by a comma `,`
    if (obj.nsp && "/" !== obj.nsp) {
      str += obj.nsp + ",";
    }

    // immediately followed by the id
    if (undefined !== obj.id) {
      str += obj.id;
    }

    // json data
    if (undefined !== obj.data) {
      str += JSON.stringify(obj.data) //, this.replacer);
    }

    // $debug("encoded %j as %s", obj, str);
    return str;
  }

  /**
   * Encode packet as 'buffer sequence' by removing blobs, and
   * deconstructing packet into object with placeholders and
   * a list of buffers.
   */

  // private encodeAsBinary(obj: Packet) {
  //   const deconstruction = deconstructPacket(obj);
  //   const pack = this.encodeAsString(deconstruction.packet);
  //   const buffers = deconstruction.buffers;

  //   buffers.unshift(pack); // add packet info to beginning of data list
  //   return buffers; // write all the buffers
  // }
}

interface DecoderReservedEvents {
  decoded: (packet: Packet) => void;
}

/**
 * A socket.io Decoder instance
 *
 * @return {Object} decoder
 */
export class Decoder extends Emitter<any, any> {
  // private reconstructor: BinaryReconstructor;

  /**
   * Decoder constructor
   *
   * @param {function} reviver - custom reviver to pass down to JSON.stringify
   */
  constructor(private reviver?: (this: any, key: string, value: any) => any) {
    super();
  }

  /**
   * Decodes an encoded packet string into packet JSON.
   *
   * @param {String} obj - encoded packet
   */

  public add(obj: unknown) {
    // $debug("decoding packet", obj)
    let packet;
    if (typeIs(obj, "string")) {
      // if (this.reconstructor) {
      //   throw ("got plaintext data when reconstructing a packet");
      // }
      packet = this.decodeString(obj);
      // const isBinaryEvent = packet.type === PacketType.BINARY_EVENT;
      // if (isBinaryEvent || packet.type === PacketType.BINARY_ACK) {
      //   packet.type = isBinaryEvent ? PacketType.EVENT : PacketType.ACK;
      //   // binary packet's json
      //   this.reconstructor = new BinaryReconstructor(packet);

      //   // no attachments, labeled binary but no binary data to follow
      //   if (packet.attachments === 0) {
      //     super.emitReserved("decoded", packet);
      //   }
      // } else {
      //   // non-binary full packet
      super.emitReserved("decoded", packet);
      // }
      // } else if (obj.base64) {
      //   // raw binary data
      //   if (!this.reconstructor) {
      //     throw ("got binary data when not reconstructing a packet");
      //   } else {
      //     packet = this.reconstructor.takeBinaryData(obj);
      //     if (packet) {
      //       // received final buffer
      //       this.reconstructor = undefined;
      //       super.emitReserved("decoded", packet);
      //     }
      //   }
    } else {
      throw ("Unknown type: " + obj);
    }
  }

  /**
   * Decode a packet String (JSON data)
   *
   * @param {String} str
   * @return {Object} packet
   */
  private decodeString(str: string): Packet {
    // $debug("socket.io-parser decodeString", str);
    let i = 0;
    // look up type
    const p: Packet = {
      packetType: Number(str.sub(++i, i))!,
    } as Packet;

    if (PacketType[p.packetType] === undefined) {
      throw ("unknown packet type " + p.packetType);
    }

    // look up attachments if type binary
    // if (
    //   p.type === PacketType.BINARY_EVENT ||
    //   p.type === PacketType.BINARY_ACK
    // ) {
    //   const start = i + 1;
    //   while (str.charAt(++i) !== "-" && i != str.length) {}
    //   const buf = str.substring(start, i);
    //   if (buf != Number(buf) || str.charAt(i) !== "-") {
    //     throw new Error("Illegal attachments");
    //   }
    //   p.attachments = Number(buf);
    // }

    // look up namespace (if any)
    if ("/" === str.sub(i + 1, i + 1)) {
      const start = i + 1;
      while (++i) {
        const c = str.sub(i, i);
        if ("," === c) break;
        if (i === str.size()) break;
      }
      p.nsp = str.sub(start, i - 1);
    } else {
      p.nsp = "/";
    }

    // look up id
    const nextChar = str.sub(i + 1, i + 1);
    if ("" !== nextChar && Number(nextChar) !== undefined) {
      const start = i + 1;
      while (++i < str.size()) {
        const c = str.sub(i, i);
        if (undefined === c || Number(c) === undefined) {
          --i;
          break;
        }
        if (i === str.size()) break;
      }
      p.id = Number(str.sub(start, i));
    }

    let data = str.sub(++i, -1)
    // look up json data
    if (data) {
      const payload = this.tryParse(data);
      if (Decoder.isPayloadValid(p.packetType, payload)) {
        p.data = payload;
      } else {
        throw ("invalid payload");
      }
    }

    // $debug("decoded %s as %j", str, p);
    return p;
  }

  private tryParse(str: string) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return false;
    }
  }

  private static isPayloadValid(typeName: PacketType, payload: unknown): boolean {
    switch (typeName) {
      case PacketType.CONNECT:
        return true;
      case PacketType.DISCONNECT:
        return payload === undefined;
      case PacketType.CONNECT_ERROR:
        return true;
      case PacketType.EVENT:
      case PacketType.BINARY_EVENT:
        return true
      case PacketType.ACK:
      case PacketType.BINARY_ACK:
        return true;
    }
  }

  /**
   * Deallocates a parser's resources
   */
  public destroy() {
    // if (this.reconstructor) {
    //   this.reconstructor.finishedReconstruction();
    //   this.reconstructor = undefined;
    // }
  }
}

/**
 * A manager of a binary event's 'buffer sequence'. Should
 * be constructed whenever a packet of type BINARY_EVENT is
 * decoded.
 *
 * @param {Object} packet
 * @return {BinaryReconstructor} initialized reconstructor
 */

// class BinaryReconstructor {
//   private reconPack;
//   private buffers: Array<Buffer | ArrayBuffer> = [];

//   constructor(readonly packet: Packet) {
//     this.reconPack = packet;
//   }

//   /**
//    * Method to be called when binary data received from connection
//    * after a BINARY_EVENT packet.
//    *
//    * @param {Buffer | ArrayBuffer} binData - the raw binary data received
//    * @return {undefined | Object} returns undefined if more binary data is expected or
//    *   a reconstructed packet object if all buffers have been received.
//    */
//   public takeBinaryData(binData) {
//     this.buffers.push(binData);
//     if (this.buffers.length === this.reconPack.attachments) {
//       // done with buffer list
//       const packet = reconstructPacket(this.reconPack, this.buffers);
//       this.finishedReconstruction();
//       return packet;
//     }
//     return undefined;
//   }

//   /**
//    * Cleans up binary packet reconstruction variables.
//    */
//   public finishedReconstruction() {
//     this.reconPack = undefined;
//     this.buffers = [];
//   }
// }

function isNamespaceValid(nsp: unknown) {
  return typeOf(nsp) === "string";
}

// see https://caniuse.com/mdn-javascript_builtins_tonumber_isinteger
// const isInteger =
//   tonumber.isInteger ||
//   function (value) {
//     return (
//       typeof value === "tonumber" &&
//       isFinite(value) &&
//       Math.floor(value) === value
//     );
//   };

function isAckIdValid(id: unknown) {
  return id === undefined || Number(id);
}

// see https://stackoverflow.com/questions/8511281/check-if-a-value-is-an-object-in-javascript
// function isObject(value: any): boolean {
//   return Object.prototype.toString.call(value) === "[object Object]";
// }

function isDataValid(typeName: PacketType, payload: unknown) {
  return true
  // switch (type) {
  //   case PacketType.CONNECT:
  //     return payload === undefined || isObject(payload);
  //   case PacketType.DISCONNECT:
  //     return payload === undefined;
  //   case PacketType.EVENT:
  //     return (
  //       Array.isArray(payload) &&
  //       (typeof payload[0] === "tonumber" ||
  //         (typeof payload[0] === "string" &&
  //           RESERVED_EVENTS.indexOf(payload[0]) === -1))
  //     );
  //   case PacketType.ACK:
  //     return Array.isArray(payload);
  //   case PacketType.CONNECT_ERROR:
  //     return typeof payload === "string" || isObject(payload);
  //   default:
  //     return false;
  // }
}

export function isPacketValid(packet: Packet): boolean {
  return (
    isNamespaceValid(packet.nsp) &&
    isAckIdValid(packet.id) as boolean &&
    isDataValid(packet.packetType, packet.data)
  );
}
