/* eslint-disable */
import Long from "long";
import _m0 from "protobufjs/minimal.js";
function createBaseProjectExtension() {
    return { authCoreKeys: [], wantCoreKeys: [] };
}
export var ProjectExtension = {
    encode: function (message, writer) {
        if (writer === void 0) { writer = _m0.Writer.create(); }
        for (var _i = 0, _a = message.authCoreKeys; _i < _a.length; _i++) {
            var v = _a[_i];
            writer.uint32(10).bytes(v);
        }
        for (var _b = 0, _c = message.wantCoreKeys; _b < _c.length; _b++) {
            var v = _c[_b];
            writer.uint32(18).bytes(v);
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
                case 2:
                    if (tag !== 18) {
                        break;
                    }
                    message.wantCoreKeys.push(reader.bytes());
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
function createBaseHaveExtension() {
    return { discoveryKey: Buffer.alloc(0), start: 0, encodedBitfield: Buffer.alloc(0) };
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
            }
            if ((tag & 7) === 4 || tag === 0) {
                break;
            }
            reader.skipType(tag & 7);
        }
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
