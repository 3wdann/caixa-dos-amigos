import type { Plano } from "@/lib/types";

export const FREE_ACTIVE_CAIXAS_LIMIT = 1;

export function canCreateActiveCaixa(plano: Plano, caixasAtivos: number) {
  if (plano === "pro") {
    return { allowed: true, limit: null };
  }

  return {
    allowed: caixasAtivos < FREE_ACTIVE_CAIXAS_LIMIT,
    limit: FREE_ACTIVE_CAIXAS_LIMIT,
  };
}

export function getPlanoLabel(plano: Plano) {
  return plano === "pro" ? "Pro" : "Free";
}
