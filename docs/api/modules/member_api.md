[API](../README.md) / member-api

# Module: member-api

## Table of contents

### References

- [Invite](member_api.md#invite)

### Classes

- [MemberApi](../classes/member_api.MemberApi.md)

### Interfaces

- [InviteResponse](../interfaces/member_api.InviteResponse.md)
- [MemberInfo](../interfaces/member_api.MemberInfo.md)

### Type Aliases

- [DeviceInfoDataType](member_api.md#deviceinfodatatype)
- [ProjectDataType](member_api.md#projectdatatype)

### Variables

- [InviteResponse](member_api.md#inviteresponse)

## References

### Invite

Renames and re-exports [InviteRpcMessage](invite_api.md#inviterpcmessage)

## Type Aliases

### DeviceInfoDataType

Ƭ **DeviceInfoDataType**\<\>: [`datatype`](datatype-1.md)

#### Defined in

[src/member-api.js:25](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/member-api.js#L25)

___

### ProjectDataType

Ƭ **ProjectDataType**\<\>: [`datatype`](datatype-1.md)

#### Defined in

[src/member-api.js:26](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/member-api.js#L26)

## Variables

### InviteResponse

• **InviteResponse**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `create` | \<I\>(`base?`: `I`) => [`InviteResponse`](../interfaces/member_api.InviteResponse.md) |
| `decode` | (`input`: `Uint8Array` \| `Reader`, `length?`: `number`) => [`InviteResponse`](../interfaces/member_api.InviteResponse.md) |
| `encode` | (`message`: [`InviteResponse`](../interfaces/member_api.InviteResponse.md), `writer`: `Writer`) => `Writer` |
| `fromPartial` | \<I\>(`object`: `I`) => [`InviteResponse`](../interfaces/member_api.InviteResponse.md) |

#### Defined in

[src/generated/rpc.ts:18](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/rpc.ts#L18)

[src/generated/rpc.ts:265](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/rpc.ts#L265)
