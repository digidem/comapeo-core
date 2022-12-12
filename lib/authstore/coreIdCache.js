import { Sqlite } from "./../sqlite.js"

export class CoreIdCache {
  #sqlite
  #tableName = 'coreIdCache'
  #types = `'auth', 'data', 'blob'`
  /**
    * Create a CoreIdCache instance. This class handles a table to track cores belonging to different namespaces/stores (Authstore, Datastore, Blobstore)
    * @param {Sqlite} sqlite
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
  * @param {string} type
  * @returns {StoreTypeTable[]}
  */
  getByStoreType(type){
    return this.#sqlite.query(
      `select * from ${this.#tableName} where storeType = '${type}'`
    )
  }

  /**
  * @param {string} id 
  * @returns {StoreTypeTable[]}
  */
  getByIdentityId(id){
    return this.#sqlite.query(
      `select * from ${this.#tableName} where identityId = '${id}'`
    )
  }

  /**
  * @param {Object} vals
  * @param {string} vals.type
  * @param {string} vals.coreId
  * @param {string} vals.identityId
  */
  put(vals){
    const str = `'${vals.type}','${vals.coreId}','${vals.identityId}'`
    return this.#sqlite.run(`
    INSERT INTO ${this.#tableName} (storeType, coreId, identityId)
    VALUES(${str})
    `)
  }
}
