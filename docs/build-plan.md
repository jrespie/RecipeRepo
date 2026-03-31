# Meal Planning App Build Plan

## 1. Product Goal

Build a home-use meal planning and shopping application in JavaScript with:

- A recipe repository and recipe UI
- Manual recipe entry, with future ingestion from photo, URL, and Instagram
- Weekly meal planning based on recipes, nutrition, seasonality, and cost
- Shopping list generation with pantry-aware exclusions
- Future export of a shopping list to supermarket carts

The system will be run locally from home, but should lean on AWS-managed services where they are a clear fit.

## 2. Guiding Principles

- Start with the smallest vertical slice that is useful in daily life.
- Keep the architecture modular so later ingestion and supermarket integrations do not force rewrites.
- Prefer plain, inspectable data and simple workflows over premature automation.
- Build for New Zealand usage from the start:
  - Metric units only
  - NZ seasonality
  - NZ supermarkets and pricing sources
- Optimise Phase 1 for data quality. Bad recipe data will degrade every later phase.

## 3. Recommended Architecture

### Front end

- `React` for the UI
- `Vite` for local development
- UI modules:
  - Recipe Front End
  - Recipe Entry Service UI
  - Meal Planner UI
  - Shopping List UI

### Backend

- `Node.js` with `Fastify` or `Express`
- Organised as a modular monolith, not microservices
- Internal modules:
  - `recipes`
  - `recipe-ingestion`
  - `meal-planning`
  - `pantry`
  - `shopping-list`
  - `supermarket-export`

This keeps deployment simple for home use while preserving service boundaries in code.

### Database

- Primary recommendation: `Aurora PostgreSQL`
- Access via `Prisma` or `Knex`
- Why PostgreSQL:
  - Good support for relational recipe data
  - Structured queries for planning and history
  - JSON columns for flexible imported recipe metadata

### File and asset storage

- `S3` for recipe images and imported source snapshots

### Authentication

- For local home use, start with no auth or a single local household profile
- Do not introduce Cognito in Phase 1 unless multiple users become a real requirement

### Hosting model

Two viable options:

1. Local UI + local API, cloud AWS data services
   - Best fit if you want AWS-native persistence
   - UI and API run on a home machine or mini PC
   - Aurora and S3 are hosted in AWS

2. Fully local stack for early development, AWS-ready interfaces
   - Faster and cheaper initially
   - PostgreSQL runs locally in Docker
   - Later swap to Aurora with minimal application changes

Because the app is for home use only, option 2 is the better starting point even if the target production database shape mirrors Aurora PostgreSQL.

## 4. Suggested Repository Structure

```text
/
  apps/
    web/
    api/
  packages/
    domain/
    db/
    ui/
    config/
    shared/
  docs/
    build-plan.md
    adr/
  infra/
    aws/
  scripts/
```

Notes:

- `apps/web`: React application
- `apps/api`: Node API
- `packages/domain`: planning logic, unit conversion, normalisation
- `packages/db`: schema, migrations, seed data, repositories
- `infra/aws`: CDK or Terraform for Aurora/S3 if you choose AWS-hosted persistence

## 5. Domain Boundaries

### 5.1 Recipe Repository

Responsibilities:

- Store recipes, ingredients, instructions, tags, source, yield, and nutrition fields
- Enforce metric normalisation
- Support search and filtering

Core entities:

- `Recipe`
- `RecipeIngredient`
- `Ingredient`
- `RecipeStep`
- `RecipeTag`
- `RecipeSource`

### 5.2 Recipe Entry Service

Responsibilities:

- Create and edit recipes manually
- Validate and normalise units
- Capture source metadata
- Queue future import jobs from URL/photo/social

### 5.3 Meal Planning Service

Responsibilities:

- Generate a weekly plan
- Enforce variety across proteins and vegetables
- Consider NZ seasonality
- Later consider price, pantry contents, and meal history

Core entities:

- `MealPlan`
- `MealPlanItem`
- `MealHistory`
- `SeasonalityRule`
- `PlanningConstraint`

### 5.4 Pantry Item Registry

Responsibilities:

- Track what is already on hand
- Track quantity, unit, expiry, and staple status
- Exclude pantry items from shopping lists

Core entities:

- `PantryItem`
- `PantrySnapshot`
- `StapleItem`

### 5.5 Shopping List Creator

Responsibilities:

- Aggregate ingredients from the selected meal plan
- Convert to a final shopping list
- Exclude pantry stock
- Merge weekly staples and fridge list items
- Support manual edits before finalisation

Core entities:

- `ShoppingList`
- `ShoppingListItem`
- `FridgeListItem`
- `RecurringPurchaseItem`

## 6. Data Model Recommendations

### Recipe-related tables

- `recipes`
- `recipe_versions`
- `ingredients`
- `recipe_ingredients`
- `recipe_steps`
- `recipe_tags`
- `recipe_sources`

### Planning-related tables

- `meal_plans`
- `meal_plan_items`
- `meal_history`
- `seasonality_rules`

### Pantry and shopping tables

