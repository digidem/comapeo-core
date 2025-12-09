/* eslint-disable */
import Long from "long";
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
  sendStats: boolean;
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

export interface MapShareRequest {
  shareId: Buffer;
  mapId: string;
  mapName: string;
  bounds: number[];
  minzoom: number;
  maxzoom: number;
  estimatedSizeBytes: number;
}

export interface MapShareResponse {
  shareId: Buffer;
  reason: MapShareResponse_Reason;
}

export const MapShareResponse_Reason = {
  ACCEPT: "ACCEPT",
  USER_REJECTED: "USER_REJECTED",
  ALREADY: "ALREADY",
  DISK_SPACE: "DISK_SPACE",
  UNRECOGNIZED: "UNRECOGNIZED",
} as const;

export type MapShareResponse_Reason = typeof MapShareResponse_Reason[keyof typeof MapShareResponse_Reason];

export function mapShareResponse_ReasonFromJSON(object: any): MapShareResponse_Reason {
  switch (object) {
    case 0:
    case "ACCEPT":
      return MapShareResponse_Reason.ACCEPT;
    case 1:
    case "USER_REJECTED":
      return MapShareResponse_Reason.USER_REJECTED;
    case 2:
    case "ALREADY":
      return MapShareResponse_Reason.ALREADY;
    case 3:
    case "DISK_SPACE":
      return MapShareResponse_Reason.DISK_SPACE;
    case -1:
    case "UNRECOGNIZED":
    default:
      return MapShareResponse_Reason.UNRECOGNIZED;
  }
}

export function mapShareResponse_ReasonToNumber(object: MapShareResponse_Reason): number {
  switch (object) {
    case MapShareResponse_Reason.ACCEPT:
      return 0;
    case MapShareResponse_Reason.USER_REJECTED:
      return 1;
    case MapShareResponse_Reason.ALREADY:
      return 2;
    case MapShareResponse_Reason.DISK_SPACE:
      return 3;
    case MapShareResponse_Reason.UNRECOGNIZED:
    default:
      return -1;
  }
}

export interface MapShareURL {
  shareId: Buffer;
  serverPublicKey: Buffer;
  url: string;
}

export interface MapShareRequestAck {
  shareId: Buffer;
}

export interface MapShareResponseAck {
  shareId: Buffer;
}

export interface MapShareURLAck {
  shareId: Buffer;
}

