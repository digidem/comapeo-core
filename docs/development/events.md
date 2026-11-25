# TypedEmitters & events

CoMapeo core uses [tiny-typed-emitter](https://www.npmjs.com/package/tiny-typed-emitter)
for all intra-process pub/sub. `MapeoManager`, `MapeoProject`, peers, and most API
classes (`DataType`, `DataStore`, `InviteApi`, `SyncApi`, `LocalPeers`, etc.) extend
`TypedEmitter`.

## Declaring an emitter

Declare the event map as a JSDoc `@typedef` next to the class, then `@extends` it:

```js
import { TypedEmitter } from 'tiny-typed-emitter'

/**
 * @typedef {object} MyEvents
 * @property {(peerId: string, invite: Invite) => void} invite
 * @property {(docIds: Set<string>) => void} update
 */

/**
 * @extends {TypedEmitter<MyEvents>}
 */
export class MyThing extends TypedEmitter {
  // ...
}
```

Some classes are typed as `ReadyResource & TypedEmitter<...>` (e.g. `CoreManager`,
`MapeoProject`). `ReadyResource` already extends `TypedEmitter`, so you get its
`ready`/`error` events in addition to yours.

Rules for the typedef:

- Name it `<ClassName>Events` (a few older ones are just `Events` — prefer the
  suffixed name).
- One `@property` per event. The **event name** is the property key; the **argument
  list** is the function signature.
- Use named arguments (`peerId`, `invite`) — no unnamed/positional args.

## Emitting

```js
this.emit('invite', peerId, invite)
```

Args are positional and must match the declared signature, in order.

## Subscribing

```js
emitter.on('invite', (peerId, invite) => { /* ... */ })
emitter.once('update', (docIds) => { /* ... */ })
emitter.off('invite', handler)
```

## Error events

When an event reports an error, **the error must be a `KnownError` and must be the
only argument** to that event.

- Use a `KnownError` (`Error & { status: number, code: string }`), not a bare
  `Error`. Coerce unknown errors with `ensureKnownError(err)` from `src/errors.js`.
- Don't mix the error with other payload args. If you need to report an error *and*
  carry data, prefer a dedicated error event (name it `error` or `<thing>-error`)
  over stuffing an `error` field into a data event.

```js
// Good — known error, only arg (see remote-discovery.js)
this.emit('error', ensureKnownError(err))

// Bad — bare Error, and not the only arg
this.emit('map-share-error', new Error('nope'), mapShare)
this.emit('join-request-update', update, maybeError)
```

`KnownError` gives subscribers a stable `code` to branch on and a `status` for
HTTP-style handling, so they can distinguish expected failures from unexpected ones
without string-matching messages.
