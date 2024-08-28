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
    create<I extends Exact<DeepPartial<EncryptionKeys>, I>>(base?: I): EncryptionKeys;
    fromPartial<I extends Exact<DeepPartial<EncryptionKeys>, I>>(object: I): EncryptionKeys;
};
export declare const ProjectKeys: {
    encode(message: ProjectKeys, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): ProjectKeys;
    create<I extends Exact<DeepPartial<ProjectKeys>, I>>(base?: I): ProjectKeys;
    fromPartial<I extends Exact<DeepPartial<ProjectKeys>, I>>(object: I): ProjectKeys;
};
type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;
type DeepPartial<T> = T extends Builtin ? T : T extends Array<infer U> ? Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>> : T extends {} ? {
    [K in keyof T]?: DeepPartial<T[K]>;
} : Partial<T>;
type KeysOfUnion<T> = T extends T ? keyof T : never;
type Exact<P, I extends P> = P extends Builtin ? P : P & {
    [K in keyof P]: Exact<P[K], I[K]>;
} & {
    [K in Exclude<keyof I, KeysOfUnion<P>>]: never;
};
export {};
