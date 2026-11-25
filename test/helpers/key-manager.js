import { KeyManager } from '@comapeo/crypto'

// The root key value is irrelevant to tests: the only method that reads it is
// getIdentityBackupCode(), which nothing in src/ or the tests ever calls. So a
// single fixed constant serves every identity, and each identity is defined
// purely by its (deterministic) master key.
const ROOT_KEY = Buffer.alloc(16)

/**
 * Build the deterministic master key for a given index: 32 bytes filled with
 * (index + 1). Distinct per index, no KDF, no cache, stable across runs.
 *
 * @param {number} index
 * @returns {Buffer} 32-byte master key
 */
export function masterKeyFor(index) {
  if (!Number.isInteger(index) || index < 0 || index > 254) {
    throw new RangeError(
      'cannot create more than 254 identities (index must be 0-254)'
    )
  }
  return Buffer.alloc(32, index + 1)
}

/**
 * A deterministic, reusable device identity. Each `index` is a distinct
 * identity; no expensive key derivation is performed.
 *
 * @param {number} [index] 0-254; each index is a distinct identity.
 * @returns {import('@comapeo/crypto').KeyManager}
 */
export function keyManagerFixture(index = 0) {
  return new KeyManager(ROOT_KEY, { masterKey: masterKeyFor(index) })
}

/**
 * `{ rootKey, masterKey }` pair to pass straight into `MapeoManager` opts.
 *
 * @param {number} [index] 0-254; each index is a distinct identity.
 * @returns {{ rootKey: Buffer, masterKey: Buffer }}
 */
export function deviceKeyFixture(index = 0) {
  return { rootKey: ROOT_KEY, masterKey: masterKeyFor(index) }
}
