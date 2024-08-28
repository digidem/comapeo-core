import _m0 from "protobufjs/minimal.js";
export interface ProjectExtension {
    authCoreKeys: Buffer[];
}
export interface HaveExtension {
    discoveryKey: Buffer;
    start: number;
    encodedBitfield: Buffer;
    namespace: HaveExtension_Namespace;
}
export declare const HaveExtension_Namespace: {
    readonly auth: "auth";
    readonly config: "config";
    readonly data: "data";
    readonly blobIndex: "blobIndex";
    readonly blob: "blob";
    readonly UNRECOGNIZED: "UNRECOGNIZED";
};
export type HaveExtension_Namespace = typeof HaveExtension_Namespace[keyof typeof HaveExtension_Namespace];
export declare function haveExtension_NamespaceFromJSON(object: any): HaveExtension_Namespace;
export declare function haveExtension_NamespaceToNumber(object: HaveExtension_Namespace): number;
export declare const ProjectExtension: {
    encode(message: ProjectExtension, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): ProjectExtension;
    create<I extends Exact<DeepPartial<ProjectExtension>, I>>(base?: I): ProjectExtension;
    fromPartial<I extends Exact<DeepPartial<ProjectExtension>, I>>(object: I): ProjectExtension;
};
export declare const HaveExtension: {
    encode(message: HaveExtension, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): HaveExtension;
    create<I extends Exact<DeepPartial<HaveExtension>, I>>(base?: I): HaveExtension;
    fromPartial<I extends Exact<DeepPartial<HaveExtension>, I>>(object: I): HaveExtension;
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
