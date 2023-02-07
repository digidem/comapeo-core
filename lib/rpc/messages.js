/* eslint-disable */
import _m0 from "protobufjs/minimal.js";
export var InviteResponse_Decision;
(function (InviteResponse_Decision) {
    InviteResponse_Decision["REJECT"] = "REJECT";
    InviteResponse_Decision["ACCEPT"] = "ACCEPT";
    InviteResponse_Decision["UNRECOGNIZED"] = "UNRECOGNIZED";
})(InviteResponse_Decision || (InviteResponse_Decision = {}));
export function inviteResponse_DecisionFromJSON(object) {
    switch (object) {
        case 0:
        case "REJECT":
            return InviteResponse_Decision.REJECT;
        case 1:
        case "ACCEPT":
            return InviteResponse_Decision.ACCEPT;
        case -1:
        case "UNRECOGNIZED":
        default:
            return InviteResponse_Decision.UNRECOGNIZED;
    }
}
export function inviteResponse_DecisionToNumber(object) {
    switch (object) {
        case InviteResponse_Decision.REJECT:
            return 0;
        case InviteResponse_Decision.ACCEPT:
            return 1;
        case InviteResponse_Decision.UNRECOGNIZED:
        default:
            return -1;
    }
}
function createBaseInvite() {
    return { projectKey: Buffer.alloc(0) };
}
export var Invite = {
    encode: function (message, writer) {
        if (writer === void 0) { writer = _m0.Writer.create(); }
        if (message.projectKey.length !== 0) {
            writer.uint32(10).bytes(message.projectKey);
        }
        if (message.encryptionKey !== undefined) {
            writer.uint32(18).bytes(message.encryptionKey);
        }
        return writer;
    },
    decode: function (input, length) {
        var reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        var end = length === undefined ? reader.len : reader.pos + length;
        var message = createBaseInvite();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.projectKey = reader.bytes();
                    break;
                case 2:
                    message.encryptionKey = reader.bytes();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    }
};
function createBaseInviteResponse() {
    return { projectKey: Buffer.alloc(0), decision: InviteResponse_Decision.REJECT };
}
export var InviteResponse = {
    encode: function (message, writer) {
        if (writer === void 0) { writer = _m0.Writer.create(); }
        if (message.projectKey.length !== 0) {
            writer.uint32(10).bytes(message.projectKey);
        }
        if (message.decision !== InviteResponse_Decision.REJECT) {
            writer.uint32(16).int32(inviteResponse_DecisionToNumber(message.decision));
        }
        return writer;
    },
    decode: function (input, length) {
        var reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
        var end = length === undefined ? reader.len : reader.pos + length;
        var message = createBaseInviteResponse();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.projectKey = reader.bytes();
                    break;
                case 2:
                    message.decision = inviteResponse_DecisionFromJSON(reader.int32());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    }
};
