/* eslint-disable */
import _m0 from "protobufjs/minimal.js";

export interface Hello {
  protocolVersion: number;
  features: string[];
}

export interface IdentityProof {
  publicKey: Buffer;
  signature: Buffer;
}

function createBaseHello(): Hello {
  return { protocolVersion: 0, features: [] };
}

export const Hello = {
  encode(message: Hello, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.protocolVersion !== 0) {
      writer.uint32(8).int32(message.protocolVersion);
    }
    for (const v of message.features) {
      writer.uint32(18).string(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Hello {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseHello();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.protocolVersion = reader.int32();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.features.push(reader.string());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  create<I extends Exact<DeepPartial<Hello>, I>>(base?: I): Hello {
    return Hello.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Hello>, I>>(object: I): Hello {
    const message = createBaseHello();
    message.protocolVersion = object.protocolVersion ?? 0;
    message.features = object.features?.map((e) => e) || [];
    return message;
  },
};

function createBaseIdentityProof(): IdentityProof {
  return { publicKey: Buffer.alloc(0), signature: Buffer.alloc(0) };
}

export const IdentityProof = {
  encode(message: IdentityProof, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.publicKey.length !== 0) {
      writer.uint32(10).bytes(message.publicKey);
    }
    if (message.signature.length !== 0) {
      writer.uint32(18).bytes(message.signature);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): IdentityProof {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseIdentityProof();
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

  create<I extends Exact<DeepPartial<IdentityProof>, I>>(base?: I): IdentityProof {
    return IdentityProof.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<IdentityProof>, I>>(object: I): IdentityProof {
    const message = createBaseIdentityProof();
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
