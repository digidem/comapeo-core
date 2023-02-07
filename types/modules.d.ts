// TODO: create types for these modules

// The following are defined in lib/types.js:
// - KeyPair
// - DhtNode

declare module 'brittle'
declare module 'multi-core-indexer'
declare module '@mapeo/sqlite-indexer'
declare module 'sodium-universal'
declare module 'base32.js'

declare module 'kademlia-routing-table' {
  import { TypedEmitter } from 'tiny-typed-emitter'

  interface NodeType {
    id: Buffer
  }

  class Row extends TypedEmitter<{
    full(node: NodeType): void
    add(node: NodeType): void
    remove(node: NodeType): void
  }> {
    readonly index: number
    readonly table: RoutingTable
    nodes: NodeType[]
    data: any

    constructor(table: RoutingTable, index: number)

    add<N extends NodeType>(node: N): boolean | undefined
    remove(id: Buffer): boolean
    get(id: Buffer): NodeType | null
    random(): NodeType | null
    insert<N extends NodeType>(i: number, node: N): void
    splice(i: number): void
    compare<N extends NodeType>(a: N, b: N): number
  }

  class RoutingTable extends TypedEmitter<{ row: (row: Row) => void }> {
    readonly id: Buffer
    readonly k: number
    rows: Row[]

    constructor(id: Buffer, opts?: { k?: number })

    add<N extends NodeType>(node: N): ReturnType<Row['add']>
    remove(id: Buffer): ReturnType<Row['remove']>
    get(id: Buffer): ReturnType<Row['get']>
    has(id: Buffer): boolean
    random(): ReturnType<Row['random']>
    closest(id: Buffer, k: number): NodeType[]
    toArray(): NodeType[]
  }

  export = RoutingTable
}
declare module 'time-ordered-set' {
  interface Node {
    prev: any
    next: any
  }

  function TimeOrderedSet(): TimeOrderedSet

  class TimeOrderedSet {
    oldest: Node
    latest: Node
    length: number
    has(node: Node): boolean
    add(node: any): Node
    remove(node: Node): Node
    toArray(pick: number): Node[]
  }

  export = TimeOrderedSet
}
declare module 'hyperswarm' {
  import { TypedEmitter } from 'tiny-typed-emitter'
  import Dht, { RelayAddress } from '@hyperswarm/dht'
  import NoiseSecretStream from '@hyperswarm/secret-stream'

  interface PeerDiscoveryOpts {
    wait?: number | null
    onpeer?: () => void
    onerror?: (err: any) => void
  }

  export class PeerDiscovery {
    readonly swarm: Hyperswarm
    readonly topic: Buffer
    isClient: boolean
    isServer: boolean
    destroyed: boolean
    destroying: Promise<void> | null

    constructor(swarm: Hyperswarm, topic: Buffer, opts?: PeerDiscoveryOpts)

    session(opts: {
      server?: boolean
      client?: boolean
      onerror?: (err: any) => void
    }): PeerDiscoverySession
    refresh(): Promise<void>
    flushed(): Promise<boolean>
    destroy(): Promise<void>
  }

  export class PeerDiscoverySession {
    readonly discovery: PeerDiscovery
    isClient: boolean
    isServer: boolean
    destroyed: boolean

    constructor(discovery: PeerDiscovery)

    get swarm(): PeerDiscovery['swarm']
    get topic(): PeerDiscovery['topic']

    refresh(opts?: { client?: boolean; server?: boolean }): Promise<void>
    flushed(): Promise<boolean>
    destroy(): Promise<void>
  }

  export class PeerInfo extends TypedEmitter<{
    topic(topic: Buffer): void
  }> {
    readonly publicKey: Buffer
    readonly relayAddresses: RelayAddress[]
    reconnecting: boolean
    proven: boolean
    banned: boolean
    tried: boolean
    explicit: boolean
    queued: boolean
    client: boolean
    topics: Buffer[]
    attempts: number
    priority: number

    constructor(opts: { publicKey: Buffer; relayAddresses: RelayAddress[] })

    get server(): boolean
    get prioritized(): boolean

    reconnect(val: any): void
    ban(val: any): void
  }

