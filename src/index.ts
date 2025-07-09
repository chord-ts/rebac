import { Kinds } from './types'

// 	can.project(id).delete.memeber(id)



function subject<Entities, Relations>(kind: Kinds) {
	const template = {
		entity: { type: '' },
		permission: '',
		subject: { type: '' },
		attrs: [],
		__kind: kind,
	} as Tuple

	return new Proxy(template, {
		get(target, prop, receiver) {
			target = structuredClone(template)
			target.subject.type = prop.toString()
			return (id: string | string[]) => {
				target.subject.id = id
				return permission<Entities, Relations>(target)
			}
		},
	})
}

function permission<Entities, Relations>(target) {
	return new Proxy(target, {
		get(target, prop, receiver) {
			target.permission = prop.toString()
			return entityProxy<Entities, Relations>(target)
		},
	})
}

function entityProxy<T, P>(target) {
	return new Proxy(target, {
		get(target, prop, receiver) {
			target.entity.type = prop.toString()

			if (target.__kind === Kinds.TUPLE) {
				return (id: string | string[], attrs?: Attributes) => {
					target.entity.id = id
					return {
						entity: target.entity,
						relation: target.permission,
						subject: target.subject,
						attrs: Object.entries(attrs ?? {}).map(([k, v]) => ({
							entity: { type: prop, id },
							attribute: k,
							value: cast(v),
						})),
					}
				}
			}

			if (target.__kind === Kinds.PERMISSIONS) {
				return (id: string, attrs?: Attributes) => {
					target.entity.id = id
					return permify.permission
						.subjectPermission({
							tenantId,
							metadata,
							entity: target.entity,
							subject: target.subject,
						})
						.then(({ results }) =>
							Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v === CheckResult.CHECK_RESULT_ALLOWED]))
						)
				}
			}

			if (target.__kind === Kinds.FILTER_ENTITY) {
				return async () => {
					const response = await permify.permission.lookupEntity({
						tenantId,
						metadata,
						entityType: target.entity.type,
						permission: target.permission,
						subject: target.subject,
					})

					return response.entityIds
				}
			}

			if (target.__kind === Kinds.ENTITY) {
				return (id: string | string[]) => {
					target.entity.id = id
					return target.entity
				}
			}

			if (target.__kind === Kinds.FILTER_SUBJECT) {
				return async () => {
					const res = await permify.permission.lookupSubject({
						tenantId,
						metadata,
						entity: target.subject,
						permission: target.permission,
						subjectReference: {
							type: target.entity.type,
						},
					})

					return res.subjectIds
				}
			}

			return async (id: string) => {
				target.entity.id = id
				return permify.permission
					.check({
						tenantId,
						metadata,
						entity: target.entity,
						permission: target.permission,
						subject: target.subject,
					})
					.then(r => r.can === CheckResult.CHECK_RESULT_ALLOWED)
			}
		},
	})
}

export const entity = entityProxy<Relations, Tuple>({ __kind: Kinds.ENTITY, entity: {} }) as unknown as Record<
	Entities | Relations,
	(id: string | string[]) => EntityRef
>

export const who = subject(Kinds.FILTER_SUBJECT) as unknown as Subject<Entities, Relations, Promise<string[]>>
export const can = subject(Kinds.CHECK) as unknown as Subject<Entities, Permissions, Promise<boolean>>
export const tuple = subject(Kinds.TUPLE) as unknown as Subject<Entities, Relations, Tuple>
export const what = subject(Kinds.PERMISSIONS) as unknown as Subject<
	Entities,
	'canDo',
	Promise<Record<Permissions | Relations, boolean>>
>
export const where = subject(Kinds.FILTER_ENTITY) as unknown as Subject<Entities, Permissions, Promise<string[]>>

// Parameters<typeof permify.data.write>[0]['tuples'])
export async function connect(...tuples: Tuple[]) {
	for (const tuple of tuples) {
		if (typeof tuple.subject!.id === 'object' || typeof tuple.entity!.id === 'object') {
			throw Error(`Permify - wrong tuple for connect. Id must be string: ${tuple}`)
		}
	}
	// @ts-ignore
	const attributes = ([] as Attribute[]).concat(...tuples.map(t => t.attrs)) as PermifyAttr[]

	return await permify.data.write({
		tenantId,
		metadata,
		// @ts-ignore
		tuples,
		attributes,
	})
}

export async function disconnect(...tuples: Tuple[]) {
	const promises: Promise<unknown>[] = []
	for (const tuple of tuples) {
		if (!Array.isArray(tuple.entity.id) || !Array.isArray(tuple.subject.id)) {
			throw Error(
				`Permify - wrong tuple for disconnect. Subject and entity ids must be arrays of ids: ${JSON.stringify(tuple)}`
			)
		}

		promises.push(
			permify.data.delete({
				tenantId,
				tupleFilter: {
					entity: {
						type: tuple.entity.type,
						ids: tuple.entity.id as string[],
					},
					relation: tuple.relation,
					subject: {
						type: tuple.subject.type,
						ids: tuple.subject.id as string[],
					},
				},
				attributeFilter: {},
			})
		)
	}

	await Promise.all(promises)
}

// Удаляет все связи сущности (в виде Entity и Subject)
export async function fullDisconnect(...entities: EntityRef[]) {
	const promises: Promise<unknown>[] = []
	for (const entity of entities) {
		entity.id = typeof entity.id === 'string' ? [entity.id] : entity.id

		promises.push(
			permify.data.delete({
				tenantId,
				tupleFilter: {
					entity: {
						type: entity.type,
						ids: entity.id as string[],
					},
				},
				attributeFilter: {},
			})
		)
		promises.push(
			permify.data.delete({
				tenantId,
				tupleFilter: {
					subject: {
						type: entity.type,
						ids: entity.id as string[],
					},
				},
				attributeFilter: {},
			})
		)
	}

	await Promise.all(promises)
}
