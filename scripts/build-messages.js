#!/usr/bin/env node

import { execSync } from 'child_process'
import { rimraf } from 'rimraf'
import path from 'path'
import cpy from 'cpy'

const protoURL = new URL('../proto', import.meta.url)
const projectRootURL = new URL('..', import.meta.url)
const buildPath = path.join(protoURL.pathname, './build')
const outPath = path.join(projectRootURL.pathname, 'src/generated')

await rimraf(buildPath)
await rimraf(path.join(outPath, '*.{js,ts}'), { glob: true })

const command1 = 'npx buf generate .'
console.log(command1)
execSync(command1, { cwd: protoURL, stdio: 'inherit' })
const command2 = `tsc --module es2020  --declaration --allowSyntheticDefaultImports --moduleResolution node ${buildPath}/*`
console.log(command2)
execSync(command2, { cwd: projectRootURL, stdio: 'inherit' })

await cpy(path.join(buildPath, '**'), outPath)
