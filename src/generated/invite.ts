/* eslint-disable */
import _m0 from "protobufjs/minimal.js";

export interface RedeemInviteOverInternet {
  inviteId: Buffer;
  name: string;
}

export interface DenyInviteOverInternet {
  inviteId: Buffer;
  reason: DenyInviteOverInternet_DenyReason;
}

export const DenyInviteOverInternet_DenyReason = {
  unspecified: "unspecified",
  unknown_invite_id: "unknown_invite_id",
  invitor_denied: "invitor_denied",
  UNRECOGNIZED: "UNRECOGNIZED",
} as const;

export type DenyInviteOverInternet_DenyReason =
  typeof DenyInviteOverInternet_DenyReason[keyof typeof DenyInviteOverInternet_DenyReason];

export function denyInviteOverInternet_DenyReasonFromJSON(object: any): DenyInviteOverInternet_DenyReason {
  switch (object) {
    case 0:
    case "unspecified":
      return DenyInviteOverInternet_DenyReason.unspecified;
    case 1:
    case "unknown_invite_id":
      return DenyInviteOverInternet_DenyReason.unknown_invite_id;
    case 2:
    case "invitor_denied":
      return DenyInviteOverInternet_DenyReason.invitor_denied;
    case -1:
    case "UNRECOGNIZED":
    default:
      return DenyInviteOverInternet_DenyReason.UNRECOGNIZED;
  }
}

export function denyInviteOverInternet_DenyReasonToNumber(object: DenyInviteOverInternet_DenyReason): number {
  switch (object) {
    case DenyInviteOverInternet_DenyReason.unspecified:
      return 0;
    case DenyInviteOverInternet_DenyReason.unknown_invite_id:
      return 1;
    case DenyInviteOverInternet_DenyReason.invitor_denied:
      return 2;
    case DenyInviteOverInternet_DenyReason.UNRECOGNIZED:
    default:
      return -1;
  }
}

export interface AcceptInviteOverInternet {
  inviteId: Buffer;
}

export interface RedeemInviteOverInternetAck {
  inviteId: Buffer;
}

export interface DenyInviteOverInternetAck {
  inviteId: Buffer;
}

export interface AcceptInviteOverInternetAck {
  inviteId: Buffer;
}

function createBaseRedeemInviteOverInternet(): RedeemInviteOverInternet {
  return { inviteId: Buffer.alloc(0), name: "" };
}

