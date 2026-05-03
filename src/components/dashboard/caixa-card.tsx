import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { CaixaResumo } from "@/lib/types";

function paymentLabel(status?: CaixaResumo["meuStatusNoMes"]) {
  switch (status) {
    case "confirmado":
      return "Pagamento confirmado";
    case "pendente":
      return "Pagamento aguardando confirmacao";
    case "rejeitado":
      return "Pagamento rejeitado";
    case "nao_iniciado":
      return "Pagamento ainda nao marcado";
    default:
      return "Sem status neste mes";
  }
}

export function CaixaCard({
  caixa,
  href,
  highlight,
}: {
  caixa: CaixaResumo;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Card
      className={`border-white/70 bg-white/82 shadow-[0_24px_70px_rgba(91,102,131,0.12),inset_0_1px_0_rgba(255,255,255,0.78)] transition-transform hover:-translate-y-1 hover:shadow-[0_30px_90px_rgba(91,102,131,0.16),inset_0_1px_0_rgba(255,255,255,0.78)] dark:border-white/10 dark:bg-slate-950/72 ${
        highlight ? "ring-2 ring-amber-300" : ""
      }`}
    >
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg text-slate-900 dark:text-white">{caixa.nome}</CardTitle>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {caixa.descricao || "Sem descricao."}
            </p>
          </div>
          <Badge
            variant="secondary"
            className="bg-amber-100 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200"
          >
            Mes {caixa.mesAtual}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
        <div className="rounded-[1.5rem] border border-white/70 bg-white/70 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-white/10 dark:bg-white/5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            ID do caixa
          </p>
          <p className="mt-1 break-all font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
            {caixa.id}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <span>Status</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">{caixa.status}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Total por ponto</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            R$ {caixa.totalPorMes.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Membros ativos</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {caixa.membrosAtivos}/{caixa.totalMeses}
          </span>
        </div>
        {caixa.meuStatusNoMes ? (
          <div className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-900/80 dark:text-slate-200">
            {paymentLabel(caixa.meuStatusNoMes)}
          </div>
        ) : null}
      </CardContent>
      <CardFooter>
        <Link
          href={href}
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-[0_18px_40px_rgba(24,31,60,0.22)] transition hover:-translate-y-0.5"
        >
          Abrir detalhes
        </Link>
      </CardFooter>
    </Card>
  );
}
