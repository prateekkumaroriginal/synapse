import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ThemeContext,
  type ThemeContextValue,
  type ThemePreference,
} from "./theme-context";

const STORAGE_KEY = "synapse-ui-theme";

function readStoredPreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return "system";
}

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveClass(preference: ThemePreference): "light" | "dark" {
  if (preference === "system") {
    return systemPrefersDark() ? "dark" : "light";
  }
  return preference;
}

function applyDomTheme(resolved: "light" | "dark"): void {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    typeof window === "undefined" ? "system" : readStoredPreference(),
  );

  const resolved = useMemo(
    () => resolveClass(preference),
    [preference],
  );

  useEffect(() => {
    applyDomTheme(resolved);
  }, [resolved]);

  useEffect(() => {
    if (preference !== "system") {
      return;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (): void => {
      applyDomTheme(systemPrefersDark() ? "dark" : "light");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    applyDomTheme(resolveClass(next));
  }, []);

  const cyclePreference = useCallback(() => {
    const order: ThemePreference[] = ["light", "dark", "system"];
    const idx = order.indexOf(preference);
    const next = order[(idx + 1) % order.length] ?? "system";
    setPreference(next);
  }, [preference, setPreference]);

  const value = useMemo(
    (): ThemeContextValue => ({
      preference,
      resolved,
      setPreference,
      cyclePreference,
    }),
    [preference, resolved, setPreference, cyclePreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
