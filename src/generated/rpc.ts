/* eslint-disable */
import _m0 from "protobufjs/minimal.js";
import { EncryptionKeys } from "./keys.js";

export interface Invite {
  inviteId: Buffer;
  projectInviteId: Buffer;
  projectName: string;
  roleName?: string | undefined;
  roleDescription?: string | undefined;
  invitorName: string;
  projectColor?: string | undefined;
  projectDescription?: string | undefined;
}

export interface InviteCancel {
  inviteId: Buffer;
}

export interface InviteResponse {
  inviteId: Buffer;
  decision: InviteResponse_Decision;
}

export const InviteResponse_Decision = {
  DECISION_UNSPECIFIED: "DECISION_UNSPECIFIED",
  REJECT: "REJECT",
  ACCEPT: "ACCEPT",
  ALREADY: "ALREADY",
  UNRECOGNIZED: "UNRECOGNIZED",
} as const;

export type InviteResponse_Decision = typeof InviteResponse_Decision[keyof typeof InviteResponse_Decision];

export function inviteResponse_DecisionFromJSON(object: any): InviteResponse_Decision {
  switch (object) {
    case 0:
    case "DECISION_UNSPECIFIED":
      return InviteResponse_Decision.DECISION_UNSPECIFIED;
    case 1:
    case "REJECT":
      return InviteResponse_Decision.REJECT;
    case 2:
    case "ACCEPT":
      return InviteResponse_Decision.ACCEPT;
    case 3:
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
    case InviteResponse_Decision.DECISION_UNSPECIFIED:
      return 0;
    case InviteResponse_Decision.REJECT:
      return 1;
    case InviteResponse_Decision.ACCEPT:
      return 2;
    case InviteResponse_Decision.ALREADY:
      return 3;
    case InviteResponse_Decision.UNRECOGNIZED:
    default:
      return -1;
  }
}

export interface ProjectJoinDetails {
  inviteId: Buffer;
  projectKey: Buffer;
  encryptionKeys: EncryptionKeys | undefined;
}

export interface DeviceInfo {
  name: string;
  deviceType?: DeviceInfo_DeviceType | undefined;
  features: DeviceInfo_RPCFeatures[];
}

export const DeviceInfo_DeviceType = {
  device_type_unspecified: "device_type_unspecified",
  mobile: "mobile",
  tablet: "tablet",
  desktop: "desktop",
  UNRECOGNIZED: "UNRECOGNIZED",
} as const;

export type DeviceInfo_DeviceType = typeof DeviceInfo_DeviceType[keyof typeof DeviceInfo_DeviceType];

export function deviceInfo_DeviceTypeFromJSON(object: any): DeviceInfo_DeviceType {
  switch (object) {
    case 0:
    case "device_type_unspecified":
      return DeviceInfo_DeviceType.device_type_unspecified;
    case 1:
    case "mobile":
      return DeviceInfo_DeviceType.mobile;
    case 2:
    case "tablet":
      return DeviceInfo_DeviceType.tablet;
    case 3:
    case "desktop":
      return DeviceInfo_DeviceType.desktop;
    case -1:
    case "UNRECOGNIZED":
    default:
      return DeviceInfo_DeviceType.UNRECOGNIZED;
  }
}

export function deviceInfo_DeviceTypeToNumber(object: DeviceInfo_DeviceType): number {
  switch (object) {
    case DeviceInfo_DeviceType.device_type_unspecified:
      return 0;
    case DeviceInfo_DeviceType.mobile:
      return 1;
    case DeviceInfo_DeviceType.tablet:
      return 2;
    case DeviceInfo_DeviceType.desktop:
      return 3;
    case DeviceInfo_DeviceType.UNRECOGNIZED:
    default:
      return -1;
  }
}

export const DeviceInfo_RPCFeatures = {
  features_unspecified: "features_unspecified",
  ack: "ack",
  UNRECOGNIZED: "UNRECOGNIZED",
} as const;

export type DeviceInfo_RPCFeatures = typeof DeviceInfo_RPCFeatures[keyof typeof DeviceInfo_RPCFeatures];

export function deviceInfo_RPCFeaturesFromJSON(object: any): DeviceInfo_RPCFeatures {
  switch (object) {
    case 0:
    case "features_unspecified":
      return DeviceInfo_RPCFeatures.features_unspecified;
    case 1:
    case "ack":
      return DeviceInfo_RPCFeatures.ack;
    case -1:
    case "UNRECOGNIZED":
    default:
      return DeviceInfo_RPCFeatures.UNRECOGNIZED;
  }
}

