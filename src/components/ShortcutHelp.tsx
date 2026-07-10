"use client";

import { Keyboard, X } from "lucide-react";
import { useState, useEffect } from "react";
import { getShortcutLabel, type ShortcutConfig } from "@/hooks/useKeyboardShortcuts";

interface ShortcutHelpProps {
  shortcuts: Omit<ShortcutConfig, "action">[];
}

export function ShortcutHelp({ shortcuts }: ShortcutHelpProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Handler global para ESC - funciona mesmo quando modal está aberto
  useEffect(() => {
    if (!isOpen) return;

    function handleGlobalEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleGlobalEscape, true);
    return () => window.removeEventListener("keydown", handleGlobalEscape, true);
  }, [isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-50 hidden sm:flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-violet-700 transition-colors"
        title="Ver atalhos de teclado"
      >
        <Keyboard className="h-4 w-4" />
        <span>Atalhos</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50" onClick={() => setIsOpen(false)}>
          <div
            className="mx-4 w-full max-w-md rounded-2xl bg-white dark:bg-[var(--card-bg)] p-6 shadow-xl animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-violet-500" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Atalhos de Teclado</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-transform"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              {shortcuts.map((shortcut, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800 px-4 py-3"
                >
                  <span className="text-sm text-slate-700 dark:text-slate-300">{shortcut.description}</span>
                  <kbd className="ml-4 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 shadow-sm">
                    {getShortcutLabel(shortcut)}
                  </kbd>
                </div>
              ))}
            </div>

            <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
              Pressione <kbd className="rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-1 py-0.5 text-[10px] font-mono">ESC</kbd> para fechar
            </p>
          </div>
        </div>
      )}
    </>
  );
}
