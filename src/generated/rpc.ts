/* eslint-disable */
import _m0 from "protobufjs/minimal.js";
import { EncryptionKeys } from "./keys.js";

export interface Invite {
  projectKey: Buffer;
  encryptionKeys: EncryptionKeys | undefined;
  projectInfo?: Invite_ProjectInfo | undefined;
  roleName: string;
  roleDescription?: string | undefined;
  invitorName: string;
}

/** Project info that is displayed to the user receiving the invite */
export interface Invite_ProjectInfo {
  name?: string | undefined;
}

export interface InviteResponse {
  projectKey: Buffer;
  decision: InviteResponse_Decision;
}

export const InviteResponse_Decision = {
  REJECT: "REJECT",
  ACCEPT: "ACCEPT",
  ALREADY: "ALREADY",
  UNRECOGNIZED: "UNRECOGNIZED",
} as const;

export type InviteResponse_Decision = typeof InviteResponse_Decision[keyof typeof InviteResponse_Decision];

export function inviteResponse_DecisionFromJSON(object: any): InviteResponse_Decision {
  switch (object) {
    case 0:
    case "REJECT":
      return InviteResponse_Decision.REJECT;
    case 1:
    case "ACCEPT":
      return InviteResponse_Decision.ACCEPT;
    case 2:
    case "ALREADY":
      return InviteResponse_Decision.ALREADY;
    case -1:
    case "UNRECOGNIZED":
    default:
      return InviteResponse_Decision.UNRECOGNIZED;
  }
}

export function inviteResponse_DecisionToNumber(object: InviteResponse_Decision): number {
  switch (object) {
    case InviteResponse_Decision.REJECT:
      return 0;
    case InviteResponse_Decision.ACCEPT:
      return 1;
    case InviteResponse_Decision.ALREADY:
      return 2;
    case InviteResponse_Decision.UNRECOGNIZED:
    default:
      return -1;
  }
}

export interface DeviceInfo {
  name: string;
}

function createBaseInvite(): Invite {
  return { projectKey: Buffer.alloc(0), encryptionKeys: undefined, roleName: "", invitorName: "" };
}

export const Invite = {
  encode(message: Invite, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.projectKey.length !== 0) {
      writer.uint32(10).bytes(message.projectKey);
    }
    if (message.encryptionKeys !== undefined) {
      EncryptionKeys.encode(message.encryptionKeys, writer.uint32(18).fork()).ldelim();
    }
    if (message.projectInfo !== undefined) {
      Invite_ProjectInfo.encode(message.projectInfo, writer.uint32(26).fork()).ldelim();
    }
    if (message.roleName !== "") {
      writer.uint32(34).string(message.roleName);
    }
    if (message.roleDescription !== undefined) {
      writer.uint32(42).string(message.roleDescription);
    }
    if (message.invitorName !== "") {
      writer.uint32(50).string(message.invitorName);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Invite {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseInvite();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.projectKey = reader.bytes() as Buffer;
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.encryptionKeys = EncryptionKeys.decode(reader, reader.uint32());
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.projectInfo = Invite_ProjectInfo.decode(reader, reader.uint32());
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.roleName = reader.string();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.roleDescription = reader.string();
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.invitorName = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  create<I extends Exact<DeepPartial<Invite>, I>>(base?: I): Invite {
    return Invite.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Invite>, I>>(object: I): Invite {
    const message = createBaseInvite();
    message.projectKey = object.projectKey ?? Buffer.alloc(0);
    message.encryptionKeys = (object.encryptionKeys !== undefined && object.encryptionKeys !== null)
      ? EncryptionKeys.fromPartial(object.encryptionKeys)
      : undefined;
    message.projectInfo = (object.projectInfo !== undefined && object.projectInfo !== null)
      ? Invite_ProjectInfo.fromPartial(object.projectInfo)
      : undefined;
    message.roleName = object.roleName ?? "";
    message.roleDescription = object.roleDescription ?? undefined;
    message.invitorName = object.invitorName ?? "";
    return message;
  },
};

function createBaseInvite_ProjectInfo(): Invite_ProjectInfo {
  return {};
}

export const Invite_ProjectInfo = {
  encode(message: Invite_ProjectInfo, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.name !== undefined) {
      writer.uint32(10).string(message.name);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Invite_ProjectInfo {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseInvite_ProjectInfo();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
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

  create<I extends Exact<DeepPartial<Invite_ProjectInfo>, I>>(base?: I): Invite_ProjectInfo {
    return Invite_ProjectInfo.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Invite_ProjectInfo>, I>>(object: I): Invite_ProjectInfo {
    const message = createBaseInvite_ProjectInfo();
    message.name = object.name ?? undefined;
    return message;
  },
};

function createBaseInviteResponse(): InviteResponse {
  return { projectKey: Buffer.alloc(0), decision: InviteResponse_Decision.REJECT };
}

export const InviteResponse = {
  encode(message: InviteResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.projectKey.length !== 0) {
      writer.uint32(10).bytes(message.projectKey);
    }
    if (message.decision !== InviteResponse_Decision.REJECT) {
      writer.uint32(16).int32(inviteResponse_DecisionToNumber(message.decision));
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): InviteResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseInviteResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.projectKey = reader.bytes() as Buffer;
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.decision = inviteResponse_DecisionFromJSON(reader.int32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  create<I extends Exact<DeepPartial<InviteResponse>, I>>(base?: I): InviteResponse {
    return InviteResponse.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<InviteResponse>, I>>(object: I): InviteResponse {
    const message = createBaseInviteResponse();
    message.projectKey = object.projectKey ?? Buffer.alloc(0);
    message.decision = object.decision ?? InviteResponse_Decision.REJECT;
    return message;
  },
};

function createBaseDeviceInfo(): DeviceInfo {
  return { name: "" };
}

export const DeviceInfo = {
  encode(message: DeviceInfo, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.name !== "") {
      writer.uint32(10).string(message.name);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DeviceInfo {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDeviceInfo();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
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

  create<I extends Exact<DeepPartial<DeviceInfo>, I>>(base?: I): DeviceInfo {
    return DeviceInfo.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<DeviceInfo>, I>>(object: I): DeviceInfo {
    const message = createBaseDeviceInfo();
    message.name = object.name ?? "";
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
