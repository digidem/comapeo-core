import { temporaryDirectory } from 'tempy'
import fsPromises from 'node:fs/promises'
import Hypercore from 'hypercore'

/**
 * @param {import('node:test').TestContext} t
 * @param {any} [key]
 * */
export async function createCore(t, key) {
  const storage = temporaryDirectory()

  t.after(async () =>
    fsPromises.rm(storage, {
      recursive: true,
    })
  )
  const core = new Hypercore(storage, key)
  await core.ready()
  return core
}
