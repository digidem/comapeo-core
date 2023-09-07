/// <reference types="node" />
import _m0 from "protobufjs/minimal.js";
import { IEncryptionKeys } from "./keys.js";
export interface IInvite {
    projectKey: Buffer;
    encryptionKeys: IEncryptionKeys | undefined;
    projectInfo?: IInvite_ProjectInfo | undefined;
}
/** Project info that is displayed to the user receiving the invite */
export interface IInvite_ProjectInfo {
    name?: string | undefined;
}
export interface IInviteResponse {
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
    encode(message: IInvite, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): IInvite;
};
export declare const Invite_ProjectInfo: {
    encode(message: IInvite_ProjectInfo, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): IInvite_ProjectInfo;
};
export declare const InviteResponse: {
    encode(message: IInviteResponse, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): IInviteResponse;
};
