import _m0 from "protobufjs/minimal.js";
export interface Hello {
    protocolVersion: number;
}
export interface IdentityProof {
    publicKey: Buffer;
    signature: Buffer;
}
export declare const Hello: {
    encode(message: Hello, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Hello;
    create<I extends Exact<DeepPartial<Hello>, I>>(base?: I): Hello;
    fromPartial<I extends Exact<DeepPartial<Hello>, I>>(object: I): Hello;
};
export declare const IdentityProof: {
    encode(message: IdentityProof, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): IdentityProof;
    create<I extends Exact<DeepPartial<IdentityProof>, I>>(base?: I): IdentityProof;
    fromPartial<I extends Exact<DeepPartial<IdentityProof>, I>>(object: I): IdentityProof;
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
