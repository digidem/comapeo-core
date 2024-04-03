import type { TypedEmitter } from 'tiny-typed-emitter'

export type TypedEvents<T extends TypedEmitter<any>> = T extends TypedEmitter<
  infer Result
>
  ? Result
  : never

export type TypedEventsFor<T extends TypedEmitter<any>> = keyof TypedEvents<T>

export type TypedEventArgs<
  Emitter extends TypedEmitter<any>,
  Event extends TypedEventsFor<Emitter>
> = Parameters<TypedEvents<Emitter>[Event]>
