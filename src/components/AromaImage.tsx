export function AromaImage({ title, className = "" }: { title: string; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-[#d8c6ee] via-[#f8dfdc] to-[#dcebd8] ${className}`}
      role="img"
      aria-label={`${title} のプレースホルダー画像`}
    >
      <div className="absolute left-4 top-4 h-16 w-16 rounded-full bg-white/36 blur-sm" />
      <div className="absolute bottom-3 right-3 h-20 w-20 rounded-full bg-[#d6bd73]/30 blur-md" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <div className="h-11 w-7 rounded-full border border-white/70 bg-white/40 shadow-sm" />
      </div>
    </div>
  );
}
