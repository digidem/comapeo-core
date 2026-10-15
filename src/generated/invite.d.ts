import _m0 from "protobufjs/minimal.js";
export interface RedeemInviteOverInternet {
    inviteId: Buffer;
}
export interface DenyInviteOverInternet {
    inviteId: Buffer;
    reason: DenyInviteOverInternet_DenyReason;
}
export declare const DenyInviteOverInternet_DenyReason: {
    readonly unspecified: "unspecified";
    readonly unknown_invite_id: "unknown_invite_id";
    readonly invitor_denied: "invitor_denied";
    readonly UNRECOGNIZED: "UNRECOGNIZED";
};
export type DenyInviteOverInternet_DenyReason = typeof DenyInviteOverInternet_DenyReason[keyof typeof DenyInviteOverInternet_DenyReason];
export declare function denyInviteOverInternet_DenyReasonFromJSON(object: any): DenyInviteOverInternet_DenyReason;
export declare function denyInviteOverInternet_DenyReasonToNumber(object: DenyInviteOverInternet_DenyReason): number;
export interface AcceptInviteOverInternet {
    inviteId: Buffer;
}
export interface RedeemInviteOverInternetAck {
    inviteId: Buffer;
}
export interface DenyInviteOverInternetAck {
    inviteId: Buffer;
}
export interface AcceptInviteOverInternetAck {
    inviteId: Buffer;
}
export declare const RedeemInviteOverInternet: {
    encode(message: RedeemInviteOverInternet, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): RedeemInviteOverInternet;
    create<I extends Exact<DeepPartial<RedeemInviteOverInternet>, I>>(base?: I): RedeemInviteOverInternet;
    fromPartial<I extends Exact<DeepPartial<RedeemInviteOverInternet>, I>>(object: I): RedeemInviteOverInternet;
};
export declare const DenyInviteOverInternet: {
    encode(message: DenyInviteOverInternet, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): DenyInviteOverInternet;
    create<I extends Exact<DeepPartial<DenyInviteOverInternet>, I>>(base?: I): DenyInviteOverInternet;
    fromPartial<I extends Exact<DeepPartial<DenyInviteOverInternet>, I>>(object: I): DenyInviteOverInternet;
};
export declare const AcceptInviteOverInternet: {
    encode(message: AcceptInviteOverInternet, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): AcceptInviteOverInternet;
    create<I extends Exact<DeepPartial<AcceptInviteOverInternet>, I>>(base?: I): AcceptInviteOverInternet;
    fromPartial<I extends Exact<DeepPartial<AcceptInviteOverInternet>, I>>(object: I): AcceptInviteOverInternet;
};
export declare const RedeemInviteOverInternetAck: {
    encode(message: RedeemInviteOverInternetAck, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): RedeemInviteOverInternetAck;
    create<I extends Exact<DeepPartial<RedeemInviteOverInternetAck>, I>>(base?: I): RedeemInviteOverInternetAck;
    fromPartial<I extends Exact<DeepPartial<RedeemInviteOverInternetAck>, I>>(object: I): RedeemInviteOverInternetAck;
};
export declare const DenyInviteOverInternetAck: {
    encode(message: DenyInviteOverInternetAck, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): DenyInviteOverInternetAck;
    create<I extends Exact<DeepPartial<DenyInviteOverInternetAck>, I>>(base?: I): DenyInviteOverInternetAck;
    fromPartial<I extends Exact<DeepPartial<DenyInviteOverInternetAck>, I>>(object: I): DenyInviteOverInternetAck;
};
export declare const AcceptInviteOverInternetAck: {
    encode(message: AcceptInviteOverInternetAck, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): AcceptInviteOverInternetAck;
    create<I extends Exact<DeepPartial<AcceptInviteOverInternetAck>, I>>(base?: I): AcceptInviteOverInternetAck;
    fromPartial<I extends Exact<DeepPartial<AcceptInviteOverInternetAck>, I>>(object: I): AcceptInviteOverInternetAck;
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
