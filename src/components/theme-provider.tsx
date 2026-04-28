import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import {
  ThemeContext,
  type ThemeContextValue,
  type ThemePreference,
} from "./theme-context";

const STORAGE_KEY = "synapse-ui-theme";
const SHOCKWAVE_DURATION_MS = 720;

type ThemeViewTransition = {
  ready: Promise<void>;
  finished: Promise<void>;
  skipTransition: () => void;
};

type DocumentWithViewTransition = Document & {
  startViewTransition?: (updateCallback: () => void) => ThemeViewTransition;
};

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

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function animateThemeShockwave(viewTransition: ThemeViewTransition): void {
  void viewTransition.ready
    .then(() => {
      const x = window.innerWidth / 2;
      const y = 0;
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      );

      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: SHOCKWAVE_DURATION_MS,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => {
      viewTransition.skipTransition();
    });
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    typeof window === "undefined" ? "system" : readStoredPreference(),
  );

  const resolved = useMemo(() => resolveClass(preference), [preference]);

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
    const updateTheme = (): void => {
      flushSync(() => {
        setPreferenceState(next);
      });
      applyDomTheme(resolveClass(next));
    };

    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }

    const viewTransitionDocument = document as DocumentWithViewTransition;
    if (!viewTransitionDocument.startViewTransition || prefersReducedMotion()) {
      updateTheme();
      return;
    }

    const root = document.documentElement;
    root.dataset.themeTransition = "top-shockwave";
    const viewTransition =
      viewTransitionDocument.startViewTransition(updateTheme);
    animateThemeShockwave(viewTransition);
    void viewTransition.finished
      .finally(() => {
        delete root.dataset.themeTransition;
      })
      .catch(() => {
        delete root.dataset.themeTransition;
      });
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
