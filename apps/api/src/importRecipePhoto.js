import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parseRecipeText } from "@recipe-repo/domain";

const execFileAsync = promisify(execFile);

function normaliseOcrText(text) {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function recipeFromOcrText(text, sourceLabel = "Photo import") {
  const cleanedText = normaliseOcrText(text);
  const parsed = parseRecipeText(cleanedText);

  return {
    title: parsed.title,
    ingredients: parsed.ingredients,
    method: parsed.method,
    sourceType: "photo-import",
    sourceName: sourceLabel,
    sourceUrl: null,
    originalText: cleanedText
  };
}

function decodeImagePayload(imageBase64) {
  const match = imageBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!match) {
    throw new Error("Photo payload must be a base64 data URL");
  }

  const mimeType = match[1];
  const base64 = match[2];
  const extension = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "png";

  return {
    buffer: Buffer.from(base64, "base64"),
    extension
  };
}

export async function importRecipeFromPhoto(imageBase64) {
  if (!imageBase64 || typeof imageBase64 !== "string") {
    throw new Error("A recipe photo is required");
  }

  const { buffer, extension } = decodeImagePayload(imageBase64);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "recipe-photo-"));
  const inputPath = path.join(tempDir, `${randomUUID()}.${extension}`);

  try {
    await fs.writeFile(inputPath, buffer);
    const { stdout } = await execFileAsync("tesseract", [inputPath, "stdout"], {
      maxBuffer: 10 * 1024 * 1024
    });

    return recipeFromOcrText(stdout);
  } catch (error) {
    throw new Error(`Unable to read text from recipe photo: ${error.message}`);
  } finally {
    await fs.rm(tempDir, {
      recursive: true,
      force: true
    });
  }
}
