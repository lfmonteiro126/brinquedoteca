"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    }
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [open, onCancel]);

  if (!open) return null;

  const titleId = "confirm-dialog-title";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-white dark:bg-[var(--card-bg)] p-6 shadow-xl">
        <div className="mb-4 flex items-start gap-3">
          <div className={`rounded-xl p-2 ${danger ? "bg-red-100 dark:bg-red-900/30" : "bg-amber-100 dark:bg-amber-900/30"}`}>
            <AlertTriangle className={`h-5 w-5 ${danger ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`} />
          </div>
          <div className="flex-1">
            <h3 id={titleId} className="font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{message}</p>
          </div>
          <button onClick={onCancel} aria-label="Fechar" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 dark:border-[var(--card-border)] py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white ${
              danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-violet-600 hover:bg-violet-700"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
