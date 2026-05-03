"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserWithEmailAndPassword, signInWithPopup, updateProfile } from "firebase/auth";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getFirebaseAuthErrorMessage } from "@/lib/auth-errors";
import { appleProvider, auth, enableAppleAuth, googleProvider } from "@/lib/firebase";
import { acceptInvite, ensureUserProfile } from "@/lib/firestore";
import { registerSchema, type RegisterInput } from "@/lib/validators";

export function RegisterForm() {
  const params = useSearchParams();
  const next = params.get("next");
  const [success, setSuccess] = useState(false);
  const [pendingGoogle, setPendingGoogle] = useState(false);
  const [pendingApple, setPendingApple] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  function getInviteTokenFromNextPath() {
    if (!next || !next.startsWith("/entrar?")) {
      return null;
    }

    const query = next.split("?")[1] ?? "";
    const parsed = new URLSearchParams(query);
    return parsed.get("convite");
  }

  async function onSubmit(values: RegisterInput) {
    try {
      const credentials = await createUserWithEmailAndPassword(auth, values.email, values.senha);
      await updateProfile(credentials.user, { displayName: values.nome });
      await ensureUserProfile(credentials.user, values.nome);
      const inviteToken = getInviteTokenFromNextPath();

      if (inviteToken) {
        const profile = {
          uid: credentials.user.uid,
          nome: values.nome,
          email: values.email.trim().toLowerCase(),
          fotoUrl: credentials.user.photoURL,
          cor: "",
          plano: "free" as const,
          chavePix: null,
          tipoChavePix: null,
          createdAt: null,
          updatedAt: null,
        };

        await acceptInvite(inviteToken, credentials.user, profile);
      }

      setSuccess(true);
      toast.success("Conta criada com sucesso!");
      window.location.assign(next || "/painel");
    } catch (error) {
      toast.error(getFirebaseAuthErrorMessage(error, "Nao foi possivel criar sua conta."));
    }
  }

  async function handleGoogleSignUp() {
    try {
      setPendingGoogle(true);
      googleProvider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, googleProvider);
      await ensureUserProfile(result.user, result.user.displayName ?? undefined);
      const inviteToken = getInviteTokenFromNextPath();

      if (inviteToken) {
        await acceptInvite(inviteToken, result.user, {
          uid: result.user.uid,
          nome: result.user.displayName ?? "Usuario",
          email: result.user.email?.trim().toLowerCase() ?? "",
          fotoUrl: result.user.photoURL,
          cor: "",
          plano: "free",
          chavePix: null,
          tipoChavePix: null,
          createdAt: null,
          updatedAt: null,
        });
      }

      toast.success(`Conta criada com Google para ${result.user.displayName ?? "voce"}!`);
      window.location.assign(next || "/painel");
    } catch (error) {
      toast.error(
        getFirebaseAuthErrorMessage(error, "Nao foi possivel criar sua conta com Google."),
      );
    } finally {
      setPendingGoogle(false);
    }
  }

  async function handleAppleSignUp() {
    try {
      setPendingApple(true);
      appleProvider.setCustomParameters({ locale: "pt_BR" });
      const result = await signInWithPopup(auth, appleProvider);
      await ensureUserProfile(result.user, result.user.displayName ?? undefined);
      const inviteToken = getInviteTokenFromNextPath();

      if (inviteToken) {
        await acceptInvite(inviteToken, result.user, {
          uid: result.user.uid,
          nome: result.user.displayName ?? "Usuario",
          email: result.user.email?.trim().toLowerCase() ?? "",
          fotoUrl: result.user.photoURL,
          cor: "",
          plano: "free",
          chavePix: null,
          tipoChavePix: null,
          createdAt: null,
          updatedAt: null,
        });
      }

      toast.success(`Conta criada com Apple para ${result.user.displayName ?? "voce"}!`);
      window.location.assign(next || "/painel");
    } catch (error) {
      toast.error(
        getFirebaseAuthErrorMessage(error, "Nao foi possivel criar sua conta com Apple."),
      );
    } finally {
      setPendingApple(false);
    }
  }

  return (
    <Card className="border-0 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur dark:bg-slate-950/80 dark:shadow-[0_24px_80px_rgba(2,6,23,0.45)]">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl text-slate-900 dark:text-white">Criar conta</CardTitle>
        <CardDescription className="text-sm text-slate-600 dark:text-slate-300">
          Monte seu acesso agora e entre no seu primeiro caixa em poucos minutos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <input
              id="nome"
              placeholder="Seu nome completo"
              aria-describedby={errors.nome ? "register-nome-error" : "register-nome-help"}
              aria-invalid={errors.nome ? "true" : "false"}
              className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("nome")}
            />
            <p id="register-nome-help" className="text-xs text-slate-500 dark:text-slate-400">
              Nome que aparecera para gerente e membros do caixa.
            </p>
            {errors.nome ? (
              <p id="register-nome-error" className="text-sm text-red-600">
                {errors.nome.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <input
              id="email"
              type="email"
              placeholder="voce@exemplo.com"
              aria-describedby={errors.email ? "register-email-error" : "register-email-help"}
              aria-invalid={errors.email ? "true" : "false"}
              className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("email")}
            />
            <p id="register-email-help" className="text-xs text-slate-500 dark:text-slate-400">
              Esse email sera usado para login, convites e recuperacao de senha.
            </p>
            {errors.email ? (
              <p id="register-email-error" className="text-sm text-red-600">
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
              aria-describedby={errors.senha ? "register-senha-error" : "register-senha-help"}
              aria-invalid={errors.senha ? "true" : "false"}
              className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("senha")}
            />
            <p id="register-senha-help" className="text-xs text-slate-500 dark:text-slate-400">
              Escolha uma senha com pelo menos 6 caracteres.
            </p>
            {errors.senha ? (
              <p id="register-senha-error" className="text-sm text-red-600">
                {errors.senha.message}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            className="h-11 w-full rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Criando..." : "Criar conta"}
          </button>
        </form>

        <button
          type="button"
          className="h-11 w-full rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          onClick={handleGoogleSignUp}
          disabled={pendingGoogle}
        >
          {pendingGoogle ? "Conectando..." : "Criar conta com Google"}
        </button>

        {enableAppleAuth ? (
          <button
            type="button"
            className="h-11 w-full rounded-lg border border-slate-200 bg-black text-sm font-medium text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleAppleSignUp}
            disabled={pendingApple}
          >
            {pendingApple ? "Conectando..." : "Criar conta com Apple"}
          </button>
        ) : null}

        {success ? (
          <p
            className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"
            aria-live="polite"
          >
            Conta pronta. Redirecionando para seu painel...
          </p>
        ) : null}

        <p className="text-center text-sm text-slate-600 dark:text-slate-300">
          Ja tem conta?{" "}
          <Link
            className="font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200"
            href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          >
            Entrar agora
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
