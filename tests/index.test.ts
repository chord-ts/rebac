import { beforeEach, describe, expect, test, vi } from 'vitest'
import { ReBAC } from '../src'
import { EntryPoint, type Adapter, type Tuple } from '../src/types'
import { grpc } from '@permify/permify-node'
import { Permify } from '../src/adapters'
import 'dotenv/config'

const client = grpc.newClient(
  {
    endpoint: process.env.PERMIFY_HOST!,
    cert: null,
    pk: null,
    certChain: null,
    insecure: true,
  },
  grpc.newAccessTokenInterceptor(process.env.PERMIFY_API_TOKEN!),
)
const tenantId = 'testing'
const schemaVersion = await client.schema.list({ tenantId }).then((r) => r.head)
const metadata = { schemaVersion, depth: 20 }
type Entities = 'user' | 'project'
type Relations = 'admin' | 'manager'
type Permissions = 'delete' | 'edit' | 'invite'

const rebac = new ReBAC<Entities, Relations, Permissions>(
  new Permify(client, tenantId, metadata),
)

beforeEach(async () => {
  const tuple1 = rebac.tuple.user('1').admin.project('1')
  const tuple2 = rebac.tuple.user('2').manager.project('1')

  await rebac.connect(tuple1, tuple2)
})

describe('ReBAC Client', () => {
  describe('tuple builder', () => {
    test('should correctly build a relation tuple', () => {
      const { subject, relation, entity, permission, attrs, entryPoint } =
        rebac.tuple.user('1').admin.project('1')
      const unpacked = {
        subject,
        relation,
        entity,
        permission,
        attrs,
        entryPoint,
      }

      expect(unpacked).toEqual({
        subject: { type: 'user', id: '1' },
        relation: 'admin',
        entity: { type: 'project', id: '1' },
        permission: 'admin',
        attrs: [],
        entryPoint: EntryPoint.TUPLE,
      })
    })
  })

  describe('connect', () => {
    test('should throw an error for manually created tuple with array id', async () => {
      const badTuple: Tuple = {
        subject: { type: 'user', id: ['1', '2'] as any },
        relation: 'admin',
        entity: { type: 'project', id: '1' },
        attrs: [],
      }
      await expect(rebac.connect(badTuple)).rejects.toThrow(
        '@chord-ts/rebac: Wrong tuple for connect. Id must be string:',
      )
    })
  })

  describe('can (permission check)', () => {
    test('should call adapter.check and return its result (true)', async () => {
      const hasAccess = await rebac.can.user('1').delete.project('1')
      expect(hasAccess).toBe(true)
    })

    test('should call adapter.check and return its result (false)', async () => {
      const hasAccess = await rebac.can.user('2').delete.project('1')
      expect(hasAccess).toBe(false)
    })
  })

  describe('what.canDo (list permissions)', () => {
    test('should call adapter.grantedActions and return its result', async () => {
      const permissions = {
        delete: true,
        edit: true,
        invite: true,
        admin: true,
        manager: false,
      }
      const result = await rebac.what.user('1').canDo.project('1')

      expect(result).toEqual(permissions)
    })
  })

  describe('who (list subjects with permission)', () => {
    test('should call adapter.grantedEntities and return its result (delete)', async () => {
      const users = ['1']

      const result = await rebac.who.project('1').delete.user()
      expect(result).toEqual(users)
    })

    test('should call adapter.grantedEntities and return its result (invite)', async () => {
      const users = ['1', '2']
      const result = await rebac.who.project('1').invite.user()
      expect(result).toEqual(users)
    })
  })

  describe('where (list entities a subject has permission on)', () => {
    test('should call adapter.grantedSubjects and return its result', async () => {
      const projects = ['1']
      const result = await rebac.where.user('1').edit.project()
      expect(result).toEqual(projects)
    })
  })

  describe('deleteEntities', () => {
    test('should call adapter.deleteEntities with correct refs', async () => {
      const userEntity = rebac.entity.user('1')
      const projectEntity = rebac.entity.project('1')

      const user = { type: 'user', id: '1' } 
      const project = { type: 'project', id: '1' }

      expect(userEntity).toEqual(user)
      expect(projectEntity).toEqual(project)
      const { success } = await rebac.delete(userEntity, projectEntity)
      expect(success).toBe(true)
    })
  })
})
