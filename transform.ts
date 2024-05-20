import type { Transform, MemberExpression, CallExpression } from 'jscodeshift'
import assert from 'node:assert/strict'

const transform: Transform = (fileInfo, api) => {
  const { j } = api
  const root = j(fileInfo.source)

  // Utilities

  const assertThrowsOrRejectsCall = (
    brittleCall: CallExpression,
    method: 'throws' | 'rejects'
  ): CallExpression => {
    const args = [brittleCall.arguments[0]]

    const secondArg = brittleCall.arguments[1]
    switch (secondArg?.type) {
      case 'Literal':
        if (secondArg.value instanceof RegExp) {
          args.push(
            j.objectExpression([
              j.objectProperty(j.identifier('message'), secondArg),
            ])
          )
        } else {
          args.push(j.identifier('undefined'))
          args.push(secondArg)
        }
        break
      case 'Identifier':
        // Could be wrong.
        args.push(
          j.objectExpression([
            j.objectProperty(j.identifier('instanceOf'), secondArg),
          ])
        )
        break
      default:
        break
    }

    const thirdArg = brittleCall.arguments[2]
    if (thirdArg) args.push(thirdArg)

    return j.callExpression(
      j.memberExpression(j.identifier('assert'), j.identifier(method)),
      args
    )
  }

  // Replace the Brittle import with imports of `node:test` and `node:assert/strict`.
  //
  // Before:
  //
  //     import ... from 'brittle'
  //
  // After:
  //
  //     import test from 'node:test'
  //     import assert from 'node:assert/strict'

  root
    .find(j.ImportDeclaration, {
      source: { value: 'brittle' },
    })
    .replaceWith(
      j.importDeclaration(
        [j.importDefaultSpecifier(j.identifier('test'))],
        j.stringLiteral('node:test')
      )
    )
    .insertAfter(
      j.importDeclaration(
        [j.importDefaultSpecifier(j.identifier('assert'))],
        j.stringLiteral('node:assert/strict')
      )
    )

  // Make trivial changes.
  //
  // Before:
  //
  //     t.is(...)
  //     t.alike(...)
  //
  // After:
  //
  //     assert.equal(...)
  //     assert.deepEqual(...)

  {
    const toReplace: Map<string, string> = new Map([
      ['is', 'equal'],
      ['not', 'notEqual'],
      ['alike', 'deepEqual'],
      ['unlike', 'notDeepEqual'],
      ['teardown', 'after'],
      ['fail', 'fail'],
    ])
    for (const [brittleMethod, assertMethod] of toReplace) {
      root
        .find(j.MemberExpression, {
          object: { name: 't' },
          property: { name: brittleMethod },
        })
        .forEach((memberExpression) => {
          memberExpression.value.object = j.identifier('assert')
          memberExpression.value.property = j.identifier(assertMethod)
        })
    }
  }

  // Replace `t.ok` with `assert`.
  //
  // Before:
  //
  //     t.ok(...)
  //
  // After:
  //
  //     assert(...)

  root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        object: { name: 't' },
        property: { name: 'ok' },
      },
    })
    .forEach((callExpression) => {
      callExpression.value.callee = j.identifier('assert')
    })

  // Replace `t.absent(foo)` with `assert(!foo)`.
  //
  // Before:
  //
  //     t.absent(foo, ...)
  //
  // After:
  //
  //     assert(!foo, ...)

  root
    .find(j.CallExpression, {
      callee: {
        type: 'MemberExpression',
        object: { name: 't' },
        property: { name: 'absent' },
      },
    })
    .forEach((callExpression) => {
      callExpression.value.callee = j.identifier('assert')

      const [firstArg] = callExpression.value.arguments
      assert(firstArg && firstArg.type !== 'SpreadElement')
      callExpression.value.arguments[0] = j.unaryExpression('!', firstArg)
    })

  // Replace `await`ed Brittle exceptions/executions with their assert
  // equivalents.
  //
  // Before:
  //
  //     await t.exception(...)
  //     await t.exception.all(...)
  //     await t.execution(...)
  //
  // After:
  //
  //     await assert.rejects(...)
  //     await assert.rejects(...)
  //     await assert.doesNotReject(...)

  root
    .find(j.AwaitExpression, {
      argument: {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: { name: 't' },
          property: { name: 'exception' },
        },
      },
    })
    .forEach((awaitExpression) => {
      awaitExpression.value.argument = assertThrowsOrRejectsCall(
        awaitExpression.value.argument as CallExpression,
        'rejects'
      )
    })

  root
    .find(j.AwaitExpression, {
      argument: {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: {
            type: 'MemberExpression',
            object: { name: 't' },
            property: { name: 'exception' },
          },
          property: { name: 'all' },
        },
      },
    })
    .forEach((awaitExpression) => {
      awaitExpression.value.argument = assertThrowsOrRejectsCall(
        awaitExpression.value.argument as CallExpression,
        'rejects'
      )
    })

  root
    .find(j.AwaitExpression, {
      argument: {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: { name: 't' },
          property: { name: 'execution' },
        },
      },
    })
    .forEach((awaitExpression) => {
      const argument = awaitExpression.value.argument as CallExpression
      argument.callee = j.memberExpression(
        j.identifier('t'),
        j.identifier('notThrowsAsync')
      )
    })

  // Replace remaining Brittle exceptions/executions with Node equivalents.
  //
  // Before:
  //
  //     await t.exception(...)
  //     await t.exception.all(...)
  //     await t.execution(...)
  //
  // After:
  //
  //     await t.rejects(...)
  //     await t.rejects(...)
  //     await t.notThrowsAsync(...)
  //
  // These might be ambiguous so we do our best.

  {
    const firstArgLooksSync = (call: CallExpression): boolean => {
      const [firstArg] = call.arguments
      return Boolean(
        firstArg &&
          (firstArg.type === 'ArrowFunctionExpression' ||
            firstArg.type === 'FunctionExpression') &&
          !firstArg.async
      )
    }

    const updateBrittleException = (
      brittleException: CallExpression
    ): CallExpression =>
      assertThrowsOrRejectsCall(
        brittleException,
        firstArgLooksSync(brittleException) ? 'throws' : 'rejects'
      )

    root
      .find(j.CallExpression, {
        callee: {
          type: 'MemberExpression',
          object: { name: 't' },
          property: { name: 'exception' },
        },
      })
      .forEach((callExpression) => {
        callExpression.replace(updateBrittleException(callExpression.value))
      })

    root
      .find(j.CallExpression, {
        callee: {
          type: 'MemberExpression',
          object: {
            type: 'MemberExpression',
            object: { name: 't' },
            property: { name: 'exception' },
          },
          property: { name: 'all' },
        },
      })
      .forEach((callExpression) => {
        callExpression.replace(updateBrittleException(callExpression.value))
      })

    root
      .find(j.CallExpression, {
        callee: {
          type: 'MemberExpression',
          object: { name: 't' },
          property: { name: 'execution' },
        },
      })
      .forEach((call) => {
        call.value.callee = j.memberExpression(
          j.identifier('assert'),
          j.identifier(
            firstArgLooksSync(call.value) ? 'doesNotThrow' : 'doesNotReject'
          )
        )
      })
  }

  return root.toSource()
}

export default transform
