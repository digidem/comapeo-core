[**API**](../../README.md) • **Docs**

***

[API](../../README.md) / [\<internal\>](../README.md) / EntryWatcher

# Class: EntryWatcher\<T\>

## Extends

- `TypedEmitter`\<`object`\>

## Type Parameters

• **T**

## Constructors

### new EntryWatcher()

> **new EntryWatcher**\<`T`\>(): [`EntryWatcher`](EntryWatcher.md)\<`T`\>

#### Returns

[`EntryWatcher`](EntryWatcher.md)\<`T`\>

#### Inherited from

`TypedEmitter<{
    update: () => void
  }>.constructor`

## Properties

### node

> **node**: `object`

#### key

> **key**: `string`

#### seq

> **seq**: `number`

#### value

> **value**: `T`

## Methods

### close()

> **close**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>
