/// <reference types="node" />
import _m0 from "protobufjs/minimal.js";
export interface Invite {
    projectKey: Buffer;
    encryptionKeys?: Invite_EncryptionKeys | undefined;
    projectConfig?: Buffer | undefined;
}
export interface Invite_EncryptionKeys {
    auth?: Buffer | undefined;
    data?: Buffer | undefined;
    blobIndex?: Buffer | undefined;
    blob?: Buffer | undefined;
}
export interface InviteResponse {
    projectKey: Buffer;
    decision: InviteResponse_Decision;
}
export declare enum InviteResponse_Decision {
    REJECT = "REJECT",
    ACCEPT = "ACCEPT",
    ALREADY = "ALREADY",
    UNRECOGNIZED = "UNRECOGNIZED"
}
export declare function inviteResponse_DecisionFromJSON(object: any): InviteResponse_Decision;
export declare function inviteResponse_DecisionToNumber(object: InviteResponse_Decision): number;
export declare const Invite: {
    encode(message: Invite, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Invite;
};
export declare const Invite_EncryptionKeys: {
    encode(message: Invite_EncryptionKeys, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Invite_EncryptionKeys;
};
export declare const InviteResponse: {
    encode(message: InviteResponse, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): InviteResponse;
};
