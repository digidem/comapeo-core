/*
* @module CoreIdCache
*/
export class CoreIdCache {
  #sqlite
  #tableName = 'coreIdCache'
  #types = `'auth', 'data', 'blob'`
  /**
    * Create a CoreIdCache instance. This class handles a table to track cores belonging to different namespaces/stores (Authstore, Datastore, Blobstore)
    * @param {import('../lib/sqlite.js').Sqlite} sqlite an instance of better-sqlite3
  */
  constructor(sqlite){
    this.#sqlite = sqlite
    this.#sqlite.run(`
    CREATE TABLE IF NOT EXISTS ${this.#tableName}
                  (
                    coreId TEXT PRIMARY KEY NOT NULL,
                    storeType TEXT CHECK(storeType IN(${this.#types})) NOT NULL, 
                    identityId TEXT NOT NULL
                  )
                  WITHOUT ROWID`
    )
  }

  /**
  * @param {StoreType} type
  * @returns {CoreIdRecord[]}
  */
  getByStoreType(type){
    return this.#sqlite.query(
      `select * from ${this.#tableName} where storeType = '${type}'`
    )
  }

  /**
  * @param {string} id 
  * @returns {CoreIdRecord[]}
  */
  getByIdentityId(id){
    return this.#sqlite.query(
      `select * from ${this.#tableName} where identityId = '${id}'`
    )
  }

  /**
  * @param {CoreIdRecord} obj
  */
  put({storeType,coreId,identityId}){
    const str = `'${storeType}','${coreId}','${identityId}'`
    return this.#sqlite.run(`
    INSERT INTO ${this.#tableName} (storeType, coreId, identityId)
    VALUES(${str})
    `)
  }
}
