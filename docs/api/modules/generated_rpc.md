[API](../README.md) / generated/rpc

# Module: generated/rpc

## Table of contents

### References

- [Invite](generated_rpc.md#invite)
- [InviteCancel](generated_rpc.md#invitecancel)
- [InviteResponse](generated_rpc.md#inviteresponse)
- [ProjectJoinDetails](generated_rpc.md#projectjoindetails)

### Interfaces

- [DeviceInfo](../interfaces/generated_rpc.DeviceInfo.md)

### Type Aliases

- [DeviceInfo\_DeviceType](generated_rpc.md#deviceinfo_devicetype)
- [InviteResponse\_Decision](generated_rpc.md#inviteresponse_decision)

### Variables

- [DeviceInfo](generated_rpc.md#deviceinfo)
- [DeviceInfo\_DeviceType](generated_rpc.md#deviceinfo_devicetype-1)
- [InviteResponse\_Decision](generated_rpc.md#inviteresponse_decision-1)

### Functions

- [deviceInfo\_DeviceTypeFromJSON](generated_rpc.md#deviceinfo_devicetypefromjson)
- [deviceInfo\_DeviceTypeToNumber](generated_rpc.md#deviceinfo_devicetypetonumber)
- [inviteResponse\_DecisionFromJSON](generated_rpc.md#inviteresponse_decisionfromjson)
- [inviteResponse\_DecisionToNumber](generated_rpc.md#inviteresponse_decisiontonumber)

## References

### Invite

Renames and re-exports [InviteRpcMessage](invite_api.md#inviterpcmessage)

___

### InviteCancel

Re-exports [InviteCancel](invite_api.md#invitecancel)

___

### InviteResponse

Re-exports [InviteResponse](member_api.md#inviteresponse)

___

### ProjectJoinDetails

Re-exports [ProjectJoinDetails](invite_api.md#projectjoindetails)

## Type Aliases

### DeviceInfo\_DeviceType

Ƭ **DeviceInfo\_DeviceType**: typeof [`DeviceInfo_DeviceType`](generated_rpc.md#deviceinfo_devicetype-1)[keyof typeof [`DeviceInfo_DeviceType`](generated_rpc.md#deviceinfo_devicetype-1)]

#### Defined in

[src/generated/rpc.ts:75](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/rpc.ts#L75)

[src/generated/rpc.ts:82](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/rpc.ts#L82)

___

### InviteResponse\_Decision

Ƭ **InviteResponse\_Decision**: typeof [`InviteResponse_Decision`](generated_rpc.md#inviteresponse_decision-1)[keyof typeof [`InviteResponse_Decision`](generated_rpc.md#inviteresponse_decision-1)]

#### Defined in

[src/generated/rpc.ts:23](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/rpc.ts#L23)

[src/generated/rpc.ts:30](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/rpc.ts#L30)

## Variables

### DeviceInfo

• **DeviceInfo**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `create` | \<I\>(`base?`: `I`) => [`DeviceInfo`](../interfaces/generated_rpc.DeviceInfo.md) |
| `decode` | (`input`: `Uint8Array` \| `Reader`, `length?`: `number`) => [`DeviceInfo`](../interfaces/generated_rpc.DeviceInfo.md) |
| `encode` | (`message`: [`DeviceInfo`](../interfaces/generated_rpc.DeviceInfo.md), `writer`: `Writer`) => `Writer` |
| `fromPartial` | \<I\>(`object`: `I`) => [`DeviceInfo`](../interfaces/generated_rpc.DeviceInfo.md) |

#### Defined in

[src/generated/rpc.ts:70](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/rpc.ts#L70)

[src/generated/rpc.ts:390](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/rpc.ts#L390)

___

### DeviceInfo\_DeviceType

• `Const` **DeviceInfo\_DeviceType**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `UNRECOGNIZED` | ``"UNRECOGNIZED"`` |
| `desktop` | ``"desktop"`` |
| `mobile` | ``"mobile"`` |
| `tablet` | ``"tablet"`` |

#### Defined in

[src/generated/rpc.ts:75](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/rpc.ts#L75)

[src/generated/rpc.ts:82](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/rpc.ts#L82)

___

### InviteResponse\_Decision

• `Const` **InviteResponse\_Decision**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `ACCEPT` | ``"ACCEPT"`` |
| `ALREADY` | ``"ALREADY"`` |
| `REJECT` | ``"REJECT"`` |
| `UNRECOGNIZED` | ``"UNRECOGNIZED"`` |

#### Defined in

[src/generated/rpc.ts:23](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/rpc.ts#L23)

[src/generated/rpc.ts:30](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/rpc.ts#L30)

## Functions

### deviceInfo\_DeviceTypeFromJSON

▸ **deviceInfo_DeviceTypeFromJSON**(`object`): [`DeviceInfo_DeviceType`](generated_rpc.md#deviceinfo_devicetype)

#### Parameters

| Name | Type |
| :------ | :------ |
| `object` | `any` |

#### Returns

[`DeviceInfo_DeviceType`](generated_rpc.md#deviceinfo_devicetype)

#### Defined in

[src/generated/rpc.ts:84](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/rpc.ts#L84)

___

### deviceInfo\_DeviceTypeToNumber

▸ **deviceInfo_DeviceTypeToNumber**(`object`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `object` | [`DeviceInfo_DeviceType`](generated_rpc.md#deviceinfo_devicetype) |

#### Returns

`number`

#### Defined in

[src/generated/rpc.ts:102](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/rpc.ts#L102)

___

### inviteResponse\_DecisionFromJSON

▸ **inviteResponse_DecisionFromJSON**(`object`): [`InviteResponse_Decision`](generated_rpc.md#inviteresponse_decision)

#### Parameters

| Name | Type |
| :------ | :------ |
| `object` | `any` |

#### Returns

[`InviteResponse_Decision`](generated_rpc.md#inviteresponse_decision)

#### Defined in

[src/generated/rpc.ts:32](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/rpc.ts#L32)

___

### inviteResponse\_DecisionToNumber

▸ **inviteResponse_DecisionToNumber**(`object`): `number`

#### Parameters

| Name | Type |
| :------ | :------ |
| `object` | [`InviteResponse_Decision`](generated_rpc.md#inviteresponse_decision) |

#### Returns

`number`

#### Defined in

[src/generated/rpc.ts:50](https://github.com/digidem/mapeo-core-next/blob/53dc843a45bb963f7a880f5f7973107d5b1fb99c/src/generated/rpc.ts#L50)
