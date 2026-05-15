import Link from "next/link";
import { ArrowRight, Share2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { CaixaResumo } from "@/lib/types";

function paymentLabel(status: CaixaResumo["meuStatusNoMes"]) {
  switch (status) {
    case "confirmado":
      return "Pagamento confirmado";
    case "pendente":
      return "Pagamento aguardando confirmação";
    case "rejeitado":
      return "Pagamento rejeitado";
    case "nao_iniciado":
      return "Pagamento ainda não marcado";
    default:
      return "Sem status neste mês";
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
  const progress = Math.min(100, Math.round((caixa.membrosAtivos / Math.max(caixa.totalMeses, 1)) * 100));

  return (
    <Card
      className={`overflow-hidden rounded-[1.7rem] border-[#dbe7df] bg-white shadow-[0_22px_54px_rgba(33,79,63,0.09)] transition-transform hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(33,79,63,0.14)] dark:border-white/10 dark:bg-[#13231C]/90 ${
        highlight ? "ring-2 ring-[#EFC35E]" : ""
      }`}
    >
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-lg text-[#13231C] dark:text-white">{caixa.nome}</CardTitle>
            <p className="mt-1 text-sm text-[#657469] dark:text-slate-300">
              {caixa.descricao || "Sem descrição."}
            </p>
          </div>
          <Badge
            variant="secondary"
            className="bg-[#fff4d8] text-[#8B6A11] hover:bg-[#fff4d8] dark:bg-[#EFC35E]/15 dark:text-[#f4d47d]"
          >
            Mês {caixa.mesAtual}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-[#657469] dark:text-slate-300">
        <div className="rounded-[1.4rem] green-gradient px-4 py-4 text-white shadow-[0_18px_34px_rgba(5,46,27,0.18)]">
          <p className="text-sm text-white/72">Total por ponto</p>
          <p className="mt-1 text-2xl font-black">R$ {caixa.totalPorMes.toFixed(2)}</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-[#F4B942]" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-white/75">
            {caixa.membrosAtivos}/{caixa.totalMeses} membros cadastrados
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[1.3rem] border border-[#dbe7df] bg-[#f9fbf9] px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs text-[#657469] dark:text-slate-400">Status</p>
            <p className="mt-1 font-semibold text-[#214F3F] dark:text-emerald-200">{caixa.status}</p>
          </div>
          <div className="rounded-[1.3rem] border border-[#ecd69f] bg-[#fff8e7] px-4 py-3 dark:border-amber-300/15 dark:bg-amber-300/10">
            <p className="text-xs text-[#8B6A11] dark:text-amber-100">ID público</p>
            <p className="mt-1 truncate font-mono text-xs font-semibold text-[#13231C] dark:text-slate-100">
              {caixa.publicId ?? "Gerar no detalhe"}
            </p>
          </div>
        </div>

        {caixa.meuStatusNoMes ? (
          <div className="rounded-[1.3rem] border border-[#dbe7df] bg-[#f9fbf9] px-3 py-2 text-sm text-[#214F3F] dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200">
            {paymentLabel(caixa.meuStatusNoMes)}
          </div>
        ) : null}
      </CardContent>
      <CardFooter>
        <div className="flex w-full gap-2">
          <Link
            href={href}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-[#214F3F] px-4 text-sm font-medium text-white shadow-[0_18px_40px_rgba(33,79,63,0.18)] transition hover:-translate-y-0.5 hover:bg-[#183b2f]"
          >
            Abrir caixa <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
          <Link
            href={href}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#dbe7df] bg-white text-[#214F3F] transition hover:bg-[#F6FBF7]"
            aria-label={`Abrir compartilhamento do caixa ${caixa.nome}`}
          >
            <Share2 className="h-4 w-4" />
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
