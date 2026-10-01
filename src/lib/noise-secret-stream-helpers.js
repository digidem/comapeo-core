/** @import { Duplex as NodeDuplex } from 'node:stream' */
/** @import { Duplex as StreamxDuplex } from 'streamx' */
/** @import NoiseSecretStream from '@hyperswarm/secret-stream' */
/**
 * @internal
 * @typedef {NodeDuplex | StreamxDuplex} RawStream
 */

/**
 * A noise stream that has been authenticated with a stable public key and
 * has an explicit trust flag. Both LocalDiscovery and RemoteDiscovery emit
 * streams of this shape, so downstream code does not need runtime type checks.
 *
 * @typedef {OpenedNoiseStream & { authenticatedPublicKey: Buffer, isTrusted: boolean }} AuthedNoiseStream
 */

/**
 * @template {RawStream} [T=RawStream]
 * @typedef {NoiseSecretStream<T> & { destroyed: true }} DestroyedNoiseStream
 */

/**
 * @template {RawStream} [T=RawStream]
 * @typedef {NoiseSecretStream<T> & {
 *   publicKey: Buffer,
 *   remotePublicKey: Buffer,
 *   handshake: Buffer,
 *   destroyed: false
 * }} OpenedNoiseStream
 */

/**
 * Utility to await a NoiseSecretStream to open, that returns a stream with the
 * correct types for publicKey and remotePublicKey (which can be null before
 * stream is opened)
 *
 * @template {RawStream} T
 * @param {NoiseSecretStream<T>|AuthedNoiseStream} stream
 * @returns {Promise<OpenedNoiseStream<T> | DestroyedNoiseStream<T> | AuthedNoiseStream>}
 */
export async function openedNoiseSecretStream(stream) {
  await stream.opened
  return /** @type {OpenedNoiseStream<T> | DestroyedNoiseStream<T> | AuthedNoiseStream} */ (
    stream
  )
}
