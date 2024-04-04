import fs from 'node:fs'
import path from 'node:path'
const filename = 'mapeo-default-config'
const extension = 'mapeoconfig'
const modPath = 'node_modules/@mapeo/default-config'
const version = JSON.parse(
  fs.readFileSync(path.resolve(`${modPath}/package.json`))
).version
const configPath = `${modPath}/dist/${filename}-v${version}.${extension}`

fs.copyFileSync(
  path.resolve(configPath),
  path.resolve(`tests/fixtures/config/${filename}.${extension}`)
)
