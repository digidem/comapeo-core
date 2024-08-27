/**
 * @overview Randomly performs sync operations until something breaks.
 *
 * This is run as part of normal testing. You can also run it with custom
 * arguments like this:
 *
 * ```sh
 * COMAPEO_SYNC_FUZZ_TEST_COUNT=10 \
 * COMAPEO_SYNC_FUZZ_MIN_MANAGER_COUNT=2 \
 * COMAPEO_SYNC_FUZZ_MAX_MANAGER_COUNT=3 \
 * COMAPEO_SYNC_FUZZ_MIN_ACTION_COUNT=4 \
 * COMAPEO_SYNC_FUZZ_MAX_ACTION_COUNT=32 \
 * node --test test-e2e/sync-fuzz.js
 * ```
 */

import { generate } from '@mapeo/mock-data'
import { map } from 'iterpal'
import assert from 'node:assert/strict'
import * as process from 'node:process'
import test from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import { isDeepStrictEqual } from 'node:util'
import { valueOf } from '../src/utils.js'
import { connectPeers, createManagers, invite, waitForSync } from './utils.js'
/** @import { MapeoProject } from '../src/mapeo-project.js' */

/**
 * @internal
 * @typedef {object} ProjectState
 * @prop {boolean} isSyncEnabled
 * @prop {Readonly<Set<string>>} observationIds
 */

/**
 * @internal
 * @typedef {ReadonlyArray<ProjectState>} State
 */

/**
 * @internal
 * @typedef {object} ActionResult
 * @prop {string} title
 * @prop {State} newExpectedState
 */

/**
 * @internal
 * @callback Action
 * @param {State} oldExpectedState
 * @returns {ActionResult | Promise<ActionResult>}
 */

const testCount = getEnvironmentVariableInt('TEST_COUNT', 10)
const minManagerCount = getEnvironmentVariableInt('MIN_MANAGER_COUNT', 2)
const maxManagerCount = getEnvironmentVariableInt('MAX_MANAGER_COUNT', 3)
const minActionCount = getEnvironmentVariableInt('MIN_ACTION_COUNT', 4)
const maxActionCount = getEnvironmentVariableInt('MAX_ACTION_COUNT', 32)

// TODO temp
test.only('TODO', { timeout: 2 ** 30 }, async (t) => {
  const managers = await createManagers(3, t)
  const [invitor, ...invitees] = managers

  const disconnect = connectPeers(managers, { discovery: false })
  t.after(disconnect)

  const projectId = await invitor.createProject({ name: 'Mapeo' })
  await invite({ invitor, invitees, projectId })

  const projects = await Promise.all(
    managers.map((m) => m.getProject(projectId))
  )
  await waitForSync(projects, 'initial')

  projects[2].$sync.start()
  projects[1].$sync.start()
  projects[0].$sync.start()
  projects[1].$sync.stop()

  await delay(1000)

  const observation1 = await projects[1].observation.create(
    valueOf(generate('observation')[0])
  )
  // const observation4 = await projects[1].observation.create(
  //   valueOf(generate('observation')[0])
  // )
  // const observation2 = await projects[0].observation.create(
  //   valueOf(generate('observation')[0])
  // )
  // const observation3 = await projects[0].observation.create(
  //   valueOf(generate('observation')[0])
  // )

  projects[1].$sync.start()

  // await delay(1000)
  await waitForSync(projects, 'full')

  const results = await Promise.all(
    projects.map(async (project) => {
      const observations = await project.observation.getMany()
      const ids = observations.map((o) => o.docId)
      return new Set(ids)
    })
  )
  assert.deepEqual(
    results,
    Array(3).fill(
      new Set([
        observation1.docId,
        // observation2.docId,
        // observation3.docId,
        // observation4.docId,
      ])
    )
  )
})

