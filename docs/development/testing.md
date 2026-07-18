# Testing CoMapeo Core

## Test suites

| Suite | Command | What it covers |
| --- | --- | --- |
| Unit tests | `npm run test:unit` | Everything in `test/`, run with node's built-in test runner |
| End-to-end tests | `npm run test:e2e` | Everything in `test-e2e/*.js`: full `MapeoManager` flows — invites, sync, blobs, migration, cloud servers |
| Cross-version tests | `npm run test:cross-version` | `test-e2e/cross-version/`: sync between the working tree and published `@comapeo/core` versions (see below) |
| Type tests | `npm run test:types` | `test-types/` |

`npm test` runs lint, prettier, types, unit and e2e tests — everything except the cross-version tests, which run in their own CI workflow.

Shared test helpers live in `test-e2e/utils.js` (managers, peers, invites, sync waiting, blob fixtures) and `test-e2e/cloud-utils.js` (local `@comapeo/cloud` servers). Prefer reusing these over writing new setup code.

## Cross-version sync tests

CoMapeo is a p2p app: devices running different released versions of `@comapeo/core` meet in the field and must sync with each other — both directly over encrypted noise streams and via a `@comapeo/cloud` server over websockets. The cross-version tests check that the working tree stays compatible with every version that actually shipped in a released CoMapeo app.

### How the version list is managed

The list lives in [`test-e2e/cross-version/versions.js`](../../test-e2e/cross-version/versions.js): one entry per `@comapeo/core` version that shipped in a released CoMapeo Mobile app, with the app release it shipped in, the `@comapeo/schema` version it uses, and capability flags. The header comment in that file is the canonical procedure for adding and removing versions.

The suite only ever tests *working tree × each shipped version*. This is enough: because every release is tested against all shipped versions **before** it ships, any pair of published versions was already tested when the newer of the two was pre-release. The list grows by one entry per app release (and shrinks when old app lines leave support) — never combinatorially.

Version differences are expressed **only** in the manifest (capability flags) or in [`fixtures.js`](../../test-e2e/cross-version/fixtures.js) (document adapters for old schema versions). Never write `if (version === ...)` inside a test body.

### How old versions are installed

Old versions are installed as npm aliases (`@comapeo/core5.5.0` → `npm:@comapeo/core@5.5.0`) in a separate sub-package, `test-e2e/cross-version/versions/`, with its own committed lockfile:

```sh
npm ci --prefix test-e2e/cross-version/versions
```

This keeps the root `npm ci` fast (the aliases and their native dependencies are only installed when running these tests), keeps PR CI deterministic, and resolves old versions' dependencies without deduplication against the working tree's dependencies.

One caveat, accepted deliberately: the aliases resolve old versions' floating dependency ranges against today's npm registry, not the exact transitive tree a shipped APK locked (the mobile app additionally pins the noise/handshake stack via npm `overrides`). The wire contract itself — protomux channel setup, RPC message ordering, protobuf encode/decode via each version's exact-pinned `@comapeo/schema` — is always the shipped code. The weekly `fresh-install` CI job (below) surfaces drift in the floating ranges.

### What runs when

The [`cross-version.yml`](../../.github/workflows/cross-version.yml) workflow runs:

- **Every PR and push to `main`** — the full suite (`invite`, `p2p-sync`, `blob-sync`, `cloud-sync`), on ubuntu/node 20 only (sync protocol behaviour is OS-independent; OS/node coverage comes from the main CI workflow).
- **Weekly** — the same suite, plus: `fresh-install` (old versions' dependencies resolved fresh, ignoring the lockfile) and `latest-published` (additionally tests `@comapeo/core@latest` and `@comapeo/cloud@latest`, and fails if the latest CoMapeo Mobile release ships a core version missing from the manifest).
- **On dispatch with `old-pairs: true`** — a one-time backfill syncing adjacent pairs of already-published versions. This documents field reality; a failure there cannot be fixed in the versions involved.

### Running locally

```sh
npm run test:cross-version                          # install sub-package + full suite
node --test test-e2e/cross-version/p2p-sync.test.js # a single scenario
CROSS_VERSION_OLD_PAIRS=1 node --test test-e2e/cross-version/old-pairs.test.js
```

Note: old versions of `better-sqlite3` have no prebuilds for node ≥ 21, so run these tests on node 18 or 20.

## How to write tests

- Use node's built-in test runner (`node:test`) and `node:assert/strict`.
- End-to-end tests build real `MapeoManager` instances via `createManager` / `createManagers` (`test-e2e/utils.js`), connect them with `connectPeers` (real TCP + noise streams on localhost) and use `invite`, `waitForPeers` and `waitForSync` to drive flows.
- Register cleanup with `t.after(...)` — the helpers do this for the resources they create.
- Generate documents with `@mapeo/mock-data` (`valueOf(generate('observation')[0])`); for old-schema peers use the adapters in `test-e2e/cross-version/fixtures.js`.
