"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Crown,
  Home,
  LayoutDashboard,
  Search,
  Settings,
  Sparkles,
  WalletCards,
} from "lucide-react";

import { CaixaCard } from "@/components/dashboard/caixa-card";
import { CreateCaixaForm } from "@/components/dashboard/create-caixa-form";
import { OfflineBanner } from "@/components/offline/offline-banner";
import { useAuth } from "@/components/providers/app-providers";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { initialsFromName } from "@/lib/avatar";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { subscribeManagedCaixas } from "@/lib/firestore";
import { isMasterProfile } from "@/lib/master";
import { readOfflineCache, writeOfflineCache } from "@/lib/offline-cache";
import {
  canCreateActiveCaixa,
  getEffectivePlano,
  getManagedCaixaUsageLabel,
  getPlanoFeatures,
  getPlanoLabel,
} from "@/lib/plano";
import type { CaixaResumo } from "@/lib/types";
import Link from "next/link";

export function DashboardPageClient() {
  const { user, profile, logout } = useAuth();
  const isOnline = useOnlineStatus();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [continueModalOpen, setContinueModalOpen] = useState(false);
  const [managedCaixas, setManagedCaixas] = useState<CaixaResumo[]>([]);
  const [cacheReady, setCacheReady] = useState(false);
  const activeManagedCaixas = managedCaixas.filter((caixa) => caixa.status === "ativo").length;
  const effectivePlano = getEffectivePlano(profile);
  const createLimit = profile ? canCreateActiveCaixa(effectivePlano, activeManagedCaixas) : null;
  const freeManagedLimitReached = Boolean(profile && !createLimit?.allowed);
  const planFeatures = profile ? getPlanoFeatures(effectivePlano) : null;
  const hasManagedCaixas = managedCaixas.length > 0;
  const hasDashboardSections = hasManagedCaixas;

  useEffect(() => {
    async function loadCache() {
      if (!profile || !user) {
        return;
      }

      const cached = await readOfflineCache<{
        managedCaixas: CaixaResumo[];
      }>(`dashboard:${user.uid}:${profile.email}`);

      if (cached) {
        setManagedCaixas(cached.managedCaixas ?? []);
      }

      setCacheReady(true);
    }

    void loadCache();
  }, [profile, user]);

  useEffect(() => {
    if (!profile || !user) {
      return;
    }

    const unsubscribeManaged = subscribeManagedCaixas(user.uid, setManagedCaixas);

    return () => {
      unsubscribeManaged();
    };
  }, [profile, user]);

  useEffect(() => {
    async function persistCache() {
      if (!profile || !user || !cacheReady) {
        return;
      }

      await writeOfflineCache(`dashboard:${user.uid}:${profile.email}`, {
        managedCaixas,
      });
    }

    void persistCache();
  }, [cacheReady, managedCaixas, profile, user]);

  useEffect(() => {
    function handleCaixaCreated(event: Event) {
      const customEvent = event as CustomEvent<CaixaResumo>;
      const createdCaixa = customEvent.detail;

      if (!createdCaixa) {
        return;
      }

      setManagedCaixas((current) => {
        if (current.some((caixa) => caixa.id === createdCaixa.id)) {
          return current;
        }

        return [createdCaixa, ...current];
      });
    }

    window.addEventListener("caixa-created", handleCaixaCreated as EventListener);

    return () => {
      window.removeEventListener("caixa-created", handleCaixaCreated as EventListener);
    };
  }, []);

  if (!profile || !user) {
    return null;
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="brand-shell"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {!isOnline ? <OfflineBanner /> : null}
        <Card className="brand-card rounded-[1.9rem]">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 border border-[#dbe7df]">
                <AvatarImage src={profile.fotoUrl ?? undefined} alt={profile.nome} />
                <AvatarFallback style={{ backgroundColor: profile.cor }} className="text-white">
                  {initialsFromName(profile.nome)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-[#657469] dark:text-slate-400">Seu painel</p>
                <h1 className="text-2xl font-semibold text-[#13231C] dark:text-white">Olá, {profile.nome}</h1>
                <p className="text-sm text-[#657469] dark:text-slate-300">
                  Consulte caixas pelo ID público ou assuma a gestão de um grupo.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge className="bg-[#fff4d8] text-[#8B6A11] hover:bg-[#fff4d8]">
                    Versão beta
                  </Badge>
                  <Badge className="bg-[#E2F3E7] text-[#214F3F] hover:bg-[#E2F3E7]">
                    Plano {getPlanoLabel(effectivePlano)}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <Link href="/">
                <Button variant="outline">Home</Button>
              </Link>
              {isMasterProfile(profile) ? (
                <Link href="/painel/master">
                  <Button variant="outline">Painel master</Button>
                </Link>
              ) : null}
              <ThemeToggle />
              <Button
                className="rounded-2xl green-gradient text-white shadow-[0_16px_34px_rgba(5,46,27,0.18)]"
                disabled={freeManagedLimitReached}
                onClick={() => setCreateModalOpen(true)}
              >
                Novo caixa
              </Button>
              <Button
                variant="outline"
                disabled={freeManagedLimitReached}
                onClick={() => setContinueModalOpen(true)}
              >
                Continuar com caixa já existente
              </Button>
              <Button variant="outline" onClick={() => logout()}>
                Sair
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
          <aside className="hidden soft-panel rounded-[1.8rem] p-3 lg:block">
            <nav className="space-y-1 text-sm font-semibold text-[#13231C]">
              <Link href="/painel" className="flex items-center gap-3 rounded-2xl bg-[#064E2E] px-4 py-3 text-white">
                <Home className="h-4 w-4" /> Início
              </Link>
              <a href="#meus-caixas" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-[#475569] hover:bg-[#F6FBF7] hover:text-[#064E2E]">
                <WalletCards className="h-4 w-4" /> Meus caixas
              </a>
              <Link href="/consultar" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-[#475569] hover:bg-[#F6FBF7] hover:text-[#064E2E]">
                <Search className="h-4 w-4" /> Consultar ID
              </Link>
              <Link href="/planos" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-[#475569] hover:bg-[#F6FBF7] hover:text-[#064E2E]">
                <Crown className="h-4 w-4" /> Plano Pro
              </Link>
              {isMasterProfile(profile) ? (
                <Link href="/painel/master" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-[#475569] hover:bg-[#F6FBF7] hover:text-[#064E2E]">
                  <Settings className="h-4 w-4" /> Master
                </Link>
              ) : null}
            </nav>
          </aside>

          <div className="space-y-6">
        <Card className="overflow-hidden rounded-[2rem] border-[#dbe7df] bg-white dark:border-white/10 dark:bg-[rgba(15,23,42,0.86)]">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm uppercase tracking-[0.2em] text-[#2F7258] dark:text-[#E2F3E7]">Resumo rápido</p>
              <p className="text-sm text-[#657469] dark:text-slate-300">
                Escolha como quer usar o Caixa dos Amigos.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.6rem] border border-[#dbe7df] bg-[#F6FBF7] p-5 dark:border-white/10 dark:bg-[rgba(15,23,42,0.72)]">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-2xl bg-[#E2F3E7] text-[#064E2E]">
                  <Search className="h-5 w-5" />
                </div>
                <p className="text-sm text-[#657469] dark:text-slate-300">Entrar como membro</p>
                <p className="mt-3 text-lg font-semibold text-[#13231C] dark:text-white">
                  Consultar por ID
                </p>
                <p className="mt-2 text-sm text-[#657469] dark:text-slate-400">
                  Use o ID público recebido para acompanhar informações básicas sem criar outro caixa.
                </p>
                <Link href="/consultar" className="mt-3 inline-flex text-sm font-semibold text-[#214F3F] underline-offset-4 hover:underline dark:text-emerald-200">
                  Consultar caixa
                </Link>
              </div>
              <div className="rounded-[1.6rem] green-gradient p-5 text-white shadow-[0_18px_36px_rgba(33,79,63,0.2)]">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-2xl bg-white/12 text-white">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <p className="text-sm text-white/75">Caixas que gerencio</p>
                <p className="mt-3 text-3xl font-semibold">{managedCaixas.length}</p>
                <p className="mt-2 text-sm text-white/75">
                  {getManagedCaixaUsageLabel(effectivePlano, activeManagedCaixas)}
                </p>
              </div>
              <div className="rounded-[1.6rem] border border-[#ecd69f] bg-[#fff9ec] p-5 dark:border-amber-300/15 dark:bg-[rgba(15,23,42,0.72)]">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-2xl bg-[#F4B942]/20 text-[#8B6A11]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <p className="text-sm text-[#8B6A11] dark:text-slate-300">Virar Pro gerente/membro</p>
                <p className="mt-3 text-lg font-semibold text-[#13231C] dark:text-white">
                  {getPlanoLabel(effectivePlano)}
                </p>
                <p className="mt-2 text-sm text-[#657469] dark:text-slate-400">
                  {planFeatures?.managedCaixasLabel}
                </p>
                <Link
                  href="/planos"
                  className="mt-2 inline-flex text-sm font-semibold text-[#8B6A11] underline-offset-4 hover:underline dark:text-amber-200"
                >
                  Ver modelo de planos
                </Link>
              </div>
            </div>
            <div className="rounded-[1.6rem] border border-[#dbe7df] bg-[#f9fbf9] p-4 text-sm text-[#657469] dark:border-white/10 dark:bg-[rgba(15,23,42,0.72)] dark:text-slate-200">
              Se você recebeu um ID, comece como membro consultando o caixa. Se você administra um
              grupo, crie ou continue um caixa como gerente. O plano Pro libera gestão avançada e
              caixas ativos ilimitados.
            </div>
            {freeManagedLimitReached ? (
              <div className="rounded-[1.6rem] border border-[#ecd69f] bg-[#fff9ec] p-4 text-sm text-[#8B6A11] dark:border-amber-300/15 dark:bg-amber-300/10 dark:text-amber-100">
                Você atingiu o limite do plano Free. Para criar outro caixa ativo, encerre o caixa
                atual ou veja o plano Pro.
                <Link href="/planos" className="ml-1 font-semibold underline underline-offset-4">
                  Ver planos
                </Link>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {hasDashboardSections ? (
          <div className="grid gap-6">
            {hasManagedCaixas ? (
              <section id="meus-caixas" className="space-y-4" aria-labelledby="managed-caixas-title">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2F7258]">
                      Meus caixas ativos
                    </p>
                    <h2
                      id="managed-caixas-title"
                      className="mt-1 text-xl font-semibold text-[#13231C] dark:text-white"
                    >
                      Caixas que gerencio
                    </h2>
                  </div>
                  <Button variant="outline" className="hidden rounded-2xl sm:inline-flex" onClick={() => setCreateModalOpen(true)}>
                    Novo caixa <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {managedCaixas.map((caixa) => (
                    <CaixaCard key={caixa.id} caixa={caixa} href={`/painel/caixas/${caixa.id}`} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : (
          <Card className="border-dashed border-[#dbe7df] bg-white dark:border-white/10 dark:bg-[rgba(15,23,42,0.86)]">
            <CardContent className="space-y-3 p-6 text-sm text-slate-600 dark:text-slate-300">
              <p className="font-medium text-slate-900 dark:text-white">
                Seu painel está pronto para começar.
              </p>
              <p>
                Se você recebeu um ID, use a consulta pública. Se você é responsável por um grupo,
                use <span className="font-medium">Novo caixa</span> ou{" "}
                <span className="font-medium">Continuar com caixa já existente</span> para assumir a
                gestão.
              </p>
            </CardContent>
          </Card>
        )}

          </div>
        </div>

        {createModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-md">
            <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2.4rem] border-white/70 bg-white/90 dark:border-white/10 dark:bg-[rgba(15,23,42,0.94)]">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                      Novo caixa
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Crie um caixa novo sem sair do painel.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
                    Fechar
                  </Button>
                </div>
                <CreateCaixaForm
                  profile={profile}
                  userId={user.uid}
                  mode="novo"
                  onSuccess={() => setCreateModalOpen(false)}
                />
              </CardContent>
            </Card>
          </div>
        ) : null}

        {continueModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-md">
            <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2.4rem] border-white/70 bg-white/90 dark:border-white/10 dark:bg-[rgba(15,23,42,0.94)]">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">
                      Continuar caixa
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Use este fluxo quando o grupo já existe fora do app e você quer cadastrar o
                      estágio atual dele por aqui.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setContinueModalOpen(false)}>
                    Fechar
                  </Button>
                </div>
                <CreateCaixaForm
                  profile={profile}
                  userId={user.uid}
                  mode="andamento"
                  title="Continuar com caixa já existente"
                  description="Informe os dados do grupo, em qual mês ele está hoje e siga com membros e pagamentos sem recomeçar o ciclo."
                  showBackupRestore={false}
                  onSuccess={() => setContinueModalOpen(false)}
                />
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </main>
  );
}