- `pantry_items`
- `shopping_lists`
- `shopping_list_items`
- `fridge_list_items`
- `recurring_purchase_items`

### Integration and ingestion tables

- `import_jobs`
- `import_job_results`
- `supermarket_products`
- `price_snapshots`

## 7. Recipe Data Standards

This is critical for Phase 1.

### Required recipe fields

- Title
- Description
- Servings
- Ingredients
- Steps
- At least one category or tag

### Recommended recipe fields

- Prep time
- Cook time
- Cuisine
- Protein type
- Main vegetables
- Cost band
- Freezer-friendly flag
- Kid-friendly flag

### Ingredient canonicalisation

Store two layers:

1. Raw display text
   - Example: `1 cup chopped onions`

2. Structured canonical form
   - Ingredient: `onion`
   - Quantity: `150`
   - Unit: `g`
   - Preparation note: `chopped`

This allows the UI to preserve readable recipe text while planning and shopping use normalised values.

### Metric conversion policy

Standard storage units:

- Weight: `g`, `kg`
- Volume: `ml`, `l`
- Count: `each`

Rules:

- Convert imperial and US customary units at entry time
- Keep original source text for audit/debugging
- Support density-based conversions later for tricky ingredients
- Flag ambiguous ingredients for manual review instead of guessing silently

Examples:

- `1 lb chicken` -> `454 g chicken`
- `2 cups milk` -> `480 ml milk`
- `1 onion` -> `1 each onion`

## 8. Meal Planning Logic

### Phase 2 baseline algorithm

Initial planner can be rules-based, not AI-based.

Inputs:

- Available recipes
- Household size
- Target meals per week
- Tags or exclusions
- NZ month/season

Constraints:

- Avoid too much protein repetition
- Avoid too much vegetable repetition
- Mix quick meals and longer meals
- Prefer seasonal ingredients

Suggested scoring dimensions:

- Protein diversity score
- Vegetable diversity score
- Seasonality score
- Preparation effort score
- Leftover suitability score
- Estimated cost score

For the first deliverable, build a weighted scoring engine with transparent rules. This is easier to tune than an opaque ML or LLM approach.

### Phase 2a history-aware planning

Add penalties for:

- Meals eaten in the last 7 days
- Meals eaten more than once in the last 14 days
- Same primary protein appearing too frequently

### NZ seasonality model

Store seasonality by month:

- Ingredient
- Start month
- End month
- Seasonality strength

Start manually with a curated ingredient list rather than scraping.

## 9. Shopping List Logic

### Base generator

Steps:

1. Read all meal plan ingredients
2. Scale quantities to planned servings
3. Combine identical ingredients
4. Convert to canonical units
5. Present editable draft list

### Pantry-aware extension

Subtract pantry stock where units are compatible.

If compatibility is uncertain:

- Keep the item on the list
- Mark it for review

### Fridge list extension

Support a separate household UI for ad hoc items such as milk or fruit.

This should behave like a lightweight shared list, merged during shopping list generation but still editable separately.

## 10. Supermarket Integration Strategy

This is the highest-risk area because retailer sites change frequently and may resist automation.

Recommended delivery strategy:

### Phase 4 step 1

- Export shopping list to a clean text/CSV format
- Add product search links for Countdown and Pak n Save

### Phase 4 step 2

- Build a product matching layer
- Store supermarket product IDs and mappings

### Phase 4 step 3

- Investigate cart automation only after confirming legal and technical feasibility

Do not design the whole product around cart automation. Treat it as an optional extension.

## 11. UI Plan

### Phase 1 UI

Pages:

- Recipe list
- Recipe detail
- Recipe create/edit form
- Ingredient normalisation review

Key UX requirements:

- Fast manual recipe entry
- Good ingredient editing experience
- Clear unit conversion visibility
- Search by name, tags, protein, cuisine

### Phase 2 UI

Pages:

- Weekly meal plan generator
- Editable suggested plan
- Meal history view

### Phase 3 UI

Pages:

- Shopping list draft
- Editable grouped shopping list
- Pantry manager
- Fridge shopping list tablet view

## 12. Delivery Phases

### Phase 1: Recipe Repository and UI

Goal:

- A usable recipe database with manual entry and metric conversion

Deliverables:

- Database schema for recipes and ingredients
- Recipe API
- Recipe list/detail/create/edit UI
- Unit conversion and canonicalisation engine
- Search and filtering
- Seed/sample recipe import

Exit criteria:

- You can enter a recipe manually
- All stored ingredient quantities are metric or count-based
- You can browse and edit recipes from the UI

### Phase 1a: Recipe Import Extensions

Goal:

- Add non-manual recipe ingestion

Deliverables:

- Import job framework
- URL ingestion prototype
- Photo OCR prototype
- Instagram/manual copy parsing prototype
- Review screen for imported recipe cleanup

Exit criteria:

- At least one external source can be imported into a review workflow

### Phase 2: Meal Planner

Goal:

- Generate a weekly meal plan from repository recipes

Deliverables:

- Meal plan schema and API
- Rules-based planner
- Weekly plan UI
- Seasonality scoring
- Variety constraints

