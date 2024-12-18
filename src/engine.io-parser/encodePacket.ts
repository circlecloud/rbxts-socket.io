import { PACKET_TYPES, Packet, RawData } from "./commons";

export const encodePacket = (
  packet: Packet,
  supportsBinary: boolean,
  // callback: (encodedPacket: RawData) => void,
): RawData => {
  // if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
  //   return callback(
  //     supportsBinary ? data : "b" + toBuffer(data, true).toString("base64"),
  //   );
  // }
  // plain string
  const str = PACKET_TYPES[packet.packetType] + (packet.data || "");
  // $debug("engine.io-parser encodePacket", packet, str)
  return str
};

// const toBuffer = (data: BufferSource, forceBufferConversion: boolean) => {
//   if (
//     Buffer.isBuffer(data) ||
//     (data instanceof Uint8Array && !forceBufferConversion)
//   ) {
//     return data;
//   } else if (data instanceof ArrayBuffer) {
//     return Buffer.from(data);
//   } else {
//     return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
//   }
// };

// let TEXT_ENCODER;

// export function encodePacketToBinary(
//   packet: Packet,
//   callback: (encodedPacket: RawData) => void,
// ) {
//   if (packet.data instanceof ArrayBuffer || ArrayBuffer.isView(packet.data)) {
//     return callback(toBuffer(packet.data, false));
//   }
//   encodePacket(packet, true, (encoded) => {
//     if (!TEXT_ENCODER) {
//       // lazily created for compatibility with Node.js 10
//       TEXT_ENCODER = new TextEncoder();
//     }
//     callback(TEXT_ENCODER.encode(encoded));
//   });
// }
