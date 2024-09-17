import { verifySignature, sign } from '@mapeo/crypto'
import { parseVersionId } from '@comapeo/schema'
import { defaultGetWinner } from '@mapeo/sqlite-indexer'
import assert from 'node:assert/strict'
import sodium from 'sodium-universal'
import {
  kTable,
  kSelect,
  kCreateWithDocId,
  kDataStore,
} from './datatype/index.js'
import { eq, or } from 'drizzle-orm'
import mapObject from 'map-obj'
import { discoveryKey } from 'hypercore-crypto'
import pDefer from 'p-defer'
import { NAMESPACES } from './constants.js'
import { TypedEmitter } from 'tiny-typed-emitter'
/**
 * @import {
 *   CoreOwnershipWithSignatures,
 *   CoreOwnershipWithSignaturesValue,
 *   KeyPair,
 *   Namespace
 * } from './types.js'
 */

/**
 * @typedef {object} CoreOwnershipEvents
 * @property {(docIds: Set<string>) => void} update Emitted when new coreOwnership records are indexed
 */

/**
 * @extends {TypedEmitter<CoreOwnershipEvents>}
 */
export class CoreOwnership extends TypedEmitter {
  #dataType
  #ownershipWriteDone
  /**
   *
   * @param {object} opts
   * @param {import('./datatype/index.js').DataType<
   *   import('./datastore/index.js').DataStore<'auth'>,
   *   typeof import('./schema/project.js').coreOwnershipTable,
   *   'coreOwnership',
   *   import('@comapeo/schema').CoreOwnership,
   *   import('@comapeo/schema').CoreOwnershipValue
   * >} opts.dataType
   * @param {Record<Namespace, KeyPair>} opts.coreKeypairs
   * @param {KeyPair} opts.identityKeypair
   */
  constructor({ dataType, coreKeypairs, identityKeypair }) {
    super()
    this.#dataType = dataType
    const authWriterCore = dataType[kDataStore].writerCore
    const deferred = pDefer()
    this.#ownershipWriteDone = deferred.promise

    const writeOwnership = () => {
      if (authWriterCore.length > 0) {
        deferred.resolve()
        return
      }
      this.#writeOwnership(identityKeypair, coreKeypairs)
        .then(deferred.resolve)
        .catch(deferred.reject)
    }
    // @ts-ignore - opened missing from types
    if (authWriterCore.opened) {
      writeOwnership()
    } else {
      authWriterCore.once('ready', writeOwnership)
    }

    dataType[kDataStore].on('coreOwnership', this.emit.bind(this, 'update'))
  }

  /**
   * @param {string} coreId
   * @returns {Promise<string>} deviceId of device that owns the core
   */
  async getOwner(coreId) {
    await this.#ownershipWriteDone
    const table = this.#dataType[kTable]
    const expressions = []
    for (const namespace of NAMESPACES) {
      expressions.push(eq(table[`${namespace}CoreId`], coreId))
    }
    // prettier-ignore
    const result = (await this.#dataType[kSelect]())
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
   * @param {Namespace} namespace
   * @returns {Promise<string>} coreId of core belonging to `deviceId` for `namespace`
   */
  async getCoreId(deviceId, namespace) {
    const result = await this.get(deviceId)
    return result[`${namespace}CoreId`]
  }

  /**
   * Get capabilities for a given deviceId
   *
   * @param {string} deviceId
   */
  async get(deviceId) {
    await this.#ownershipWriteDone
    return this.#dataType.getByDocId(deviceId)
  }

  async getAll() {
    await this.#ownershipWriteDone
    return this.#dataType.getMany()
  }

  /**
   *
   * @param {KeyPair} identityKeypair
   * @param {Record<Namespace, KeyPair>} coreKeypairs
   */
  async #writeOwnership(identityKeypair, coreKeypairs) {
    /** @type {CoreOwnershipWithSignaturesValue} */
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
 * @param {import('@comapeo/schema').VersionIdObject} version
 * @returns {import('@comapeo/schema').CoreOwnership}
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
