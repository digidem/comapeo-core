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
/** A map of blob types and variants that a peer intends to download */
export interface DownloadIntentExtension {
    downloadIntents: {
        [key: string]: DownloadIntentExtension_DownloadIntent;
    };
    /**
     * If true, the peer intends to download all blobs - this is the default
     * assumption when a peer has not sent a download intent, but if a peer
     * changes their intent while connected, we need to send the new intent to
     * download everything.
     */
    everything: boolean;
}
export interface DownloadIntentExtension_DownloadIntent {
    variants: string[];
}
export interface DownloadIntentExtension_DownloadIntentsEntry {
    key: string;
    value: DownloadIntentExtension_DownloadIntent | undefined;
}
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
export declare const DownloadIntentExtension: {
    encode(message: DownloadIntentExtension, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): DownloadIntentExtension;
    create<I extends Exact<DeepPartial<DownloadIntentExtension>, I>>(base?: I): DownloadIntentExtension;
    fromPartial<I extends Exact<DeepPartial<DownloadIntentExtension>, I>>(object: I): DownloadIntentExtension;
};
export declare const DownloadIntentExtension_DownloadIntent: {
    encode(message: DownloadIntentExtension_DownloadIntent, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): DownloadIntentExtension_DownloadIntent;
    create<I extends Exact<DeepPartial<DownloadIntentExtension_DownloadIntent>, I>>(base?: I): DownloadIntentExtension_DownloadIntent;
    fromPartial<I extends Exact<DeepPartial<DownloadIntentExtension_DownloadIntent>, I>>(object: I): DownloadIntentExtension_DownloadIntent;
};
export declare const DownloadIntentExtension_DownloadIntentsEntry: {
    encode(message: DownloadIntentExtension_DownloadIntentsEntry, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): DownloadIntentExtension_DownloadIntentsEntry;
    create<I extends Exact<DeepPartial<DownloadIntentExtension_DownloadIntentsEntry>, I>>(base?: I): DownloadIntentExtension_DownloadIntentsEntry;
    fromPartial<I extends Exact<DeepPartial<DownloadIntentExtension_DownloadIntentsEntry>, I>>(object: I): DownloadIntentExtension_DownloadIntentsEntry;
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
