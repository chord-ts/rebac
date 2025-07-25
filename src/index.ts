import {
  EntryPoint,
  type Adapter,
  type Ref,
  type Subject,
  type Tuple,
} from './types'

// 	can.project(id).delete.member(id)
// await fullDisconnect(entity.dbtProfile(id))
// await fullDisconnect(entity.dbtBranch(`${projectId}_${branchId}`))

export class ReBAC<
  Entities extends string,
  Relations extends string,
  Permissions extends string,
> {
  private readonly adapter: Adapter<Entities, Relations, Permissions>

  constructor(adapter: Adapter<Entities, Relations, Permissions>) {
    this.adapter = adapter
    console.log(this.adapter)
  }

  public get who() {
    return this.#subject(EntryPoint.WHO)
  }

  public get can() {
    return this.#subject(EntryPoint.CAN)
  }

  public get what() {
    return this.#subject(EntryPoint.WHAT) as Subject<
      Entities,
      'canDo',
      Promise<Record<Permissions | Relations, boolean>>
    >
  }

  public get where() {
    return this.#subject(EntryPoint.WHERE)
  }

  public get tuple() {
    return this.#subject(EntryPoint.TUPLE)
  }

  public get entity() {
    return this.#entity<Relations, Tuple>({
      __entryPoint: EntryPoint.ENTITY,
      // @ts-ignore
      entity: {},
    }) as unknown as Record<
      Entities | Relations,
      (id: string | string[]) => Ref
    >
  }

  // Parameters<typeof permify.data.write>[0]['tuples'])
  public async connect(...tuples: Tuple[]) {
    for (const tuple of tuples) {
      if (
        typeof tuple.subject.id === 'object' ||
        typeof tuple.entity.id === 'object'
      ) {
        throw Error(
          `@chord-ts/rebac: Wrong tuple for connect. Id must be string: ${JSON.stringify(tuple)}`,
        )
      }
    }
    this.adapter.writeRelations(...tuples)
  }

  public async disconnect(...tuples: Tuple[]) {
    const promises: Promise<unknown>[] = []
    for (const tuple of tuples) {
      if (!Array.isArray(tuple.entity.id) || !Array.isArray(tuple.subject.id)) {
        throw Error(
          `Permify - wrong tuple for disconnect. Subject and entity ids must be arrays of ids: ${JSON.stringify(tuple)}`,
        )
      }

      promises.push(
        permify.data.delete({
          tenantId,
          tupleFilter: {
            entity: {
              type: tuple.entity.type,
              ids: tuple.entity.id as string[],
            },
            relation: tuple.relation,
            subject: {
              type: tuple.subject.type,
              ids: tuple.subject.id as string[],
            },
          },
          attributeFilter: {},
        }),
      )
    }

    await Promise.all(promises)
  }

  // Удаляет все связи сущности (в виде Entity и Subject)
  public async fullDisconnect(...entities: EntityRef[]) {
    const promises: Promise<unknown>[] = []
    for (const entity of entities) {
      entity.id = typeof entity.id === 'string' ? [entity.id] : entity.id

      promises.push(
        permify.data.delete({
          tenantId,
          tupleFilter: {
            entity: {
              type: entity.type,
              ids: entity.id as string[],
            },
          },
          attributeFilter: {},
        }),
      )
      promises.push(
        permify.data.delete({
          tenantId,
          tupleFilter: {
            subject: {
              type: entity.type,
              ids: entity.id as string[],
            },
          },
          attributeFilter: {},
        }),
      )
    }
    await Promise.all(promises)
  }

  // First word
  #subject<Entities, Relations>(kind: EntryPoint) {
    const template = {
      entity: { type: '', id: '' },
      permission: '',
      subject: { type: '', id: '' },
      attrs: [],
      __entryPoint: kind,
    } as Tuple
    const permission = this.#permission

    return new Proxy(template, {
      get(target, prop, receiver) {
        target = structuredClone(template)
        target.subject.type = prop.toString()
        return (id: string) => {
          target.subject.id = id
          return permission<Entities, Relations>(target)
        }
      },
    })
  }

  // Second word
  #permission<Entities, Relations>(target: Tuple) {
    const subject = this.#entity<Entities, Relations>(target)
    return new Proxy(target, {
      get(target, prop, receiver) {
        target.permission = prop.toString()
        return subject
      },
    })
  }

  // third word
  #entity<T, P>(target: Tuple) {
    const { adapter } = this
    return new Proxy(target, {
      get(target, prop, receiver) {
        target.entity.type = prop.toString()

        if (target.__entryPoint === EntryPoint.TUPLE) {
          return (id: string, attrs?: Attributes) => {
            target.entity.id = id
            return {
              entity: target.entity,
              relation: target.permission,
              subject: target.subject,
              attrs: Object.entries(attrs ?? {}).map(([k, v]) => ({
                entity: { type: prop, id },
                attribute: k,
                value: cast(v),
              })),
            }
          }
        }

        if (target.__entryPoint === EntryPoint.WHAT) {
          return (id: string) => {
            target.entity.id = id
            return adapter.grantedActions(target)
          }
        }

        if (target.__entryPoint === EntryPoint.WHERE) {
          return async () => {
            return adapter.grantedSubjects(target)
          }
        }

        if (target.__entryPoint === EntryPoint.ENTITY) {
          return (id: string) => {
            target.entity.id = id
            return target.entity
          }
        }

        if (target.__entryPoint === EntryPoint.WHO) {
          return async () => {
            return adapter.grantedEntities(target)
          }
        }

        return async (id: string) => {
          target.entity.id = id
          return adapter.check(target)
        }
      },
    })
  }
}
