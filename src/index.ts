import {
  EntryPoint,
  type Adapter,
  type Attribute,
  type MultiRef,
  type Ref,
  type Subject,
  type Tuple,
} from './types'

export class ReBAC<
  Entities extends string,
  Relations extends string,
  Permissions extends string,
> {
  readonly #adapter: Adapter

  constructor(adapter: Adapter) {
    this.#adapter = adapter
  }

  public get who() {
    return new Sentence(EntryPoint.WHO, this.#adapter) as Subject<
      Entities,
      Relations | Permissions,
      Promise<string[]>
    >
  }

  public get can() {
    return new Sentence(EntryPoint.CAN, this.#adapter) as Subject<
      Entities,
      Permissions,
      Promise<boolean>
    >
  }

  public get what() {
    return new Sentence(EntryPoint.WHAT, this.#adapter) as Subject<
      Entities,
      'canDo',
      Promise<Record<Permissions | Relations, boolean>>
    >
  }

  public get where() {
    return new Sentence(EntryPoint.WHERE, this.#adapter) as Subject<
      Entities,
      Permissions,
      Promise<string[]>
    >
  }

  public get tuple() {
    return new Sentence(EntryPoint.TUPLE, this.#adapter) as Subject<
      Entities,
      Relations,
      Tuple
    >
  }

  public get entity() {
    const sentence = new Sentence(EntryPoint.ENTITY, this.#adapter)
    // @ts-ignore
    return sentence as unknown as Record<
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
    return this.#adapter.writeRelations(...tuples)
  }

  public async delete(...entities: MultiRef[]) {
    return this.#adapter.deleteEntities(...entities)
  }

  public async disconnect(...tuples: Tuple[]) {
    return this.#adapter.removeRelations(...tuples)
  }
}

class Sentence implements Tuple {
  entryPoint: EntryPoint
  adapter: Adapter
  permission?: string | undefined
  relation?: string | undefined
  attrs?: object
  entity: Ref = { type: '', id: '' }
  subject: Ref = { type: '', id: '' }

  constructor(entryPoint: EntryPoint, adapter: Adapter) {
    // adapter: Adapter<Entities, Relations, Permissions>
    this.entryPoint = entryPoint
    this.adapter = adapter

    if (entryPoint === EntryPoint.ENTITY) {
      return this.#entity(this)
    }
    return new Proxy(this, {
      get(target, prop, receiver) {
        target.subject.type = prop.toString()          
        return (id: string) => {
          target.subject.id = id
          return target.#relation(target)
        }
      },
    })
  }

  // Second word
  #relation(target: Sentence) {
    return new Proxy(target, {
      get(target, prop, receiver) {
        target.relation = prop.toString()
        target.permission = prop.toString()
        return target.#entity(target)
      },
    })
  }

  // third word
  #entity(target: Sentence) {
    const adapter = this.adapter
    return new Proxy(this, {
      get(target, prop, receiver) {
        target.entity.type = prop.toString()

        switch (target.entryPoint) {
          case EntryPoint.TUPLE:
            return (id: string, attrs?: object) => {
              target.entity.id = id
              target.attrs = attrs
              return target
            }

          case EntryPoint.WHAT:
            return (id: string) => {
              target.entity.id = id
              return adapter.grantedActions(target)
            }

          case EntryPoint.WHERE:
            return async () => {
              return adapter.grantedSubjects(target)
            }

          case EntryPoint.ENTITY:
            return (id: string) => {
              target.entity.id = id
              target.entity.type = prop.toString()
              return target.entity
            }

          case EntryPoint.WHO:
            return async () => {
              return adapter.grantedEntities(target)
            }

          default:
            return async (id: string) => {
              target.entity.id = id
              return adapter.check(target)
            }
        }
      },
    })
  }
}
