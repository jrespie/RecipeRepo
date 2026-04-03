const UNIT_TOKENS = new Set([
  "g",
  "kg",
  "ml",
  "l",
  "litre",
  "litres",
  "tbsp",
  "tsp",
  "cup",
  "cups",
  "clove",
  "cloves",
  "piece",
  "pieces",
  "cm"
]);

function isHeading(line, headings) {
  const normalized = line.toLowerCase().replace(/[:\s]+$/g, "");
  return headings.includes(normalized);
}

function isQuantityLike(value) {
  const trimmed = value.trim().toLowerCase();

  return (
    /^\(?\d/.test(trimmed) ||
    /^(one|two|three|four|five|six|seven|eight|nine|ten)\b/.test(trimmed)
  );
}

function looksLikeIngredientLine(line) {
  const trimmed = line.replace(/^[-*•]\s*/, "").trim();

  if (!trimmed) {
    return false;
  }

  if (trimmed.includes(" - ")) {
    const parts = trimmed.split(/\s+-\s+/);
    return parts.length === 2 && isQuantityLike(parts[1]);
  }

  return isQuantityLike(trimmed);
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

    if (!sections.title && currentSection === "title" && !looksLikeIngredientLine(line)) {
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

function parseTrailingQuantity(line) {
  const match = line.match(/^(.*?)(?:\s+-\s+)(.+)$/);

  if (!match || !isQuantityLike(match[2])) {
    return null;
  }

  return {
    quantity: match[2].trim(),
    name: match[1].trim()
  };
}

function parseLeadingQuantity(line) {
  const trimmed = line.replace(/^[-*•]\s*/, "").trim();
  const tokens = trimmed.split(/\s+/).filter(Boolean);

  if (tokens.length === 0 || !isQuantityLike(tokens[0])) {
    return null;
  }

  const quantityTokens = [tokens[0]];
  let index = 1;
  let allowQuantityToken = false;

  while (index < tokens.length) {
    const token = tokens[index];
    const normalized = token.toLowerCase().replace(/[),.]+$/g, "");

    if (token === "+") {
      quantityTokens.push(token);
      allowQuantityToken = true;
      index += 1;
      continue;
    }

    if (allowQuantityToken && isQuantityLike(token)) {
      quantityTokens.push(token);
      allowQuantityToken = false;
      index += 1;
      continue;
    }

    if (
      UNIT_TOKENS.has(normalized) ||
      /^\([^)]*\)$/.test(token) ||
      /^\d+[a-z]+$/i.test(token) ||
      /^\d+\/\d+$/.test(token)
    ) {
      quantityTokens.push(token);
      index += 1;
      continue;
    }

    break;
  }

  return {
    quantity: quantityTokens.join(" ").trim(),
    name: tokens.slice(index).join(" ").trim()
  };
}

export function parseIngredientText(line) {
  const trimmed = line.replace(/^[-*•]\s*/, "").trim();
  const trailingQuantity = parseTrailingQuantity(trimmed);

  if (trailingQuantity) {
    return trailingQuantity;
  }

  const leadingQuantity = parseLeadingQuantity(trimmed);

  if (leadingQuantity) {
    return leadingQuantity;
  }

  return {
    quantity: "",
    name: trimmed
  };
}

export function parseRecipeText(input) {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trimEnd());

  const sections = splitSections(lines);

  if (!sections.title && sections.ingredients.length > 0) {
    sections.title = "";
  }

  const ingredients = sections.ingredients
    .map(parseIngredientText)
    .filter((ingredient) => ingredient.quantity || ingredient.name);

  if (sections.ingredients.length === 0 && sections.method.length === 0) {
    const remainingLines = lines
      .filter(Boolean)
      .slice(sections.title ? 1 : 0);

    return {
      title: sections.title,
      ingredients: remainingLines.map(parseIngredientText),
      method: ""
    };
  }

  return {
    title: sections.title,
    ingredients,
    method: sections.method.join("\n")
  };
}
