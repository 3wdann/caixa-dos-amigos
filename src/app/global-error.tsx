"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="theme min-h-screen bg-background text-foreground">
        <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-destructive">
            Erro inesperado
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            Algo saiu do esperado nesta tela.
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            O problema foi registrado para investigarmos. Tente recarregar esta
            area ou voltar alguns segundos depois.
          </p>
          <Button onClick={reset} type="button">
            Tentar novamente
          </Button>
        </main>
      </body>
    </html>
  );
}
