import _m0 from "protobufjs/minimal.js";
import { EncryptionKeys } from "./keys.js";
export interface Invite {
    inviteId: Buffer;
    projectInviteId: Buffer;
    projectName: string;
    roleName?: string | undefined;
    roleDescription?: string | undefined;
    invitorName: string;
    projectColor?: string | undefined;
    projectDescription?: string | undefined;
    sendStats: boolean;
}
export interface InviteCancel {
    inviteId: Buffer;
}
export interface InviteResponse {
    inviteId: Buffer;
    decision: InviteResponse_Decision;
}
export declare const InviteResponse_Decision: {
    readonly DECISION_UNSPECIFIED: "DECISION_UNSPECIFIED";
    readonly REJECT: "REJECT";
    readonly ACCEPT: "ACCEPT";
    readonly ALREADY: "ALREADY";
    readonly UNRECOGNIZED: "UNRECOGNIZED";
};
export type InviteResponse_Decision = typeof InviteResponse_Decision[keyof typeof InviteResponse_Decision];
export declare function inviteResponse_DecisionFromJSON(object: any): InviteResponse_Decision;
export declare function inviteResponse_DecisionToNumber(object: InviteResponse_Decision): number;
export interface ProjectJoinDetails {
    inviteId: Buffer;
    projectKey: Buffer;
    encryptionKeys: EncryptionKeys | undefined;
}
export interface DeviceInfo {
    name: string;
    deviceType?: DeviceInfo_DeviceType | undefined;
    features: DeviceInfo_RPCFeatures[];
}
export declare const DeviceInfo_DeviceType: {
    readonly device_type_unspecified: "device_type_unspecified";
    readonly mobile: "mobile";
    readonly tablet: "tablet";
    readonly desktop: "desktop";
    readonly UNRECOGNIZED: "UNRECOGNIZED";
};
export type DeviceInfo_DeviceType = typeof DeviceInfo_DeviceType[keyof typeof DeviceInfo_DeviceType];
export declare function deviceInfo_DeviceTypeFromJSON(object: any): DeviceInfo_DeviceType;
export declare function deviceInfo_DeviceTypeToNumber(object: DeviceInfo_DeviceType): number;
export declare const DeviceInfo_RPCFeatures: {
    readonly features_unspecified: "features_unspecified";
    readonly ack: "ack";
    readonly UNRECOGNIZED: "UNRECOGNIZED";
};
export type DeviceInfo_RPCFeatures = typeof DeviceInfo_RPCFeatures[keyof typeof DeviceInfo_RPCFeatures];
export declare function deviceInfo_RPCFeaturesFromJSON(object: any): DeviceInfo_RPCFeatures;
export declare function deviceInfo_RPCFeaturesToNumber(object: DeviceInfo_RPCFeatures): number;
export interface InviteAck {
    inviteId: Buffer;
}
export interface InviteCancelAck {
    inviteId: Buffer;
}
export interface InviteResponseAck {
    inviteId: Buffer;
}
export interface ProjectJoinDetailsAck {
    inviteId: Buffer;
}
export interface MapShareRequest {
    shareId: string;
    mapId: string;
    mapName: string;
    bounds: number[];
    minzoom: number;
    maxzoom: number;
    estimatedSizeBytes: number;
}
export interface MapShareAccept {
    shareId: Buffer;
}
export interface MapShareReject {
    shareId: Buffer;
    reason: MapShareReject_Reason;
}
export declare const MapShareReject_Reason: {
    readonly DISK_SPACE: "DISK_SPACE";
    readonly USER_REJECTED: "USER_REJECTED";
    readonly ALREADY: "ALREADY";
    readonly UNRECOGNIZED: "UNRECOGNIZED";
};
export type MapShareReject_Reason = typeof MapShareReject_Reason[keyof typeof MapShareReject_Reason];
export declare function mapShareReject_ReasonFromJSON(object: any): MapShareReject_Reason;
export declare function mapShareReject_ReasonToNumber(object: MapShareReject_Reason): number;
export interface MapShareURL {
    shareId: Buffer;
    serverPublicKey: Buffer;
    url: string;
}
export interface MapShareRequestAck {
    shareId: Buffer;
}
export interface MapShareAcceptAck {
    shareId: Buffer;
}
export interface MapShareRejectAck {
    shareId: Buffer;
}
export interface MapShareURLAck {
    shareId: Buffer;
}
export declare const Invite: {
    encode(message: Invite, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Invite;
    create<I extends Exact<DeepPartial<Invite>, I>>(base?: I): Invite;
    fromPartial<I extends Exact<DeepPartial<Invite>, I>>(object: I): Invite;
};
export declare const InviteCancel: {
    encode(message: InviteCancel, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): InviteCancel;
    create<I extends Exact<DeepPartial<InviteCancel>, I>>(base?: I): InviteCancel;
    fromPartial<I extends Exact<DeepPartial<InviteCancel>, I>>(object: I): InviteCancel;
};
export declare const InviteResponse: {
    encode(message: InviteResponse, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): InviteResponse;
    create<I extends Exact<DeepPartial<InviteResponse>, I>>(base?: I): InviteResponse;
    fromPartial<I extends Exact<DeepPartial<InviteResponse>, I>>(object: I): InviteResponse;
};
export declare const ProjectJoinDetails: {
    encode(message: ProjectJoinDetails, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): ProjectJoinDetails;
    create<I extends Exact<DeepPartial<ProjectJoinDetails>, I>>(base?: I): ProjectJoinDetails;
    fromPartial<I extends Exact<DeepPartial<ProjectJoinDetails>, I>>(object: I): ProjectJoinDetails;
};
export declare const DeviceInfo: {
    encode(message: DeviceInfo, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): DeviceInfo;
    create<I extends Exact<DeepPartial<DeviceInfo>, I>>(base?: I): DeviceInfo;
    fromPartial<I extends Exact<DeepPartial<DeviceInfo>, I>>(object: I): DeviceInfo;
};
export declare const InviteAck: {
    encode(message: InviteAck, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): InviteAck;
    create<I extends Exact<DeepPartial<InviteAck>, I>>(base?: I): InviteAck;
    fromPartial<I extends Exact<DeepPartial<InviteAck>, I>>(object: I): InviteAck;
};
export declare const InviteCancelAck: {
    encode(message: InviteCancelAck, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): InviteCancelAck;
    create<I extends Exact<DeepPartial<InviteCancelAck>, I>>(base?: I): InviteCancelAck;
    fromPartial<I extends Exact<DeepPartial<InviteCancelAck>, I>>(object: I): InviteCancelAck;
};
export declare const InviteResponseAck: {
    encode(message: InviteResponseAck, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): InviteResponseAck;
    create<I extends Exact<DeepPartial<InviteResponseAck>, I>>(base?: I): InviteResponseAck;
    fromPartial<I extends Exact<DeepPartial<InviteResponseAck>, I>>(object: I): InviteResponseAck;
};
export declare const ProjectJoinDetailsAck: {
    encode(message: ProjectJoinDetailsAck, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): ProjectJoinDetailsAck;
    create<I extends Exact<DeepPartial<ProjectJoinDetailsAck>, I>>(base?: I): ProjectJoinDetailsAck;
    fromPartial<I extends Exact<DeepPartial<ProjectJoinDetailsAck>, I>>(object: I): ProjectJoinDetailsAck;
};
export declare const MapShareRequest: {
    encode(message: MapShareRequest, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): MapShareRequest;
    create<I extends Exact<DeepPartial<MapShareRequest>, I>>(base?: I): MapShareRequest;
    fromPartial<I extends Exact<DeepPartial<MapShareRequest>, I>>(object: I): MapShareRequest;
};
export declare const MapShareAccept: {
    encode(message: MapShareAccept, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): MapShareAccept;
    create<I extends Exact<DeepPartial<MapShareAccept>, I>>(base?: I): MapShareAccept;
    fromPartial<I extends Exact<DeepPartial<MapShareAccept>, I>>(object: I): MapShareAccept;
};
export declare const MapShareReject: {
    encode(message: MapShareReject, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): MapShareReject;
    create<I extends Exact<DeepPartial<MapShareReject>, I>>(base?: I): MapShareReject;
    fromPartial<I extends Exact<DeepPartial<MapShareReject>, I>>(object: I): MapShareReject;
};
export declare const MapShareURL: {
    encode(message: MapShareURL, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): MapShareURL;
    create<I extends Exact<DeepPartial<MapShareURL>, I>>(base?: I): MapShareURL;
    fromPartial<I extends Exact<DeepPartial<MapShareURL>, I>>(object: I): MapShareURL;
};
export declare const MapShareRequestAck: {
    encode(message: MapShareRequestAck, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): MapShareRequestAck;
    create<I extends Exact<DeepPartial<MapShareRequestAck>, I>>(base?: I): MapShareRequestAck;
    fromPartial<I extends Exact<DeepPartial<MapShareRequestAck>, I>>(object: I): MapShareRequestAck;
};
export declare const MapShareAcceptAck: {
    encode(message: MapShareAcceptAck, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): MapShareAcceptAck;
    create<I extends Exact<DeepPartial<MapShareAcceptAck>, I>>(base?: I): MapShareAcceptAck;
    fromPartial<I extends Exact<DeepPartial<MapShareAcceptAck>, I>>(object: I): MapShareAcceptAck;
};
export declare const MapShareRejectAck: {
    encode(message: MapShareRejectAck, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): MapShareRejectAck;
    create<I extends Exact<DeepPartial<MapShareRejectAck>, I>>(base?: I): MapShareRejectAck;
    fromPartial<I extends Exact<DeepPartial<MapShareRejectAck>, I>>(object: I): MapShareRejectAck;
};
export declare const MapShareURLAck: {
    encode(message: MapShareURLAck, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): MapShareURLAck;
    create<I extends Exact<DeepPartial<MapShareURLAck>, I>>(base?: I): MapShareURLAck;
    fromPartial<I extends Exact<DeepPartial<MapShareURLAck>, I>>(object: I): MapShareURLAck;
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
