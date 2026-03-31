# Local-First Architecture Notes

## Decision

The application is local-first.

- UI and API run on a home machine
- Database starts local
- Cloud dependencies are optional future enhancements, not a requirement

## Why

- Lower operational complexity
- Faster development loop
- No need to manage public hosting for a household app
- Easier to keep the system private and simple

## Initial Runtime Model

- `apps/web`: Vite development server
- `apps/api`: Node API on port `4000`
- local PostgreSQL on host port `5433`
- `packages/domain`: shared business logic
- `packages/db`: database schema and persistence layer

## Future Option

If later required, the database can move from local PostgreSQL to Aurora PostgreSQL with minimal application-layer change if the schema and access layer remain disciplined.
