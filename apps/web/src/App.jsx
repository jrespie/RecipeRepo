import { useEffect, useMemo, useState } from "react";
import { appConfig } from "@recipe-repo/shared";

const emptyIngredient = () => ({
  rawText: "",
  canonicalName: "",
  quantity: "",
  unit: "g",
  preparationNote: "",
  optional: false,
  conversionStatus: "ok",
  conversionNotes: ""
});

const emptyStep = () => ({
  instruction: ""
});

const emptyRecipeForm = () => ({
  id: null,
  title: "",
  description: "",
  servings: 4,
  prepMinutes: "",
  cookMinutes: "",
  cuisine: "",
  proteinType: "",
  costBand: "",
  freezerFriendly: false,
  kidFriendly: true,
  tagsText: "",
  sourceType: "manual",
  sourceName: "",
  sourceUrl: "",
  attributionText: "",
  originalText: "",
  ingredients: [emptyIngredient()],
  steps: [emptyStep()]
});

function mapRecipeToForm(recipe) {
  return {
    id: recipe.id,
    title: recipe.title ?? "",
    description: recipe.description ?? "",
    servings: recipe.servings ?? 4,
    prepMinutes: recipe.prepMinutes ?? "",
    cookMinutes: recipe.cookMinutes ?? "",
    cuisine: recipe.cuisine ?? "",
    proteinType: recipe.proteinType ?? "",
    costBand: recipe.costBand ?? "",
    freezerFriendly: Boolean(recipe.freezerFriendly),
    kidFriendly: Boolean(recipe.kidFriendly),
    tagsText: recipe.tags.join(", "),
    sourceType: recipe.source?.sourceType ?? "manual",
    sourceName: recipe.source?.sourceName ?? "",
    sourceUrl: recipe.source?.sourceUrl ?? "",
    attributionText: recipe.source?.attributionText ?? "",
    originalText: recipe.source?.originalText ?? "",
    ingredients:
      recipe.ingredients.length > 0
        ? recipe.ingredients.map((ingredient) => ({
            rawText: ingredient.rawText ?? "",
            canonicalName: ingredient.canonicalName ?? "",
            quantity: ingredient.quantity ?? "",
            unit: ingredient.unit ?? "g",
            preparationNote: ingredient.preparationNote ?? "",
            optional: Boolean(ingredient.optional),
            conversionStatus: ingredient.conversionStatus ?? "review",
            conversionNotes: ingredient.conversionNotes ?? ""
          }))
        : [emptyIngredient()],
    steps:
      recipe.steps.length > 0
        ? recipe.steps.map((step) => ({
            instruction: step.instruction ?? ""
          }))
        : [emptyStep()]
  };
}

function buildPayload(form) {
  return {
    title: form.title,
    description: form.description,
    servings: Number(form.servings),
    prepMinutes: form.prepMinutes === "" ? null : Number(form.prepMinutes),
    cookMinutes: form.cookMinutes === "" ? null : Number(form.cookMinutes),
    cuisine: form.cuisine,
    proteinType: form.proteinType,
    costBand: form.costBand,
    freezerFriendly: form.freezerFriendly,
    kidFriendly: form.kidFriendly,
    tags: form.tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    source: {
      sourceType: form.sourceType,
      sourceName: form.sourceName,
      sourceUrl: form.sourceUrl,
      attributionText: form.attributionText,
      originalText: form.originalText
    },
    ingredients: form.ingredients.map((ingredient) => ({
      rawText: ingredient.rawText,
      canonicalName: ingredient.canonicalName,
      quantity: ingredient.quantity === "" ? null : Number(ingredient.quantity),
      unit: ingredient.unit,
      preparationNote: ingredient.preparationNote,
      optional: ingredient.optional,
      conversionStatus: ingredient.conversionStatus,
      conversionNotes: ingredient.conversionNotes
    })),
    steps: form.steps.map((step) => ({
      instruction: step.instruction
    }))
  };
}

