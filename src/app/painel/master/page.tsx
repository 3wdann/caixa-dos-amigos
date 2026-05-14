"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/app-providers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  approveUpgradeRequestByMaster,
  createDiscountCoupon,
  grantMasterByEmail,
  grantProByEmail,
  rejectUpgradeRequestByMaster,
  revokeMasterByEmail,
  subscribeAllUpgradeRequests,
} from "@/lib/firestore";
import { isMasterProfile, isRootMasterEmail, MASTER_EMAIL } from "@/lib/master";
import type { UpgradeRequest } from "@/lib/types";

export default function MasterPanelPage() {
  const { user, profile } = useAuth();
  const [requests, setRequests] = useState<UpgradeRequest[]>([]);
  const [proEmail, setProEmail] = useState("");
  const [proDays, setProDays] = useState(30);
  const [masterEmail, setMasterEmail] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponPercent, setCouponPercent] = useState(20);
  const [processing, setProcessing] = useState<string | null>(null);
  const canAccess = isMasterProfile(profile);
  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "pending"),
    [requests],
  );

  useEffect(() => {
    if (!canAccess) {
      return;
    }

    return subscribeAllUpgradeRequests(setRequests);
  }, [canAccess]);

  if (!profile || !user) {
    return (
      <main className="brand-shell p-6">
        <p className="text-sm text-slate-600 dark:text-slate-300">Carregando painel master...</p>
      </main>
    );
  }

  if (!canAccess) {
    return (
      <main className="brand-shell p-6">
        <Card className="mx-auto max-w-xl rounded-[2rem]">
          <CardContent className="space-y-4 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
              Acesso restrito
            </p>
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
              Este painel é exclusivo para masters.
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              As solicitações Pro beta são analisadas pela conta master {MASTER_EMAIL}.
            </p>
            <Link href="/painel">
              <Button>Voltar ao painel</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  async function runAction(label: string, action: () => Promise<void>) {
    try {
      setProcessing(label);
      await action();
      toast.success("Ação concluída com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível concluir a ação.");
    } finally {
      setProcessing(null);
    }
  }

  return (
    <main className="brand-shell" id="main-content" tabIndex={-1}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Card className="brand-card rounded-[2rem]">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                Painel master
              </p>
              <h1 className="text-3xl font-bold text-[#061F16] dark:text-white">
                Controle beta, Pro e cupons
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Solicitações Pro são direcionadas para {MASTER_EMAIL}. Somente essa conta pode remover
                outro master.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/">
                <Button variant="outline">Ir para a home</Button>
              </Link>
              <Link href="/painel">
                <Button>Voltar ao painel</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-[#dbe7df]">
          <CardHeader>
            <CardTitle>Solicitações Pro beta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.length === 0 ? (
              <p className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                Nenhuma solicitação pendente no momento.
              </p>
            ) : (
              pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-950 dark:text-white">{request.nome}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{request.email}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Solicitado em {request.createdAt?.toDate?.().toLocaleString("pt-BR") ?? "data indisponível"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={processing === request.id}
                      onClick={() =>
                        runAction(request.id, () =>
                          approveUpgradeRequestByMaster(request, proDays, profile.email),
                        )
                      }
                    >
                      Aprovar por {proDays} dias
                    </Button>
                    <Button
                      variant="outline"
                      disabled={processing === request.id}
                      onClick={() =>
                        runAction(request.id, () =>
                          rejectUpgradeRequestByMaster(request, "Rejeitado no beta.", profile.email),
                        )
                      }
                    >
                      Rejeitar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="rounded-[2rem]">
            <CardHeader>
              <CardTitle>Liberar Pro por período</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm dark:border-white/10 dark:bg-slate-900"
                placeholder="email@exemplo.com"
                value={proEmail}
                onChange={(event) => setProEmail(event.target.value)}
              />
              <input
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm dark:border-white/10 dark:bg-slate-900"
                type="number"
                min={1}
                value={proDays}
                onChange={(event) => setProDays(Number(event.target.value))}
              />
              <Button
                className="w-full"
                disabled={processing === "grant-pro"}
                onClick={() =>
                  runAction("grant-pro", () => grantProByEmail(proEmail, proDays, profile.email))
                }
              >
                Enviar Pro
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem]">
            <CardHeader>
              <CardTitle>Gerenciar masters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm dark:border-white/10 dark:bg-slate-900"
                placeholder="email@exemplo.com"
                value={masterEmail}
                onChange={(event) => setMasterEmail(event.target.value)}
              />
              <Button
                className="w-full"
                disabled={processing === "grant-master"}
                onClick={() =>
                  runAction("grant-master", () => grantMasterByEmail(masterEmail, profile.email))
                }
              >
                Enviar master
              </Button>
              <Button
                className="w-full"
                variant="outline"
                disabled={!isRootMasterEmail(profile.email) || processing === "revoke-master"}
                onClick={() =>
                  runAction("revoke-master", () => revokeMasterByEmail(masterEmail, profile.email))
                }
              >
                Remover master
              </Button>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Apenas {MASTER_EMAIL} pode remover outro master.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem]">
            <CardHeader>
              <CardTitle>Criar cupom</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm uppercase dark:border-white/10 dark:bg-slate-900"
                placeholder="BETA20"
                value={couponCode}
                onChange={(event) => setCouponCode(event.target.value)}
              />
              <input
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm dark:border-white/10 dark:bg-slate-900"
                type="number"
                min={1}
                max={100}
                value={couponPercent}
                onChange={(event) => setCouponPercent(Number(event.target.value))}
              />
              <Button
                className="w-full"
                disabled={processing === "coupon"}
                onClick={() =>
                  runAction("coupon", () =>
                    createDiscountCoupon({
                      codigo: couponCode,
                      percentual: couponPercent,
                      createdBy: profile.email,
                    }),
                  )
                }
              >
                Criar cupom
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
