#!/usr/bin/env node

import { execSync } from 'child_process'
import fs from 'fs'
import rimraf from 'rimraf'
import path from 'path'

const protoURL = new URL('../proto', import.meta.url)
const projectRootURL = new URL('..', import.meta.url)
const buildPath = path.join(protoURL.pathname, './build')

rimraf.sync(buildPath)

const destinations = {
  extensions: path.join(projectRootURL.pathname, './src/core-manager'),
  rpc: path.join(projectRootURL.pathname, './src/rpc'),
}

const command1 = 'buf generate .'
console.log(command1)
execSync(command1, { cwd: protoURL, stdio: 'inherit' })
const command2 = `tsc --module es2020  --declaration --allowSyntheticDefaultImports --moduleResolution node ${buildPath}/*`
console.log(command2)
execSync(command2, { cwd: projectRootURL, stdio: 'inherit' })

for (const [source, dest] of Object.entries(destinations)) {
  const sourcePath = path.join(buildPath, source)
  const destPath = path.join(dest, 'messages')
  console.log(
    `copy ./${path.relative(
      projectRootURL.pathname,
      sourcePath
    )}{.js,.d.ts} to ./${path.relative(
      projectRootURL.pathname,
      destPath
    )}{.js,.d.ts}`
  )
  for (const ext of ['.js', '.d.ts']) {
    fs.copyFileSync(sourcePath + ext, destPath + ext)
  }
}
