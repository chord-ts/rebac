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
