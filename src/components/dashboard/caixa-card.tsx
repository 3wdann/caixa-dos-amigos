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
      className={`overflow-hidden border-[#dbe7df] bg-white shadow-[0_22px_54px_rgba(33,79,63,0.09)] transition-transform hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(33,79,63,0.14)] dark:border-white/10 dark:bg-[#13231C]/90 ${
        highlight ? "ring-2 ring-[#EFC35E]" : ""
      }`}
    >
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg text-[#13231C] dark:text-white">{caixa.nome}</CardTitle>
            <p className="mt-1 text-sm text-[#657469] dark:text-slate-300">
              {caixa.descricao || "Sem descricao."}
            </p>
          </div>
          <Badge
            variant="secondary"
            className="bg-[#fff4d8] text-[#8B6A11] hover:bg-[#fff4d8] dark:bg-[#EFC35E]/15 dark:text-[#f4d47d]"
          >
            Mes {caixa.mesAtual}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-[#657469] dark:text-slate-300">
        <div className="rounded-[1.4rem] border border-[#dbe7df] bg-[#f9fbf9] px-4 py-3 dark:border-white/10 dark:bg-white/5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#657469] dark:text-slate-400">
            ID do caixa
          </p>
          <p className="mt-1 break-all font-mono text-xs font-semibold text-[#13231C] dark:text-slate-100">
            {caixa.id}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <span>Status</span>
          <span className="rounded-full bg-[#E2F3E7] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#214F3F] dark:bg-[#2F7258]/25 dark:text-[#d4efde]">
            {caixa.status}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Total por ponto</span>
          <span className="font-medium text-[#13231C] dark:text-slate-100">
            R$ {caixa.totalPorMes.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Membros ativos</span>
          <span className="font-medium text-[#13231C] dark:text-slate-100">
            {caixa.membrosAtivos}/{caixa.totalMeses}
          </span>
        </div>
        {caixa.meuStatusNoMes ? (
          <div className="rounded-[1.3rem] border border-[#dbe7df] bg-[#f9fbf9] px-3 py-2 text-sm text-[#214F3F] dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200">
            {paymentLabel(caixa.meuStatusNoMes)}
          </div>
        ) : null}
      </CardContent>
      <CardFooter>
        <Link
          href={href}
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#214F3F] px-4 text-sm font-medium text-white shadow-[0_18px_40px_rgba(33,79,63,0.18)] transition hover:-translate-y-0.5 hover:bg-[#183b2f]"
        >
          Abrir detalhes
        </Link>
      </CardFooter>
    </Card>
  );
}
