import assert from 'node:assert/strict'
import test from 'node:test'
import { isNamespaceSynced } from '../../src/sync/is-namespace-synced.js'

test("if any peer is starting, we aren't synced", () => {
  assert(
    !isNamespaceSynced({
      remoteStates: { a: { status: 'starting', want: 0, wanted: 0 } },
    })
  )
  assert(
    !isNamespaceSynced({
      remoteStates: {
        a: { status: 'started', want: 0, wanted: 0 },
        b: { status: 'starting', want: 0, wanted: 0 },
      },
    })
  )
})

test("if any started peer wants something, we aren't synced", () => {
  assert(
    !isNamespaceSynced({
      remoteStates: { a: { status: 'started', want: 1, wanted: 0 } },
    })
  )
  assert(
    !isNamespaceSynced({
      remoteStates: {
        a: { status: 'started', want: 0, wanted: 0 },
        b: { status: 'started', want: 1, wanted: 0 },
      },
    })
  )
})

test("if we want something from any peer, we aren't synced", () => {
  assert(
    !isNamespaceSynced({
      remoteStates: { a: { status: 'started', want: 0, wanted: 1 } },
    })
  )
  assert(
    !isNamespaceSynced({
      remoteStates: {
        a: { status: 'started', want: 0, wanted: 0 },
        b: { status: 'started', want: 0, wanted: 1 },
      },
    })
  )
})

test('empty state is considered synced', () => {
  assert(isNamespaceSynced({ remoteStates: {} }))
})

test('if every peer is synced or stopped, the namespace is synced', () => {
  assert(
    isNamespaceSynced({
      remoteStates: { a: { status: 'started', want: 0, wanted: 0 } },
    })
  )
  assert(
    isNamespaceSynced({
      remoteStates: { a: { status: 'stopped', want: 12, wanted: 34 } },
    })
  )
  assert(
    isNamespaceSynced({
      remoteStates: {
        a: { status: 'started', want: 0, wanted: 0 },
        b: { status: 'started', want: 0, wanted: 0 },
        c: { status: 'stopped', want: 12, wanted: 34 },
      },
    })
  )
})
