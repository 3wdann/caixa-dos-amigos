"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { createCaixa, restoreCaixaFromBackup } from "@/lib/firestore";
import { cn } from "@/lib/utils";
import type { CaixaBackupPayload, UserProfile } from "@/lib/types";
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
}: {
  profile: UserProfile;
  userId: string;
  onSuccess?: () => void;
}) {
  const [backupJson, setBackupJson] = useState("");
  const [restoringBackup, setRestoringBackup] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCaixaFormValues, unknown, CreateCaixaFormInput>({
    resolver: zodResolver(createCaixaSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      valorMensal: "" as unknown as number,
      totalMeses: "" as unknown as number,
      dataInicio: new Date().toISOString().slice(0, 10),
    },
  });

  const valorMensal = watch("valorMensal");
  const totalMeses = watch("totalMeses");
  const totalPorMes = Number(valorMensal || 0) * Number(totalMeses || 0);
  const suggestion = useMemo(
    () => buildSuggestion(Number(valorMensal || 0), Number(totalMeses || 0)),
    [totalMeses, valorMensal],
  );

  async function onSubmit(values: CreateCaixaFormInput) {
    try {
      const createdCaixa = await createCaixa(values, profile, userId);
      toast.success("Caixa criado com sucesso!");
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
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Criar novo caixa</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Defina nome, valor mensal, quantidade de membros e a data de inicio.
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
              className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("nome")}
            />
            <p id="caixa-nome-help" className="text-xs text-slate-500 dark:text-slate-400">
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
              className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("descricao")}
            />
            <p id="caixa-descricao-help" className="text-xs text-slate-500 dark:text-slate-400">
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
                placeholder="200"
                aria-describedby={errors.valorMensal ? "caixa-valor-error" : "caixa-valor-help"}
                aria-invalid={errors.valorMensal ? "true" : "false"}
                className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register("valorMensal")}
              />
              <p id="caixa-valor-help" className="text-xs text-slate-500 dark:text-slate-400">
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
                placeholder="11"
                aria-describedby={errors.totalMeses ? "caixa-total-error" : "caixa-total-help"}
                aria-invalid={errors.totalMeses ? "true" : "false"}
                className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register("totalMeses")}
              />
              <p id="caixa-total-help" className="text-xs text-slate-500 dark:text-slate-400">
                Esse numero define a quantidade de membros e de meses do caixa.
              </p>
              {errors.totalMeses ? (
                <p id="caixa-total-error" className="text-sm text-red-600">
                  {errors.totalMeses.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataInicio">Data de inicio</Label>
            <input
              id="dataInicio"
              type="date"
              aria-describedby={errors.dataInicio ? "caixa-data-error" : "caixa-data-help"}
              aria-invalid={errors.dataInicio ? "true" : "false"}
              className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("dataInicio")}
            />
            <p id="caixa-data-help" className="text-xs text-slate-500 dark:text-slate-400">
              Data usada como referencia para o inicio do ciclo do caixa.
            </p>
            {errors.dataInicio ? (
              <p id="caixa-data-error" className="text-sm text-red-600">
                {errors.dataInicio.message}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100">
            <p className="font-medium">Total por ponto: R$ {totalPorMes.toFixed(2)}</p>
            <p className="mt-1 text-emerald-800 dark:text-emerald-200">{suggestion}</p>
          </div>

          <button
            type="submit"
            className="h-11 w-full rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Criando caixa..." : "Criar caixa"}
          </button>
        </form>

        <details className="rounded-3xl border border-dashed border-slate-300 p-4 dark:border-white/10">
          <summary className="cursor-pointer list-none text-sm font-medium text-slate-900 dark:text-white">
            Restaurar caixa por JSON
          </summary>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Use um backup exportado de outro caixa para recriar tudo com historico, membros, pagamentos e notas.
          </p>
          <div className="mt-3 space-y-3">
            <input
              type="file"
              accept="application/json,.json"
              className="block w-full text-sm text-slate-600 dark:text-slate-300"
              onChange={handleBackupFileUpload}
            />
            <textarea
              aria-label="JSON do backup"
              aria-describedby="backup-json-help"
              className="min-h-32 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Cole aqui o JSON do backup"
              value={backupJson}
              onChange={(event) => setBackupJson(event.target.value)}
            />
            <p id="backup-json-help" className="text-xs text-slate-500 dark:text-slate-400">
              Voce pode colar o conteudo do arquivo ou selecionar um JSON exportado.
            </p>
            <button
              type="button"
              className={cn(
                "h-11 w-full rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
                "disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
              )}
              disabled={restoringBackup}
              onClick={handleRestoreBackup}
            >
              {restoringBackup ? "Restaurando backup..." : "Restaurar backup JSON"}
            </button>
          </div>
        </details>
    </div>
  );
}
