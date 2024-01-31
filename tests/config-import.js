import { test } from 'brittle'
import { readConfig } from '../src/config-import.js'

test('reading config file', async (t) => {
  t.plan(6)
  t.exception(async () => await readConfig(''), /ENOENT/, 'file not found')
  t.exception(
    async () => await readConfig('./tests/fixtures/config/notAZip.txt'),
    /End of Central Directory Record not found/,
    'not a zip file'
  )

  t.exception(
    async () => await readConfig('./tests/fixtures/config/toBigOfAZip.zip'),
    /Error: Zip file contains too many entries. Max is 10000/,
    'number of files in zip is above MAX_ENTRIES'
  )

  t.exception(
    async () =>
      await readConfig('./tests/fixtures/config/configWithoutPresets.zip'),
    /Error: Zip file does not contain presets.json/,
    'missing presets.json'
  )

  t.exception(
    async () =>
      await readConfig('./tests/fixtures/config/invalidPresetsFile.zip'),
    /Error: Invalid presets.json file/,
    'presets.json is not an object'
  )

  t.ok(await readConfig('./tests/fixtures/config/config.zip'), 'valid zip')
})
