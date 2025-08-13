import { grpc } from '@permify/permify-node'
import type { Adapter, Tuple, Ref, MultiRef, Attribute } from '../types'

const { BooleanValue, CheckResult, Attribute, attributeTypeFromJSON } =
  grpc.base
// const { Any } = grpc.base.protobufPackage
type PermifyClient = ReturnType<typeof grpc.newClient>

function castBoolean(value: boolean) {
  const booleanValue = BooleanValue.fromJSON({ data: value })
  // FIXME untested, maybe another method
  return attributeTypeFromJSON(booleanValue)
}

export class Permify implements Adapter {
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

    let success = true
    await Promise.all(promises).catch((e) => {
      console.error(e)
      success = false
    })
    return { success }
  }

  async writeRelations(...tuples: Tuple[]) {
    const { tenantId, metadata, client } = this
    const attributes = ([] as Attribute[]).concat(
      ...tuples.map((t) =>
        Object.entries(t.attrs ?? {}).map(([k, v]) => ({
          entity: { type: t.entity.type, id: t.entity.id },
          attribute: k,
          value: castBoolean(v),
        })),
      ),
    ) as PermifyAttr[]

    return await client.data
      .write({
        tenantId,
        metadata,
        tuples,
        attributes,
      })
      .then(() => {
        return { success: true }
      })
      .catch((e) => {
        console.error(e)
        return { success: false }
      })
  }

  async removeRelations(...tuples: Tuple[]) {
    const { tenantId, metadata, client } = this

    const promises = tuples.map((tuple) =>
      // TODO add multiRef support
      client.data.delete({
        tenantId,
        tupleFilter: {
          entity: {
            type: tuple.entity.type,
            ids: [tuple.entity.id] as string[],
          },
          relation: tuple.relation,
          subject: {
            type: tuple.subject.type,
            ids: [tuple.subject.id] as string[],
          },
        },
        attributeFilter: {},
      }),
    )

    return Promise.all(promises)
      .then(() => {
        return { success: true }
      })
      .catch((e) => {
        console.error(e)
        return { success: false }
      })
  }

  async grantedEntities(target: Tuple): Promise<string[]> {
    if (!target.subject.id || !target.entity.type) return []
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
    if (!target.entity.id || target.subject.id) return {}
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
    if (!target.subject.id || !target.entity.type) return []
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
    if (!target.entity.id || !target.subject.id) return false
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