  class Hyperswarm extends TypedEmitter<{
    connection(conn: NoiseSecretStream, peerInfo: PeerInfo): void
  }> {
    destroyed: boolean
    listening: boolean
    readonly maxPeers: number
    readonly maxClientConnections: number
    readonly maxServerConnections: number
    readonly maxParallel: number
    readonly connections: Set<NoiseSecretStream>
    readonly peers: Map<string, PeerInfo>
    readonly explicitPeers: Set<PeerInfo>
    readonly dht: Dht

    constructor(opts?: {
      seed?: Buffer
      keyPair?: KeyPair
      maxPeers?: number
      maxClientConnections?: number
      maxServerConnections?: number
      maxParallel?: number
      firewall?: (remotePublicKey: Buffer) => boolean
      dht?: Dht
      debug?: boolean
      bootstrap?: DhtNode[]
      backoff?: number
      jitter?: number
    })

    status(key: Buffer): PeerDiscovery | null
    listen(): boolean
    join(
      topic: Buffer,
      opts?: {
        server?: boolean
        client?: boolean
        onerror?: (err: any) => void
      }
    ): PeerDiscoverySession
    leave(topic: Buffer): Promise<void>
    joinPeer(publicKey: Buffer): void
    leavePeer(publicKey: Buffer): void
    flush(): Promise<void>
    clear(): Promise<void[]>
    destroy(): Promise<void>
    topics(): PeerDiscovery[]
  }

  export default Hyperswarm
}

declare module 'udx-native' {
  import { TypedEmitter } from 'tiny-typed-emitter'
  import { Duplex } from 'streamx'

  export interface Interface {
    name: string
    host: string
    family: number
    internal: boolean
  }

  // https://github.com/hyperswarm/libudx/blob/e8cdf8f6edb598b7617784867087a69f958d84c3/lib/network-interfaces.js
  export class NetworkInterfaces extends TypedEmitter<{
    close(): void
    change(interfaces: Interface[]): void
  }> {
    interfaces: Interface[]

    watch(): this
    unwatch(): NetworkInterfaces
    destroy(): Promise<void>

    [Symbol.iterator](): NetworkInterfaces['interfaces'][typeof Symbol.iterator]
  }

  // https://github.com/hyperswarm/libudx/blob/e8cdf8f6edb598b7617784867087a69f958d84c3/lib/socket.js
  export class UDXSocket extends TypedEmitter<{
    message(
      buffer: Buffer,
      info: { host: string; family: number; port: number }
    ): void
    close(): void
    idle(): void
    busy(): void
    listening(): void
  }> {
    readonly udx: UDX
    streams: Set<UDXStream>

    constructor(udx: UDX)

    static isIPv4(host: string): boolean
    static isIPv6(host: string): boolean
    static isIP(host: string): boolean

    get bound(): boolean
    get closing(): boolean
    get idle(): boolean
    get busy(): boolean

    address(): { host: string | null; family: number; port: number }
    bind(port?: number, host?: number): void
    close(): Promise<boolean | undefined>
    setTTL(ttl: number): void
    getRecvBufferSize(): number
    setRecvBufferSize(size: number): null
    getSendBufferSize(): number
    setSendBufferSize(size: number): number
    send(
      buffer: Buffer,
      port: number,
      host?: string,
      ttl?: number
    ): Promise<boolean | undefined>
    trySend(buffer: Buffer, port: number, host?: string, ttl?: number): void
  }

  // https://github.com/hyperswarm/libudx/blob/e8cdf8f6edb598b7617784867087a69f958d84c3/lib/stream.js
  class UDXStream extends Duplex {
    readonly udx: UDX
    socket: UDXSocket | null

    constructor(
      udx: UDX,
      id: number,
      opts?: {
        firewall?: (socket: UDXSocket, port: number, host: string) => boolean
        framed?: boolean
        seq?: number
      }
    )

    get connected(): boolean
    get mtu(): number
    get rtt(): number
    get cwnd(): number
    get inflight(): number
    get localhost(): string | null
    get localFamily(): number
    get localPort(): number

    setInteractive(bool: boolean): void
    setMTU(mtu: number): void
    connect(
      socket: UDXSocket,
      remoteId: number,
      port: number,
      host?: string | { ack?: number },
      opts?: { ack?: number }
    ): void
    relayTo(destination: Buffer): void
    send(buffer: Buffer): Promise<void>
    trySend(buffer: Buffer): void
  }

