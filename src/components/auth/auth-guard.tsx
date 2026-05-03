"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/components/providers/app-providers";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.12),_transparent_38%),linear-gradient(180deg,#fffdf8_0%,#f5efe5_100%)] px-6 dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_24%),linear-gradient(180deg,#081311_0%,#111827_100%)]">
      <div className="rounded-3xl border border-white/70 bg-white/80 px-6 py-5 text-sm text-slate-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200">
        Carregando seu caixa...
      </div>
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, pathname, router, user]);

  if (loading || !user) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}

export function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/painel");
    }
  }, [loading, router, user]);

  if (loading) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
