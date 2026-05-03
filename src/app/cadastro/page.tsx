import { PublicOnly } from "@/components/auth/auth-guard";
import { RegisterForm } from "@/components/auth/register-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function CadastroPage() {
  return (
    <PublicOnly>
      <main
        id="main-content"
        tabIndex={-1}
        className="soft-app-shell px-4 py-8 sm:py-10"
      >
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <section className="space-y-6" aria-labelledby="cadastro-title">
            <div className="flex items-center justify-between gap-4">
              <div className="inline-flex rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm font-medium text-slate-800 shadow-[0_10px_24px_rgba(91,102,131,0.08)] dark:border-white/10 dark:bg-white/10 dark:text-white">
                Comece por aqui
              </div>
              <ThemeToggle />
            </div>
            <div className="space-y-4">
              <h1
                id="cadastro-title"
                className="max-w-xl text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl"
              >
                Crie sua conta e monte o primeiro caixa do jeito certo.
              </h1>
              <p className="max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
                O MVP ja cobre autenticacao, criacao de caixas, adicao manual de membros e status
                basicos de pagamento.
              </p>
            </div>
          </section>

          <RegisterForm />
        </div>
      </main>
    </PublicOnly>
  );
}
