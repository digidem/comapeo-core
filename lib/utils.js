import b4a from 'b4a'

export function getBlockPrefix(block) {
  return b4a.toString(block, 'utf8', 0, 1)
}

export function idToKey(id) {
  if (b4a.isBuffer(id)) {
    return id
  }

  return b4a.from(id, 'hex')
}

export function keyToId(key) {
  if (typeof key === 'string') {
    return key
  }

  return key.toString('hex')
}
