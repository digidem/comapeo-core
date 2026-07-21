/* eslint-disable */
import _m0 from "protobufjs/minimal.js";

export interface SwarmHandshake {
  publicKey: Buffer;
  signature: Buffer;
}

function createBaseSwarmHandshake(): SwarmHandshake {
  return { publicKey: Buffer.alloc(0), signature: Buffer.alloc(0) };
}

export const SwarmHandshake = {
  encode(message: SwarmHandshake, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.publicKey.length !== 0) {
      writer.uint32(10).bytes(message.publicKey);
    }
    if (message.signature.length !== 0) {
      writer.uint32(18).bytes(message.signature);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SwarmHandshake {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSwarmHandshake();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.publicKey = reader.bytes() as Buffer;
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.signature = reader.bytes() as Buffer;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  create<I extends Exact<DeepPartial<SwarmHandshake>, I>>(base?: I): SwarmHandshake {
    return SwarmHandshake.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<SwarmHandshake>, I>>(object: I): SwarmHandshake {
    const message = createBaseSwarmHandshake();
    message.publicKey = object.publicKey ?? Buffer.alloc(0);
    message.signature = object.signature ?? Buffer.alloc(0);
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
