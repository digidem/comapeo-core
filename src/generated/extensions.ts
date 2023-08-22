/* eslint-disable */
import _m0 from "protobufjs/minimal.js";

export interface ProjectExtension {
  authCoreKeys: Buffer[];
  wantCoreKeys: Buffer[];
}

function createBaseProjectExtension(): ProjectExtension {
  return { authCoreKeys: [], wantCoreKeys: [] };
}

export const ProjectExtension = {
  encode(message: ProjectExtension, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.authCoreKeys) {
      writer.uint32(10).bytes(v!);
    }
    for (const v of message.wantCoreKeys) {
      writer.uint32(18).bytes(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ProjectExtension {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseProjectExtension();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.authCoreKeys.push(reader.bytes() as Buffer);
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.wantCoreKeys.push(reader.bytes() as Buffer);
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },
};
