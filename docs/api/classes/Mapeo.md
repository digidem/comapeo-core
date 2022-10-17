[API](../README.md) / Mapeo

# Class: Mapeo

**`Property`**

## Table of contents

### Constructors

- [constructor](Mapeo.md#constructor)

### Accessors

- [coreKeys](Mapeo.md#corekeys)
- [cores](Mapeo.md#cores)

### Methods

- [getDataType](Mapeo.md#getdatatype)
- [ready](Mapeo.md#ready)

## Constructors

### constructor

• **new Mapeo**(`options`)

#### Parameters

| Name                | Type         |
| :------------------ | :----------- |
| `options`           | `Object`     |
| `options.corestore` | `Object`     |
| `options.dataTypes` | `DataType`[] |
| `options.sqlite`    | `Database`   |

#### Defined in

[index.js:24](https://github.com/digidem/mapeo-core-next/blob/8584770/index.js#L24)

## Accessors

### coreKeys

• `get` **coreKeys**(): `any`[]

#### Returns

`any`[]

#### Defined in

[index.js:90](https://github.com/digidem/mapeo-core-next/blob/8584770/index.js#L90)

---

### cores

• `get` **cores**(): `any`[]

#### Returns

`any`[]

#### Defined in

[index.js:94](https://github.com/digidem/mapeo-core-next/blob/8584770/index.js#L94)

## Methods

### getDataType

▸ **getDataType**(`block`): `undefined` \| `DataType`

#### Parameters

| Name    | Type     |
| :------ | :------- |
| `block` | `Buffer` |

#### Returns

`undefined` \| `DataType`

#### Defined in

[index.js:103](https://github.com/digidem/mapeo-core-next/blob/8584770/index.js#L103)

---

### ready

▸ **ready**(): `Promise`<`void`\>

#### Returns

`Promise`<`void`\>

#### Defined in

[index.js:83](https://github.com/digidem/mapeo-core-next/blob/8584770/index.js#L83)
