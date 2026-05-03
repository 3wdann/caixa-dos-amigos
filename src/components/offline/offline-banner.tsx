"use client";

export function OfflineBanner({
  message = "Voce esta offline. Mostrando os ultimos dados salvos neste aparelho.",
}: {
  message?: string;
}) {
  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">
      {message}
    </div>
  );
}