export default function App() {
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const [form, setForm] = useState(emptyRecipeForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  async function loadRecipes(preferredId = null) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/recipes");
      const data = await response.json();

      setRecipes(data.items);

      const nextSelectedId =
        preferredId ??
        (data.items.some((recipe) => recipe.id === selectedRecipeId)
          ? selectedRecipeId
          : data.items[0]?.id ?? null);

      setSelectedRecipeId(nextSelectedId);

      if (nextSelectedId) {
        const recipeResponse = await fetch(`/api/recipes/${nextSelectedId}`);
        const recipe = await recipeResponse.json();
        setForm(mapRecipeToForm(recipe));
      } else {
        setForm(emptyRecipeForm());
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

  async function handleSelectRecipe(recipeId) {
    setSelectedRecipeId(recipeId);
    setStatusMessage("");

    try {
      const response = await fetch(`/api/recipes/${recipeId}`);
      const recipe = await response.json();
      setForm(mapRecipeToForm(recipe));
    } catch (nextError) {
      setError(nextError.message || "Failed to load recipe.");
    }
  }

  function updateFormField(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  }

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

  function updateStep(index, value) {
    setForm((currentForm) => ({
      ...currentForm,
      steps: currentForm.steps.map((step, stepIndex) =>
        stepIndex === index
          ? {
              ...step,
              instruction: value
            }
          : step
      )
    }));
  }

  function addIngredient() {
    setForm((currentForm) => ({
      ...currentForm,
      ingredients: [...currentForm.ingredients, emptyIngredient()]
    }));
  }

  function addStep() {
    setForm((currentForm) => ({
      ...currentForm,
      steps: [...currentForm.steps, emptyStep()]
    }));
  }

  function removeIngredient(index) {
    setForm((currentForm) => ({
      ...currentForm,
      ingredients:
        currentForm.ingredients.length === 1
          ? [emptyIngredient()]
          : currentForm.ingredients.filter((_, ingredientIndex) => ingredientIndex !== index)
    }));
  }

  function removeStep(index) {
    setForm((currentForm) => ({
      ...currentForm,
      steps:
        currentForm.steps.length === 1
          ? [emptyStep()]
          : currentForm.steps.filter((_, stepIndex) => stepIndex !== index)
    }));
  }

  function startNewRecipe() {
    setSelectedRecipeId(null);
    setForm(emptyRecipeForm());
    setStatusMessage("Creating a new recipe.");
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setStatusMessage("");

    try {
      const response = await fetch(
        form.id ? `/api/recipes/${form.id}` : "/api/recipes",
        {
          method: form.id ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(buildPayload(form))
        }
      );

      if (!response.ok) {
        const failure = await response.json().catch(() => ({
          message: "Unable to save recipe."
        }));
        throw new Error(failure.message || "Unable to save recipe.");
      }

      const savedRecipe = await response.json();
      await loadRecipes(savedRecipe.id);
      setStatusMessage(form.id ? "Recipe updated." : "Recipe created.");
    } catch (nextError) {
      setError(nextError.message || "Unable to save recipe.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Phase 1</p>
        <h1>{appConfig.name}</h1>
        <p className="intro">
          Recipe repository for a local-first meal planning and shopping app,
          built for home use in New Zealand.
        </p>
        <div className="hero-actions">
          <button className="primary-button" onClick={startNewRecipe} type="button">
            Add Recipe
          </button>
          <p className="hero-note">
            Metric-friendly storage, editable ingredient rows, and recipe detail
            review in one screen.
          </p>
        </div>
      </section>

      <div className="workspace-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Repository</p>
              <h2>Recipes</h2>
            </div>
            <span className="badge">{recipes.length} total</span>
          </div>

          {loading ? <p>Loading recipes…</p> : null}
          {!loading && recipes.length === 0 ? (
            <p className="empty-state">
              No recipes yet. Use “Add Recipe” to create the first one.
            </p>
          ) : null}

          <div className="recipe-list">
            {recipes.map((recipe) => (
              <button
                className={`recipe-list-item${recipe.id === selectedRecipeId ? " selected" : ""}`}
                key={recipe.id}
                onClick={() => handleSelectRecipe(recipe.id)}
                type="button"
              >
                <div className="recipe-list-topline">
                  <h3>{recipe.title}</h3>
                  <span>{recipe.servings} serves</span>
                </div>
                <p>{recipe.description || "No description yet."}</p>
                <div className="chip-row">
                  {recipe.proteinType ? <span>{recipe.proteinType}</span> : null}
                  {recipe.tags.slice(0, 2).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="panel detail-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Detail</p>
              <h2>{selectedRecipe?.title ?? "New recipe"}</h2>
            </div>
            <span className="badge">
              {selectedRecipe ? "Editing saved recipe" : "Draft"}
            </span>
          </div>

          {selectedRecipe ? (
            <div className="detail-summary">
              <p>{selectedRecipe.description || "No description yet."}</p>
              <div className="summary-grid">
                <div>
                  <dt>Servings</dt>
                  <dd>{selectedRecipe.servings}</dd>
                </div>
                <div>
                  <dt>Protein</dt>
                  <dd>{selectedRecipe.proteinType || "Not set"}</dd>
                </div>
                <div>
                  <dt>Cuisine</dt>
                  <dd>{selectedRecipe.cuisine || "Not set"}</dd>
                </div>
                <div>
                  <dt>Tags</dt>
                  <dd>{selectedRecipe.tags.join(", ") || "None"}</dd>
                </div>
              </div>
            </div>
          ) : (
            <p className="empty-state">
              Fill in the form to create a new recipe for the repository.
            </p>
          )}
        </section>
      </div>

      <section className="panel form-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Recipe Entry Service</p>
            <h2>{form.id ? "Edit Recipe" : "Create Recipe"}</h2>
          </div>
          <span className="badge">Manual entry</span>
        </div>

        {error ? <p className="message error">{error}</p> : null}
        {statusMessage ? <p className="message success">{statusMessage}</p> : null}

        <form className="recipe-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Title
              <input
                onChange={(event) => updateFormField("title", event.target.value)}
                required
                value={form.title}
              />
            </label>
            <label>
              Servings
              <input
                min="1"
                onChange={(event) => updateFormField("servings", event.target.value)}
                required
                type="number"
                value={form.servings}
              />
            </label>
            <label>
              Prep Minutes
              <input
                min="0"
                onChange={(event) => updateFormField("prepMinutes", event.target.value)}
                type="number"
                value={form.prepMinutes}
              />
            </label>
            <label>
              Cook Minutes
              <input
                min="0"
                onChange={(event) => updateFormField("cookMinutes", event.target.value)}
                type="number"
                value={form.cookMinutes}
              />
            </label>
            <label>
              Cuisine
              <input
                onChange={(event) => updateFormField("cuisine", event.target.value)}
                value={form.cuisine}
              />
            </label>
            <label>
              Protein Type
              <input
                onChange={(event) => updateFormField("proteinType", event.target.value)}
                value={form.proteinType}
              />
            </label>
            <label>
              Cost Band
              <input
                onChange={(event) => updateFormField("costBand", event.target.value)}
                placeholder="budget / medium / premium"
                value={form.costBand}
              />
            </label>
            <label>
              Tags
              <input
                onChange={(event) => updateFormField("tagsText", event.target.value)}
                placeholder="quick dinners, chicken, autumn"
                value={form.tagsText}
              />
            </label>
          </div>

          <label>
            Description
            <textarea
              onChange={(event) => updateFormField("description", event.target.value)}
              rows="3"
              value={form.description}
            />
          </label>

          <div className="checkbox-row">
            <label className="checkbox">
              <input
                checked={form.freezerFriendly}
                onChange={(event) =>
                  updateFormField("freezerFriendly", event.target.checked)
                }
                type="checkbox"
              />
              Freezer friendly
            </label>
            <label className="checkbox">
              <input
                checked={form.kidFriendly}
                onChange={(event) => updateFormField("kidFriendly", event.target.checked)}
                type="checkbox"
              />
              Kid friendly
            </label>
          </div>

          <div className="subsection">
            <div className="subsection-header">
              <div>
                <p className="eyebrow">Ingredients</p>
                <h3>Canonical ingredient rows</h3>
              </div>
              <button className="secondary-button" onClick={addIngredient} type="button">
                Add Ingredient
              </button>
            </div>
            <div className="stacked-list">
              {form.ingredients.map((ingredient, index) => (
                <div className="editable-card" key={`ingredient-${index}`}>
                  <div className="editable-card-grid">
                    <label className="full-width">
                      Raw Text
                      <input
                        onChange={(event) =>
                          updateIngredient(index, "rawText", event.target.value)
                        }
                        placeholder="400 g pasta"
                        value={ingredient.rawText}
                      />
                    </label>
                    <label>
                      Canonical Name
                      <input
                        onChange={(event) =>
                          updateIngredient(index, "canonicalName", event.target.value)
                        }
                        placeholder="pasta"
                        value={ingredient.canonicalName}
                      />
                    </label>
                    <label>
                      Quantity
                      <input
                        onChange={(event) =>
                          updateIngredient(index, "quantity", event.target.value)
                        }
                        step="0.01"
                        type="number"
                        value={ingredient.quantity}
                      />
                    </label>
                    <label>
                      Unit
                      <select
                        onChange={(event) =>
                          updateIngredient(index, "unit", event.target.value)
                        }
                        value={ingredient.unit}
                      >
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="ml">ml</option>
                        <option value="l">l</option>
                        <option value="each">each</option>
                      </select>
                    </label>
                    <label>
                      Prep Note
                      <input
                        onChange={(event) =>
                          updateIngredient(index, "preparationNote", event.target.value)
                        }
                        placeholder="diced"
                        value={ingredient.preparationNote}
                      />
                    </label>
                    <label>
                      Conversion Status
                      <select
                        onChange={(event) =>
                          updateIngredient(index, "conversionStatus", event.target.value)
                        }
                        value={ingredient.conversionStatus}
                      >
                        <option value="ok">ok</option>
                        <option value="review">review</option>
                      </select>
                    </label>
                    <label className="full-width">
                      Conversion Notes
                      <input
                        onChange={(event) =>
                          updateIngredient(index, "conversionNotes", event.target.value)
                        }
                        placeholder="Only needed when a conversion is ambiguous"
                        value={ingredient.conversionNotes}
                      />
                    </label>
                  </div>
                  <div className="card-actions">
                    <label className="checkbox">
                      <input
                        checked={ingredient.optional}
                        onChange={(event) =>
                          updateIngredient(index, "optional", event.target.checked)
                        }
                        type="checkbox"
                      />
                      Optional
                    </label>
                    <button
                      className="text-button"
                      onClick={() => removeIngredient(index)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="subsection">
            <div className="subsection-header">
              <div>
                <p className="eyebrow">Method</p>
                <h3>Recipe steps</h3>
              </div>
              <button className="secondary-button" onClick={addStep} type="button">
                Add Step
              </button>
            </div>
            <div className="stacked-list">
              {form.steps.map((step, index) => (
                <div className="editable-card" key={`step-${index}`}>
                  <label>
                    Step {index + 1}
                    <textarea
                      onChange={(event) => updateStep(index, event.target.value)}
                      rows="3"
                      value={step.instruction}
                    />
                  </label>
                  <div className="card-actions">
                    <button
                      className="text-button"
                      onClick={() => removeStep(index)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="subsection">
            <div className="subsection-header">
              <div>
                <p className="eyebrow">Source</p>
                <h3>Attribution and origin</h3>
              </div>
            </div>
            <div className="form-grid">
              <label>
                Source Type
                <input
                  onChange={(event) => updateFormField("sourceType", event.target.value)}
                  value={form.sourceType}
                />
              </label>
              <label>
                Source Name
                <input
                  onChange={(event) => updateFormField("sourceName", event.target.value)}
                  value={form.sourceName}
                />
              </label>
              <label className="full-width">
                Source URL
                <input
                  onChange={(event) => updateFormField("sourceUrl", event.target.value)}
                  value={form.sourceUrl}
                />
              </label>
              <label className="full-width">
                Attribution
                <input
                  onChange={(event) =>
                    updateFormField("attributionText", event.target.value)
                  }
                  value={form.attributionText}
                />
              </label>
              <label className="full-width">
                Original Text
                <textarea
                  onChange={(event) => updateFormField("originalText", event.target.value)}
                  rows="4"
                  value={form.originalText}
                />
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button className="primary-button" disabled={saving} type="submit">
              {saving ? "Saving…" : form.id ? "Save Changes" : "Create Recipe"}
            </button>
            <button className="secondary-button" onClick={startNewRecipe} type="button">
              Reset Form
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
