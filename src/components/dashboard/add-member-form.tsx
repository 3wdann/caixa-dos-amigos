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
        toast.success("Membro registrado para este caixa. O gerente pode acompanhar o status por aqui.");
      }

      reset();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Nao foi possivel adicionar o membro.";
      toast.error(message);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-2">
        <Label htmlFor="membro-email">Cadastrar membro por email</Label>
        <input
          id="membro-email"
          type="email"
          placeholder="amigo@exemplo.com"
          aria-describedby={errors.email ? "membro-email-error" : "membro-email-help"}
          aria-invalid={errors.email ? "true" : "false"}
          className="flex h-12 w-full rounded-[1.2rem] border border-[#dbe7df] bg-white px-4 py-2 text-sm text-[#13231C] shadow-sm transition-colors placeholder:text-[#8a988f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F7258]"
          {...register("email")}
        />
        <p id="membro-email-help" className="text-xs text-[#657469] dark:text-slate-400">
          Use o email como identificador do participante. Nesta V2, o gerente continua controlando
          o caixa pelo painel.
        </p>
        {errors.email ? (
          <p id="membro-email-error" className="text-sm text-red-600">
            {errors.email.message}
          </p>
        ) : null}
      </div>
      <button
        type="submit"
        className="h-11 rounded-full bg-[#214F3F] px-5 text-white shadow-[0_14px_32px_rgba(33,79,63,0.18)] transition hover:bg-[#183b2f] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Cadastrando..." : "Cadastrar membro"}
      </button>
    </form>
  );
}
