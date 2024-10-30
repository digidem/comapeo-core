/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal.js";
export var HaveExtension_Namespace = {
    auth: "auth",
    config: "config",
    data: "data",
    blobIndex: "blobIndex",
    blob: "blob",
    UNRECOGNIZED: "UNRECOGNIZED",
};
export function haveExtension_NamespaceFromJSON(object) {
    switch (object) {
        case 0:
        case "auth":
            return HaveExtension_Namespace.auth;
        case 1:
        case "config":
            return HaveExtension_Namespace.config;
        case 2:
        case "data":
            return HaveExtension_Namespace.data;
        case 3:
        case "blobIndex":
            return HaveExtension_Namespace.blobIndex;
        case 4:
        case "blob":
            return HaveExtension_Namespace.blob;
        case -1:
        case "UNRECOGNIZED":
        default:
            return HaveExtension_Namespace.UNRECOGNIZED;
    }
}
export function haveExtension_NamespaceToNumber(object) {
    switch (object) {
        case HaveExtension_Namespace.auth:
            return 0;
        case HaveExtension_Namespace.config:
            return 1;
        case HaveExtension_Namespace.data:
            return 2;
        case HaveExtension_Namespace.blobIndex:
            return 3;
        case HaveExtension_Namespace.blob:
            return 4;
        case HaveExtension_Namespace.UNRECOGNIZED:
        default:
            return -1;
    }
}
function createBaseProjectExtension() {
    return { authCoreKeys: [] };
}
export var ProjectExtension = {
    encode: function (message, writer) {
        if (writer === void 0) { writer = _m0.Writer.create(); }
        for (var _i = 0, _a = message.authCoreKeys; _i < _a.length; _i++) {
            var v = _a[_i];
            writer.uint32(10).bytes(v);
        }
        return writer;
    },
    decode: function (input, length) {
        var reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        var end = length === undefined ? reader.len : reader.pos + length;
        var message = createBaseProjectExtension();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }
                    message.authCoreKeys.push(reader.bytes());
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
        return ProjectExtension.fromPartial(base !== null && base !== void 0 ? base : {});
    },
    fromPartial: function (object) {
        var _a;
        var message = createBaseProjectExtension();
        message.authCoreKeys = ((_a = object.authCoreKeys) === null || _a === void 0 ? void 0 : _a.map(function (e) { return e; })) || [];
        return message;
    },
};
function createBaseHaveExtension() {
    return {
        discoveryKey: Buffer.alloc(0),
        start: 0,
        encodedBitfield: Buffer.alloc(0),
        namespace: HaveExtension_Namespace.auth,
    };
}
export var HaveExtension = {
    encode: function (message, writer) {
        if (writer === void 0) { writer = _m0.Writer.create(); }
        if (message.discoveryKey.length !== 0) {
            writer.uint32(10).bytes(message.discoveryKey);
        }
        if (message.start !== 0) {
            writer.uint32(16).uint64(message.start);
        }
        if (message.encodedBitfield.length !== 0) {
            writer.uint32(26).bytes(message.encodedBitfield);
        }
        if (message.namespace !== HaveExtension_Namespace.auth) {
            writer.uint32(32).int32(haveExtension_NamespaceToNumber(message.namespace));
        }
        return writer;
    },
    decode: function (input, length) {
        var reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        var end = length === undefined ? reader.len : reader.pos + length;
        var message = createBaseHaveExtension();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }
                    message.discoveryKey = reader.bytes();
                    continue;
                case 2:
                    if (tag !== 16) {
                        break;
                    }
                    message.start = longToNumber(reader.uint64());
                    continue;
                case 3:
                    if (tag !== 26) {
                        break;
                    }
                    message.encodedBitfield = reader.bytes();
                    continue;
                case 4:
                    if (tag !== 32) {
                        break;
                    }
                    message.namespace = haveExtension_NamespaceFromJSON(reader.int32());
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
        return HaveExtension.fromPartial(base !== null && base !== void 0 ? base : {});
    },
    fromPartial: function (object) {
        var _a, _b, _c, _d;
        var message = createBaseHaveExtension();
        message.discoveryKey = (_a = object.discoveryKey) !== null && _a !== void 0 ? _a : Buffer.alloc(0);
        message.start = (_b = object.start) !== null && _b !== void 0 ? _b : 0;
        message.encodedBitfield = (_c = object.encodedBitfield) !== null && _c !== void 0 ? _c : Buffer.alloc(0);
        message.namespace = (_d = object.namespace) !== null && _d !== void 0 ? _d : HaveExtension_Namespace.auth;
        return message;
    },
};
function createBaseDownloadIntentExtension() {
    return { downloadIntents: {} };
}
export var DownloadIntentExtension = {
    encode: function (message, writer) {
        if (writer === void 0) { writer = _m0.Writer.create(); }
        Object.entries(message.downloadIntents).forEach(function (_a) {
            var key = _a[0], value = _a[1];
            DownloadIntentExtension_DownloadIntentsEntry.encode({ key: key, value: value }, writer.uint32(10).fork())
                .ldelim();
        });
        return writer;
    },
    decode: function (input, length) {
        var reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        var end = length === undefined ? reader.len : reader.pos + length;
        var message = createBaseDownloadIntentExtension();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }
                    var entry1 = DownloadIntentExtension_DownloadIntentsEntry.decode(reader, reader.uint32());
                    if (entry1.value !== undefined) {
                        message.downloadIntents[entry1.key] = entry1.value;
                    }
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
        return DownloadIntentExtension.fromPartial(base !== null && base !== void 0 ? base : {});
    },
    fromPartial: function (object) {
        var _a;
        var message = createBaseDownloadIntentExtension();
        message.downloadIntents = Object.entries((_a = object.downloadIntents) !== null && _a !== void 0 ? _a : {}).reduce(function (acc, _a) {
            var key = _a[0], value = _a[1];
            if (value !== undefined) {
                acc[key] = DownloadIntentExtension_DownloadIntent.fromPartial(value);
            }
            return acc;
        }, {});
        return message;
    },
};
function createBaseDownloadIntentExtension_DownloadIntent() {
    return { variants: [] };
}
export var DownloadIntentExtension_DownloadIntent = {
    encode: function (message, writer) {
        if (writer === void 0) { writer = _m0.Writer.create(); }
        for (var _i = 0, _a = message.variants; _i < _a.length; _i++) {
            var v = _a[_i];
            writer.uint32(10).string(v);
        }
        return writer;
    },
    decode: function (input, length) {
        var reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        var end = length === undefined ? reader.len : reader.pos + length;
        var message = createBaseDownloadIntentExtension_DownloadIntent();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }
                    message.variants.push(reader.string());
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
        return DownloadIntentExtension_DownloadIntent.fromPartial(base !== null && base !== void 0 ? base : {});
    },
    fromPartial: function (object) {
        var _a;
        var message = createBaseDownloadIntentExtension_DownloadIntent();
        message.variants = ((_a = object.variants) === null || _a === void 0 ? void 0 : _a.map(function (e) { return e; })) || [];
        return message;
    },
};
function createBaseDownloadIntentExtension_DownloadIntentsEntry() {
    return { key: "", value: undefined };
}
export var DownloadIntentExtension_DownloadIntentsEntry = {
    encode: function (message, writer) {
        if (writer === void 0) { writer = _m0.Writer.create(); }
        if (message.key !== "") {
            writer.uint32(10).string(message.key);
        }
        if (message.value !== undefined) {
            DownloadIntentExtension_DownloadIntent.encode(message.value, writer.uint32(18).fork()).ldelim();
        }
        return writer;
    },
    decode: function (input, length) {
        var reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        var end = length === undefined ? reader.len : reader.pos + length;
        var message = createBaseDownloadIntentExtension_DownloadIntentsEntry();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }
                    message.key = reader.string();
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }
                    message.value = DownloadIntentExtension_DownloadIntent.decode(reader, reader.uint32());
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
        return DownloadIntentExtension_DownloadIntentsEntry.fromPartial(base !== null && base !== void 0 ? base : {});
    },
    fromPartial: function (object) {
        var _a;
        var message = createBaseDownloadIntentExtension_DownloadIntentsEntry();
        message.key = (_a = object.key) !== null && _a !== void 0 ? _a : "";
        message.value = (object.value !== undefined && object.value !== null)
            ? DownloadIntentExtension_DownloadIntent.fromPartial(object.value)
            : undefined;
        return message;
    },
};
var tsProtoGlobalThis = (function () {
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
function longToNumber(long) {
    if (long.gt(Number.MAX_SAFE_INTEGER)) {
        throw new tsProtoGlobalThis.Error("Value is larger than Number.MAX_SAFE_INTEGER");
    }
    return long.toNumber();
}
if (_m0.util.Long !== Long) {
    _m0.util.Long = Long;
    _m0.configure();
}
