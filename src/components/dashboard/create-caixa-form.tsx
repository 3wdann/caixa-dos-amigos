"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { createCaixa, restoreCaixaFromBackup } from "@/lib/firestore";
import type { CaixaBackupPayload, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  createCaixaSchema,
  type CreateCaixaFormInput,
  type CreateCaixaFormValues,
} from "@/lib/validators";

function buildSuggestion(valorMensal: number, totalMeses: number) {
  if (!valorMensal || !totalMeses) {
    return "Defina o valor mensal e a quantidade de membros para ver o total por ponto.";
  }

  const total = valorMensal * totalMeses;

  if (total % 100 === 0) {
    return `Total por ponto: R$ ${total.toFixed(2)}. Valor redondo confirmado.`;
  }

  const nextRounded = Math.ceil(total / 100) * 100;
  const requiredMembers = Math.ceil(nextRounded / valorMensal);
  const roundedContribution = Math.floor(nextRounded / totalMeses);

  return `Total por ponto: R$ ${total.toFixed(
    2,
  )}. Sugestao: ${requiredMembers} membros para chegar em R$ ${nextRounded.toFixed(
    2,
  )} ou R$ ${roundedContribution.toFixed(2)} por membro.`;
}

export function CreateCaixaForm({
  profile,
  userId,
  onSuccess,
  mode = "novo",
  title,
  description,
  showBackupRestore = true,
}: {
  profile: UserProfile;
  userId: string;
  onSuccess?: () => void;
  mode?: "novo" | "andamento";
  title?: string;
  description?: string;
  showBackupRestore?: boolean;
}) {
  const [backupJson, setBackupJson] = useState("");
  const [restoringBackup, setRestoringBackup] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateCaixaFormValues, unknown, CreateCaixaFormInput>({
    resolver: zodResolver(createCaixaSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      valorMensal: "" as unknown as number,
      totalMeses: "" as unknown as number,
      dataInicio: new Date().toISOString().slice(0, 10),
      modoCriacao: mode,
      mesAtual: mode === "andamento" ? 2 : 1,
    },
  });

  const valorMensal = watch("valorMensal");
  const totalMeses = watch("totalMeses");
  const modoCriacao = watch("modoCriacao");
  const mesAtual = watch("mesAtual");
  const totalPorMes = Number(valorMensal || 0) * Number(totalMeses || 0);
  const resolvedTitle = title ?? (mode === "andamento" ? "Continuar caixa ja existente" : "Criar novo caixa");
  const resolvedDescription =
    description ??
    (mode === "andamento"
      ? "Cadastre aqui um caixa que ja esta rodando fora do app para continuar o acompanhamento sem recomecar do zero."
      : "Defina nome, valor mensal, quantidade de membros e a data de inicio para abrir um novo grupo.");
  const suggestion = useMemo(
    () => buildSuggestion(Number(valorMensal || 0), Number(totalMeses || 0)),
    [totalMeses, valorMensal],
  );

  useEffect(() => {
    setValue("modoCriacao", mode, { shouldDirty: false, shouldValidate: true });

    if (modoCriacao === "novo" && mesAtual !== 1) {
      setValue("mesAtual", 1, { shouldDirty: true, shouldValidate: true });
    }
  }, [mesAtual, mode, modoCriacao, setValue]);

  async function onSubmit(values: CreateCaixaFormInput) {
    try {
      const createdCaixa = await createCaixa(values, profile, userId);
      toast.success(
        values.modoCriacao === "andamento"
          ? "Caixa em andamento cadastrado com sucesso!"
          : "Caixa criado com sucesso!",
      );
      window.dispatchEvent(
        new CustomEvent("caixa-created", {
          detail: createdCaixa,
        }),
      );
      onSuccess?.();
      reset({
        nome: "",
        descricao: "",
        valorMensal: "" as unknown as number,
        totalMeses: "" as unknown as number,
        dataInicio: values.dataInicio,
        modoCriacao: mode,
        mesAtual: mode === "andamento" ? values.mesAtual : 1,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel criar o caixa.";
      toast.error(message);
    }
  }

  async function handleRestoreBackup() {
    if (!backupJson.trim()) {
      toast.error("Cole o JSON do backup antes de restaurar.");
      return;
    }

    try {
      setRestoringBackup(true);
      const parsed = JSON.parse(backupJson) as CaixaBackupPayload;
      const restoredCaixaId = await restoreCaixaFromBackup(parsed, profile, userId);
      toast.success("Backup restaurado com sucesso.");
      setBackupJson("");
      window.location.assign(`/painel/caixas/${restoredCaixaId}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel restaurar o backup.";
      toast.error(message);
    } finally {
      setRestoringBackup(false);
    }
  }

  function handleBackupFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setBackupJson(String(reader.result ?? ""));
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-[#13231C] dark:text-white">{resolvedTitle}</h2>
        <p className="text-sm text-[#657469] dark:text-slate-300">
          {resolvedDescription}
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-2">
          <Label htmlFor="nome">Nome do caixa</Label>
          <input
            id="nome"
            placeholder="Ex: Caixa dos Amigos"
            aria-describedby={errors.nome ? "caixa-nome-error" : "caixa-nome-help"}
            aria-invalid={errors.nome ? "true" : "false"}
            className="flex h-12 w-full rounded-[1.2rem] border border-[#dbe7df] bg-white px-4 py-2 text-sm text-[#13231C] shadow-sm transition-colors placeholder:text-[#8a988f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F7258]"
            {...register("nome")}
          />
          <p id="caixa-nome-help" className="text-xs text-[#657469] dark:text-slate-400">
            Nome que identifica esse grupo no painel.
          </p>
          {errors.nome ? (
            <p id="caixa-nome-error" className="text-sm text-red-600">
              {errors.nome.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="descricao">Descricao</Label>
          <input
            id="descricao"
            placeholder="Breve resumo do grupo"
            aria-describedby={errors.descricao ? "caixa-descricao-error" : "caixa-descricao-help"}
            aria-invalid={errors.descricao ? "true" : "false"}
            className="flex h-12 w-full rounded-[1.2rem] border border-[#dbe7df] bg-white px-4 py-2 text-sm text-[#13231C] shadow-sm transition-colors placeholder:text-[#8a988f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F7258]"
            {...register("descricao")}
          />
          <p id="caixa-descricao-help" className="text-xs text-[#657469] dark:text-slate-400">
            Resumo opcional para contextualizar o grupo.
          </p>
          {errors.descricao ? (
            <p id="caixa-descricao-error" className="text-sm text-red-600">
              {errors.descricao.message}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="valorMensal">Valor mensal por membro</Label>
            <input
              id="valorMensal"
              type="number"
              min="1"
              step="0.01"
              placeholder="Digite o valor"
              aria-describedby={errors.valorMensal ? "caixa-valor-error" : "caixa-valor-help"}
              aria-invalid={errors.valorMensal ? "true" : "false"}
              className="flex h-12 w-full rounded-[1.2rem] border border-[#dbe7df] bg-white px-4 py-2 text-sm text-[#13231C] shadow-sm transition-colors placeholder:text-[#8a988f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F7258]"
              {...register("valorMensal")}
            />
            <p id="caixa-valor-help" className="text-xs text-[#657469] dark:text-slate-400">
              Valor que cada membro paga em cada mes.
            </p>
            {errors.valorMensal ? (
              <p id="caixa-valor-error" className="text-sm text-red-600">
                {errors.valorMensal.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalMeses">Total de membros / meses</Label>
            <input
              id="totalMeses"
              type="number"
              min="2"
              placeholder="Digite a quantidade"
              aria-describedby={errors.totalMeses ? "caixa-total-error" : "caixa-total-help"}
              aria-invalid={errors.totalMeses ? "true" : "false"}
              className="flex h-12 w-full rounded-[1.2rem] border border-[#dbe7df] bg-white px-4 py-2 text-sm text-[#13231C] shadow-sm transition-colors placeholder:text-[#8a988f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F7258]"
              {...register("totalMeses")}
            />
            <p id="caixa-total-help" className="text-xs text-[#657469] dark:text-slate-400">
              Esse numero define a quantidade de membros e de meses do caixa.
            </p>
            {errors.totalMeses ? (
              <p id="caixa-total-error" className="text-sm text-red-600">
                {errors.totalMeses.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dataInicio">Data de inicio</Label>
            <input
              id="dataInicio"
              type="date"
              aria-describedby={errors.dataInicio ? "caixa-data-error" : "caixa-data-help"}
              aria-invalid={errors.dataInicio ? "true" : "false"}
              className="flex h-12 w-full rounded-[1.2rem] border border-[#dbe7df] bg-white px-4 py-2 text-sm text-[#13231C] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F7258]"
              {...register("dataInicio")}
            />
            <p id="caixa-data-help" className="text-xs text-[#657469] dark:text-slate-400">
              Data usada como referencia para o inicio do ciclo do caixa.
            </p>
            {errors.dataInicio ? (
              <p id="caixa-data-error" className="text-sm text-red-600">
                {errors.dataInicio.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mesAtual">Mes atual do caixa</Label>
            <input
              id="mesAtual"
              type="number"
              min="1"
              max={Number(totalMeses || 50)}
              disabled={modoCriacao === "novo"}
              aria-describedby={errors.mesAtual ? "caixa-mes-error" : "caixa-mes-help"}
              aria-invalid={errors.mesAtual ? "true" : "false"}
              className="flex h-12 w-full rounded-[1.2rem] border border-[#dbe7df] bg-white px-4 py-2 text-sm text-[#13231C] shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F7258]"
              {...register("mesAtual")}
            />
            <p id="caixa-mes-help" className="text-xs text-[#657469] dark:text-slate-400">
              {modoCriacao === "novo"
                ? "Para um caixa novo, o ciclo sempre comeca no mes 1."
                : "Informe em qual mes o grupo esta hoje para continuar o acompanhamento por aqui."}
            </p>
            {errors.mesAtual ? (
              <p id="caixa-mes-error" className="text-sm text-red-600">
                {errors.mesAtual.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-[#cfe4d5] bg-[#E2F3E7] px-4 py-3 text-sm text-[#214F3F] dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100">
          <p className="font-medium">Total por ponto: R$ {totalPorMes.toFixed(2)}</p>
          <p className="mt-1 text-[#2F7258] dark:text-emerald-200">{suggestion}</p>
        </div>

        {modoCriacao === "andamento" ? (
          <div className="rounded-[1.5rem] border border-[#ecd69f] bg-[#fff8e7] px-4 py-3 text-sm text-[#8B6A11] dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-100">
            Depois de cadastrar, voce pode convidar os membros que faltam, ajustar pagamentos deste mes
            e continuar o caixa sem recomecar o historico manualmente.
          </div>
        ) : null}

        <button
          type="submit"
          className="h-12 w-full rounded-full bg-[#214F3F] text-white shadow-[0_16px_34px_rgba(33,79,63,0.18)] hover:bg-[#183b2f] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? modoCriacao === "andamento"
              ? "Registrando caixa..."
              : "Criando caixa..."
            : modoCriacao === "andamento"
              ? "Continuar caixa em andamento"
              : "Criar caixa"}
        </button>
      </form>

      {showBackupRestore ? (
        <details className="rounded-[1.7rem] border border-dashed border-[#dbe7df] bg-[#f9fbf9] p-4 dark:border-white/10">
          <summary className="cursor-pointer list-none text-sm font-medium text-[#13231C] dark:text-white">
            Restaurar caixa por JSON
          </summary>
          <p className="mt-2 text-sm text-[#657469] dark:text-slate-300">
            Use um backup exportado de outro caixa para recriar tudo com historico, membros, pagamentos e notas.
          </p>
          <div className="mt-3 space-y-3">
            <input
              type="file"
              accept="application/json,.json"
              className="block w-full text-sm text-[#657469] dark:text-slate-300"
              onChange={handleBackupFileUpload}
            />
            <textarea
              aria-label="JSON do backup"
              aria-describedby="backup-json-help"
              className="min-h-32 w-full rounded-[1.2rem] border border-[#dbe7df] bg-white px-4 py-3 text-sm text-[#13231C] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F7258]"
              placeholder="Cole aqui o JSON do backup"
              value={backupJson}
              onChange={(event) => setBackupJson(event.target.value)}
            />
            <p id="backup-json-help" className="text-xs text-[#657469] dark:text-slate-400">
              Voce pode colar o conteudo do arquivo ou selecionar um JSON exportado.
            </p>
            <button
              type="button"
              className={cn(
                "h-11 w-full rounded-full border border-[#BCD5C4] bg-white text-[#214F3F] hover:bg-[#f5f8f5]",
                "disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
              )}
              disabled={restoringBackup}
              onClick={handleRestoreBackup}
            >
              {restoringBackup ? "Restaurando backup..." : "Restaurar backup JSON"}
            </button>
          </div>
        </details>
      ) : null}
    </div>
  );
}
