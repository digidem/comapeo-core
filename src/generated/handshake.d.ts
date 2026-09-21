import _m0 from "protobufjs/minimal.js";
export interface SwarmHandshake {
    publicKey: Buffer;
    signature: Buffer;
}
export declare const SwarmHandshake: {
    encode(message: SwarmHandshake, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): SwarmHandshake;
    create<I extends Exact<DeepPartial<SwarmHandshake>, I>>(base?: I): SwarmHandshake;
    fromPartial<I extends Exact<DeepPartial<SwarmHandshake>, I>>(object: I): SwarmHandshake;
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
