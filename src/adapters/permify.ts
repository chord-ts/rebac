import { grpc } from '@permify/permify-node'
import {
	BooleanValue,
	CheckResult,
	Attribute as PermifyAttr,
	Tuple as PermifyTuple,
} from '@permify/permify-node/dist/src/grpc/generated/base/v1/base'
import { Any } from '@permify/permify-node/dist/src/grpc/generated/google/protobuf/any'
import type { Adapter } from '../types'


function castBoolean(value: boolean) {
  const booleanValue = BooleanValue.fromJSON({ data: value })
  return Any.fromJSON({
    typeUrl: 'type.googleapis.com/base.v1.BooleanValue',
    value: BooleanValue.encode(booleanValue).finish(),
  })
}


export class Permify implements Adapter { 
  
}


export const permify = grpc.newClient(
  {
    endpoint: env.PERMIFY_HOST!,
    cert: null,
    pk: null,
    certChain: null,
    insecure: true,
  },
  grpc.newAccessTokenInterceptor(env.PERMIFY_API_TOKEN!)
)

export const tenantId = 't1'
export const schemaVersion = !building ? await permify.schema.list({ tenantId }).then(r => r.head) : ''
export const metadata = { schemaVersion, depth: 20 }

