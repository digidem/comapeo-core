import * as path from 'node:path'
import assert from 'node:assert/strict'
import type {
  ArrowFunctionExpression,
  BlockStatement,
  CallExpression,
  Collection,
  Expression,
  ExpressionStatement,
  FunctionExpression,
  Identifier,
  JSCodeshift,
  MemberExpression,
  Pattern,
  Statement,
  Transform,
} from 'jscodeshift'

const TEST_HELPER_ASSERTIONS_JS_PATH = path.join(
  __dirname,
  'tests',
  'helpers',
  'assertions.js'
)

const isFunctionExpression = (
  value: undefined | Expression
): value is FunctionExpression | ArrowFunctionExpression =>
  Boolean(
    value &&
      (value.type === 'FunctionExpression' ||
        value.type === 'ArrowFunctionExpression')
  )

const isBlockStatement = (
  value: Expression | BlockStatement
): value is BlockStatement => value.type === 'BlockStatement'

const isIdentifier = (value: Expression | Pattern): value is Identifier =>
  value.type === 'Identifier'

const isExpressionStatement = (
  value: Statement
): value is ExpressionStatement => value.type === 'ExpressionStatement'

const isCallExpression = (value: Expression): value is CallExpression =>
  value.type === 'CallExpression'

const isMemberExpression = (value: Expression): value is MemberExpression =>
  value.type === 'MemberExpression'

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
 * Ensure all synchronous tests end with `t.end()`.
 */
const addEnd = (j: JSCodeshift, root: Collection<any>) => {
  ;[
    root.find(j.CallExpression, { callee: { name: 'test' } }),
    root.find(j.CallExpression, {
      callee: { type: 'MemberExpression', property: { name: 'test' } },
    }),
  ].forEach((collection) => {
    collection.forEach((callExpression) => {
      const args = callExpression.value.arguments
      const cb = args[args.length - 1]
      if (!isFunctionExpression(cb)) return
      if (cb.async) return
      if (!isBlockStatement(cb.body)) {
        throw new Error('test fn body is unexpected')
      }

      const t = cb.params[0]
      if (!isIdentifier(t)) {
        throw new Error('first arg to test fn is unexpected')
      }

      const hasPlanOrEnd = cb.body.body.some(
        (statement) =>
          isExpressionStatement(statement) &&
          isCallExpression(statement.expression) &&
          isMemberExpression(statement.expression.callee) &&
          isIdentifier(statement.expression.callee.object) &&
          statement.expression.callee.object.name === t.name &&
          isIdentifier(statement.expression.callee.property) &&
          ['plan', 'end'].includes(statement.expression.callee.property.name)
      )
      if (hasPlanOrEnd) return

      cb.body.body.push(
        j.expressionStatement(
          j.callExpression(j.memberExpression(t, j.identifier('end')), [])
        )
      )
    })
  })
}

/**
 * Rewrite member expressions like `obj.prop`.
 *
 * Given `rewriteMemberExpressions(j, root, "foo", "bar")`, produces a diff like:
 *
 * ```diff
 * -one.foo
 * -two.foo(1, 2, 3)
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
      assert(isMemberExpression(memberExpression.value.object))
      memberExpression.value.object = memberExpression.value.object.object
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
      assert(isMemberExpression(callExpression.value.callee))
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

  addEnd(j, root)

  rewriteMemberExpressions(j, root, 'alike', 'deepEqual')
  rewriteMemberExpressions(j, root, 'unlike', 'notDeepEqual')
  rewriteMemberExpressions(j, root, 'absent', 'notOk')
  rewriteMemberExpressions(j, root, 'execution', 'doesNotThrow')
  rewriteExceptions(fileInfo.path, j, root)

  return root.toSource()
}

export default transform
