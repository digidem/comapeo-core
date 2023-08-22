/// <reference types="node" />
import _m0 from "protobufjs/minimal.js";
import { EncryptionKeys } from "./keys.js";
export interface Invite {
    projectKey: Buffer;
    encryptionKeys?: EncryptionKeys | undefined;
    projectInfo?: Invite_ProjectInfo | undefined;
}
/** Project info that is displayed to the user receiving the invite */
export interface Invite_ProjectInfo {
    name?: string | undefined;
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
export declare const Invite_ProjectInfo: {
    encode(message: Invite_ProjectInfo, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Invite_ProjectInfo;
};
export declare const InviteResponse: {
    encode(message: InviteResponse, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): InviteResponse;
};
