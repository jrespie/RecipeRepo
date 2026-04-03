import { parseIngredientText, parseRecipeText } from "@recipe-repo/domain";

function decodeHtmlEntities(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(html) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<\/(p|div|section|article|h1|h2|h3|h4|li|ul|ol|br)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function toArray(value) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function normaliseInstruction(value) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (value && typeof value.text === "string") {
    return value.text.trim();
  }

  if (value && typeof value.name === "string") {
    return value.name.trim();
  }

  return "";
}

function isLikelyIngredientSectionHeading(line) {
  const trimmed = line.trim();

  if (!trimmed) {
    return false;
  }

  if (/\d/.test(trimmed)) {
    return false;
  }

  return /^(?:[A-Z][a-z]+)(?:\s+[A-Z][a-z]+){0,2}$/.test(trimmed);
}

function splitInstructionBlob(text, sectionHeadings) {
  let working = text.trim();

  for (const heading of sectionHeadings) {
    const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escapedHeading}\\b\\s+`, "g");
    working = working.replace(pattern, "");
  }

  working = working.replace(
    /\s+(Add|Set|Heat|Strain|Serve|Enjoy|Combine|Reduce|Mix|Whisk|Stir|Cook|Simmer|Place|Bring|Keep|Carefully|Divide|Sprinkle|Toss|Fry)\b/g,
    "\n$1"
  );

  return working
    .split(/\n|(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function findRecipeObject(input) {
  if (!input) {
    return null;
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      const match = findRecipeObject(item);

      if (match) {
        return match;
      }
    }

    return null;
  }

  if (typeof input !== "object") {
    return null;
  }

  const type = input["@type"];
  const types = Array.isArray(type) ? type : [type];

  if (types.filter(Boolean).includes("Recipe")) {
    return input;
  }

  if (input["@graph"]) {
    return findRecipeObject(input["@graph"]);
  }

  for (const value of Object.values(input)) {
    const match = findRecipeObject(value);

    if (match) {
      return match;
    }
  }

  return null;
}

export function extractRecipeFromHtml(html, pageUrl) {
  const scriptMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  for (const match of scriptMatches) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const recipe = findRecipeObject(parsed);

      if (!recipe) {
        continue;
      }

      const rawIngredientLines = toArray(recipe.recipeIngredient)
        .map((line) => (typeof line === "string" ? line.trim() : ""))
        .filter(Boolean);

      const ingredientSectionHeadings = rawIngredientLines.filter(isLikelyIngredientSectionHeading);

      const ingredients = rawIngredientLines
        .filter((line) => !isLikelyIngredientSectionHeading(line))
        .map(parseIngredientText)
        .filter((item) => item.name);

      const rawMethod = toArray(recipe.recipeInstructions)
        .map(normaliseInstruction)
        .filter(Boolean)
        .join("\n");

      const method = splitInstructionBlob(rawMethod, ingredientSectionHeadings);

      const originalText = [
        recipe.name?.trim() || "",
        rawIngredientLines.length > 0 ? `Ingredients\n${rawIngredientLines.join("\n")}` : "",
        method ? `Method\n${method}` : ""
      ].filter(Boolean).join("\n\n");

      return {
        title: recipe.name?.trim() || "",
        ingredients,
        method,
        sourceType: "url-import",
        sourceName: new URL(pageUrl).hostname,
        sourceUrl: pageUrl,
        originalText
      };
    } catch {
      continue;
    }
  }

  const text = stripTags(html);
  const parsed = parseRecipeText(text);

  return {
    title: parsed.title,
    ingredients: parsed.ingredients,
    method: parsed.method,
    sourceType: "url-import",
    sourceName: new URL(pageUrl).hostname,
    sourceUrl: pageUrl,
    originalText: text
  };
}

export async function importRecipeFromUrl(pageUrl) {
  let parsedUrl;

  try {
    parsedUrl = new URL(pageUrl);
  } catch {
    throw new Error("A valid URL is required");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Only http and https URLs are supported");
  }

  const response = await fetch(parsedUrl, {
    headers: {
      "User-Agent": "RecipeRepo/0.1 URL importer"
    }
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch recipe URL (${response.status})`);
  }

  const html = await response.text();
  return extractRecipeFromHtml(html, parsedUrl.toString());
}
