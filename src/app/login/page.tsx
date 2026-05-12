import { PublicOnly } from "@/components/auth/auth-guard";
import { LoginForm } from "@/components/auth/login-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function LoginPage() {
  return (
    <PublicOnly>
      <main
        id="main-content"
        tabIndex={-1}
        className="brand-shell px-4 py-8 sm:py-10"
      >
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <section className="space-y-6" aria-labelledby="login-title">
            <div className="flex items-center justify-between gap-4">
              <div className="brand-pill">
                Caixa dos Amigos
              </div>
              <ThemeToggle />
            </div>
            <div className="space-y-4">
              <h1
                id="login-title"
                className="max-w-xl text-4xl font-semibold tracking-tight text-[#13231C] dark:text-slate-50 sm:text-5xl"
              >
                Entre para gerenciar seus caixas com clareza.
              </h1>
              <p className="max-w-xl text-base leading-7 text-[#657469] dark:text-slate-300">
                Acesso do gerente para controlar membros, pagamentos, rodizios e relatorios em um
                painel mobile-first.
              </p>
            </div>
          </section>

          <LoginForm />
        </div>
      </main>
    </PublicOnly>
  );
}
