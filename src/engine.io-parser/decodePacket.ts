import {
  BinaryType,
  ERROR_PACKET,
  PACKET_TYPES_REVERSE,
  Packet,
  RawData,
} from "./commons";

export const decodePacket = (
  encodedPacket: RawData,
  binaryType?: BinaryType,
): Packet => {
  // ROBLOXPATCH only supprot string data
  if (typeOf(encodedPacket) !== "string") {
    throw `Roblox only support string data`
    // return {
    //   type: "message",
    //   data: mapBinary(encodedPacket, binaryType),
    // };
  }
  const typeName = encodedPacket.sub(0, 1);
  // ROBLOXPATCH only supprot string data
  // if (type === "b") {
  //   const buffer = Buffer.from(encodedPacket.substring(1), "base64");
  //   return {
  //     type: "message",
  //     data: mapBinary(buffer, binaryType),
  //   };
  // }
  if (!PACKET_TYPES_REVERSE[typeName]) {
    return ERROR_PACKET;
  }
  return utf8.len(encodedPacket)[0] as number > 1
    ? {
      packetType: PACKET_TYPES_REVERSE[typeName],
      data: encodedPacket.sub(2),
    }
    : {
      packetType: PACKET_TYPES_REVERSE[typeName],
    };
};

// const mapBinary = (data: RawData, binaryType?: BinaryType) => {
//   switch (binaryType) {
//     case "arraybuffer":
//       if (data instanceof ArrayBuffer) {
//         // from WebSocket & binaryType "arraybuffer"
//         return data;
//       } else if (Buffer.isBuffer(data)) {
//         // from HTTP long-polling
//         return data.buffer.slice(
//           data.byteOffset,
//           data.byteOffset + data.byteLength,
//         );
//       } else {
//         // from WebTransport (Uint8Array)
//         return data.slice().buffer;
//       }
//     case "nodebuffer":
//     default:
//       if (Buffer.isBuffer(data)) {
//         // from HTTP long-polling or WebSocket & binaryType "nodebuffer" (default)
//         return data;
//       } else {
//         // from WebTransport (Uint8Array)
//         return Buffer.from(data);
//       }
//   }
// };
