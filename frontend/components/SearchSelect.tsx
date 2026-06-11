"use client";

import { useEffect, useRef, useState } from "react";

export type SearchOption = { id: string; primary: string; secondary?: string };

export default function SearchSelect({
  value,
  displayValue,
  placeholder,
  onSelect,
  onSearch,
}: {
  value: string;
  displayValue: string;
  placeholder: string;
  onSelect: (opt: SearchOption | null) => void;
  onSearch: (query: string) => Promise<SearchOption[]>;
}) {
  const [query, setQuery]     = useState("");
  const [open, setOpen]       = useState(false);
  const [options, setOptions] = useState<SearchOption[]>([]);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (container.current && !container.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", down);
    return () => document.removeEventListener("mousedown", down);
  }, []);

  const search = (q: string) => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try { setOptions(await onSearch(q)); }
      catch { setOptions([]); }
      finally { setLoading(false); }
    }, 280);
  };

  const handleFocus = () => {
    setOpen(true);
    search(query);
  };

  const handleChange = (q: string) => {
    setQuery(q);
    search(q);
  };

  const handleSelect = (opt: SearchOption) => {
    onSelect(opt);
    setQuery("");
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
    setQuery("");
    setOpen(false);
  };

  const inputCls = "w-full text-sm px-4 py-2.5 rounded-t-[12px] rounded-b-none outline-none pr-8 bg-md-surface-container-low text-md-on-surface placeholder:text-md-on-surface/50 transition-colors duration-200";
  const borderColor = value ? "var(--primary)" : "var(--color-md-outline)";

  return (
    <div ref={container} className="relative">
      <input
        ref={input}
        type="text"
        value={open ? query : displayValue}
        placeholder={placeholder}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={handleFocus}
        className={inputCls}
        style={{ border: "0 solid transparent", borderBottom: `2px solid ${borderColor}` }}
        autoComplete="off"
      />

      {/* Clear button */}
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-md-on-surface-variant hover:bg-md-primary/10 rounded-full p-1 transition-colors"
          tabIndex={-1}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-30 left-0 right-0 mt-1 rounded-2xl overflow-hidden"
          style={{ backgroundColor: "var(--bg-app)", boxShadow: "0 8px 24px rgba(28,27,31,0.14)", top: "100%" }}
        >
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-400">
              <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
              Searching…
            </div>
          ) : options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400">
              {query.trim() ? "No results found." : "Start typing to search…"}
            </div>
          ) : (
            <ul className="max-h-52 overflow-y-auto py-1">
              {options.map((opt) => (
                <li key={opt.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(opt)}
                    className="w-full text-left px-4 py-2.5 transition-colors hover:bg-md-primary/10"
                  >
                    <p className="text-sm font-medium text-gray-900">{opt.primary}</p>
                    {opt.secondary && <p className="text-xs text-gray-400 mt-0.5">{opt.secondary}</p>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
