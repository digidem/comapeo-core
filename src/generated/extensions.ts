/* eslint-disable */
import Long from "long";
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

export const HaveExtension_Namespace = {
  auth: "auth",
  config: "config",
  data: "data",
  blobIndex: "blobIndex",
  blob: "blob",
  UNRECOGNIZED: "UNRECOGNIZED",
} as const;

export type HaveExtension_Namespace = typeof HaveExtension_Namespace[keyof typeof HaveExtension_Namespace];

export function haveExtension_NamespaceFromJSON(object: any): HaveExtension_Namespace {
  switch (object) {
    case 0:
    case "auth":
      return HaveExtension_Namespace.auth;
    case 1:
    case "config":
      return HaveExtension_Namespace.config;
    case 2:
    case "data":
      return HaveExtension_Namespace.data;
    case 3:
    case "blobIndex":
      return HaveExtension_Namespace.blobIndex;
    case 4:
    case "blob":
      return HaveExtension_Namespace.blob;
    case -1:
    case "UNRECOGNIZED":
    default:
      return HaveExtension_Namespace.UNRECOGNIZED;
  }
}

export function haveExtension_NamespaceToNumber(object: HaveExtension_Namespace): number {
  switch (object) {
    case HaveExtension_Namespace.auth:
      return 0;
    case HaveExtension_Namespace.config:
      return 1;
    case HaveExtension_Namespace.data:
      return 2;
    case HaveExtension_Namespace.blobIndex:
      return 3;
    case HaveExtension_Namespace.blob:
      return 4;
    case HaveExtension_Namespace.UNRECOGNIZED:
    default:
      return -1;
  }
}