function createBaseInvite(): Invite {
  return {
    inviteId: Buffer.alloc(0),
    projectInviteId: Buffer.alloc(0),
    projectName: "",
    invitorName: "",
    sendStats: false,
  };
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
    if (message.sendStats === true) {
      writer.uint32(72).bool(message.sendStats);
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
        case 9:
          if (tag !== 72) {
            break;
          }

          message.sendStats = reader.bool();
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
    message.sendStats = object.sendStats ?? false;
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

function createBaseMapShareRequest(): MapShareRequest {
  return {
    shareId: Buffer.alloc(0),
    mapId: "",
    mapName: "",
    bounds: [],
    minzoom: 0,
    maxzoom: 0,
    estimatedSizeBytes: 0,
  };
}

export const MapShareRequest = {
  encode(message: MapShareRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.shareId.length !== 0) {
      writer.uint32(10).bytes(message.shareId);
    }
    if (message.mapId !== "") {
      writer.uint32(18).string(message.mapId);
    }
    if (message.mapName !== "") {
      writer.uint32(26).string(message.mapName);
    }
    writer.uint32(34).fork();
    for (const v of message.bounds) {
      writer.float(v);
    }
    writer.ldelim();
    if (message.minzoom !== 0) {
      writer.uint32(45).float(message.minzoom);
    }
    if (message.maxzoom !== 0) {
      writer.uint32(53).float(message.maxzoom);
    }
    if (message.estimatedSizeBytes !== 0) {
      writer.uint32(56).uint64(message.estimatedSizeBytes);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MapShareRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMapShareRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.shareId = reader.bytes() as Buffer;
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.mapId = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.mapName = reader.string();
          continue;
        case 4:
          if (tag === 37) {
            message.bounds.push(reader.float());

            continue;
          }

          if (tag === 34) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.bounds.push(reader.float());
            }

            continue;
          }

          break;
        case 5:
          if (tag !== 45) {
            break;
          }

          message.minzoom = reader.float();
          continue;
        case 6:
          if (tag !== 53) {
            break;
          }

          message.maxzoom = reader.float();
          continue;
        case 7:
          if (tag !== 56) {
            break;
          }

          message.estimatedSizeBytes = longToNumber(reader.uint64() as Long);
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  create<I extends Exact<DeepPartial<MapShareRequest>, I>>(base?: I): MapShareRequest {
    return MapShareRequest.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<MapShareRequest>, I>>(object: I): MapShareRequest {
    const message = createBaseMapShareRequest();
    message.shareId = object.shareId ?? Buffer.alloc(0);
    message.mapId = object.mapId ?? "";
    message.mapName = object.mapName ?? "";
    message.bounds = object.bounds?.map((e) => e) || [];
    message.minzoom = object.minzoom ?? 0;
    message.maxzoom = object.maxzoom ?? 0;
    message.estimatedSizeBytes = object.estimatedSizeBytes ?? 0;
    return message;
  },
};

function createBaseMapShareResponse(): MapShareResponse {
  return { shareId: Buffer.alloc(0), reason: MapShareResponse_Reason.ACCEPT };
}

export const MapShareResponse = {
  encode(message: MapShareResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.shareId.length !== 0) {
      writer.uint32(10).bytes(message.shareId);
    }
    if (message.reason !== MapShareResponse_Reason.ACCEPT) {
      writer.uint32(16).int32(mapShareResponse_ReasonToNumber(message.reason));
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MapShareResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMapShareResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.shareId = reader.bytes() as Buffer;
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.reason = mapShareResponse_ReasonFromJSON(reader.int32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  create<I extends Exact<DeepPartial<MapShareResponse>, I>>(base?: I): MapShareResponse {
    return MapShareResponse.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<MapShareResponse>, I>>(object: I): MapShareResponse {
    const message = createBaseMapShareResponse();
    message.shareId = object.shareId ?? Buffer.alloc(0);
    message.reason = object.reason ?? MapShareResponse_Reason.ACCEPT;
    return message;
  },
};

function createBaseMapShareURL(): MapShareURL {
  return { shareId: Buffer.alloc(0), serverPublicKey: Buffer.alloc(0), url: "" };
}

export const MapShareURL = {
  encode(message: MapShareURL, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.shareId.length !== 0) {
      writer.uint32(10).bytes(message.shareId);
    }
    if (message.serverPublicKey.length !== 0) {
      writer.uint32(18).bytes(message.serverPublicKey);
    }
    if (message.url !== "") {
      writer.uint32(26).string(message.url);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MapShareURL {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMapShareURL();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.shareId = reader.bytes() as Buffer;
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.serverPublicKey = reader.bytes() as Buffer;
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.url = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  create<I extends Exact<DeepPartial<MapShareURL>, I>>(base?: I): MapShareURL {
    return MapShareURL.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<MapShareURL>, I>>(object: I): MapShareURL {
    const message = createBaseMapShareURL();
    message.shareId = object.shareId ?? Buffer.alloc(0);
    message.serverPublicKey = object.serverPublicKey ?? Buffer.alloc(0);
    message.url = object.url ?? "";
    return message;
  },
};

function createBaseMapShareRequestAck(): MapShareRequestAck {
  return { shareId: Buffer.alloc(0) };
}

export const MapShareRequestAck = {
  encode(message: MapShareRequestAck, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.shareId.length !== 0) {
      writer.uint32(10).bytes(message.shareId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MapShareRequestAck {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMapShareRequestAck();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.shareId = reader.bytes() as Buffer;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  create<I extends Exact<DeepPartial<MapShareRequestAck>, I>>(base?: I): MapShareRequestAck {
    return MapShareRequestAck.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<MapShareRequestAck>, I>>(object: I): MapShareRequestAck {
    const message = createBaseMapShareRequestAck();
    message.shareId = object.shareId ?? Buffer.alloc(0);
    return message;
  },
};

function createBaseMapShareResponseAck(): MapShareResponseAck {
  return { shareId: Buffer.alloc(0) };
}

export const MapShareResponseAck = {
  encode(message: MapShareResponseAck, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.shareId.length !== 0) {
      writer.uint32(10).bytes(message.shareId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MapShareResponseAck {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMapShareResponseAck();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.shareId = reader.bytes() as Buffer;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  create<I extends Exact<DeepPartial<MapShareResponseAck>, I>>(base?: I): MapShareResponseAck {
    return MapShareResponseAck.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<MapShareResponseAck>, I>>(object: I): MapShareResponseAck {
    const message = createBaseMapShareResponseAck();
    message.shareId = object.shareId ?? Buffer.alloc(0);
    return message;
  },
};

function createBaseMapShareURLAck(): MapShareURLAck {
  return { shareId: Buffer.alloc(0) };
}

export const MapShareURLAck = {
  encode(message: MapShareURLAck, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.shareId.length !== 0) {
      writer.uint32(10).bytes(message.shareId);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MapShareURLAck {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMapShareURLAck();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.shareId = reader.bytes() as Buffer;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  create<I extends Exact<DeepPartial<MapShareURLAck>, I>>(base?: I): MapShareURLAck {
    return MapShareURLAck.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<MapShareURLAck>, I>>(object: I): MapShareURLAck {
    const message = createBaseMapShareURLAck();
    message.shareId = object.shareId ?? Buffer.alloc(0);
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

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

type DeepPartial<T> = T extends Builtin ? T
  : T extends Array<infer U> ? Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
type Exact<P, I extends P> = P extends Builtin ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P>>]: never };

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
