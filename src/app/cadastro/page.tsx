import { PublicOnly } from "@/components/auth/auth-guard";
import { RegisterForm } from "@/components/auth/register-form";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function CadastroPage() {
  return (
    <PublicOnly>
      <main
        id="main-content"
        tabIndex={-1}
        className="brand-shell px-4 py-8 sm:py-10"
      >
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <section className="space-y-6" aria-labelledby="cadastro-title">
            <div className="flex items-center justify-between gap-4">
              <div className="brand-pill">
                Comece por aqui
              </div>
              <ThemeToggle />
            </div>
            <div className="space-y-4">
              <h1
                id="cadastro-title"
                className="max-w-xl text-4xl font-semibold tracking-tight text-[#13231C] dark:text-slate-50 sm:text-5xl"
              >
                Crie sua conta de gerente e monte o primeiro caixa.
              </h1>
              <p className="max-w-xl text-base leading-7 text-[#657469] dark:text-slate-300">
                O app continua em beta e ja cobre criacao de caixas, membros, pagamentos,
                rodízios, relatórios e compartilhamento pelo gerente.
              </p>
            </div>
          </section>

          <RegisterForm />
        </div>
      </main>
    </PublicOnly>
  );
}
