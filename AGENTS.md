# AGENTS.md — comapeo-core

## What this is

`@comapeo/core` — an **offline-first, peer-to-peer library** for collaborating on
mapping projects. It is consumed by the [mobile](https://github.com/digidem/comapeo-mobile)
and [desktop](https://github.com/digidem/comapeo-desktop) CoMapeo apps, not run directly.
It bundles Hypercore-based replication, a SQLite (Drizzle) indexing layer, encryption
(`@comapeo/crypto`), project membership/invites (including over-the-internet invite
links), a Fastify HTTP layer for serving blobs/icons/maps, and sync orchestration.

## Language & Runtime

- **Plain JavaScript (ESM)** — source is `.js`, no build step for JS. `import`/`export` only, never `require`.
- **Node.js 18** (`.nvmrc` = `18`; CI runs `18.x` and `20.x`).
- Types are expressed via **JSDoc** comments and a few `.ts` type files (`src/types.ts`,
  `src/utils_types.d.ts`, `src/generated/*.ts`), checked by `tsc --noEmit` with `checkJs`.
  There is **no** `ts-node`/transpile step — you never run `.ts`.
- **Prettier**: `semi: false`, `singleQuote: true` (config in `package.json`).
  No semicolons, single quotes.

## Commands

| Task                              | Command                                                  |
| --------------------------------- | -------------------------------------------------------- |
| Run everything (lint→types→tests) | `npm test`                                               |
| Lint                              | `npm run lint` (`eslint --cache .`)                      |
| Format                            | `npm run format` (`prettier . --write`)                  |
| Check formatting                  | `npm run test:prettier` (`prettier --check .`)           |
| Type-check                        | `npm run type` (`tsc`)                                   |
| Unit tests                        | `npm run test:unit` (`node --test`)                      |
| E2E tests                         | `npm run test:e2e` (`node --test test-e2e/**/*.js`)      |
| Type tests                        | `npm run test:types` (`tsc -p test-types/tsconfig.json`) |
| Build type declarations           | `npm run build:types` (emits `.d.ts` to `dist/`)         |
| Regenerate protobuf code          | `npm run protobuf` (from `proto/` → `src/generated/`)    |
| Generate Drizzle migrations       | `npm run db:generate:project` / `db:generate:client`     |
| Run a single test file            | `node --test test/data-type.js`                          |

`npm test` runs, in order: `lint`, `test:prettier`, `build:types`, `type`, `test:unit`,
`test:e2e`, `test:types`. **All of these must pass.**

## Workflow

When making code changes:

1. **Write/extend tests.** Unit tests live in `test/`, integration/end-to-end in
   `test-e2e/`. Don't ship non-trivial behavior without a test.
2. **Run `npm run lint` and `npm run format` after each logical change.**
3. **Run `npm run type`** — JSDoc type errors are real failures.
4. **Run `npm test` when done.** All of lint, prettier, types, unit, and e2e must pass.

## Project Structure

```
src/
  index.js            Public API surface (MapeoManager, FastifyController, roles, replicateProject)
  mapeo-manager.js    MapeoManager — top-level device object; owns client DB, projects, peers
  mapeo-project.js    MapeoProject — one project instance (cores, sync, membership, invites)
  fastify-controller.js  HTTP request handling / RPC bridge for the app
  fastify-plugins/    Fastify route plugins: blobs.js, icons.js, maps.js
  local-peers.js      LocalPeers — protomux-based peer RPC over (Noise) streams
  roles.js            Role IDs (creator/coordinator/member) and role helpers
  member-api.js       Membership operations (invite, accept, block, role changes)
  invite/             Invite logic: invite-api, invite-links-api, invite-link-joiner, invite-urls, state machine
  discovery/          local-discovery.js (LAN) and remote-discovery.js (internet/hyperdht)
  core-manager/       CoreManager — hypercore namespaces, indexer, file pool, bitfield RLE
  datastore/          DataStore — read cores for indexing + write/read docs in a namespace
  datatype/           DataType — CRUD + query over one data type (uses DataStore + SQLite)
  index-writer/       IndexWriter — decode hypercore entries → SQLite materialized views
  blob-store/         Media/blob storage (variants: original/preview/thumbnail), Hyperdrive
  icon-api.js         Icon CRUD + HTTP serving glue
  translation-api.js  i18n of doc fields (translation docs)
  schema.js           Re-exports @comapeo/schema (JSON schemas, encode/decode, valueOf)
  schema/             Drizzle table definitions: project.js (per-project DB) + client.js (device DB)
  generated/          **GENERATED** protobuf types — DO NOT hand-edit
  errors.js           All known error classes + error helpers
  logger.js           Debug-based logger
  constants.js        NAMESPACES, etc.
  types.ts            Shared TS type definitions
drizzle/              Generated SQL migrations: drizzle/project, drizzle/client
proto/                Protobuf sources (input to `npm run protobuf`)
scripts/build-messages.js   Protobuf codegen
test/                 Unit tests + test/helpers/ (create-core, core-manager, blob-store, ...)
test-e2e/             Integration / cross-device / cross-version tests
test-types/           Compile-only type tests
benchmarks/           nanobench scripts
docs/                 concepts/, guides/, development/
```

## Key Conventions

### Errors (`src/errors.js`)

- Every known error is a class from `custom-error-creator` with a `code` string and an
  HTTP-style `status` number. A **KnownError** is `Error & { status: number, code: string }`.
- Prefer throwing a specific existing error. If none fits, add one in `errors.js`
  (exported at top level) — don't throw a bare `Error` for user-facing/expected failures.
- Helpers: `ensureKnownError(err)` coerces unknown errors to `UnknownError`;
  `getErrorCode(err)`; `nullIfNotFound(err)` returns `null` for `NotFoundError`.
- `ExhaustivenessError` is thrown in `default:` cases of exhaustive `switch`es.

### Private methods via `Symbol`s

Cross-module "private" methods are exported `Symbol` constants, conventionally
`k`-prefixed (e.g. `kProjectReplicate`, `kBlobStore`, `kClearData`,
`kCreateWithDocId`, `kRequestFullStop`). Call them as `obj[kSomething]()` and define them
on the class as `[kSomething]` method names. This is the established pattern for reaching
into another module's internals without polluting the public API. True private state uses
`#` class fields.

### Data model: DataStore → DataType → IndexWriter

- **DataStore** manages a hypercore _namespace_; it reads entries from all cores in the
  namespace for indexing, and writes docs to the writer core. It calls its `batch()`
  option with entries read from cores; a write resolves only once `batch()` resolves.
- **IndexWriter** decodes entries and writes them to the matching Drizzle table (the
  per-`docId` "head" materialized view). One table per data type.
- **DataType** is the CRUD/query API over one data type, backed by a DataStore (history)
  and the SQLite index (current state).
- Namespace list lives in `constants.js` (`NAMESPACES`, `PRESYNC_NAMESPACES`,
  `DATA_NAMESPACES`).

### Databases (Drizzle + better-sqlite3)

- **Two distinct DBs.** The _client_ DB (device-level: device settings, project keys,
  project settings list) is one SQLite file (`client.db`). Each project has its own
  _project_ DB (`{projectId}.db`) with one table per data type + backlink tables.
- Table schemas: `src/schema/client.js` and `src/schema/project.js`. Project tables are
  derived from `@comapeo/schema` JSON schemas via `comapeo-to-drizzle.js`.
- Migrations are generated into `drizzle/client` and `drizzle/project`. After changing a
  schema file, run the matching `db:generate:*` script and commit the new SQL + `meta/`.
- `:memory:` is supported for both DBs (used heavily in tests).

### Protobuf / generated code (`src/generated/`)

- `src/generated/*` is produced from `proto/` by `npm run protobuf`. **Do not edit it by
  hand** — edit the `.proto` files and regenerate. (TypeScript compilation of it is part
  of the codegen.)

### Events

- `MapeoManager` and peers extend `TypedEmitter` (`tiny-typed-emitter`). Event maps are
  documented with `@typedef {...Events}` JSDoc (e.g. `MapeoManagerEvents`).
- Internal control signals (sync stop/resume, etc.) are `Symbol`-keyed methods, not events.

### HTTP (Fastify)

- The app passes in a Fastify instance; `MapeoManager` registers blob/icon/map plugins
  under the `blobs`/`icons`/`maps` prefixes. `FastifyController` + `fastify-plugins/`
  implement the request handlers. Don't hardcode ports/URLs — resolve them (e.g.
  `getFastifyServerAddress`).

### Design

- **Configurable over hardcoded.** Paths, URLs, timeouts, and tunables are constructor
  options on `MapeoManager` (see the JSDoc `@param` list) with sensible defaults as
  module-level constants (e.g. `UNTRUSTED_TIMEOUT`, `INITIAL_SYNC_TIMEOUT_MS`).
- **Constructor DI.** `MapeoManager` takes `fastify`, `coreStorage`, `makeWebsocket`,
  `swarm`, etc. as options so the app can inject real or fake implementations — tests rely
  on this. Follow it: inject dependencies rather than importing singletons.
- **Keys are derived, never stored in the clear.** Device/project keypairs derive from a
  `rootKey` via `KeyManager`; project `encryptionKeys` are encrypted at rest in the client
  DB (`keysCipher`) and only decrypted when needed.

## Testing

- Built-in `node:test` + **`node:assert/strict`** (never plain `node:assert` — it's a lint
  error).
- No mocking framework. Tests are self-contained and use fakes/injection.
- **In-memory storage for speed & isolation:** SQLite via `new Database(':memory:')` and
  cores via `random-access-memory` (`RAM`). Migrations run from
  `new URL('../drizzle/project', import.meta.url).pathname` (and `client` where relevant).
- `test/helpers/` has shared builders: `create-core.js`, `core-manager.js`,
  `blob-store.js`, `local-peers.js`, `events.js`, `default-config.js`. Use them rather than
  re-wiring cores/DBs by hand.
- Unit tests mirror source layout (e.g. `test/data-type.js` for `src/datatype/`);
  multi-device/cross-version scenarios go in `test-e2e/`.
- Run one file: `node --test test/data-type.js`.

## Code Style

- **No semicolons, single quotes** (Prettier enforces; `npm run format`).
- `import`/`export` (ESM), never `require`.
- ESLint is strict: `eqeqeq`, `prefer-const`, `no-var`, `default-case` (+`default-case-last`),
  `curly` (multi-line), no unused vars (`_`-prefixed ignored).
- JSDoc on all exported functions/classes/methods. `@ts-expect-error` sparingly and with a reason.
- Private class fields use `#`; cross-module private methods use `Symbol`s.
- Error messages are user-facing — keep them helpful but concise.

## Commit Messages

Conventional Commits style: `type: summary`.

| Type       | Use for                                                   |
| ---------- | --------------------------------------------------------- |
| `feat`     | New capabilities (APIs, data types, sync/invite behavior) |
| `fix`      | Bug fixes, edge cases, incorrect behavior                 |
| `refactor` | Restructuring without behavior change                     |
| `perf`     | Performance improvements                                  |
| `test`     | Adding or fixing tests                                    |
| `docs`     | Documentation changes (incl. AGENTS.md, README, docs/)    |
| `chore`    | Housekeeping — formatting, deps, types, lockfile, codegen |

Rules:

- **One line.** Short, natural description. No trailing period.
- **No scope.** The type prefix is enough.
- **Name the thing** being changed:
  - `feat: accept a pre-derived master key in MapeoManager`
  - `fix: no double close event on projects`
  - `test: check that concurrent getProject resolves to the same project`
  - `chore: fix lockfile`
- Don't prefix with "WIP" or "update" — commit in logical units.

## Keeping AGENTS.md Current

Update this file when a change would cause a _new_ agent (or a future-you with amnesia) to
do something wrong or waste time:

**Update when:** a new top-level module or `src/` subdirectory is added; a public API or
`MapeoManager` option changes contract; a data type / namespace is added; a build/test/lint
command changes; a new dependency changes the dev workflow; a convention is established or
retired; a gotcha is discovered that cost time to figure out.

**Don't update for:** internal refactors that don't change external contracts, bug fixes
that don't alter structure, or content changes within existing files.

The test: _"Would an agent reading only this file make a mistake or get confused?"_ If
yes, update it.

## Gotchas

- **No JS build step.** Edit `.js` directly. `npm run build` only emits `.d.ts` to `dist/`
  for the published package — it doesn't transform source.
- **`src/generated/` is codegen output.** Change `proto/` and run `npm run protobuf`;
  never hand-edit generated files.
- **Two DBs, two migration folders.** Client-level state ≠ project-level state. Put tables
  in the right `src/schema/*.js` and generate into the right `drizzle/*` folder.
- **`MapeoManager.getProject()` caches instances** in `#activeProjects` (and dedupes
  in-flight lookups in `#pendingProjects`). Don't construct `MapeoProject` directly —
  always go through `getProject()` so a single instance owns a project's storage.
- **`addProject` / `leaveProject` manage encrypted keys + `hasLeftProject`** in the client
  DB; a left project's data is cleared on next open. Be careful not to write data after a
  project is marked left.
- **Writes block on indexing.** A `DataStore` write only resolves after `batch()` (the
  index write) resolves — that's intentional; don't "fix" it by fire-and-forgetting.
- **`node:assert` is banned** by lint — always `node:assert/strict`.
- **Tests must not touch the network or real disk.** Use `:memory:` SQLite, `RAM` cores,
  and injected fakes (`makeWebsocket`, `coreStorage`, `swarm`).
