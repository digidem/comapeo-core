import test from 'node:test'
import Fastify from 'fastify'

import { FastifyController } from '../src/fastify-controller.js'

test('lifecycle', async () => {
  const fastify = Fastify()
  const fastifyController = new FastifyController({ fastify })

  const startOptsFixtures = [
    {},
    { port: 1234 },
    { port: 4321, host: '0.0.0.0' },
    { host: '0.0.0.0' },
  ]

  // This should run without errors.
  for (const opts of startOptsFixtures) {
    await fastifyController.start(opts)
    await fastifyController.start(opts)
    await fastifyController.stop()
    await fastifyController.stop()

    fastifyController.start(opts)
    await fastifyController.started()
    await fastifyController.started()
    await fastifyController.stop()
  }
})
