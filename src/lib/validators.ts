import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Informe um email valido."),
  senha: z.string().min(6, "A senha deve ter no minimo 6 caracteres."),
});

export const registerSchema = loginSchema.extend({
  nome: z.string().min(3, "Informe seu nome completo.").max(80, "Use ate 80 caracteres."),
});

export const createCaixaSchema = z
  .object({
    nome: z.string().min(3, "De um nome para o caixa.").max(80),
    descricao: z.string().max(200),
    valorMensal: z.coerce.number().positive("Informe um valor mensal maior que zero."),
    totalMeses: z.coerce
      .number()
      .int("Informe um numero inteiro de meses.")
      .min(2, "O caixa precisa ter ao menos 2 membros.")
      .max(50, "Use ate 50 membros nesta fase inicial."),
    dataInicio: z.string().min(1, "Escolha a data de inicio."),
    modoCriacao: z.enum(["novo", "andamento"]),
    mesAtual: z.coerce
      .number()
      .int("Informe um mes inteiro.")
      .min(1, "O mes atual deve ser pelo menos 1."),
  })
  .superRefine((values, ctx) => {
    if (values.mesAtual > values.totalMeses) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mesAtual"],
        message: "O mes atual nao pode ser maior que o total de membros / meses.",
      });
    }

    if (values.modoCriacao === "novo" && values.mesAtual !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mesAtual"],
        message: "Para um caixa novo, o mes atual precisa comecar em 1.",
      });
    }
  });

export const addMemberSchema = z.object({
  email: z.string().email("Informe um email valido."),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateCaixaFormValues = z.input<typeof createCaixaSchema>;
export type CreateCaixaFormInput = z.output<typeof createCaixaSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
