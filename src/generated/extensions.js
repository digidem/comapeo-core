/* eslint-disable */
import _m0 from "protobufjs/minimal.js";
function createBaseProjectExtension() {
    return {
        wantCoreKeys: [],
        authCoreKeys: [],
        configCoreKeys: [],
        dataCoreKeys: [],
        blobIndexCoreKeys: [],
        blobCoreKeys: [],
    };
}
export var ProjectExtension = {
    encode: function (message, writer) {
        if (writer === void 0) { writer = _m0.Writer.create(); }
        for (var _i = 0, _a = message.wantCoreKeys; _i < _a.length; _i++) {
            var v = _a[_i];
            writer.uint32(10).bytes(v);
        }
        for (var _b = 0, _c = message.authCoreKeys; _b < _c.length; _b++) {
            var v = _c[_b];
            writer.uint32(18).bytes(v);
        }
        for (var _d = 0, _e = message.configCoreKeys; _d < _e.length; _d++) {
            var v = _e[_d];
            writer.uint32(26).bytes(v);
        }
        for (var _f = 0, _g = message.dataCoreKeys; _f < _g.length; _f++) {
            var v = _g[_f];
            writer.uint32(34).bytes(v);
        }
        for (var _h = 0, _j = message.blobIndexCoreKeys; _h < _j.length; _h++) {
            var v = _j[_h];
            writer.uint32(42).bytes(v);
        }
        for (var _k = 0, _l = message.blobCoreKeys; _k < _l.length; _k++) {
            var v = _l[_k];
            writer.uint32(50).bytes(v);
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
                    message.wantCoreKeys.push(reader.bytes());
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }
                    message.authCoreKeys.push(reader.bytes());
                    continue;
                case 3:
                    if (tag !== 26) {
                        break;
                    }
                    message.configCoreKeys.push(reader.bytes());
                    continue;
                case 4:
                    if (tag !== 34) {
                        break;
                    }
                    message.dataCoreKeys.push(reader.bytes());
                    continue;
                case 5:
                    if (tag !== 42) {
                        break;
                    }
                    message.blobIndexCoreKeys.push(reader.bytes());
                    continue;
                case 6:
                    if (tag !== 50) {
                        break;
                    }
                    message.blobCoreKeys.push(reader.bytes());
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
        var _a, _b, _c, _d, _e, _f;
        var message = createBaseProjectExtension();
        message.wantCoreKeys = ((_a = object.wantCoreKeys) === null || _a === void 0 ? void 0 : _a.map(function (e) { return e; })) || [];
        message.authCoreKeys = ((_b = object.authCoreKeys) === null || _b === void 0 ? void 0 : _b.map(function (e) { return e; })) || [];
        message.configCoreKeys = ((_c = object.configCoreKeys) === null || _c === void 0 ? void 0 : _c.map(function (e) { return e; })) || [];
        message.dataCoreKeys = ((_d = object.dataCoreKeys) === null || _d === void 0 ? void 0 : _d.map(function (e) { return e; })) || [];
        message.blobIndexCoreKeys = ((_e = object.blobIndexCoreKeys) === null || _e === void 0 ? void 0 : _e.map(function (e) { return e; })) || [];
        message.blobCoreKeys = ((_f = object.blobCoreKeys) === null || _f === void 0 ? void 0 : _f.map(function (e) { return e; })) || [];
        return message;
    },
};
