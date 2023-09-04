import { DnsSd } from '../src/discovery/dns-sd.js'
import test from 'brittle'
import { setTimeout as delay } from 'node:timers/promises'

// Time in ms to wait for mdns messages to propogate
const MDNS_WAIT_TIME = 1000

test('dns-sd multiple clients, 2000ms staggered start/stop', async (t) => {
  await testMultiple(t, { period: 2000 })
})

test('dns-sd multiple clients, immediate start/stop', async (t) => {
  await testMultiple(t, { period: 0 })
})

test('Calling advertise() multiple times with same port is a noop', async (t) => {
  const dnssd1 = new DnsSd()
  const dnssd2 = new DnsSd()
  const ups = []
  dnssd1.on('up', (service) => ups.push(service.name))
  dnssd1.browse()
  await delay(500)
  await dnssd2.advertise(5001)
  await delay(500)
  await dnssd2.advertise(5001)
  await delay(500)
  t.alike(ups, [dnssd2.name])
  await Promise.all([dnssd1.destroy(), dnssd2.destroy()])
})

test('Calling browse() multiple times is a noop', async (t) => {
  const dnssd1 = new DnsSd()
  const dnssd2 = new DnsSd()
  const ups = []
  dnssd1.on('up', (service) => ups.push(service.name))
  dnssd1.browse()
  await dnssd2.advertise(5001)
  await delay(500)
  dnssd1.browse(5001)
  await delay(500)
  t.alike(ups, [dnssd2.name])
  await Promise.all([dnssd1.destroy(), dnssd2.destroy()])
})

test('Calling advertise() multiple times with a different port republishes the service', async (t) => {
  const dnssd1 = new DnsSd()
  const dnssd2 = new DnsSd()
  const ups = []
  const downs = []
  dnssd1.on('up', (service) => ups.push(service.port))
  dnssd1.on('down', (service) => downs.push(service.port))
  dnssd1.browse()
  await delay(500)
  await dnssd2.advertise(5001)
  await delay(500)
  await dnssd2.advertise(5002)
  await delay(500)
  t.alike(ups, [5001, 5002])
  t.alike(downs, [5001])
  await Promise.all([dnssd1.destroy(), dnssd2.destroy()])
})

test('Can stop and start advertising and browsing (change advertise port)', async (t) => {
  const dnssd1 = new DnsSd()
  const dnssd2 = new DnsSd()
  const ups = []
  dnssd1.on('up', (service) => ups.push(service.port))
  dnssd1.browse()
  await dnssd2.advertise(5001)
  await delay(500)
  await dnssd2.stopAdvertising()
  dnssd1.stopBrowsing()
  dnssd1.browse()
  await dnssd2.advertise(5002)
  await delay(500)
  t.alike(ups, [5001, 5002])
  await Promise.all([dnssd1.destroy(), dnssd2.destroy()])
})

test('Can stop and start advertising on same port', async (t) => {
  const dnssd1 = new DnsSd()
  const dnssd2 = new DnsSd()
  const ups = []
  const downs = []
  dnssd1.on('up', (service) => ups.push(service.port))
  dnssd1.on('down', (service) => downs.push(service.port))
  dnssd1.browse()
  await dnssd2.advertise(5001)
  await delay(500)
  await dnssd2.stopAdvertising()
  dnssd1.stopBrowsing()
  dnssd1.browse()
  await dnssd2.advertise(5001)
  await delay(500)
  await dnssd2.stopAdvertising()
  await delay(500)
  t.alike(ups, [5001, 5001])
  t.alike(downs, [5001, 5001])
  await Promise.all([dnssd1.destroy(), dnssd2.destroy()])
})

test('After destroy, can advertise and browse', async (t) => {
  const dnssd1 = new DnsSd()
  const dnssd2 = new DnsSd()
  const ups = []
  dnssd1.on('up', (service) => ups.push(service.port))
  dnssd1.browse()
  await dnssd2.advertise(5001)
  await delay(500)
  await Promise.all([dnssd1.destroy(), dnssd2.destroy()])
  dnssd1.browse()
  await dnssd2.advertise(5002)
  await delay(500)
  t.alike(ups, [5001, 5002])
  await Promise.all([dnssd1.destroy(), dnssd2.destroy()])
})

test('can call stopAdvertising immediately after advertise()', async (t) => {
  t.plan(1)
  const dnssd = new DnsSd()
  const startAdvertising = dnssd.advertise(5001)
  await dnssd.stopAdvertising()
  await startAdvertising
  await dnssd.destroy()
  t.pass(`Did not timeout`)
})

test('can call advertise() immediately after stopAdvertise()', async (t) => {
  const dnssd1 = new DnsSd()
  const dnssd2 = new DnsSd()
  const ups = []
  dnssd1.on('up', (service) => ups.push(service.port))
  dnssd1.browse()
  await dnssd2.advertise(5001)
  await delay(500)
  const stopAdvertising = dnssd2.stopAdvertising()
  await dnssd2.advertise(5001)
  await stopAdvertising
  await delay(500)
  t.alike(ups, [5001, 5001])
  await Promise.all([dnssd1.destroy(), dnssd2.destroy()])
})

test('calling destroy() before anything else is a noop', async (t) => {
  t.plan(1)
  const dnssd1 = new DnsSd()
  await dnssd1.destroy()
  t.pass()
})

/**
 * @param {any} t
 * @param {object} opts
 * @param {number} opts.period Delay for starting and stopping services - start and stop will happen at a random time within this period
 * @param {number} [opts.count] Number of instances to create and browse and advertise (default 20)
 */
async function testMultiple(t, { period, count = 20 }) {
  t.plan(count * 2 + 1)
  const instances = new Map()
  const serviceUps = new Map()
  const serviceDowns = new Map()
  for (let i = 0; i < count; i++) {
    const dnsSd = new DnsSd()
    instances.set(dnsSd.name, dnsSd)
    const ups = []
    const downs = []
    serviceUps.set(dnsSd.name, ups)
    serviceDowns.set(dnsSd.name, downs)
    dnsSd.on('up', (service) => ups.push(service.name))
    dnsSd.on('down', (service) => downs.push(service.name))
    // Start advertising and browsing at a random time within the first `delay`
    // milliseconds, then wait for MDNS_WAIT_TIME before then stopping browsing
    // at a random time within `delay`
    setTimeout(() => dnsSd.advertise(5000 + i), period * Math.random())
    setTimeout(() => dnsSd.browse(), period * Math.random())
    setTimeout(
      () => dnsSd.stopAdvertising(),
      MDNS_WAIT_TIME + period * Math.random()
    )
  }
  await delay(2 * (period + MDNS_WAIT_TIME))
  const instanceNames = [...instances.keys()]
  for (const name of instanceNames) {
    const expected = instanceNames.filter((n) => n !== name).sort()
    t.alike(
      serviceUps.get(name).sort(),
      expected,
      `${name} received 'up' from all ${expected.length} other instances`
    )
    t.alike(
      serviceDowns.get(name).sort(),
      expected,
      `${name} received 'down' from all ${expected.length} other instances`
    )
  }
  const destroyPromises = []
  for (const instance of instances.values()) {
    destroyPromises.push(instance.destroy())
  }
  await Promise.all(destroyPromises)
  t.pass('All instances destroyed')
}
