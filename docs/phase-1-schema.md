# Phase 1 Recipe Schema

This project now uses Prisma as the database schema source of truth for the initial recipe repository.

## Goals

- Persist recipes, steps, tags, and source metadata
- Preserve raw ingredient text
- Store canonical metric-friendly ingredient fields for later planning and shopping logic
- Mark ambiguous ingredient conversions for manual review

## Core tables

- `Recipe`
- `Ingredient`
- `RecipeIngredient`
- `RecipeStep`
- `RecipeTag`
- `RecipeTagJoin`
- `RecipeSource`

## Important design choices

### Raw and structured ingredient storage

Each recipe ingredient keeps both:

- `rawText`
- structured canonical fields such as `canonicalName`, `quantity`, `unit`, and `preparationNote`

This allows the app to display the original recipe wording while still enabling aggregation and planning.

### Conversion status

`RecipeIngredient.conversionStatus` is either:

- `ok`
- `review`

If parsing or unit conversion is ambiguous, the ingredient can still be saved without corrupting the canonical data.

### Source tracking

`RecipeSource` is separate from `Recipe` so manual entry and later import pipelines can share the same recipe core.
