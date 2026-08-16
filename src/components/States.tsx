import { Icon } from "./Icon";

export function LoadingState({ label = "読み込み中です" }: { label?: string }) {
  return (
    <div className="grid min-h-64 place-items-center px-6 text-center">
      <div className="space-y-4">
        <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-[#d9c7ee]" />
        <p className="text-sm font-semibold text-stone-500">{label}</p>
      </div>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[28px] border border-dashed border-[#d6c7ad] bg-white/70 p-8 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-[#f2eadc] text-[#9f7a2f]">
        <Icon name="Sparkles" className="h-7 w-7" />
      </div>
      <h2 className="text-lg font-bold text-stone-800">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-stone-500">{description}</p>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-[24px] border border-red-100 bg-red-50 p-5 text-sm font-semibold text-red-700">
      {message}
    </div>
  );
}
