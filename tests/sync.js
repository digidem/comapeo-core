import test from 'brittle'
import { randomBytes } from 'crypto'
import { Sqlite } from '../lib/sqlite.js'
import { CoreIdCache } from '../sync/CoreIdCache.js'

const nRecords = 10
const sqlite = new Sqlite()
const coreIdCache = new CoreIdCache(sqlite)
const identityId = randomBytes(32).toString('hex')
const namespace = 'auth'
const coreIds = new Array(nRecords).fill(null).map(_ => randomBytes(32).toString('hex'))

coreIds.forEach(coreId => coreIdCache.put({namespace, coreId, identityId}))

test(`CoreIdCache - put ${nRecords} cores and test if they are cached`, t => {
  const cache = coreIdCache.getByStoreNamespace(namespace)
  t.plan(nRecords)
  cache[0].coreIds.forEach(coreId => {
    if(coreIds.find(id => coreId === id)){
      t.pass()
    }else{
      t.fail()
    }
  })
})


// test.skip('sync - todo', async (t) => {
//   t.pass('TODO')
// })