Exit criteria:

- A weekly plan can be generated and edited
- Plan quality is explainable from scoring rules

### Phase 2a: History-aware Planning

Goal:

- Reduce repetitive meal selection

Deliverables:

- Meal history capture
- Repeat-avoidance rules
- History UI

Exit criteria:

- Recently used meals are deprioritised automatically

### Phase 3: Shopping List Generator

Goal:

- Generate an editable shopping list from the meal plan

Deliverables:

- Shopping list schema and API
- Ingredient aggregation logic
- Editable shopping list UI

Exit criteria:

- Weekly shopping list can be generated from a meal plan and edited before finalisation

### Phase 3a: Pantry-aware Shopping

Goal:

- Avoid purchasing duplicates

Deliverables:

- Pantry registry schema and UI
- Stock subtraction logic

Exit criteria:

- Pantry items are excluded or reduced from the list when possible

### Phase 3b: Fridge List

Goal:

- Add non-meal-plan household items

Deliverables:

- Tablet-friendly fridge list UI
- Merge logic into shopping list generation
- Weekly staple item support

Exit criteria:

- Fridge list and recurring items flow into the final shopping list

### Phase 4: Supermarket Export

Goal:

- Make the shopping list actionable in retailer workflows

Deliverables:

- Export format support
- Product matching model
- Retailer integration prototypes

Exit criteria:

- A user can export a shopping list in a format usable with at least one supermarket workflow

## 13. Implementation Roadmap

### Sprint 0: Foundations

- Create monorepo structure
- Set up Node, React, linting, formatting, testing
- Set up local PostgreSQL with Docker
- Add ORM and migrations
- Add ADR template and docs

### Sprint 1: Recipe core

- Define recipe schema
- Build manual recipe entry form
- Build recipe list and detail pages
- Implement ingredient parser and metric normalisation

### Sprint 2: Recipe quality

- Add editing, validation, tags, search
- Seed representative recipes
- Add ingredient review workflow for ambiguous conversions

### Sprint 3: Meal planning MVP

- Add meal plan tables and planner service
- Implement scoring rules
- Build plan review UI

### Sprint 4: Shopping MVP

- Build ingredient aggregation
- Build shopping list draft/edit UI

### Sprint 5: Pantry and history

- Add meal history
- Add pantry registry
- Update planner and shopping calculations

### Sprint 6+: Imports and integrations

- URL import
- OCR/photo import
- Supermarket pricing and export experiments

## 14. Technical Recommendations

### Preferred stack

- Front end: `React`, `Vite`, `TanStack Router`, `TanStack Query`
- Backend: `Node.js`, `Fastify`
- ORM: `Prisma`
- Validation: `Zod`
- Database: local `PostgreSQL`, later Aurora PostgreSQL if needed
- Infra as code: `AWS CDK` in JavaScript
- Testing: `Vitest`, `Playwright`

### Why this stack

- JavaScript end to end
- Fast local iteration
- Mature ecosystem
- Easy migration to AWS-backed persistence if desired

## 15. Testing Strategy

### Unit tests

- Unit conversion
- Ingredient canonicalisation
- Meal scoring
- Pantry subtraction

### Integration tests

- Recipe create/edit/read flows
- Meal plan generation
- Shopping list generation

### End-to-end tests

- Enter recipe -> generate meal plan -> generate shopping list

The most important automated tests are the domain logic tests. Bugs in conversions or aggregation will create bad plans and bad shopping lists.

## 16. Risks and Mitigations

### Risk: Recipe data inconsistency

Mitigation:

- Structured ingredient model
- Conversion review UI
- Preserve raw source text

### Risk: Overengineering for a home app

Mitigation:

- Use a modular monolith
- Avoid microservices
- Delay auth and event-driven architecture

### Risk: Supermarket automation fragility

Mitigation:

- Treat export/cart integration as optional
- Start with export and product matching

### Risk: Seasonality and pricing data quality

Mitigation:

- Start with curated NZ seasonality tables
- Add retailer scraping only after core planning is stable

## 17. Recommended First Deliverable

Build Phase 1 only, but do it well.

Specifically:

- Recipe database schema
- Manual recipe entry UI
- Metric normalisation engine
- Recipe browsing/search UI
- Basic local deployment

This is the correct first deliverable because:

- Every later feature depends on clean recipe data
- It gives immediate daily utility
- It de-risks ingredient modelling early

## 18. Suggested Success Metrics

### Phase 1

- Time to enter a recipe manually
- Number of recipes successfully normalised
- Number of ambiguous ingredients requiring manual review

### Phase 2

- Percentage of weekly plans accepted with minor edits only
- Protein and vegetable diversity across a week

### Phase 3

- Shopping list edit rate before finalisation
- Number of duplicate pantry purchases avoided

## 19. Immediate Next Steps

1. Create the monorepo and package layout.
2. Settle the initial schema for recipes, ingredients, and recipe steps.
3. Implement metric conversion rules and ambiguous-case handling.
4. Build the Phase 1 recipe UI and API.
5. Populate 20 to 30 real household recipes before starting meal-planner work.
