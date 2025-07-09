export enum Kinds {
  CHECK,
  TUPLE,
  WRITE,
  FILTER_ENTITY,
  PERMISSIONS,
  ENTITY,
  FILTER_SUBJECT,
}

export type Subject<Entities extends string, Permissions extends string, Output> = Record<
	Entities,
	(id: string | string[]) => Permission<Entities, Permissions, Output>
>

export type Permission<Entities extends string, Permissions extends string, Output> = Record<
	Permissions,
	Entity<Entities, Output>
>

export type Entity<Entities extends string, Output> = Record<
	Entities,
	(id?: string | string[], attributes?: object) => Output
>


export interface Adapter<Entities> {
  fullDisconnect(...entities: EntityRef[]): Promise<void>
  connect(...tuples: Tuple[]): Promise<void>
}
