import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api-client";

interface SearchResults {
  equipment: Array<{
    id: string;
    asset_tag: string;
    type: string;
    make: string | null;
    model: string | null;
  }>;
  logs: Array<{
    id: string;
    description: string;
    maintenance_type: string;
    logged_date: string;
  }>;
  entities: Array<{
    id: string;
    name: string;
    code: string;
    type: string;
  }>;
}

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchResults = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null);
      setIsOpen(false);
      return;
    }
    setIsLoading(true);
    try {
      const data = await api.get<SearchResults>(
        `/api/search?q=${encodeURIComponent(q)}`
      );
      setResults(data);
      const hasResults =
        data.equipment.length > 0 ||
        data.logs.length > 0 ||
        data.entities.length > 0;
      setIsOpen(hasResults);
    } catch {
      setResults(null);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(query);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, fetchResults]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Global "/" shortcut and Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement).tagName
        )
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        setMobileOpen(false);
        setQuery("");
        inputRef.current?.blur();
        mobileInputRef.current?.blur();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  function handleSelect(path: string) {
    setIsOpen(false);
    setMobileOpen(false);
    setQuery("");
    navigate(path);
  }

  const hasResults =
    results &&
    (results.equipment.length > 0 ||
      results.logs.length > 0 ||
      results.entities.length > 0);

  const resultsDropdown = isOpen && hasResults && (
    <div className="absolute top-full mt-1 w-full sm:w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
      {results.equipment.length > 0 && (
        <div>
          <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-900/50">
            Equipment
          </div>
          {results.equipment.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(`/equipment/${item.id}`)}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {item.asset_tag}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {[item.make, item.model].filter(Boolean).join(" ") ||
                  item.type}
              </p>
            </button>
          ))}
        </div>
      )}

      {results.logs.length > 0 && (
        <div>
          <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-900/50">
            Maintenance Logs
          </div>
          {results.logs.map((log) => (
            <button
              key={log.id}
              type="button"
              onClick={() => handleSelect("/maintenance")}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {log.description}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {log.maintenance_type} &middot; {log.logged_date}
              </p>
            </button>
          ))}
        </div>
      )}

      {results.entities.length > 0 && (
        <div>
          <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-900/50">
            Entities
          </div>
          {results.entities.map((entity) => (
            <button
              key={entity.id}
              type="button"
              onClick={() => handleSelect("/admin")}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {entity.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {entity.code} &middot; {entity.type}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div ref={containerRef} className="relative">
      {/* Mobile search icon */}
      <button
        className="sm:hidden p-2 rounded-lg text-surface-400 hover:text-neon-green transition-colors"
        onClick={() => setMobileOpen(true)}
        aria-label="Open search"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>

      {/* Mobile expanded search overlay */}
      {mobileOpen && (
        <div className="sm:hidden fixed inset-x-0 top-0 z-50 bg-surface-900 p-3 border-b border-surface-700">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={mobileInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                autoFocus
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-600 bg-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ghana-green/50 focus:border-ghana-green transition-colors"
              />
              {isLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-3.5 w-3.5 border-2 border-gray-600 border-t-ghana-green rounded-full animate-spin" />
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setMobileOpen(false);
                setQuery("");
                setIsOpen(false);
              }}
              className="text-surface-400 hover:text-surface-200 px-2 py-2 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
          {/* Mobile results dropdown */}
          <div className="relative">
            {resultsDropdown}
          </div>
        </div>
      )}

      {/* Desktop search */}
      <div className="hidden sm:block">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search... (press /)"
            className="w-48 lg:w-64 pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-ghana-green/50 focus:border-ghana-green transition-colors"
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-3.5 w-3.5 border-2 border-gray-300 dark:border-gray-600 border-t-ghana-green rounded-full animate-spin" />
            </div>
          )}
        </div>

        {resultsDropdown}
      </div>
    </div>
  );
}
