/* eslint-disable */
import _m0 from "protobufjs/minimal.js";
import { IEncryptionKeys, EncryptionKeys } from "./keys.js";

export interface IInvite {
  projectKey: Buffer;
  encryptionKeys: IEncryptionKeys | undefined;
  projectInfo?: IInvite_ProjectInfo | undefined;
}

/** Project info that is displayed to the user receiving the invite */
export interface IInvite_ProjectInfo {
  name?: string | undefined;
}

export interface IInviteResponse {
  projectKey: Buffer;
  decision: InviteResponse_Decision;
}

export enum InviteResponse_Decision {
  REJECT = "REJECT",
  ACCEPT = "ACCEPT",
  ALREADY = "ALREADY",
  UNRECOGNIZED = "UNRECOGNIZED",
}

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

function createBaseInvite(): IInvite {
  return { projectKey: Buffer.alloc(0), encryptionKeys: undefined };
}

export const Invite = {
  encode(message: IInvite, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.projectKey.length !== 0) {
      writer.uint32(10).bytes(message.projectKey);
    }
    if (message.encryptionKeys !== undefined) {
      EncryptionKeys.encode(message.encryptionKeys, writer.uint32(18).fork()).ldelim();
    }
    if (message.projectInfo !== undefined) {
      Invite_ProjectInfo.encode(message.projectInfo, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): IInvite {
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
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },
};

function createBaseInvite_ProjectInfo(): IInvite_ProjectInfo {
  return {};
}

export const Invite_ProjectInfo = {
  encode(message: IInvite_ProjectInfo, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.name !== undefined) {
      writer.uint32(10).string(message.name);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): IInvite_ProjectInfo {
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
};

function createBaseInviteResponse(): IInviteResponse {
  return { projectKey: Buffer.alloc(0), decision: InviteResponse_Decision.REJECT };
}

export const InviteResponse = {
  encode(message: IInviteResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.projectKey.length !== 0) {
      writer.uint32(10).bytes(message.projectKey);
    }
    if (message.decision !== InviteResponse_Decision.REJECT) {
      writer.uint32(16).int32(inviteResponse_DecisionToNumber(message.decision));
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): IInviteResponse {
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
};
