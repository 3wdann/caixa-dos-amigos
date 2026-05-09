"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getFirebaseAuthErrorMessage } from "@/lib/auth-errors";
import { appleProvider, auth, enableAppleAuth, googleProvider } from "@/lib/firebase";
import { ensureUserProfile } from "@/lib/firestore";
import { loginSchema, type LoginInput } from "@/lib/validators";

function getNextPath(next: string | null) {
  if (!next || !next.startsWith("/")) {
    return "/painel";
  }

  return next;
}

export function LoginForm() {
  const params = useSearchParams();
  const next = getNextPath(params.get("next"));
  const [pendingGoogle, setPendingGoogle] = useState(false);
  const [pendingApple, setPendingApple] = useState(false);
  const [pendingReset, setPendingReset] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginInput) {
    try {
      const credentials = await signInWithEmailAndPassword(auth, values.email, values.senha);
      await ensureUserProfile(credentials.user);
      toast.success(`Bem-vindo de volta, ${credentials.user.displayName ?? "amigo"}!`);
      window.location.assign(next);
    } catch (error) {
      toast.error(
        getFirebaseAuthErrorMessage(error, "Nao foi possivel entrar. Tente novamente."),
      );
    }
  }

  async function handleGoogleSignIn() {
    try {
      setPendingGoogle(true);
      googleProvider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, googleProvider);
      await ensureUserProfile(result.user, result.user.displayName ?? undefined);
      toast.success(`Bem-vindo, ${result.user.displayName ?? "amigo"}!`);
      window.location.assign(next);
    } catch (error) {
      toast.error(getFirebaseAuthErrorMessage(error, "Nao foi possivel entrar com Google."));
    } finally {
      setPendingGoogle(false);
    }
  }

  async function handleAppleSignIn() {
    try {
      setPendingApple(true);
      appleProvider.setCustomParameters({ locale: "pt_BR" });
      const result = await signInWithPopup(auth, appleProvider);
      await ensureUserProfile(result.user, result.user.displayName ?? undefined);
      toast.success(`Bem-vindo, ${result.user.displayName ?? "amigo"}!`);
      window.location.assign(next);
    } catch (error) {
      toast.error(getFirebaseAuthErrorMessage(error, "Nao foi possivel entrar com Apple."));
    } finally {
      setPendingApple(false);
    }
  }

  async function handleResetPassword() {
    const email = getValues("email")?.trim();

    if (!email) {
      toast.error("Digite seu email para receber o link de recuperacao de senha.");
      return;
    }

    try {
      setPendingReset(true);
      await sendPasswordResetEmail(auth, email);
      toast.success("Enviamos um link de recuperacao para o seu email.");
    } catch (error) {
      toast.error(
        getFirebaseAuthErrorMessage(
          error,
          "Nao foi possivel enviar o email de recuperacao. Tente novamente.",
        ),
      );
    } finally {
      setPendingReset(false);
    }
  }

  return (
    <Card className="brand-card rounded-[1.9rem]">
      <CardHeader className="space-y-2">
        <CardTitle className="text-3xl text-[#13231C] dark:text-white">Entrar</CardTitle>
        <CardDescription className="text-sm text-[#657469] dark:text-slate-300">
          Acesse seus caixas com email e senha ou continue com Google.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <input
              id="email"
              type="email"
              placeholder="voce@exemplo.com"
              aria-describedby={errors.email ? "login-email-error" : "login-email-help"}
              aria-invalid={errors.email ? "true" : "false"}
              className="flex h-12 w-full rounded-[1.2rem] border border-[#dbe7df] bg-white px-4 py-2 text-sm text-[#13231C] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] transition-colors placeholder:text-[#8a978f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F7258]/20 dark:border-white/10 dark:bg-[rgba(15,23,42,0.82)] dark:text-slate-100 dark:placeholder:text-slate-500"
              {...register("email")}
            />
            <p id="login-email-help" className="text-xs text-slate-500 dark:text-slate-400">
              Use o mesmo email cadastrado no app.
            </p>
            {errors.email ? (
              <p id="login-email-error" className="text-sm text-red-600">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <input
              id="senha"
              type="password"
              placeholder="******"
              aria-describedby={errors.senha ? "login-senha-error" : "login-senha-help"}
              aria-invalid={errors.senha ? "true" : "false"}
              className="flex h-12 w-full rounded-[1.2rem] border border-[#dbe7df] bg-white px-4 py-2 text-sm text-[#13231C] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] transition-colors placeholder:text-[#8a978f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F7258]/20 dark:border-white/10 dark:bg-[rgba(15,23,42,0.82)] dark:text-slate-100 dark:placeholder:text-slate-500"
              {...register("senha")}
            />
            <p id="login-senha-help" className="text-xs text-slate-500 dark:text-slate-400">
              A senha deve ter pelo menos 6 caracteres.
            </p>
            {errors.senha ? (
              <p id="login-senha-error" className="text-sm text-red-600">
                {errors.senha.message}
              </p>
            ) : null}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              className="text-sm font-medium text-emerald-700 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-300 dark:hover:text-emerald-200"
              onClick={handleResetPassword}
              disabled={pendingReset}
            >
              {pendingReset ? "Enviando link..." : "Esqueci minha senha"}
            </button>
          </div>

          <button
            type="submit"
            className="h-12 w-full rounded-full bg-primary text-primary-foreground shadow-[0_18px_40px_rgba(24,31,60,0.22)] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <button
          type="button"
          className="h-12 w-full rounded-full border border-white/70 bg-white/75 text-sm font-medium text-slate-700 shadow-[0_12px_28px_rgba(91,102,131,0.08)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-[rgba(15,23,42,0.72)] dark:text-slate-100 dark:hover:bg-white/8"
          onClick={handleGoogleSignIn}
          disabled={pendingGoogle}
        >
          {pendingGoogle ? "Conectando..." : "Continuar com Google"}
        </button>

        {enableAppleAuth ? (
          <button
            type="button"
            className="h-11 w-full rounded-lg border border-slate-200 bg-black text-sm font-medium text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleAppleSignIn}
            disabled={pendingApple}
          >
            {pendingApple ? "Conectando..." : "Continuar com Apple"}
          </button>
        ) : null}

        <p className="text-center text-sm text-slate-600 dark:text-slate-300" aria-live="polite">
          Ainda nao tem conta?{" "}
          <Link
            className="font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
            href={next === "/painel" ? "/cadastro" : `/cadastro?next=${encodeURIComponent(next)}`}
          >
            Criar cadastro
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
