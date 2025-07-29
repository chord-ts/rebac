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

export type MultiRef = {
  type: string
  id: string | string[]
}


export interface Adapter {
  deleteEntities(...entities: MultiRef[]): Promise<void>

  writeRelations(...tuples: Tuple[]): Promise<void>

  check(target: Tuple): Promise<boolean>
  grantedActions(target: Tuple): Promise<Record<string, boolean>>
  grantedSubjects(target: Tuple): Promise<string[]>
  grantedEntities(target: Tuple): Promise<string[]>
}
