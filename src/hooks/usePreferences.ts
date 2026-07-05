"use client";

import { useCallback, useState, useEffect } from "react";

interface Preferences {
  pageSize: number;
}

const DEFAULTS: Preferences = { pageSize: 20 };

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    function load() {
      try {
        const stored = localStorage.getItem("preferences");
        if (stored) {
          const parsed = JSON.parse(stored);
          setPrefs({ ...DEFAULTS, ...parsed });
        }
      } catch {
        // JSON inválido no localStorage — ignora e usa defaults
      }
      setMounted(true);
    }
    load();
  }, []);

  const updatePreferences = useCallback((updates: Partial<Preferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem("preferences", JSON.stringify(next));
      return next;
    });
  }, []);

  return { prefs, updatePreferences, mounted };
}
