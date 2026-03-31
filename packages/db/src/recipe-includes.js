export const recipeIncludes = {
  ingredients: {
    include: {
      ingredient: true
    },
    orderBy: {
      sortOrder: "asc"
    }
  },
  steps: {
    orderBy: {
      stepNumber: "asc"
    }
  },
  tags: {
    include: {
      tag: true
    }
  },
  source: true
};
