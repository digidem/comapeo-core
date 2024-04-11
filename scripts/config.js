import fs from 'node:fs'
const filename = 'mapeo-default-config'
const extension = 'mapeoconfig'
const modPath = '../node_modules/@mapeo/default-config'
const configPkgJSONPath = new URL(`${modPath}/package.json`, import.meta.url)
const version = JSON.parse(fs.readFileSync(configPkgJSONPath)).version

const configPath = new URL(
  `${modPath}/dist/${filename}-v${version}.${extension}`,
  import.meta.url
)
const fixturesPath = new URL(
  `../tests/fixtures/config/${filename}.${extension}`,
  import.meta.url
)

fs.copyFileSync(configPath, fixturesPath)