export const RedeemInviteOverInternet = {
  encode(message: RedeemInviteOverInternet, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.inviteId.length !== 0) {
      writer.uint32(10).bytes(message.inviteId);
    }
    if (message.name !== "") {
      writer.uint32(18).string(message.name);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): RedeemInviteOverInternet {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRedeemInviteOverInternet();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.inviteId = reader.bytes() as Buffer;
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.name = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  create<I extends Exact<DeepPartial<RedeemInviteOverInternet>, I>>(base?: I): RedeemInviteOverInternet {
    return RedeemInviteOverInternet.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<RedeemInviteOverInternet>, I>>(object: I): RedeemInviteOverInternet {
    const message = createBaseRedeemInviteOverInternet();
    message.inviteId = object.inviteId ?? Buffer.alloc(0);
    message.name = object.name ?? "";
    return message;
  },
};

function createBaseDenyInviteOverInternet(): DenyInviteOverInternet {
  return { inviteId: Buffer.alloc(0), reason: DenyInviteOverInternet_DenyReason.unspecified };
}

export const DenyInviteOverInternet = {
  encode(message: DenyInviteOverInternet, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.inviteId.length !== 0) {
      writer.uint32(10).bytes(message.inviteId);
    }
    if (message.reason !== DenyInviteOverInternet_DenyReason.unspecified) {
      writer.uint32(16).int32(denyInviteOverInternet_DenyReasonToNumber(message.reason));
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DenyInviteOverInternet {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDenyInviteOverInternet();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.inviteId = reader.bytes() as Buffer;
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.reason = denyInviteOverInternet_DenyReasonFromJSON(reader.int32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  create<I extends Exact<DeepPartial<DenyInviteOverInternet>, I>>(base?: I): DenyInviteOverInternet {
    return DenyInviteOverInternet.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<DenyInviteOverInternet>, I>>(object: I): DenyInviteOverInternet {
    const message = createBaseDenyInviteOverInternet();
    message.inviteId = object.inviteId ?? Buffer.alloc(0);
    message.reason = object.reason ?? DenyInviteOverInternet_DenyReason.unspecified;
    return message;
  },
};

function createBaseAcceptInviteOverInternet(): AcceptInviteOverInternet {
  return { inviteId: Buffer.alloc(0) };
}

export const AcceptInviteOverInternet = {
  encode(message: AcceptInviteOverInternet, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.inviteId.length !== 0) {
      writer.uint32(10).bytes(message.inviteId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): AcceptInviteOverInternet {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAcceptInviteOverInternet();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.inviteId = reader.bytes() as Buffer;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  create<I extends Exact<DeepPartial<AcceptInviteOverInternet>, I>>(base?: I): AcceptInviteOverInternet {
    return AcceptInviteOverInternet.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<AcceptInviteOverInternet>, I>>(object: I): AcceptInviteOverInternet {
    const message = createBaseAcceptInviteOverInternet();
    message.inviteId = object.inviteId ?? Buffer.alloc(0);
    return message;
  },
};

function createBaseRedeemInviteOverInternetAck(): RedeemInviteOverInternetAck {
  return { inviteId: Buffer.alloc(0) };
}

export const RedeemInviteOverInternetAck = {
  encode(message: RedeemInviteOverInternetAck, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.inviteId.length !== 0) {
      writer.uint32(10).bytes(message.inviteId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): RedeemInviteOverInternetAck {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseRedeemInviteOverInternetAck();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.inviteId = reader.bytes() as Buffer;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  create<I extends Exact<DeepPartial<RedeemInviteOverInternetAck>, I>>(base?: I): RedeemInviteOverInternetAck {
    return RedeemInviteOverInternetAck.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<RedeemInviteOverInternetAck>, I>>(object: I): RedeemInviteOverInternetAck {
    const message = createBaseRedeemInviteOverInternetAck();
    message.inviteId = object.inviteId ?? Buffer.alloc(0);
    return message;
  },
};

function createBaseDenyInviteOverInternetAck(): DenyInviteOverInternetAck {
  return { inviteId: Buffer.alloc(0) };
}

export const DenyInviteOverInternetAck = {
  encode(message: DenyInviteOverInternetAck, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.inviteId.length !== 0) {
      writer.uint32(10).bytes(message.inviteId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DenyInviteOverInternetAck {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDenyInviteOverInternetAck();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.inviteId = reader.bytes() as Buffer;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  create<I extends Exact<DeepPartial<DenyInviteOverInternetAck>, I>>(base?: I): DenyInviteOverInternetAck {
    return DenyInviteOverInternetAck.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<DenyInviteOverInternetAck>, I>>(object: I): DenyInviteOverInternetAck {
    const message = createBaseDenyInviteOverInternetAck();
    message.inviteId = object.inviteId ?? Buffer.alloc(0);
    return message;
  },
};

function createBaseAcceptInviteOverInternetAck(): AcceptInviteOverInternetAck {
  return { inviteId: Buffer.alloc(0) };
}

export const AcceptInviteOverInternetAck = {
  encode(message: AcceptInviteOverInternetAck, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.inviteId.length !== 0) {
      writer.uint32(10).bytes(message.inviteId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): AcceptInviteOverInternetAck {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseAcceptInviteOverInternetAck();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.inviteId = reader.bytes() as Buffer;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  create<I extends Exact<DeepPartial<AcceptInviteOverInternetAck>, I>>(base?: I): AcceptInviteOverInternetAck {
    return AcceptInviteOverInternetAck.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<AcceptInviteOverInternetAck>, I>>(object: I): AcceptInviteOverInternetAck {
    const message = createBaseAcceptInviteOverInternetAck();
    message.inviteId = object.inviteId ?? Buffer.alloc(0);
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
