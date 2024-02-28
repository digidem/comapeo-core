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

  t.execution(() => {})
  t.execution(() => {}, 'msg')
})

test('async test', async (t) => {
  t.alike(1, 1)

  await t.exception(Promise.reject('err'))
  await t.exception(async () => {})
  await t.exception.all(Promise.reject('err'))
  await t.exception.all(async () => {})
})

test('with options', { skip: true }, (t) => {
  t.alike(1, 1)
})

test('has plan', (t) => {
  t.plan(2)
})

test('already ended', (t) => {
  t.end()
})

test('subtests', (t) => {
  t.test('sync subtest', (st) => {
    st.alike(1, 1)
  })

  t.test('async subtest', async (st) => {
    st.alike(1, 1)
    st.unlike(1, 2, 'subtest message')

    st.exception(() => {})
    await st.exception(Promise.reject('err'))
    await st.exception(async () => {})
    await st.exception.all(Promise.reject('err'))
    await st.exception.all(async () => {})
  })
})