  // https://github.com/hyperswarm/libudx/blob/e8cdf8f6edb598b7617784867087a69f958d84c3/lib/udx.js
  class UDX {
    createSocket(): UDXSocket
    createStream(id: Buffer, opts?: {}): UDXStream
    networkInterfaces(): NetworkInterfaces['interfaces']
    watchNetworkInterfaces(
      onchange?: (interfaces: NetworkInterfaces['interfaces']) => void
    ): NetworkInterfaces
    lookup(
      host: string,
      opts?: { family?: number }
    ): Promise<{ host: string; family: number }>
  }

  export default UDX
}
declare module 'dht-rpc' {
  import { TypedEmitter } from 'tiny-typed-emitter'
  import { Readable } from 'stream'
  import UDX, { Interface, NetworkInterfaces, UDXSocket } from 'udx-native'
  import TimeOrderedSet from 'time-ordered-set'
  import RoutingTable from 'kademlia-routing-table'

  interface IdentifiedDhtNode extends DhtNode {
    id: Buffer
  }

  // TODO: Potentially incomplete?
  interface Reply {
    error: number
    closerNodes: IdentifiedDhtNode[]
    from: IdentifiedDhtNode
  }

  export interface QueryOpts {
    map?: <R extends Reply>(reply: Reply) => R
    concurrency?: number
    maxSlow?: number
    commit?:
      | boolean
      | ((reply: Reply, dht: Dht, query: Query) => Promise<Request>)
    nodes?: IdentifiedDhtNode[]
    closestNodes?: IdentifiedDhtNode[]
    replies?: Reply[]
    closestReplies?: Reply[]
  }

  // https://github.com/mafintosh/dht-rpc/blob/c9900d55256f09646b57f99ac9f2342910d52fe7/lib/query.js
  export class Query extends Readable {
    readonly dht: Dht
    readonly k: number
    readonly target: Buffer
    readonly internal: boolean
    readonly command: Buffer
    readonly value: Buffer | null
    readonly concurrency: number
    readonly map: <R extends Reply>(reply: Reply) => R
    readonly maxSlow: number
    errors: number
    successes: number
    inflight: number
    closestReplies: Reply[]

    constructor(
      dht: Dht,
      target: Buffer,
      internal: boolean,
      command: Buffer,
      value: Buffer | null,
      opts?: QueryOpts
    )

    get closestNodes(): IdentifiedDhtNode[]
    finished(): Promise<void>
  }

  // https://github.com/mafintosh/dht-rpc/blob/c9900d55256f09646b57f99ac9f2342910d52fe7/lib/io.js#L376
  class CongestionWindow {
    constructor(maxWindow: number)

    isFull(): boolean
    recv(): void
    send(): void
    drain(): void
  }

  // TODO: Unsure, based on https://github.com/mafintosh/dht-rpc/blob/c9900d55256f09646b57f99ac9f2342910d52fe7/lib/io.js#L62-L80
  interface Response {
    tid: number
    from: { id: null; host: string; port: number }
    to: IdentifiedDhtNode
    token: Buffer
    closerNodes: IdentifiedDhtNode[]
    error: number
    value: Buffer
  }

  // https://github.com/mafintosh/dht-rpc/blob/c9900d55256f09646b57f99ac9f2342910d52fe7/lib/io.js#L214
  class Request {
    constructor(
      io: IO,
      socket: UDXSocket,
      tid: number,
      from: IdentifiedDhtNode,
      to: IdentifiedDhtNode,
      token: Buffer | null,
      internal: boolean,
      command: Buffer,
      target: Buffer | null,
      value: Buffer | null
    )

    static decode(
      io: IO,
      socket: UDXSocket,
      from: IdentifiedDhtNode,
      state: {
        start: number
        end: number
      }
    ): Request | null

