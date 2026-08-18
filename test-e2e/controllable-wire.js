import { Transform } from 'node:stream'
import { kProjectReplicate } from '../src/mapeo-project.js'

/** @import { MapeoProject } from '../src/mapeo-project.js' */

/**
 * A `Transform` that forwards bytes unchanged, but can inject latency and be
 * paused/resumed. Because a Transform processes one chunk at a time (the next
 * `_transform` only runs after the previous `cb`), holding `cb` while paused
 * applies real backpressure and preserves chunk order on resume.
 *
 * @param {{ latencyMs?: number }} [opts]
 */
function makeGate({ latencyMs = 0 } = {}) {
  let paused = false
  /** @type {Array<() => void>} */
  const held = []
  const gate = new Transform({
    transform(chunk, _encoding, cb) {
      const release = () => cb(null, chunk)
      const go = () => (latencyMs ? setTimeout(release, latencyMs) : release())
      if (paused) held.push(go)
      else go()
    },
  })
  return Object.assign(gate, {
    pauseFlow() {
      paused = true
    },
    resumeFlow() {
      paused = false
      while (held.length) {
        const go = held.shift()
        if (go) go()
      }
    },
  })
}

/**
 * Connect two real projects over a transport we fully control — models the
 * network (latency, pause/resume, abrupt teardown) without touching any sync
 * internals. Uses the same `kProjectReplicate` replication seam the server path
 * uses, so each side replicates under its real device identity
 * (`peerId === deviceId`).
 *
 * Returns one "link"; call it twice for the same pair to create two concurrent
 * connections for one identity (the D1 overlap that local discovery dedups).
 *
 * @param {MapeoProject} projectA
 * @param {MapeoProject} projectB
 * @param {{ latencyMs?: number }} [opts]
 */
export function connectProjectsControllably(projectA, projectB, opts = {}) {
  const streamA = projectA[kProjectReplicate](true)
  const streamB = projectB[kProjectReplicate](false)
  const gateAtoB = makeGate(opts)
  const gateBtoA = makeGate(opts)

  // Swallow errors caused by destroying mid-flight (REQUEST_CANCELLED etc. on
  // the transport itself; the point of the tests is what the *app* surfaces).
  for (const stream of [streamA, streamB, gateAtoB, gateBtoA]) {
    stream.on('error', () => {})
  }

  // The replication streams are streamx Duplexes; piping them through Node
  // Transforms works at runtime (same approach as wsCoreReplicator) but the
  // type shapes differ, so cast for the pipe wiring.
  const a = /** @type {import('node:stream').Duplex} */ (
    /** @type {unknown} */ (streamA)
  )
  const b = /** @type {import('node:stream').Duplex} */ (
    /** @type {unknown} */ (streamB)
  )
  a.pipe(gateAtoB).pipe(b)
  b.pipe(gateBtoA).pipe(a)

  let destroyed = false

  return {
    /** Hold all bytes in both directions until {@link resume}. */
    pause() {
      gateAtoB.pauseFlow()
      gateBtoA.pauseFlow()
    },
    /** Hold only A→B bytes (e.g. starve one peer of a specific update). */
    pauseAtoB() {
      gateAtoB.pauseFlow()
    },
    resume() {
      gateAtoB.resumeFlow()
      gateBtoA.resumeFlow()
    },
    /** Abruptly drop the connection (like a yanked cable). */
    async destroy() {
      if (destroyed) return
      destroyed = true
      streamA.destroy()
      streamB.destroy()
      await Promise.all(
        [streamA, streamB].map(
          (stream) =>
            new Promise((res) => {
              if (stream.destroyed) return res(undefined)
              stream.once('close', () => res(undefined))
            })
        )
      )
    },
  }
}
