"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Crown, ShieldCheck, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/app-providers";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requestProUpgrade, subscribeUpgradeRequests } from "@/lib/firestore";
import { PLAN_FEATURES } from "@/lib/plano";
import type { UpgradeRequest } from "@/lib/types";

const androidReadiness = [
  "Base web mobile-first pronta para empacotar futuramente",
  "Autenticacao do gerente mantida no Firebase",
  "Consulta pública sem login para participantes",
  "Modelo de plano centralizado para liberar recursos no app",
];

export default function PlanosPage() {
  const { user, profile } = useAuth();
  const [upgradeRequests, setUpgradeRequests] = useState<UpgradeRequest[]>([]);
  const [requestingUpgrade, setRequestingUpgrade] = useState(false);
  const pendingUpgradeRequest = useMemo(
    () => upgradeRequests.find((request) => request.status === "pending"),
    [upgradeRequests],
  );

  useEffect(() => {
    if (!user) {
      setUpgradeRequests([]);
      return;
    }

    return subscribeUpgradeRequests(user.uid, setUpgradeRequests);
  }, [user]);

  async function handleRequestProUpgrade() {
    if (!profile) {
      return;
    }

    try {
      setRequestingUpgrade(true);
      await requestProUpgrade(profile);
      toast.success("Solicitacao enviada. Vamos liberar o Pro manualmente durante o beta.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível solicitar o upgrade.";
      toast.error(message);
    } finally {
      setRequestingUpgrade(false);
    }
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,#EAF6EC_0,#FBFAF6_36%,#F7F1E6_100%)] px-4 py-6 text-[#061F16] dark:bg-[linear-gradient(180deg,#081311_0%,#111827_100%)] dark:text-slate-100"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-[#dbe7df] bg-white/85 p-5 shadow-[0_22px_54px_rgba(33,79,63,0.09)] backdrop-blur dark:border-white/10 dark:bg-slate-900/80 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2F7258]">
              Modelo de planos
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-[#052E1B] dark:text-white">
              Planos para gerentes de caixa
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#475569] dark:text-slate-300">
              A V2 prepara o Caixa dos Amigos para monetizacao simples: o gerente usa o Free para
              validar um caixa real e o Pro libera operacao com varios grupos.
            </p>
          </div>
          <Link href="/painel">
            <Button variant="outline" className="rounded-2xl">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao painel
            </Button>
          </Link>
        </header>

        <section className="grid gap-4 lg:grid-cols-2">
          {(["free", "pro"] as const).map((plan) => {
            const planInfo = PLAN_FEATURES[plan];
            const isPro = plan === "pro";

            return (
              <Card
                key={plan}
                className={`rounded-[2rem] border bg-white shadow-[0_22px_54px_rgba(33,79,63,0.09)] dark:border-white/10 dark:bg-slate-900/80 ${
                  isPro ? "border-[#EFC35E] ring-2 ring-[#EFC35E]/35" : "border-[#dbe7df]"
                }`}
              >
                <CardContent className="space-y-5 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div
                        className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${
                          isPro ? "bg-[#fff4d8] text-[#8B6A11]" : "bg-[#E2F3E7] text-[#214F3F]"
                        }`}
                      >
                        {isPro ? <Crown className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
                      </div>
                      <h2 className="mt-4 text-2xl font-black text-[#052E1B] dark:text-white">
                        {planInfo.label}
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-[#2F7258] dark:text-emerald-200">
                        {planInfo.headline}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#f9fbf9] px-4 py-3 text-right dark:bg-white/5">
                      <p className="text-sm text-[#657469] dark:text-slate-300">Preco</p>
                      <p className="text-xl font-black text-[#052E1B] dark:text-white">
                        {planInfo.priceLabel}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm leading-6 text-[#475569] dark:text-slate-300">
                    {planInfo.description}
                  </p>

                  <div className="rounded-3xl border border-[#dbe7df] bg-[#f9fbf9] p-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-sm font-semibold text-[#052E1B] dark:text-white">
                      {planInfo.managedCaixasLabel}
                    </p>
                  </div>

                  <ul className="space-y-3">
                    {planInfo.features.map((feature) => (
                      <li key={feature} className="flex gap-3 text-sm text-[#475569] dark:text-slate-300">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0B6B3A]" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isPro ? (
                    profile ? (
                      <Button
                        className="h-12 w-full rounded-2xl bg-[#214F3F] text-white hover:bg-[#183b2f]"
                        disabled={
                          profile.plano === "pro" ||
                          Boolean(pendingUpgradeRequest) ||
                          requestingUpgrade
                        }
                        onClick={handleRequestProUpgrade}
                      >
                        {profile.plano === "pro"
                          ? "Plano Pro ativo"
                          : pendingUpgradeRequest
                            ? "Solicitacao enviada"
                            : requestingUpgrade
                              ? "Enviando..."
                              : "Solicitar Pro beta"}
                      </Button>
                    ) : (
                      <Link href="/login">
                        <Button className="h-12 w-full rounded-2xl bg-[#214F3F] text-white hover:bg-[#183b2f]">
                          Entrar para solicitar Pro
                        </Button>
                      </Link>
                    )
                  ) : (
                    <Button
                      className="h-12 w-full rounded-2xl bg-white text-[#214F3F] ring-1 ring-[#BCD5C4] hover:bg-[#f2f6f3]"
                      disabled
                    >
                      Plano inicial dos gerentes
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </section>

        {pendingUpgradeRequest ? (
          <Card className="rounded-[2rem] border-[#ecd69f] bg-[#fff9ec] shadow-[0_22px_54px_rgba(33,79,63,0.08)] dark:border-amber-300/15 dark:bg-amber-300/10">
            <CardContent className="p-5 text-sm text-[#8B6A11] dark:text-amber-100">
              Sua solicitacao Pro beta esta pendente. Durante esta fase, a liberacao sera feita
              manualmente no Firebase depois da validacao.
            </CardContent>
          </Card>
        ) : null}

        <Card className="rounded-[2rem] border-[#dbe7df] bg-white/90 shadow-[0_22px_54px_rgba(33,79,63,0.09)] dark:border-white/10 dark:bg-slate-900/80">
          <CardContent className="grid gap-5 p-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E2F3E7] text-[#214F3F]">
                <Smartphone className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-2xl font-black text-[#052E1B] dark:text-white">
                Preparacao Android/Play Store
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#475569] dark:text-slate-300">
                A base segue web mobile-first. O caminho recomendado para Play Store e empacotar
                com Capacitor quando os fluxos principais estiverem estabilizados.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {androidReadiness.map((item) => (
                <li
                  key={item}
                  className="rounded-2xl border border-[#dbe7df] bg-[#f9fbf9] p-4 text-sm text-[#475569] dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                >
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
