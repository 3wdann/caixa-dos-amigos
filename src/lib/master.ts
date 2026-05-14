import type { UserProfile } from "@/lib/types";

export const MASTER_EMAIL = "dancos3@gmail.com";

export function isRootMasterEmail(email?: string | null) {
  return email?.trim().toLowerCase() === MASTER_EMAIL;
}

export function isMasterProfile(profile?: UserProfile | null) {
  return Boolean(profile && (profile.papel === "master" || isRootMasterEmail(profile.email)));
}

export function getProExpirationDate(days: number) {
  const safeDays = Number.isFinite(days) ? Math.max(1, Math.floor(days)) : 30;
  const date = new Date();
  date.setDate(date.getDate() + safeDays);
  return date;
}
