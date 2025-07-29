import { grpc } from '@permify/permify-node'
import 'dotenv/config'
import { ReBAC } from '.'
import { Permify } from './adapters/permify'

// await where.member(memberId).write.project()
// check(ctx, () => checkLicense(ctx.member.teamId), () => throwable(can.member(ctx.member.id)[action][object](ctx.body?.params[0]), errorMessage))
// 	await check(
// 	locals,
// 	() => checkLicense(member.teamId),
// 	() =>
// 		throwable(
// 			can.member(member.id).notBlocked.team(member.teamId),
// 			`Данная команда заблокирована! Для продолжения работы в команде оплатите счета в <a href="/team/${member.teamId}/settings/billing" class="link link-primary">настройках биллинга</a> или обратитесь к администратору команды`
// 		),
// 	() =>
// 		throwable(
// 			can.member(member.id).read.project(projectId),
// 			`Отсутствует доступ к проекту "${project?.title || projectId}"`
// 		)
// )
//
//
// await connect(
// tuple.team(owner.teamId!).team.project(newProject.id),
// tuple.member(owner.id).owner.project(newProject.id!),
// tuple.member(owner.id).dbt_admin.project(newProject.id)
// )

// await disconnect(tuple.member([memberId])[role.id].project([projectId]))
// await connect(tuple.member(memberId)[role].project(projectId))

// export const permify = grpc.newClient(
//   {
//     endpoint: env.PERMIFY_HOST!,
//     cert: null,
//     pk: null,
//     certChain: null,
//     insecure: true,
//   },
//   grpc.newAccessTokenInterceptor(env.PERMIFY_API_TOKEN!),
// )

// export const schemaVersion = !building
// ? await permify.schema.list({ tenantId }).then((r) => r.head)
// : ''
// export const metadata = { schemaVersion, depth: 20 }

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
type Permify = 'admin' | 'manager'
type Permission = 'delete' | 'edit' | 'invite'

const rebac = new ReBAC<Entities, Permify, Permission>(
  new Permify(client, tenantId, metadata),
)

async function setup() {
  const res = rebac.connect(
    rebac.tuple.user('1').admin.project('1'),
    rebac.tuple.user('2').manager.project('1'),
  )

  console.log('Added relations', res)
}

async function checks() {
  const access1 = await rebac.can.user('1').delete.project('1')
  const access2 = await rebac.can.user('2').delete.project('1')
  const access3 = await rebac.can.user('2').edit.project('1')
  const access4 = await rebac.can.user('1').edit.project('1')
  console.log('Checked access:', access1, access2, access3, access4)
}

setup()

checks()
