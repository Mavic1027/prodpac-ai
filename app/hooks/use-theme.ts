import { useCallback, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "app:theme";

function getSystemPref(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
  return stored ?? getSystemPref();
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  // Apply theme to the root html element so Tailwind dark: styles work globally
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  // Keep in sync with OS changes unless user explicitly set a preference
  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setTheme(media.matches ? "dark" : "light");
      }
    };
    try {
      media.addEventListener("change", listener);
    } catch {
      // Safari fallback
      media.addListener(listener);
    }
    return () => {
      try {
        media.removeEventListener("change", listener);
      } catch {
        media.removeListener(listener);
      }
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, toggleTheme]);
}


