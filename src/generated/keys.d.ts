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
};
export declare const ProjectKeys: {
    encode(message: ProjectKeys, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): ProjectKeys;
};
