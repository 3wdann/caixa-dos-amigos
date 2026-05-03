"use client";

import Link from "next/link";
import { jsPDF } from "jspdf";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { AddMemberForm } from "@/components/dashboard/add-member-form";
import { OfflineBanner } from "@/components/offline/offline-banner";
import { useAuth } from "@/components/providers/app-providers";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { initialsFromName } from "@/lib/avatar";
import { useOnlineStatus } from "@/hooks/use-online-status";
import {
  advanceCaixaMonth,
  cancelInviteByToken,
  confirmPagamento,
  declarePagamento,
  deleteCaixaNota,
  deleteCaixaCompletely,
  exportCaixaBackup,
  markPagamentoByManager,
  prepareCaixaSchedule,
  regeneratePublicInviteLink,
  rejectPagamento,
  removeMemberFromCaixa,
  subscribeCaixa,
  subscribeCaixaConvites,
  subscribeCaixaMembros,
  subscribeCaixaNotas,
  subscribeCaixaPagamentos,
  subscribeUserProfile,
  saveCaixaNota,
} from "@/lib/firestore";
import { readOfflineCache, writeOfflineCache } from "@/lib/offline-cache";
import type {
  Caixa,
  CaixaMembro,
  CaixaNota,
  CaixaPagamento,
  Convite,
  UserProfile,
} from "@/lib/types";

