export class Mapeo {
  #corestore
  #sqlite

  /**
   *
   * @param {Object} options
   * @param {Corestore} options.corestore
   * @param {import('./lib/sqlite').Sqlite} options.sqlite
   */
  constructor(options) {
    const { corestore, sqlite } = options
    this.#corestore = corestore
    this.#sqlite = sqlite
  }

  async ready() {}

  get coreKeys() {
    return [...this.#corestore.cores.keys()]
  }

  get cores() {
    return [...this.#corestore.cores.values()]
  }

  async sync() {}

  async syncAuthStore() {}

  async syncDataStores() {}
}
