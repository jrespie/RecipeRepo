import { recipeTags, sampleRecipes } from "@recipe-repo/domain";
import { appConfig } from "@recipe-repo/shared";

export default function App() {
  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Phase 1</p>
        <h1>{appConfig.name}</h1>
        <p className="intro">
          Local-first recipe repository, meal planner, and shopping list app for
          home use in New Zealand.
        </p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Current Focus</p>
            <h2>Recipe Repository</h2>
          </div>
          <span className="badge">Metric-first</span>
        </div>
        <p>
          Initial scaffold for recipe entry, recipe browsing, and ingredient
          normalisation. The next implementation step is wiring these cards to
          persistent storage.
        </p>
        <ul className="tag-list">
          {recipeTags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Seed Shape</p>
            <h2>Recipe Model Examples</h2>
          </div>
        </div>
        <div className="recipe-grid">
          {sampleRecipes.map((recipe) => (
            <article className="recipe-card" key={recipe.id}>
              <div className="recipe-topline">
                <h3>{recipe.name}</h3>
                <span>{recipe.servings} serves</span>
              </div>
              <p>{recipe.summary}</p>
              <dl>
                <div>
                  <dt>Protein</dt>
                  <dd>{recipe.protein}</dd>
                </div>
                <div>
                  <dt>Main vegetables</dt>
                  <dd>{recipe.vegetables.join(", ")}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
