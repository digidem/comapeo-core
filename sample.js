// @ts-check
import { test } from 'brittle'

test('basic test', (t) => {
  t.alike(1, 1)
  t.alike(1, 1, 'msg')

  t.unlike(1, 1)
  t.unlike(1, 1, 'msg')

  t.absent(false)
  t.absent(false, 'msg')

  t.exception(() => {})
  t.exception(() => {}, 'msg')
  t.exception(() => {}, Error, 'msg')

  t.doesNotThrow(() => {})
  t.doesNotThrow(() => {}, 'msg')
})

test('async test', async (t) => {
  t.alike(1, 1)

  await t.exception(Promise.reject('err'))
  await t.exception(async () => {})
  await t.exception.all(Promise.reject('err'))
  await t.exception.all(async () => {})

  await t.doesNotThrow(Promise.resolve())
  await t.doesNotThrow(async () => {})
})

test('with options', { skip: true }, (t) => {
  t.alike(1, 1)
})

test('subtests', (t) => {
  t.test('subtest', (st) => {
    st.alike(1, 1)
    st.unalike(1, 2, 'subtest message')
  })
})

/*
t.alike ~> t.deepEqual
t.unlike ~> t.notDeepEqual
t.absent -> t.notOk
t.exception ~> t.throws (doesn't work for promises)
t.exception.all ~> t.throws (doesn't work for promises)
t.execution ~> t.doesNotThrow
*/