    reply(
      value: Buffer | null,
      opts?: {
        to?: IdentifiedDhtNode
        from?: IdentifiedDhtNode
        socket?: UDXSocket
        token?: Buffer | null | boolean
        closerNodes?: IdentifiedDhtNode[] | boolean
      }
    ): void
    error(
      code: number,
      opts?: {
        to?: IdentifiedDhtNode
        from?: IdentifiedDhtNode
        socket?: UDXSocket
        token?: Buffer | boolean
        closerNodes?: IdentifiedDhtNode[] | boolean
      }
    ): void
    relay(
      value: Buffer | null,
      to: IdentifiedDhtNode,
      opts?: {
        socket: UDXSocket
      }
    ): void
    send(force?: boolean): void
    sendReply(
      error: number,
      value: Buffer,
      token: Buffer,
      hasCloserNodes: boolean
    ): void
    destroy(): void
  }

  // https://github.com/mafintosh/dht-rpc/blob/c9900d55256f09646b57f99ac9f2342910d52fe7/lib/io.js
  class IO {
    readonly table: RoutingTable
    readonly udx: UDX
    readonly firewalled: boolean
    readonly ephemeral: boolean
    readonly congestion: CongestionWindow
    readonly networkInterfaces: NetworkInterfaces
    readonly onrequest: (req: Request, external: boolean) => void
    readonly onresponse: (res: Response, external: boolean) => void
    readonly ontimeout: (req: Request) => void
    inflight: Request[]
    clientSocket: UDXSocket | null
    serverSocket: UDXSocket | null

    constructor(
      table: RoutingTable,
      udx: UDX,
      opts?: {
        maxWindow?: number
        port?: number
        host?: string
        anyPort?: boolean
        firewalled?: boolean
        onrequest?: (req: Request, external: boolean) => void
        onresponse?: (res: Response, external: boolean) => void
        ontimeout?: (req: Request) => void
      }
    )

    onmessage(
      socket: UDXSocket,
      buffer: Buffer,
      addr: { host: string; port: number }
    ): void
    token(addr: { host: string; port: number }, i: number): Buffer
    destroy(): Promise<void>
    bind(): Promise<void>
    createRequest(
      to: IdentifiedDhtNode,
      token: Buffer | null,
      internal: boolean,
      command: Buffer,
      target: Buffer | null,
      value: Buffer | null
    ): Request
  }

  interface DhtOpts {
    id?: Buffer
    udx?: UDX
    bootstrap?: DhtNode[]
    concurrency?: number
    ephemeral?: boolean
    adaptive?: boolean
    port?: number
    host?: number
    quickFirewall?: boolean
    addNode?: boolean
    nodes?: DhtNode[]
  }

  // https://github.com/mafintosh/dht-rpc/blob/c9900d55256f09646b57f99ac9f2342910d52fe7/index.js
  class Dht extends TypedEmitter<{
    listening(): void
    ready(): void
    ephemeral(): void
    wakeup(): void
    request(request: Request): void
    persistent(): void
    'add-node'(node: DhtNode): void
    'remove-node'(node: DhtNode): void
    'network-change'(interfaces: Interface[]): void
  }> {
    readonly bootstrapNodes: DhtNode[]
    readonly table: RoutingTable
    readonly nodes: TimeOrderedSet
    readonly udx: UDX
    readonly io: IO
    readonly concurrency: boolean
    readonly ephemeral: boolean
    readonly firewalled: boolean
    readonly adaptive: boolean
    bootstrapped: boolean
    destroyed: boolean

    constructor(opts?: DhtOpts)

    static bootstrapper(port: number, host: string, opts?: DhtOpts): Dht

    get id(): Buffer | null
    get host(): string | null
    get port(): number
    get socket(): UDXSocket

    onmessage(socket: UDXSocket, buf: Buffer, rinfo: DhtNode): void
    bind(): Promise<void>
    address(): string | null
    addNode(node: DhtNode): void
    toArray(): DhtNode[]
    ready(): Promise<void>
    findNode(target: Buffer, opts?: QueryOpts): Query
    query(params: {
      target: Buffer
      command: Buffer
      value: Buffer | null
    }): Query
    ping(
      addr: { host: string; port: number },
      opts?: {
        socket?: UDXSocket
        retry?: boolean
      }
    ): Promise<Response>
    request(
      params: {
        token?: Buffer | null
        command: Buffer
        target: Buffer | null
        value: Buffer | null
      },
      addr: { host: string; port: number },
      opts?: {
        socket?: UDXSocket
        retry?: boolean
      }
    ): Promise<Response>
    refresh(): void
    destroy(): ReturnType<IO['destroy']>
    onrequest(req: Request): void
  }

