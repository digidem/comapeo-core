// @ts-check
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const defaultConfigModulePath = path.resolve(
  fileURLToPath(import.meta.url),
  '..',
  '..',
  '..',
  'node_modules',
  '@mapeo',
  'default-config'
)

const defaultConfigPkgJsonPath = path.join(
  defaultConfigModulePath,
  'package.json'
)
const { version } = JSON.parse(
  fs.readFileSync(defaultConfigPkgJsonPath, 'utf8')
)

export const defaultConfigPath = path.join(
  defaultConfigModulePath,
  'dist',
  `mapeo-default-config-v${version}.mapeoconfig`
)
