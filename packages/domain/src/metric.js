const UNIT_MAP = {
  g: { unit: "g", factor: 1 },
  kg: { unit: "g", factor: 1000 },
  ml: { unit: "ml", factor: 1 },
  l: { unit: "ml", factor: 1000 },
  tsp: { unit: "ml", factor: 5 },
  tbsp: { unit: "ml", factor: 15 },
  cup: { unit: "ml", factor: 250 },
  cups: { unit: "ml", factor: 250 },
  oz: { unit: "g", factor: 28.3495 },
  lb: { unit: "g", factor: 453.592 },
  each: { unit: "each", factor: 1 }
};

export function convertToMetric({ quantity, unit }) {
  const normalisedUnit = unit.trim().toLowerCase();
  const match = UNIT_MAP[normalisedUnit];

  if (!match) {
    return {
      quantity,
      unit: normalisedUnit,
      status: "review"
    };
  }

  if (match.unit === "each") {
    return {
      quantity,
      unit: "each",
      status: "ok"
    };
  }

  return {
    quantity: Number((quantity * match.factor).toFixed(2)),
    unit: match.unit,
    status: "ok"
  };
}
