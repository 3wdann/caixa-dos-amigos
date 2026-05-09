"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  ChartColumnIncreasing,
  CircleDollarSign,
  Clock3,
  ShieldCheck,
  Star,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

import { useAuth } from "@/components/providers/app-providers";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { initialsFromName } from "@/lib/avatar";
import { getPlanoLabel } from "@/lib/plano";

const members = [
  { name: "Ana", status: "Pago", face: "A" },
  { name: "Bruno", status: "Pago", face: "B" },
  { name: "Carlos", status: "Pendente", face: "C" },
];

const steps = [
  ["wallet", "Crie uma caixa", "Defina o valor, a frequencia e o objetivo da caixinha.", "01"],
  ["users", "Convide amigos", "Adicione amigos e deixe todo mundo por dentro.", "02"],
  ["chart", "Acompanhe", "Veja pagamentos, saldo e progresso em tempo real.", "03"],
] as const;

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#064E2E] via-[#0B6B3A] to-[#052E1B] text-white shadow-lg shadow-[#052E1B]/20">
        <CircleDollarSign className="h-7 w-7 text-[#F6C85F]" strokeWidth={2.5} />
      </div>
      <div className="text-lg font-black tracking-[0.08em] text-[#052E1B] dark:text-slate-100">
        CAIXA DOS AMIGOS
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const paid = status === "Pago";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${
        paid
          ? "bg-[#EAF6EC] text-[#0B6B3A] dark:bg-emerald-500/15 dark:text-emerald-200"
          : "bg-[#FFF1D8] text-[#B57411] dark:bg-amber-400/12 dark:text-amber-200"
      }`}
    >
      {status}
    </span>
  );
}

function MiniChart() {
  return (
    <svg
      viewBox="0 0 360 88"
      className="absolute bottom-4 left-5 right-5 h-20 w-[88%] opacity-70"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M0 60 C30 58 42 48 68 55 C100 64 106 40 135 47 C164 54 164 70 196 62 C226 54 221 18 251 22 C278 25 275 57 304 46 C330 36 327 62 360 50"
        stroke="rgba(244, 203, 113, .75)"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M0 60 C30 58 42 48 68 55 C100 64 106 40 135 47 C164 54 164 70 196 62 C226 54 221 18 251 22 C278 25 275 57 304 46 C330 36 327 62 360 50 V88 H0 Z"
        fill="rgba(255,255,255,.10)"
      />
    </svg>
  );
}

function DashboardCard({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`rounded-[2rem] border border-[#052E1B]/10 bg-white/92 p-5 shadow-2xl shadow-[#052E1B]/10 backdrop-blur ${
        compact ? "w-full scale-[.82] origin-top" : "w-full max-w-[450px]"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xl font-black text-[#052E1B] dark:text-slate-50">
          <ChartColumnIncreasing className="h-5 w-5" /> Painel do caixa
        </div>
        <Bell className="h-5 w-5 text-[#052E1B] dark:text-slate-300" />
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B6B3A] via-[#064E2E] to-[#052E1B] p-6 text-white shadow-lg shadow-[#052E1B]/20">
        <div className="absolute right-4 top-4 grid h-12 w-12 place-items-center rounded-full bg-[#F4B942] text-xl shadow-lg ring-4 ring-white/25">
          $
        </div>
        <p className="text-sm font-medium text-white/80">Saldo previsto</p>
        <h3 className="mt-1 text-4xl font-black tracking-tight">R$ 1.240</h3>
        <p className="mt-2 text-sm text-white/70">8 membros ativos</p>
        <MiniChart />
      </div>

      <div className="mt-4 rounded-3xl bg-[#EAF6EC]/80 p-5 dark:bg-white/5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-black text-[#052E1B] dark:text-slate-50">Pagamentos do mes</p>
            <p className="mt-1 text-sm text-[#475569] dark:text-slate-300">6 de 8 confirmados</p>
          </div>
          <Clock3 className="h-5 w-5 text-[#0B6B3A]" />
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#D3E9D7] dark:bg-white/10">
          <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-[#0B6B3A] to-[#052E1B]" />
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-slate-100 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <div className="mb-3 flex items-center gap-2 font-black text-[#052E1B] dark:text-slate-50">
          <Users className="h-5 w-5" /> Membros
        </div>
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.name}
              className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#EAF6EC] text-sm font-black text-[#0B6B3A]">
                  {member.face}
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">{member.name}</span>
              </div>
              <StatusBadge status={member.status} />
            </div>
          ))}
        </div>
        <button className="mt-4 flex w-full items-center justify-between text-sm font-black text-[#0B6B3A] dark:text-emerald-300">
          Ver todos os membros <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function HeroPeopleImage() {
  return (
    <div className="relative mt-8 overflow-hidden px-2 pt-3 sm:px-4 sm:pt-4 lg:mt-10">
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#EAF6EC] via-[#F7F1E6]/90 to-transparent" />
      <div className="absolute -left-10 bottom-2 h-28 w-40 rounded-[999px] bg-[#DFF3E4]/85 blur-sm" />
      <div className="absolute right-[-1rem] bottom-0 h-24 w-36 rounded-[999px] bg-[#F6C85F]/18 blur-sm" />
      <div className="absolute bottom-0 left-0 h-12 w-full rounded-t-[100%] bg-[linear-gradient(180deg,rgba(223,243,228,0)_0%,rgba(223,243,228,0.92)_100%)]" />
      <div className="relative mx-auto max-w-[650px]">
        <Image
          src="/images/amigos-hero.png"
          alt="Grupo de amigos reunidos e sorrindo em um clima acolhedor"
          width={1920}
          height={1440}
          className="-mt-10 h-auto w-full object-contain drop-shadow-[0_22px_30px_rgba(6,31,22,0.08)] sm:-mt-14 lg:-mt-20"
          priority
        />
      </div>
    </div>
  );
}

