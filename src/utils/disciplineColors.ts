const DISCIPLINE_BADGE_PALETTE = [
  "bg-indigo-50 text-indigo-800 border-indigo-200",
  "bg-emerald-50 text-emerald-800 border-emerald-200",
  "bg-amber-50 text-amber-900 border-amber-200",
  "bg-rose-50 text-rose-800 border-rose-200",
  "bg-sky-50 text-sky-800 border-sky-200",
  "bg-violet-50 text-violet-800 border-violet-200",
  "bg-teal-50 text-teal-800 border-teal-200",
  "bg-orange-50 text-orange-800 border-orange-200",
] as const;

export function getDisciplineBadgeClasses(discipline: string): string {
  const normalized = (discipline || "Geral").trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }
  const paletteClass =
    DISCIPLINE_BADGE_PALETTE[hash % DISCIPLINE_BADGE_PALETTE.length];
  return `inline-flex items-center max-w-full truncate rounded px-2 py-0.5 text-[11px] font-semibold border ${paletteClass}`;
}
