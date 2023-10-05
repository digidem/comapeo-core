/* eslint-disable */
import _m0 from "protobufjs/minimal.js";
import { EncryptionKeys } from "./keys.js";
export var InviteResponse_Decision = {
    REJECT: "REJECT",
    ACCEPT: "ACCEPT",
    ALREADY: "ALREADY",
    UNRECOGNIZED: "UNRECOGNIZED",
};
export function inviteResponse_DecisionFromJSON(object) {
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
export function inviteResponse_DecisionToNumber(object) {
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
function createBaseInvite() {
    return { projectKey: Buffer.alloc(0), encryptionKeys: undefined };
}
export var Invite = {
    encode: function (message, writer) {
        if (writer === void 0) { writer = _m0.Writer.create(); }
        if (message.projectKey.length !== 0) {
            writer.uint32(10).bytes(message.projectKey);
        }
        if (message.encryptionKeys !== undefined) {
            EncryptionKeys.encode(message.encryptionKeys, writer.uint32(18).fork()).ldelim();
        }
        if (message.projectInfo !== undefined) {
            Invite_ProjectInfo.encode(message.projectInfo, writer.uint32(26).fork()).ldelim();
        }
        return writer;
    },
    decode: function (input, length) {
        var reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        var end = length === undefined ? reader.len : reader.pos + length;
        var message = createBaseInvite();
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
                    message.encryptionKeys = EncryptionKeys.decode(reader, reader.uint32());
                    continue;
                case 3:
                    if (tag !== 26) {
                        break;
                    }
                    message.projectInfo = Invite_ProjectInfo.decode(reader, reader.uint32());
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
        return Invite.fromPartial(base !== null && base !== void 0 ? base : {});
    },
    fromPartial: function (object) {
        var _a;
        var message = createBaseInvite();
        message.projectKey = (_a = object.projectKey) !== null && _a !== void 0 ? _a : Buffer.alloc(0);
        message.encryptionKeys = (object.encryptionKeys !== undefined && object.encryptionKeys !== null)
            ? EncryptionKeys.fromPartial(object.encryptionKeys)
            : undefined;
        message.projectInfo = (object.projectInfo !== undefined && object.projectInfo !== null)
            ? Invite_ProjectInfo.fromPartial(object.projectInfo)
            : undefined;
        return message;
    },
};
function createBaseInvite_ProjectInfo() {
    return {};
}
export var Invite_ProjectInfo = {
    encode: function (message, writer) {
        if (writer === void 0) { writer = _m0.Writer.create(); }
        if (message.name !== undefined) {
            writer.uint32(10).string(message.name);
        }
        return writer;
    },
    decode: function (input, length) {
        var reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        var end = length === undefined ? reader.len : reader.pos + length;
        var message = createBaseInvite_ProjectInfo();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }
                    message.name = reader.string();
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
        return Invite_ProjectInfo.fromPartial(base !== null && base !== void 0 ? base : {});
    },
    fromPartial: function (object) {
        var _a;
        var message = createBaseInvite_ProjectInfo();
        message.name = (_a = object.name) !== null && _a !== void 0 ? _a : undefined;
        return message;
    },
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
        var reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        var end = length === undefined ? reader.len : reader.pos + length;
        var message = createBaseInviteResponse();
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
    create: function (base) {
        return InviteResponse.fromPartial(base !== null && base !== void 0 ? base : {});
    },
    fromPartial: function (object) {
        var _a, _b;
        var message = createBaseInviteResponse();
        message.projectKey = (_a = object.projectKey) !== null && _a !== void 0 ? _a : Buffer.alloc(0);
        message.decision = (_b = object.decision) !== null && _b !== void 0 ? _b : InviteResponse_Decision.REJECT;
        return message;
    },
};
function createBaseDeviceInfo() {
    return { name: "" };
}
export var DeviceInfo = {
    encode: function (message, writer) {
        if (writer === void 0) { writer = _m0.Writer.create(); }
        if (message.name !== "") {
            writer.uint32(10).string(message.name);
        }
        return writer;
    },
    decode: function (input, length) {
        var reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        var end = length === undefined ? reader.len : reader.pos + length;
        var message = createBaseDeviceInfo();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }
                    message.name = reader.string();
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
        return DeviceInfo.fromPartial(base !== null && base !== void 0 ? base : {});
    },
    fromPartial: function (object) {
        var _a;
        var message = createBaseDeviceInfo();
        message.name = (_a = object.name) !== null && _a !== void 0 ? _a : "";
        return message;
    },
};
