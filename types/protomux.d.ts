declare module 'protomux' {
  import { Duplex } from 'streamx'
  import { Duplex as NodeDuplex } from 'stream'
  import type cenc from 'compact-encoding'

  interface Message {
    type: number
    send(msg: any): boolean
    onmessage: (message: any) => void
    encoding: cenc.Encoder
  }

  type MessageOptions = Partial<Pick<Message, 'onmessage' | 'encoding'>>

  interface Channel {
    open(handshake?: any): void
    userData: any
    protocol: string
    id: Buffer
    messages: Message[]
    opened: boolean
    closed: boolean
    destroyed: boolean
    cork(): void
    uncork(): void
    close(): void
    addMessage(opts?: MessageOptions): Message
  }

  class Protomux<TStream extends Duplex | NodeDuplex = Duplex> {
    constructor(stream: TStream)
    [Symbol.iterator](): IterableIterator<Channel>
    isProtomux: true
    stream: TStream
    static from(stream: TStream): Protomux<TStream>
    static isProtomux(mux: unknown): mux is Protomux
    cork(): void
    uncork(): void
    pair(
      opts: { protocol: string; id?: null | Buffer },
      notify: (id: Buffer) => Promise<void>
    ): void
    unpair(opts: { protocol: string; id?: null | Buffer }): void
    opened(opts: { protocol: string; id?: null | Buffer }): boolean
    createChannel(opts: {
      userData?: any
      protocol: string
      aliases?: string[]
      id?: null | Buffer
      unique?: boolean
      handshake?: cenc.Encoder
      messages: MessageOptions[]
      onopen?(handshake?: any): Promise<void> | void
      onclose?(): Promise<void> | void
      ondestroy?(): Promise<void> | void
      ondrain?(): Promise<void> | void
    }): Channel
    destroy(err: Error): void
  }

  export = Protomux
}
