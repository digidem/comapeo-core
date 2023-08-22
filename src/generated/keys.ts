/* eslint-disable */
import _m0 from "protobufjs/minimal.js";

export interface EncryptionKeys {
  auth: Buffer;
  data?: Buffer | undefined;
  config?: Buffer | undefined;
  blobIndex?: Buffer | undefined;
  blob?: Buffer | undefined;
}

export interface ProjectKeys {
  projectKey: Buffer;
  projectSecretKey?: Buffer | undefined;
  encryptionKeys: EncryptionKeys | undefined;
}

function createBaseEncryptionKeys(): EncryptionKeys {
  return { auth: Buffer.alloc(0) };
}

export const EncryptionKeys = {
  encode(message: EncryptionKeys, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.auth.length !== 0) {
      writer.uint32(10).bytes(message.auth);
    }
    if (message.data !== undefined) {
      writer.uint32(18).bytes(message.data);
    }
    if (message.config !== undefined) {
      writer.uint32(26).bytes(message.config);
    }
    if (message.blobIndex !== undefined) {
      writer.uint32(34).bytes(message.blobIndex);
    }
    if (message.blob !== undefined) {
      writer.uint32(42).bytes(message.blob);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): EncryptionKeys {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseEncryptionKeys();
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

          message.config = reader.bytes() as Buffer;
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.blobIndex = reader.bytes() as Buffer;
          continue;
        case 5:
          if (tag !== 42) {
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

function createBaseProjectKeys(): ProjectKeys {
  return { projectKey: Buffer.alloc(0), encryptionKeys: undefined };
}

export const ProjectKeys = {
  encode(message: ProjectKeys, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.projectKey.length !== 0) {
      writer.uint32(10).bytes(message.projectKey);
    }
    if (message.projectSecretKey !== undefined) {
      writer.uint32(18).bytes(message.projectSecretKey);
    }
    if (message.encryptionKeys !== undefined) {
      EncryptionKeys.encode(message.encryptionKeys, writer.uint32(26).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ProjectKeys {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseProjectKeys();
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

          message.projectSecretKey = reader.bytes() as Buffer;
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
};
