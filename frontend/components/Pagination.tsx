"use client";

type Props = {
  page: number;           // 0-indexed
  totalPages: number;
  totalElements?: number;
  pageSize?: number;
  onChange: (page: number) => void;
};

function buildRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const left  = Math.max(1, current - 1);
  const right = Math.min(total - 2, current + 1);
  const range: (number | "...")[] = [0];
  if (left > 1) range.push("...");
  for (let i = left; i <= right; i++) range.push(i);
  if (right < total - 2) range.push("...");
  range.push(total - 1);
  return range;
}

export default function Pagination({ page, totalPages, totalElements, pageSize, onChange }: Props) {
  if (totalPages <= 1) return null;

  const info =
    totalElements != null && pageSize
      ? `${(page * pageSize + 1).toLocaleString()}–${Math.min((page + 1) * pageSize, totalElements).toLocaleString()} of ${totalElements.toLocaleString()}`
      : `Page ${page + 1} of ${totalPages}`;

  const btn = "min-w-[32px] h-8 px-2 rounded-full text-sm font-medium transition-all duration-200 ease-emphasized active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed";
  const inactive = "text-gray-600 hover:bg-md-primary/10";

  return (
    <div className="flex items-center justify-between text-sm select-none">
      <span className="text-gray-500">{info}</span>

      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 0}
          className={`${btn} ${inactive}`}
          aria-label="Previous page"
        >
          ←
        </button>

        {buildRange(page, totalPages).map((p, i) =>
          p === "..." ? (
            <span key={`el-${i}`} className="min-w-[32px] h-8 flex items-center justify-center text-gray-400 text-xs">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className={btn + (p === page ? "" : ` ${inactive}`)}
              style={p === page ? { backgroundColor: "var(--primary)", color: "#fff" } : {}}
              aria-current={p === page ? "page" : undefined}
              aria-label={`Page ${(p as number) + 1}`}
            >
              {(p as number) + 1}
            </button>
          )
        )}

        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages - 1}
          className={`${btn} ${inactive}`}
          aria-label="Next page"
        >
          →
        </button>
      </div>
    </div>
  );
}
