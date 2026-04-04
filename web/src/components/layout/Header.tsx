import { useAuth } from "../../hooks/useAuth";
import { useOfflineSync } from "../../hooks/useOfflineSync";
import { useTheme } from "../../hooks/useTheme";
import { SearchBar } from "./SearchBar";

export function Header() {
  const { user, logout } = useAuth();
  const { isOnline, pendingCount, isSyncing, syncPending } = useOfflineSync();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-16 border-b border-surface-200 dark:border-surface-800/50 bg-white/80 dark:bg-surface-900/80 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Mobile logo */}
      <div className="lg:hidden flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-ghana-gold/10 border border-ghana-gold/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-ghana-gold" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
        <span className="font-display text-base text-surface-900 dark:text-surface-100">RSIMD</span>
      </div>

      {/* Spacer for desktop */}
      <div className="hidden lg:block" />

      {/* Search */}
      <SearchBar />

      {/* Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            {theme === "dark" ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            )}
          </svg>
        </button>

        {/* Offline/sync indicators */}
        {!isOnline && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-ghana-red/10 text-ghana-red border border-ghana-red/20">
            Offline
          </span>
        )}
        {isSyncing ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-ghana-gold">
            <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Syncing...
          </span>
        ) : pendingCount > 0 ? (
          <button
            type="button"
            onClick={syncPending}
            className="flex items-center gap-1.5 text-xs font-medium text-ghana-gold bg-ghana-gold/10 border border-ghana-gold/20 rounded-full px-3 py-1 hover:bg-ghana-gold/15 transition-colors"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-ghana-gold animate-pulse" />
            {pendingCount} pending
          </button>
        ) : null}

        {/* User info */}
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-surface-900 dark:text-surface-100">{user?.name}</p>
          <p className="text-[10px] text-surface-500 dark:text-surface-500 uppercase tracking-wider">{user?.role}</p>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="px-3 py-1.5 rounded-xl text-xs font-medium text-surface-500 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 border border-surface-200 dark:border-surface-700 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
