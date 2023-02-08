/* eslint-disable */
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
        var reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        var end = length === undefined ? reader.len : reader.pos + length;
        var message = createBaseProjectExtension();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.authCoreKeys.push(reader.bytes());
                    break;
                case 2:
                    message.wantCoreKeys.push(reader.bytes());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    }
};
