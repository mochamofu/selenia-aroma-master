import { DISCLOSURE_LABELS, type DisclosureLevel } from "@/lib/disclosure";

const STYLES: Record<DisclosureLevel, string> = {
  public: "bg-[#eef4e9] text-[#5e7d56]",
  instructor: "bg-[#efe8fb] text-[#755aa8]",
  internal: "bg-[#fdeaef] text-[#a8506e]",
};

/** そのセクションが誰まで見えるのかを示すバッジ。開示範囲の誤解を防ぐために必ず添える。 */
export function DisclosureBadge({ level }: { level: DisclosureLevel }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${STYLES[level]}`}>
      {DISCLOSURE_LABELS[level]}
    </span>
  );
}
