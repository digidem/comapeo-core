/* eslint-disable */
import _m0 from "protobufjs/minimal.js";
function createBaseEncryptionKeys() {
    return { auth: Buffer.alloc(0) };
}
export var EncryptionKeys = {
    encode: function (message, writer) {
        if (writer === void 0) { writer = _m0.Writer.create(); }
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
    decode: function (input, length) {
        var reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        var end = length === undefined ? reader.len : reader.pos + length;
        var message = createBaseEncryptionKeys();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }
                    message.auth = reader.bytes();
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }
                    message.data = reader.bytes();
                    continue;
                case 3:
                    if (tag !== 26) {
                        break;
                    }
                    message.config = reader.bytes();
                    continue;
                case 4:
                    if (tag !== 34) {
                        break;
                    }
                    message.blobIndex = reader.bytes();
                    continue;
                case 5:
                    if (tag !== 42) {
                        break;
                    }
                    message.blob = reader.bytes();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
        return message;
    },
    create: function (base) {
        return EncryptionKeys.fromPartial(base !== null && base !== void 0 ? base : {});
    },
    fromPartial: function (object) {
        var _a, _b, _c, _d, _e;
        var message = createBaseEncryptionKeys();
        message.auth = (_a = object.auth) !== null && _a !== void 0 ? _a : Buffer.alloc(0);
        message.data = (_b = object.data) !== null && _b !== void 0 ? _b : undefined;
        message.config = (_c = object.config) !== null && _c !== void 0 ? _c : undefined;
        message.blobIndex = (_d = object.blobIndex) !== null && _d !== void 0 ? _d : undefined;
        message.blob = (_e = object.blob) !== null && _e !== void 0 ? _e : undefined;
        return message;
    },
};
function createBaseProjectKeys() {
    return { projectKey: Buffer.alloc(0), encryptionKeys: undefined };
}
export var ProjectKeys = {
    encode: function (message, writer) {
        if (writer === void 0) { writer = _m0.Writer.create(); }
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
    decode: function (input, length) {
        var reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        var end = length === undefined ? reader.len : reader.pos + length;
        var message = createBaseProjectKeys();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }
                    message.projectKey = reader.bytes();
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }
                    message.projectSecretKey = reader.bytes();
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
    create: function (base) {
        return ProjectKeys.fromPartial(base !== null && base !== void 0 ? base : {});
    },
    fromPartial: function (object) {
        var _a, _b;
        var message = createBaseProjectKeys();
        message.projectKey = (_a = object.projectKey) !== null && _a !== void 0 ? _a : Buffer.alloc(0);
        message.projectSecretKey = (_b = object.projectSecretKey) !== null && _b !== void 0 ? _b : undefined;
        message.encryptionKeys = (object.encryptionKeys !== undefined && object.encryptionKeys !== null)
            ? EncryptionKeys.fromPartial(object.encryptionKeys)
            : undefined;
        return message;
    },
};