  export default Dht
}
declare module '@hyperswarm/dht' {
  import { TypedEmitter } from 'tiny-typed-emitter'
  import Dht, { Query, QueryOpts } from 'dht-rpc'
  import SecretStream from '@hyperswarm/secret-stream'

  interface HandshakePayload {
    isInitiator: boolean
    publicKey: Buffer
    remotePublicKey: Buffer
    remoteId: Buffer
    hash: Buffer
    rx: Buffer
    tx: Buffer
  }

  export interface RelayAddress {
    host: string
    port: number
  }

  interface ServerOpts {
    onconnection?: (encryptedSocket: SecretStream) => void
    firewall?: (
      remotePublicKey: Buffer,
      remoteHandshakePayload: HandshakePayload
    ) => boolean | Promise<boolean>
  }

  // TODO: Incomplete
  // https://github.com/hyperswarm/dht/blob/4190b7505c365ef8a6ad607fc3862780c65eb482/lib/server.js
  interface Server
    extends TypedEmitter<{
      connection(conn: SecretStream): void
      close(): void
      listening(): void
    }> {
    constructor: (dht: Dht, opts: any) => Server

    listen: (keyPair?: KeyPair) => Promise<void>
    address: () => {
      host: string
      port: number
      publicKey: Buffer
    }
    publicKey: Buffer
    close: () => Promise<void>
    closed: boolean
  }

  export interface DhtOpts {
    keyPair?: KeyPair
    port?: number
    bootstrap?: { host: string; port: number }[]
    maxSize?: number
    maxAge?: number
    seed?: Buffer
    debug?: {
      handshake?: {
        latency?: number
      }
      // TODO: Use definition from https://github.com/digidem/mapeo-core-next/pull/34 when merged
      stream?: SecretStream
    }
  }

  // TODO: Incomplete
  // https://github.com/hyperswarm/dht/blob/4190b7505c365ef8a6ad607fc3862780c65eb482/index.js
  class HyperDht extends Dht {
    readonly defaultKeyPair: KeyPair
    readonly listening: Server[]

    constructor(opts?: DhtOpts)

    static keyPair: (seed?: Buffer) => KeyPair
    static create: (opts: DhtOpts & { relays?: string[] }) => Promise<Dht>
    static hash(data: Buffer): Buffer

    connect(
      remotePublicKey: Buffer,
      options?: { nodes: DhtNode[]; keyPair: KeyPair }
    ): SecretStream
    createServer(
      options?: ServerOpts | ((encryptedSocket: SecretStream) => void),
      onconnection?: (encryptedSocket: SecretStream) => void
    ): Server
    destroy(opts?: { force?: boolean }): Promise<void>
    findPeer(publicKey: Buffer, opts?: QueryOpts): Query
    lookup(target: Buffer, options?: QueryOpts): Query
    lookupAndUnannounce(
      target: Buffer,
      keyPair: KeyPair,
      opts?: QueryOpts & {
        // TODO: Maybe incomplete
        signUnannounce?: (
          target: Buffer,
          token: Buffer,
          id: Buffer,
          ann: {
            peer: {
              publicKey: Buffer
              relayAddresses: RelayAddress[]
            }
            signature: Buffer | null
          },
          secretKey: Buffer
        ) => Buffer
      }
    ): Query
    unannounce(
      target: Buffer,
      keyPair: KeyPair,
      opts?: QueryOpts
    ): Promise<void>
    announce: (
      target: Buffer,
      keyPair: KeyPair,
      relayAddresses: RelayAddress[],
      opts?: QueryOpts & {
        // TODO: Maybe incomplete
        signAnnounce?: (
          target: Buffer,
          token: Buffer,
          id: Buffer,
          ann: {
            peer: {
              publicKey: Buffer
              relayAddresses: RelayAddress[]
            }
            refresh: null
            signature: Buffer | null
          },
          secretKey: Buffer
        ) => Buffer
      }
    ) => Query
  }

  export default HyperDht
}
declare module '@hyperswarm/testnet' {
  import Dht, { DhtOpts } from '@hyperswarm/dht'

