import { useEffect, useMemo, useState } from "react";
import { parseRecipeText } from "@recipe-repo/domain";
import { appConfig } from "@recipe-repo/shared";

function emptyIngredient() {
  return {
    quantity: "",
    name: ""
  };
}

function emptyForm() {
  return {
    id: null,
    title: "",
    ingredients: [emptyIngredient()],
    method: "",
    sourceType: "manual",
    sourceName: "Recipe UI",
    sourceUrl: "",
    originalText: ""
  };
}

function formFromRecipe(recipe) {
  return {
    id: recipe.id,
    title: recipe.title,
    ingredients:
      recipe.ingredients.length > 0
        ? recipe.ingredients.map((ingredient) => {
            const rawText = ingredient.rawText ?? "";
            const canonicalName = ingredient.canonicalName ?? "";
            const quantityPrefix = canonicalName
              ? rawText.slice(0, Math.max(0, rawText.toLowerCase().indexOf(canonicalName.toLowerCase()))).trim()
              : "";

            return {
              quantity: quantityPrefix,
              name: canonicalName || rawText
            };
          })
        : [emptyIngredient()],
    method: recipe.steps.map((step) => step.instruction).join("\n"),
    sourceType: recipe.source?.sourceType ?? "manual",
    sourceName: recipe.source?.sourceName ?? "Recipe UI",
    sourceUrl: recipe.source?.sourceUrl ?? "",
    originalText: recipe.source?.originalText ?? ""
  };
}

function toPayload(form) {
  const ingredients = form.ingredients
    .map((ingredient) => ({
      quantity: ingredient.quantity.trim(),
      name: ingredient.name.trim()
    }))
    .filter((ingredient) => ingredient.quantity || ingredient.name)
    .map((ingredient) => ({
      rawText: `${ingredient.quantity} ${ingredient.name}`.trim(),
      canonicalName: ingredient.name || null,
      quantity: null,
      unit: "each",
      preparationNote: null,
      optional: false,
      conversionStatus: "review",
      conversionNotes: null
    }));

  const steps = form.method
    .split("\n")
    .map((instruction) => instruction.trim())
    .filter(Boolean)
    .map((instruction) => ({
      instruction
    }));

  return {
    title: form.title.trim(),
    description: null,
    servings: 4,
    ingredients,
    steps,
    tags: [],
    source: {
      sourceType: form.sourceType || "manual",
      sourceName: form.sourceName || "Recipe UI",
      sourceUrl: form.sourceUrl || null,
      originalText: form.originalText || null
    }
  };
}

