import fs from 'fs'
import path from 'path'
import { grpc } from '@permify/permify-node'
import { CheckResult } from '@permify/permify-node/dist/src/grpc/generated/base/v1/base'
import 'dotenv/config'

if (!process.env.PERMIFY_HOST) {
  throw Error('env variable PERMIFY_HOST is not set')
}

if (!process.env.PERMIFY_API_TOKEN) {
  throw Error('env variable PERMIFY_API_TOKEN is not set')
}

if (!process.env.PERMIFY_HOST) {
  throw Error('env variable PERMIFY_TENANT is not set')
}

const permify = grpc.newClient(
  {
    endpoint: process.env.PERMIFY_HOST!,
    cert: null,
    pk: null,
    certChain: null,
    insecure: true,
  },
  grpc.newAccessTokenInterceptor(process.env.PERMIFY_API_TOKEN!),
)

const tenantId = process.env.PERMIFY_TENANT

const schema = fs.readFileSync(
  path.join(path.resolve(), './rebac/permify/schema.perm'),
  'utf8',
)

const { schemaVersion } = await permify.schema.write({
  tenantId,
  schema,
})

console.info('✅ Updated schema. Latest version:', schemaVersion)