  class Testnet {
    readonly nodes: Dht[]
    readonly bootstrap: DhtNode[]

    constructor(nodes: Dht[], bootstrap: DhtNode[])

    createNode(opts: DhtOpts): Dht
    destroy(): Promise<void>
    [Symbol.iterator](): Testnet['nodes'][typeof Symbol.iterator]
  }

  function createTestnet(
    size: number,
    opts?:
      | (() => Promise<void>)
      | {
          host?: string
          port?: number
          teardown?: () => Promise<void>
        }
  ): Promise<Testnet>

  export = createTestnet
}

declare module 'random-access-storage' {
  import { TypedEmitter } from 'tiny-typed-emitter'

  type Cb<T> = (err: any, val?: T) => void

  class Request {
    readonly type: number
    readonly offset: number
    readonly size: number
    readonly data: Buffer
    readonly storage: RandomAccessStorage

    constructor(
      self: RandomAccessStorage,
      type: number,
      offset: number,
      size: number,
      data: Buffer,
      cb: Cb<any>
    )

    callback: Cb<any>
  }

  class RandomAccessStorage extends TypedEmitter<{
    unsuspend(): void
    open(): void
    suspend(): void
    close(): void
    unlink(): void
  }> {
    readonly readable: boolean
    readonly writable: boolean
    readonly deletable: boolean
    readonly truncatable: boolean
    readonly statable: boolean
    opened: boolean
    suspended: boolean
    closed: boolean
    unlinked: boolean
    writing: boolean

    constructor(opts?: {
      open?: boolean
      read?: boolean
      write?: boolean
      del?: boolean
      truncate?: boolean
      stat?: boolean
      suspend?: boolean
      close?: boolean
      unlink?: boolean
    })

    read(offset: number, size: number, cb: Cb<any>): void
    write(offset: number, data: Buffer, cb?: Cb<any>): void
    del(offset: number, size: number, cb?: Cb<any>): void
    truncate(offset: number, cb?: Cb<any>): void
    stat(cb: Cb<any>): void
    open(cb?: Cb<any>): void
    suspend(cb?: Cb<any>): void
    close(cb?: Cb<any>): void
    unlink(cb?: Cb<any>): void
    run(req: Request, writing?: boolean): void
  }

  export = RandomAccessStorage
}
declare module 'random-access-memory' {
  import RandomAccessStorage from 'random-access-storage'

  class RandomAccessMemory extends RandomAccessStorage {
    length: number
    pageSize: number
    buffers: Buffer[]

    constructor(
      opts?:
        | number
        | Buffer
        | { length?: number; buffer?: Buffer; pageSize?: number }
    )

    toBuffer(): Buffer
    clone(): RandomAccessMemory
  }

  export = RandomAccessMemory
}

declare module 'random-access-file' {
  import RandomAccessStorage from 'random-access-storage'

  class Pool {
    readonly maxSize: number
    readonly active: RandomAccessFile[]

    constructor(maxSize: number)
  }

  class RandomAccessFile extends RandomAccessStorage {
    readonly directory: string | null
    readonly filename: string
    readonly fd: number
    readonly mode: number

    constructor(
      filename: string,
      opts?: {
        size?: number
        truncate?: boolean
        directory?: string
        pool?: Pool
        rmdir?: boolean
        lock?: boolean
        sparse?: boolean
        readable?: boolean
        writeable?: boolean
        alloc?: (size: number) => Buffer
      }
    )

    static createPool(maxSize: number): Pool
  }

  export = RandomAccessFile
}

// This only covers the Node definitions. Including the browser ones is a nice-to-have but out of scope for this project.
declare module 'b4a' {
  export function isBuffer(value: any): boolean

  export function isEncoding(encoding: string): boolean

  export function alloc(...args: Parameters<typeof Buffer.alloc>): Buffer

  export function allocUnsafe(size: number): Buffer

  export function allocUnsafeSlow(size: number): Buffer

  export function byteLength(
    ...args: Parameters<typeof Buffer.byteLength>
  ): Buffer

  export function compare(...args: Parameters<typeof Buffer.compare>): number

  export function concat(...args: Parameters<typeof Buffer.concat>): Buffer

