//@ts-check
import { once } from 'node:events'
import test from 'brittle'
import Hypercore from 'hypercore'
import ram from 'random-access-memory'
import { ReplicationState } from '../lib/sync/replication-state.js'
import { replicate } from './helpers/index.js'

test('sync - replication state', async (t) => {
  t.plan(1)

  t.teardown(async () => {
    await core1.close()
    await core2.close()
    await core3.close()
  })

  const core1 = new Hypercore(ram)
  await core1.ready()
  const core2 = new Hypercore(ram, core1.key)
  await core2.ready()
  const core3 = new Hypercore(ram, core1.key)
  await core3.ready()

  for (let i = 0; i < 100; i = i + 10) {
    const blocks = new Array(10).fill(null).map((b, i) => `block ${i}`)
    await core1.append(blocks)
  }

  const progress = new ReplicationState({
    cores: [core1],
  })

  progress.on('state', (state) => {
    // console.log('state event', state)
  })

  replicate([
    { id: 'core1', core: core1 },
    { id: 'core2', core: core2 },
    { id: 'core3', core: core3 },
  ])

  await Promise.all([
    core2.download({ start: 0, end: 100 }).done(),
    core3.download({ start: 0, end: 100 }).done()
  ])

  progress.on('synced', () => {
    t.pass()
  })
})
