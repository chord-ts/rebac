<div id="header" align="center">
<img src="./docs/network.jpg" alt="Network"/>

# 🎣 Chord - ReBAC

The onward way to use ReBAC (relation-based access control) systems in TypeScript with sweet syntax

```ts
tuple.developer('<ID>').uses.framework('@chord-ts/rebac')
```

<a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-3178c6?style=for-the-badge&logo=typescript&logoColor=white"></a>
<a href="https://kit.svelte.dev/"><img src="https://img.shields.io/badge/permify-6318ff?style=for-the-badge&logo=&logoColor=FF3E00"></a>

</div>

This library provides a fluent and intuitive API for interacting with a ReBAC system.

## 📚 Table of Contents

- 🚀 Usage
  - Initialization
  - Creating Relationships
  - Checking Permissions (can)
  - Listing Permissions (what...canDo)
  - Querying Subjects (who)
  - Querying Entities (where)
  - Deleting Entities
- 🛠️ Development
- ⚖️ License

## 🚀 Usage

Below are examples of how to use the main features, based on the library's test suite.

### Initialization

First, you need to initialize the ReBAC client with an adapter. This example uses the Permify adapter.

You'll need to define your entity types, relations, and permissions.

```typescript
import { ReBAC } from '../src'
import { Permify } from '../src/adapters'
import { grpc } from '@permify/permify-node'
import 'dotenv/config'

// Define your schema types
type Entities = 'user' | 'project'
type Relations = 'admin' | 'manager'
type Permissions = 'delete' | 'edit' | 'invite'

// 1. Setup Permify client
const client = grpc.newClient(
  {
    endpoint: process.env.PERMIFY_HOST!,
    insecure: true,
  },
  grpc.newAccessTokenInterceptor(process.env.PERMIFY_API_TOKEN!),
)
// 2. Configure ReBAC client
const tenantId = 'testing'
// You should fetch the latest schema version for your tenant
const schemaVersion = await client.schema.list({ tenantId }).then((r) => r.head)
const metadata = { schemaVersion, depth: 20 }

// 3. Create the ReBAC client instance
const rebac = new ReBAC<Entities, Relations, Permissions>(
  new Permify(client, tenantId, metadata),
)
```

### Creating Relationships

Relationships, or "tuples", define who has what kind of access to which resource. You can create tuples with a fluent API and persist them using `connect`.

A tuple follows the structure: `subject -> relation -> entity`.

```typescript
// Create relationship tuples
const tuple1 = rebac.tuple.user('1').admin.project('1')
const tuple2 = rebac.tuple.user('2').manager.project('1')

// Persist the relationships in your ReBAC system
await rebac.connect(tuple1, tuple2)
```

The tuple builder creates a plain object that represents the relationship, which is then used by the adapter.

```typescript
const tuple = rebac.tuple.user('1').admin.project('1')

/*
console.log(tuple) will output:
{
  subject: { type: 'user', id: '1' },
  relation: 'admin',
  entity: { type: 'project', id: '1' },
  permission: 'admin',
  attrs: [],
  entryPoint: 'TUPLE',
}
*/
```

### Checking Permissions (can)

To check if a subject has a specific permission on an entity, use the `can` builder.

```typescript
// Does user '1' have 'delete' permission on project '1'?
// (Assuming the schema grants 'delete' to 'admin')
const hasAccess = await rebac.can.user('1').delete.project('1')
// hasAccess -> true

// Does user '2' have 'delete' permission on project '1'?
// (Assuming the schema does NOT grant 'delete' to 'manager')
const hasNoAccess = await rebac.can.user('2').delete.project('1')
// hasNoAccess -> false
```

### Listing Permissions (what...canDo)

You can retrieve all the permissions a subject has on a specific entity.

```typescript
// What can user '1' do on project '1'?
const permissions = await rebac.what.user('1').canDo.project('1')

/*
permissions might look like this:
{
  delete: true,
  edit: true,
  invite: true,
  admin: true,
  manager: false,
}
*/
```

### Querying Subjects (who)

To find out which subjects have a certain permission on an entity, use the `who` builder.

```typescript
// Who can 'delete' project '1'?
const usersWithDelete = await rebac.who.project('1').delete.user()
// usersWithDelete -> ['1']

// Who can 'invite' to project '1'?
// (Assuming both 'admin' and 'manager' can 'invite')
const usersWithInvite = await rebac.who.project('1').invite.user()
// usersWithInvite -> ['1', '2']
```

### Querying Entities (where)

To find out which entities of a certain type a subject has a permission on, use the `where` builder.

```typescript
// On which projects can user '1' 'edit'?
const editableProjects = await rebac.where.user('1').edit.project()
// editableProjects -> ['1']
```

### Deleting Entities

You can delete entities from your ReBAC system. This will remove the entity and all relationships associated with it.

```typescript
// Define entity references
const userEntity = rebac.entity.user('1')
const projectEntity = rebac.entity.project('1')

// Delete the entities
const { success } = await rebac.delete(userEntity, projectEntity)
// success -> true
```

## 🛠️ Development

- Install dependencies:

```bash
pnpm install
```

- Run the unit tests:

```bash
pnpm test
```

- Build the library:

```bash
pnpm build
```

## ⚖️ License

[Apache 2.0](./LICENSE) License © 2025 [Dmitriy Din](https://github.com/dmdin)
