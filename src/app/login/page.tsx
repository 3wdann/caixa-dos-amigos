import { PublicOnly } from "@/components/auth/auth-guard";
import { LoginForm } from "@/components/auth/login-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function LoginPage() {
  return (
    <PublicOnly>
      <main
        id="main-content"
        tabIndex={-1}
        className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(13,148,136,0.18),_transparent_28%),linear-gradient(180deg,#fffdf8_0%,#f5efe5_100%)] px-4 py-10 dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_24%),linear-gradient(180deg,#081311_0%,#111827_100%)]"
      >
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <section className="space-y-6" aria-labelledby="login-title">
            <div className="flex items-center justify-between gap-4">
              <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200">
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
