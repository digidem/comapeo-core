import { test } from 'brittle'

import createTestnet from '@hyperswarm/testnet'
import { keyPair } from 'hypercore-crypto'

import { Discovery } from '../lib/discovery.js'

test('mdns', async (t) => {
	t.plan(2)

	const discovery1 = new Discovery({ keyPair: keyPair(), dht: false })
	const discovery2 = new Discovery({ keyPair: keyPair(), dht: false })

	const topic = Buffer.alloc(32).fill('mapeo-example')
	await discovery1.announce(topic)
	await discovery2.lookup(topic)

	discovery1.on('connection', async (connection, info) => {
		connection.write(Buffer.from('hello'))
	})

	discovery2.on('connection', async (connection, info) => {
		t.ok(info)

		connection.on('data', async (data) => {
			t.ok(data.toString() === 'hello')
			await discovery1.destroy()
			await discovery2.destroy()
		})
	})
})

test('dht', async (t) => {
	t.plan(2)

	const testnet = await createTestnet(10)
	const bootstrap = testnet.bootstrap

	const discovery1 = new Discovery({ keyPair: keyPair(), dht: { bootstrap }, mdns: false })
	const discovery2 = new Discovery({ keyPair: keyPair(), dht: { bootstrap }, mdns: false })

	const topic = Buffer.alloc(32).fill('mapeo-example')

	discovery1.on('connection', async (connection, info) => {
		connection.write(Buffer.from('hello'))
	})

	discovery2.on('connection', async (connection, info) => {
		t.ok(info)

		connection.on('data', async (data) => {
			t.ok(data.toString() === 'hello')
			await discovery1.destroy()
			await discovery2.destroy()
			await testnet.destroy()
		})
	})

	await discovery1.announce(topic)
	await discovery2.lookup(topic)
})
