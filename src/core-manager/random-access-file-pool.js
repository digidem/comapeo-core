/**
 * File descriptor pool for random-access-storage to limit the number of file
 * descriptors used. Important particularly for Android where the hard limit for
 * the app is 1024.
 */
export class RandomAccessFilePool {
  /** @param {number} maxSize max number of file descriptors to use */
  constructor(maxSize) {
    this.maxSize = maxSize
    /** @type {Set<import('random-access-file')>} */
    this.active = new Set()
  }

  /** @param {import('random-access-file')} file */
  _onactive(file) {
    if (this.active.size >= this.maxSize) {
      // suspend least recently inserted this manually iterates in insertion
      // order, but only iterates to the first one (least recently inserted)
      const toSuspend = this.active[Symbol.iterator]().next().value
      toSuspend.suspend()
      this.active.delete(toSuspend)
    }
    this.active.add(file)
  }

  /** @param {import('random-access-file')} file */
  _oninactive(file) {
    this.active.delete(file)
  }
}
