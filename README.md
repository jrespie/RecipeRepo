# RecipeRepo

Local-first meal planning and shopping list application for home use.

## Current Scope

The current repository is scaffolded for:

- Phase 1 recipe repository
- Recipe entry UI
- Recipe browsing UI
- Shared domain logic for ingredient normalisation and metric conversion

## Workspace Layout

```text
apps/
  api/      Node API
  web/      React UI
packages/
  db/       Database schema and persistence layer
  domain/   Shared business logic
  shared/   Cross-app constants and helpers
docs/       Product and architecture docs
```

## Planned Stack

- Front end: React + Vite
- API: Node.js + Fastify
- Database: PostgreSQL locally
- ORM: Prisma

## Local Database

The repo includes a local PostgreSQL setup in [`docker-compose.yml`](/Users/jamesespie/PersonalDev/RecipeRepo/docker-compose.yml) and a Prisma schema in [`packages/db/prisma/schema.prisma`](/Users/jamesespie/PersonalDev/RecipeRepo/packages/db/prisma/schema.prisma).

Typical setup flow:

1. `cp .env.example .env`
2. `npm install`
3. `npm run db:up`
4. `npm run db:generate`
5. `npm run db:migrate`

## Next Steps

1. Install dependencies with `npm install`.
2. Implement the Phase 1 recipe schema in `packages/db`.
3. Build the recipe entry and browsing flows.
4. Add ingredient parsing and metric normalisation.
