import { test } from 'brittle'
import { readConfig } from '../src/config-import.js'

test('config import - loading', async (t) => {
  await t.exception(
    async () => await readConfig(''),
    /ENOENT/,
    'file not found'
  )

  await t.exception(
    async () => await readConfig('./tests/fixtures/config/notAZip.txt'),
    /End of Central Directory Record not found/,
    'not a zip file'
  )

  await t.exception(
    async () => await readConfig('./tests/fixtures/config/tooBigOfAZip.zip'),
    /Error: Zip file contains too many entries. Max is 10000/,
    'number of files in zip is above MAX_ENTRIES'
  )

  await t.exception(
    async () =>
      await readConfig('./tests/fixtures/config/configWithoutPresets.zip'),
    /Error: Zip file does not contain presets.json/,
    'missing presets.json'
  )

  await t.exception.all(
    async () =>
      await readConfig('./tests/fixtures/config/invalidPresetsJSON.zip'),
    /SyntaxError: Unexpected string in JSON/,
    'JSON.parse error of presets.json'
  )

  await t.exception(
    async () =>
      await readConfig('./tests/fixtures/config/invalidPresetsFile.zip'),
    /Error: Invalid presets.json file/,
    'presets.json is not an object'
  )

  await t.exception(
    async () =>
      await readConfig('./tests/fixtures/config/missingPresetsField.zip'),
    /Error: Invalid presets.json file/,
    'no presets field in presets.json'
  )

  await t.exception(
    async () =>
      await readConfig('./tests/fixtures/config/presetsFieldNotAnObject.zip'),
    /Error: Invalid presets.json file/,
    'presets field in presets.json is not an object'
  )

  await t.exception(
    async () =>
      await readConfig('./tests/fixtures/config/missingFieldsField.zip'),
    /Error: Invalid presets.json file/,
    'no fields field in presets.json'
  )

  await t.exception(
    async () =>
      await readConfig('./tests/fixtures/config/fieldsFieldNotAnObject.zip'),
    /Error: Invalid presets.json file/,
    'fields field in presets.json is not an object'
  )

  t.ok(await readConfig('./tests/fixtures/config/validConfig.zip'), 'valid zip')
})

test('config import - icons', async (t) => {
  // filename
  let config = await readConfig(
    './tests/fixtures/config/invalidIconFilename.zip'
  )
  /* eslint-disable-next-line */
  for await (const icon of config.icons()) {
  }
  t.is(
    config.warnings.length,
    1,
    'we got one error when reading icon with wrong filename'
  )
  t.not(
    config.warnings[0].message.match(/Unexpected icon filename/),
    null,
    'the error message is about badly formed icon name'
  )

  // pixel density
  config = await readConfig(
    './tests/fixtures/config/invalidIconPixelDensity.zip'
  )

  /* eslint-disable-next-line */
  for await (const icon of config.icons()) {
  }

  t.is(
    config.warnings.length,
    1,
    'we got one error when reading icon with wrong pixel density'
  )
  t.not(
    config.warnings[0].message.match(/invalid pixel density/),
    null,
    'the error message is about invalid pixel density'
  )

  // size
  config = await readConfig('./tests/fixtures/config/invalidIconSize.zip')

  /* eslint-disable-next-line */
  for await (const icon of config.icons()) {
  }

  t.is(
    config.warnings.length,
    1,
    'we got one error when reading icon with wrong size'
  )
  t.not(
    config.warnings[0].message.match(/invalid size/),
    null,
    'the error message is about invalid size'
  )

  config = await readConfig('./tests/fixtures/config/validIcons.zip')
  for await (const icon of config.icons()) {
    t.is(icon.name, 'plant', 'icon name is `plant`')
    t.is(
      icon.variants.length,
      9,
      '9 variants of icons (dot product of density and size)'
    )
    for (let variant of icon.variants) {
      t.is(variant.mimeType, 'image/png', 'variant is a png')
    }
  }

  t.is(config.warnings.length, 0, 'no warnings on the file')
})

test('config import - fields', async (t) => {
  let config = await readConfig('./tests/fixtures/config/invalidField.zip')

  /* eslint-disable-next-line */
  for (const field of config.fields()) {
  }
  t.is(config.warnings.length, 3, 'we got 3 errors when reading fields')
  t.not(
    config.warnings[0].message.match(/Invalid field noKeyField/),
    null,
    'the first error is because the field has no "key" field'
  )
  t.not(
    config.warnings[1].message.match(/Invalid field nullField/),
    null,
    'the second error is because the field is null'
  )
  t.not(
    config.warnings[2].message.match(/Invalid field noObjectField/),
    null,
    'the third error is because the field is not an object'
  )

  config = await readConfig('./tests/fixtures/config/validField.zip')
  for (let field of config.fields()) {
    t.is(field.name, 'nombre-monitor', `field.name is 'nombre-monitor'`)
    t.is(
      field.value.tagKey,
      'nombre-monitor',
      `tagKey of field is 'nombre-monitor'`
    )
    t.is(field.value.schemaName, 'field', `schemaName is 'field'`)
  }
  t.is(config.warnings.length, 0, 'no warnings on the file')
})

test('config import - presets', async (t) => {
  let config = await readConfig('./tests/fixtures/config/invalidPreset.zip')

  /* eslint-disable-next-line */
  for (const preset of config.presets()) {
  }
  t.is(config.warnings.length, 2, 'we got two errors when reading presets')
  t.not(
    config.warnings[0].message.match(/invalid preset noObjectPreset/),
    null,
    'the first error is because the preset is not an object'
  )
  t.not(
    config.warnings[1].message.match(/invalid preset nullPreset/),
    null,
    'the second error is because the preset is null'
  )

  config = await readConfig('./tests/fixtures/config/validPreset.zip')
  for (const preset of config.presets()) {
    t.is(preset.value.schemaName, 'preset', `schemaName is 'preset'`)
    t.ok(
      preset.value.name === 'Planta' || 'Punto de Entrada',
      `the preset name is what is expected`
    )
  }
  t.is(config.warnings.length, 0, `no warnings on the file`)
})

test('config import - load default config', async (t) => {
  t.ok(
    await readConfig('./config/defaultConfig.mapeosettings'),
    'valid config file'
  )

  let config = await readConfig('./config/defaultConfig.mapeosettings')
  let nFields = 0
  /* eslint-disable-next-line */
  for (const field of config.fields()) {
    nFields++
  }
  t.is(nFields, 2, 'correct number of fields in default config')
  let nIcons = 0
  /* eslint-disable-next-line */
  for await (const icon of config.icons()) {
    nIcons++
  }
  t.is(nIcons, 359, 'correct number of icons in default config')
  let nPresets = 0
  /* eslint-disable-next-line */
  for (const preset of config.presets()) {
    nPresets++
  }
  t.is(nPresets, 43, 'correct number of presets in default config')
  t.is(config.warnings.length, 0, 'no warnings on config file')
})
