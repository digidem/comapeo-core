import { verifySignature, sign } from '@mapeo/crypto'
import { NAMESPACES } from './core-manager/index.js'
import { parseVersionId } from '@mapeo/schema'
import { defaultGetWinner } from '@mapeo/sqlite-indexer'
import assert from 'node:assert'
import sodium from 'sodium-universal'
import { kTable, kSelect, kCreateWithDocId } from './datatype/index.js'
import { eq, or } from 'drizzle-orm'
import mapObject from 'map-obj'
import { discoveryKey } from 'hypercore-crypto'

/**
 * @typedef {import('./types.js').CoreOwnershipWithSignatures} CoreOwnershipWithSignatures
 */

export class CoreOwnership {
  #dataType
  /**
   *
   * @param {object} opts
   * @param {import('./datatype/index.js').DataType<
   *   import('./datastore/index.js').DataStore<'auth'>,
   *   typeof import('./schema/project.js').coreOwnershipTable,
   *   'coreOwnership',
   *   import('@mapeo/schema').CoreOwnership,
   *   import('@mapeo/schema').CoreOwnershipValue
   * >} opts.dataType
   */
  constructor({ dataType }) {
    this.#dataType = dataType
  }

  /**
   * @param {string} coreId
   * @returns {Promise<string>} deviceId of device that owns the core
   */
  async getOwner(coreId) {
    const table = this.#dataType[kTable]
    const expressions = []
    for (const namespace of NAMESPACES) {
      expressions.push(eq(table[`${namespace}CoreId`], coreId))
    }
    // prettier-ignore
    const result = this.#dataType[kSelect]()
      .where(or.apply(null, expressions))
      .get()
    if (!result) {
      throw new Error('NotFound')
    }
    return result.docId
  }

  /**
   *
   * @param {string} deviceId
   * @param {typeof NAMESPACES[number]} namespace
   * @returns {Promise<string>} coreId of core belonging to `deviceId` for `namespace`
   */
  async getCoreId(deviceId, namespace) {
    const result = await this.#dataType.getByDocId(deviceId)
    return result[`${namespace}CoreId`]
  }

  /**
   *
   * @param {import('./types.js').KeyPair} identityKeypair
   * @param {Record<typeof NAMESPACES[number], import('./types.js').KeyPair>} coreKeypairs
   */
  async writeOwnership(identityKeypair, coreKeypairs) {
    /** @type {import('./types.js').CoreOwnershipWithSignaturesValue} */
    const docValue = {
      schemaName: 'coreOwnership',
      ...mapObject(coreKeypairs, (key, value) => {
        return [`${key}CoreId`, value.publicKey.toString('hex')]
      }),
      identitySignature: sign(
        identityKeypair.publicKey,
        identityKeypair.secretKey
      ),
      coreSignatures: mapObject(coreKeypairs, (key, value) => {
        return [key, sign(value.publicKey, value.secretKey)]
      }),
    }
    const docId = identityKeypair.publicKey.toString('hex')
    await this.#dataType[kCreateWithDocId](docId, docValue)
  }
}

/**
 * - Validate that the doc is written to the core identified by doc.authCoreId
 * - Verify the signatures
 * - Remove the signatures (we don't add them to the indexer)
 * - Set doc.links to an empty array - this forces the indexer to treat every
 *   document as a fork, so getWinner is called for every doc, which resolves to
 *   the doc with the lowest index (e.g. the first)
 *
 * @param {CoreOwnershipWithSignatures} doc
 * @param {import('@mapeo/schema').VersionIdObject} version
 * @returns {import('@mapeo/schema').CoreOwnership}
 */
export function mapAndValidateCoreOwnership(doc, { coreDiscoveryKey }) {
  if (
    !coreDiscoveryKey.equals(discoveryKey(Buffer.from(doc.authCoreId, 'hex')))
  ) {
    throw new Error('Invalid coreOwnership record: mismatched authCoreId')
  }
  if (!verifyCoreOwnership(doc)) {
    throw new Error('Invalid coreOwnership record: signatures are invalid')
  }
  // eslint-disable-next-line no-unused-vars
  const { identitySignature, coreSignatures, ...docWithoutSignatures } = doc
  docWithoutSignatures.links = []
  return docWithoutSignatures
}

/**
 * Verify the signatures of a coreOwnership record, which verify that the device
 * with the identityKey matching the docIds does own (e.g. can write to) cores
 * with the given core IDs
 *
 * @param {CoreOwnershipWithSignatures} doc
 * @returns {boolean}
 */
function verifyCoreOwnership(doc) {
  const { coreSignatures, identitySignature } = doc
  for (const namespace of NAMESPACES) {
    const signature = coreSignatures[namespace]
    const coreKey = Buffer.from(doc[`${namespace}CoreId`], 'hex')
    assert.equal(
      signature.length,
      sodium.crypto_sign_BYTES,
      'Invalid core ownership signature'
    )
    assert.equal(
      coreKey.length,
      sodium.crypto_sign_PUBLICKEYBYTES,
      'Invalid core ownership coreId'
    )
    const isValidSignature = verifySignature(coreKey, signature, coreKey)
    if (!isValidSignature) return false
  }
  const identityPublicKey = Buffer.from(doc.docId, 'hex')
  assert.equal(identitySignature.length, sodium.crypto_sign_BYTES)
  assert.equal(identityPublicKey.length, sodium.crypto_sign_PUBLICKEYBYTES)
  const isValidIdentitySignature = verifySignature(
    identityPublicKey,
    identitySignature,
    identityPublicKey
  )
  if (!isValidIdentitySignature) return false
  return true
}

/**
 * For coreOwnership records, we only trust the first record written to the core.
 *
 * @type {NonNullable<ConstructorParameters<typeof import('./index-writer/index.js').IndexWriter>[0]['getWinner']>}
 */
export function getWinner(docA, docB) {
  if (
    'schemaName' in docA &&
    docA.schemaName === 'coreOwnership' &&
    'schemaName' in docB &&
    docB.schemaName === 'coreOwnership'
  ) {
    // Assumes docA and docB have same coreKey, so we choose the first one
    // written to the core
    const docAindex = parseVersionId(docA.versionId).index
    const docBindex = parseVersionId(docB.versionId).index
    if (docAindex < docBindex) return docA
    return docB
  } else {
    return defaultGetWinner(docA, docB)
  }
}
