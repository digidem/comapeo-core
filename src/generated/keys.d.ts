/// <reference types="node" />
import _m0 from "protobufjs/minimal.js";
export interface IEncryptionKeys {
    auth: Buffer;
    data?: Buffer | undefined;
    config?: Buffer | undefined;
    blobIndex?: Buffer | undefined;
    blob?: Buffer | undefined;
}
export interface IProjectKeys {
    projectKey: Buffer;
    projectSecretKey?: Buffer | undefined;
    encryptionKeys: IEncryptionKeys | undefined;
}
export declare const EncryptionKeys: {
    encode(message: IEncryptionKeys, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): IEncryptionKeys;
};
export declare const ProjectKeys: {
    encode(message: IProjectKeys, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): IProjectKeys;
};
