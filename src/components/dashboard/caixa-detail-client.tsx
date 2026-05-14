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
  archivePaymentClaim,
  cancelInviteByToken,
  confirmPagamento,
  declarePagamento,
  deleteCaixaNota,
  deleteCaixaCompletely,
  exportCaixaBackup,
  generatePublicIdForCaixa,
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
  subscribePaymentClaims,
  updateMemberScheduleOrder,
} from "@/lib/firestore";
import { getEffectivePlano } from "@/lib/plano";
import { readOfflineCache, writeOfflineCache } from "@/lib/offline-cache";
import type {
  Caixa,
  CaixaMembro,
  CaixaNota,
  CaixaPagamento,
  Convite,
  PaymentClaim,
  UserProfile,
} from "@/lib/types";

function statusTone(status?: CaixaPagamento["status"]) {
  switch (status) {
    case "confirmado":
      return "bg-[#E2F3E7] text-[#214F3F]";
    case "rejeitado":
      return "bg-[#fde2db] text-[#a24834]";
    case "pendente":
      return "bg-[#fff4d8] text-[#8B6A11]";
    default:
      return "bg-[#eff4ef] text-[#657469]";
  }
}

function escapeCsvValue(value: string | number | null | undefined) {
  const normalized = String(value ?? "");
  return `"${normalized.replaceAll('"', '""')}"`;
}

function slugifyCaixaNome(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 36);
}

