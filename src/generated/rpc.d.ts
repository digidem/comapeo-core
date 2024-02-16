/// <reference types="node" />
import _m0 from "protobufjs/minimal.js";
import { EncryptionKeys } from "./keys.js";
export interface Invite {
    projectKey: Buffer;
    encryptionKeys: EncryptionKeys | undefined;
    projectInfo?: Invite_ProjectInfo | undefined;
    roleName: string;
    roleDescription?: string | undefined;
    invitorName: string;
}
/** Project info that is displayed to the user receiving the invite */
export interface Invite_ProjectInfo {
    name?: string | undefined;
}
export interface InviteResponse {
    projectKey: Buffer;
    decision: InviteResponse_Decision;
}
export declare const InviteResponse_Decision: {
    readonly REJECT: "REJECT";
    readonly ACCEPT: "ACCEPT";
    readonly UNRECOGNIZED: "UNRECOGNIZED";
};
export type InviteResponse_Decision = typeof InviteResponse_Decision[keyof typeof InviteResponse_Decision];
export declare function inviteResponse_DecisionFromJSON(object: any): InviteResponse_Decision;
export declare function inviteResponse_DecisionToNumber(object: InviteResponse_Decision): number;
export interface DeviceInfo {
    name: string;
    deviceType?: DeviceInfo_DeviceType | undefined;
}
export declare const DeviceInfo_DeviceType: {
    readonly mobile: "mobile";
    readonly tablet: "tablet";
    readonly desktop: "desktop";
    readonly UNRECOGNIZED: "UNRECOGNIZED";
};
export type DeviceInfo_DeviceType = typeof DeviceInfo_DeviceType[keyof typeof DeviceInfo_DeviceType];
export declare function deviceInfo_DeviceTypeFromJSON(object: any): DeviceInfo_DeviceType;
export declare function deviceInfo_DeviceTypeToNumber(object: DeviceInfo_DeviceType): number;
export declare const Invite: {
    encode(message: Invite, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Invite;
    create<I extends {
        projectKey?: Buffer;
        encryptionKeys?: {
            auth?: Buffer;
            data?: Buffer;
            config?: Buffer;
            blobIndex?: Buffer;
            blob?: Buffer;
        };
        projectInfo?: {
            name?: string | undefined;
        };
        roleName?: string;
        roleDescription?: string | undefined;
        invitorName?: string;
    } & {
        projectKey?: Buffer;
        encryptionKeys?: {
            auth?: Buffer;
            data?: Buffer;
            config?: Buffer;
            blobIndex?: Buffer;
            blob?: Buffer;
        } & {
            auth?: Buffer;
            data?: Buffer;
            config?: Buffer;
            blobIndex?: Buffer;
            blob?: Buffer;
        } & { [K in Exclude<keyof I["encryptionKeys"], keyof EncryptionKeys>]: never; };
        projectInfo?: {
            name?: string | undefined;
        } & {
            name?: string | undefined;
        } & { [K_1 in Exclude<keyof I["projectInfo"], "name">]: never; };
        roleName?: string;
        roleDescription?: string | undefined;
        invitorName?: string;
    } & { [K_2 in Exclude<keyof I, keyof Invite>]: never; }>(base?: I): Invite;
    fromPartial<I_1 extends {
        projectKey?: Buffer;
        encryptionKeys?: {
            auth?: Buffer;
            data?: Buffer;
            config?: Buffer;
            blobIndex?: Buffer;
            blob?: Buffer;
        };
        projectInfo?: {
            name?: string | undefined;
        };
        roleName?: string;
        roleDescription?: string | undefined;
        invitorName?: string;
    } & {
        projectKey?: Buffer;
        encryptionKeys?: {
            auth?: Buffer;
            data?: Buffer;
            config?: Buffer;
            blobIndex?: Buffer;
            blob?: Buffer;
        } & {
            auth?: Buffer;
            data?: Buffer;
            config?: Buffer;
            blobIndex?: Buffer;
            blob?: Buffer;
        } & { [K_3 in Exclude<keyof I_1["encryptionKeys"], keyof EncryptionKeys>]: never; };
        projectInfo?: {
            name?: string | undefined;
        } & {
            name?: string | undefined;
        } & { [K_4 in Exclude<keyof I_1["projectInfo"], "name">]: never; };
        roleName?: string;
        roleDescription?: string | undefined;
        invitorName?: string;
    } & { [K_5 in Exclude<keyof I_1, keyof Invite>]: never; }>(object: I_1): Invite;
};
export declare const Invite_ProjectInfo: {
    encode(message: Invite_ProjectInfo, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Invite_ProjectInfo;
    create<I extends {
        name?: string | undefined;
    } & {
        name?: string | undefined;
    } & { [K in Exclude<keyof I, "name">]: never; }>(base?: I): Invite_ProjectInfo;
    fromPartial<I_1 extends {
        name?: string | undefined;
    } & {
        name?: string | undefined;
    } & { [K_1 in Exclude<keyof I_1, "name">]: never; }>(object: I_1): Invite_ProjectInfo;
};
export declare const InviteResponse: {
    encode(message: InviteResponse, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): InviteResponse;
    create<I extends {
        projectKey?: Buffer;
        decision?: InviteResponse_Decision;
    } & {
        projectKey?: Buffer;
        decision?: InviteResponse_Decision;
    } & { [K in Exclude<keyof I, keyof InviteResponse>]: never; }>(base?: I): InviteResponse;
    fromPartial<I_1 extends {
        projectKey?: Buffer;
        decision?: InviteResponse_Decision;
    } & {
        projectKey?: Buffer;
        decision?: InviteResponse_Decision;
    } & { [K_1 in Exclude<keyof I_1, keyof InviteResponse>]: never; }>(object: I_1): InviteResponse;
};
export declare const DeviceInfo: {
    encode(message: DeviceInfo, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): DeviceInfo;
    create<I extends {
        name?: string;
        deviceType?: DeviceInfo_DeviceType | undefined;
    } & {
        name?: string;
        deviceType?: DeviceInfo_DeviceType | undefined;
    } & { [K in Exclude<keyof I, keyof DeviceInfo>]: never; }>(base?: I): DeviceInfo;
    fromPartial<I_1 extends {
        name?: string;
        deviceType?: DeviceInfo_DeviceType | undefined;
    } & {
        name?: string;
        deviceType?: DeviceInfo_DeviceType | undefined;
    } & { [K_1 in Exclude<keyof I_1, keyof DeviceInfo>]: never; }>(object: I_1): DeviceInfo;
};
