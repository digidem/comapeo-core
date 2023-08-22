/* eslint-disable */
import _m0 from "protobufjs/minimal.js";

export interface Invite {
  projectKey: Buffer;
  encryptionKeys?: Invite_EncryptionKeys | undefined;
  projectConfig?: Buffer | undefined;
}

export interface Invite_EncryptionKeys {
  auth?: Buffer | undefined;
  data?: Buffer | undefined;
  blobIndex?: Buffer | undefined;
  blob?: Buffer | undefined;
}

export interface InviteResponse {
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

function createBaseInvite(): Invite {
  return { projectKey: Buffer.alloc(0) };
}

export const Invite = {
  encode(message: Invite, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.projectKey.length !== 0) {
      writer.uint32(10).bytes(message.projectKey);
    }
    if (message.encryptionKeys !== undefined) {
      Invite_EncryptionKeys.encode(message.encryptionKeys, writer.uint32(18).fork()).ldelim();
    }
    if (message.projectConfig !== undefined) {
      writer.uint32(26).bytes(message.projectConfig);
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

          message.encryptionKeys = Invite_EncryptionKeys.decode(reader, reader.uint32());
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.projectConfig = reader.bytes() as Buffer;
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

function createBaseInvite_EncryptionKeys(): Invite_EncryptionKeys {
  return {};
}

export const Invite_EncryptionKeys = {
  encode(message: Invite_EncryptionKeys, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.auth !== undefined) {
      writer.uint32(10).bytes(message.auth);
    }
    if (message.data !== undefined) {
      writer.uint32(18).bytes(message.data);
    }
    if (message.blobIndex !== undefined) {
      writer.uint32(26).bytes(message.blobIndex);
    }
    if (message.blob !== undefined) {
      writer.uint32(34).bytes(message.blob);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Invite_EncryptionKeys {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseInvite_EncryptionKeys();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.auth = reader.bytes() as Buffer;
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.data = reader.bytes() as Buffer;
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.blobIndex = reader.bytes() as Buffer;
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.blob = reader.bytes() as Buffer;
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
};