for (let i = 1; i <= testCount; i++) {
  test(`sync fuzz test #${i}`, { timeout: 2 ** 30 }, async (t) => {
    const managerCount = randint(minManagerCount, maxManagerCount)
    const actionCount = randint(minActionCount, maxActionCount)

    const managers = await createManagers(managerCount, t)
    const [invitor, ...invitees] = managers

    const disconnect = connectPeers(managers, { discovery: false })
    t.after(disconnect)

    const projectId = await invitor.createProject({ name: 'Mapeo' })
    await invite({ invitor, invitees, projectId })

    const projects = await Promise.all(
      managers.map((m) => m.getProject(projectId))
    )
    t.after(() =>
      Promise.all(
        projects.map(async (project) => {
          project.$sync.stop()
          await project.close()
        })
      )
    )
    await waitForSync(projects, 'initial')

    /** @type {string[]} */
    const actionTitles = []
    /** @type {State} */
    let expectedState = projects.map(() => ({
      isSyncEnabled: false,
      observationIds: new Set(),
    }))

    // TODO
    const timeout = setTimeout(() => {}, 2 ** 30)
    t.after(() => {
      clearTimeout(timeout)
    })

    for (let i = 0; i < actionCount; i++) {
      const possibleActions = getPossibleNextActions(projects)
      const action = sample(possibleActions)
      assert(action, 'no next step? test is broken')

      const result = await action(expectedState)
      actionTitles.push(result.title)
      expectedState = result.newExpectedState

      // TODO
      // await waitForStateToMatch(projects, expectedState)

      await waitForDataSyncForEnabledProjects(projects)

      /** @type {State} */
      const actualState = await Promise.all(
        projects.map(async (project) => {
          const observations = await project.observation.getMany()
          const observationIds = map(observations, (o) => o.docId)
          return {
            isSyncEnabled: isSyncEnabled(project),
            observationIds: new Set(observationIds),
          }
        })
      )

      assertStatesMatch(actualState, expectedState, actionTitles)
    }
  })
}

/**
 * @param {string} name
 * @param {number} defaultValue
 * @returns {number}
 */
function getEnvironmentVariableInt(name, defaultValue) {
  const fullName = 'COMAPEO_SYNC_FUZZ_' + name
  const rawValue = process.env[fullName]
  if (!rawValue) return defaultValue

  const result = parseInt(rawValue, 10)
  assert(result > 0, `${fullName} must be positive`)
  assert(Number.isFinite(result), `Can't parse ${fullName}`)
  assert(Number.isSafeInteger(result), `${fullName} must be a safe integer`)

  return result
}

/**
 * Return a random integer between `a` and `b`, inclusive.
 *
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function randint(a, b) {
  if (a > b) return randint(a, b)
  return Math.round(Math.random() * Math.abs(b - a)) + a
}

/**
 * @template T
 * @param {Readonly<ArrayLike<T>>} arr
 * @returns {undefined | T}
 */