export function deviceInfo_RPCFeaturesToNumber(object: DeviceInfo_RPCFeatures): number {
  switch (object) {
    case DeviceInfo_RPCFeatures.features_unspecified:
      return 0;
    case DeviceInfo_RPCFeatures.ack:
      return 1;
    case DeviceInfo_RPCFeatures.UNRECOGNIZED:
    default:
      return -1;
  }
}

export interface InviteAck {
  inviteId: Buffer;
}

export interface InviteCancelAck {
  inviteId: Buffer;
}

export interface InviteResponseAck {
  inviteId: Buffer;
}

export interface ProjectJoinDetailsAck {
  inviteId: Buffer;
}

function createBaseInvite(): Invite {
  return { inviteId: Buffer.alloc(0), projectInviteId: Buffer.alloc(0), projectName: "", invitorName: "" };
}

export const Invite = {
  encode(message: Invite, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.inviteId.length !== 0) {
      writer.uint32(10).bytes(message.inviteId);
    }
    if (message.projectInviteId.length !== 0) {
      writer.uint32(18).bytes(message.projectInviteId);
    }
    if (message.projectName !== "") {
      writer.uint32(26).string(message.projectName);
    }
    if (message.roleName !== undefined) {
      writer.uint32(34).string(message.roleName);
    }
    if (message.roleDescription !== undefined) {
      writer.uint32(42).string(message.roleDescription);
    }
    if (message.invitorName !== "") {
      writer.uint32(50).string(message.invitorName);
    }
    if (message.projectColor !== undefined) {
      writer.uint32(58).string(message.projectColor);
    }
    if (message.projectDescription !== undefined) {
      writer.uint32(66).string(message.projectDescription);
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

          message.inviteId = reader.bytes() as Buffer;
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.projectInviteId = reader.bytes() as Buffer;
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.projectName = reader.string();
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
        case 7:
          if (tag !== 58) {
            break;
          }

          message.projectColor = reader.string();
          continue;
        case 8:
          if (tag !== 66) {
            break;
          }

          message.projectDescription = reader.string();
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
    message.inviteId = object.inviteId ?? Buffer.alloc(0);
    message.projectInviteId = object.projectInviteId ?? Buffer.alloc(0);
    message.projectName = object.projectName ?? "";
    message.roleName = object.roleName ?? undefined;
    message.roleDescription = object.roleDescription ?? undefined;
    message.invitorName = object.invitorName ?? "";
    message.projectColor = object.projectColor ?? undefined;
    message.projectDescription = object.projectDescription ?? undefined;
    return message;
  },
};

function createBaseInviteCancel(): InviteCancel {
  return { inviteId: Buffer.alloc(0) };
}

