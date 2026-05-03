# Caixa dos Amigos

App web mobile-first para gerenciar caixinhas rotativas entre amigos, com autenticacao, convites, pagamentos, rodizio, historico e exportacoes.

O brief funcional do produto esta em [C:\Users\danco\OneDrive\Documentos\_codex_CAIXA v1\docs\CAIXA_DOS_AMIGOS_brief_refinado.md](/C:/Users/danco/OneDrive/Documentos/_codex_CAIXA%20v1/docs/CAIXA_DOS_AMIGOS_brief_refinado.md).

## Stack

- Next.js 14 + App Router
- TypeScript
- Tailwind CSS v3 + shadcn/ui
- Firebase Auth + Firestore
- Zustand
- React Hook Form + Zod
- Recharts
- jsPDF
- IndexedDB com `idb`
- Playwright

## Status atual

Ja implementado no projeto:

- cadastro e login com email/senha
- login com Google
- recuperacao de senha
- dashboard de gerente e membro
- criacao de caixa
- convite por email e por link publico
- aceite de convite
- remocao de membro
- exclusao completa de caixa
- pagamentos com confirmacao e rejeicao do gerente
- rodizio e dono do ponto
- notas por mes
- exportacao CSV
- exportacao PDF
- resumo no WhatsApp
- backup e restore por JSON
- graficos
- cache offline de leitura
- base E2E com Playwright
- base de Sentry pronta para ativacao

Pendencias externas ou intencionais:

- Apple Sign-In desativado por padrao
- Sentry sem `DSN` real
- refinamento visual fino de tema claro/escuro

## Setup local

Instale as dependencias:

```bash
npm install
```

Suba o ambiente local:

```bash
npm run dev
```

Abra:

