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

const rewriteMemberExpressions = (
  j: JSCodeshift,
  root: Collection<any>,
  oldPropertyName: string,
  newPropertyName: string
) => {
  root
    .find(j.MemberExpression, { property: { name: oldPropertyName } })
    .forEach((memberExpression) => {
      memberExpression.value.property = j.identifier(newPropertyName)
    })
}

const transform: Transform = (fileInfo, api) => {
  const { j } = api
  const root = j(fileInfo.source)

  rewriteImports(j, root)

  rewriteMemberExpressions(j, root, 'alike', 'deepEqual')
  rewriteMemberExpressions(j, root, 'unlike', 'notDeepEqual')
  rewriteMemberExpressions(j, root, 'absent', 'notOk')
  rewriteMemberExpressions(j, root, 'execution', 'doesNotThrow')

  return root.toSource()
}

export default transform
