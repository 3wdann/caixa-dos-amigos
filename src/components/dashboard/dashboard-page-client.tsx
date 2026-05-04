"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
import {
  acceptInvite,
  subscribeManagedCaixas,
  subscribeMemberCaixas,
  subscribePendingInvitesByEmail,
} from "@/lib/firestore";
import { readOfflineCache, writeOfflineCache } from "@/lib/offline-cache";
import { getPlanoLabel } from "@/lib/plano";
import type { CaixaResumo, Convite } from "@/lib/types";

export function DashboardPageClient() {
  const { user, profile, logout } = useAuth();
  const isOnline = useOnlineStatus();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [continueModalOpen, setContinueModalOpen] = useState(false);
  const [managedCaixas, setManagedCaixas] = useState<CaixaResumo[]>([]);
  const [memberCaixas, setMemberCaixas] = useState<CaixaResumo[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Convite[]>([]);
  const [joiningInviteToken, setJoiningInviteToken] = useState<string | null>(null);
  const [cacheReady, setCacheReady] = useState(false);
  const activeManagedCaixas = managedCaixas.filter((caixa) => caixa.status === "ativo").length;
  const activeMemberCaixas = memberCaixas.filter((caixa) => caixa.status === "ativo").length;
  const freeManagedLimitReached = profile?.plano === "free" && activeManagedCaixas >= 2;
  const hasManagedCaixas = managedCaixas.length > 0;
  const hasMemberCaixas = memberCaixas.length > 0;
  const hasPendingInvites = pendingInvites.length > 0;
  const hasDashboardSections = hasManagedCaixas || hasMemberCaixas || hasPendingInvites;

  useEffect(() => {
    async function loadCache() {
      if (!profile || !user) {
        return;
      }

      const cached = await readOfflineCache<{
        managedCaixas: CaixaResumo[];
        memberCaixas: CaixaResumo[];
        pendingInvites: Convite[];
      }>(`dashboard:${user.uid}:${profile.email}`);

      if (cached) {
        setManagedCaixas(cached.managedCaixas ?? []);
        setMemberCaixas(cached.memberCaixas ?? []);
        setPendingInvites(cached.pendingInvites ?? []);
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
    const unsubscribeMember = subscribeMemberCaixas(user.uid, setMemberCaixas);
    const unsubscribeInvites = subscribePendingInvitesByEmail(profile.email, setPendingInvites);

    return () => {
      unsubscribeManaged();
      unsubscribeMember();
      unsubscribeInvites();
    };
  }, [profile, user]);

  useEffect(() => {
    async function persistCache() {
      if (!profile || !user || !cacheReady) {
        return;
      }

      await writeOfflineCache(`dashboard:${user.uid}:${profile.email}`, {
        managedCaixas,
        memberCaixas,
        pendingInvites,
      });
    }

    void persistCache();
  }, [cacheReady, managedCaixas, memberCaixas, pendingInvites, profile, user]);

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

  async function handleAcceptPendingInvite(token: string) {
    if (!user || !profile) {
      return;
    }

    try {
      setJoiningInviteToken(token);
      const result = await acceptInvite(token, user, profile);
      toast.success(`Voce entrou no caixa ${result.caixaNome}.`);
      window.location.assign(`/painel/caixas/${result.caixaId}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel concluir sua entrada.";
      toast.error(message);
    } finally {
      setJoiningInviteToken(null);
    }
  }

  if (!profile || !user) {
    return null;
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="brand-shell"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
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
                <h1 className="text-2xl font-semibold text-[#13231C] dark:text-white">Ola, {profile.nome}</h1>
                <p className="text-sm text-[#657469] dark:text-slate-300">
                  Organize seus caixas e acompanhe o mes atual.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge className="bg-[#fff4d8] text-[#8B6A11] hover:bg-[#fff4d8]">
                    Versao beta
                  </Badge>
                  <Badge className="bg-[#E2F3E7] text-[#214F3F] hover:bg-[#E2F3E7]">
                    Plano {getPlanoLabel(profile.plano)}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <ThemeToggle />
              <Button
                className="bg-primary text-primary-foreground"
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
                Continuar com caixa ja existente
              </Button>
              <Button variant="outline" onClick={() => logout()}>
                Sair
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-[2rem] border-[#dbe7df] bg-white dark:border-white/10 dark:bg-[rgba(22,39,32,0.9)]">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm uppercase tracking-[0.2em] text-[#2F7258] dark:text-[#E2F3E7]">Resumo rapido</p>
              <p className="text-sm text-[#657469] dark:text-slate-300">
                Beta aberto para cadastros e testes controlados.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[1.6rem] bg-[#214F3F] p-5 text-white shadow-[0_18px_36px_rgba(33,79,63,0.2)]">
                <p className="text-sm text-white/75">Gerencio</p>
                <p className="mt-3 text-3xl font-semibold">{managedCaixas.length}</p>
                <p className="mt-2 text-sm text-white/75">Ativos: {activeManagedCaixas} de 2 no Free</p>
              </div>
              <div className="rounded-[1.6rem] border border-[#dbe7df] bg-[#F6FBF7] p-5 dark:border-white/10 dark:bg-white/5">
                <p className="text-sm text-[#657469] dark:text-slate-300">Participo</p>
                <p className="mt-3 text-3xl font-semibold text-[#13231C] dark:text-white">{memberCaixas.length}</p>
                <p className="mt-2 text-sm text-[#657469] dark:text-slate-400">Ativos: {activeMemberCaixas} de 2 no Free</p>
              </div>
              <div className="rounded-[1.6rem] border border-[#ecd69f] bg-[#fff9ec] p-5 dark:border-white/10 dark:bg-white/5">
                <p className="text-sm text-[#8B6A11] dark:text-slate-300">Convites pendentes</p>
                <p className="mt-3 text-3xl font-semibold text-[#13231C] dark:text-white">{pendingInvites.length}</p>
                <p className="mt-2 text-sm text-[#8B6A11] dark:text-slate-400">Aguardando seu aceite</p>
              </div>
              <div className="rounded-[1.6rem] border border-[#dbe7df] bg-white p-5 dark:border-white/10 dark:bg-white/5">
                <p className="text-sm text-[#657469] dark:text-slate-300">Plano atual</p>
                <p className="mt-3 text-3xl font-semibold text-[#13231C] dark:text-white">{getPlanoLabel(profile.plano)}</p>
                <p className="mt-2 text-sm text-[#657469] dark:text-slate-400">Versao beta em validacao</p>
              </div>
            </div>
            <div className="rounded-[1.6rem] border border-[#dbe7df] bg-[#f9fbf9] p-4 text-sm text-[#657469] dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
              No plano Free, voce pode ter ate 2 caixas ativos como gerente e ate 2 caixas ativos como membro.
            </div>
          </CardContent>
        </Card>

        {hasDashboardSections ? (
          <div className="grid gap-6 xl:grid-cols-2">
            {hasManagedCaixas ? (
              <section className="space-y-4 xl:col-span-2" aria-labelledby="managed-caixas-title">
                <div className="flex items-center justify-between">
                  <h2
                    id="managed-caixas-title"
                    className="text-xl font-semibold text-[#13231C] dark:text-white"
                  >
                    Caixas que gerencio
                  </h2>
                  <span className="text-sm text-[#657469] dark:text-slate-400">
                    Visao do gerente
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {managedCaixas.map((caixa) => (
                    <CaixaCard key={caixa.id} caixa={caixa} href={`/painel/caixas/${caixa.id}`} />
                  ))}
                </div>
              </section>
            ) : null}

            {hasMemberCaixas ? (
              <section className="space-y-4" aria-labelledby="member-caixas-title">
                <div className="flex items-center justify-between">
                  <h2
                    id="member-caixas-title"
                    className="text-xl font-semibold text-[#13231C] dark:text-white"
                  >
                    Caixas que participo
                  </h2>
                  <span className="text-sm text-[#657469] dark:text-slate-400">
                    Visao do membro
                  </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                  {memberCaixas.map((caixa) => (
                    <CaixaCard
                      key={caixa.id}
                      caixa={caixa}
                      href={`/painel/caixas/${caixa.id}`}
                      highlight={caixa.meuStatusNoMes === "pendente"}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {hasPendingInvites ? (
              <section className="space-y-4" aria-labelledby="pending-invites-title">
                <div className="flex items-center justify-between">
                  <h2
                    id="pending-invites-title"
                    className="text-xl font-semibold text-slate-900 dark:text-white"
                  >
                    Convites pendentes
                  </h2>
                  <span className="text-sm text-slate-500 dark:text-slate-400">Por email</span>
                </div>
                <div className="grid gap-4">
                  {pendingInvites.map((convite) => (
                    <Card key={convite.token} className="border-[#ecd69f] bg-[#fff9ec] dark:border-amber-400/20 dark:bg-amber-500/10">
                      <CardContent className="space-y-2 p-5">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-[#8B6A11]">Convite ativo</p>
                          <Badge className="bg-[#fff0d6] text-[#b66b1a] hover:bg-[#fff0d6]">
                            aguardando entrada
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                          Caixa: {convite.caixaNome ?? convite.caixaId}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          Gerente: {convite.gerenteNome ?? "Gerente do caixa"}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          Valor por membro: R$ {(convite.valorMensal ?? 0).toFixed(2)}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          Seu email ja foi reconhecido. Aceite o convite para entrar no caixa ou abra
                          a landing para revisar os detalhes antes.
                        </p>
                        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                          <button
                            type="button"
                            className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={joiningInviteToken === convite.token}
                            onClick={() => handleAcceptPendingInvite(convite.token)}
                          >
                            {joiningInviteToken === convite.token
                              ? "Entrando..."
                              : "Entrar nesse caixa"}
                          </button>
                          <Link
                            href={`/entrar?convite=${convite.token}`}
                            className="inline-flex h-10 items-center justify-center rounded-xl border border-amber-300 bg-white px-4 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
                          >
                            Ver convite
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : (
          <Card className="border-dashed border-[#dbe7df] bg-white dark:border-white/10 dark:bg-[rgba(22,39,32,0.9)]">
            <CardContent className="space-y-3 p-6 text-sm text-slate-600 dark:text-slate-300">
              <p className="font-medium text-slate-900 dark:text-white">
                Seu painel esta pronto para comecar.
              </p>
              <p>
                Use o botao <span className="font-medium">Novo caixa</span> para abrir seu primeiro
                grupo ou <span className="font-medium">Continuar com caixa ja existente</span> para
                trazer um grupo que ja esta rodando fora do app. Quando voce receber convites ou
                participar de outros caixas, os blocos aparecem aqui automaticamente.
              </p>
            </CardContent>
          </Card>
        )}

        {createModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-md">
            <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2.4rem] border-white/70 bg-white/90 dark:border-white/10 dark:bg-slate-950/88">
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
            <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2.4rem] border-white/70 bg-white/90 dark:border-white/10 dark:bg-slate-950/88">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">
                      Continuar caixa
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Use este fluxo quando o grupo ja existe fora do app e voce quer cadastrar o
                      estagio atual dele por aqui.
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
                  title="Continuar com caixa ja existente"
                  description="Informe os dados do grupo, em qual mes ele esta hoje e siga com os convites e pagamentos sem recomecar o ciclo."
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
