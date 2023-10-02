declare module 'z32' {
  interface Z32 {
    encode(buf: Uint8Array): string
    decode(s: string, out?: Uint8Array): Uint8Array | Buffer
  }
  const z32: Z32
  export = z32
}
