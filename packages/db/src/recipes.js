import { prisma } from "./client.js";
import { recipeIncludes } from "./recipe-includes.js";

const VALID_UNITS = new Set(["g", "kg", "ml", "l", "each"]);
const VALID_CONVERSION_STATUS = new Set(["ok", "review"]);

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function sanitiseString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitiseNullableString(value) {
  const nextValue = sanitiseString(value);
  return nextValue || null;
}

function sanitiseBoolean(value) {
  return Boolean(value);
}

function sanitiseInteger(value, fallback = null) {
  if (value === "" || value === null || value === undefined) {
    return fallback;
  }

  const nextValue = Number.parseInt(value, 10);
  return Number.isNaN(nextValue) ? fallback : nextValue;
}

function sanitiseDecimal(value) {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const nextValue = Number.parseFloat(value);
  return Number.isNaN(nextValue) ? null : nextValue;
}

function sanitiseUnit(value) {
  const nextValue = sanitiseString(value).toLowerCase();
  return VALID_UNITS.has(nextValue) ? nextValue : null;
}

function sanitiseConversionStatus(value) {
  const nextValue = sanitiseString(value).toLowerCase();
  return VALID_CONVERSION_STATUS.has(nextValue) ? nextValue : "review";
}

function normaliseTags(tags = []) {
  return tags
    .map((tag) => sanitiseString(tag))
    .filter(Boolean)
    .map((tag) => ({
      slug: slugify(tag),
      name: tag
    }));
}

function normaliseIngredients(ingredients = []) {
  return ingredients
    .map((ingredient, index) => ({
      sortOrder: index,
      rawText: sanitiseString(ingredient.rawText),
      canonicalName: sanitiseNullableString(ingredient.canonicalName),
      quantity: sanitiseDecimal(ingredient.quantity),
      unit: sanitiseUnit(ingredient.unit),
      preparationNote: sanitiseNullableString(ingredient.preparationNote),
      optional: sanitiseBoolean(ingredient.optional),
      conversionStatus: sanitiseConversionStatus(ingredient.conversionStatus),
      conversionNotes: sanitiseNullableString(ingredient.conversionNotes)
    }))
    .filter((ingredient) => ingredient.rawText);
}

function normaliseSteps(steps = []) {
  return steps
    .map((step, index) => ({
      stepNumber: index + 1,
      instruction: sanitiseString(step.instruction)
    }))
    .filter((step) => step.instruction);
}

function normaliseSource(source) {
  if (!source) {
    return {
      sourceType: "manual",
      sourceName: null,
      sourceUrl: null,
      attributionText: null,
      originalText: null
    };
  }

  return {
    sourceType: sanitiseString(source.sourceType) || "manual",
    sourceName: sanitiseNullableString(source.sourceName),
    sourceUrl: sanitiseNullableString(source.sourceUrl),
    attributionText: sanitiseNullableString(source.attributionText),
    originalText: sanitiseNullableString(source.originalText)
  };
}

function validateRecipeInput(recipe) {
  if (!sanitiseString(recipe.title)) {
    throw new Error("Recipe title is required");
  }

  const servings = sanitiseInteger(recipe.servings);

  if (!servings || servings < 1) {
    throw new Error("Servings must be at least 1");
  }

  if (normaliseIngredients(recipe.ingredients).length === 0) {
    throw new Error("At least one ingredient is required");
  }

  if (normaliseSteps(recipe.steps).length === 0) {
    throw new Error("At least one step is required");
  }
}

function mapRecipe(recipe) {
  return {
    id: recipe.id,
    slug: recipe.slug,
    title: recipe.title,
    description: recipe.description,
    servings: recipe.servings,
    prepMinutes: recipe.prepMinutes,
    cookMinutes: recipe.cookMinutes,
    cuisine: recipe.cuisine,
    proteinType: recipe.proteinType,
    costBand: recipe.costBand,
    freezerFriendly: recipe.freezerFriendly,
    kidFriendly: recipe.kidFriendly,
    createdAt: recipe.createdAt,
    updatedAt: recipe.updatedAt,
    tags: recipe.tags.map((entry) => entry.tag.name),
    source: recipe.source,
    ingredients: recipe.ingredients.map((ingredient) => ({
      id: ingredient.id,
      rawText: ingredient.rawText,
      canonicalName: ingredient.canonicalName ?? ingredient.ingredient?.name ?? null,
      quantity:
        ingredient.quantity === null ? null : Number(ingredient.quantity),
      unit: ingredient.unit,
      preparationNote: ingredient.preparationNote,
      optional: ingredient.optional,
      conversionStatus: ingredient.conversionStatus,
      conversionNotes: ingredient.conversionNotes
    })),
    steps: recipe.steps.map((step) => ({
      id: step.id,
      stepNumber: step.stepNumber,
      instruction: step.instruction
    }))
  };
}

