import fs from 'node:fs'
const filename = 'mapeo-default-config'
const extension = 'mapeoconfig'
const modPath = 'node_modules/@mapeo/default-config/'
const version = JSON.parse(fs.readFileSync(`${modPath}/package.json`)).version
const configPath = `${modPath}/dist/${filename}-v${version}.${extension}`

fs.copyFileSync(configPath, `dist/${filename}.${extension}`)
