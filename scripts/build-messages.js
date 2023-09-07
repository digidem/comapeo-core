#!/usr/bin/env node

import { execSync } from 'child_process'
import { rimraf } from 'rimraf'
import path from 'path'
import cpy from 'cpy'
import { Project } from 'ts-morph'

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

await fixTsProtoOutput(outPath)

// ts-proto exports the proto message declaration for both the transformer and the interface
// which causes problems for TS when it comes to resolving type imports.
// This fixes the output by:
// 1. Renaming the exported interfaces so that they're prefixed with `I`
// 2. Updating generated TS source files to re-import relevant transformers (since it gets lost in the renaming step)
// https://github.com/digidem/mapeo-core-next/pull/223#issuecomment-1709125859
async function fixTsProtoOutput(directoryPath) {
  // Keep track of all of the original interface declarations emitted by ts-proto
  // Used later to update import statements after renaming step
  const originalInterfaceNames = []

  const project = new Project()

  const sourceFiles = project.addSourceFilesAtPaths([
    `${directoryPath}/**/*.ts`,
  ])

  for (const file of sourceFiles) {
    const interfaces = file.getInterfaces()

    // (1) Renaming interfaces
    for (const i of interfaces) {
      const originalName = i.getName()
      originalInterfaceNames.push(originalName)
      i.rename(`I${originalName}`)
    }

    // (2) Fixing files affected by renaming (https://ts-morph.com/manipulation/renaming)
    const importDeclarations = file.getImportDeclarations()

    // Declaration files don't need to be fixed, only source TS files
    if (file.getExtension() !== '.ts') continue

    for (const declaration of importDeclarations) {
      // The import declaration is not importing from the local directory, so nothing to fix
      const moduleSpecifierValue = declaration.getModuleSpecifierValue()
      if (!moduleSpecifierValue.startsWith('./')) continue

      // No named imports, so nothing to fix
      const namedImportSpecifiers = declaration.getNamedImports()
      if (namedImportSpecifiers.length === 0) continue

      for (const specifier of namedImportSpecifiers) {
        const text = specifier.getText()

        const originalInterfaceName = originalInterfaceNames.find(
          (name) => `I${name}` === text
        )

        if (originalInterfaceName) {
          declaration.addNamedImport({ name: originalInterfaceName })
        }
      }
    }
  }

  return project.save()
}
