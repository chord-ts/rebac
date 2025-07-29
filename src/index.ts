import {
  EntryPoint,
  type Adapter,
  type MultiRef,
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
    return this.#subject(EntryPoint.WHO) as Subject<
      Entities,
      Relations,
      Promise<string[]>
    >
  }

  public get can() {
    return this.#subject(EntryPoint.CAN) as Subject<
      Entities,
      Permissions,
      Promise<boolean>
    >
  }

  public get what() {
    return this.#subject(EntryPoint.WHAT) as Subject<
      Entities,
      'canDo',
      Promise<Record<Permissions | Relations, boolean>>
    >
  }

  public get where() {
    return this.#subject(EntryPoint.WHERE) as Subject<
      Entities,
      Permissions,
      Promise<string[]>
    >
  }

  public get tuple() {
    return this.#subject(EntryPoint.TUPLE) as Subject<
      Entities,
      Relations,
      Tuple
    >
  }

  public get entity() {
    return this.#entity({
      __entryPoint: EntryPoint.ENTITY,
      // @ts-ignore
      entity: {},
    }) as unknown as Record<
      Entities | Relations,
      (id: string | string[]) => MultiRef
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

  public async deleteEntities(...entities: MultiRef[]) {
    return this.adapter.deleteEntities(...entities)
  }

  // First word
  #subject(kind: EntryPoint) {
    const template = {
      entity: { type: '', id: '' },
      relation: '',
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
          return permission(target)
        }
      },
    })
  }

  // Second word
  #permission(target: Tuple) {
    const subject = this.#entity(target)
    return new Proxy(target, {
      get(target, prop, receiver) {
        target.relation = prop.toString()
        target.permission = prop.toString()
        return subject
      },
    })
  }

  // third word
  #entity(target: Tuple) {
    const { adapter } = this
    return new Proxy(target, {
      get(target, prop, receiver) {
        target.entity.type = prop.toString()

        if (target.__entryPoint === EntryPoint.TUPLE) {
          // TODO think about attributes
          return (id: string, attrs?: unknown) => {
            target.entity.id = id
            return target
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
