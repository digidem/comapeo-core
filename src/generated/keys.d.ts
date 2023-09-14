/// <reference types="node" />
import _m0 from "protobufjs/minimal.js";
export interface EncryptionKeys {
    auth: Buffer;
    data?: Buffer | undefined;
    config?: Buffer | undefined;
    blobIndex?: Buffer | undefined;
    blob?: Buffer | undefined;
}
export interface ProjectKeys {
    projectKey: Buffer;
    projectSecretKey?: Buffer | undefined;
    encryptionKeys: EncryptionKeys | undefined;
}
export declare const EncryptionKeys: {
    encode(message: EncryptionKeys, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): EncryptionKeys;
    create<I extends {
        auth?: Buffer;
        data?: Buffer | undefined;
        config?: Buffer | undefined;
        blobIndex?: Buffer | undefined;
        blob?: Buffer | undefined;
    } & {
        auth?: Buffer;
        data?: Buffer | undefined;
        config?: Buffer | undefined;
        blobIndex?: Buffer | undefined;
        blob?: Buffer | undefined;
    } & { [K in Exclude<keyof I, keyof EncryptionKeys>]: never; }>(base?: I): EncryptionKeys;
    fromPartial<I_1 extends {
        auth?: Buffer;
        data?: Buffer | undefined;
        config?: Buffer | undefined;
        blobIndex?: Buffer | undefined;
        blob?: Buffer | undefined;
    } & {
        auth?: Buffer;
        data?: Buffer | undefined;
        config?: Buffer | undefined;
        blobIndex?: Buffer | undefined;
        blob?: Buffer | undefined;
    } & { [K_1 in Exclude<keyof I_1, keyof EncryptionKeys>]: never; }>(object: I_1): EncryptionKeys;
};
export declare const ProjectKeys: {
    encode(message: ProjectKeys, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): ProjectKeys;
    create<I extends {
        projectKey?: Buffer;
        projectSecretKey?: Buffer | undefined;
        encryptionKeys?: {
            auth?: Buffer;
            data?: Buffer | undefined;
            config?: Buffer | undefined;
            blobIndex?: Buffer | undefined;
            blob?: Buffer | undefined;
        };
    } & {
        projectKey?: Buffer;
        projectSecretKey?: Buffer | undefined;
        encryptionKeys?: {
            auth?: Buffer;
            data?: Buffer | undefined;
            config?: Buffer | undefined;
            blobIndex?: Buffer | undefined;
            blob?: Buffer | undefined;
        } & {
            auth?: Buffer;
            data?: Buffer | undefined;
            config?: Buffer | undefined;
            blobIndex?: Buffer | undefined;
            blob?: Buffer | undefined;
        } & { [K in Exclude<keyof I["encryptionKeys"], keyof EncryptionKeys>]: never; };
    } & { [K_1 in Exclude<keyof I, keyof ProjectKeys>]: never; }>(base?: I): ProjectKeys;
    fromPartial<I_1 extends {
        projectKey?: Buffer;
        projectSecretKey?: Buffer | undefined;
        encryptionKeys?: {
            auth?: Buffer;
            data?: Buffer | undefined;
            config?: Buffer | undefined;
            blobIndex?: Buffer | undefined;
            blob?: Buffer | undefined;
        };
    } & {
        projectKey?: Buffer;
        projectSecretKey?: Buffer | undefined;
        encryptionKeys?: {
            auth?: Buffer;
            data?: Buffer | undefined;
            config?: Buffer | undefined;
            blobIndex?: Buffer | undefined;
            blob?: Buffer | undefined;
        } & {
            auth?: Buffer;
            data?: Buffer | undefined;
            config?: Buffer | undefined;
            blobIndex?: Buffer | undefined;
            blob?: Buffer | undefined;
        } & { [K_2 in Exclude<keyof I_1["encryptionKeys"], keyof EncryptionKeys>]: never; };
    } & { [K_3 in Exclude<keyof I_1, keyof ProjectKeys>]: never; }>(object: I_1): ProjectKeys;
};
