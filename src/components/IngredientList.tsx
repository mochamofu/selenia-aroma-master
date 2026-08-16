import type { AromaIngredient } from "@/types/aroma";

export function IngredientList({ ingredients }: { ingredients: AromaIngredient[] }) {
  return (
    <ul className="space-y-3">
      {ingredients
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((ingredient) => (
          <li key={ingredient.id} className="rounded-2xl bg-[#faf7f1] px-4 py-3">
            <span className="font-semibold text-stone-800">{ingredient.name}</span>
          </li>
        ))}
    </ul>
  );
}
