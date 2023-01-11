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
                    namespace TEXT CHECK(namespace IN(${this.#types})) NOT NULL, 
                    identityId TEXT NOT NULL
                  )
                  WITHOUT ROWID`
    )
  }
  /**
  * @param {String} type
  * @param {String} value
  */
  #getBy(type,value){
    return this.#sqlite.query(
      `SELECT
        json_group_array(coreId) as coreIds,
        identityId,
        namespace 
      FROM ${this.#tableName}
      WHERE ${type} = '${value}'
      GROUP BY identityId, namespace;`
    ).map(doc => ({...doc,coreIds:JSON.parse(doc.coreIds)}))
  }

  /**
  * @param {StoreNamespace} namespace
  * @returns {CoreIdRecordAggregate[]}
  */
  getByStoreNamespace(namespace){
    return this.#getBy('namespace', namespace)
  }

  /**
  * @param {string} identityId
  * @returns {CoreIdRecordAggregate[]}
  */
  getByIdentityId(identityId){
    return this.#getBy('identityId', identityId)
  }

  /**
  * @param {CoreIdRecord} obj
  */
  put({namespace,coreId,identityId}){
    return this.#sqlite.run(`
    INSERT INTO ${this.#tableName} (namespace, coreId, identityId)
    VALUES('${namespace}','${coreId}','${identityId}')
    `)
  }
}
