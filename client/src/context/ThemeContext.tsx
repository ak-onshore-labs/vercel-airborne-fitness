import React, { createContext, useContext, useState, useEffect, useMemo } from "react";

const STORAGE_KEY = "airborne-dark-mode";

function readStored(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

function applyToDocument(dark: boolean): void {
  if (typeof document === "undefined") return;
  if (dark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

type ThemeContextType = {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkModeState] = useState(readStored);

  useEffect(() => {
    applyToDocument(darkMode);
  }, [darkMode]);

  const setDarkMode = (value: boolean) => {
    setDarkModeState(value);
    localStorage.setItem(STORAGE_KEY, value ? "true" : "false");
    applyToDocument(value);
  };

  const value = useMemo(() => ({ darkMode, setDarkMode }), [darkMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx === undefined) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
