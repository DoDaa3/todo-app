import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import api from "../lib/api";

interface ThemeContextValue {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getInitialDarkMode(): boolean {
  const stored = localStorage.getItem("darkMode");
  if (stored !== null) {
    return stored === "true";
  }
  // Auto-detect system preference
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return false;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState<boolean>(getInitialDarkMode);

  // Sync the "dark" class on <html> whenever darkMode changes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Listen for system preference changes (only when user hasn't set a manual preference)
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    function handleChange(e: MediaQueryListEvent) {
      const stored = localStorage.getItem("darkMode");
      if (stored === null) {
        setDarkMode(e.matches);
      }
    }
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;

      // Persist to localStorage
      localStorage.setItem("darkMode", String(next));

      // Persist server-side only if logged in (fire-and-forget)
      const token = localStorage.getItem("token");
      if (token) {
        api.patch("/auth/me", { darkMode: next }).catch(() => {});
      }

      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
