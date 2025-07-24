export enum EntryPoint {
  CAN,
  TUPLE,
  WHERE,
  WHAT,
  ENTITY,
  WHO,
}

export type Subject<
  Entities extends string,
  Permissions extends string,
  Output,
> = Record<
  Entities,
  (id: string | string[]) => Permission<Entities, Permissions, Output>
>

export type Permission<
  Entities extends string,
  Permissions extends string,
  Output,
> = Record<Permissions, Entity<Entities, Output>>

export type Entity<Entities extends string, Output> = Record<
  Entities,
  (id?: string | string[], attributes?: object) => Output
>

export type Attribute = {
  entity: Ref
  attribute: string
  value: unknown
}

export type Tuple = {
  entity: Ref
  permission?: string
  relation?: string
  subject: Ref
  attrs: Attribute[] // TODO extend types
  __entryPoint?: EntryPoint
}

export type Ref = {
  type: string
  id: string
}

export interface Adapter<Entities, Relations, Subjects> {
  fullDisconnect(...entities: Ref[]): Promise<void>
  connect(...tuples: Tuple[]): Promise<void>
}
