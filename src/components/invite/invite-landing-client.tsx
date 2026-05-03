"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/app-providers";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { acceptInvite, getInviteByToken } from "@/lib/firestore";
import type { Convite } from "@/lib/types";

export function InviteLandingClient({ token }: { token: string | null }) {
  const { user, profile, loading } = useAuth();
  const [invite, setInvite] = useState<Convite | null>(null);
  const [fetching, setFetching] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    async function loadInvite() {
      if (!token) {
        setInvite(null);
        setFetching(false);
        return;
      }

      try {
        const nextInvite = await getInviteByToken(token);
        setInvite(nextInvite);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Falha ao carregar convite.", error);
        setInvite(null);
      } finally {
        setFetching(false);
      }
    }

    void loadInvite();
  }, [token]);

  async function handleJoin() {
    if (!token || !user || !profile) {
      return;
    }

    try {
      setJoining(true);
      const result = await acceptInvite(token, user, profile);
      toast.success(`Voce entrou no caixa ${result.caixaNome}.`);
      window.location.assign(`/painel/caixas/${result.caixaId}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel entrar no caixa.";
      toast.error(message);
    } finally {
      setJoining(false);
    }
  }

  if (fetching) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#fffdf8_0%,#f5efe5_100%)] px-6 dark:bg-[linear-gradient(180deg,#081311_0%,#111827_100%)]"
      >
        <div className="rounded-3xl border border-white/70 bg-white/80 px-6 py-5 text-sm text-slate-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200">
          Carregando convite...
        </div>
      </main>
    );
  }

  if (!token || !invite || invite.status !== "ativo") {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="min-h-screen bg-[linear-gradient(180deg,#fffdf8_0%,#f5efe5_100%)] px-4 py-10 dark:bg-[linear-gradient(180deg,#081311_0%,#111827_100%)]"
      >
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-white/70 bg-white/90 p-8 text-center shadow-sm dark:border-white/10 dark:bg-slate-950/80">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-red-600">
            Convite indisponivel
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-900 dark:text-white">
            Esse convite nao esta mais ativo.
          </h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            Peca um novo link ao gerente do caixa para continuar.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Voltar ao inicio
          </Link>
        </div>
      </main>
    );
  }

  const nextPath = `/entrar?convite=${token}`;
  const inviteEmailMismatch =
    Boolean(user && profile && invite.emailDestino) &&
    invite.emailDestino !== profile?.email.trim().toLowerCase();

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(13,148,136,0.18),_transparent_30%),linear-gradient(180deg,#fffdf8_0%,#f5efe5_100%)] px-4 py-10 dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_24%),linear-gradient(180deg,#081311_0%,#111827_100%)]"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <section className="rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-sm dark:border-white/10 dark:bg-slate-950/80">
          <div className="flex justify-end">
            <ThemeToggle />
          </div>
          <div className="space-y-4">
            <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
              Convite para entrar no caixa
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">
              Caixa {invite.caixaNome ?? "dos Amigos"}
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-300">
              {invite.gerenteNome ?? "Um gerente"} te convidou para participar deste caixa.
            </p>
            {invite.emailDestino ? (
              <div className="max-w-xl rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-200">
                <span className="font-medium text-slate-900 dark:text-white">Convite destinado a:</span>{" "}
                {invite.emailDestino}
              </div>
            ) : null}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <Card className="border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-900/80">
              <CardContent className="p-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">Valor por membro</p>
                <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                  R$ {(invite.valorMensal ?? 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-900/80">
              <CardContent className="p-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">Total por ponto</p>
                <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                  R$ {(invite.totalPorMes ?? 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-900/80">
              <CardContent className="p-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">Meses</p>
                <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                  {invite.totalMeses ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-900/80">
              <CardContent className="p-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">Membros confirmados</p>
                <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                  {invite.membrosConfirmados ?? 0}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {(invite.membrosPreview ?? []).map((membro, index) => (
              <Avatar key={`${membro.iniciais}-${index}`} className="h-11 w-11">
                <AvatarFallback style={{ backgroundColor: membro.cor }} className="text-white">
                  {membro.iniciais}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>

          <p className="mt-6 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Nunca mais perca o controle de quem pagou. Tudo num lugar so, com visao clara para
            gerente e membros.
          </p>

          <div className="mt-8">
            {!user || !profile || loading ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/cadastro?next=${encodeURIComponent(nextPath)}`}
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-700 px-6 text-sm font-medium text-white transition hover:bg-emerald-800"
                >
                  Entrar no caixa
                </Link>
                <Link
                  href={`/login?next=${encodeURIComponent(nextPath)}`}
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  Ja tenho conta
                </Link>
              </div>
            ) : inviteEmailMismatch ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200">
                Esse convite foi enviado para o email {invite.emailDestino}. Entre com a conta
                correta para continuar.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                  Voce esta autenticado como {profile.email}. Ao confirmar, entrara no caixa
                  imediatamente como membro ativo.
                </div>
                <Button
                  className="h-12 rounded-2xl bg-emerald-700 px-6 text-white hover:bg-emerald-800"
                  disabled={joining}
                  onClick={handleJoin}
                >
                  {joining ? "Entrando..." : "Confirmar entrada no caixa"}
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
