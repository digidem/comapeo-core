/* eslint-disable */
import _m0 from "protobufjs/minimal.js";
function createBaseSwarmHandshake() {
    return { publicKey: Buffer.alloc(0), signature: Buffer.alloc(0) };
}
export var SwarmHandshake = {
    encode: function (message, writer) {
        if (writer === void 0) { writer = _m0.Writer.create(); }
        if (message.publicKey.length !== 0) {
            writer.uint32(10).bytes(message.publicKey);
        }
        if (message.signature.length !== 0) {
            writer.uint32(18).bytes(message.signature);
        }
        return writer;
    },
    decode: function (input, length) {
        var reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        var end = length === undefined ? reader.len : reader.pos + length;
        var message = createBaseSwarmHandshake();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }
                    message.publicKey = reader.bytes();
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }
                    message.signature = reader.bytes();
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
        return SwarmHandshake.fromPartial(base !== null && base !== void 0 ? base : {});
    },
    fromPartial: function (object) {
        var _a, _b;
        var message = createBaseSwarmHandshake();
        message.publicKey = (_a = object.publicKey) !== null && _a !== void 0 ? _a : Buffer.alloc(0);
        message.signature = (_b = object.signature) !== null && _b !== void 0 ? _b : Buffer.alloc(0);
        return message;
    },
};
