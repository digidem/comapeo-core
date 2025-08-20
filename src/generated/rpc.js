/* eslint-disable */
import _m0 from "protobufjs/minimal.js";
import { EncryptionKeys } from "./keys.js";
export var InviteResponse_Decision = {
    DECISION_UNSPECIFIED: "DECISION_UNSPECIFIED",
    REJECT: "REJECT",
    ACCEPT: "ACCEPT",
    ALREADY: "ALREADY",
    UNRECOGNIZED: "UNRECOGNIZED",
};
export function inviteResponse_DecisionFromJSON(object) {
    switch (object) {
        case 0:
        case "DECISION_UNSPECIFIED":
            return InviteResponse_Decision.DECISION_UNSPECIFIED;
        case 1:
        case "REJECT":
            return InviteResponse_Decision.REJECT;
        case 2:
        case "ACCEPT":
            return InviteResponse_Decision.ACCEPT;
        case 3:
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
        case InviteResponse_Decision.DECISION_UNSPECIFIED:
            return 0;
        case InviteResponse_Decision.REJECT:
            return 1;
        case InviteResponse_Decision.ACCEPT:
            return 2;
        case InviteResponse_Decision.ALREADY:
            return 3;
        case InviteResponse_Decision.UNRECOGNIZED:
        default:
            return -1;
    }
}
export var DeviceInfo_DeviceType = {
    device_type_unspecified: "device_type_unspecified",
    mobile: "mobile",
    tablet: "tablet",
    desktop: "desktop",
    UNRECOGNIZED: "UNRECOGNIZED",
};
export function deviceInfo_DeviceTypeFromJSON(object) {
    switch (object) {
        case 0:
        case "device_type_unspecified":
            return DeviceInfo_DeviceType.device_type_unspecified;
        case 1:
        case "mobile":
            return DeviceInfo_DeviceType.mobile;
        case 2:
        case "tablet":
            return DeviceInfo_DeviceType.tablet;
        case 3:
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
        case DeviceInfo_DeviceType.device_type_unspecified:
            return 0;
        case DeviceInfo_DeviceType.mobile:
            return 1;
        case DeviceInfo_DeviceType.tablet:
            return 2;
        case DeviceInfo_DeviceType.desktop:
            return 3;
        case DeviceInfo_DeviceType.UNRECOGNIZED:
        default:
            return -1;
    }
}
export var DeviceInfo_RPCFeatures = {
    features_unspecified: "features_unspecified",
    ack: "ack",
    UNRECOGNIZED: "UNRECOGNIZED",
};
export function deviceInfo_RPCFeaturesFromJSON(object) {
    switch (object) {
        case 0:
        case "features_unspecified":
            return DeviceInfo_RPCFeatures.features_unspecified;
        case 1:
        case "ack":
            return DeviceInfo_RPCFeatures.ack;
        case -1:
        case "UNRECOGNIZED":
        default:
            return DeviceInfo_RPCFeatures.UNRECOGNIZED;
    }
}
export function deviceInfo_RPCFeaturesToNumber(object) {
    switch (object) {
        case DeviceInfo_RPCFeatures.features_unspecified:
            return 0;
        case DeviceInfo_RPCFeatures.ack:
            return 1;
        case DeviceInfo_RPCFeatures.UNRECOGNIZED:
        default:
            return -1;
    }
}
function createBaseInvite() {
    return { inviteId: Buffer.alloc(0), projectInviteId: Buffer.alloc(0), projectName: "", invitorName: "" };
}
export var Invite = {
    encode: function (message, writer) {
        if (writer === void 0) { writer = _m0.Writer.create(); }
        if (message.inviteId.length !== 0) {
            writer.uint32(10).bytes(message.inviteId);
        }
        if (message.projectInviteId.length !== 0) {
            writer.uint32(18).bytes(message.projectInviteId);
        }
        if (message.projectName !== "") {
            writer.uint32(26).string(message.projectName);
        }
        if (message.roleName !== undefined) {
            writer.uint32(34).string(message.roleName);
        }
        if (message.roleDescription !== undefined) {
            writer.uint32(42).string(message.roleDescription);
        }
        if (message.invitorName !== "") {
            writer.uint32(50).string(message.invitorName);
        }
        if (message.projectColor !== undefined) {
            writer.uint32(58).string(message.projectColor);
        }
        if (message.projectDescription !== undefined) {
            writer.uint32(66).string(message.projectDescription);
        }
        if (message.sendStats !== undefined) {
            writer.uint32(72).bool(message.sendStats);
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
                    message.inviteId = reader.bytes();
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }
                    message.projectInviteId = reader.bytes();
                    continue;
                case 3:
                    if (tag !== 26) {
                        break;
                    }
                    message.projectName = reader.string();
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
                case 7:
                    if (tag !== 58) {
                        break;
                    }
                    message.projectColor = reader.string();
                    continue;
                case 8:
                    if (tag !== 66) {
                        break;
                    }
                    message.projectDescription = reader.string();
                    continue;
                case 9:
                    if (tag !== 72) {
                        break;
                    }
                    message.sendStats = reader.bool();
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
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        var message = createBaseInvite();
        message.inviteId = (_a = object.inviteId) !== null && _a !== void 0 ? _a : Buffer.alloc(0);
        message.projectInviteId = (_b = object.projectInviteId) !== null && _b !== void 0 ? _b : Buffer.alloc(0);
        message.projectName = (_c = object.projectName) !== null && _c !== void 0 ? _c : "";
        message.roleName = (_d = object.roleName) !== null && _d !== void 0 ? _d : undefined;
        message.roleDescription = (_e = object.roleDescription) !== null && _e !== void 0 ? _e : undefined;
        message.invitorName = (_f = object.invitorName) !== null && _f !== void 0 ? _f : "";
        message.projectColor = (_g = object.projectColor) !== null && _g !== void 0 ? _g : undefined;
        message.projectDescription = (_h = object.projectDescription) !== null && _h !== void 0 ? _h : undefined;
        message.sendStats = (_j = object.sendStats) !== null && _j !== void 0 ? _j : undefined;
        return message;
    },
};
function createBaseInviteCancel() {
    return { inviteId: Buffer.alloc(0) };
}
export var InviteCancel = {
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
        var message = createBaseInviteCancel();
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
        return InviteCancel.fromPartial(base !== null && base !== void 0 ? base : {});
    },
    fromPartial: function (object) {
        var _a;
        var message = createBaseInviteCancel();
        message.inviteId = (_a = object.inviteId) !== null && _a !== void 0 ? _a : Buffer.alloc(0);
        return message;
    },
};
function createBaseInviteResponse() {
    return { inviteId: Buffer.alloc(0), decision: InviteResponse_Decision.DECISION_UNSPECIFIED };
}
export var InviteResponse = {
    encode: function (message, writer) {
        if (writer === void 0) { writer = _m0.Writer.create(); }
        if (message.inviteId.length !== 0) {
            writer.uint32(10).bytes(message.inviteId);
        }
        if (message.decision !== InviteResponse_Decision.DECISION_UNSPECIFIED) {
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
                    message.inviteId = reader.bytes();
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
        message.inviteId = (_a = object.inviteId) !== null && _a !== void 0 ? _a : Buffer.alloc(0);
        message.decision = (_b = object.decision) !== null && _b !== void 0 ? _b : InviteResponse_Decision.DECISION_UNSPECIFIED;
        return message;
    },
};
function createBaseProjectJoinDetails() {
    return { inviteId: Buffer.alloc(0), projectKey: Buffer.alloc(0), encryptionKeys: undefined };
}
export var ProjectJoinDetails = {
    encode: function (message, writer) {
        if (writer === void 0) { writer = _m0.Writer.create(); }
        if (message.inviteId.length !== 0) {
            writer.uint32(10).bytes(message.inviteId);
        }
        if (message.projectKey.length !== 0) {
            writer.uint32(18).bytes(message.projectKey);
        }
        if (message.encryptionKeys !== undefined) {
            EncryptionKeys.encode(message.encryptionKeys, writer.uint32(26).fork()).ldelim();
        }
        return writer;
    },
    decode: function (input, length) {
        var reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        var end = length === undefined ? reader.len : reader.pos + length;
        var message = createBaseProjectJoinDetails();
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
                    if (tag !== 18) {
                        break;
                    }
                    message.projectKey = reader.bytes();
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
        return ProjectJoinDetails.fromPartial(base !== null && base !== void 0 ? base : {});
    },
    fromPartial: function (object) {
        var _a, _b;
        var message = createBaseProjectJoinDetails();
        message.inviteId = (_a = object.inviteId) !== null && _a !== void 0 ? _a : Buffer.alloc(0);
        message.projectKey = (_b = object.projectKey) !== null && _b !== void 0 ? _b : Buffer.alloc(0);
        message.encryptionKeys = (object.encryptionKeys !== undefined && object.encryptionKeys !== null)
            ? EncryptionKeys.fromPartial(object.encryptionKeys)
            : undefined;
        return message;
    },
};
function createBaseDeviceInfo() {
    return { name: "", features: [] };
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
        writer.uint32(26).fork();
        for (var _i = 0, _a = message.features; _i < _a.length; _i++) {
            var v = _a[_i];
            writer.int32(deviceInfo_RPCFeaturesToNumber(v));
        }
        writer.ldelim();
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
                case 3:
                    if (tag === 24) {
                        message.features.push(deviceInfo_RPCFeaturesFromJSON(reader.int32()));
                        continue;
                    }
                    if (tag === 26) {
                        var end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2) {
                            message.features.push(deviceInfo_RPCFeaturesFromJSON(reader.int32()));
                        }
                        continue;
                    }
                    break;
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
        var _a, _b, _c;
        var message = createBaseDeviceInfo();
        message.name = (_a = object.name) !== null && _a !== void 0 ? _a : "";
        message.deviceType = (_b = object.deviceType) !== null && _b !== void 0 ? _b : undefined;
        message.features = ((_c = object.features) === null || _c === void 0 ? void 0 : _c.map(function (e) { return e; })) || [];
        return message;
    },
};
function createBaseInviteAck() {
    return { inviteId: Buffer.alloc(0) };
}
export var InviteAck = {
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
        var message = createBaseInviteAck();
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
        return InviteAck.fromPartial(base !== null && base !== void 0 ? base : {});
    },
    fromPartial: function (object) {
        var _a;
        var message = createBaseInviteAck();
        message.inviteId = (_a = object.inviteId) !== null && _a !== void 0 ? _a : Buffer.alloc(0);
        return message;
    },
};
function createBaseInviteCancelAck() {
    return { inviteId: Buffer.alloc(0) };
}
export var InviteCancelAck = {
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
        var message = createBaseInviteCancelAck();
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
        return InviteCancelAck.fromPartial(base !== null && base !== void 0 ? base : {});
    },
    fromPartial: function (object) {
        var _a;
        var message = createBaseInviteCancelAck();
        message.inviteId = (_a = object.inviteId) !== null && _a !== void 0 ? _a : Buffer.alloc(0);
        return message;
    },
};
function createBaseInviteResponseAck() {
    return { inviteId: Buffer.alloc(0) };
}
export var InviteResponseAck = {
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
        var message = createBaseInviteResponseAck();
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
        return InviteResponseAck.fromPartial(base !== null && base !== void 0 ? base : {});
    },
    fromPartial: function (object) {
        var _a;
        var message = createBaseInviteResponseAck();
        message.inviteId = (_a = object.inviteId) !== null && _a !== void 0 ? _a : Buffer.alloc(0);
        return message;
    },
};
function createBaseProjectJoinDetailsAck() {
    return { inviteId: Buffer.alloc(0) };
}
export var ProjectJoinDetailsAck = {
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
        var message = createBaseProjectJoinDetailsAck();
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
        return ProjectJoinDetailsAck.fromPartial(base !== null && base !== void 0 ? base : {});
    },
    fromPartial: function (object) {
        var _a;
        var message = createBaseProjectJoinDetailsAck();
        message.inviteId = (_a = object.inviteId) !== null && _a !== void 0 ? _a : Buffer.alloc(0);
        return message;
    },
};
