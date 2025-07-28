import { grpc } from '@permify/permify-node'
import {
  BooleanValue,
  CheckResult,
  Attribute as PermifyAttr,
  Tuple as PermifyTuple,
} from '@permify/permify-node/dist/src/grpc/generated/base/v1/base'
import { Any } from '@permify/permify-node/dist/src/grpc/generated/google/protobuf/any'
import type { Adapter, Tuple, Ref, MultiRef, Attribute } from '../types'

type PermifyClient = ReturnType<typeof grpc.newClient>

function castBoolean(value: boolean) {
  const booleanValue = BooleanValue.fromJSON({ data: value })
  return Any.fromJSON({
    typeUrl: 'type.googleapis.com/base.v1.BooleanValue',
    value: BooleanValue.encode(booleanValue).finish(),
  })
}

export class Permify<Entities, Relations, Subjects>
  implements Adapter<Entities, Relations, Subjects>
{
  client: PermifyClient
  tenantId: string
  metadata: object

  constructor(client: PermifyClient, tenantId: string, metadata: object) {
    this.client = client
    this.tenantId = tenantId ?? 't1'
    this.metadata = metadata ?? {}
  }

  // Удаляет все связи сущности (в виде Entity и Subject)
  async deleteEntities(...entities: MultiRef[]) {
    const promises: Promise<unknown>[] = []
    const { client, tenantId } = this
    for (const entity of entities) {
      entity.id = typeof entity.id === 'string' ? [entity.id] : entity.id

      promises.push(
        client.data.delete({
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
        client.data.delete({
          tenantId,
          tupleFilter: {
            subject: {
              type: entity.type,
              ids: entity.id,
            },
          },
          attributeFilter: {},
        }),
      )
    }
    await Promise.all(promises)
  }

  async writeRelations(...tuples: Tuple[]) {
    const { tenantId, metadata, client } = this
    const attributes = ([] as Attribute[]).concat(
      ...tuples.map((t) => t.attrs),
    ) as PermifyAttr[]

    return await client.data
      .write({
        tenantId,
        metadata,
        tuples,
        attributes,
      })
      .then((r) => console.log(r))
  }

  async grantedEntities(target: Tuple): Promise<string[]> {
    const { tenantId, metadata, client } = this
    return client.permission
      .lookupSubject({
        tenantId,
        metadata,
        entity: target.subject,
        permission: target.permission,
        subjectReference: {
          type: target.entity.type,
        },
      })
      .then((r) => r.subjectIds)
  }

  async grantedActions(target: Tuple) {
    const { tenantId, metadata, client } = this
    return client.permission
      .subjectPermission({
        tenantId,
        metadata,
        entity: target.entity,
        subject: target.subject,
      })
      .then(({ results }) =>
        Object.fromEntries(
          Object.entries(results).map(([k, v]) => [
            k,
            v === CheckResult.CHECK_RESULT_ALLOWED,
          ]),
        ),
      )
  }

  async grantedSubjects(target: Tuple) {
    const { tenantId, metadata, client } = this

    return client.permission
      .lookupEntity({
        tenantId,
        metadata,
        entityType: target.entity?.type,
        permission: target.permission,
        subject: target.subject,
      })
      .then((r) => r.entityIds)
  }

  async check(target: Tuple) {
    const { tenantId, metadata, client } = this
    return client.permission
      .check({
        tenantId,
        metadata,
        entity: target.entity,
        permission: target.permission,
        subject: target.subject,
      })
      .then((r) => r.can === CheckResult.CHECK_RESULT_ALLOWED)
  }
}