export const InviteCancel = {
  encode(message: InviteCancel, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.inviteId.length !== 0) {
      writer.uint32(10).bytes(message.inviteId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): InviteCancel {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseInviteCancel();
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

  create<I extends Exact<DeepPartial<InviteCancel>, I>>(base?: I): InviteCancel {
    return InviteCancel.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<InviteCancel>, I>>(object: I): InviteCancel {
    const message = createBaseInviteCancel();
    message.inviteId = object.inviteId ?? Buffer.alloc(0);
    return message;
  },
};

function createBaseInviteResponse(): InviteResponse {
  return { inviteId: Buffer.alloc(0), decision: InviteResponse_Decision.DECISION_UNSPECIFIED };
}

export const InviteResponse = {
  encode(message: InviteResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.inviteId.length !== 0) {
      writer.uint32(10).bytes(message.inviteId);
    }
    if (message.decision !== InviteResponse_Decision.DECISION_UNSPECIFIED) {
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

          message.inviteId = reader.bytes() as Buffer;
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
    message.inviteId = object.inviteId ?? Buffer.alloc(0);
    message.decision = object.decision ?? InviteResponse_Decision.DECISION_UNSPECIFIED;
    return message;
  },
};

function createBaseProjectJoinDetails(): ProjectJoinDetails {
  return { inviteId: Buffer.alloc(0), projectKey: Buffer.alloc(0), encryptionKeys: undefined };
}

export const ProjectJoinDetails = {
  encode(message: ProjectJoinDetails, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.inviteId.length !== 0) {
      writer.uint32(10).bytes(message.inviteId);
    }
    if (message.projectKey.length !== 0) {
      writer.uint32(18).bytes(message.projectKey);
    }
    if (message.encryptionKeys !== undefined) {
      EncryptionKeys.encode(message.encryptionKeys, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ProjectJoinDetails {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseProjectJoinDetails();
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

          message.projectKey = reader.bytes() as Buffer;
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.encryptionKeys = EncryptionKeys.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  create<I extends Exact<DeepPartial<ProjectJoinDetails>, I>>(base?: I): ProjectJoinDetails {
    return ProjectJoinDetails.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ProjectJoinDetails>, I>>(object: I): ProjectJoinDetails {
    const message = createBaseProjectJoinDetails();
    message.inviteId = object.inviteId ?? Buffer.alloc(0);
    message.projectKey = object.projectKey ?? Buffer.alloc(0);
    message.encryptionKeys = (object.encryptionKeys !== undefined && object.encryptionKeys !== null)
      ? EncryptionKeys.fromPartial(object.encryptionKeys)
      : undefined;
    return message;
  },
};

function createBaseDeviceInfo(): DeviceInfo {
  return { name: "", features: [] };
}

export const DeviceInfo = {
  encode(message: DeviceInfo, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.name !== "") {
      writer.uint32(10).string(message.name);
    }
    if (message.deviceType !== undefined) {
      writer.uint32(16).int32(deviceInfo_DeviceTypeToNumber(message.deviceType));
    }
    writer.uint32(26).fork();
    for (const v of message.features) {
      writer.int32(deviceInfo_RPCFeaturesToNumber(v));
    }
    writer.ldelim();
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
        case 2:
          if (tag !== 16) {
            break;
          }

          message.deviceType = deviceInfo_DeviceTypeFromJSON(reader.int32());
          continue;
        case 3:
          if (tag === 24) {
            message.features.push(deviceInfo_RPCFeaturesFromJSON(reader.int32()));

            continue;
          }

          if (tag === 26) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.features.push(deviceInfo_RPCFeaturesFromJSON(reader.int32()));
            }

            continue;
          }

          break;
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
    message.deviceType = object.deviceType ?? undefined;
    message.features = object.features?.map((e) => e) || [];
    return message;
  },
};

function createBaseInviteAck(): InviteAck {
  return { inviteId: Buffer.alloc(0) };
}

export const InviteAck = {
  encode(message: InviteAck, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.inviteId.length !== 0) {
      writer.uint32(10).bytes(message.inviteId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): InviteAck {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseInviteAck();
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

  create<I extends Exact<DeepPartial<InviteAck>, I>>(base?: I): InviteAck {
    return InviteAck.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<InviteAck>, I>>(object: I): InviteAck {
    const message = createBaseInviteAck();
    message.inviteId = object.inviteId ?? Buffer.alloc(0);
    return message;
  },
};

function createBaseInviteCancelAck(): InviteCancelAck {
  return { inviteId: Buffer.alloc(0) };
}

export const InviteCancelAck = {
  encode(message: InviteCancelAck, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.inviteId.length !== 0) {
      writer.uint32(10).bytes(message.inviteId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): InviteCancelAck {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseInviteCancelAck();
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

  create<I extends Exact<DeepPartial<InviteCancelAck>, I>>(base?: I): InviteCancelAck {
    return InviteCancelAck.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<InviteCancelAck>, I>>(object: I): InviteCancelAck {
    const message = createBaseInviteCancelAck();
    message.inviteId = object.inviteId ?? Buffer.alloc(0);
    return message;
  },
};

function createBaseInviteResponseAck(): InviteResponseAck {
  return { inviteId: Buffer.alloc(0) };
}

export const InviteResponseAck = {
  encode(message: InviteResponseAck, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.inviteId.length !== 0) {
      writer.uint32(10).bytes(message.inviteId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): InviteResponseAck {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseInviteResponseAck();
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

  create<I extends Exact<DeepPartial<InviteResponseAck>, I>>(base?: I): InviteResponseAck {
    return InviteResponseAck.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<InviteResponseAck>, I>>(object: I): InviteResponseAck {
    const message = createBaseInviteResponseAck();
    message.inviteId = object.inviteId ?? Buffer.alloc(0);
    return message;
  },
};

function createBaseProjectJoinDetailsAck(): ProjectJoinDetailsAck {
  return { inviteId: Buffer.alloc(0) };
}

export const ProjectJoinDetailsAck = {
  encode(message: ProjectJoinDetailsAck, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.inviteId.length !== 0) {
      writer.uint32(10).bytes(message.inviteId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ProjectJoinDetailsAck {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseProjectJoinDetailsAck();
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

  create<I extends Exact<DeepPartial<ProjectJoinDetailsAck>, I>>(base?: I): ProjectJoinDetailsAck {
    return ProjectJoinDetailsAck.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ProjectJoinDetailsAck>, I>>(object: I): ProjectJoinDetailsAck {
    const message = createBaseProjectJoinDetailsAck();
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