function statusTone(status?: CaixaPagamento["status"]) {
  switch (status) {
    case "confirmado":
      return "bg-emerald-100 text-emerald-900";
    case "rejeitado":
      return "bg-red-100 text-red-900";
    case "pendente":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function escapeCsvValue(value: string | number | null | undefined) {
  const normalized = String(value ?? "");
  return `"${normalized.replaceAll('"', '""')}"`;
}

export function CaixaDetailClient({ caixaId }: { caixaId: string }) {
  const { user, profile } = useAuth();
  const isOnline = useOnlineStatus();
  const [caixa, setCaixa] = useState<Caixa | null>(null);
  const [membros, setMembros] = useState<CaixaMembro[]>([]);
  const [pagamentos, setPagamentos] = useState<CaixaPagamento[]>([]);
  const [notas, setNotas] = useState<CaixaNota[]>([]);
  const [convites, setConvites] = useState<Convite[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [revokingLink, setRevokingLink] = useState(false);
  const [cancellingInviteToken, setCancellingInviteToken] = useState<string | null>(null);
  const [removingMemberEmail, setRemovingMemberEmail] = useState<string | null>(null);
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null);
  const [confirmingDeleteCaixa, setConfirmingDeleteCaixa] = useState(false);
  const [deletingCaixa, setDeletingCaixa] = useState(false);
  const [managerProfile, setManagerProfile] = useState<UserProfile | null>(null);
  const [preparingSchedule, setPreparingSchedule] = useState(false);
  const [advancingMonth, setAdvancingMonth] = useState(false);
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});
  const [savingNoteMonth, setSavingNoteMonth] = useState<number | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [historyMonthFilter, setHistoryMonthFilter] = useState<string>("todos");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("todos");
  const [historyMemberFilter, setHistoryMemberFilter] = useState<string>("todos");
  const [cacheReady, setCacheReady] = useState(false);

  useEffect(() => {
    async function loadCache() {
      const cached = await readOfflineCache<{
        caixa: Caixa | null;
        membros: CaixaMembro[];
        pagamentos: CaixaPagamento[];
        notas: CaixaNota[];
        convites: Convite[];
        managerProfile: UserProfile | null;
      }>(`caixa:${caixaId}`);

      if (cached) {
        setCaixa(cached.caixa ?? null);
        setMembros(cached.membros ?? []);
        setPagamentos(cached.pagamentos ?? []);
        setNotas(cached.notas ?? []);
        setConvites(cached.convites ?? []);
        setManagerProfile(cached.managerProfile ?? null);
      }

      setCacheReady(true);
    }

    void loadCache();
  }, [caixaId]);

  useEffect(() => {
    const unsubscribeCaixa = subscribeCaixa(caixaId, setCaixa);
    const unsubscribeMembros = subscribeCaixaMembros(caixaId, setMembros);
    const unsubscribePagamentos = subscribeCaixaPagamentos(caixaId, setPagamentos);
    const unsubscribeNotas = subscribeCaixaNotas(caixaId, setNotas);
    const unsubscribeConvites = subscribeCaixaConvites(caixaId, setConvites);

    return () => {
      unsubscribeCaixa();
      unsubscribeMembros();
      unsubscribePagamentos();
      unsubscribeNotas();
      unsubscribeConvites();
    };
  }, [caixaId]);

  useEffect(() => {
    if (!caixa?.gerenteId) {
      setManagerProfile(null);
      return;
    }

    if (caixa.gerenteId === profile?.uid) {
      setManagerProfile(profile);
      return;
    }

    return subscribeUserProfile(caixa.gerenteId, setManagerProfile);
  }, [caixa?.gerenteId, profile]);

  useEffect(() => {
    async function persistCache() {
      if (!cacheReady) {
        return;
      }

      await writeOfflineCache(`caixa:${caixaId}`, {
        caixa,
        membros,
        pagamentos,
        notas,
        convites,
        managerProfile,
      });
    }

    void persistCache();
  }, [cacheReady, caixa, caixaId, convites, managerProfile, membros, notas, pagamentos]);

  const isGerente = caixa?.gerenteId === user?.uid;
  const meAsMember = membros.find(
    (membro) => membro.userId === user?.uid && membro.status === "ativo",
  );
  const currentMonthPayments = pagamentos.filter((pagamento) => pagamento.mes === caixa?.mesAtual);
  const myPayment = currentMonthPayments.find((pagamento) => pagamento.membroId === user?.uid);
  const donoDoPonto = caixa
    ? membros.find(
        (membro) => membro.mesRecebimento === caixa.mesAtual && membro.status === "ativo",
      )
    : null;

  const currentMonthStatusMap = useMemo(
    () => new Map(currentMonthPayments.map((pagamento) => [pagamento.membroId, pagamento.status])),
    [currentMonthPayments],
  );
  const canRedeclarePayment = myPayment?.status === "rejeitado";
  const activeMembers = useMemo(
    () => membros.filter((membro) => membro.status === "ativo"),
    [membros],
  );
  const orderedSchedule = useMemo(
    () =>
      [...activeMembers]
        .filter((membro) => membro.mesRecebimento != null)
        .sort((a, b) => (a.mesRecebimento ?? 0) - (b.mesRecebimento ?? 0)),
    [activeMembers],
  );
  const scheduleReady =
    activeMembers.length > 0 && activeMembers.every((membro) => membro.mesRecebimento != null);
  const confirmedPaymentsCount = currentMonthPayments.filter(
    (pagamento) => pagamento.status === "confirmado",
  ).length;
  const remainingPaymentsCount = Math.max(0, activeMembers.length - confirmedPaymentsCount);
  const nextDonoDoPonto = caixa
    ? orderedSchedule.find((membro) => membro.mesRecebimento === caixa.mesAtual + 1) ?? null
    : null;
  const schedulePreview = caixa
    ? orderedSchedule.filter((membro) => (membro.mesRecebimento ?? 0) >= caixa.mesAtual).slice(0, 4)
    : [];

  const pendingInvites = useMemo(
    () =>
      convites.filter(
        (convite) =>
          convite.status === "ativo" &&
          convite.emailDestino &&
          !membros.some(
            (membro) =>
              membro.userId === convite.convidadoUserId ||
              membro.nome.toLowerCase() === convite.emailDestino?.toLowerCase(),
          ),
      ),
    [convites, membros],
  );
  const memberNameMap = useMemo(
    () => new Map(membros.map((membro) => [membro.userId, membro.nome])),
    [membros],
  );
  const notesByMonth = useMemo(
    () => new Map(notas.map((nota) => [nota.mes, nota])),
    [notas],
  );
  const chartMonthData = useMemo(
    () =>
      Array.from({ length: caixa?.totalMeses ?? 0 }, (_, index) => {
        const mes = index + 1;
        const pagamentosDoMes = pagamentos.filter((pagamento) => pagamento.mes === mes);
        const confirmado = pagamentosDoMes
          .filter((pagamento) => pagamento.status === "confirmado")
          .reduce((total, pagamento) => total + pagamento.valor, 0);
        const pendente = pagamentosDoMes
          .filter((pagamento) => pagamento.status === "pendente")
          .reduce((total, pagamento) => total + pagamento.valor, 0);
        const confirmadosCount = pagamentosDoMes.filter(
          (pagamento) => pagamento.status === "confirmado",
        ).length;
        const adimplencia =
          activeMembers.length > 0 ? Math.round((confirmadosCount / activeMembers.length) * 100) : 0;

        return {
          mes: `Mes ${mes}`,
          confirmado,
          pendente,
          adimplencia,
        };
      }),
    [activeMembers.length, caixa?.totalMeses, pagamentos],
  );
  const currentMonthDistribution = useMemo(() => {
    const counts = {
      confirmado: 0,
      pendente: 0,
      rejeitado: 0,
      semPagamento: 0,
    };

    activeMembers.forEach((membro) => {
      const status = currentMonthStatusMap.get(membro.userId);

      if (status === "confirmado") {
        counts.confirmado += 1;
      } else if (status === "pendente") {
        counts.pendente += 1;
      } else if (status === "rejeitado") {
        counts.rejeitado += 1;
      } else {
        counts.semPagamento += 1;
      }
    });

    return [
      { name: "Confirmado", value: counts.confirmado, color: "#059669" },
      { name: "Pendente", value: counts.pendente, color: "#d97706" },
      { name: "Rejeitado", value: counts.rejeitado, color: "#dc2626" },
      { name: "Sem pagamento", value: counts.semPagamento, color: "#64748b" },
    ].filter((entry) => entry.value > 0);
  }, [activeMembers, currentMonthStatusMap]);
  const historyRows = useMemo(() => {
    return pagamentos
      .filter((pagamento) => historyMonthFilter === "todos" || pagamento.mes === Number(historyMonthFilter))
      .filter(
        (pagamento) => historyStatusFilter === "todos" || pagamento.status === historyStatusFilter,
      )
      .filter(
        (pagamento) =>
          historyMemberFilter === "todos" || pagamento.membroId === historyMemberFilter,
      )
      .sort((a, b) => {
        if (b.mes !== a.mes) {
          return b.mes - a.mes;
        }

        return (b.declaradoEm?.toMillis?.() ?? 0) - (a.declaradoEm?.toMillis?.() ?? 0);
      });
  }, [historyMemberFilter, historyMonthFilter, historyStatusFilter, pagamentos]);

  useEffect(() => {
    setNoteDrafts((current) => {
      const next = { ...current };

      notas.forEach((nota) => {
        if (!(nota.mes in next)) {
          next[nota.mes] = nota.texto;
        }
      });

      return next;
    });
  }, [notas]);

  async function handleDeclarePayment() {
    if (!user || !caixa) {
      return;
    }

    try {
      setSubmitting(true);
      await declarePagamento(caixaId, caixa, user.uid, caixa.valorMensal);
      toast.success("Pagamento marcado como pendente de confirmacao do gerente.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel registrar seu pagamento.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyInviteLink() {
    if (!caixa) {
      return;
    }

    const inviteUrl = `${window.location.origin}/entrar?convite=${caixa.linkConvite}`;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Link de convite copiado.");
    } catch (error) {
      // Some in-app browsers block clipboard writes without explicit permission.
      // The full link is already visible on screen, so guide the user to copy it manually.
      toast.error("Seu navegador bloqueou a copia automatica. Use o link exibido acima para copiar manualmente.");
      // eslint-disable-next-line no-console
      console.warn("Falha ao copiar link de convite automaticamente.", error);
    }
  }

  function handleShareInviteOnWhatsApp() {
    if (!caixa) {
      return;
    }

    const inviteUrl = `${window.location.origin}/entrar?convite=${caixa.linkConvite}`;
    const message = [
      "🎉 Voce foi convidado para um caixa no Caixa dos Amigos.",
      "",
      `📦 Caixa: ${caixa.nome}`,
      `💸 Valor por membro: R$ ${caixa.valorMensal.toFixed(2)}`,
      `🏆 Total por ponto: R$ ${caixa.totalPorMes.toFixed(2)}`,
      `🗓️ Duracao: ${caixa.totalMeses} meses`,
      "",
      "Entre por este link para ver os detalhes e confirmar sua entrada:",
      inviteUrl,
    ].join("\n");

    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function handleRegenerateInviteLink() {
    try {
      setRevokingLink(true);
      await regeneratePublicInviteLink(caixaId);
      toast.success("Link publico revogado e recriado com sucesso.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel revogar o link atual.";
      toast.error(message);
    } finally {
      setRevokingLink(false);
    }
  }

  async function handleCancelPendingInvite(token: string) {
    try {
      setCancellingInviteToken(token);
      await cancelInviteByToken(token);
      toast.success("Convite pendente cancelado.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel cancelar o convite.";
      toast.error(message);
    } finally {
      setCancellingInviteToken(null);
    }
  }

  async function handleRemoveMember(membro: CaixaMembro) {
    const memberEmail = membro.email?.trim().toLowerCase();

    if (!memberEmail) {
      toast.error("Nao foi possivel identificar o membro para remocao.");
      return;
    }

    try {
      setRemovingMemberEmail(memberEmail);
      await removeMemberFromCaixa(caixaId, membro);
      toast.success("Membro removido do caixa com sucesso.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel remover o membro.";
      toast.error(message);
    } finally {
      setRemovingMemberEmail(null);
    }
  }

  async function handleConfirmPayment(pagamento: CaixaPagamento) {
    if (!user) {
      return;
    }

    try {
      setProcessingPaymentId(pagamento.id);
      await confirmPagamento(caixaId, pagamento, user.uid);
      toast.success("Pagamento confirmado com sucesso.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel confirmar o pagamento.";
      toast.error(message);
    } finally {
      setProcessingPaymentId(null);
    }
  }

  async function handleRejectPayment(pagamento: CaixaPagamento) {
    if (!user) {
      return;
    }

    try {
      setProcessingPaymentId(pagamento.id);
      await rejectPagamento(caixaId, pagamento, user.uid, "Pagamento rejeitado pelo gerente.");
      toast.success("Pagamento rejeitado.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel rejeitar o pagamento.";
      toast.error(message);
    } finally {
      setProcessingPaymentId(null);
    }
  }

  async function handleMarkPaymentByManager(membro: CaixaMembro) {
    if (!user || !caixa) {
      return;
    }

    try {
      setProcessingPaymentId(`${membro.userId}_${caixa.mesAtual}`);
      await markPagamentoByManager(caixaId, caixa, membro, user.uid);
      toast.success("Pagamento registrado e confirmado pelo gerente.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel registrar o pagamento.";
      toast.error(message);
    } finally {
      setProcessingPaymentId(null);
    }
  }

  async function handleDeleteCaixa() {
    if (!confirmingDeleteCaixa) {
      setConfirmingDeleteCaixa(true);
      return;
    }

    try {
      setDeletingCaixa(true);
      await deleteCaixaCompletely(caixaId);
      toast.success("Caixa excluido por completo.");
      window.location.assign("/painel");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel excluir o caixa.";
      toast.error(message);
    } finally {
      setDeletingCaixa(false);
      setConfirmingDeleteCaixa(false);
    }
  }

  async function handleSaveNote(mes: number) {
    if (!user) {
      return;
    }

    try {
      setSavingNoteMonth(mes);
      await saveCaixaNota(caixaId, mes, noteDrafts[mes] ?? "", user.uid);
      toast.success(`Nota do mes ${mes} salva com sucesso.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel salvar a nota.";
      toast.error(message);
    } finally {
      setSavingNoteMonth(null);
    }
  }

  async function handleDeleteNote(nota: CaixaNota) {
    try {
      setDeletingNoteId(nota.id);
      await deleteCaixaNota(caixaId, nota.id);
      setNoteDrafts((current) => ({ ...current, [nota.mes]: "" }));
      toast.success(`Nota do mes ${nota.mes} removida.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel remover a nota.";
      toast.error(message);
    } finally {
      setDeletingNoteId(null);
    }
  }

  async function handlePrepareSchedule() {
    try {
      setPreparingSchedule(true);
      await prepareCaixaSchedule(caixaId);
      toast.success("Rodizio do caixa preparado com sucesso.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel preparar o rodizio.";
      toast.error(message);
    } finally {
      setPreparingSchedule(false);
    }
  }

  async function handleAdvanceMonth() {
    try {
      setAdvancingMonth(true);
      const result = await advanceCaixaMonth(caixaId);

      if (result.status === "encerrado") {
        toast.success("Caixa encerrado com todos os pagamentos confirmados.");
      } else {
        toast.success(`Caixa avancou para o mes ${result.mesAtual}.`);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel avancar o mes.";
      toast.error(message);
    } finally {
      setAdvancingMonth(false);
    }
  }

  async function handleExportBackupJson() {
    try {
      const backup = await exportCaixaBackup(caixaId);
      const content = JSON.stringify(backup, null, 2);
      const blob = new Blob([content], { type: "application/json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `caixa-${caixaId}-backup.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Backup JSON exportado com sucesso.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel exportar o backup.";
      toast.error(message);
    }
  }

  function handleExportHistoryCsv() {
    if (!caixa) {
      return;
    }

    const headers = [
      "caixa_id",
      "caixa_nome",
      "mes",
      "membro_id",
      "membro_nome",
      "valor",
      "status",
      "fonte",
      "pontualidade",
      "motivo_rejeicao",
    ];
    const rows = historyRows.map((pagamento) =>
      [
        caixa.id,
        caixa.nome,
        pagamento.mes,
        pagamento.membroId,
        memberNameMap.get(pagamento.membroId) ?? pagamento.membroId,
        pagamento.valor.toFixed(2),
        pagamento.status,
        pagamento.fonte,
        pagamento.pontuacaoPontualidade ?? "",
        pagamento.motivoRejeicao ?? "",
      ]
        .map((value) => escapeCsvValue(value))
        .join(","),
    );

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `caixa-${caixa.id}-historico.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com sucesso.");
  }

  function handleShareMonthSummaryOnWhatsApp() {
    if (!caixa) {
      return;
    }

    const monthLabel = `Mes ${caixa.mesAtual}`;
    const lines = activeMembers.map((membro) => {
      const status = currentMonthStatusMap.get(membro.userId) ?? "sem pagamento";
      return `- ${membro.nome}: ${status}`;
    });
    const confirmedCount = currentMonthPayments.filter(
      (pagamento) => pagamento.status === "confirmado",
    ).length;
    const pendingCount = activeMembers.length - confirmedCount;
    const donoLabel = donoDoPonto
      ? `${donoDoPonto.nome} (${donoDoPonto.email ?? "sem email"})`
      : "a definir";

    const message = [
      `💰 Resumo do ${monthLabel} no Caixa dos Amigos`,
      "",
      `📦 Caixa: ${caixa.nome}`,
      `🆔 ID: ${caixa.id}`,
      `👑 Gerente: ${managerProfile?.nome ?? "Gerente do caixa"} (${managerProfile?.email ?? caixa.gerenteEmail ?? "email indisponivel"})`,
      `🏆 Dono do ponto: ${donoLabel}`,
      `💸 Valor por membro: R$ ${caixa.valorMensal.toFixed(2)}`,
      `🎯 Total por ponto: R$ ${caixa.totalPorMes.toFixed(2)}`,
      `✅ Confirmados: ${confirmedCount}`,
      `⏳ Pendentes: ${pendingCount}`,
      "",
      "Status dos membros:",
      ...lines,
    ].join("\n");

    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function handleExportHistoryPdf() {
    if (!caixa) {
      return;
    }

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const gerenteNome = managerProfile?.nome ?? "Gerente do caixa";
    const gerenteEmail = managerProfile?.email ?? caixa.gerenteEmail ?? "email indisponivel";
    const donoLabel = donoDoPonto ? `${donoDoPonto.nome}` : "A definir";
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginX = 14;
    const contentWidth = pageWidth - marginX * 2;
    const tableColumns = [
      { key: "mes", label: "Mes", width: 18 },
      { key: "membro", label: "Membro", width: 54 },
      { key: "valor", label: "Valor", width: 24 },
      { key: "status", label: "Status", width: 24 },
      { key: "fonte", label: "Fonte", width: 28 },
      { key: "extra", label: "Observacao", width: 42 },
    ] as const;

    const formatCurrency = (value: number) =>
      value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const drawHeader = (titleSuffix?: string) => {
      pdf.setFillColor(15, 23, 42);
      pdf.roundedRect(marginX, 12, contentWidth, 20, 4, 4, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text("Caixa dos Amigos", marginX + 6, 21);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(titleSuffix ?? "Relatorio financeiro do caixa", pageWidth - marginX - 6, 21, {
        align: "right",
      });
      pdf.setTextColor(31, 41, 55);
    };

    const drawSummaryCard = (
      x: number,
      y: number,
      width: number,
      title: string,
      value: string,
      tone: [number, number, number],
    ) => {
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(x, y, width, 20, 3, 3, "FD");
      pdf.setFillColor(...tone);
      pdf.roundedRect(x, y, width, 4, 3, 3, "F");
      pdf.setTextColor(100, 116, 139);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.text(title, x + 4, y + 10);
      pdf.setTextColor(15, 23, 42);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text(value, x + 4, y + 16);
    };

    const drawFooter = () => {
      const pageCount = pdf.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        pdf.setPage(page);
        pdf.setDrawColor(226, 232, 240);
        pdf.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);
        pdf.setTextColor(100, 116, 139);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, marginX, pageHeight - 7);
        pdf.text(`Pagina ${page} de ${pageCount}`, pageWidth - marginX, pageHeight - 7, {
          align: "right",
        });
      }
    };

    let cursorY = 38;
    drawHeader();

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.text(caixa.nome, marginX, cursorY);
    cursorY += 6;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(71, 85, 105);
    pdf.text(`ID unico: ${caixa.id}`, marginX, cursorY);
    pdf.text(`Mes atual: ${caixa.mesAtual} de ${caixa.totalMeses}`, pageWidth - marginX, cursorY, {
      align: "right",
    });
    cursorY += 5;
    pdf.text(`Gerente: ${gerenteNome} • ${gerenteEmail}`, marginX, cursorY);
    cursorY += 5;
    pdf.text(`Dono do ponto: ${donoLabel}`, marginX, cursorY);
    cursorY += 10;

    const cardWidth = (contentWidth - 8) / 3;
    drawSummaryCard(marginX, cursorY, cardWidth, "Valor por membro", formatCurrency(caixa.valorMensal), [5, 150, 105]);
    drawSummaryCard(marginX + cardWidth + 4, cursorY, cardWidth, "Total por ponto", formatCurrency(caixa.totalPorMes), [37, 99, 235]);
    drawSummaryCard(
      marginX + (cardWidth + 4) * 2,
      cursorY,
      cardWidth,
      "Pagamentos listados",
      String(historyRows.length),
      [217, 119, 6],
    );
    cursorY += 28;

    pdf.setTextColor(15, 23, 42);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("Historico filtrado de pagamentos", marginX, cursorY);
    cursorY += 7;

    const drawTableHeader = () => {
      let currentX = marginX;
      pdf.setFillColor(241, 245, 249);
      pdf.setDrawColor(203, 213, 225);
      pdf.rect(marginX, cursorY, contentWidth, 8, "FD");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.5);
      pdf.setTextColor(15, 23, 42);

      tableColumns.forEach((column) => {
        pdf.text(column.label, currentX + 2, cursorY + 5.3);
        currentX += column.width;
      });

      cursorY += 8;
    };

    const ensureSpace = (heightNeeded: number) => {
      if (cursorY + heightNeeded <= pageHeight - 18) {
        return;
      }

      pdf.addPage();
      drawHeader("Continua");
      cursorY = 26;
      drawTableHeader();
    };

    if (historyRows.length === 0) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.roundedRect(marginX, cursorY, contentWidth, 16, 3, 3, "S");
      pdf.text("Nao ha pagamentos para os filtros atuais.", marginX + 4, cursorY + 9);
    } else {
      drawTableHeader();

      historyRows.forEach((pagamento, index) => {
        const membroNome = memberNameMap.get(pagamento.membroId) ?? pagamento.membroId;
        const fonteLabel = pagamento.fonte === "importacao_manual" ? "manual" : "app";
        const observacao = pagamento.motivoRejeicao
          ? `Rejeitado: ${pagamento.motivoRejeicao}`
          : pagamento.pontuacaoPontualidade
            ? `Pontualidade: ${pagamento.pontuacaoPontualidade}`
            : "-";

        const lines = {
          membro: pdf.splitTextToSize(membroNome, tableColumns[1].width - 4),
          fonte: pdf.splitTextToSize(fonteLabel, tableColumns[4].width - 4),
          extra: pdf.splitTextToSize(observacao, tableColumns[5].width - 4),
        };

        const maxLines = Math.max(
          1,
          lines.membro.length,
          lines.fonte.length,
          lines.extra.length,
        );
        const rowHeight = Math.max(9, maxLines * 4.2 + 3);

        ensureSpace(rowHeight);

        pdf.setFillColor(index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 252);
        pdf.setDrawColor(226, 232, 240);
        pdf.rect(marginX, cursorY, contentWidth, rowHeight, "FD");

        let currentX = marginX;
        const cellTop = cursorY + 5;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8.3);
        pdf.setTextColor(30, 41, 59);
        pdf.text(String(pagamento.mes), currentX + 2, cellTop);
        currentX += tableColumns[0].width;

        pdf.text(lines.membro, currentX + 2, cellTop);
        currentX += tableColumns[1].width;

        pdf.text(formatCurrency(pagamento.valor), currentX + 2, cellTop);
        currentX += tableColumns[2].width;

        pdf.setFont("helvetica", "bold");
        if (pagamento.status === "confirmado") {
          pdf.setTextColor(5, 150, 105);
        } else if (pagamento.status === "rejeitado") {
          pdf.setTextColor(220, 38, 38);
        } else {
          pdf.setTextColor(217, 119, 6);
        }
        pdf.text(pagamento.status, currentX + 2, cellTop);
        currentX += tableColumns[3].width;

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(30, 41, 59);
        pdf.text(lines.fonte, currentX + 2, cellTop);
        currentX += tableColumns[4].width;

        pdf.text(lines.extra, currentX + 2, cellTop);

        cursorY += rowHeight;
      });
    }

    drawFooter();

    pdf.save(`caixa-${caixa.id}-relatorio.pdf`);
    toast.success("PDF exportado com sucesso.");
  }

  if (!profile || !caixa) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#fffdf8_0%,#f5efe5_100%)] px-6 dark:bg-[linear-gradient(180deg,#081311_0%,#111827_100%)]">
        <div className="rounded-3xl border border-white/70 bg-white/80 px-6 py-5 text-sm text-slate-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200">
          Carregando detalhes do caixa...
        </div>
      </div>
    );
  }

  if (!isGerente && !meAsMember) {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="soft-app-shell px-4 py-8"
      >
        <div className="mx-auto max-w-2xl rounded-3xl border border-white/70 bg-white/90 p-8 text-center shadow-sm dark:border-white/10 dark:bg-slate-950/80">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Acesso nao disponivel</h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            Voce nao participa deste caixa ou foi removido dele.
          </p>
          <Link
            className="mt-6 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            href="/painel"
          >
            Voltar ao painel
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="soft-app-shell"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {!isOnline ? (
          <OfflineBanner message="Voce esta offline. Exibindo a ultima versao salva deste caixa." />
        ) : null}
        <div className="flex flex-col gap-4 rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/75 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Link href="/painel" className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Voltar ao painel
            </Link>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">{caixa.nome}</h1>
            <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              {caixa.descricao || "Sem descricao para este caixa."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle />
            <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
              Mes {caixa.mesAtual}
            </Badge>
            <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100">
              {caixa.status}
            </Badge>
            <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
              R$ {caixa.valorMensal.toFixed(2)} por membro
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="border-white/70 bg-white/90 shadow-sm dark:border-white/10 dark:bg-slate-950/80">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">Resumo do mes atual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/80">
                  <p className="text-sm text-slate-500">ID unico do caixa</p>
                  <p className="mt-2 break-all font-mono text-sm font-semibold text-slate-900 dark:text-white">
                    {caixa.id}
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm text-emerald-700">Gerente do caixa</p>
                  <p className="mt-2 text-base font-semibold text-emerald-950">
                    {managerProfile?.nome ?? "Gerente nao identificado"}
                  </p>
                  <p className="mt-1 break-all text-sm text-emerald-800">
                    {managerProfile?.email ?? caixa.gerenteEmail ?? "Email indisponivel"}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/80">
                  <p className="text-sm text-slate-500">Total por ponto</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                    R$ {caixa.totalPorMes.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/80">
                  <p className="text-sm text-slate-500">Membros ativos</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                    {membros.filter((membro) => membro.status === "ativo").length}/
                    {caixa.totalMeses}
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-900">Dono do ponto do mes</p>
                <p className="mt-1 text-base text-emerald-800">
                  {donoDoPonto ? donoDoPonto.nome : "Rodizio ainda nao preparado"}
                </p>
                <p className="mt-1 text-sm text-emerald-700">
                  {donoDoPonto?.mesRecebimento
                    ? `Neste momento, o caixa esta no mes ${caixa.mesAtual}. Como ${donoDoPonto.nome} ficou com o mes ${donoDoPonto.mesRecebimento} no rodizio, ele e quem recebe agora.`
                    : "Primeiro voce prepara o rodizio. Depois disso, cada membro recebe no mes igual a sua posicao."}
                </p>
              </div>

              {scheduleReady ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm text-emerald-700">Recebe agora</p>
                    <p className="mt-2 text-lg font-semibold text-emerald-950">
                      {donoDoPonto?.nome ?? "Nao definido"}
                    </p>
                    <p className="mt-1 text-sm text-emerald-800">Mes {caixa.mesAtual}</p>
                  </div>
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                    <p className="text-sm text-sky-700">Proximo a receber</p>
                    <p className="mt-2 text-lg font-semibold text-sky-950">
                      {nextDonoDoPonto?.nome ?? "Ultimo mes do ciclo"}
                    </p>
                    <p className="mt-1 text-sm text-sky-800">
                      {nextDonoDoPonto?.mesRecebimento
                        ? `Mes ${nextDonoDoPonto.mesRecebimento}`
                        : "Sem proximo mes apos este"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/80">
                    <p className="text-sm text-slate-600">Fila do rodizio</p>
                    <div className="mt-2 space-y-2">
                      {schedulePreview.map((membro) => (
                        <div
                          key={`${membro.userId}-${membro.mesRecebimento}`}
                          className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                            membro.mesRecebimento === caixa.mesAtual
                              ? "bg-emerald-100 text-emerald-900"
                              : "bg-white text-slate-700"
                          }`}
                        >
                          <span className="font-medium">{membro.nome}</span>
                          <span>Mes {membro.mesRecebimento}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {isGerente ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/80">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Avanco do caixa</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {scheduleReady
                      ? `Pagamentos confirmados neste mes: ${confirmedPaymentsCount}/${activeMembers.length}.`
                      : `Ative ${caixa.totalMeses} membros e prepare o rodizio antes de avancar.`}
                  </p>
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                    <p className="font-medium text-slate-900 dark:text-white">Como o Dono do ponto e definido</p>
                    <p className="mt-1">
                      O rodizio automatico organiza os membros por ordem de entrada no caixa.
                      Quem ficar em 1 recebe no mes 1, quem ficar em 2 recebe no mes 2, e assim
                      por diante ate o ultimo membro.
                    </p>
                    <p className="mt-1">
                      Quando voce clica em <span className="font-medium">Encerrar mes e avancar</span>,
                      o app muda do mes atual para o proximo e o novo Dono do ponto passa a ser o
                      membro que estiver vinculado a esse mes.
                    </p>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Button
                      className="h-10 bg-slate-900 text-white hover:bg-slate-800"
                      disabled={
                        preparingSchedule ||
                        scheduleReady ||
                        activeMembers.length !== caixa.totalMeses
                      }
                      onClick={handlePrepareSchedule}
                    >
                      {preparingSchedule ? "Preparando..." : "Preparar rodizio automatico"}
                    </Button>
                    <Button
                      className="h-10 bg-emerald-700 text-white hover:bg-emerald-800"
                      disabled={advancingMonth || !scheduleReady}
                      onClick={handleAdvanceMonth}
                    >
                      {advancingMonth
                        ? "Avancando..."
                        : caixa.mesAtual >= caixa.totalMeses
                          ? "Encerrar caixa"
                          : "Encerrar mes e avancar"}
                    </Button>
                  </div>
                  {scheduleReady && remainingPaymentsCount > 0 ? (
                    <p className="mt-2 text-xs text-amber-700">
                      Ainda faltam {remainingPaymentsCount} pagamentos confirmados para liberar o
                      avanco deste mes.
                    </p>
                  ) : null}
                </div>
              ) : null}

              {!isGerente && meAsMember ? (
                <div className="space-y-3 rounded-3xl bg-slate-950 p-4 text-white">
                  <div>
                    <p className="text-sm text-slate-300">Seu pagamento</p>
                    <p className="mt-2 text-2xl font-semibold">
                      R$ {caixa.valorMensal.toFixed(2)}
                    </p>
                  </div>
                  <div
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusTone(myPayment?.status)}`}
                  >
                    {myPayment?.status ? myPayment.status : "ainda nao marcado"}
                  </div>
                  <Button
                    className="h-11 w-full bg-emerald-600 text-white hover:bg-emerald-500"
                    disabled={(Boolean(myPayment) && !canRedeclarePayment) || submitting}
                    onClick={handleDeclarePayment}
                  >
                    {submitting
                      ? "Registrando..."
                      : canRedeclarePayment
                        ? "Marcar novamente como pago"
                        : myPayment
                        ? "Pagamento ja marcado"
                        : "Marcar como pago"}
                  </Button>
                </div>
              ) : null}

              {isGerente ? (
                <>
                  <Separator />
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/80">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Link de convite</p>
                    <p className="mt-1 break-all text-sm text-slate-600">
                      {typeof window === "undefined"
                        ? `/entrar?convite=${caixa.linkConvite}`
                        : `${window.location.origin}/entrar?convite=${caixa.linkConvite}`}
                    </p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <Button className="h-10" onClick={handleCopyInviteLink}>
                        Copiar link de convite
                      </Button>
                      <Button
                        className="h-10 bg-emerald-700 text-white hover:bg-emerald-800"
                        onClick={handleShareInviteOnWhatsApp}
                      >
                        Compartilhar no WhatsApp
                      </Button>
                      <Button
                        className="h-10 border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                        disabled={revokingLink}
                        onClick={handleRegenerateInviteLink}
                      >
                        {revokingLink ? "Revogando..." : "Revogar link atual"}
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Ao revogar, o link atual deixa de funcionar e um novo link publico e criado
                      para os proximos convites.
                    </p>
                  </div>
                  <Separator />
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/80">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Backup e restauracao</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Exporte este caixa inteiro em JSON para recriar depois com historico, membros, pagamentos e notas.
                    </p>
                    <Button
                      className="mt-3 h-10 bg-slate-900 text-white hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                      onClick={handleExportBackupJson}
                    >
                      Exportar backup JSON
                    </Button>
                  </div>
                  <Separator />
                  <AddMemberForm caixaId={caixaId} />
                  <Separator />
                  <div className="rounded-3xl border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-medium text-red-800">Zona de perigo</p>
                    <p className="mt-1 text-sm text-red-700">
                      Exclui o caixa por completo, incluindo membros, pagamentos, convites e
                      vinculos de painel. Ideal para limpar seus testes agora.
                    </p>
                    <Button
                      className="mt-3 h-10 border border-red-300 bg-white text-red-700 hover:bg-red-100"
                      disabled={deletingCaixa}
                      onClick={handleDeleteCaixa}
                    >
                      {deletingCaixa
                        ? "Excluindo..."
                        : confirmingDeleteCaixa
                          ? "Clique novamente para excluir"
                          : "Excluir caixa por completo"}
                    </Button>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-white/70 bg-white/90 shadow-sm dark:border-white/10 dark:bg-slate-950/80">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-white">Membros e status do mes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {membros.length === 0 && pendingInvites.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-600">
                  Ainda nao ha membros neste caixa. O gerente pode adicionar participantes por email.
                </div>
              ) : (
                <>
                  {membros.map((membro) => {
                    const paymentStatus = currentMonthStatusMap.get(membro.userId);
                    const paymentRecord = currentMonthPayments.find(
                      (pagamento) => pagamento.membroId === membro.userId,
                    );
                    const rowPaymentId = paymentRecord?.id ?? `${membro.userId}_${caixa.mesAtual}`;

                    return (
                    <div
                      key={membro.userId}
                      className="flex flex-col gap-3 rounded-3xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/80 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={membro.fotoUrl ?? undefined} alt={membro.nome} />
                          <AvatarFallback
                            style={{ backgroundColor: membro.cor }}
                            className="text-white"
                          >
                            {initialsFromName(membro.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{membro.nome}</p>
                          <p className="text-sm text-slate-500">
                            {membro.ordemSorteio
                              ? `${membro.ordemSorteio}º no rodizio • recebe no mes ${membro.mesRecebimento}`
                              : "Ordem ainda nao definida"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-white text-slate-700 hover:bg-white">
                          {membro.status}
                        </Badge>
                        {membro.mesRecebimento === caixa.mesAtual ? (
                          <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
                            recebe neste mes
                          </Badge>
                        ) : null}
                        <Badge className={statusTone(paymentStatus)}>
                          {paymentStatus ?? "sem pagamento"}
                        </Badge>
                        {isGerente && paymentStatus === "pendente" && paymentRecord ? (
                          <>
                            <button
                              type="button"
                              className="inline-flex h-9 items-center justify-center rounded-xl bg-emerald-700 px-3 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={processingPaymentId === rowPaymentId}
                              onClick={() => handleConfirmPayment(paymentRecord)}
                            >
                              {processingPaymentId === rowPaymentId
                                ? "Confirmando..."
                                : "Confirmar pagamento"}
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-9 items-center justify-center rounded-xl border border-red-200 bg-white px-3 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={processingPaymentId === rowPaymentId}
                              onClick={() => handleRejectPayment(paymentRecord)}
                            >
                              Rejeitar
                            </button>
                          </>
                        ) : null}
                        {isGerente && !paymentStatus ? (
                          <button
                            type="button"
                            className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-900 px-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={processingPaymentId === rowPaymentId}
                            onClick={() => handleMarkPaymentByManager(membro)}
                          >
                            {processingPaymentId === rowPaymentId
                              ? "Marcando..."
                              : "Marcar pago"}
                          </button>
                        ) : null}
                        {isGerente ? (
                          <button
                            type="button"
                            className="inline-flex h-9 items-center justify-center rounded-xl border border-red-200 bg-white px-3 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={removingMemberEmail === membro.email?.trim().toLowerCase()}
                            onClick={() => handleRemoveMember(membro)}
                          >
                            {removingMemberEmail === membro.email?.trim().toLowerCase()
                              ? "Removendo..."
                              : "Excluir membro"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    );
                  })}

                  {isGerente
                    ? pendingInvites.map((convite) => (
                    <div
                      key={convite.token}
                      className="flex flex-col gap-3 rounded-3xl border border-dashed border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11">
                          <AvatarFallback className="bg-amber-200 text-amber-900">
                            @
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{convite.emailDestino}</p>
                          <p className="text-sm text-slate-500">
                            Convite registrado. Aguardando aceite para entrar no caixa.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
                          convite pendente
                        </Badge>
                        <Badge className="bg-white text-slate-700 hover:bg-white">
                          aguardando entrada
                        </Badge>
                        <button
                          type="button"
                          className="inline-flex h-9 items-center justify-center rounded-xl border border-red-200 bg-white px-3 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={cancellingInviteToken === convite.token}
                          onClick={() => handleCancelPendingInvite(convite.token)}
                        >
                          {cancellingInviteToken === convite.token
                            ? "Cancelando..."
                            : "Cancelar convite"}
                        </button>
                      </div>
                    </div>
                      ))
                    : null}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-white/70 bg-white/90 shadow-sm dark:border-white/10 dark:bg-slate-950/80">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-white">Historico de pagamentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row" aria-label="Acoes de exportacao">
              <Button
                className="h-10 bg-slate-900 text-white hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                onClick={handleExportHistoryCsv}
              >
                Exportar CSV
              </Button>
              <Button
                className="h-10 border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                onClick={handleExportHistoryPdf}
              >
                Exportar PDF
              </Button>
              <Button
                className="h-10 bg-emerald-700 text-white hover:bg-emerald-800"
                onClick={handleShareMonthSummaryOnWhatsApp}
              >
                Compartilhar resumo no WhatsApp
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="history-month">
                  Filtrar por mes
                </label>
                <select
                  id="history-month"
                  aria-describedby="history-month-help"
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={historyMonthFilter}
                  onChange={(event) => setHistoryMonthFilter(event.target.value)}
                >
                  <option value="todos">Todos os meses</option>
                  {Array.from({ length: caixa.totalMeses }, (_, index) => index + 1).map((mes) => (
                    <option key={mes} value={String(mes)}>
                      Mes {mes}
                    </option>
                  ))}
                </select>
                <p id="history-month-help" className="text-xs text-slate-500 dark:text-slate-400">
                  Mostra apenas os pagamentos do mes selecionado.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="history-status">
                  Filtrar por status
                </label>
                <select
                  id="history-status"
                  aria-describedby="history-status-help"
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={historyStatusFilter}
                  onChange={(event) => setHistoryStatusFilter(event.target.value)}
                >
                  <option value="todos">Todos os status</option>
                  <option value="pendente">Pendente</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="rejeitado">Rejeitado</option>
                </select>
                <p id="history-status-help" className="text-xs text-slate-500 dark:text-slate-400">
                  Refina o historico por confirmado, pendente ou rejeitado.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="history-member">
                  Filtrar por membro
                </label>
                <select
                  id="history-member"
                  aria-describedby="history-member-help"
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={historyMemberFilter}
                  onChange={(event) => setHistoryMemberFilter(event.target.value)}
                >
                  <option value="todos">Todos os membros</option>
                  {activeMembers.map((membro) => (
                    <option key={membro.userId} value={membro.userId}>
                      {membro.nome}
                    </option>
                  ))}
                </select>
                <p id="history-member-help" className="text-xs text-slate-500 dark:text-slate-400">
                  Limita o historico ao membro selecionado.
                </p>
              </div>
            </div>

            {historyRows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-600">
                Ainda nao ha pagamentos com esses filtros.
              </div>
            ) : (
              <div className="space-y-3">
                {historyRows.map((pagamento) => (
                  <div
                    key={pagamento.id}
                    className="flex flex-col gap-3 rounded-3xl border border-slate-100 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/80 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {memberNameMap.get(pagamento.membroId) ?? pagamento.membroId}
                      </p>
                      <p className="text-sm text-slate-500">
                        Mes {pagamento.mes} • R$ {pagamento.valor.toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Fonte: {pagamento.fonte === "importacao_manual" ? "importacao manual" : "app"}
                      </p>
                      {pagamento.motivoRejeicao ? (
                        <p className="text-xs text-red-600">
                          Motivo da rejeicao: {pagamento.motivoRejeicao}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={statusTone(pagamento.status)}>{pagamento.status}</Badge>
                      {pagamento.pontuacaoPontualidade ? (
                        <Badge className="bg-sky-100 text-sky-900 hover:bg-sky-100">
                          {pagamento.pontuacaoPontualidade}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/90 shadow-sm dark:border-white/10 dark:bg-slate-950/80">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-white">Graficos do caixa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/80">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Arrecadacao por mes
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Comparativo entre valores confirmados e pendentes em cada mes.
                </p>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartMonthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                      <XAxis dataKey="mes" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="confirmado" name="Confirmado" fill="#059669" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="pendente" name="Pendente" fill="#d97706" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/80">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Tendencia de adimplencia
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Percentual de membros confirmados em cada mes.
                </p>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartMonthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                      <XAxis dataKey="mes" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                      <Tooltip formatter={(value) => `${String(value ?? 0)}%`} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="adimplencia"
                        name="Adimplencia"
                        stroke="#2563eb"
                        strokeWidth={3}
                        dot={{ fill: "#2563eb", r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/80">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                Distribuicao do mes atual
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Panorama rapido dos status de pagamento no mes atual.
              </p>
              <div className="mt-4 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={currentMonthDistribution}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={4}
                    >
                      {currentMonthDistribution.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/70 bg-white/90 shadow-sm dark:border-white/10 dark:bg-slate-950/80">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-white">Notas por mes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {Array.from({ length: caixa.totalMeses }, (_, index) => index + 1).map((mes) => {
                const nota = notesByMonth.get(mes);
                const draft = noteDrafts[mes] ?? nota?.texto ?? "";
                const hasContent = Boolean((nota?.texto ?? "").trim() || draft.trim());

                return (
                  <details
                    key={mes}
                    open={mes === caixa.mesAtual}
                    className={`group overflow-hidden rounded-3xl border ${
                      mes === caixa.mesAtual
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-900/80"
                    }`}
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-900 dark:text-white">Mes {mes}</p>
                          {mes === caixa.mesAtual ? (
                            <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
                              mes atual
                            </Badge>
                          ) : null}
                          {hasContent ? (
                            <Badge className="bg-sky-100 text-sky-900 hover:bg-sky-100">
                              com nota
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">
                              vazio
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          {nota?.texto?.trim()
                            ? `${nota.texto.trim().slice(0, 90)}${nota.texto.trim().length > 90 ? "..." : ""}`
                            : "Sem observacoes registradas neste mes."}
                        </p>
                      </div>
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 transition group-open:rotate-180 dark:text-slate-400">
                        ▼
                      </span>
                    </summary>

                    <div className="border-t border-black/5 px-4 py-4 dark:border-white/10">
                      {isGerente ? (
                        <div className="space-y-3">
                        <textarea
                          aria-label={`Nota do mes ${mes}`}
                          aria-describedby={`nota-mes-${mes}-help`}
                          className="min-h-28 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          placeholder="Ex.: Joao pagou em dois depositos por acordo."
                          value={draft}
                          onChange={(event) =>
                            setNoteDrafts((current) => ({
                              ...current,
                              [mes]: event.target.value,
                            }))
                          }
                        />
                        <p
                          id={`nota-mes-${mes}-help`}
                          className="text-xs text-slate-500 dark:text-slate-400"
                        >
                          Apenas o gerente pode criar, editar ou excluir esta nota.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            className="h-9 bg-slate-900 text-white hover:bg-slate-800"
                            disabled={savingNoteMonth === mes}
                            onClick={() => handleSaveNote(mes)}
                          >
                            {savingNoteMonth === mes ? "Salvando..." : nota ? "Salvar edicao" : "Salvar nota"}
                          </Button>
                          {nota ? (
                            <Button
                              className="h-9 border border-red-200 bg-white text-red-700 hover:bg-red-50"
                              disabled={deletingNoteId === nota.id}
                              onClick={() => handleDeleteNote(nota)}
                            >
                              {deletingNoteId === nota.id ? "Removendo..." : "Excluir nota"}
                            </Button>
                          ) : null}
                        </div>
                        </div>
                      ) : nota ? (
                        <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">{nota.texto}</p>
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Nenhuma nota registrada para este mes.
                        </p>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