- [http://localhost:3000](http://localhost:3000)

## Variaveis de ambiente

O projeto usa [C:\Users\danco\OneDrive\Documentos\_codex_CAIXA v1\.env.local](/C:/Users/danco/OneDrive/Documentos/_codex_CAIXA%20v1/.env.local).

Campos principais:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_ENABLE_APPLE_AUTH=false
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
SENTRY_AUTH_TOKEN=
```

Observacoes:

- `NEXT_PUBLIC_ENABLE_APPLE_AUTH=false` esconde Apple da interface
- `NEXT_PUBLIC_SENTRY_DSN` e `SENTRY_DSN` so precisam ser preenchidos quando o Sentry for ativado

## Firebase

Projeto atual conectado:

- `caixa-dos-amigos-46666`

Arquivos relevantes:

- [C:\Users\danco\OneDrive\Documentos\_codex_CAIXA v1\firestore.rules](/C:/Users/danco/OneDrive/Documentos/_codex_CAIXA%20v1/firestore.rules)
- [C:\Users\danco\OneDrive\Documentos\_codex_CAIXA v1\firebase.json](/C:/Users/danco/OneDrive/Documentos/_codex_CAIXA%20v1/firebase.json)
- [C:\Users\danco\OneDrive\Documentos\_codex_CAIXA v1\.firebaserc](/C:/Users/danco/OneDrive/Documentos/_codex_CAIXA%20v1/.firebaserc)

Para publicar regras:

```bash
firebase deploy --only firestore
```

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run test:e2e
npm run test:e2e:ui
```

## Testes E2E

A suite publica roda sem credenciais reais.

Hoje o resultado esperado e:

- `5 passed`
- `3 skipped`

Os testes autenticados so rodam se estas variaveis existirem:

```env
E2E_MANAGER_EMAIL=
E2E_MANAGER_PASSWORD=
E2E_MEMBER_EMAIL=
E2E_MEMBER_PASSWORD=
E2E_SECOND_MEMBER_EMAIL=
E2E_SECOND_MEMBER_PASSWORD=
```

Arquivos dos testes:

- [C:\Users\danco\OneDrive\Documentos\_codex_CAIXA v1\playwright.config.ts](/C:/Users/danco/OneDrive/Documentos/_codex_CAIXA%20v1/playwright.config.ts)
- [C:\Users\danco\OneDrive\Documentos\_codex_CAIXA v1\tests\e2e](/C:/Users/danco/OneDrive/Documentos/_codex_CAIXA%20v1/tests/e2e)

## Sentry

A base ja esta preparada nestes arquivos:

- [C:\Users\danco\OneDrive\Documentos\_codex_CAIXA v1\next.config.mjs](/C:/Users/danco/OneDrive/Documentos/_codex_CAIXA%20v1/next.config.mjs)
- [C:\Users\danco\OneDrive\Documentos\_codex_CAIXA v1\instrumentation.ts](/C:/Users/danco/OneDrive/Documentos/_codex_CAIXA%20v1/instrumentation.ts)
- [C:\Users\danco\OneDrive\Documentos\_codex_CAIXA v1\instrumentation-client.ts](/C:/Users/danco/OneDrive/Documentos/_codex_CAIXA%20v1/instrumentation-client.ts)
- [C:\Users\danco\OneDrive\Documentos\_codex_CAIXA v1\src\app\global-error.tsx](/C:/Users/danco/OneDrive/Documentos/_codex_CAIXA%20v1/src/app/global-error.tsx)

Para ativar de verdade no futuro:

1. preencher `NEXT_PUBLIC_SENTRY_DSN` e `SENTRY_DSN`
2. se quiser sourcemaps no dashboard do Sentry, preencher `SENTRY_ORG`, `SENTRY_PROJECT` e `SENTRY_AUTH_TOKEN`

## Restore points

Ponto da Fase 1:

- marcador: [C:\Users\danco\OneDrive\Documentos\_codex_CAIXA v1\.codex-restore-point-phase1.txt](/C:/Users/danco/OneDrive/Documentos/_codex_CAIXA%20v1/.codex-restore-point-phase1.txt)
- script: [C:\Users\danco\OneDrive\Documentos\_codex_CAIXA v1\restore-fase1-estavel.ps1](/C:/Users/danco/OneDrive/Documentos/_codex_CAIXA%20v1/restore-fase1-estavel.ps1)

Ponto consolidado atual:

- marcador: [C:\Users\danco\OneDrive\Documentos\_codex_CAIXA v1\.codex-restore-point-phase4.txt](/C:/Users/danco/OneDrive/Documentos/_codex_CAIXA%20v1/.codex-restore-point-phase4.txt)
- script: [C:\Users\danco\OneDrive\Documentos\_codex_CAIXA v1\restore-fase4-estavel.ps1](/C:/Users/danco/OneDrive/Documentos/_codex_CAIXA%20v1/restore-fase4-estavel.ps1)

Para restaurar:

```powershell
powershell -ExecutionPolicy Bypass -File .\restore-fase4-estavel.ps1
```

## Estrutura importante

- [C:\Users\danco\OneDrive\Documentos\_codex_CAIXA v1\src\app](/C:/Users/danco/OneDrive/Documentos/_codex_CAIXA%20v1/src/app)
- [C:\Users\danco\OneDrive\Documentos\_codex_CAIXA v1\src\components](/C:/Users/danco/OneDrive/Documentos/_codex_CAIXA%20v1/src/components)
- [C:\Users\danco\OneDrive\Documentos\_codex_CAIXA v1\src\lib](/C:/Users/danco/OneDrive/Documentos/_codex_CAIXA%20v1/src/lib)
- [C:\Users\danco\OneDrive\Documentos\_codex_CAIXA v1\docs](/C:/Users/danco/OneDrive/Documentos/_codex_CAIXA%20v1/docs)

## Ambiente de runtime local

Durante os testes, foi usado um espelho fora do OneDrive para evitar corrupcao intermitente do `next dev`:

- runtime: `C:\Users\danco\caixa-runtime`

Esse runtime espelho nao substitui o projeto principal. Ele so serve para rodar o app local com mais estabilidade.