function sample(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * @template T
 * @param {Readonly<Set<T>>} set
 * @param {ReadonlyArray<T>} toAdd
 * @returns {Set<T>}
 */
function setAdd(set, ...toAdd) {
  const result = new Set(set)
  for (const value of toAdd) result.add(value)
  return result
}

/**
 * @param {MapeoProject} project
 * @returns {boolean}
 */
function isSyncEnabled(project) {
  return project.$sync.getState().data.isSyncEnabled
}

/**
 * @param {MapeoProject} project
 * @param {number} index
 * @returns {Action[]}
 */
function getPossibleNextActionsForProject(project, index) {
  /** @type {Action[]} */
  const result = []

  // Add observation

  result.push(async (expectedState) => {
    const observation = await project.observation.create(
      valueOf(generate('observation')[0])
    )

    const myProject = expectedState[index]
    return {
      title: `Project ${index} added observation ${observation.docId}`,
      newExpectedState: expectedState.map((otherProject) => {
        const shouldAddThisObservationToList =
          myProject === otherProject ||
          (myProject.isSyncEnabled && otherProject.isSyncEnabled)
        return {
          ...otherProject,
          observationIds: shouldAddThisObservationToList
            ? setAdd(otherProject.observationIds, observation.docId)
            : otherProject.observationIds,
        }
      }),
    }
  })

  // Start or stop sync

  if (isSyncEnabled(project)) {
    result.push(async (expectedState) => {
      project.$sync.stop()
      await new Promise((res) => setTimeout(res, 10))

      const myProject = expectedState[index]
      return {
        title: `Project ${index} stopped sync`,
        newExpectedState: expectedState.map((otherProject) => {
          if (otherProject === myProject) {
            return { ...otherProject, isSyncEnabled: false }
          } else {
            return otherProject
          }
        }),
      }
    })
  } else {
    result.push(async (expectedState) => {
      project.$sync.start()
      await new Promise((res) => setTimeout(res, 10))

      const myProject = expectedState[index]
      return {
        title: `Project ${index} started sync`,
        newExpectedState: expectedState.map((otherProject) => {
          let { observationIds } = myProject
          if (myProject === otherProject) {
            for (const p of expectedState) {
              if (p.isSyncEnabled) {
                observationIds = setAdd(observationIds, ...p.observationIds)
              }
            }
            return { ...myProject, isSyncEnabled: true, observationIds }
          } else if (otherProject.isSyncEnabled) {
            return {
              ...otherProject,
              observationIds: setAdd(
                otherProject.observationIds,
                ...observationIds
              ),
            }
          } else {
            return otherProject
          }
        }),
      }
    })
  }

  return result
}

/**
 * @param {ReadonlyArray<MapeoProject>} projects
 * @returns {Action[]}
 */
function getPossibleNextActions(projects) {
  return projects.flatMap(getPossibleNextActionsForProject)
}

/**
 * @param {MapeoProject[]} projects
 * @returns {Promise<void>}
 */
async function waitForDataSyncForEnabledProjects(projects) {
  /**
   * @param {MapeoProject} project
   * @returns {boolean}
   */
  const isProjectDone = (project) => {
    if (project.$sync.getState().data.isSyncEnabled) {
      return projects.every((otherProject) => {
        const isMe = otherProject === project
        if (isMe) return true

        const syncState = otherProject.$sync.getState()
        if (!syncState.data.isSyncEnabled) return true

        const howTheySeeMe = syncState.remoteDeviceSyncState[project.deviceId]
        return howTheySeeMe.data.want === 0 && howTheySeeMe.data.wanted === 0
      })
    } else {
      return true
    }
  }

  /**
   * @returns {boolean}
   */
  const isDone = () => projects.every(isProjectDone)

  if (isDone()) return

  return new Promise((resolve) => {
    const cleanup = () => {
      for (const project of projects) {
        project.$sync.off('sync-state', onState)
      }
      clearTimeout(timeout)
    }

    let onState = () => {
      if (isDone()) {
        cleanup()
        onState = () => {} // TODO: necessary?
        resolve()
      }
    }

    const timeout = setTimeout(() => {
      cleanup()
      resolve()
    }, 3000)

    for (const project of projects) {
      project.$sync.on('sync-state', onState)
    }
  })
}

/**
 * @param {ProjectState} projectState
 * @param {number} index
 * @returns {string[]}
 */
function assertionLinesForProject({ isSyncEnabled, observationIds }, index) {
  return [
    `Project ${index} (sync ${isSyncEnabled ? 'started' : 'stopped'}): ${
      observationIds.size
    } observation${observationIds.size === 1 ? '' : 's'}`,
    ...Array.from(observationIds)
      .sort()
      .map((observationId) => `  ${observationId}`),
  ]
}

/**
 * Assert that states match. Shows a nice (lazily computed) error if not.
 *
 * @param {State} actual
 * @param {State} expected
 * @param {string[]} actionTitles
 * @returns {void}
 */
function assertStatesMatch(actual, expected, actionTitles) {
  if (!isDeepStrictEqual(actual, expected)) {
    const lines = [
      'Expected states to be strictly equal after the following steps:',
      '',
      ...actionTitles,
      '',
      'Expected the following:',
      ...expected.flatMap(assertionLinesForProject),
      '',
      'Actually got the following:',
      ...actual.flatMap(assertionLinesForProject),
      '',
    ]
    throw new assert.AssertionError({
      message: lines.join('\n'),
      actual,
      expected,
      operator: 'assertStatesMatch',
      stackStartFn: assertStatesMatch,
    })
  }
}
