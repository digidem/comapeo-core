import { temporaryDirectory } from 'tempy'
import { removeTempDir } from './temp-dir.js'
import Hypercore from 'hypercore'

/*** @param {import('node:test').TestContext} t
 * @param {any} [key]
 * */
export async function createCore(t, key) {
  const storage = temporaryDirectory()

  const core = new Hypercore(storage, key)
  t.after(async () => {
    await core.close()
    await removeTempDir(storage)
  })
  await core.ready()
  return core
}
