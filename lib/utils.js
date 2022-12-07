import b4a from 'b4a'

/**
 * @param {Block} block
 * @returns {BlockPrefix}
 */
export function getBlockPrefix(block) {
  return b4a.toString(block, 'utf8', 0, 1)
}

/**
 * @param {String|Buffer} id
 * @returns {Buffer}
 */
export function idToKey(id) {
  if (b4a.isBuffer(id)) {
    return /** @type {Buffer} */ (id)
  }

  return b4a.from(/** @type {String} */ (id), 'hex')
}

/**
 *
 * @param {Buffer} key
 * @returns {String}
 */
export function keyToId(key) {
  if (typeof key === 'string') {
    return key
  }

  return key.toString('hex')
}