function buildRecipeWriteInput(recipeInput) {
  const title = sanitiseString(recipeInput.title);
  const tags = normaliseTags(recipeInput.tags);
  const ingredients = normaliseIngredients(recipeInput.ingredients);
  const steps = normaliseSteps(recipeInput.steps);
  const source = normaliseSource(recipeInput.source);

  return {
    slug: slugify(title),
    title,
    description: sanitiseNullableString(recipeInput.description),
    servings: sanitiseInteger(recipeInput.servings, 1),
    prepMinutes: sanitiseInteger(recipeInput.prepMinutes),
    cookMinutes: sanitiseInteger(recipeInput.cookMinutes),
    cuisine: sanitiseNullableString(recipeInput.cuisine),
    proteinType: sanitiseNullableString(recipeInput.proteinType),
    costBand: sanitiseNullableString(recipeInput.costBand),
    freezerFriendly: sanitiseBoolean(recipeInput.freezerFriendly),
    kidFriendly: sanitiseBoolean(recipeInput.kidFriendly),
    tags,
    ingredients,
    steps,
    source
  };
}

async function ensureUniqueSlug(baseSlug, recipeId = null) {
  let candidate = baseSlug || "recipe";
  let counter = 1;

  while (true) {
    const existingRecipe = await prisma.recipe.findUnique({
      where: {
        slug: candidate
      }
    });

    if (!existingRecipe || existingRecipe.id === recipeId) {
      return candidate;
    }

    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }
}

async function ingredientConnectOrCreate(canonicalName) {
  if (!canonicalName) {
    return undefined;
  }

  return {
    connectOrCreate: {
      where: {
        slug: slugify(canonicalName)
      },
      create: {
        slug: slugify(canonicalName),
        name: canonicalName
      }
    }
  };
}

function buildIngredientCreate(ingredient) {
  return {
    sortOrder: ingredient.sortOrder,
    rawText: ingredient.rawText,
    canonicalName: ingredient.canonicalName,
    quantity: ingredient.quantity,
    unit: ingredient.unit,
    preparationNote: ingredient.preparationNote,
    optional: ingredient.optional,
    conversionStatus: ingredient.conversionStatus,
    conversionNotes: ingredient.conversionNotes,
    ...(ingredient.canonicalName
      ? {
          ingredient: ingredientConnectOrCreate(ingredient.canonicalName)
        }
      : {})
  };
}

export async function listRecipes() {
  const recipes = await prisma.recipe.findMany({
    include: recipeIncludes,
    orderBy: {
      title: "asc"
    }
  });

  return recipes.map(mapRecipe);
}

export async function getRecipeById(id) {
  const recipe = await prisma.recipe.findUnique({
    where: {
      id
    },
    include: recipeIncludes
  });

  return recipe ? mapRecipe(recipe) : null;
}

export async function createRecipe(recipeInput) {
  validateRecipeInput(recipeInput);

  const recipe = buildRecipeWriteInput(recipeInput);
  const slug = await ensureUniqueSlug(recipe.slug);

  const createdRecipe = await prisma.recipe.create({
    data: {
      slug,
      title: recipe.title,
      description: recipe.description,
      servings: recipe.servings,
      prepMinutes: recipe.prepMinutes,
      cookMinutes: recipe.cookMinutes,
      cuisine: recipe.cuisine,
      proteinType: recipe.proteinType,
      costBand: recipe.costBand,
      freezerFriendly: recipe.freezerFriendly,
      kidFriendly: recipe.kidFriendly,
      source: {
        create: recipe.source
      },
      ingredients: {
        create: await Promise.all(
          recipe.ingredients.map(async (ingredient) =>
            buildIngredientCreate(ingredient)
          )
        )
      },
      steps: {
        create: recipe.steps
      },
      tags: {
        create: recipe.tags.map((tag) => ({
          tag: {
            connectOrCreate: {
              where: {
                slug: tag.slug
              },
              create: tag
            }
          }
        }))
      }
    },
    include: recipeIncludes
  });

  return mapRecipe(createdRecipe);
}

export async function updateRecipe(id, recipeInput) {
  validateRecipeInput(recipeInput);

  const recipe = buildRecipeWriteInput(recipeInput);
  const slug = await ensureUniqueSlug(recipe.slug, id);

  await prisma.recipeIngredient.deleteMany({
    where: {
      recipeId: id
    }
  });

  await prisma.recipeStep.deleteMany({
    where: {
      recipeId: id
    }
  });

  await prisma.recipeTagJoin.deleteMany({
    where: {
      recipeId: id
    }
  });

  await prisma.recipeSource.deleteMany({
    where: {
      recipeId: id
    }
  });

  const updatedRecipe = await prisma.recipe.update({
    where: {
      id
    },
    data: {
      slug,
      title: recipe.title,
      description: recipe.description,
      servings: recipe.servings,
      prepMinutes: recipe.prepMinutes,
      cookMinutes: recipe.cookMinutes,
      cuisine: recipe.cuisine,
      proteinType: recipe.proteinType,
      costBand: recipe.costBand,
      freezerFriendly: recipe.freezerFriendly,
      kidFriendly: recipe.kidFriendly,
      source: {
        create: recipe.source
      },
      ingredients: {
        create: await Promise.all(
          recipe.ingredients.map(async (ingredient) =>
            buildIngredientCreate(ingredient)
          )
        )
      },
      steps: {
        create: recipe.steps
      },
      tags: {
        create: recipe.tags.map((tag) => ({
          tag: {
            connectOrCreate: {
              where: {
                slug: tag.slug
              },
              create: tag
            }
          }
        }))
      }
    },
    include: recipeIncludes
  });

  return mapRecipe(updatedRecipe);
}
