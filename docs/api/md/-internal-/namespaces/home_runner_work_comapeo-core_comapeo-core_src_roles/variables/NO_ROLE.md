[**API**](../../../../README.md) • **Docs**

***

[API](../../../../README.md) / [\<internal\>](../../../README.md) / ["/home/runner/work/comapeo-core/comapeo-core/src/roles"](../README.md) / NO\_ROLE

# Variable: NO\_ROLE

> `const` **NO\_ROLE**: [`Role`](../../../interfaces/Role.md)\<`"08e4251e36f6e7ed"`\>

This is the role assumed for a device when no role record can be found. This
can happen when an invited device did not manage to sync with the device that
invited them, and they then try to sync with someone else. We want them to be
able to sync the auth and config store, because that way they may be able to
receive their role record, and they can get the project config so that they
can start collecting data.
