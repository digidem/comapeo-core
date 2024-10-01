import createServer from '../src/server/app.js'
import { getManagerOptions } from './utils.js'

const fastify = createServer({
  ...getManagerOptions('test server'),
  logger: true,
})
fastify.listen(3000).then((address) => {
  console.log(`Server listening on ${address}`)
})
