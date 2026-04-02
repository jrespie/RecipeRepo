import { useEffect, useMemo, useState } from "react";
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
    method: ""
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
    method: recipe.steps.map((step) => step.instruction).join("\n")
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
      sourceType: "manual",
      sourceName: "Recipe UI"
    }
  };
}

export default function App() {
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    setForm(emptyForm());
    setError("");
    setIsDialogOpen(true);
  }

  function openEditDialog() {
    if (!selectedRecipe) {
      return;
    }

    setForm(formFromRecipe(selectedRecipe));
    setError("");
    setIsDialogOpen(true);
  }

  function closeDialog() {
    setIsDialogOpen(false);
    setForm(emptyForm());
    setError("");
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
          </div>
        </div>
      ) : null}
    </main>
  );
}