  export function copy(
    buffer: Parameters<typeof toBuffer>[0],
    ...copyArgs: Parameters<Buffer['copy']>
  ): Buffer

  export function equals(a: Buffer, b: Buffer): boolean

  export function fill(
    buffer: Parameters<typeof toBuffer>[0],
    ...fillArgs: Parameters<Buffer['fill']>
  ): Buffer

  /**
   * Ideally would do something like:
   *
   * export function from(...args: Parameters<typeof Buffer.from>): Buffer
   *
   * but due to a TS limitation, this only returns the param types of the last function overload
   * https://github.com/microsoft/TypeScript/issues/32164
   */
  export function from(
    arrayBuffer: WithImplicitCoercion<ArrayBuffer | SharedArrayBuffer>,
    byteOffset?: number,
    length?: number
  ): Buffer
  export function from(data: Uint8Array | ReadonlyArray<number>): Buffer
  export function from(
    data: WithImplicitCoercion<Uint8Array | ReadonlyArray<number> | string>
  ): Buffer
  export function from(
    str:
      | WithImplicitCoercion<string>
      | {
          [Symbol.toPrimitive](hint: 'string'): string
        },
    encoding?: BufferEncoding
  ): Buffer

  export function includes(
    buffer: Parameters<typeof toBuffer>[0],
    ...includesArgs: Parameters<Buffer['includes']>
  ): boolean

  export function indexOf(
    buffer: Parameters<typeof toBuffer>[0],
    ...indexOfArgs: Parameters<Buffer['indexOf']>
  ): number

  export function lastIndexOf(
    buffer: Parameters<typeof toBuffer>[0],
    ...lastIndexOfArgs: Parameters<Buffer['lastIndexOf']>
  ): number

  export function swap16(buffer: Parameters<typeof toBuffer>[0]): Buffer

  export function swap32(buffer: Parameters<typeof toBuffer>[0]): Buffer

  export function swap64(buffer: Parameters<typeof toBuffer>[0]): Buffer

  export function toBuffer(
    buffer:
      | Buffer
      | {
          /**
           * Ideally would do something like:
           *
           * buffer: Parameters<typeof Buffer.from>[0]
           *
           * but due to a TS limitation, this only returns the param type of the last function overload
           * https://github.com/microsoft/TypeScript/issues/32164
           */
          buffer:
            | WithImplicitCoercion<ArrayBuffer | SharedArrayBuffer>
            | Uint8Array
            | ReadonlyArray<number>
            | WithImplicitCoercion<Uint8Array | ReadonlyArray<number> | string>
          byteOffset?: number
          byteLength?: number
        }
  ): Buffer

  export function toString(
    buffer: Parameters<typeof toBuffer>[0],
    ...toStringArgs: Parameters<Buffer['toString']>
  ): string

  export function writeDoubleLE(
    buffer: Parameters<typeof toBuffer>[0],
    ...writeDoubleLEArgs: Parameters<Buffer['writeDoubleLE']>
  ): number

  export function writeFloatLE(
    buffer: Parameters<typeof toBuffer>[0],
    ...writeFloatLEArgs: Parameters<Buffer['writeFloatLE']>
  ): number

  export function writeUInt32LE(
    buffer: Parameters<typeof toBuffer>[0],
    ...writeUInt32LEArgs: Parameters<Buffer['writeUInt32LE']>
  ): number

  export function writeInt32LE(
    buffer: Parameters<typeof toBuffer>[0],
    ...writeInt32LEArgs: Parameters<Buffer['writeInt32LE']>
  ): number

  export function readDoubleLE(
    buffer: Parameters<typeof toBuffer>[0],
    ...readDoubleLEArgs: Parameters<Buffer['readDoubleLE']>
  ): number

  export function readFloatLE(
    buffer: Parameters<typeof toBuffer>[0],
    ...readFloatLEArgs: Parameters<Buffer['readFloatLE']>
  ): number

  export function readUInt32LE(
    buffer: Parameters<typeof toBuffer>[0],
    ...readUInt32LEArgs: Parameters<Buffer['readUInt32LE']>
  ): number

  export function readInt32LE(
    buffer: Parameters<typeof toBuffer>[0],
    ...readInt32LEArgs: Parameters<Buffer['readInt32LE']>
  ): number
}
