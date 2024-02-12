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
export var DeviceInfo_DeviceType = {
    mobile: "mobile",
    tablet: "tablet",
    desktop: "desktop",
    UNRECOGNIZED: "UNRECOGNIZED",
};
export function deviceInfo_DeviceTypeFromJSON(object) {
    switch (object) {
        case 0:
        case "mobile":
            return DeviceInfo_DeviceType.mobile;
        case 1:
        case "tablet":
            return DeviceInfo_DeviceType.tablet;
        case 2:
        case "desktop":
            return DeviceInfo_DeviceType.desktop;
        case -1:
        case "UNRECOGNIZED":
        default:
            return DeviceInfo_DeviceType.UNRECOGNIZED;
    }
}
export function deviceInfo_DeviceTypeToNumber(object) {
    switch (object) {
        case DeviceInfo_DeviceType.mobile:
            return 0;
        case DeviceInfo_DeviceType.tablet:
            return 1;
        case DeviceInfo_DeviceType.desktop:
            return 2;
        case DeviceInfo_DeviceType.UNRECOGNIZED:
        default:
            return -1;
    }
}
function createBaseInvite() {
    return { projectKey: Buffer.alloc(0), encryptionKeys: undefined, roleName: "", invitorName: "" };
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
        if (message.roleName !== "") {
            writer.uint32(34).string(message.roleName);
        }
        if (message.roleDescription !== undefined) {
            writer.uint32(42).string(message.roleDescription);
        }
        if (message.invitorName !== "") {
            writer.uint32(50).string(message.invitorName);
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
                case 4:
                    if (tag !== 34) {
                        break;
                    }
                    message.roleName = reader.string();
                    continue;
                case 5:
                    if (tag !== 42) {
                        break;
                    }
                    message.roleDescription = reader.string();
                    continue;
                case 6:
                    if (tag !== 50) {
                        break;
                    }
                    message.invitorName = reader.string();
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
        var _a, _b, _c, _d;
        var message = createBaseInvite();
        message.projectKey = (_a = object.projectKey) !== null && _a !== void 0 ? _a : Buffer.alloc(0);
        message.encryptionKeys = (object.encryptionKeys !== undefined && object.encryptionKeys !== null)
            ? EncryptionKeys.fromPartial(object.encryptionKeys)
            : undefined;
        message.projectInfo = (object.projectInfo !== undefined && object.projectInfo !== null)
            ? Invite_ProjectInfo.fromPartial(object.projectInfo)
            : undefined;
        message.roleName = (_b = object.roleName) !== null && _b !== void 0 ? _b : "";
        message.roleDescription = (_c = object.roleDescription) !== null && _c !== void 0 ? _c : undefined;
        message.invitorName = (_d = object.invitorName) !== null && _d !== void 0 ? _d : "";
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
        if (message.deviceType !== undefined) {
            writer.uint32(16).int32(deviceInfo_DeviceTypeToNumber(message.deviceType));
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
                case 2:
                    if (tag !== 16) {
                        break;
                    }
                    message.deviceType = deviceInfo_DeviceTypeFromJSON(reader.int32());
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
        var _a, _b;
        var message = createBaseDeviceInfo();
        message.name = (_a = object.name) !== null && _a !== void 0 ? _a : "";
        message.deviceType = (_b = object.deviceType) !== null && _b !== void 0 ? _b : undefined;
        return message;
    },
};
