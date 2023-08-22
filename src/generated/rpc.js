/* eslint-disable */
import _m0 from "protobufjs/minimal.js";
export var InviteResponse_Decision;
(function (InviteResponse_Decision) {
    InviteResponse_Decision["REJECT"] = "REJECT";
    InviteResponse_Decision["ACCEPT"] = "ACCEPT";
    InviteResponse_Decision["ALREADY"] = "ALREADY";
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
    return { projectKey: Buffer.alloc(0) };
}
export var Invite = {
    encode: function (message, writer) {
        if (writer === void 0) { writer = _m0.Writer.create(); }
        if (message.projectKey.length !== 0) {
            writer.uint32(10).bytes(message.projectKey);
        }
        if (message.encryptionKeys !== undefined) {
            Invite_EncryptionKeys.encode(message.encryptionKeys, writer.uint32(18).fork()).ldelim();
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
                    message.encryptionKeys = Invite_EncryptionKeys.decode(reader, reader.uint32());
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
};
function createBaseInvite_EncryptionKeys() {
    return { auth: Buffer.alloc(0) };
}
export var Invite_EncryptionKeys = {
    encode: function (message, writer) {
        if (writer === void 0) { writer = _m0.Writer.create(); }
        if (message.auth.length !== 0) {
            writer.uint32(10).bytes(message.auth);
        }
        if (message.data !== undefined) {
            writer.uint32(18).bytes(message.data);
        }
        if (message.config !== undefined) {
            writer.uint32(26).bytes(message.config);
        }
        if (message.blobIndex !== undefined) {
            writer.uint32(34).bytes(message.blobIndex);
        }
        if (message.blob !== undefined) {
            writer.uint32(42).bytes(message.blob);
        }
        return writer;
    },
    decode: function (input, length) {
        var reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        var end = length === undefined ? reader.len : reader.pos + length;
        var message = createBaseInvite_EncryptionKeys();
        while (reader.pos < end) {
            var tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    if (tag !== 10) {
                        break;
                    }
                    message.auth = reader.bytes();
                    continue;
                case 2:
                    if (tag !== 18) {
                        break;
                    }
                    message.data = reader.bytes();
                    continue;
                case 3:
                    if (tag !== 26) {
                        break;
                    }
                    message.config = reader.bytes();
                    continue;
                case 4:
                    if (tag !== 34) {
                        break;
                    }
                    message.blobIndex = reader.bytes();
                    continue;
                case 5:
                    if (tag !== 42) {
                        break;
                    }
                    message.blob = reader.bytes();
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
};
