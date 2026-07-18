import assert from 'node:assert/strict'
import test from 'node:test'
import {
  connectPeers,
  createOldManager,
  invite,
  waitForPeers,
} from '../utils.js'
import { VERSIONS } from './versions.js'
import { generateObservationFor } from './fixtures.js'

// One-time backfill documenting sync compatibility between already-published
// versions. Adjacent pairs only (the realistic upgrade path): the ongoing
// suites test the working tree against every shipped version before release,
// so any pair of published versions has already been tested when the newer of
// the two was pre-release. A failure here cannot be fixed in the versions
// involved — this exists to document field reality, not to gate changes. Run
// via the cross-version workflow's `old-pairs` dispatch input.
const enabled = Boolean(process.env.CROSS_VERSION_OLD_PAIRS)

for (let i = 0; i + 1 < VERSIONS.length; i++) {
  const older = VERSIONS[i]
  const newer = VERSIONS[i + 1]
  test(
    `old pair p2p sync: @comapeo/core@${older.coreVersion} (${older.appRelease}) <-> @comapeo/core@${newer.coreVersion} (${newer.appRelease})`,
    { skip: !enabled && 'set CROSS_VERSION_OLD_PAIRS=1 to run' },
    async (t) => {
      const olderManager = await createOldManager(older.coreVersion, t, 'older')
      await olderManager.setDeviceInfo({ name: 'older', deviceType: 'mobile' })
      const newerManager = await createOldManager(newer.coreVersion, t, 'newer')
      await newerManager.setDeviceInfo({ name: 'newer', deviceType: 'mobile' })

      const disconnect = connectPeers([olderManager, newerManager])
      t.after(disconnect)
      await waitForPeers([olderManager, newerManager])

      const projectId = await olderManager.createProject({
        name: 'cross-version',
      })
      await invite({
        projectId,
        invitor: olderManager,
        invitees: [newerManager],
      })

      const [olderProject, newerProject] = await Promise.all([
        olderManager.getProject(projectId),
        newerManager.getProject(projectId),
      ])
      olderProject.$sync.start()
      newerProject.$sync.start()

      const [olderObservation, newerObservation] = await Promise.all([
        olderProject.observation.create(generateObservationFor(older)),
        newerProject.observation.create(generateObservationFor(newer)),
      ])

      await Promise.all([
        olderProject.$sync.waitForSync('full'),
        newerProject.$sync.waitForSync('full'),
      ])

      assert(
        await olderProject.observation.getByDocId(newerObservation.docId),
        `${older.coreVersion} reads observation written by ${newer.coreVersion}`
      )
      assert(
        await newerProject.observation.getByDocId(olderObservation.docId),
        `${newer.coreVersion} reads observation written by ${older.coreVersion}`
      )
    }
  )
}