export function CaixaDetailClient({ caixaId }: { caixaId: string }) {
  const { user, profile } = useAuth();
  const isOnline = useOnlineStatus();
  const [caixa, setCaixa] = useState<Caixa | null>(null);
  const [membros, setMembros] = useState<CaixaMembro[]>([]);
  const [pagamentos, setPagamentos] = useState<CaixaPagamento[]>([]);
  const [notas, setNotas] = useState<CaixaNota[]>([]);
  const [convites, setConvites] = useState<Convite[]>([]);
  const [paymentClaims, setPaymentClaims] = useState<PaymentClaim[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [revokingLink, setRevokingLink] = useState(false);
  const [cancellingInviteToken, setCancellingInviteToken] = useState<string | null>(null);
  const [removingMemberEmail, setRemovingMemberEmail] = useState<string | null>(null);
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null);
  const [archivingClaimId, setArchivingClaimId] = useState<string | null>(null);
  const [confirmingDeleteCaixa, setConfirmingDeleteCaixa] = useState(false);
  const [deletingCaixa, setDeletingCaixa] = useState(false);
  const [generatingPublicId, setGeneratingPublicId] = useState(false);
  const [managerProfile, setManagerProfile] = useState<UserProfile | null>(null);
  const [preparingSchedule, setPreparingSchedule] = useState(false);
  const [advancingMonth, setAdvancingMonth] = useState(false);
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});
  const [savingNoteMonth, setSavingNoteMonth] = useState<number | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [historyMonthFilter, setHistoryMonthFilter] = useState<string>("todos");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("todos");
  const [historyMemberFilter, setHistoryMemberFilter] = useState<string>("todos");
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [chartsModalOpen, setChartsModalOpen] = useState(false);
  const [draggedMemberId, setDraggedMemberId] = useState<string | null>(null);
  const [savingScheduleOrder, setSavingScheduleOrder] = useState(false);
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
  const isProManager = getEffectivePlano(profile) === "pro";
  useEffect(() => {
    if (!isGerente || !caixa?.publicId) {
      setPaymentClaims([]);
      return;
    }

    return subscribePaymentClaims(caixa.publicId, setPaymentClaims);
  }, [caixa?.publicId, isGerente]);

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
        .sort((a, b) => {
          const aOrder = a.ordemSorteio ?? a.mesRecebimento ?? 999;
          const bOrder = b.ordemSorteio ?? b.mesRecebimento ?? 999;

          if (aOrder !== bOrder) {
            return aOrder - bOrder;
          }

          return a.nome.localeCompare(b.nome, "pt-BR");
        }),
    [activeMembers],
  );
  const scheduleCanBeEdited = Boolean(
    isGerente &&
    caixa &&
    (caixa.mesAtual === 1 || isProManager) &&
    activeMembers.some((membro) => (membro.mesRecebimento ?? 999) >= caixa.mesAtual),
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
  const pendingPaymentClaims = useMemo(
    () => paymentClaims.filter((claim) => claim.status === "pending"),
    [paymentClaims],
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
        const adimplência =
          activeMembers.length > 0 ? Math.round((confirmadosCount / activeMembers.length) * 100) : 0;

        return {
          mes: `Mês ${mes}`,
          confirmado,
          pendente,
          adimplência,
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
  const caixaPublicId = caixa?.publicId ?? "";
  const caixaFileId = caixaPublicId || "sem-id-publico";
  const publicConsultUrl = useMemo(() => {
    if (!caixa?.publicId) {
      return "";
    }

    const baseUrl = typeof window === "undefined" ? "" : `${window.location.origin}`;

    return `${baseUrl}/consultar?id=${encodeURIComponent(caixa.publicId)}`;
  }, [caixa?.publicId]);
  const inviteUrl = useMemo(() => {
    if (!caixa) {
      return "";
    }

    const suffix = `${slugifyCaixaNome(caixa.nome)}-${(caixa.publicId ?? caixaId).toLowerCase()}`;
    const baseUrl =
      typeof window === "undefined" ? "" : `${window.location.origin}`;

    return `${baseUrl}/entrar?convite=${caixa.linkConvite}&caixa=${encodeURIComponent(suffix)}`;
  }, [caixa, caixaId]);

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
      toast.success("Pagamento marcado como pendente de confirmação do gerente.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível registrar seu pagamento.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyInviteLink() {
    if (!caixa || !inviteUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Link de convite cópiado.");
    } catch (error) {
      // Some in-app browsers block clipboard writes without explicit permission.
      // The full link is already visible on screen, so guide the user to copy it manually.
      toast.error("Seu navegador bloqueou a cópia automática. Use o link exibido acima para cópiar manualmente.");
      // eslint-disable-next-line no-console
      console.warn("Falha ao cópiar link de convite automaticamente.", error);
    }
  }

  async function handleGeneratéPublicId() {
    try {
      setGeneratingPublicId(true);
      const publicId = await generatePublicIdForCaixa(caixaId);
      toast.success(`ID público criado: ${publicId}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível gerar o ID público.";
      toast.error(message);
    } finally {
      setGeneratingPublicId(false);
    }
  }

  async function handleCopyPublicId() {
    if (!caixaPublicId) {
      return;
    }

    try {
      await navigator.clipboard.writeText(caixaPublicId);
      toast.success("ID público cópiado.");
    } catch (error) {
      toast.error("Seu navegador bloqueou a cópia automática. O ID está visível na tela.");
      // eslint-disable-next-line no-console
      console.warn("Falha ao cópiar ID público automaticamente.", error);
    }
  }

  async function handleCopyPublicConsultLink() {
    if (!publicConsultUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(publicConsultUrl);
      toast.success("Link público cópiado.");
    } catch (error) {
      toast.error("Seu navegador bloqueou a cópia automática. Use o link exibido acima.");
      // eslint-disable-next-line no-console
      console.warn("Falha ao cópiar link público automaticamente.", error);
    }
  }

  function handleSharePublicConsultOnWhatsApp() {
    if (!caixa || !caixaPublicId || !publicConsultUrl) {
      return;
    }

    const message = [
      `Consulta do caixa ${caixa.nome}`,
      "",
      `ID público: ${caixaPublicId}`,
      "Use este link para consultar as informações básicas do caixa sem criar conta:",
      publicConsultUrl,
    ].join("\n");

    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function handleShareInviteOnWhatsApp() {
    if (!caixa || !inviteUrl) {
      return;
    }
    const message = [
      "🎉 Você foi convidado para acompanhar um caixa no Caixa dos Amigos.",
      "",
      `📦 Caixa: ${caixa.nome}`,
      `💸 Valor por membro: R$ ${caixa.valorMensal.toFixed(2)}`,
      `🏆 Total por ponto: R$ ${caixa.totalPorMes.toFixed(2)}`,
      `🗓️ Duração: ${caixa.totalMeses} meses`,
      "",
      "Acesse pelo link para ver os detalhes:",
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
      toast.success("Link público revogado e recriado com sucesso.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível revogar o link atual.";
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
        error instanceof Error ? error.message : "Não foi possível cancelar o convite.";
      toast.error(message);
    } finally {
      setCancellingInviteToken(null);
    }
  }

  async function handleRemoveMember(membro: CaixaMembro) {
    const memberEmail = membro.email?.trim().toLowerCase();

    if (!memberEmail) {
      toast.error("Não foi possível identificar o membro para remoção.");
      return;
    }

    try {
      setRemovingMemberEmail(memberEmail);
      await removeMemberFromCaixa(caixaId, membro);
      toast.success("Membro removido do caixa com sucesso.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível remover o membro.";
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
        error instanceof Error ? error.message : "Não foi possível confirmar o pagamento.";
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
        error instanceof Error ? error.message : "Não foi possível rejeitar o pagamento.";
      toast.error(message);
    } finally {
      setProcessingPaymentId(null);
    }
  }

  async function handleArchivePaymentClaim(claim: PaymentClaim) {
    if (!caixa?.publicId) {
      return;
    }

    try {
      setArchivingClaimId(claim.id);
      await archivePaymentClaim(caixa.publicId, claim.id);
      toast.success("Aviso arquivado. O pagamento continua dependendo da confirmação manual.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível arquivar o aviso.";
      toast.error(message);
    } finally {
      setArchivingClaimId(null);
    }
  }

  async function handleCopyPaymentClaim(claim: PaymentClaim) {
    const message = [
      `Aviso de pagamento - ${caixa?.nome ?? "Caixa"}`,
      `Nome: ${claim.nome}`,
      `Telefone: ${claim.telefone ?? "não informado"}`,
      `Mês: ${claim.mes}`,
      `Mensagem: ${claim.mensagem ?? "sem mensagem"}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(message);
      toast.success("Aviso cópiado.");
    } catch (error) {
      toast.error("Seu navegador bloqueou a cópia automatica.");
      // eslint-disable-next-line no-console
      console.warn("Falha ao cópiar aviso de pagamento.", error);
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
        error instanceof Error ? error.message : "Não foi possível registrar o pagamento.";
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
        error instanceof Error ? error.message : "Não foi possível excluir o caixa.";
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
      toast.success(`Nota do mês ${mes} salva com sucesso.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível salvar a nota.";
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
      toast.success(`Nota do mês ${nota.mes} removida.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível remover a nota.";
      toast.error(message);
    } finally {
      setDeletingNoteId(null);
    }
  }

  async function handlePrepareSchedule() {
    try {
      setPreparingSchedule(true);
      await prepareCaixaSchedule(caixaId);
      toast.success("Rodízio do caixa preparado com sucesso.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível preparar o rodízio.";
      toast.error(message);
    } finally {
      setPreparingSchedule(false);
    }
  }

  async function handleReorderMembers(targetMemberId: string) {
    if (!draggedMemberId || draggedMemberId === targetMemberId || !caixa || !scheduleCanBeEdited) {
      setDraggedMemberId(null);
      return;
    }

    const currentOrder = orderedSchedule;
    const fromIndex = currentOrder.findIndex((membro) => membro.userId === draggedMemberId);
    const toIndex = currentOrder.findIndex((membro) => membro.userId === targetMemberId);

    if (fromIndex < 0 || toIndex < 0) {
      setDraggedMemberId(null);
      return;
    }

    const dragged = currentOrder[fromIndex];
    const target = currentOrder[toIndex];
    const draggedAlreadyReceived = (dragged.mesRecebimento ?? 0) < caixa.mesAtual;
    const targetAlreadyReceived = (target.mesRecebimento ?? 0) < caixa.mesAtual;

    if ((draggedAlreadyReceived || targetAlreadyReceived) && !isProManager) {
      toast.error("Depois de iniciar o caixa, apenas o plano Pro pode trocar posições futuras.");
      setDraggedMemberId(null);
      return;
    }

    if (draggedAlreadyReceived || targetAlreadyReceived) {
      toast.error("Só é possível trocar membros que ainda não receberam o ponto.");
      setDraggedMemberId(null);
      return;
    }

    const nextOrder = [...currentOrder];
    nextOrder.splice(fromIndex, 1);
    nextOrder.splice(toIndex, 0, dragged);

    try {
      setSavingScheduleOrder(true);
      await updateMemberScheduleOrder(caixaId, nextOrder);
      toast.success("Ordem do rodízio atualizada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a ordem.");
    } finally {
      setSavingScheduleOrder(false);
      setDraggedMemberId(null);
    }
  }

  async function handleAdvanceMonth() {
    try {
      setAdvancingMonth(true);
      const result = await advanceCaixaMonth(caixaId);

      if (result.status === "encerrado") {
        toast.success("Caixa encerrado com todos os pagamentos confirmados.");
      } else {
        toast.success(`Caixa avançou para o mês ${result.mesAtual}.`);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível avançar o mês.";
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
      anchor.download = `caixa-${caixaFileId.toLowerCase()}-backup.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Backup JSON exportado com sucesso.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível exportar o backup.";
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
    anchor.download = `caixa-${caixaFileId.toLowerCase()}-histórico.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com sucesso.");
  }

  function handleShareMonthSummaryOnWhatsApp() {
    if (!caixa) {
      return;
    }

    const monthLabel = `Mês ${caixa.mesAtual}`;
    const lines = activeMembers.map((membro) => {
      const status = currentMonthStatusMap.get(membro.userId) ?? "sem pagamento";
      return `- ${membro.nome}: ${status}`;
    });
    const confirmedCount = currentMonthPayments.filter(
      (pagamento) => pagamento.status === "confirmado",
    ).length;
    const pendingCount = activeMembers.length - confirmedCount;
    const donoLabel = donoDoPonto
      ? `${donoDoPonto.nome} (${donoDoPonto.email ?? "sem e-mail"})`
      : "a definir";

    const message = [
      `💰 Resumo do ${monthLabel} no Caixa dos Amigos`,
      "",
      `📦 Caixa: ${caixa.nome}`,
      `🆔 ID: ${caixaPublicId}`,
      `👑 Gerente: ${managerProfile?.nome ?? "Gerente do caixa"} (${managerProfile?.email ?? caixa.gerenteEmail ?? "e-mail indisponível"})`,
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
    const gerenteEmail = managerProfile?.email ?? caixa.gerenteEmail ?? "e-mail indisponível";
    const donoLabel = donoDoPonto ? `${donoDoPonto.nome}` : "A definir";
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginX = 14;
    const contentWidth = pageWidth - marginX * 2;
    const tableColumns = [
      { key: "mes", label: "Mês", width: 18 },
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
      pdf.text(titleSuffix ?? "Relatório financeiro do caixa", pageWidth - marginX - 6, 21, {
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
    pdf.text(`ID público: ${caixaPublicId || "ainda não gerado"}`, marginX, cursorY);
    pdf.text(`Mês atual: ${caixa.mesAtual} de ${caixa.totalMeses}`, pageWidth - marginX, cursorY, {
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

    const chartBoxY = cursorY;
    const chartBoxHeight = 44;
    const chartBoxWidth = (contentWidth - 6) / 2;
    const maxChartValue = Math.max(
      1,
      ...chartMonthData.map((entry) => Math.max(entry.confirmado, entry.pendente)),
    );

    pdf.setDrawColor(226, 232, 240);
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(marginX, chartBoxY, chartBoxWidth, chartBoxHeight, 3, 3, "FD");
    pdf.roundedRect(marginX + chartBoxWidth + 6, chartBoxY, chartBoxWidth, chartBoxHeight, 3, 3, "FD");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(15, 23, 42);
    pdf.text("Grafico de arrecadação", marginX + 4, chartBoxY + 7);
    pdf.text("Distribuição do mês atual", marginX + chartBoxWidth + 10, chartBoxY + 7);

    const innerChartX = marginX + 4;
    const innerChartY = chartBoxY + 12;
    const barAreaWidth = chartBoxWidth - 8;
    const barAreaHeight = 22;
    const slotWidth = barAreaWidth / Math.max(chartMonthData.length, 1);

    chartMonthData.forEach((entry, index) => {
      const confirmedHeight = (entry.confirmado / maxChartValue) * barAreaHeight;
      const pendingHeight = (entry.pendente / maxChartValue) * barAreaHeight;
      const barX = innerChartX + index * slotWidth + 2;
      const confirmedWidth = Math.max(6, slotWidth * 0.28);
      const pendingWidth = confirmedWidth;

      pdf.setFillColor(5, 150, 105);
      pdf.rect(barX, innerChartY + barAreaHeight - confirmedHeight, confirmedWidth, confirmedHeight, "F");
      pdf.setFillColor(217, 119, 6);
      pdf.rect(
        barX + confirmedWidth + 2,
        innerChartY + barAreaHeight - pendingHeight,
        pendingWidth,
        pendingHeight,
        "F",
      );
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(100, 116, 139);
      pdf.text(String(index + 1), barX + 2, innerChartY + barAreaHeight + 5);
    });

    const distributionStartX = marginX + chartBoxWidth + 10;
    currentMonthDistribution.forEach((entry, index) => {
      const rowY = chartBoxY + 14 + index * 7;
      pdf.setFillColor(entry.color);
      pdf.circle(distributionStartX, rowY, 1.5, "F");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.setTextColor(51, 65, 85);
      pdf.text(`${entry.name}: ${entry.value}`, distributionStartX + 4, rowY + 1);
    });

    cursorY += 52;

    pdf.setTextColor(15, 23, 42);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("Histórico filtrado de pagamentos", marginX, cursorY);
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
      pdf.text("Não ha pagamentos para os filtros atuais.", marginX + 4, cursorY + 9);
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

    pdf.save(`caixa-${caixaFileId.toLowerCase()}-relatorio.pdf`);
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
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Acesso não disponivel</h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            Você não participa deste caixa ou foi removido dele.
          </p>
          <Link
            className="mt-6 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            href="/painel"
          >
            Voltar ao painel
          </Link>
          <Link
            className="mt-3 inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-white/10 dark:text-slate-200"
            href="/"
          >
            Ir para o inicio
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="brand-shell"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {!isOnline ? (
          <OfflineBanner message="Você está offline. Exibindo a ultima versao salva deste caixa." />
        ) : null}
        <div className="flex flex-col gap-4 rounded-[2rem] border border-[#dbe7df] bg-white p-6 shadow-[0_22px_54px_rgba(33,79,63,0.08)] dark:border-white/10 dark:bg-slate-950/75 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
              <Link href="/painel" className="text-[#2F7258] dark:text-emerald-300">
                Voltar ao painel
              </Link>
              <Link href="/" className="text-[#2F7258] dark:text-emerald-300">
                Ir para o inicio
              </Link>
            </div>
            <h1 className="text-3xl font-semibold text-[#13231C] dark:text-white">{caixa.nome}</h1>
            <p className="max-w-2xl text-sm text-[#657469] dark:text-slate-300">
              {caixa.descricao || "Sem descricao para este caixa."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle />
            <Badge className="bg-[#fff4d8] text-[#8B6A11] hover:bg-[#fff4d8]">
              Mês {caixa.mesAtual}
            </Badge>
            <Badge className="bg-[#eff4ef] text-[#214F3F] hover:bg-[#eff4ef]">
              {caixa.status}
            </Badge>
            <Badge className="bg-[#E2F3E7] text-[#214F3F] hover:bg-[#E2F3E7]">
              R$ {caixa.valorMensal.toFixed(2)} por membro
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="border-[#dbe7df] bg-white shadow-[0_20px_48px_rgba(33,79,63,0.08)] dark:border-white/10 dark:bg-slate-950/80">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-[#13231C] dark:text-white">Resumo do mês atual</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="h-10" onClick={() => setNotesModalOpen(true)}>
                    Notas por mês
                  </Button>
                  <Button variant="outline" className="h-10" onClick={() => setChartsModalOpen(true)}>
                    Gráficos do caixa
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-[#dbe7df] bg-[#f9fbf9] p-4 dark:border-white/10 dark:bg-slate-900/80">
                  <p className="text-sm text-[#657469]">ID público do caixa</p>
                  <p className="mt-2 break-all font-mono text-sm font-semibold text-[#13231C] dark:text-white">
                    {caixaPublicId || "Gerar na area de compartilhamento"}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-[#cfe4d5] bg-[#E2F3E7] p-4">
                  <p className="text-sm text-[#2F7258]">Gerente do caixa</p>
                  <p className="mt-2 text-base font-semibold text-[#13231C]">
                    {managerProfile?.nome ?? "Gerente não identificado"}
                  </p>
                  <p className="mt-1 break-all text-sm text-[#2F7258]">
                    {managerProfile?.email ?? caixa.gerenteEmail ?? "E-mail indisponível"}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.5rem] bg-[#f9fbf9] p-4 dark:bg-slate-900/80">
                  <p className="text-sm text-[#657469]">Total por ponto</p>
                  <p className="mt-2 text-2xl font-semibold text-[#13231C] dark:text-white">
                    R$ {caixa.totalPorMes.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-[1.5rem] bg-[#f9fbf9] p-4 dark:bg-slate-900/80">
                  <p className="text-sm text-[#657469]">Membros ativos</p>
                  <p className="mt-2 text-2xl font-semibold text-[#13231C] dark:text-white">
                    {membros.filter((membro) => membro.status === "ativo").length}/
                    {caixa.totalMeses}
                  </p>
                </div>
              </div>

              <div className="rounded-[1.8rem] border border-dashed border-[#cfe4d5] bg-[#F3FAF5] p-4">
                <p className="text-sm font-medium text-[#214F3F]">Dono do ponto do mês</p>
                <p className="mt-1 text-base text-[#2F7258]">
                  {donoDoPonto ? donoDoPonto.nome : "Rodízio ainda não preparado"}
                </p>
                <p className="mt-1 text-sm text-[#2F7258]">
                  {donoDoPonto?.mesRecebimento
                    ? `Neste momento, o caixa está no mês ${caixa.mesAtual}. Como ${donoDoPonto.nome} ficou com o mês ${donoDoPonto.mesRecebimento} no rodízio, ele é quem recebe agora.`
                    : "Primeiro você prepara o rodízio. Depois disso, cada membro recebe no mês igual a sua posição."}
                </p>
              </div>

              {scheduleReady ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.5rem] border border-[#cfe4d5] bg-[#E2F3E7] p-4">
                    <p className="text-sm text-[#2F7258]">Recebe agora</p>
                    <p className="mt-2 text-lg font-semibold text-[#13231C]">
                      {donoDoPonto?.nome ?? "Não definido"}
                    </p>
                    <p className="mt-1 text-sm text-[#2F7258]">Mês {caixa.mesAtual}</p>
                  </div>
                  <div className="rounded-[1.5rem] border border-[#ecd69f] bg-[#fff8e7] p-4">
                    <p className="text-sm text-[#8B6A11]">Proximo a receber</p>
                    <p className="mt-2 text-lg font-semibold text-[#13231C]">
                      {nextDonoDoPonto?.nome ?? "Último mês do ciclo"}
                    </p>
                    <p className="mt-1 text-sm text-[#8B6A11]">
                      {nextDonoDoPonto?.mesRecebimento
                        ? `Mês ${nextDonoDoPonto.mesRecebimento}`
                        : "Sem próximo mês após este"}
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-[#dbe7df] bg-[#f9fbf9] p-4 dark:border-white/10 dark:bg-slate-900/80">
                    <p className="text-sm text-[#657469]">Fila do rodízio</p>
                    <div className="mt-2 space-y-2">
                      {schedulePreview.map((membro) => (
                        <div
                          key={`${membro.userId}-${membro.mesRecebimento}`}
                          className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                            membro.mesRecebimento === caixa.mesAtual
                              ? "bg-[#E2F3E7] text-[#214F3F]"
                              : "bg-white text-[#657469]"
                          }`}
                        >
                          <span className="font-medium">{membro.nome}</span>
                          <span>Mês {membro.mesRecebimento}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}


              {isGerente && scheduleReady ? (
                <Button
                  className="h-10 w-full bg-[#2F7258] text-white hover:bg-[#255a46] sm:w-auto"
                  disabled={advancingMonth || remainingPaymentsCount > 0}
                  onClick={handleAdvanceMonth}
                >
                  {advancingMonth
                    ? "Avançando..."
                    : caixa.mesAtual >= caixa.totalMeses
                      ? "Encerrar caixa"
                      : "Encerrar mês e avançar"}
                </Button>
              ) : null}

              {!isGerente && meAsMember ? (
                <div className="space-y-3 rounded-[1.8rem] bg-[#214F3F] p-4 text-white shadow-[0_18px_40px_rgba(33,79,63,0.18)]">
                  <div>
                    <p className="text-sm text-white/75">Seu pagamento</p>
                    <p className="mt-2 text-2xl font-semibold">
                      R$ {caixa.valorMensal.toFixed(2)}
                    </p>
                  </div>
                  <div
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusTone(myPayment?.status)}`}
                  >
                    {myPayment?.status ? myPayment.status : "ainda não marcado"}
                  </div>
                  <Button
                    className="h-11 w-full bg-white text-[#214F3F] hover:bg-[#f2f6f3]"
                    disabled={(Boolean(myPayment) && !canRedeclarePayment) || submitting}
                    onClick={handleDeclarePayment}
                  >
                    {submitting
                      ? "Registrando..."
                      : canRedeclarePayment
                        ? "Marcar novamente como pago"
                        : myPayment
                        ? "Pagamento já marcado"
                        : "Marcar como pago"}
                  </Button>
                </div>
              ) : null}

              {isGerente ? (
                <>
                  <Separator />
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/80">
                    <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            Participantes e consulta pública
                          </p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            Cadastre participantes e compartilhe o ID público para consulta sem
                            exigir login dos membros.
                          </p>
                        </div>
                        <div className="rounded-2xl border border-[#dbe7df] bg-white px-4 py-3 dark:border-white/10 dark:bg-[rgba(15,23,42,0.82)]">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#657469] dark:text-slate-400">
                                Consulta dos participantes
                              </p>
                              <p className="mt-1 text-sm font-semibold text-[#13231C] dark:text-white">
                                {caixaPublicId || "Este caixa ainda não tem ID público"}
                              </p>
                              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                                Envie este ID para os participantes consultarem o caixa sem precisar
                                criar conta.
                              </p>
                              {publicConsultUrl ? (
                                <p className="mt-2 break-all text-xs text-slate-500 dark:text-slate-400">
                                  {publicConsultUrl}
                                </p>
                              ) : null}
                            </div>
                            {!caixaPublicId ? (
                              <Button
                                className="h-10 shrink-0"
                                disabled={generatingPublicId}
                                onClick={handleGeneratéPublicId}
                              >
                                {generatingPublicId ? "Gerando..." : "Gerar ID público"}
                              </Button>
                            ) : null}
                          </div>
                          {caixaPublicId ? (
                            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                              <Button className="h-10" onClick={handleCopyPublicId}>
                                Copiar ID
                              </Button>
                              <Button
                                className="h-10 border border-[#BCD5C4] bg-white text-[#214F3F] hover:bg-[#f2f6f3]"
                                onClick={handleCopyPublicConsultLink}
                              >
                                Copiar link público
                              </Button>
                              <Button
                                className="h-10 bg-emerald-700 text-white hover:bg-emerald-800"
                                onClick={handleSharePublicConsultOnWhatsApp}
                              >
                                Compartilhar no WhatsApp
                              </Button>
                            </div>
                          ) : null}
                        </div>
                        <div className="rounded-2xl border border-[#dbe7df] bg-white px-4 py-3 dark:border-white/10 dark:bg-[rgba(15,23,42,0.82)]">
                          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#657469] dark:text-slate-400">
                            Convite para entrada no app
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[#13231C] dark:text-white">
                            {caixa.nome} • {caixaPublicId}
                          </p>
                          <p className="mt-2 break-all text-sm text-slate-600 dark:text-slate-300">
                            {inviteUrl}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
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
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Ao revogar, o link atual deixa de funcionar e um novo link é criado para
                          os próximos compartilhamentos do gerente.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-[#dbe7df] bg-white p-4 dark:border-white/10 dark:bg-[rgba(15,23,42,0.82)]">
                        <AddMemberForm caixaId={caixaId} />
                      </div>
                    </div>
                  </div>
                  <div className="rounded-3xl border border-[#dbe7df] bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/80">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          Avisos de pagamento
                        </p>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          Participantes sem login podem avisar que pagaram. Revise aqui e confirme
                          manualmente no status do mês.
                        </p>
                      </div>
                      <Badge className="w-fit bg-[#fff4d8] text-[#8B6A11] hover:bg-[#fff4d8]">
                        {pendingPaymentClaims.length} pendente
                        {pendingPaymentClaims.length === 1 ? "" : "s"}
                      </Badge>
                    </div>

                    {pendingPaymentClaims.length > 0 ? (
                      <div className="mt-4 space-y-3">
                        {pendingPaymentClaims.map((claim) => (
                          <div
                            key={claim.id}
                            className="rounded-2xl border border-[#dbe7df] bg-[#f9fbf9] p-4 dark:border-white/10 dark:bg-white/5"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="font-semibold text-[#13231C] dark:text-white">
                                  {claim.nome}
                                </p>
                                <p className="mt-1 text-sm text-[#657469] dark:text-slate-300">
                                  Mês {claim.mes}
                                  {claim.telefone ? ` • ${claim.telefone}` : ""}
                                </p>
                                {claim.mensagem ? (
                                  <p className="mt-2 text-sm text-[#475569] dark:text-slate-300">
                                    {claim.mensagem}
                                  </p>
                                ) : null}
                                <p className="mt-2 text-xs text-[#657469] dark:text-slate-400">
                                  Avisado em{" "}
                                  {claim.createdAt?.toDate
                                    ? claim.createdAt.toDate().toLocaleString("pt-BR")
                                    : "agora"}
                                </p>
                              </div>
                              <div className="flex flex-col gap-2 sm:min-w-44">
                                <Button
                                  className="h-10 border border-[#BCD5C4] bg-white text-[#214F3F] hover:bg-[#f2f6f3]"
                                  onClick={() => handleCopyPaymentClaim(claim)}
                                >
                                  Copiar aviso
                                </Button>
                                <Button
                                  className="h-10 bg-[#214F3F] text-white hover:bg-[#183b2f]"
                                  disabled={archivingClaimId === claim.id}
                                  onClick={() => handleArchivePaymentClaim(claim)}
                                >
                                  {archivingClaimId === claim.id ? "Arquivando..." : "Marcar revisado"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 rounded-2xl bg-[#f9fbf9] p-4 text-sm text-[#657469] dark:bg-white/5 dark:text-slate-300">
                        Nenhum aviso pendente no momento.
                      </p>
                    )}
                  </div>
                  <Separator />
                  <div className="flex flex-col justify-end gap-3 rounded-[1.8rem] border border-[#dbe7df] bg-white/80 p-4 dark:border-white/10 dark:bg-slate-950/70 sm:flex-row">
                      <Button
                        className="h-10 bg-slate-900 text-white hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                        onClick={handleExportBackupJson}
                        title="Exporta um arquivo JSON com dados do caixa, membros, pagamentos e notas."
                      >
                        Exportar backup JSON
                      </Button>
                      <Button
                        className="h-10 border border-red-300 bg-white text-red-700 hover:bg-red-100"
                        disabled={deletingCaixa}
                        onClick={handleDeleteCaixa}
                        title="Exclui o caixa por completo, incluindo membros, pagamentos, convites e vínculos de painel."
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
            <CardTitle className="text-slate-900 dark:text-white">Membros e status do mês</CardTitle>
            </CardHeader>
          <CardContent className="space-y-4">
              {isGerente && activeMembers.length > 0 ? (
                <div className="rounded-[1.8rem] border border-[#dbe7df] bg-[#f9fbf9] p-4 dark:border-white/10 dark:bg-slate-900/80">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#13231C] dark:text-white">
                        Ordem de recebimento
                      </p>
                      <p className="mt-1 text-sm text-[#657469] dark:text-slate-300">
                        Arraste os membros para definir quem recebe em cada mês. Depois que o caixa
                        começa, a ordem fica bloqueada; no Pro, você pode trocar posições futuras
                        quando os dois membros ainda não receberam o ponto.
                      </p>
                    </div>
                    <Button
                      className="h-10 shrink-0 bg-[#214F3F] text-white hover:bg-[#183b2f]"
                      disabled={
                        preparingSchedule ||
                        scheduleReady ||
                        activeMembers.length !== (caixa?.totalMeses ?? 0)
                      }
                      onClick={handlePrepareSchedule}
                    >
                      {preparingSchedule ? "Preparando..." : "Iniciar rodízio"}
                    </Button>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {orderedSchedule.map((membro, index) => {
                      const locked =
                        !scheduleCanBeEdited || (membro.mesRecebimento ?? 999) < caixa.mesAtual;

                      return (
                        <div
                          key={`ordem-${membro.userId}`}
                          draggable={!locked && !savingScheduleOrder}
                          onDragStart={() => setDraggedMemberId(membro.userId)}
                          onDragOver={(event) => {
                            if (!locked) {
                              event.preventDefault();
                            }
                          }}
                          onDrop={() => handleReorderMembers(membro.userId)}
                          className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${
                            locked
                              ? "border-slate-200 bg-white/70 text-slate-500 dark:border-white/10 dark:bg-white/5"
                              : "cursor-grab border-[#cfe4d5] bg-white text-[#13231C] shadow-sm active:cursor-grabbing dark:border-white/10 dark:bg-slate-950 dark:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#E2F3E7] text-xs font-bold text-[#214F3F]">
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-semibold">{membro.nome}</p>
                              <p className="text-xs text-[#657469] dark:text-slate-400">
                                Recebe no mês {index + 1}
                                {locked ? " • bloqueado" : " • arraste para trocar"}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-[#fff4d8] text-[#8B6A11] hover:bg-[#fff4d8]">
                            {savingScheduleOrder ? "Salvando..." : "Rodízio"}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {membros.length === 0 && pendingInvites.length === 0 ? (
                <div className="rounded-[1.8rem] border border-dashed border-[#cfe4d5] bg-[#F6FBF7] px-4 py-6 text-sm text-[#657469] dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-300">
                  <p className="font-semibold text-[#13231C] dark:text-white">
                    Nenhum membro cadastrado ainda.
                  </p>
                  <p className="mt-1">
                    Cadastre participantes na área de compartilhamento para começar a organizar o
                    rodízio e os pagamentos do mês.
                  </p>
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
                      className="flex flex-col gap-3 rounded-[1.7rem] border border-[#e5ede7] bg-[#f9fbf9] p-4 dark:border-white/10 dark:bg-slate-900/80 sm:flex-row sm:items-center sm:justify-between"
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
                          <p className="font-medium text-[#13231C] dark:text-white">{membro.nome}</p>
                          <p className="text-sm text-[#657469]">
                            {membro.ordemSorteio
                              ? `${membro.ordemSorteio}º no rodízio • recebe no mês ${membro.mesRecebimento}`
                              : "Ordem ainda não definida"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-white text-[#657469] hover:bg-white">
                          {membro.status}
                        </Badge>
                        {membro.mesRecebimento === caixa.mesAtual ? (
                          <Badge className="bg-[#E2F3E7] text-[#214F3F] hover:bg-[#E2F3E7]">
                            recebe neste mês
                          </Badge>
                        ) : null}
                        <Badge className={statusTone(paymentStatus)}>
                          {paymentStatus ?? "sem pagamento"}
                        </Badge>
                        {isGerente && paymentStatus === "pendente" && paymentRecord ? (
                          <>
                            <button
                              type="button"
                              className="inline-flex h-9 items-center justify-center rounded-full bg-[#2F7258] px-4 text-sm font-medium text-white transition hover:bg-[#255a46] disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={processingPaymentId === rowPaymentId}
                              onClick={() => handleConfirmPayment(paymentRecord)}
                            >
                              {processingPaymentId === rowPaymentId
                                ? "Confirmando..."
                                : "Confirmar pagamento"}
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-9 items-center justify-center rounded-full border border-[#f2c9bd] bg-white px-4 text-sm font-medium text-[#a24834] transition hover:bg-[#fff3ee] disabled:cursor-not-allowed disabled:opacity-50"
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
                            className="inline-flex h-9 items-center justify-center rounded-full bg-[#214F3F] px-4 text-sm font-medium text-white transition hover:bg-[#183b2f] disabled:cursor-not-allowed disabled:opacity-50"
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
                            className="inline-flex h-9 items-center justify-center rounded-full border border-[#f2c9bd] bg-white px-4 text-sm font-medium text-[#a24834] transition hover:bg-[#fff3ee] disabled:cursor-not-allowed disabled:opacity-50"
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
                      className="flex flex-col gap-3 rounded-[1.7rem] border border-dashed border-[#ecd69f] bg-[#fff8e7] p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11">
                          <AvatarFallback className="bg-[#f7df9d] text-[#8B6A11]">
                            @
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-[#13231C] dark:text-white">{convite.emailDestino}</p>
                          <p className="text-sm text-[#657469]">
                            Membro cadastrado pelo gerente. Aguardando confirmação de entrada.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-[#fff4d8] text-[#8B6A11] hover:bg-[#fff4d8]">
                          convite pendente
                        </Badge>
                        <Badge className="bg-white text-[#657469] hover:bg-white">
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

        <Card className="overflow-hidden border-[#dbe7df] bg-white shadow-[0_20px_48px_rgba(33,79,63,0.08)] dark:border-white/10 dark:bg-slate-950/80">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#2F7258] dark:text-emerald-300">
                  Financeiro
                </p>
                <CardTitle className="text-[#13231C] dark:text-white">Histórico de pagamentos</CardTitle>
              </div>
              <p className="max-w-md text-sm text-[#657469] dark:text-slate-300">
                Filtre, exporte e compartilhe o resumo financeiro sem poluir o painel principal.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row" aria-label="Acoes de exportacao">
              <Button
                className="h-10 bg-[#214F3F] text-white hover:bg-[#183b2f] dark:bg-emerald-600 dark:hover:bg-emerald-500"
                onClick={handleExportHistoryCsv}
              >
                Exportar CSV
              </Button>
              <Button
                className="h-10 border border-[#BCD5C4] bg-white text-[#214F3F] hover:bg-[#f5f8f5] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                onClick={handleExportHistoryPdf}
              >
                Exportar PDF
              </Button>
              <Button
                className="h-10 bg-[#2F7258] text-white hover:bg-[#255a46]"
                onClick={handleShareMonthSummaryOnWhatsApp}
              >
                Compartilhar resumo no WhatsApp
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#214F3F] dark:text-slate-300" htmlFor="history-month">
                  Filtrar por mês
                </label>
                <select
                  id="history-month"
                  aria-describedby="history-month-help"
                  className="flex h-11 w-full rounded-[1.1rem] border border-[#dbe7df] bg-white px-3 py-2 text-sm text-[#13231C] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F7258]"
                  value={historyMonthFilter}
                  onChange={(event) => setHistoryMonthFilter(event.target.value)}
                >
                  <option value="todos">Todos os meses</option>
                  {Array.from({ length: caixa?.totalMeses ?? 0 }, (_, index) => index + 1).map((mes) => (
                    <option key={mes} value={String(mes)}>
                      Mês {mes}
                    </option>
                  ))}
                </select>
                <p id="history-month-help" className="text-xs text-[#657469] dark:text-slate-400">
                  Mostra apenas os pagamentos do mês selecionado.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#214F3F] dark:text-slate-300" htmlFor="history-status">
                  Filtrar por status
                </label>
                <select
                  id="history-status"
                  aria-describedby="history-status-help"
                  className="flex h-11 w-full rounded-[1.1rem] border border-[#dbe7df] bg-white px-3 py-2 text-sm text-[#13231C] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F7258]"
                  value={historyStatusFilter}
                  onChange={(event) => setHistoryStatusFilter(event.target.value)}
                >
                  <option value="todos">Todos os status</option>
                  <option value="pendente">Pendente</option>
                  <option value="confirmado">Confirmado</option>
                  <option value="rejeitado">Rejeitado</option>
                </select>
                <p id="history-status-help" className="text-xs text-[#657469] dark:text-slate-400">
                  Refina o histórico por confirmado, pendente ou rejeitado.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#214F3F] dark:text-slate-300" htmlFor="history-member">
                  Filtrar por membro
                </label>
                <select
                  id="history-member"
                  aria-describedby="history-member-help"
                  className="flex h-11 w-full rounded-[1.1rem] border border-[#dbe7df] bg-white px-3 py-2 text-sm text-[#13231C] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F7258]"
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
                <p id="history-member-help" className="text-xs text-[#657469] dark:text-slate-400">
                  Limita o histórico ao membro selecionado.
                </p>
              </div>
            </div>

            {historyRows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-600">
                Ainda não ha pagamentos com esses filtros.
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
                        Mês {pagamento.mes} • R$ {pagamento.valor.toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Fonte: {pagamento.fonte === "importacao_manual" ? "importação manual" : "app"}
                      </p>
                      {pagamento.motivoRejeicao ? (
                        <p className="text-xs text-red-600">
                          Motivo da rejeição: {pagamento.motivoRejeicao}
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

        {chartsModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-md">
            <Card className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[2.4rem] border-white/70 bg-white/95 dark:border-white/10 dark:bg-[rgba(15,23,42,0.96)]">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-slate-900 dark:text-white">Gráficos do caixa</CardTitle>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Leitura visual da arrecadação, adimplência e distribuição do mês atual.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setChartsModalOpen(false)}>
                    Fechar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 xl:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900/80">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Arrecadação por mês</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Comparativo entre valores confirmados e pendentes em cada mês.
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
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Tendencia de adimplência</p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Percentual de membros confirmados em cada mês.
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
                            dataKey="adimplência"
                            name="Adimplência"
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
                  <p className="text-sm font-medium text-slate-900 dark:text-white">Distribuição do mês atual</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Panorama rápido dos status de pagamento no mês atual.
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
          </div>
        ) : null}

        {notesModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-md">
            <Card className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2.4rem] border-white/70 bg-white/95 dark:border-white/10 dark:bg-[rgba(15,23,42,0.96)]">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-slate-900 dark:text-white">Notas por mês</CardTitle>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Observações do gerente e histórico de combinados organizados por mês.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setNotesModalOpen(false)}>
                    Fechar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.from({ length: caixa?.totalMeses ?? 0 }, (_, index) => index + 1).map((mes) => {
                  const nota = notesByMonth.get(mes);
                  const draft = noteDrafts[mes] ?? nota?.texto ?? "";
                  const hasContent = Boolean((nota?.texto ?? "").trim() || draft.trim());

                  return (
                    <details
                      key={mes}
                      open={mes === caixa?.mesAtual}
                      className={`group overflow-hidden rounded-3xl border ${
                        mes === caixa?.mesAtual
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-900/80"
                      }`}
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-slate-900 dark:text-white">Mês {mes}</p>
                            {mes === caixa?.mesAtual ? (
                              <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
                                mês atual
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
                              : "Sem observações registradas neste mês."}
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
                              aria-label={`Nota do mês ${mes}`}
                              aria-describedby={`nota-mes-${mes}-help`}
                              className="min-h-28 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              placeholder="Ex.: João pagou em dois depósitos por acordo."
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
                              Apenas o gerente pode criar, editar ou excluir está nota.
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                className="h-9 bg-slate-900 text-white hover:bg-slate-800"
                                disabled={savingNoteMonth === mes}
                                onClick={() => handleSaveNote(mes)}
                              >
                                {savingNoteMonth === mes ? "Salvando..." : nota ? "Salvar edição" : "Salvar nota"}
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
                            Nenhuma nota registrada para este mês.
                          </p>
                        )}
                      </div>
                    </details>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </main>
  );
}
