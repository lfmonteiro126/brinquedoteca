"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[var(--background)]">
      <div className="max-w-md w-full text-center p-8">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
          Algo deu errado
        </h1>
        <p className="text-gray-600 dark:text-slate-400 mb-6">
          {error.message || "Ocorreu um erro inesperado. Tente novamente."}
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-[#ff2d55] text-white rounded-lg font-medium hover:bg-[#e0264c] transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
