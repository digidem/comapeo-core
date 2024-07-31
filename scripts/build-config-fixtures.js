import yazl from 'yazl'
import * as fs from 'node:fs/promises'
import { createWriteStream } from 'node:fs'

const CONFIG_FIXTURES_PATH = new URL(
  '../tests/fixtures/config',
  import.meta.url
).pathname
const dir = await fs.readdir(CONFIG_FIXTURES_PATH)
console.log('zipping config fixtures')
for (const fileOrFolder of dir) {
  const p = join(CONFIG_FIXTURES_PATH, fileOrFolder)
  const stat = await fs.stat(p)
  if (stat.isDirectory()) {
    zipFolder(p)
  }
}

/**
 * @param {String} path
 */
async function zipFolder(path) {
  const zip = new yazl.ZipFile()
  const zipPath = `${path}.zip`
  const wstream = createWriteStream(zipPath)
  zip.outputStream.pipe(wstream).on('close', function () {
    console.log(`done zipping ${zipPath.split('/').at(-1)}`)
  })
  const contents = await fs.readdir(path)
  for (const content of contents) {
    const filePath = `${path}/${content}`
    for await (const p of walk(filePath)) {
      const zipPath = p.replace(`${path}/`, '')
      zip.addFile(p, zipPath)
    }
  }
  zip.end()
}

/**
 * @param {string} path
 * @returns {AsyncGenerator<string>}
 */
 */
async function* walk(path) {
  const stat = await fs.stat(path)
  if (stat.isDirectory()) {
    const dir = await fs.readdir(path)
    for (const newPath of dir) {
      yield* walk(join(path, newPath))
    }
  } else {
    yield path
  }
}
