import * as path from 'node:path'
import assert from 'node:assert/strict'
import type {
  JSCodeshift,
  Transform,
  Collection,
  MemberExpression,
} from 'jscodeshift'

const TEST_HELPER_ASSERTIONS_JS_PATH = path.join(
  __dirname,
  'tests',
  'helpers',
  'assertions.js'
)

// TODO: Remove this?
// TODO: can we make this an arrow function?
// function assert(condition: boolean): asserts condition is true {
//   if (!condition) throw new Error('assertion error')
// }

/**
 * Convert all `brittle` imports to `tape` imports.
 */
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

/**
 * Rewrite member expressions like `obj.prop`.
 *
 * Given `rewriteMemberExpressions(j, root, "foo", "bar")`, produces a diff like:
 *
 * ```diff
 * -one.foo
 * -two.foo(1, 2, 3  root
    .find(j.MemberExpression, { property: { name: oldPropertyName } })
    .forEach((memberExpression) => {)
 * +one.bar
 * +two.bar(1, 2, 3)
 * ```
 */
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

/**
 * Rewrite `t.exception.all` to `t.exception`.
 */
const rewriteExceptionAll = (j: JSCodeshift, root: Collection<any>) => {
  root
    .find(j.MemberExpression, {
      object: {
        type: 'MemberExpression',
        property: { name: 'exception' },
      },
      property: { name: 'all' },
    })
    .forEach((memberExpression) => {
      assert.equal(memberExpression.value.object.type, 'MemberExpression')
      memberExpression.value.object = (
        memberExpression.value.object as MemberExpression
      ).object
      memberExpression.value.property = j.identifier('exception')
    })
}

const relativeImportPath = (source: string, importPath: string): string => {
  source = path.resolve(source)
  importPath = path.resolve(importPath)

  const relativePath = path.posix.relative(path.dirname(source), importPath)
  if (relativePath.startsWith('.')) return relativePath
  return './' + relativePath
}

/**
 * Rewrite `t.exception` and `t.exception.all` to `rejects()`.
 *
 * In a perfect world, we'd do a trivial rewrite to `t.throws` when possible.
 * In reality, this is tricky to detect *and* not done very often in our codebase,
 * so blindly rewrite everything. We can manually fix the small number of violations.
 */
const rewriteExceptions = (
  sourcePath: string,
  j: JSCodeshift,
  root: Collection<any>
) => {
  rewriteExceptionAll(j, root)

  let needsToImportRejects = false

  root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        property: { name: 'exception' },
      },
    })
    .forEach((callExpression) => {
      assert(callExpression.value.callee.type === 'MemberExpression')
      const callee = callExpression.value.callee as MemberExpression

      callExpression.value.callee = j.identifier('rejects')
      callExpression.value.arguments.unshift(callee.object)

      needsToImportRejects = true
    })

  if (needsToImportRejects) {
    root
      .find(j.ImportDeclaration, {
        type: 'ImportDeclaration',
        source: { value: 'tape' },
      })
      .insertAfter(
        j.importDeclaration(
          [j.importSpecifier(j.identifier('rejects'))],
          j.stringLiteral(
            relativeImportPath(sourcePath, TEST_HELPER_ASSERTIONS_JS_PATH)
          )
        )
      )
  }
}

const transform: Transform = (fileInfo, api) => {
  const { j } = api
  const root = j(fileInfo.source)

  rewriteImports(j, root)

  rewriteMemberExpressions(j, root, 'alike', 'deepEqual')
  rewriteMemberExpressions(j, root, 'unlike', 'notDeepEqual')
  rewriteMemberExpressions(j, root, 'absent', 'notOk')
  rewriteMemberExpressions(j, root, 'execution', 'doesNotThrow')

  rewriteExceptions(fileInfo.path, j, root)

  return root.toSource()
}

export default transform
