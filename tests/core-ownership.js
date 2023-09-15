// @ts-check
import test from 'brittle'
import { KeyManager, sign } from '@mapeo/crypto'
import sodium from 'sodium-universal'
import {
  mapAndValidateCoreOwnership,
  getWinner,
} from '../src/core-ownership.js'
import { randomBytes } from 'node:crypto'
import { parseVersionId, getVersionId } from '@mapeo/schema'
import { discoveryKey } from 'hypercore-crypto'

test('Valid coreOwnership record', (t) => {
  const validDoc = generateValidDoc()
  const version = parseVersionId(validDoc.versionId)

  const mappedDoc = mapAndValidateCoreOwnership(validDoc, version)

  t.ok(validDoc.links.length > 0, 'original doc has links')
  t.alike(mappedDoc.links, [], 'links are stripped from mapped doc')
  t.absent(
    'coreSignatures' in mappedDoc,
    'coreSignatures are stripped from mapped doc'
  )
  t.absent(
    'identitySignature' in mappedDoc,
    'identitySignature is stripped from mapped doc'
  )
})

test('Invalid coreOwnership signatures', (t) => {
  const validDoc = generateValidDoc()
  const version = parseVersionId(validDoc.versionId)

  for (const key of Object.keys(validDoc.coreSignatures)) {
    const invalidDoc = {
      ...validDoc,
      coreSignatures: {
        ...validDoc.coreSignatures,
        [key]: randomBytes(sodium.crypto_sign_BYTES),
      },
    }
    t.exception(() => mapAndValidateCoreOwnership(invalidDoc, version))
  }

  const invalidDoc = {
    ...validDoc,
    identitySignature: randomBytes(sodium.crypto_sign_BYTES),
  }
  t.exception(() => mapAndValidateCoreOwnership(invalidDoc, version))
})

test('Invalid coreOwnership docId and coreIds', (t) => {
  const validDoc = generateValidDoc()
  const version = parseVersionId(validDoc.versionId)

  for (const key of Object.keys(validDoc.coreSignatures)) {
    const invalidDoc = {
      ...validDoc,
      [`${key}CoreId`]: randomBytes(32).toString('hex'),
    }
    t.exception(() => mapAndValidateCoreOwnership(invalidDoc, version))
  }

  const invalidDoc = {
    ...validDoc,
    docId: randomBytes(32).toString('hex'),
  }
  t.exception(() => mapAndValidateCoreOwnership(invalidDoc, version))
})

test('Invalid coreOwnership docId and coreIds (wrong length)', (t) => {
  const validDoc = generateValidDoc()
  const version = parseVersionId(validDoc.versionId)

  for (const key of Object.keys(validDoc.coreSignatures)) {
    const invalidDoc = {
      ...validDoc,
      [`${key}CoreId`]: validDoc[`${key}CoreId`].slice(0, -1),
    }
    t.exception(() => mapAndValidateCoreOwnership(invalidDoc, version))
  }

  const invalidDoc = {
    ...validDoc,
    docId: validDoc.docId.slice(0, -1),
  }
  t.exception(() => mapAndValidateCoreOwnership(invalidDoc, version))
})

test('Invalid - different coreKey', (t) => {
  const validDoc = generateValidDoc()
  const version = {
    ...parseVersionId(validDoc.versionId),
    coreDiscoveryKey: randomBytes(32),
  }
  t.exception(() => mapAndValidateCoreOwnership(validDoc, version))
})

test('getWinner (coreOwnership)', (t) => {
  const validDoc = generateValidDoc()
  const version = parseVersionId(validDoc.versionId)

  const docA = {
    ...validDoc,
    versionId: getVersionId({ ...version, index: 5 }),
  }
  const docB = {
    ...validDoc,
    versionId: getVersionId({ ...version, index: 6 }),
  }

  t.is(getWinner(docA, docB), docA, 'Doc with lowest index picked as winner')
  t.is(getWinner(docB, docA), docA, 'Doc with lowest index picked as winner')
})

test('getWinner (default)', (t) => {
  const docA = {
    docId: 'A',
    schemaName: 'other',
    versionId: 'abcd',
    links: [],
    updatedAt: new Date(1999, 0, 1).toISOString(),
  }
  const docB = {
    docId: 'A',
    schemaName: 'other',
    versionId: '1234',
    links: ['1'],
    updatedAt: new Date(1999, 0, 2).toISOString(),
  }
  t.is(getWinner(docA, docB), docB, 'Doc with last updatedAt picked as winner')
  t.is(getWinner(docB, docA), docB, 'Doc with last updatedAt picked as winner')

  docA.updatedAt = docB.updatedAt

  t.is(getWinner(docA, docB), docA, 'Deterministic winner if same updatedAt')
  t.is(getWinner(docB, docA), docA, 'Deterministic winner if same updatedAt')
})

function generateValidDoc() {
  const km = new KeyManager(randomBytes(16))
  const projectKey = randomBytes(32)

  const coreKeypairs = {
    auth: km.getHypercoreKeypair('auth', projectKey),
    config: km.getHypercoreKeypair('config', projectKey),
    data: km.getHypercoreKeypair('data', projectKey),
    blobIndex: km.getHypercoreKeypair('blobIndex', projectKey),
    blob: km.getHypercoreKeypair('blob', projectKey),
  }

  /** @type {ReturnType<typeof import('@mapeo/schema').decode>} */
  const validDoc = {
    docId: km.getIdentityKeypair().publicKey.toString('hex'),
    versionId: getVersionId({
      coreDiscoveryKey: discoveryKey(coreKeypairs.auth.publicKey),
      index: 1,
    }),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    links: ['5678/0'],
    schemaName: 'coreOwnership',
    authCoreId: coreKeypairs.auth.publicKey.toString('hex'),
    configCoreId: coreKeypairs.config.publicKey.toString('hex'),
    dataCoreId: coreKeypairs.data.publicKey.toString('hex'),
    blobIndexCoreId: coreKeypairs.blobIndex.publicKey.toString('hex'),
    blobCoreId: coreKeypairs.blob.publicKey.toString('hex'),
    coreSignatures: {
      auth: sign(coreKeypairs.auth.publicKey, coreKeypairs.auth.secretKey),
      config: sign(
        coreKeypairs.config.publicKey,
        coreKeypairs.config.secretKey
      ),
      data: sign(coreKeypairs.data.publicKey, coreKeypairs.data.secretKey),
      blob: sign(coreKeypairs.blob.publicKey, coreKeypairs.blob.secretKey),
      blobIndex: sign(
        coreKeypairs.blobIndex.publicKey,
        coreKeypairs.blobIndex.secretKey
      ),
    },
    identitySignature: sign(
      km.getIdentityKeypair().publicKey,
      km.getIdentityKeypair().secretKey
    ),
  }
  return validDoc
}
