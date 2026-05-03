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
  const [managedCaixas, setManagedCaixas] = useState<CaixaResumo[]>([]);
  const [memberCaixas, setMemberCaixas] = useState<CaixaResumo[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Convite[]>([]);
  const [joiningInviteToken, setJoiningInviteToken] = useState<string | null>(null);
  const [cacheReady, setCacheReady] = useState(false);
  const activeManagedCaixas = managedCaixas.filter((caixa) => caixa.status === "ativo").length;
  const activeMemberCaixas = memberCaixas.filter((caixa) => caixa.status === "ativo").length;
  const freeManagedLimitReached = profile?.plano === "free" && activeManagedCaixas >= 2;

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
      className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(13,148,136,0.20),_transparent_30%),linear-gradient(180deg,#fffdf8_0%,#f5efe5_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_22%),linear-gradient(180deg,#081311_0%,#111827_100%)]"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {!isOnline ? <OfflineBanner /> : null}
        <Card className="border-white/70 bg-white/85 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/75">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 border border-slate-200">
                <AvatarImage src={profile.fotoUrl ?? undefined} alt={profile.nome} />
                <AvatarFallback style={{ backgroundColor: profile.cor }} className="text-white">
                  {initialsFromName(profile.nome)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Seu painel</p>
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Ola, {profile.nome}</h1>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Organize seus caixas e acompanhe o mes atual.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
                    Versao beta
                  </Badge>
                  <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
                    Plano {getPlanoLabel(profile.plano)}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Button
                className="bg-emerald-700 text-white hover:bg-emerald-800"
                disabled={freeManagedLimitReached}
                onClick={() => setCreateModalOpen(true)}
              >
                Novo caixa
              </Button>
              <Button variant="outline" onClick={() => logout()}>
                Sair
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-slate-950 text-white shadow-sm dark:border-white/10 dark:bg-slate-900/90">
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm uppercase tracking-[0.2em] text-emerald-200">Resumo rapido</p>
              <p className="text-sm text-slate-300">
                Beta aberto para cadastros e testes controlados.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-slate-300">Gerencio</p>
                <p className="mt-2 text-3xl font-semibold">{managedCaixas.length}</p>
                <p className="mt-1 text-xs text-slate-400">Ativos: {activeManagedCaixas} de 2 no Free</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-slate-300">Participo</p>
                <p className="mt-2 text-3xl font-semibold">{memberCaixas.length}</p>
                <p className="mt-1 text-xs text-slate-400">Ativos: {activeMemberCaixas} de 2 no Free</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-slate-300">Convites pendentes</p>
                <p className="mt-2 text-3xl font-semibold">{pendingInvites.length}</p>
                <p className="mt-1 text-xs text-slate-400">Aguardando seu aceite</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-sm text-slate-300">Plano atual</p>
                <p className="mt-2 text-3xl font-semibold">{getPlanoLabel(profile.plano)}</p>
                <p className="mt-1 text-xs text-slate-400">Versao beta em validacao</p>
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
              No plano Free, voce pode ter ate 2 caixas ativos como gerente e ate 2 caixas ativos como membro.
            </div>
          </CardContent>
        </Card>

        <section className="space-y-4" aria-labelledby="managed-caixas-title">
          <div className="flex items-center justify-between">
            <h2 id="managed-caixas-title" className="text-xl font-semibold text-slate-900 dark:text-white">
              Caixas que gerencio
            </h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">Visao do gerente</span>
          </div>
          {managedCaixas.length === 0 ? (
            <Card className="border-dashed border-slate-300 bg-white/75 dark:border-slate-700 dark:bg-slate-950/70">
              <CardContent className="p-6 text-sm text-slate-600 dark:text-slate-300">
                Voce ainda nao criou nenhum caixa. Use o botao &quot;Novo caixa&quot; para abrir o primeiro.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {managedCaixas.map((caixa) => (
                <CaixaCard key={caixa.id} caixa={caixa} href={`/painel/caixas/${caixa.id}`} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4" aria-labelledby="member-caixas-title">
          <div className="flex items-center justify-between">
            <h2 id="member-caixas-title" className="text-xl font-semibold text-slate-900 dark:text-white">
              Caixas que participo
            </h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">Visao do membro</span>
          </div>
          {memberCaixas.length === 0 ? (
            <Card className="border-dashed border-slate-300 bg-white/75 dark:border-slate-700 dark:bg-slate-950/70">
              <CardContent className="p-6 text-sm text-slate-600 dark:text-slate-300">
                Quando um gerente te convidar por email e voce aceitar, seus caixas aparecem aqui.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {memberCaixas.map((caixa) => (
                <CaixaCard
                  key={caixa.id}
                  caixa={caixa}
                  href={`/painel/caixas/${caixa.id}`}
                  highlight={caixa.meuStatusNoMes === "pendente"}
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4" aria-labelledby="pending-invites-title">
          <div className="flex items-center justify-between">
            <h2 id="pending-invites-title" className="text-xl font-semibold text-slate-900 dark:text-white">
              Convites pendentes
            </h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">Por email</span>
          </div>
          {pendingInvites.length === 0 ? (
            <Card className="border-dashed border-slate-300 bg-white/75 dark:border-slate-700 dark:bg-slate-950/70">
              <CardContent className="p-6 text-sm text-slate-600 dark:text-slate-300">
                Quando alguem te convidar por email antes da entrada no caixa, o convite aparece
                aqui.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pendingInvites.map((convite) => (
                <Card key={convite.token} className="border-amber-200 bg-amber-50/90 shadow-sm dark:border-amber-400/20 dark:bg-amber-500/10">
                  <CardContent className="space-y-2 p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-amber-900">Convite ativo</p>
                      <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
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
          )}
        </section>

        {createModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
            <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border-white/70 bg-white/95 shadow-2xl dark:border-white/10 dark:bg-slate-950/95">
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
                  onSuccess={() => setCreateModalOpen(false)}
                />
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </main>
  );
}
