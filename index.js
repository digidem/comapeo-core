export class Mapeo {
  #corestore
  #sqlite

  /**
   *
   * @param {Object} options
   * @param {import('corestore')} options.corestore
   * @param {import('./lib/sqlite').Sqlite} options.sqlite
   */
  constructor(options) {
    const { corestore, sqlite } = options
    this.#corestore = corestore
    this.#sqlite = sqlite
  }

  async ready() {}

  get keys() {
    return this.cores.map((core) => {
      return core.key.toString('hex')
    })
  }

  get cores() {
    return [...this.#corestore.cores.values()]
  }

  async sync() {}

  async syncAuthStore() {}

  async syncDataStores() {}
}
