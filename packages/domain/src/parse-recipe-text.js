function isHeading(line, headings) {
  const normalized = line.toLowerCase().replace(/[:\s]+$/g, "");
  return headings.includes(normalized);
}

function splitSections(lines) {
  const sections = {
    title: "",
    ingredients: [],
    method: []
  };

  let currentSection = "title";

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    if (isHeading(line, ["ingredients", "ingredient"])) {
      currentSection = "ingredients";
      continue;
    }

    if (isHeading(line, ["method", "instructions", "directions"])) {
      currentSection = "method";
      continue;
    }

    if (!sections.title) {
      sections.title = line;
      continue;
    }

    if (currentSection === "title") {
      currentSection = "ingredients";
    }

    sections[currentSection].push(line);
  }

  return sections;
}

function parseIngredientLine(line) {
  const trimmed = line.replace(/^[-*•]\s*/, "").trim();
  const match = trimmed.match(/^(\d+(?:[\/.]\d+)?(?:\s+\d+\/\d+)?.*?)\s+(.+)$/);

  if (!match) {
    return {
      quantity: "",
      name: trimmed
    };
  }

  return {
    quantity: match[1].trim(),
    name: match[2].trim()
  };
}

export function parseRecipeText(input) {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trimEnd());

  const sections = splitSections(lines);

  const ingredients = sections.ingredients
    .map(parseIngredientLine)
    .filter((ingredient) => ingredient.quantity || ingredient.name);

  let methodLines = sections.method;

  if (methodLines.length === 0 && sections.ingredients.length > 0) {
    const firstNonIngredientIndex = lines.findIndex((line) =>
      isHeading(line.trim(), ["method", "instructions", "directions"])
    );

    if (firstNonIngredientIndex === -1) {
      methodLines = [];
    }
  }

  if (sections.ingredients.length === 0 && sections.method.length === 0) {
    const remainingLines = lines
      .filter(Boolean)
      .slice(sections.title ? 1 : 0);

    return {
      title: sections.title,
      ingredients: remainingLines.map(parseIngredientLine),
      method: ""
    };
  }

  return {
    title: sections.title,
    ingredients,
    method: methodLines.join("\n")
  };
}
