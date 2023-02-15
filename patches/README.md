## Patches

These are needed until https://github.com/holepunchto/hyperdrive-next/pull/28 is
merged, because otherwise non-downloaded entries will just result in a hang,
because it is not possible to pass `options.wait = false` (the default for
hypercore is `options.wait = true` which causes the `.get()` method to continue
waiting for a block to download indefinitely)
