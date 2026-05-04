"use client";

import Link from "next/link";
import { ChartColumnIncreasing, CircleDollarSign, UserPlus, WalletCards } from "lucide-react";

import { useAuth } from "@/components/providers/app-providers";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { initialsFromName } from "@/lib/avatar";
import { getPlanoLabel } from "@/lib/plano";

const howItWorks = [
  {
    number: "01",
    title: "Crie uma caixa",
    text: "Defina o valor, a frequencia e o objetivo da caixinha.",
    icon: CircleDollarSign,
  },
  {
    number: "02",
    title: "Convide amigos",
    text: "Adicione amigos e deixe todo mundo por dentro.",
    icon: UserPlus,
  },
  {
    number: "03",
    title: "Acompanhe",
    text: "Veja pagamentos, saldo e progresso em tempo real.",
    icon: ChartColumnIncreasing,
  },
];

export default function Home() {
  const { user, profile, loading, logout } = useAuth();
  const isLoggedIn = Boolean(user && profile);

  return (
    <main id="main-content" tabIndex={-1} className="brand-shell px-4 py-6 sm:py-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 lg:gap-14">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-[#dbe7df] bg-white/88 px-5 py-4 shadow-[0_18px_40px_rgba(33,79,63,0.08)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-[#214F3F] text-[#EFC35E] shadow-[0_12px_24px_rgba(33,79,63,0.18)]">
              <CircleDollarSign className="size-7" strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-base font-semibold tracking-[0.12em] text-[#214F3F] sm:text-lg">
                CAIXA DOS AMIGOS
              </p>
              <p className="text-sm text-[#657469]">Seu caixa organizadinho</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ThemeToggle compact />
            {loading ? (
              <span className="text-sm text-[#657469]">Carregando...</span>
            ) : isLoggedIn && profile ? (
              <>
                <div className="hidden items-center gap-3 rounded-full border border-[#dbe7df] bg-[#F8FBF8] px-3 py-2 md:flex">
                  <Avatar className="h-10 w-10 border border-[#dbe7df]">
                    <AvatarImage src={profile.fotoUrl ?? undefined} alt={profile.nome} />
                    <AvatarFallback style={{ backgroundColor: profile.cor }} className="text-white">
                      {initialsFromName(profile.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#13231C]">{profile.nome}</p>
                    <p className="truncate text-xs text-[#657469]">{profile.email}</p>
                  </div>
                </div>
                <Link href="/painel">
                  <Button>Ir para o painel</Button>
                </Link>
                <Button variant="outline" onClick={() => logout()}>
                  Sair
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="outline">Entrar</Button>
                </Link>
                <Link href="/cadastro">
                  <Button>Criar conta</Button>
                </Link>
              </>
            )}
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center" aria-labelledby="home-title">
          <div className="space-y-6">
            <Badge className="h-10 rounded-full border border-[#cbe0d2] bg-[#E2F3E7] px-5 text-sm font-semibold text-[#2F7258] hover:bg-[#E2F3E7]">
              Fase 1 do MVP
            </Badge>

            <div className="space-y-4">
              <h1
                id="home-title"
                className="max-w-3xl text-5xl font-semibold leading-[0.96] tracking-tight text-[#13231C] sm:text-6xl lg:text-7xl"
              >
                Seu caixa organizadinho
              </h1>
              <p className="max-w-2xl text-xl leading-8 text-[#2F7258] sm:text-[1.85rem] sm:leading-[1.25]">
                Organize caixinhas com clareza, ritmo e menos cobranca no grupo.
              </p>
            </div>

            {isLoggedIn && profile ? (
              <div className="brand-card p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-[#657469]">Sessao ativa</p>
                    <p className="text-2xl font-semibold text-[#13231C]">{profile.nome}</p>
                    <p className="text-sm text-[#657469]">{profile.email}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">Plano {getPlanoLabel(profile.plano)}</Badge>
                      <Badge className="bg-[#fff4d8] text-[#8B6A11] hover:bg-[#fff4d8]">Versao beta</Badge>
                    </div>
                  </div>
                  <Link href="/painel">
                    <Button size="lg">Continuar no painel</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/cadastro">
                  <Button size="lg" className="w-full sm:w-auto">
                    Criar minha conta
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Ja tenho acesso
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <div className="relative">
            <div className="brand-card relative overflow-visible p-5 sm:p-6">
              <div className="rounded-[1.25rem] bg-[#f0f5f0] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-semibold text-[#214F3F]">Painel do caixa</h2>
                  <span className="rounded-full bg-[#E2F3E7] px-4 py-2 text-sm font-medium text-[#2F7258]">
                    Maio 2026
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.75rem] bg-[#214F3F] p-5 text-white shadow-[0_18px_38px_rgba(33,79,63,0.18)]">
                  <p className="text-sm text-white/80">Saldo previsto</p>
                  <p className="mt-3 text-4xl font-semibold">R$ 1.240</p>
                  <p className="mt-3 text-base text-white/80">8 membros ativos</p>
                </div>

                <div className="rounded-[1.75rem] border border-[#f0d7a3] bg-[#fff9ec] p-5">
                  <p className="text-sm font-medium text-[#214F3F]">Pagamentos do mes</p>
                  <div className="mt-5 h-4 rounded-full bg-[#eadfc2]">
                    <div className="h-4 w-[75%] rounded-full bg-[#EFC35E]" />
                  </div>
                  <p className="mt-5 text-xl font-semibold text-[#2F7258]">6 de 8 confirmados</p>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-2xl font-semibold text-[#13231C]">Membros</h3>
                <div className="mt-4 space-y-3">
                  {[
                    { name: "Ana", status: "Pago", tone: "bg-[#E2F3E7] text-[#2F7258]", dot: "bg-[#BEE0C8]" },
                    { name: "Bruno", status: "Pago", tone: "bg-[#E2F3E7] text-[#2F7258]", dot: "bg-[#BEE0C8]" },
                    { name: "Carlos", status: "Pendente", tone: "bg-[#fff0d6] text-[#b66b1a]", dot: "bg-[#f6d1c6]" },
                  ].map((member) => (
                    <div
                      key={member.name}
                      className="flex items-center justify-between rounded-[1.4rem] border border-[#e7efe9] bg-[#f9fcfa] px-4 py-4"
                    >
                      <div className="flex items-center gap-4">
                        <span className={`h-5 w-5 rounded-full ${member.dot}`} />
                        <span className="text-2xl font-semibold text-[#214F3F]">{member.name}</span>
                      </div>
                      <span className={`rounded-full px-4 py-2 text-sm font-medium ${member.tone}`}>
                        {member.status}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <span className="text-sm font-medium text-[#2F7258]">Ver todos os membros</span>
                </div>
              </div>

              <div className="absolute -bottom-8 -left-6 hidden h-28 w-28 items-center justify-center rounded-[2rem] bg-white shadow-[0_18px_40px_rgba(33,79,63,0.12)] md:flex">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#f5c95c] text-[#214F3F]">
                  <WalletCards className="size-10" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-5" aria-labelledby="como-funciona-title">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#2F7258]">
              Como funciona
            </p>
            <h2 id="como-funciona-title" className="text-3xl font-semibold text-[#13231C] sm:text-4xl">
              Tudo o que voce precisa para organizar a caixinha sem dor de cabeca
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {howItWorks.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.title} className="brand-card flex h-full flex-col gap-4 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[#E2F3E7] text-[#2F7258]">
                      <Icon className="size-6" />
                    </div>
                    <span className="text-sm font-semibold text-[#d1a136]">{item.number}</span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-semibold text-[#13231C]">{item.title}</h3>
                    <p className="text-base leading-7 text-[#657469]">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
