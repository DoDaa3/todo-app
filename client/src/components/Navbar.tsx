import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import NotificationBell from "./NotificationBell";

interface NavbarProps {
  onSearchOpen?: () => void;
}

export default function Navbar({ onSearchOpen }: NavbarProps) {
  const { user, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const location = useLocation();

  return (
    <nav className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl border-b border-stone-200/60 dark:border-stone-800/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center shadow-md shadow-brand-500/25 group-hover:shadow-brand-500/40 transition-shadow">
                <svg
                  className="w-4.5 h-4.5 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="7" height="9" rx="1.5" />
                  <rect x="14" y="3" width="7" height="5" rx="1.5" />
                  <rect x="14" y="12" width="7" height="9" rx="1.5" />
                  <rect x="3" y="16" width="7" height="5" rx="1.5" />
                </svg>
              </div>
              <span className="font-bold text-lg tracking-tight text-stone-900 dark:text-white">
                Flow<span className="text-brand-600 dark:text-brand-400">Board</span>
              </span>
            </Link>
            {user && (
              <Link
                to="/"
                className={`text-sm font-medium transition-colors ${
                  location.pathname === "/"
                    ? "text-brand-600 dark:text-brand-400"
                    : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                }`}
              >
                My Boards
              </Link>
            )}
          </div>
          {user && (
            <div className="flex items-center gap-1.5">
              {/* Search button */}
              {onSearchOpen && (
                <button
                  onClick={onSearchOpen}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-stone-400 dark:text-stone-500
                    bg-stone-100 dark:bg-stone-800 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="hidden sm:inline">Search</span>
                  <kbd className="hidden sm:inline text-[10px] font-medium bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400 px-1.5 py-0.5 rounded">
                    {navigator.platform.includes("Mac") ? "\u2318K" : "Ctrl+K"}
                  </kbd>
                </button>
              )}

              {/* Dark mode toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 text-stone-500 dark:text-stone-400 hover:text-amber-500 dark:hover:text-amber-400
                  rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                title={darkMode ? "Light mode" : "Dark mode"}
              >
                {darkMode ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {/* Notifications */}
              <NotificationBell />

              {/* User info */}
              <div className="hidden sm:flex items-center gap-2 ml-2 pl-2 border-l border-stone-200 dark:border-stone-700">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold">
                  {user.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <span className="text-sm text-stone-600 dark:text-stone-400 font-medium">
                  {user.name}
                </span>
              </div>
              <button
                onClick={logout}
                className="text-sm text-stone-400 dark:text-stone-500 hover:text-red-500 dark:hover:text-red-400 font-medium ml-1 transition-colors"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
