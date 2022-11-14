[API](../README.md) / [lib/datatype](../modules/lib_datatype.md) / DataType

# Class: DataType

[lib/datatype](../modules/lib_datatype.md).DataType

The DataType class is used to define the schema and encoding of a document type.

## Table of contents

### Constructors

- [constructor](lib_datatype.DataType.md#constructor)

### Properties

- [blockPrefix](lib_datatype.DataType.md#blockprefix)
- [name](lib_datatype.DataType.md#name)
- [schema](lib_datatype.DataType.md#schema)

### Methods

- [decode](lib_datatype.DataType.md#decode)
- [encode](lib_datatype.DataType.md#encode)
- [validate](lib_datatype.DataType.md#validate)

## Constructors

### constructor

• **new DataType**(`options`)

#### Parameters

| Name                  | Type                                                                           |
| :-------------------- | :----------------------------------------------------------------------------- |
| `options`             | `Object`                                                                       |
| `options.blockPrefix` | `string`                                                                       |
| `options.decode`      | `undefined` \| [`DecodeDataType`](../types/lib_datatype.DecodeDataType.md)     |
| `options.encode`      | `undefined` \| [`EncodeDataType`](../types/lib_datatype.EncodeDataType.md)     |
| `options.name`        | `string`                                                                       |
| `options.schema`      | `Object`                                                                       |
| `options.validate`    | `undefined` \| [`ValidateDataType`](../types/lib_datatype.ValidateDataType.md) |

#### Defined in

[lib/datatype/index.js:56](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/datatype/index.js#L56)

## Properties

### blockPrefix

• **blockPrefix**: `string`

#### Defined in

[lib/datatype/index.js:58](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/datatype/index.js#L58)

---

### name

• **name**: `string`

#### Defined in

[lib/datatype/index.js:57](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/datatype/index.js#L57)

---

### schema

• **schema**: `Object`

#### Defined in

[lib/datatype/index.js:59](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/datatype/index.js#L59)

## Methods

### decode

▸ **decode**(`block`): `Object`

#### Parameters

| Name    | Type     |
| :------ | :------- |
| `block` | `Buffer` |

#### Returns

`Object`

#### Defined in

[lib/datatype/index.js:105](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/datatype/index.js#L105)

---

### encode

▸ **encode**(`doc`): `Buffer`

#### Parameters

| Name  | Type     |
| :---- | :------- |
| `doc` | `Object` |

#### Returns

`Buffer`

#### Defined in

[lib/datatype/index.js:97](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/datatype/index.js#L97)

---

### validate

▸ **validate**(`doc`): `boolean` \| `PromiseLike`<`boolean`\>

**`Throws`**

#### Parameters

| Name  | Type     |
| :---- | :------- |
| `doc` | `Object` |

#### Returns

`boolean` \| `PromiseLike`<`boolean`\>

#### Defined in

[lib/datatype/index.js:82](https://github.com/digidem/mapeo-core-next/blob/8584770/lib/datatype/index.js#L82)
