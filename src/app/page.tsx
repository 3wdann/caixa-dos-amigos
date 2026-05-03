"use client";

import Link from "next/link";

import { useAuth } from "@/components/providers/app-providers";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { initialsFromName } from "@/lib/avatar";
import { getPlanoLabel } from "@/lib/plano";

export default function Home() {
  const { user, profile, loading, logout } = useAuth();
  const isLoggedIn = Boolean(user && profile);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(13,148,136,0.18),_transparent_26%),linear-gradient(180deg,#fffdf8_0%,#f5efe5_100%)] px-4 py-10 dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_24%),linear-gradient(180deg,#081311_0%,#111827_100%)]"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <div className="flex items-center justify-between rounded-full border border-white/70 bg-white/75 px-5 py-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
          <div>
            <p className="text-sm font-semibold tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
              CAIXA DOS AMIGOS
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Seu caixa organizadinho</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle compact className="rounded-full" />
            {loading ? (
              <span className="text-sm text-slate-500 dark:text-slate-400">Carregando...</span>
            ) : isLoggedIn && profile ? (
              <>
                <div className="hidden items-center gap-3 rounded-full border border-slate-200 bg-white/90 px-3 py-2 dark:border-white/10 dark:bg-slate-900/80 sm:flex">
                  <Avatar className="h-9 w-9 border border-slate-200 dark:border-white/10">
                    <AvatarImage src={profile.fotoUrl ?? undefined} alt={profile.nome} />
                    <AvatarFallback style={{ backgroundColor: profile.cor }} className="text-white">
                      {initialsFromName(profile.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                      {profile.nome}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {profile.email}
                    </p>
                  </div>
                </div>
                <Link
                  className="inline-flex rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
                  href="/painel"
                >
                  Ir para o painel
                </Link>
                <Button variant="outline" onClick={() => logout()}>
                  Sair
                </Button>
              </>
            ) : (
              <>
                <Link className="text-sm font-medium text-slate-700 dark:text-slate-200" href="/login">
                  Entrar
                </Link>
                <Link
                  className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-emerald-600 dark:hover:bg-emerald-500"
                  href="/cadastro"
                >
                  Criar conta
                </Link>
              </>
            )}
          </div>
        </div>

        <section
          className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center"
          aria-labelledby="home-title"
        >
          <div className="space-y-6">
            <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200">
              Fase 1 do MVP
            </div>
            <div className="space-y-4">
              <h1
                id="home-title"
                className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-6xl"
              >
                Organize caixinhas com clareza, ritmo e menos cobranca no grupo.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                O app ja nasce mobile-first com autenticacao, criacao de caixas, adicao manual de
                membros e visao basica de pagamentos no mes atual.
              </p>
            </div>
            {isLoggedIn && profile ? (
              <div className="rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/75">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      Voce ja esta com a sessao ativa
                    </p>
                    <div className="space-y-1">
                      <p className="text-xl font-semibold text-slate-950 dark:text-white">
                        {profile.nome}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{profile.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
                        Plano {getPlanoLabel(profile.plano)}
                      </Badge>
                      <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
                        Versao beta
                      </Badge>
                    </div>
                  </div>
                  <Link
                    href="/painel"
                    className="inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-700 px-6 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-800"
                  >
                    Continuar no painel
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/cadastro"
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-700 px-6 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-800"
                >
                  Criar minha conta
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-900"
                >
                  Ja tenho acesso
                </Link>
              </div>
            )}
          </div>

          <div className="grid gap-4">
            {[
              "Criar um caixa com valor mensal, total de membros e data de inicio.",
              "Adicionar membros manualmente por email com convite e aceite.",
              "Visualizar caixas como gerente e como membro no mesmo painel.",
              "Marcar pagamento do mes atual com persistencia no Firestore.",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/75"
              >
                <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">{item}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
