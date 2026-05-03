"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { addMemberToCaixa } from "@/lib/firestore";
import { addMemberSchema, type AddMemberInput } from "@/lib/validators";

export function AddMemberForm({ caixaId }: { caixaId: string }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddMemberInput>({
    resolver: zodResolver(addMemberSchema),
  });

  async function onSubmit(values: AddMemberInput) {
    try {
      const result = await addMemberToCaixa(caixaId, values.email);

      if (result.status === "invited") {
        toast.success("Convite enviado com sucesso. A pessoa precisara aceitar para entrar no caixa.");
      }

      reset();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel adicionar o membro.";
      toast.error(message);
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-2">
        <Label htmlFor="membro-email">Adicionar membro por email</Label>
        <input
          id="membro-email"
          type="email"
          placeholder="amigo@exemplo.com"
          aria-describedby={errors.email ? "membro-email-error" : "membro-email-help"}
          aria-invalid={errors.email ? "true" : "false"}
          className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          {...register("email")}
        />
        <p id="membro-email-help" className="text-xs text-slate-500 dark:text-slate-400">
          O convite sera enviado para este email e a entrada so acontece apos o aceite.
        </p>
        {errors.email ? (
          <p id="membro-email-error" className="text-sm text-red-600">
            {errors.email.message}
          </p>
        ) : null}
      </div>
      <button
        type="submit"
        className="h-10 rounded-lg bg-slate-900 px-4 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Adicionando..." : "Adicionar membro"}
      </button>
    </form>
  );
}
