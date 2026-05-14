"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createPaymentClaim, getPublicCaixaById } from "@/lib/firestore";
import type { PublicCaixa } from "@/lib/types";

function normalizePublicId(value: string) {
  const compact = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  if (compact.startsWith("CXA") && compact.length === 11) {
    return `CXA-${compact.slice(3, 7)}-${compact.slice(7, 11)}`;
  }

  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function paymentStatusLabel(status: PublicCaixa["membros"][number]["pagamentoStatus"]) {
  switch (status) {
    case "confirmado":
      return "Pago";
    case "pendente":
      return "Avisado";
    case "rejeitado":
      return "Revisar";
    default:
      return "Pendente";
  }
}

function paymentStatusClass(status: PublicCaixa["membros"][number]["pagamentoStatus"]) {
  switch (status) {
    case "confirmado":
      return "bg-[#E2F3E7] text-[#214F3F]";
    case "pendente":
      return "bg-[#fff4d8] text-[#8B6A11]";
    case "rejeitado":
      return "bg-[#fde2db] text-[#a24834]";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default function ConsultarCaixaPage() {
  const [publicId, setPublicId] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [participantPhone, setParticipantPhone] = useState("");
  const [participantMessage, setParticipantMessage] = useState("");
  const [caixa, setCaixa] = useState<PublicCaixa | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingClaim, setSendingClaim] = useState(false);
  const [error, setError] = useState("");

  const whatsappMessage = useMemo(() => {
    if (!caixa) {
      return "";
    }

    const name = participantName.trim() || "participante";

    return [
      `Ol?, sou ${name}.`,
      `Estou avisando que paguei o caixa ${caixa.publicId}.`,
      `Caixa: ${caixa.nome}`,
      `Mês atual: ${caixa.mesAtual}`,
    ].join("\n");
  }, [caixa, participantName]);

  useEffect(() => {
    const queryId = new URLSearchParams(window.location.search).get("id");

    if (queryId) {
      const normalized = normalizePublicId(queryId);
      setPublicId(normalized);
      void handleSearch(normalized);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSearch(idFromQuery?: string) {
    const normalized = normalizePublicId(idFromQuery ?? publicId);

    if (!normalized) {
      setError("Digite o ID público do caixa para consultar.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const result = await getPublicCaixaById(normalized);

      if (!result) {
        setCaixa(null);
        setError("Não encontramos um caixa ativo com esse ID. Confira o c?digo com o gerente.");
        return;
      }

      setPublicId(normalized);
      setCaixa(result);
    } catch (searchError) {
      setCaixa(null);
      const message =
        searchError instanceof Error
          ? searchError.message
          : "Não foi possível consultar este caixa agora.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handlePaymentNotice() {
    if (!whatsappMessage) {
      return;
    }

    window.open(
      `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`,
      "_blank",
      "noopener,noreferrer",
    );
    toast.success("Mensagem pronta no WhatsApp. O gerente ainda precisa confirmar o pagamento.");
  }

  async function handlePaymentClaim() {
    if (!caixa) {
      return;
    }

    try {
      setSendingClaim(true);
      await createPaymentClaim({
        publicId: caixa.publicId,
        nome: participantName,
        telefone: participantPhone,
        mensagem: participantMessage,
        mes: caixa.mesAtual,
      });
      setParticipantMessage("");
      toast.success("Aviso enviado ao gerente. Ele ainda precisa revisar e confirmar manualmente.");
    } catch (claimError) {
      const message =
        claimError instanceof Error ? claimError.message : "Não foi possível enviar o aviso.";
      toast.error(message);
    } finally {
      setSendingClaim(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#EAF6EC_0,#FBFAF6_38%,#F7F1E6_100%)] px-4 py-6 text-[#061F16]">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#064E2E] text-xl font-black text-white shadow-lg shadow-emerald-950/15">
              $
            </span>
            <span className="text-sm font-black tracking-[0.16em] text-[#052E1B]">
              CAIXA DOS AMIGOS
            </span>
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-[#BCD5C4] bg-white px-4 py-2 text-sm font-semibold text-[#064E2E] shadow-sm"
          >
            Gerente
          </Link>
        </header>

        <section className="rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-[0_24px_70px_rgba(5,46,27,0.12)] backdrop-blur md:p-8">
          <p className="inline-flex rounded-full bg-[#EAF6EC] px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#064E2E]">
            Consulta sem login
          </p>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-[#061F16] md:text-5xl">
            Consulte seu caixa pelo ID público
          </h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-[#475569]">
            Veja as informa??es b?sicas do caixa compartilhadas pelo gerente, sem criar conta e sem
            acessar dados privados.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
            <Input
              className="h-12 rounded-2xl border-[#BCD5C4] bg-white px-4 text-base font-semibold uppercase"
              placeholder="Ex: CXA-8F4K-29AB"
              value={publicId}
              onChange={(event) => setPublicId(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handleSearch();
                }
              }}
            />
            <Button className="h-12 rounded-2xl px-6" disabled={loading} onClick={() => void handleSearch()}>
              {loading ? "Consultando..." : "Consultar"}
            </Button>
          </div>
          {error ? <p className="mt-3 text-sm font-medium text-red-700">{error}</p> : null}
        </section>

        {caixa ? (
          <Card className="overflow-hidden rounded-[2rem] border-[#dbe7df] bg-white shadow-[0_24px_70px_rgba(5,46,27,0.10)]">
            <CardHeader className="space-y-3 bg-[#052E1B] text-white">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="text-2xl">{caixa.nome}</CardTitle>
                  <p className="mt-1 text-sm text-white/75">
                    {caixa.descricao || "Caixa compartilhado pelo gerente."}
                  </p>
                </div>
                <span className="rounded-full bg-[#F4B942] px-3 py-1 text-xs font-black text-[#052E1B]">
                  {caixa.publicId}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-5 md:p-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-3xl bg-[#EAF6EC] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2F7258]">
                    Valor mensal
                  </p>
                  <p className="mt-2 text-2xl font-black text-[#052E1B]">
                    R$ {caixa.valorMensal.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-3xl bg-[#fff7df] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B6A11]">
                    Mês atual
                  </p>
                  <p className="mt-2 text-2xl font-black text-[#052E1B]">
                    {caixa.mesAtual}/{caixa.totalMeses}
                  </p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    Participantes
                  </p>
                  <p className="mt-2 text-2xl font-black text-[#052E1B]">
                    {caixa.membrosAtivos}
                  </p>
                </div>
              </div>

              <div className="rounded-3xl border border-[#dbe7df] p-4">
                <p className="text-sm font-semibold text-[#052E1B]">Gerente</p>
                <p className="mt-1 text-sm text-[#475569]">{caixa.gerenteNome}</p>
                <p className="mt-4 text-sm font-semibold text-[#052E1B]">Quem recebe neste mês</p>
                <p className="mt-1 text-sm text-[#475569]">
                  {caixa.recebedorAtualNome ?? "Rod?zio ainda não definido pelo gerente."}
                </p>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-black text-[#061F16]">Membros</h2>
                  <span className="text-xs font-semibold text-[#475569]">sem e-mails públicos</span>
                </div>
                <div className="space-y-2">
                  {caixa.membros.length > 0 ? (
                    caixa.membros.map((membro) => (
                      <div
                        key={`${membro.nome}-${membro.ordemSorteio ?? "sem-ordem"}`}
                        className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                      >
                        <div>
                          <p className="font-semibold text-[#061F16]">{membro.nome}</p>
                          <p className="text-xs text-[#475569]">
                            {membro.mesRecebimento
                              ? `Recebe no mês ${membro.mesRecebimento}`
                              : "Ordem ainda não definida"}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${paymentStatusClass(membro.pagamentoStatus)}`}
                        >
                          {paymentStatusLabel(membro.pagamentoStatus)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-2xl bg-slate-50 p-4 text-sm text-[#475569]">
                      O gerente ainda não cadastrou membros ativos neste caixa.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-3xl bg-[#F7F1E6] p-4">
                <p className="text-sm font-bold text-[#052E1B]">Avisar pagamento</p>
                <p className="mt-1 text-sm text-[#475569]">
                  Esta a??o não confirma pagamento automaticamente. Ela apenas prepara uma mensagem
                  para o gerente revisar.
                </p>
                <Input
                  className="mt-3 h-12 rounded-2xl border-[#BCD5C4] bg-white"
                  placeholder="Seu nome"
                  value={participantName}
                  onChange={(event) => setParticipantName(event.target.value)}
                />
                <Input
                  className="mt-3 h-12 rounded-2xl border-[#BCD5C4] bg-white"
                  placeholder="Telefone opcional"
                  value={participantPhone}
                  onChange={(event) => setParticipantPhone(event.target.value)}
                />
                <Input
                  className="mt-3 h-12 rounded-2xl border-[#BCD5C4] bg-white"
                  placeholder="Mensagem opcional"
                  value={participantMessage}
                  onChange={(event) => setParticipantMessage(event.target.value)}
                />
                <Button
                  className="mt-3 h-12 w-full rounded-2xl bg-[#064E2E] text-white hover:bg-[#052E1B]"
                  disabled={sendingClaim}
                  onClick={handlePaymentClaim}
                >
                  {sendingClaim ? "Enviando aviso..." : "Avisar que paguei"}
                </Button>
                <Button
                  className="mt-2 h-12 w-full rounded-2xl border border-[#BCD5C4] bg-white text-[#064E2E] hover:bg-[#EAF6EC]"
                  onClick={handlePaymentNotice}
                >
                  Abrir mensagem no WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
