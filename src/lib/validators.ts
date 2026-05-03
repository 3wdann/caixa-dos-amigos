import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Informe um email válido."),
  senha: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
});

export const registerSchema = loginSchema.extend({
  nome: z.string().min(3, "Informe seu nome completo.").max(80, "Use até 80 caracteres."),
});

export const createCaixaSchema = z.object({
  nome: z.string().min(3, "Dê um nome para o caixa.").max(80),
  descricao: z.string().max(200),
  valorMensal: z.coerce.number().positive("Informe um valor mensal maior que zero."),
  totalMeses: z.coerce
    .number()
    .int("Informe um número inteiro de meses.")
    .min(2, "O caixa precisa ter ao menos 2 membros.")
    .max(50, "Use até 50 membros nesta fase inicial."),
  dataInicio: z.string().min(1, "Escolha a data de início."),
});

export const addMemberSchema = z.object({
  email: z.string().email("Informe um email válido."),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateCaixaFormValues = z.input<typeof createCaixaSchema>;
export type CreateCaixaFormInput = z.output<typeof createCaixaSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
