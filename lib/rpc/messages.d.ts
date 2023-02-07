/// <reference types="node" />
import _m0 from "protobufjs/minimal.js";
export interface Invite {
    projectKey: Buffer;
    encryptionKey?: Buffer | undefined;
}
export interface InviteResponse {
    projectKey: Buffer;
    decision: InviteResponse_Decision;
}
export declare enum InviteResponse_Decision {
    REJECT = "REJECT",
    ACCEPT = "ACCEPT",
    UNRECOGNIZED = "UNRECOGNIZED"
}
export declare function inviteResponse_DecisionFromJSON(object: any): InviteResponse_Decision;
export declare function inviteResponse_DecisionToNumber(object: InviteResponse_Decision): number;
export declare const Invite: {
    encode(message: Invite, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Invite;
};
export declare const InviteResponse: {
    encode(message: InviteResponse, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): InviteResponse;
};
