import type { JSCodeshift, Transform, Collection } from 'jscodeshift'

const rewriteImports = (j: JSCodeshift, root: Collection<any>) => {
  root
    .find(j.ImportDeclaration, {
      type: 'ImportDeclaration',
      source: { value: 'brittle' },
    })
    .forEach((brittleImport) => {
      brittleImport.value.specifiers = [
        j.importDefaultSpecifier(j.identifier('test')),
      ]
      brittleImport.value.source = j.stringLiteral('tape')
    })
}

const transform: Transform = (fileInfo, api) => {
  const { j } = api
  const root = j(fileInfo.source)

  rewriteImports(j, root)

  return root.toSource()
}

export default transform
