// @ts-check
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
export const defaultConfigPath = require.resolve('@mapeo/default-config')
