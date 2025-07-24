import { grpc } from '@permify/permify-node'
import {
  BooleanValue,
  CheckResult,
  Attribute as PermifyAttr,
  Tuple as PermifyTuple,
} from '@permify/permify-node/dist/src/grpc/generated/base/v1/base'
import { Any } from '@permify/permify-node/dist/src/grpc/generated/google/protobuf/any'
import type { Adapter, Tuple, Ref } from '../types'

type PermifyClient = ReturnType<typeof grpc.newClient>

function castBoolean(value: boolean) {
  const booleanValue = BooleanValue.fromJSON({ data: value })
  return Any.fromJSON({
    typeUrl: 'type.googleapis.com/base.v1.BooleanValue',
    value: BooleanValue.encode(booleanValue).finish(),
  })
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

  write() {}

  async subjectPermission(target: Tuple) {
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

  async lookupEntity(target: Tuple) {
    const { tenantId, metadata, client } = this

    const response = await client.permission.lookupEntity({
      tenantId,
      metadata,
      entityType: target.entity?.type,
      permission: target.permission,
      subject: target.subject,
    })

    return response.entityIds
  }
}
