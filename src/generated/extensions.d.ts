/// <reference types="node" />
import _m0 from "protobufjs/minimal.js";
export interface ProjectExtension {
    wantCoreKeys: Buffer[];
    authCoreKeys: Buffer[];
    configCoreKeys: Buffer[];
    dataCoreKeys: Buffer[];
    blobIndexCoreKeys: Buffer[];
    blobCoreKeys: Buffer[];
}
export declare const ProjectExtension: {
    encode(message: ProjectExtension, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): ProjectExtension;
    create<I extends {
        wantCoreKeys?: Buffer[];
        authCoreKeys?: Buffer[];
        configCoreKeys?: Buffer[];
        dataCoreKeys?: Buffer[];
        blobIndexCoreKeys?: Buffer[];
        blobCoreKeys?: Buffer[];
    } & {
        wantCoreKeys?: Buffer[] & Buffer[] & { [K in Exclude<keyof I["wantCoreKeys"], keyof Buffer[]>]: never; };
        authCoreKeys?: Buffer[] & Buffer[] & { [K_1 in Exclude<keyof I["authCoreKeys"], keyof Buffer[]>]: never; };
        configCoreKeys?: Buffer[] & Buffer[] & { [K_2 in Exclude<keyof I["configCoreKeys"], keyof Buffer[]>]: never; };
        dataCoreKeys?: Buffer[] & Buffer[] & { [K_3 in Exclude<keyof I["dataCoreKeys"], keyof Buffer[]>]: never; };
        blobIndexCoreKeys?: Buffer[] & Buffer[] & { [K_4 in Exclude<keyof I["blobIndexCoreKeys"], keyof Buffer[]>]: never; };
        blobCoreKeys?: Buffer[] & Buffer[] & { [K_5 in Exclude<keyof I["blobCoreKeys"], keyof Buffer[]>]: never; };
    } & { [K_6 in Exclude<keyof I, keyof ProjectExtension>]: never; }>(base?: I): ProjectExtension;
    fromPartial<I_1 extends {
        wantCoreKeys?: Buffer[];
        authCoreKeys?: Buffer[];
        configCoreKeys?: Buffer[];
        dataCoreKeys?: Buffer[];
        blobIndexCoreKeys?: Buffer[];
        blobCoreKeys?: Buffer[];
    } & {
        wantCoreKeys?: Buffer[] & Buffer[] & { [K_7 in Exclude<keyof I_1["wantCoreKeys"], keyof Buffer[]>]: never; };
        authCoreKeys?: Buffer[] & Buffer[] & { [K_8 in Exclude<keyof I_1["authCoreKeys"], keyof Buffer[]>]: never; };
        configCoreKeys?: Buffer[] & Buffer[] & { [K_9 in Exclude<keyof I_1["configCoreKeys"], keyof Buffer[]>]: never; };
        dataCoreKeys?: Buffer[] & Buffer[] & { [K_10 in Exclude<keyof I_1["dataCoreKeys"], keyof Buffer[]>]: never; };
        blobIndexCoreKeys?: Buffer[] & Buffer[] & { [K_11 in Exclude<keyof I_1["blobIndexCoreKeys"], keyof Buffer[]>]: never; };
        blobCoreKeys?: Buffer[] & Buffer[] & { [K_12 in Exclude<keyof I_1["blobCoreKeys"], keyof Buffer[]>]: never; };
    } & { [K_13 in Exclude<keyof I_1, keyof ProjectExtension>]: never; }>(object: I_1): ProjectExtension;
};