export default function App() {
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("manual");
  const [form, setForm] = useState(emptyForm);
  const [pasteText, setPasteText] = useState("");
  const [urlText, setUrlText] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  async function loadRecipes(preferredId = null) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/recipes");
      const data = await response.json();

      setRecipes(data.items);

      if (preferredId) {
        setSelectedRecipeId(preferredId);
      } else if (!selectedRecipeId && data.items[0]) {
        setSelectedRecipeId(data.items[0].id);
      } else if (!data.items.some((recipe) => recipe.id === selectedRecipeId)) {
        setSelectedRecipeId(data.items[0]?.id ?? null);
      }
    } catch (nextError) {
      setError(nextError.message || "Failed to load recipes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecipes();
  }, []);

  const selectedRecipe = useMemo(
    () => recipes.find((recipe) => recipe.id === selectedRecipeId) ?? null,
    [recipes, selectedRecipeId]
  );

  function updateIngredient(index, field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      ingredients: currentForm.ingredients.map((ingredient, ingredientIndex) =>
        ingredientIndex === index
          ? {
              ...ingredient,
              [field]: value
            }
          : ingredient
      )
    }));
  }

  function addIngredientRow() {
    setForm((currentForm) => ({
      ...currentForm,
      ingredients: [...currentForm.ingredients, emptyIngredient()]
    }));
  }

  function removeIngredientRow(index) {
    setForm((currentForm) => ({
      ...currentForm,
      ingredients:
        currentForm.ingredients.length === 1
          ? [emptyIngredient()]
          : currentForm.ingredients.filter((_, ingredientIndex) => ingredientIndex !== index)
    }));
  }

  function openDialog() {
    setDialogMode("manual");
    setPasteText("");
    setUrlText("");
    setPhotoDataUrl("");
    setForm(emptyForm());
    setError("");
    setIsDialogOpen(true);
  }

  function openPasteDialog() {
    setDialogMode("paste");
    setPasteText("");
    setUrlText("");
    setPhotoDataUrl("");
    setForm(emptyForm());
    setError("");
    setIsDialogOpen(true);
  }

  function openUrlDialog() {
    setDialogMode("url");
    setPasteText("");
    setUrlText("");
    setPhotoDataUrl("");
    setForm(emptyForm());
    setError("");
    setIsDialogOpen(true);
  }

  function openPhotoDialog() {
    setDialogMode("photo");
    setPasteText("");
    setUrlText("");
    setPhotoDataUrl("");
    setForm(emptyForm());
    setError("");
    setIsDialogOpen(true);
  }

  function openEditDialog() {
    if (!selectedRecipe) {
      return;
    }

    setDialogMode("manual");
    setPasteText("");
    setUrlText("");
    setPhotoDataUrl("");
    setForm(formFromRecipe(selectedRecipe));
    setError("");
    setIsDialogOpen(true);
  }

  function closeDialog() {
    setIsDialogOpen(false);
    setDialogMode("manual");
    setPasteText("");
    setUrlText("");
    setPhotoDataUrl("");
    setForm(emptyForm());
    setError("");
  }

  async function handlePhotoFileChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      setPhotoDataUrl("");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setPhotoDataUrl(String(reader.result || ""));
    };

    reader.readAsDataURL(file);
  }

  function handleParsePaste() {
    const parsed = parseRecipeText(pasteText);

    setForm({
      id: null,
      title: parsed.title || "",
      ingredients:
        parsed.ingredients.length > 0
          ? parsed.ingredients.map((ingredient) => ({
              quantity: ingredient.quantity,
              name: ingredient.name
            }))
          : [emptyIngredient()],
      method: parsed.method,
      sourceType: "pasted-text",
      sourceName: "Pasted text",
      sourceUrl: "",
      originalText: pasteText
    });
    setDialogMode("manual");
  }

  async function handleImportUrl() {
    setImporting(true);
    setError("");

    try {
      const response = await fetch("/api/recipes/import-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url: urlText
        })
      });

      if (!response.ok) {
        const failure = await response.json().catch(() => ({
          message: "Unable to import recipe URL."
        }));
        throw new Error(failure.message || "Unable to import recipe URL.");
      }

      const imported = await response.json();

      setForm({
        id: null,
        title: imported.title || "",
        ingredients:
          imported.ingredients.length > 0
            ? imported.ingredients.map((ingredient) => ({
                quantity: ingredient.quantity,
                name: ingredient.name
              }))
            : [emptyIngredient()],
        method: imported.method || "",
        sourceType: imported.sourceType || "url-import",
        sourceName: imported.sourceName || "URL import",
        sourceUrl: imported.sourceUrl || urlText,
        originalText: imported.originalText || ""
      });
      setDialogMode("manual");
    } catch (nextError) {
      setError(nextError.message || "Unable to import recipe URL.");
    } finally {
      setImporting(false);
    }
  }

  async function handleImportPhoto() {
    setImporting(true);
    setError("");

    try {
      const response = await fetch("/api/recipes/import-photo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          imageBase64: photoDataUrl
        })
      });

      if (!response.ok) {
        const failure = await response.json().catch(() => ({
          message: "Unable to import recipe photo."
        }));
        throw new Error(failure.message || "Unable to import recipe photo.");
      }

      const imported = await response.json();

      setForm({
        id: null,
        title: imported.title || "",
        ingredients:
          imported.ingredients.length > 0
            ? imported.ingredients.map((ingredient) => ({
                quantity: ingredient.quantity,
                name: ingredient.name
              }))
            : [emptyIngredient()],
        method: imported.method || "",
        sourceType: imported.sourceType || "photo-import",
        sourceName: imported.sourceName || "Photo import",
        sourceUrl: "",
        originalText: imported.originalText || ""
      });
      setDialogMode("manual");
    } catch (nextError) {
      setError(nextError.message || "Unable to import recipe photo.");
    } finally {
      setImporting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch(form.id ? `/api/recipes/${form.id}` : "/api/recipes", {
        method: form.id ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(toPayload(form))
      });

      if (!response.ok) {
        const failure = await response.json().catch(() => ({
          message: "Unable to save recipe."
        }));
        throw new Error(failure.message || "Unable to save recipe.");
      }

      const recipe = await response.json();
      closeDialog();
      await loadRecipes(recipe.id);
    } catch (nextError) {
      setError(nextError.message || "Unable to save recipe.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedRecipe) {
      return;
    }

    const confirmed = window.confirm(`Delete "${selectedRecipe.title}"?`);

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      const response = await fetch(`/api/recipes/${selectedRecipe.id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const failure = await response.json().catch(() => ({
          message: "Unable to delete recipe."
        }));
        throw new Error(failure.message || "Unable to delete recipe.");
      }

      await loadRecipes();
    } catch (nextError) {
      setError(nextError.message || "Unable to delete recipe.");
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Recipe Repository</p>
          <h1>{appConfig.name}</h1>
        </div>
        <button className="primary-button" onClick={openDialog} type="button">
          Add Recipe
        </button>
        <button className="secondary-button" onClick={openPasteDialog} type="button">
          Add From Text
        </button>
        <button className="secondary-button" onClick={openUrlDialog} type="button">
          Add From URL
        </button>
        <button className="secondary-button" onClick={openPhotoDialog} type="button">
          Add From Photo
        </button>
      </header>

      {error ? <p className="message error">{error}</p> : null}

      <section className="layout">
        <section className="panel list-panel">
          <div className="panel-header">
            <h2>Recipes</h2>
            <span className="count">{recipes.length}</span>
          </div>

          {loading ? <p>Loading…</p> : null}

          <div className="recipe-list">
            {recipes.map((recipe) => (
              <button
                className={`recipe-row${recipe.id === selectedRecipeId ? " selected" : ""}`}
                key={recipe.id}
                onClick={() => setSelectedRecipeId(recipe.id)}
                type="button"
              >
                <span>{recipe.title}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel detail-panel">
          {selectedRecipe ? (
            <>
              <div className="panel-header">
                <h2>{selectedRecipe.title}</h2>
                <div className="action-row">
                  <button
                    className="secondary-button"
                    onClick={openEditDialog}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="danger-button"
                    onClick={handleDelete}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="recipe-section">
                <h3>Ingredients</h3>
                <ul className="ingredient-list">
                  {selectedRecipe.ingredients.map((ingredient) => (
                    <li key={ingredient.id}>{ingredient.rawText}</li>
                  ))}
                </ul>
              </div>

              {selectedRecipe.steps.length > 0 ? (
                <div className="recipe-section">
                  <h3>Method</h3>
                  <ol className="method-list">
                    {selectedRecipe.steps.map((step) => (
                      <li key={step.id}>{step.instruction}</li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </>
          ) : (
            <p>Select a recipe from the list.</p>
          )}
        </section>
      </section>

      {isDialogOpen ? (
        <div className="dialog-backdrop" onClick={closeDialog} role="presentation">
          <div
            className="dialog"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-recipe-title"
          >
            <div className="panel-header">
              <h2 id="add-recipe-title">{form.id ? "Edit Recipe" : "Add Recipe"}</h2>
              <button className="text-button" onClick={closeDialog} type="button">
                Close
              </button>
            </div>

            {!form.id ? (
              <div className="dialog-toggle">
                <button
                  className={dialogMode === "manual" ? "toggle-button active" : "toggle-button"}
                  onClick={() => setDialogMode("manual")}
                  type="button"
                >
                  Manual
                </button>
                <button
                  className={dialogMode === "paste" ? "toggle-button active" : "toggle-button"}
                  onClick={() => setDialogMode("paste")}
                  type="button"
                >
                  Paste Text
                </button>
                <button
                  className={dialogMode === "url" ? "toggle-button active" : "toggle-button"}
                  onClick={() => setDialogMode("url")}
                  type="button"
                >
                  URL
                </button>
                <button
                  className={dialogMode === "photo" ? "toggle-button active" : "toggle-button"}
                  onClick={() => setDialogMode("photo")}
                  type="button"
                >
                  Photo
                </button>
              </div>
            ) : null}

            {dialogMode === "paste" && !form.id ? (
              <div className="dialog-form">
                <label>
                  Paste Recipe Text
                  <textarea
                    onChange={(event) => setPasteText(event.target.value)}
                    placeholder={`Tomato Pasta

Ingredients
400 g pasta
1 onion

Method
Boil the pasta.
Saute the onion.`}
                    rows="12"
                    value={pasteText}
                  />
                </label>

                <div className="dialog-actions">
                  <button
                    className="primary-button"
                    disabled={!pasteText.trim()}
                    onClick={handleParsePaste}
                    type="button"
                  >
                    Parse Text
                  </button>
                </div>
              </div>
            ) : dialogMode === "url" && !form.id ? (
              <div className="dialog-form">
                <label>
                  Recipe URL
                  <input
                    onChange={(event) => setUrlText(event.target.value)}
                    placeholder="https://example.com/recipe"
                    type="url"
                    value={urlText}
                  />
                </label>

                <div className="dialog-actions">
                  <button
                    className="primary-button"
                    disabled={!urlText.trim() || importing}
                    onClick={handleImportUrl}
                    type="button"
                  >
                    {importing ? "Importing…" : "Import URL"}
                  </button>
                </div>
              </div>
            ) : dialogMode === "photo" && !form.id ? (
              <div className="dialog-form">
                <label>
                  Recipe Photo
                  <input
                    accept="image/*"
                    onChange={handlePhotoFileChange}
                    type="file"
                  />
                </label>

                {photoDataUrl ? (
                  <img alt="Recipe upload preview" className="photo-preview" src={photoDataUrl} />
                ) : null}

                <div className="dialog-actions">
                  <button
                    className="primary-button"
                    disabled={!photoDataUrl || importing}
                    onClick={handleImportPhoto}
                    type="button"
                  >
                    {importing ? "Reading Photo…" : "Import Photo"}
                  </button>
                </div>
              </div>
            ) : (
            <form className="dialog-form" onSubmit={handleSubmit}>
              <label>
                Name
                <input
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      title: event.target.value
                    }))
                  }
                  required
                  value={form.title}
                />
              </label>

              <div className="recipe-section">
                <div className="panel-header">
                  <h3>Ingredients</h3>
                  <button className="secondary-button" onClick={addIngredientRow} type="button">
                    Add Row
                  </button>
                </div>

                <div className="ingredient-editor">
                  {form.ingredients.map((ingredient, index) => (
                    <div className="ingredient-row" key={`ingredient-${index}`}>
                      <input
                        onChange={(event) =>
                          updateIngredient(index, "quantity", event.target.value)
                        }
                        placeholder="Quantity"
                        value={ingredient.quantity}
                      />
                      <input
                        onChange={(event) =>
                          updateIngredient(index, "name", event.target.value)
                        }
                        placeholder="Ingredient"
                        value={ingredient.name}
                      />
                      <button
                        className="text-button"
                        onClick={() => removeIngredientRow(index)}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <label>
                Method
                <textarea
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      method: event.target.value
                    }))
                  }
                  placeholder="Write the cooking method here. One step per line if you want separate steps."
                  rows="8"
                  value={form.method}
                />
              </label>

              <div className="dialog-actions">
                <button className="primary-button" disabled={saving} type="submit">
                  {saving ? "Saving…" : form.id ? "Save Changes" : "Save Recipe"}
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
