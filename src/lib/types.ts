import type { Timestamp } from "firebase/firestore";

export type Plano = "free" | "pro";
export type CaixaStatus = "ativo" | "encerrado" | "pausado";
export type CaixaOrigem = "novo" | "importado";
export type MembroStatus = "ativo" | "removido";
export type PagamentoStatus = "pendente" | "confirmado" | "rejeitado";
export type TipoChavePix = "cpf" | "email" | "telefone" | "aleatoria" | null;
export type MedalhaPontualidade = "ouro" | "prata" | "bronze" | null;

export interface UserProfile {
  uid: string;
  nome: string;
  email: string;
  fotoUrl: string | null;
  cor: string;
  plano: Plano;
  chavePix: string | null;
  tipoChavePix: TipoChavePix;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface UserLookup {
  uid: string;
  nome: string;
  email: string;
  fotoUrl: string | null;
  cor: string;
  updatedAt: Timestamp | null;
}

export interface Caixa {
  id: string;
  nome: string;
  descricao: string;
  gerenteId: string;
  gerenteEmail?: string;
  valorMensal: number;
  totalPorMes: number;
  totalMeses: number;
  mesAtual: number;
  status: CaixaStatus;
  origem: CaixaOrigem;
  dataInicio: Timestamp | null;
  linkConvite: string;
  linkExpiraEm: Timestamp | null;
  rankingAtivo: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface CaixaMembro {
  userId: string;
  email?: string;
  nome: string;
  fotoUrl: string | null;
  cor: string;
  ordemSorteio: number | null;
  mesRecebimento: number | null;
  entradaEm: Timestamp | null;
  status: MembroStatus;
  substituidoPor: string | null;
}

export interface CaixaNota {
  id: string;
  mes: number;
  texto: string;
  criadoPor: string;
  criadoEm: Timestamp | null;
}

export interface CaixaPagamento {
  id: string;
  membroId: string;
  mes: number;
  valor: number;
  status: PagamentoStatus;
  declaradoEm: Timestamp | null;
  confirmadoEm: Timestamp | null;
  confirmadoPor: string | null;
  motivoRejeicao?: string | null;
  comprovante: string | null;
  fonte: "app" | "importacao_manual";
  pontuacaoPontualidade: MedalhaPontualidade;
}

export interface Convite {
  token: string;
  caixaId: string;
  criadoPor: string;
  convidadoUserId?: string | null;
  emailDestino?: string | null;
  caixaNome?: string;
  gerenteNome?: string;
  valorMensal?: number;
  totalPorMes?: number;
  totalMeses?: number;
  mesAtual?: number;
  membrosConfirmados?: number;
  membrosPreview?: Array<{
    cor: string;
    iniciais: string;
  }>;
  usoUnico: boolean;
  usosRestantes: number | null;
  expiraEm: Timestamp | null;
  status: "ativo" | "aceito" | "expirado" | "revogado";
  createdAt: Timestamp | null;
}

export interface CaixaResumo extends Caixa {
  membrosAtivos: number;
  meuStatusNoMes?: PagamentoStatus | "nao_iniciado";
}

export interface CreateCaixaInput {
  nome: string;
  descricao: string;
  valorMensal: number;
  totalMeses: number;
  dataInicio: string;
  modoCriacao: "novo" | "andamento";
  mesAtual: number;
}

export interface CaixaBackupPayload {
  version: 1;
  exportedAt: string;
  sourceCaixaId: string;
  caixa: {
    nome: string;
    descricao: string;
    gerenteId: string;
    gerenteEmail?: string;
    valorMensal: number;
    totalPorMes: number;
    totalMeses: number;
    mesAtual: number;
    status: CaixaStatus;
    origem: CaixaOrigem;
    dataInicio: string | null;
    linkExpiraEm: string | null;
    rankingAtivo: boolean;
  };
  membros: Array<{
    userId: string;
    email?: string;
    nome: string;
    fotoUrl: string | null;
    cor: string;
    ordemSorteio: number | null;
    mesRecebimento: number | null;
    entradaEm: string | null;
    status: MembroStatus;
    substituidoPor: string | null;
  }>;
  pagamentos: Array<{
    id: string;
    membroId: string;
    mes: number;
    valor: number;
    status: PagamentoStatus;
    declaradoEm: string | null;
    confirmadoEm: string | null;
    confirmadoPor: string | null;
    motivoRejeicao?: string | null;
    comprovante: string | null;
    fonte: "app" | "importacao_manual";
    pontuacaoPontualidade: MedalhaPontualidade;
  }>;
  notas: Array<{
    id: string;
    mes: number;
    texto: string;
    criadoPor: string;
    criadoEm: string | null;
  }>;
}
