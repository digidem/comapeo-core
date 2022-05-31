import { KeyManager } from '@mapeo/crypto'

/**
 * @param {string} name
 * @param {Buffer} [namespace] - 32 byte Buffer
 */
export function createCoreKeyPair (name, namespace = Buffer.alloc(32, 0)) {
	const { km } = createIdentityKeys()
	const coreKeyPair = km.getHypercoreKeypair(name, namespace)
	return coreKeyPair
}

export function createIdentityKeys () {
	const rootKey = KeyManager.generateIdentityKey()
	const km = new KeyManager(rootKey)
	const identityKeyPair = km.getIdentityKeypair()
	return { rootKey, identityKeyPair, km }
}
