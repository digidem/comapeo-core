import { Datastore } from '../../../../lib/datastore.js'

import schema from './schema.js'

export class Point extends Datastore {
  constructor({ corestore, keyPair, sqlite }) {
    const name = 'point'

    super({
      name,
      corestore,
      keyPair,
      sqlite,
      schema,
    })
  }
}
