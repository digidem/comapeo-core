/* eslint-disable */
import _m0 from "protobufjs/minimal.js";
export var DenyInviteOverInternet_DenyReason = {
    unspecified: "unspecified",
    unknown_invite_id: "unknown_invite_id",
    invitor_denied: "invitor_denied",
    UNRECOGNIZED: "UNRECOGNIZED",
};
export function denyInviteOverInternet_DenyReasonFromJSON(object) {
    switch (object) {
        case 0:
        case "unspecified":
            return DenyInviteOverInternet_DenyReason.unspecified;
        case 1:
        case "unknown_invite_id":
            return DenyInviteOverInternet_DenyReason.unknown_invite_id;
        case 2:
        case "invitor_denied":
            return DenyInviteOverInternet_DenyReason.invitor_denied;
        case -1:
        case "UNRECOGNIZED":
        default:
            return DenyInviteOverInternet_DenyReason.UNRECOGNIZED;
    }
}
export function denyInviteOverInternet_DenyReasonToNumber(object) {
    switch (object) {
        case DenyInviteOverInternet_DenyReason.unspecified:
            return 0;
        case DenyInviteOverInternet_DenyReason.unknown_invite_id:
            return 1;
        case DenyInviteOverInternet_DenyReason.invitor_denied:
            return 2;
        case DenyInviteOverInternet_DenyReason.UNRECOGNIZED:
        default:
            return -1;
    }
}
function createBaseRedeemInviteOverInternet() {
    return { inviteId: Buffer.alloc(0) };
}
export var RedeemInviteOverInternet = {
    encode: function (message, writer) {
        if (writer === void 0) { writer = _m0.Writer.create(); }
        if (message.inviteId.length !== 0) {
            writer.uint32(10).bytes(message.inviteId);
        }
        return writer;
    },
    decode: function (input, length) {
        var reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        var end = length === undefined ? reader.len : reader.pos + length;
        var message = createBaseRedeemInviteOverInternet();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }
                    message.inviteId = reader.bytes();
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
        return RedeemInviteOverInternet.fromPartial(base !== null && base !== void 0 ? base : {});
    },
    fromPartial: function (object) {
        var _a;
        var message = createBaseRedeemInviteOverInternet();
        message.inviteId = (_a = object.inviteId) !== null && _a !== void 0 ? _a : Buffer.alloc(0);
        return message;
    },
};
function createBaseDenyInviteOverInternet() {
    return { inviteId: Buffer.alloc(0), reason: DenyInviteOverInternet_DenyReason.unspecified };
}
export var DenyInviteOverInternet = {
    encode: function (message, writer) {
        if (writer === void 0) { writer = _m0.Writer.create(); }
        if (message.inviteId.length !== 0) {
            writer.uint32(10).bytes(message.inviteId);
        }
        if (message.reason !== DenyInviteOverInternet_DenyReason.unspecified) {
            writer.uint32(16).int32(denyInviteOverInternet_DenyReasonToNumber(message.reason));
        }
        return writer;
    },
    decode: function (input, length) {
        var reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        var end = length === undefined ? reader.len : reader.pos + length;
        var message = createBaseDenyInviteOverInternet();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }
                    message.inviteId = reader.bytes();
                    continue;
                case 2:
                    if (tag !== 16) {
                        break;
                    }
                    message.reason = denyInviteOverInternet_DenyReasonFromJSON(reader.int32());
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
        return DenyInviteOverInternet.fromPartial(base !== null && base !== void 0 ? base : {});
    },
    fromPartial: function (object) {
        var _a, _b;
        var message = createBaseDenyInviteOverInternet();
        message.inviteId = (_a = object.inviteId) !== null && _a !== void 0 ? _a : Buffer.alloc(0);
        message.reason = (_b = object.reason) !== null && _b !== void 0 ? _b : DenyInviteOverInternet_DenyReason.unspecified;
        return message;
    },
};
function createBaseAcceptInviteOverInternet() {
    return { inviteId: Buffer.alloc(0) };
}
export var AcceptInviteOverInternet = {
    encode: function (message, writer) {
        if (writer === void 0) { writer = _m0.Writer.create(); }
        if (message.inviteId.length !== 0) {
            writer.uint32(10).bytes(message.inviteId);
        }
        return writer;
    },
    decode: function (input, length) {
        var reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        var end = length === undefined ? reader.len : reader.pos + length;
        var message = createBaseAcceptInviteOverInternet();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }
                    message.inviteId = reader.bytes();
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
        return AcceptInviteOverInternet.fromPartial(base !== null && base !== void 0 ? base : {});
    },
    fromPartial: function (object) {
        var _a;
        var message = createBaseAcceptInviteOverInternet();
        message.inviteId = (_a = object.inviteId) !== null && _a !== void 0 ? _a : Buffer.alloc(0);
        return message;
    },
};
function createBaseRedeemInviteOverInternetAck() {
    return { inviteId: Buffer.alloc(0) };
}
export var RedeemInviteOverInternetAck = {
    encode: function (message, writer) {
        if (writer === void 0) { writer = _m0.Writer.create(); }
        if (message.inviteId.length !== 0) {
            writer.uint32(10).bytes(message.inviteId);
        }
        return writer;
    },
    decode: function (input, length) {
        var reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        var end = length === undefined ? reader.len : reader.pos + length;
        var message = createBaseRedeemInviteOverInternetAck();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }
                    message.inviteId = reader.bytes();
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
        return RedeemInviteOverInternetAck.fromPartial(base !== null && base !== void 0 ? base : {});
    },
    fromPartial: function (object) {
        var _a;
        var message = createBaseRedeemInviteOverInternetAck();
        message.inviteId = (_a = object.inviteId) !== null && _a !== void 0 ? _a : Buffer.alloc(0);
        return message;
    },
};
function createBaseDenyInviteOverInternetAck() {
    return { inviteId: Buffer.alloc(0) };
}
export var DenyInviteOverInternetAck = {
    encode: function (message, writer) {
        if (writer === void 0) { writer = _m0.Writer.create(); }
        if (message.inviteId.length !== 0) {
            writer.uint32(10).bytes(message.inviteId);
        }
        return writer;
    },
    decode: function (input, length) {
        var reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        var end = length === undefined ? reader.len : reader.pos + length;
        var message = createBaseDenyInviteOverInternetAck();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }
                    message.inviteId = reader.bytes();
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
        return DenyInviteOverInternetAck.fromPartial(base !== null && base !== void 0 ? base : {});
    },
    fromPartial: function (object) {
        var _a;
        var message = createBaseDenyInviteOverInternetAck();
        message.inviteId = (_a = object.inviteId) !== null && _a !== void 0 ? _a : Buffer.alloc(0);
        return message;
    },
};
function createBaseAcceptInviteOverInternetAck() {
    return { inviteId: Buffer.alloc(0) };
}
export var AcceptInviteOverInternetAck = {
    encode: function (message, writer) {
        if (writer === void 0) { writer = _m0.Writer.create(); }
        if (message.inviteId.length !== 0) {
            writer.uint32(10).bytes(message.inviteId);
        }
        return writer;
    },
    decode: function (input, length) {
        var reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        var end = length === undefined ? reader.len : reader.pos + length;
        var message = createBaseAcceptInviteOverInternetAck();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }
                    message.inviteId = reader.bytes();
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
        return AcceptInviteOverInternetAck.fromPartial(base !== null && base !== void 0 ? base : {});
    },
    fromPartial: function (object) {
        var _a;
        var message = createBaseAcceptInviteOverInternetAck();
        message.inviteId = (_a = object.inviteId) !== null && _a !== void 0 ? _a : Buffer.alloc(0);
        return message;
    },
};
