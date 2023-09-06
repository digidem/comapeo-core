/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal.js";

export interface ProjectExtension {
  authCoreKeys: Buffer[];
  wantCoreKeys: Buffer[];
}

export interface HaveExtension {
  discoveryKey: Buffer;
  start: number;
  bitfield: Buffer;
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

function createBaseHaveExtension(): HaveExtension {
  return { discoveryKey: Buffer.alloc(0), start: 0, bitfield: Buffer.alloc(0) };
}

export const HaveExtension = {
  encode(message: HaveExtension, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.discoveryKey.length !== 0) {
      writer.uint32(10).bytes(message.discoveryKey);
    }
    if (message.start !== 0) {
      writer.uint32(16).uint64(message.start);
    }
    if (message.bitfield.length !== 0) {
      writer.uint32(26).bytes(message.bitfield);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): HaveExtension {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseHaveExtension();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.discoveryKey = reader.bytes() as Buffer;
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.start = longToNumber(reader.uint64() as Long);
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.bitfield = reader.bytes() as Buffer;
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

declare const self: any | undefined;
declare const window: any | undefined;
declare const global: any | undefined;
const tsProtoGlobalThis: any = (() => {
  if (typeof globalThis !== "undefined") {
    return globalThis;
  }
  if (typeof self !== "undefined") {
    return self;
  }
  if (typeof window !== "undefined") {
    return window;
  }
  if (typeof global !== "undefined") {
    return global;
  }
  throw "Unable to locate global object";
})();

function longToNumber(long: Long): number {
  if (long.gt(Number.MAX_SAFE_INTEGER)) {
    throw new tsProtoGlobalThis.Error("Value is larger than Number.MAX_SAFE_INTEGER");
  }
  return long.toNumber();
}

if (_m0.util.Long !== Long) {
  _m0.util.Long = Long as any;
  _m0.configure();
}
