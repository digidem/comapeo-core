/* eslint-disable */
import _m0 from "protobufjs/minimal.js";

export interface ProjectExtension {
  wantCoreKeys: Buffer[];
  authCoreKeys: Buffer[];
  configCoreKeys: Buffer[];
  dataCoreKeys: Buffer[];
  blobIndexCoreKeys: Buffer[];
  blobCoreKeys: Buffer[];
}

function createBaseProjectExtension(): ProjectExtension {
  return {
    wantCoreKeys: [],
    authCoreKeys: [],
    configCoreKeys: [],
    dataCoreKeys: [],
    blobIndexCoreKeys: [],
    blobCoreKeys: [],
  };
}

export const ProjectExtension = {
  encode(message: ProjectExtension, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.wantCoreKeys) {
      writer.uint32(10).bytes(v!);
    }
    for (const v of message.authCoreKeys) {
      writer.uint32(18).bytes(v!);
    }
    for (const v of message.configCoreKeys) {
      writer.uint32(26).bytes(v!);
    }
    for (const v of message.dataCoreKeys) {
      writer.uint32(34).bytes(v!);
    }
    for (const v of message.blobIndexCoreKeys) {
      writer.uint32(42).bytes(v!);
    }
    for (const v of message.blobCoreKeys) {
      writer.uint32(50).bytes(v!);
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

          message.wantCoreKeys.push(reader.bytes() as Buffer);
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.authCoreKeys.push(reader.bytes() as Buffer);
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.configCoreKeys.push(reader.bytes() as Buffer);
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.dataCoreKeys.push(reader.bytes() as Buffer);
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.blobIndexCoreKeys.push(reader.bytes() as Buffer);
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.blobCoreKeys.push(reader.bytes() as Buffer);
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  create<I extends Exact<DeepPartial<ProjectExtension>, I>>(base?: I): ProjectExtension {
    return ProjectExtension.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ProjectExtension>, I>>(object: I): ProjectExtension {
    const message = createBaseProjectExtension();
    message.wantCoreKeys = object.wantCoreKeys?.map((e) => e) || [];
    message.authCoreKeys = object.authCoreKeys?.map((e) => e) || [];
    message.configCoreKeys = object.configCoreKeys?.map((e) => e) || [];
    message.dataCoreKeys = object.dataCoreKeys?.map((e) => e) || [];
    message.blobIndexCoreKeys = object.blobIndexCoreKeys?.map((e) => e) || [];
    message.blobCoreKeys = object.blobCoreKeys?.map((e) => e) || [];
    return message;
  },
};

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

type DeepPartial<T> = T extends Builtin ? T
  : T extends Array<infer U> ? Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
type Exact<P, I extends P> = P extends Builtin ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P>>]: never };
