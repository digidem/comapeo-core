[API](../README.md) / [lib/datastore](../modules/lib_datastore.md) / DataStore

# Class: DataStore

[lib/datastore](../modules/lib_datastore.md).DataStore

The DataStore class provides methods for managing a single type of data.

## Table of contents

### Constructors

- [constructor](lib_datastore.DataStore.md#constructor)

### Methods

- [create](lib_datastore.DataStore.md#create)
- [decode](lib_datastore.DataStore.md#decode)
- [encode](lib_datastore.DataStore.md#encode)
- [getById](lib_datastore.DataStore.md#getbyid)
- [query](lib_datastore.DataStore.md#query)
- [ready](lib_datastore.DataStore.md#ready)
- [update](lib_datastore.DataStore.md#update)
- [validate](lib_datastore.DataStore.md#validate)

## Constructors

### constructor

• **new DataStore**(`options`)

#### Parameters

| Name                | Type                                   | Description                                                       |
| :------------------ | :------------------------------------- | :---------------------------------------------------------------- |
| `options`           | `Object`                               |                                                                   |
| `options.corestore` | `Object`                               | an instance of the [Corestore](https://npmjs.com/corestore) class |
| `options.dataType`  | [`DataType`](lib_datatype.DataType.md) | an instance of the [DataType](../datatype/) class                 |
| `options.indexer`   | [`Indexer`](lib_indexer.Indexer.md)    | an instance of the [Indexer](../indexer/) class                   |

#### Defined in

[lib/datastore/index.js:18](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/datastore/index.js#L18)

## Methods

### create

▸ **create**(`data`): `Promise`<`Object`\>

Create a doc

#### Parameters

| Name   | Type     |
| :----- | :------- |
| `data` | `Object` |

#### Returns

`Promise`<`Object`\>

#### Defined in

[lib/datastore/index.js:76](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/datastore/index.js#L76)

---

### decode

▸ **decode**(`block`): `Object`

Decode a block (a Buffer), to a doc (an object)

#### Parameters

| Name    | Type     |
| :------ | :------- |
| `block` | `Buffer` |

#### Returns

`Object`

#### Defined in

[lib/datastore/index.js:58](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/datastore/index.js#L58)

---

### encode

▸ **encode**(`doc`): `Buffer`

Encode a doc (an object), to a block (a Buffer)

#### Parameters

| Name  | Type     |
| :---- | :------- |
| `doc` | `Object` |

#### Returns

`Buffer`

#### Defined in

[lib/datastore/index.js:49](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/datastore/index.js#L49)

---

### getById

▸ **getById**(`id`): `Object`

Get a doc by id

#### Parameters

| Name | Type     |
| :--- | :------- |
| `id` | `string` |

#### Returns

`Object`

#### Defined in

[lib/datastore/index.js:67](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/datastore/index.js#L67)

---

### query

▸ **query**(`where?`): `Object`[]

Query indexed docs

#### Parameters

| Name     | Type     | Description      |
| :------- | :------- | :--------------- |
| `where?` | `string` | sql where clause |

#### Returns

`Object`[]

#### Defined in

[lib/datastore/index.js:129](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/datastore/index.js#L129)

---

### ready

▸ **ready**(): `Promise`<`void`\>

Wait for the corestore and writer hypercore to be ready

#### Returns

`Promise`<`void`\>

#### Defined in

[lib/datastore/index.js:29](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/datastore/index.js#L29)

---

### update

▸ **update**(`data`): `Promise`<`Object`\>

Update a doc

#### Parameters

| Name   | Type     |
| :----- | :------- |
| `data` | `Object` |

#### Returns

`Promise`<`Object`\>

#### Defined in

[lib/datastore/index.js:106](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/datastore/index.js#L106)

---

### validate

▸ **validate**(`doc`): `boolean` \| `PromiseLike`<`boolean`\>

Validate a doc

**`Throws`**

#### Parameters

| Name  | Type     |
| :---- | :------- |
| `doc` | `Object` |

#### Returns

`boolean` \| `PromiseLike`<`boolean`\>

#### Defined in

[lib/datastore/index.js:40](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/datastore/index.js#L40)
