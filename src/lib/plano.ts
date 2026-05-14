import type { Plano, UserProfile } from "@/lib/types";

export const FREE_ACTIVE_MANAGED_CAIXAS_LIMIT = 1;
export const PRO_ACTIVE_MANAGED_CAIXAS_LIMIT = null;

export const PLAN_FEATURES: Record<
  Plano,
  {
    label: string;
    headline: string;
    priceLabel: string;
    managedCaixasLabel: string;
    description: string;
    features: string[];
  }
> = {
  free: {
    label: "Free",
    headline: "Para testar com um caixa real",
    priceLabel: "R$ 0",
    managedCaixasLabel: `Até ${FREE_ACTIVE_MANAGED_CAIXAS_LIMIT} caixa ativo`,
    description: "Ideal para validar o app com um grupo pequeno antes de assinar.",
    features: [
      "1 caixa ativo como gerente",
      "Consulta pública por ID",
      "Membros e pagamentos",
      "Relatórios básicos",
      "Compartilhamento por WhatsApp",
    ],
  },
  pro: {
    label: "Pro",
    headline: "Para gerenciar vários grupos",
    priceLabel: "Em breve",
    managedCaixasLabel: "Caixas ativos ilimitados",
    description: "Plano preparado para gerentes que controlam mais de um caixa ao mesmo tempo.",
    features: [
      "Caixas ativos ilimitados",
      "Backup e restauração",
      "PDF e CSV",
      "Avisos de pagamento dos participantes",
      "Preparado para app Android",
    ],
  },
};

export function canCreateActiveCaixa(plano: Plano, caixasAtivos: number) {
  if (plano === "pro") {
    return { allowed: true, limit: PRO_ACTIVE_MANAGED_CAIXAS_LIMIT };
  }

  return {
    allowed: caixasAtivos < FREE_ACTIVE_MANAGED_CAIXAS_LIMIT,
    limit: FREE_ACTIVE_MANAGED_CAIXAS_LIMIT,
  };
}

export function getEffectivePlano(profile: UserProfile | null | undefined): Plano {
  if (!profile) {
    return "free";
  }

  if (profile.plano !== "pro") {
    return profile.plano;
  }

  const expiration = profile.planoExpiraEm?.toDate?.();

  if (expiration && expiration.getTime() < Date.now()) {
    return "free";
  }

  return "pro";
}

export function canJoinActiveCaixa() {
  return {
    allowed: true,
    limit: null,
  };
}

export function getPlanoLabel(plano: Plano) {
  return PLAN_FEATURES[plano].label;
}

export function getPlanoFeatures(plano: Plano) {
  return PLAN_FEATURES[plano];
}

export function getManagedCaixaUsageLabel(plano: Plano, activeManagedCaixas: number) {
  const limit = canCreateActiveCaixa(plano, activeManagedCaixas).limit;

  if (limit === null) {
    return `${activeManagedCaixas} ativos de ilimitados`;
  }

  return `${activeManagedCaixas}/${limit} ativo${limit === 1 ? "" : "s"} no Free`;
}
