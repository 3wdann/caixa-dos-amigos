import { PublicOnly } from "@/components/auth/auth-guard";
import { LoginForm } from "@/components/auth/login-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function LoginPage() {
  return (
    <PublicOnly>
      <main
        id="main-content"
        tabIndex={-1}
        className="soft-app-shell px-4 py-8 sm:py-10"
      >
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <section className="space-y-6" aria-labelledby="login-title">
            <div className="flex items-center justify-between gap-4">
              <div className="inline-flex rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm font-medium text-slate-800 shadow-[0_10px_24px_rgba(91,102,131,0.08)] dark:border-white/10 dark:bg-white/10 dark:text-white">
                Caixa dos Amigos
              </div>
              <ThemeToggle />
            </div>
            <div className="space-y-4">
              <h1
                id="login-title"
                className="max-w-xl text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl"
              >
                Seu caixa organizadinho, no ritmo do grupo.
              </h1>
              <p className="max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
                Entre para acompanhar pagamentos, criar novos caixas e deixar o rodizio redondo
                desde o primeiro mes.
              </p>
            </div>
          </section>

          <LoginForm />
        </div>
      </main>
    </PublicOnly>
  );
}
