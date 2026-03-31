import { prisma } from "./client.js";
import { createRecipe } from "./recipes.js";

const recipes = [
  {
    title: "Lemongrass Chicken Bowls",
    description: "Fast rice bowls with herbs, pickled vegetables, and grilled chicken.",
    servings: 4,
    prepMinutes: 20,
    cookMinutes: 18,
    cuisine: "Vietnamese-inspired",
    proteinType: "chicken",
    costBand: "medium",
    freezerFriendly: false,
    kidFriendly: true,
    tags: ["quick dinners", "weeknight staples"],
    source: {
      sourceType: "manual",
      sourceName: "Household staple"
    },
    ingredients: [
      {
        rawText: "600 g chicken thighs",
        canonicalName: "chicken thighs",
        quantity: 600,
        unit: "g",
        conversionStatus: "ok"
      },
      {
        rawText: "300 g jasmine rice",
        canonicalName: "jasmine rice",
        quantity: 300,
        unit: "g",
        conversionStatus: "ok"
      },
      {
        rawText: "2 each carrots, julienned",
        canonicalName: "carrot",
        quantity: 2,
        unit: "each",
        preparationNote: "julienned",
        conversionStatus: "ok"
      },
      {
        rawText: "0.5 each cabbage, shredded",
        canonicalName: "cabbage",
        quantity: 0.5,
        unit: "each",
        preparationNote: "shredded",
        conversionStatus: "ok"
      }
    ],
    steps: [
      {
        instruction: "Cook the rice according to packet instructions."
      },
      {
        instruction: "Marinate and cook the chicken until browned and cooked through."
      },
      {
        instruction: "Assemble bowls with rice, vegetables, herbs, and sliced chicken."
      }
    ]
  },
  {
    title: "Roasted Pumpkin Pasta",
    description: "Creamy roasted pumpkin pasta with spinach and parmesan.",
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 35,
    cuisine: "Italian-inspired",
    proteinType: "vegetarian",
    costBand: "budget",
    freezerFriendly: true,
    kidFriendly: true,
    tags: ["budget friendly", "seasonal vegetables"],
    source: {
      sourceType: "manual",
      sourceName: "Autumn rotation"
    },
    ingredients: [
      {
        rawText: "800 g pumpkin, diced",
        canonicalName: "pumpkin",
        quantity: 800,
        unit: "g",
        preparationNote: "diced",
        conversionStatus: "ok"
      },
      {
        rawText: "400 g pasta",
        canonicalName: "pasta",
        quantity: 400,
        unit: "g",
        conversionStatus: "ok"
      },
      {
        rawText: "150 g spinach",
        canonicalName: "spinach",
        quantity: 150,
        unit: "g",
        conversionStatus: "ok"
      }
    ],
    steps: [
      {
        instruction: "Roast the pumpkin until soft and caramelised."
      },
      {
        instruction: "Cook the pasta and reserve some cooking water."
      },
      {
        instruction: "Blend pumpkin into a sauce, toss through pasta, and wilt in the spinach."
      }
    ]
  }
];

async function main() {
  const existingCount = await prisma.recipe.count();

  if (existingCount > 0) {
    console.log("Skipping seed because recipes already exist.");
    return;
  }

  for (const recipe of recipes) {
    await createRecipe(recipe);
  }

  console.log(`Seeded ${recipes.length} recipes.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
