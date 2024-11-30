const PACKET_TYPES: Record<string, string> = {}; // no Map = no polyfill
PACKET_TYPES["open"] = "0";
PACKET_TYPES["close"] = "1";
PACKET_TYPES["ping"] = "2";
PACKET_TYPES["pong"] = "3";
PACKET_TYPES["message"] = "4";
PACKET_TYPES["upgrade"] = "5";
PACKET_TYPES["noop"] = "6";

const PACKET_TYPES_REVERSE: Record<string, PacketType> = {};
for (const [key, value] of PACKET_TYPES as unknown as Map<string, string>) {
  PACKET_TYPES_REVERSE[value] = key as PacketType;
}

const ERROR_PACKET: Packet = { packetType: "error", data: "parser error" };

export { PACKET_TYPES, PACKET_TYPES_REVERSE, ERROR_PACKET };

export type PacketType =
  | "open"
  | "close"
  | "ping"
  | "pong"
  | "message"
  | "upgrade"
  | "noop"
  | "error";

// RawData should be "string | Buffer | ArrayBuffer | ArrayBufferView | Blob", but Blob does not exist in Node.js and
// requires to add the dom lib in tsconfig.json
export type RawData = string;

export interface Packet {
  packetType: PacketType;
  options?: { compress: boolean };
  data?: RawData;
}

export type BinaryType = "nodebuffer" | "arraybuffer" | "blob";