/** A map of blob types and variants that a peer intends to download */
export interface DownloadIntentExtension {
  downloadIntents: { [key: string]: DownloadIntentExtension_DownloadIntent };
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

export interface MapShareExtension {
  /** The URL of the server to perform map shares over */
  url: string;
  /** The ID of the device that sent the map share */
  senderDeviceId: string;
  /** The name of the device that sent the map share */
  senderDeviceName: string;
  /** The ID of the map share */
  shareId: string;
  /** The name of the map being shared */
  mapName: string;
  /** The ID of the map being shared */
  mapId: string;
  /** The timestamp when the map share invite was received */
  receivedAt: number;
  /** The bounding box of the map data being shared */
  bounds: number[];
  /** The minimum zoom level of the map data being shared */
  minzoom: number;
  /** The maximum zoom level of the map data being shared */
  maxzoom: number;
  /** Estimated size of the map data being shared in bytes */
  estimatedSizeBytes: number;
}

function createBaseProjectExtension(): ProjectExtension {
  return { authCoreKeys: [] };
}

export const ProjectExtension = {
  encode(message: ProjectExtension, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.authCoreKeys) {
      writer.uint32(10).bytes(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ProjectExtension {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseProjectExtension();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.authCoreKeys.push(reader.bytes() as Buffer);
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  create<I extends Exact<DeepPartial<ProjectExtension>, I>>(base?: I): ProjectExtension {
    return ProjectExtension.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ProjectExtension>, I>>(object: I): ProjectExtension {
    const message = createBaseProjectExtension();
    message.authCoreKeys = object.authCoreKeys?.map((e) => e) || [];
    return message;
  },
};

function createBaseHaveExtension(): HaveExtension {
  return {
    discoveryKey: Buffer.alloc(0),
    start: 0,
    encodedBitfield: Buffer.alloc(0),
    namespace: HaveExtension_Namespace.auth,
  };
}

export const HaveExtension = {
  encode(message: HaveExtension, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.discoveryKey.length !== 0) {
      writer.uint32(10).bytes(message.discoveryKey);
    }
    if (message.start !== 0) {
      writer.uint32(16).uint64(message.start);
    }
    if (message.encodedBitfield.length !== 0) {
      writer.uint32(26).bytes(message.encodedBitfield);
    }
    if (message.namespace !== HaveExtension_Namespace.auth) {
      writer.uint32(32).int32(haveExtension_NamespaceToNumber(message.namespace));
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): HaveExtension {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseHaveExtension();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.discoveryKey = reader.bytes() as Buffer;
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.start = longToNumber(reader.uint64() as Long);
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.encodedBitfield = reader.bytes() as Buffer;
          continue;
        case 4:
          if (tag !== 32) {
            break;
          }

          message.namespace = haveExtension_NamespaceFromJSON(reader.int32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  create<I extends Exact<DeepPartial<HaveExtension>, I>>(base?: I): HaveExtension {
    return HaveExtension.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<HaveExtension>, I>>(object: I): HaveExtension {
    const message = createBaseHaveExtension();
    message.discoveryKey = object.discoveryKey ?? Buffer.alloc(0);
    message.start = object.start ?? 0;
    message.encodedBitfield = object.encodedBitfield ?? Buffer.alloc(0);
    message.namespace = object.namespace ?? HaveExtension_Namespace.auth;
    return message;
  },
};

function createBaseDownloadIntentExtension(): DownloadIntentExtension {
  return { downloadIntents: {}, everything: false };
}

export const DownloadIntentExtension = {
  encode(message: DownloadIntentExtension, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    Object.entries(message.downloadIntents).forEach(([key, value]) => {
      DownloadIntentExtension_DownloadIntentsEntry.encode({ key: key as any, value }, writer.uint32(10).fork())
        .ldelim();
    });
    if (message.everything === true) {
      writer.uint32(16).bool(message.everything);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DownloadIntentExtension {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDownloadIntentExtension();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          const entry1 = DownloadIntentExtension_DownloadIntentsEntry.decode(reader, reader.uint32());
          if (entry1.value !== undefined) {
            message.downloadIntents[entry1.key] = entry1.value;
          }
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.everything = reader.bool();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  create<I extends Exact<DeepPartial<DownloadIntentExtension>, I>>(base?: I): DownloadIntentExtension {
    return DownloadIntentExtension.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<DownloadIntentExtension>, I>>(object: I): DownloadIntentExtension {
    const message = createBaseDownloadIntentExtension();
    message.downloadIntents = Object.entries(object.downloadIntents ?? {}).reduce<
      { [key: string]: DownloadIntentExtension_DownloadIntent }
    >((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = DownloadIntentExtension_DownloadIntent.fromPartial(value);
      }
      return acc;
    }, {});
    message.everything = object.everything ?? false;
    return message;
  },
};

function createBaseDownloadIntentExtension_DownloadIntent(): DownloadIntentExtension_DownloadIntent {
  return { variants: [] };
}

export const DownloadIntentExtension_DownloadIntent = {
  encode(message: DownloadIntentExtension_DownloadIntent, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.variants) {
      writer.uint32(10).string(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DownloadIntentExtension_DownloadIntent {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDownloadIntentExtension_DownloadIntent();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.variants.push(reader.string());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  create<I extends Exact<DeepPartial<DownloadIntentExtension_DownloadIntent>, I>>(
    base?: I,
  ): DownloadIntentExtension_DownloadIntent {
    return DownloadIntentExtension_DownloadIntent.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<DownloadIntentExtension_DownloadIntent>, I>>(
    object: I,
  ): DownloadIntentExtension_DownloadIntent {
    const message = createBaseDownloadIntentExtension_DownloadIntent();
    message.variants = object.variants?.map((e) => e) || [];
    return message;
  },
};

function createBaseDownloadIntentExtension_DownloadIntentsEntry(): DownloadIntentExtension_DownloadIntentsEntry {
  return { key: "", value: undefined };
}

export const DownloadIntentExtension_DownloadIntentsEntry = {
  encode(message: DownloadIntentExtension_DownloadIntentsEntry, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.key !== "") {
      writer.uint32(10).string(message.key);
    }
    if (message.value !== undefined) {
      DownloadIntentExtension_DownloadIntent.encode(message.value, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DownloadIntentExtension_DownloadIntentsEntry {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDownloadIntentExtension_DownloadIntentsEntry();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.key = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.value = DownloadIntentExtension_DownloadIntent.decode(reader, reader.uint32());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  create<I extends Exact<DeepPartial<DownloadIntentExtension_DownloadIntentsEntry>, I>>(
    base?: I,
  ): DownloadIntentExtension_DownloadIntentsEntry {
    return DownloadIntentExtension_DownloadIntentsEntry.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<DownloadIntentExtension_DownloadIntentsEntry>, I>>(
    object: I,
  ): DownloadIntentExtension_DownloadIntentsEntry {
    const message = createBaseDownloadIntentExtension_DownloadIntentsEntry();
    message.key = object.key ?? "";
    message.value = (object.value !== undefined && object.value !== null)
      ? DownloadIntentExtension_DownloadIntent.fromPartial(object.value)
      : undefined;
    return message;
  },
};

function createBaseMapShareExtension(): MapShareExtension {
  return {
    url: "",
    senderDeviceId: "",
    senderDeviceName: "",
    shareId: "",
    mapName: "",
    mapId: "",
    receivedAt: 0,
    bounds: [],
    minzoom: 0,
    maxzoom: 0,
    estimatedSizeBytes: 0,
  };
}

export const MapShareExtension = {
  encode(message: MapShareExtension, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.url !== "") {
      writer.uint32(10).string(message.url);
    }
    if (message.senderDeviceId !== "") {
      writer.uint32(18).string(message.senderDeviceId);
    }
    if (message.senderDeviceName !== "") {
      writer.uint32(26).string(message.senderDeviceName);
    }
    if (message.shareId !== "") {
      writer.uint32(34).string(message.shareId);
    }
    if (message.mapName !== "") {
      writer.uint32(42).string(message.mapName);
    }
    if (message.mapId !== "") {
      writer.uint32(50).string(message.mapId);
    }
    if (message.receivedAt !== 0) {
      writer.uint32(56).uint64(message.receivedAt);
    }
    writer.uint32(66).fork();
    for (const v of message.bounds) {
      writer.double(v);
    }
    writer.ldelim();
    if (message.minzoom !== 0) {
      writer.uint32(72).int32(message.minzoom);
    }
    if (message.maxzoom !== 0) {
      writer.uint32(80).int32(message.maxzoom);
    }
    if (message.estimatedSizeBytes !== 0) {
      writer.uint32(88).uint64(message.estimatedSizeBytes);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): MapShareExtension {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMapShareExtension();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.url = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.senderDeviceId = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.senderDeviceName = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.shareId = reader.string();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.mapName = reader.string();
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.mapId = reader.string();
          continue;
        case 7:
          if (tag !== 56) {
            break;
          }

          message.receivedAt = longToNumber(reader.uint64() as Long);
          continue;
        case 8:
          if (tag === 65) {
            message.bounds.push(reader.double());

            continue;
          }

          if (tag === 66) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.bounds.push(reader.double());
            }

            continue;
          }

          break;
        case 9:
          if (tag !== 72) {
            break;
          }

          message.minzoom = reader.int32();
          continue;
        case 10:
          if (tag !== 80) {
            break;
          }

          message.maxzoom = reader.int32();
          continue;
        case 11:
          if (tag !== 88) {
            break;
          }

          message.estimatedSizeBytes = longToNumber(reader.uint64() as Long);
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  create<I extends Exact<DeepPartial<MapShareExtension>, I>>(base?: I): MapShareExtension {
    return MapShareExtension.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<MapShareExtension>, I>>(object: I): MapShareExtension {
    const message = createBaseMapShareExtension();
    message.url = object.url ?? "";
    message.senderDeviceId = object.senderDeviceId ?? "";
    message.senderDeviceName = object.senderDeviceName ?? "";
    message.shareId = object.shareId ?? "";
    message.mapName = object.mapName ?? "";
    message.mapId = object.mapId ?? "";
    message.receivedAt = object.receivedAt ?? 0;
    message.bounds = object.bounds?.map((e) => e) || [];
    message.minzoom = object.minzoom ?? 0;
    message.maxzoom = object.maxzoom ?? 0;
    message.estimatedSizeBytes = object.estimatedSizeBytes ?? 0;
    return message;
  },
};

declare const self: any | undefined;
declare const window: any | undefined;
declare const global: any | undefined;
const tsProtoGlobalThis: any = (() => {
  if (typeof globalThis !== "undefined") {
    return globalThis;
  }
  if (typeof self !== "undefined") {
    return self;
  }
  if (typeof window !== "undefined") {
    return window;
  }
  if (typeof global !== "undefined") {
    return global;
  }
  throw "Unable to locate global object";
})();

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

type DeepPartial<T> = T extends Builtin ? T
  : T extends Array<infer U> ? Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
type Exact<P, I extends P> = P extends Builtin ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P>>]: never };

function longToNumber(long: Long): number {
  if (long.gt(Number.MAX_SAFE_INTEGER)) {
    throw new tsProtoGlobalThis.Error("Value is larger than Number.MAX_SAFE_INTEGER");
  }
  return long.toNumber();
}

if (_m0.util.Long !== Long) {
  _m0.util.Long = Long as any;
  _m0.configure();
}
