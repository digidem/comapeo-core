import { discoveryKey } from 'hypercore-crypto'
import { omit } from '../lib/omit.js'
import { verifyCoreOwnership } from '../core-ownership.js'

/**
 * @typedef {ReturnType<typeof import('@comapeo/schema').decode>} MapeoDocInternal
 */

/**
 * @param {MapeoDocInternal} doc
 * @param {import('@comapeo/schema').VersionIdObject} version
 * @returns {import('@comapeo/schema').MapeoDoc}
 */
export function mapDoc(doc, version) {
  switch (doc.schemaName) {
    case 'coreOwnership': {
      if (
        !version.coreDiscoveryKey.equals(
          discoveryKey(Buffer.from(doc.authCoreId, 'hex'))
        )
      ) {
        throw new Error('Invalid coreOwnership record: mismatched authCoreId')
      }
      if (!verifyCoreOwnership(doc)) {
        throw new Error('Invalid coreOwnership record: signatures are invalid')
      }
      const docWithoutSignatures = omit(doc, [
        'identitySignature',
        'coreSignatures',
      ])
      docWithoutSignatures.links = []
      return docWithoutSignatures
    }
    case 'deviceInfo':
      // Validate that a deviceInfo record is written by the device that is it
      // about, e.g. version.coreKey should equal docId
      if (
        !version.coreDiscoveryKey.equals(
          discoveryKey(Buffer.from(doc.docId, 'hex'))
        )
      ) {
        throw new Error(
          'Invalid deviceInfo record, cannot write deviceInfo for another device'
        )
      }
      return doc
    default:
      return doc
  }
}
