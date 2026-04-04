import { useState, useRef, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export function BottomNav() {
  const { user } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close dropdown when route changes
  useEffect(() => {
    setMoreOpen(false);
  }, []);

  const hasMoreItems =
    user &&
    (user.role === "lead" || user.role === "admin");

  const activeClass = "text-ghana-gold";
  const inactiveClass = "text-surface-500 dark:text-surface-500";

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center gap-0.5 flex-1 py-2 ${
      isActive ? activeClass : inactiveClass
    }`;

  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white/90 dark:bg-surface-950/90 backdrop-blur-xl border-t border-surface-200 dark:border-surface-800/50 pb-[env(safe-area-inset-bottom)]">
      <nav className="flex items-stretch">
        {/* Dashboard */}
        <NavLink to="/" end className={linkClass}>
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
            />
          </svg>
          <span className="text-[10px] leading-tight">Dashboard</span>
        </NavLink>

        {/* Equipment */}
        <NavLink to="/equipment" className={linkClass}>
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
            />
          </svg>
          <span className="text-[10px] leading-tight">Equipment</span>
        </NavLink>

        {/* Maintenance / Logs */}
        <NavLink to="/maintenance" className={linkClass}>
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.42 15.17l-5.1-5.1a2.121 2.121 0 113-3l5.1 5.1m0 0l5.1 5.1a2.121 2.121 0 01-3 3l-5.1-5.1m0 0L8.34 18.26m3.08-3.08l3.08-3.08"
            />
          </svg>
          <span className="text-[10px] leading-tight">Logs</span>
        </NavLink>

        {/* Scan */}
        <NavLink to="/scan" className={linkClass}>
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zm0 9.75c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zm9.75-9.75c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zm0 9.75c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z"
            />
          </svg>
          <span className="text-[10px] leading-tight">Scan</span>
        </NavLink>

        {/* More */}
        <div className="relative flex-1" ref={moreRef}>
          <button
            onClick={() => setMoreOpen((prev) => !prev)}
            className={`flex flex-col items-center justify-center gap-0.5 w-full py-2 ${
              moreOpen ? activeClass : inactiveClass
            }`}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm6 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm6 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
              />
            </svg>
            <span className="text-[10px] leading-tight">More</span>
          </button>

          {moreOpen && (
            <>
              {/* Overlay to capture outside clicks */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMoreOpen(false)}
              />

              {/* Dropdown menu */}
              <div className="absolute bottom-full mb-2 right-0 z-50 min-w-[160px] bg-white dark:bg-surface-900 rounded-xl shadow-warm-lg border border-surface-200 dark:border-surface-700 py-1">
                {hasMoreItems && (
                  <NavLink
                    to="/reports"
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      `block px-4 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? "text-ghana-gold bg-ghana-gold/10"
                          : "text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800"
                      }`
                    }
                  >
                    Reports
                  </NavLink>
                )}
                {user?.role === "admin" && (
                  <NavLink
                    to="/admin"
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      `block px-4 py-2.5 text-sm font-medium transition-colors ${
                        isActive
                          ? "text-ghana-gold bg-ghana-gold/10"
                          : "text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800"
                      }`
                    }
                  >
                    Admin
                  </NavLink>
                )}
                <a
                  href="/guide"
                  target="_blank"
                  onClick={() => setMoreOpen(false)}
                  className="block px-4 py-2.5 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                >
                  User Guide
                </a>
              </div>
            </>
          )}
        </div>
      </nav>
    </div>
  );
}
