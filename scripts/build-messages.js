#!/usr/bin/env node

import { execSync } from "child_process";
import rimraf from 'rimraf'

const protoURL = new URL('../proto', import.meta.url)
const projectRootURL = new URL('..', import.meta.url)
const messagesTSPath = new URL('../lib/core-manager/messages.ts', import.meta.url).pathname

const command1 = 'buf generate .'
console.log(command1)
execSync(command1, { cwd: protoURL, stdio: 'inherit' })
const command2 = 'tsc --module es2020  --declaration --allowSyntheticDefaultImports --moduleResolution node ' + messagesTSPath
console.log(command2)
execSync(command2, { cwd: projectRootURL, stdio: 'inherit' })
console.log('rimraf ' + messagesTSPath)
rimraf.sync(messagesTSPath)
