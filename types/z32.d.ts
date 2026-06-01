declare module 'z32' {
  function encode(buf: Uint8Array | string): string

  function decode(s: string, out?: Uint8Array): Uint8Array

  export { encode, decode }
}