function Step({
  icon,
  title,
  text,
  number,
}: {
  icon: "wallet" | "users" | "chart";
  title: string;
  text: string;
  number: string;
}) {
  const IconComponent =
    icon === "wallet" ? Wallet : icon === "users" ? UserPlus : ChartColumnIncreasing;

  return (
    <div className="rounded-[1.8rem] border border-[#052E1B]/10 bg-white p-7 shadow-xl shadow-[#052E1B]/5 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#052E1B]/10">
      <div className="grid h-16 w-16 place-items-center rounded-3xl bg-[#EAF6EC] text-[#0B6B3A]">
        <IconComponent className="h-8 w-8" />
      </div>
      <h3 className="mt-5 text-lg font-black text-[#052E1B]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#475569]">{text}</p>
      <div className="mt-6 text-right text-3xl font-black text-[#F4B942]">{number}</div>
    </div>
  );
}

export default function Home() {
  const { user, profile, loading, logout } = useAuth();
  const isLoggedIn = Boolean(user && profile);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(234,246,236,0.95),_transparent_24%),radial-gradient(circle_at_88%_10%,_rgba(246,200,95,0.18),_transparent_20%),linear-gradient(180deg,_#FBFAF6_0%,_#F7F1E6_100%)] px-5 py-8 font-sans text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,_rgba(29,78,60,0.18),_transparent_20%),radial-gradient(circle_at_88%_10%,_rgba(246,200,95,0.06),_transparent_16%),linear-gradient(180deg,_#0b1220_0%,_#111827_100%)] dark:text-slate-100">
      <section className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-[#D7E7DA] bg-white/82 px-5 py-4 shadow-[0_18px_40px_rgba(5,46,27,0.08)] backdrop-blur md:flex-row md:items-center md:justify-between dark:border-white/10 dark:bg-[rgba(15,23,42,0.72)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.3)]">
          <Logo />

          <div className="flex flex-wrap items-center gap-3">
            <ThemeToggle compact />
            {loading ? (
              <div className="rounded-2xl border border-[#D7E7DA] bg-white/80 px-5 py-3 text-sm font-semibold text-[#475569]">
                Preparando seu acesso
              </div>
            ) : isLoggedIn && profile ? (
              <>
                <div className="hidden items-center gap-3 rounded-full border border-[#D7E7DA] bg-white/72 px-3 py-2 xl:flex">
                  <Avatar className="h-10 w-10 border border-[#D7E7DA]">
                    <AvatarImage src={profile.fotoUrl ?? undefined} alt={profile.nome} />
                    <AvatarFallback style={{ backgroundColor: profile.cor }} className="text-white">
                      {initialsFromName(profile.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#061F16]">{profile.nome}</p>
                    <p className="truncate text-xs text-[#475569]">{profile.email}</p>
                  </div>
                </div>
                <Link href="/painel">
                  <Button className="rounded-2xl bg-gradient-to-r from-[#0B6B3A] to-[#052E1B] px-7 py-3 font-black text-white shadow-lg shadow-[#052E1B]/20 transition hover:-translate-y-0.5 hover:shadow-xl">
                    Ir para o painel
                  </Button>
                </Link>
                <Button variant="outline" className="rounded-2xl" onClick={() => logout()}>
                  Sair
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    variant="outline"
                    className="rounded-2xl border-[#052E1B] px-7 py-3 font-black text-[#052E1B] transition hover:-translate-y-0.5 hover:bg-emerald-50"
                  >
                    Entrar
                  </Button>
                </Link>
                <Link href="/cadastro">
                  <Button className="rounded-2xl bg-gradient-to-r from-[#0B6B3A] to-[#052E1B] px-7 py-3 font-black text-white shadow-lg shadow-[#052E1B]/20 transition hover:-translate-y-0.5 hover:shadow-xl">
                    Criar conta
                  </Button>
                </Link>
              </>
            )}
          </div>
        </header>

        <div className="space-y-8">
          <div className="overflow-hidden rounded-[2rem] border border-[#052E1B]/10 bg-white shadow-2xl shadow-[#052E1B]/10 dark:border-white/10 dark:bg-[rgba(15,23,42,0.84)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.34)]">
            <div className="relative overflow-hidden p-6 md:p-10 xl:p-12">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-10 bottom-16 h-36 w-64 rounded-[999px] bg-[#EAF6EC]" />
                <div className="absolute right-[-4rem] top-12 h-40 w-72 rounded-[999px] bg-[#F6C85F]/16" />
              </div>

              <div className="relative z-10 grid items-start gap-10 xl:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)] xl:items-center xl:gap-12">
                <div className="order-1">
                  <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 font-bold text-amber-700 ring-1 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-300/20">
                    <Star className="h-4 w-4 fill-current text-amber-400" /> Fase Beta
                  </div>

                  <h1 className="mt-5 max-w-[7.5ch] text-5xl font-black leading-[.92] tracking-tight text-[#052E1B] dark:text-slate-50 md:text-7xl">
                    Seu caixa organizadinho
                  </h1>
                  <p className="mt-6 max-w-xl text-xl leading-8 text-[#475569] dark:text-slate-300">
                    Organize caixinhas com clareza, ritmo e menos cobranca no grupo.
                  </p>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    {isLoggedIn && profile ? (
                      <>
                        <Link href="/painel">
                          <Button className="inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#0B6B3A] to-[#052E1B] px-8 py-4 font-black text-white shadow-xl shadow-[#052E1B]/20 transition hover:-translate-y-0.5 hover:shadow-2xl">
                            Continuar no painel <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                        <div className="rounded-2xl border border-[#D7E7DA] bg-white/80 px-5 py-4">
                          <p className="text-sm font-semibold text-[#052E1B]">
                            Plano {getPlanoLabel(profile.plano)}
                          </p>
                          <p className="mt-1 text-sm text-[#475569]">Versao beta ativa</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <Link href="/cadastro">
                          <Button className="inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#0B6B3A] to-[#052E1B] px-8 py-4 font-black text-white shadow-xl shadow-[#052E1B]/20 transition hover:-translate-y-0.5 hover:shadow-2xl">
                            Criar minha conta <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href="/login">
                          <Button
                            variant="outline"
                            className="rounded-2xl border border-[#052E1B] bg-white/70 px-8 py-4 font-black text-[#052E1B] transition hover:-translate-y-0.5 hover:bg-emerald-50 dark:border-white/10 dark:bg-[rgba(15,23,42,0.72)] dark:text-slate-100 dark:hover:bg-white/8"
                          >
                            Ja tenho acesso
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>

                  <div className="max-w-[34rem]">
                    <HeroPeopleImage />
                  </div>
                </div>

                <div className="order-3 mx-auto w-full max-w-[450px] xl:order-2 xl:max-w-none">
                  <DashboardCard />
                </div>
              </div>
            </div>

            <div className="relative z-20 border-t border-slate-100 bg-[#FBFAF6] px-8 py-8 dark:border-white/10 dark:bg-[rgba(9,15,26,0.68)]">
              <div className="mb-6 flex items-center justify-center gap-5 text-xl font-black text-[#052E1B] dark:text-slate-50">
                <span className="h-px w-16 bg-[#F4B942]" />
                Como funciona
                <span className="h-px w-16 bg-[#F4B942]" />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {steps.map(([icon, title, text, number]) => (
                  <Step key={number} icon={icon} title={title} text={text} number={number} />
                ))}
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2 rounded-3xl bg-gradient-to-r from-[#064E2E] to-[#052E1B] px-5 py-4 text-center font-bold text-white">
                <ShieldCheck className="h-5 w-5" /> Simples, transparente e feito para{" "}
                <span className="text-[#F6C85F]">grupos de verdade.</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
