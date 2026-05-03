# CAIXA DOS AMIGOS 💰
**"Seu caixa organizadinho 🫰"**
*Brief de Produto — v2.3 (funcionalidades completas)*

---

## 1. Visão do Produto

Aplicativo web **mobile-first** para gerenciar consórcios rotativos informais ("caixinhas") entre grupos de amigos. Um gerente cria o caixa, convida membros, e o sistema controla quem paga, quem recebe e o histórico completo de cada rodada.

**Caso de uso base:** 11 participantes pagam R$200/mês. O valor total (R$2.000) é entregue mensalmente a um "Dono do Ponto", em rodízio até todos receberem.

> **Decisões de produto confirmadas:**
> - Número de membros é **configurável** pelo gerente. O sistema calcula o total por ponto em tempo real e **sugere combinações de valor fechado** (ex: 10 × R$200 = R$2.000 ✅).
> - Valor mensal é **configurável** pelo gerente ao criar o caixa.
> - **Auto-aprovação:** o ato de o gerente enviar o convite (manualmente ou via link) já é a aprovação. Membros entram diretamente como `ativo`, sem etapa extra de confirmação.
> - A ordem do sorteio é definida **manualmente pelo gerente** via drag-and-drop antes do início.
> - Haverá **monetização futura** — arquitetura deve suportar planos/limites sem refatoração.
> - **Limites de plano:** gerente free pode ter no máximo **1 caixa ativo** por vez; gerente pro tem caixas ilimitados. **Participar como membro não tem limite** — um usuário free pode ser membro em quantos caixas quiser, de gerentes diferentes ou do mesmo gerente.
> - Distribuição: **PWA instalável** (iOS home screen) + **site mobile** (browser) + **app na Play Store** (Android via TWA/Bubblewrap).

---

## 2. Stack Técnico

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript (strict mode) |
| Estilização | Tailwind CSS v3 + shadcn/ui |
| Banco de dados | Firebase Firestore (v9 modular) |
| Autenticação | Firebase Auth |
| Storage | Firebase Storage (avatares, PDFs) |
| Gráficos | Recharts |
| Exportação PDF | react-pdf ou jsPDF |
| Notificações | Firebase Cloud Messaging (FCM) |
| Estado global | Zustand |
| Formulários | React Hook Form + Zod |
| Drag-and-drop | @dnd-kit/core (ordenação do sorteio) |
| Offline | Service Worker + IndexedDB (via idb) |
| PWA | next-pwa (manifest, service worker, ícones) |
| Play Store (Android) | Bubblewrap / TWA — empacota o PWA como APK sem reescrever código |
| Pix QR Code | qrcode.react (geração client-side do BR Code EMV) |
| Animações | canvas-confetti (celebração ao marcar pagamento) |
| Monetização futura | Stripe (preparar hooks/feature flags desde o início) |
| Deploy | Vercel |

---

## 3. Modelo de Dados (Firestore)

### Coleção: `users/{userId}`
```
{
  uid: string,
  nome: string,
  email: string,
  fotoUrl: string | null,
  cor: string,           // cor hex atribuída automaticamente (para avatar)
  plano: 'free' | 'pro', // preparado para monetização futura; default 'free'
  chavePix: string | null,      // chave Pix cadastrada pelo usuário (CPF, email, telefone ou aleatória)
  tipoChavePix: 'cpf' | 'email' | 'telefone' | 'aleatoria' | null,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Coleção: `caixas/{caixaId}`
```
{
  id: string,
  nome: string,
  descricao: string,
  gerenteId: string,     // uid do criador
  valorMensal: number,   // ex: 200
  totalPorMes: number,   // valorMensal × totalMembros (calculado)
  totalMeses: number,    // ex: 11
  mesAtual: number,      // 1-indexed, começa em 1
  status: 'ativo' | 'encerrado' | 'pausado',
  origem: 'novo' | 'importado',  // indica se foi criado do zero ou migrado de um caixa já em andamento
  dataInicio: Timestamp,
  linkConvite: string,   // token único gerado pelo sistema
  linkExpiraEm: Timestamp | null,
  rankingAtivo: boolean, // gerente pode desativar o ranking de pontualidade; default true
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Subcoleção: `caixas/{caixaId}/membros/{membroId}`
```
{
  userId: string,
  nome: string,          // snapshot no momento de entrada
  fotoUrl: string | null,
  cor: string,
  ordemSorteio: number | null,  // posição no rodízio (1..N), definida pelo gerente via drag-and-drop
  mesRecebimento: number | null,        // mês em que será "Dono do Ponto" (= ordemSorteio após início)
  entradaEm: Timestamp,
  status: 'ativo' | 'removido',  // sem status pendente — toda entrada é auto-aprovada
  substituidoPor: string | null, // userId do substituto, se houver troca de membro no meio do caixa
}
```

### Subcoleção: `caixas/{caixaId}/notas/{notaId}`
```
{
  id: string,
  mes: number,           // mês ao qual a nota se refere
  texto: string,         // anotação do gerente (ex: "João pagou em dois depósitos por acordo")
  criadoPor: string,     // uid do gerente
  criadoEm: Timestamp
}
```

### Subcoleção: `caixas/{caixaId}/pagamentos/{pagamentoId}`
```
{
  id: string,
  membroId: string,
  mes: number,           // 1-indexed
  valor: number,
  status: 'pendente' | 'confirmado' | 'rejeitado',
  declaradoEm: Timestamp | null,   // quando o membro marcou como pago
  confirmadoEm: Timestamp | null,  // quando o gerente confirmou
  confirmadoPor: string | null,    // uid do gerente
  comprovante: string | null,      // URL do Firebase Storage (opcional)
  fonte: 'app' | 'importacao_manual', // distingue registros históricos importados de confirmações reais
  pontuacaoPontualidade: 'ouro' | 'prata' | 'bronze' | null, // calculado ao confirmar (ouro ≤ dia 5, prata ≤ dia 10, bronze depois)
}
```

### Coleção: `convites/{token}`
```
{
  token: string,
  caixaId: string,
  criadoPor: string,     // uid do gerente
  usoUnico: boolean,
  usosRestantes: number | null,
  expiraEm: Timestamp | null,
  status: 'ativo' | 'expirado' | 'revogado',
  createdAt: Timestamp
}
```

---

## 4. Regras de Negócio

### 4.1 Criação do Caixa
- O gerente define: nome, descrição, valor mensal por membro, número total de membros (= total de meses), data de início.
- **Sugestão de valor fechado:** enquanto o gerente digita o valor mensal e o número de membros, o app exibe em tempo real o total por ponto (`valorMensal × totalMembros`) e indica com um selo ✅ quando o resultado for um número redondo (múltiplo de R$100). Se não for fechado, o sistema sugere: *"Adicione mais 1 membro para chegar em R$2.000"* ou *"Reduza para R$180/membro para fechar em R$1.800"*.
- `totalPorMes` é calculado automaticamente: `valorMensal × totalMembros`.
- O caixa só pode ser **iniciado** quando todos os membros estiverem com status `ativo` e `membros.length === totalMeses`.
- Antes do início, o gerente define a `ordemSorteio` de cada membro via **drag-and-drop** na tela de membros.
- Ao iniciar o caixa, `mesRecebimento` de cada membro é fixado como igual à sua `ordemSorteio`.

### 4.2 "Dono do Ponto"
- A cada mês, o "Dono do Ponto" é o membro com `mesRecebimento === mesAtual`.
- O gerente avança o mês manualmente (botão "Encerrar mês e avançar").
- Antes de avançar, o sistema alerta se houver pagamentos pendentes.
- Não é permitido avançar com pagamentos não confirmados (pode ser forçado pelo gerente com justificativa).

### 4.3 Fluxo de Pagamento
1. Membro acessa o app e clica em "Marcar como pago" no mês atual.
2. Pode opcionalmente fazer upload de comprovante (imagem/PDF).
3. Pagamento vai para status `declarado`.
4. Gerente recebe notificação e confirma ou rejeita.
5. Ao confirmar → status `confirmado`.
6. Ao rejeitar → membro é notificado com motivo.
7. **O gerente também pode marcar pagamentos diretamente**, sem declaração prévia do membro.

### 4.4 Links de Convite e Adição de Membros
- **Adição manual pelo gerente:** o gerente busca o usuário por email e o adiciona diretamente. O membro entra como `ativo` imediatamente — não há etapa de aprovação pois o gerente já está tomando a decisão.
- **Link de convite:** o gerente gera um link com token único: `/entrar?convite={token}`. O ato de gerar e compartilhar o link é a aprovação — qualquer pessoa com o link entra diretamente como `ativo`.
- Configurações do link: uso único, múltiplos usos, com/sem prazo de expiração.
- Ao acessar o link, o usuário:
  - Se não tem conta: é redirecionado para cadastro e, ao concluir, entra no caixa automaticamente como `ativo`.
  - Se já tem conta: vê tela de confirmação e entra como `ativo` ao confirmar.
- O gerente pode revogar o link a qualquer momento para impedir novas entradas.

### 4.5 Roles, Permissões e Limites de Plano
- Um usuário pode ser **gerente** de alguns caixas e **membro** de outros simultaneamente, independentemente do plano.
- Role é por caixa (não global): armazenada no documento do membro dentro da subcoleção.
- Regras Firestore garantem: membros só leem seus próprios pagamentos e os dados públicos dos outros membros do mesmo caixa. Apenas o gerente escreve em `pagamentos`.
- **Limites por plano:**

| Ação | Plano Free | Plano Pro |
|---|---|---|
| Criar caixas ativos | Máx. 1 | Ilimitado |
| Participar como membro | Ilimitado | Ilimitado |
| Participar em caixas de gerentes diferentes | ✅ Permitido | ✅ Permitido |
| Participar em múltiplos caixas do mesmo gerente | ✅ Permitido | ✅ Permitido |

- Quando gerente free tenta criar um segundo caixa: modal explicando o limite com botão de upgrade para Pro.
- Toda verificação de limite centralizada em `lib/plano.ts` para facilitar ajustes futuros.

### 4.6 Remoção e Substituição de Membro
- **Remoção simples:** possível antes do caixa ser iniciado. Ao remover, membro fica como `removido` e a `ordemSorteio` dos demais é reordenada.
- **Substituição no meio do caixa:** se um membro precisar sair após o início, o gerente pode substituí-lo por outro usuário. O slot (mês de recebimento) é mantido. O histórico mostra ambos os nomes naquele slot, e o campo `substituidoPor` registra o userId do novo membro. O substituto assume a posição a partir do mês atual — meses anteriores ficam registrados com o nome original.
- Em qualquer remoção após o início, o gerente deve confirmar que entende as implicações com modal de aviso.

### 4.7 Notas por Mês
- O gerente pode adicionar uma anotação em qualquer mês do histórico a qualquer momento.
- Exemplos de uso: *"Janeiro: João pagou em dois depósitos por acordo"*, *"Março: mês pausado por decisão do grupo"*.
- A nota fica visível no histórico com um ícone 📝 ao lado do mês. Ao clicar, expande o texto completo.
- Apenas o gerente pode criar, editar ou excluir notas. Membros podem visualizar.
- Armazenado na subcoleção `caixas/{caixaId}/notas/{notaId}`.

### 4.8 Encerramento do Caixa
- Ao atingir `mesAtual === totalMeses` e todos os pagamentos confirmados, o caixa muda para `encerrado`.
- Dados ficam disponíveis como histórico somente-leitura.
- Ao encerrar, o slot de "caixa ativo" no plano free é liberado — o gerente pode criar um novo.


### 4.9 Cadastro de Caixa Já em Andamento
Para grupos que já têm um consórcio ativo e querem migrar para o app sem perder o histórico:

**Fluxo de criação:**
1. Na tela de criação, o gerente ativa a opção **"Este caixa já está em andamento"**.
2. O gerente informa:
   - Configurações normais (nome, membros, valor, total de meses).
   - **Mês atual** (ex: "Estamos no mês 4 de 11").
   - **Quem já recebeu** — o gerente arrasta os membros para definir a ordem e marca quais meses já foram concluídos.
3. O sistema exibe um **resumo de validação** antes de confirmar:
   - Lista de meses anteriores com o respectivo Dono do Ponto.
   - Confirmação: *"Você declara que os meses 1 a 3 foram concluídos com sucesso e todos os pagamentos foram realizados?"*
4. O gerente confirma com um checkbox explícito: *"Confirmo que os meses anteriores foram concluídos."*
5. O sistema cria o caixa com `mesAtual = N`, gera os registros históricos dos meses anteriores com `status: 'confirmado'` e `fonte: 'importacao_manual'`, e inicia o caixa diretamente no mês informado.

**Regras:**
- Os pagamentos dos meses já concluídos aparecem no histórico marcados com um badge *"Validado pelo gerente"* para distinguir de confirmações feitas pelo app.
- Membros convidados depois da importação veem o histórico mas sabem que ele foi inserido manualmente.
- Não é possível editar os meses já marcados como concluídos após a confirmação (integridade do histórico).



---

## 5. Tipos de Usuário e Dashboards

### 5.1 Gerente

**Tela: Meus Caixas**
- Lista de caixas gerenciados com status (ativo, encerrado, pausado).
- Botão de criar novo caixa.
- Card resumo: mês atual, total arrecadado no mês, pendências.

**Tela: Detalhes do Caixa**
- Cabeçalho: nome, mês atual, "Dono do Ponto" do mês em destaque.
- Grid de membros com avatar colorido, nome e status de pagamento do mês.
- Botão: "Confirmar pagamento" por membro.
- Botão: "Avançar mês" (com validação de pendências).
- Card de ranking de pontualidade do mês (se ativado).
- Abas: Visão geral | Histórico | Membros | Configurações.

**Tela: Membros**
- Lista com avatar, nome, mês de recebimento, total pago até agora, medalha de pontualidade.
- Botão: adicionar membro (manual ou link).
- Ação: remover membro com confirmação; substituir membro após início do caixa.
- Ação: reordenar sorteio (drag-and-drop, apenas antes do início).

**Tela: Histórico**
- Lista de todos os meses com Dono do Ponto, status dos pagamentos e notas.
- Ícone 📝 ao lado dos meses com nota — clica para expandir.
- Botão "Adicionar nota" em cada mês.
- Badge *"Validado pelo gerente"* nos meses importados manualmente.

**Tela: Configurações do Caixa**
- Editar nome, descrição, data de início.
- Gerenciar link de convite (gerar, revogar, configurar expiração).
- Toggle: ativar/desativar ranking de pontualidade.
- Botão: pausar ou encerrar caixa.
- Zona de perigo: deletar caixa (confirmação dupla).

### 5.2 Membro

**Tela: Boas-vindas (primeiro acesso ao caixa)**
- Exibida uma única vez quando o membro entra no caixa pela primeira vez.
- Conteúdo: *"Oi, [nome]! Você entrou no caixa [nome do caixa]. Seu mês de recebimento é o mês [N]."*
- Botão: "Entrar no caixa" para acessar o dashboard normal.

**Tela: Meus Caixas**
- Lista de todos os caixas que participa (como membro ou gerente), de qualquer gerente, sem limite de quantidade.
- Status do pagamento do mês atual (pago / pendente) em cada card.
- Destaque visual no card do caixa cujo mês de recebimento é o atual.
- Separação visual entre "Caixas que gerencio" e "Caixas que participo".

**Tela: Detalhes do Caixa**
- Cabeçalho: nome do caixa, mês atual.
- **Contador regressivo:** *"Faltam X dias para encerrar este mês"* — cria urgência natural de pagamento.
- Card em destaque: "Dono do Ponto" do mês (avatar, nome e chave Pix se disponível).
- Card do usuário: status do seu pagamento, botão "Pagar via Pix" (QR Code) e botão "Marcar como pago".
- **Animação de confirmação:** ao marcar como pago, exibe animação de confete/checkmark antes de retornar ao dashboard.
- Card de ranking de pontualidade (se ativado pelo gerente): posição do membro no mês atual com medalha 🥇🥈🥉.
- Lista de todos os membros: avatar, nome, cor, mês de recebimento, status de pagamento do mês atual e medalha de pontualidade.
- Aba: Histórico (todos os meses anteriores, filtrável por membro, com notas visíveis).

---

## 6. Funcionalidades Avançadas

### Exportação
- **CSV:** histórico completo ou por membro. Campos: mês, membro, valor, status, data confirmação.
- **PDF:** relatório visual do caixa com resumo por mês, gráfico de adimplência, lista de "Donos do Ponto". Gerado server-side ou client-side com jsPDF.
- **WhatsApp:** gera texto formatado com resumo do mês atual (membros, status, Dono do Ponto). Abre `wa.me` com o texto pré-preenchido. Não usa API do WhatsApp Business.

### Pix QR Code
- Cada membro cadastra sua chave Pix no perfil (CPF, email, telefone ou chave aleatória).
- Na tela de detalhes do caixa, o botão "Pagar via Pix" exibe um QR Code gerado dinamicamente com a chave Pix do **Dono do Ponto do mês atual** e o valor exato (`valorMensal`).
- Se o Dono do Ponto não tiver chave Pix cadastrada, o app exibe um aviso e o gerente pode notificá-lo para completar o perfil.
- O QR Code segue o padrão **EMV/BR Code** (Pix estático), gerado client-side com a biblioteca `qrcode.react`. Não requer backend nem integração com banco.
- Abaixo do QR Code: botão "Copiar chave Pix" para quem preferir colar no app do banco.
- Após pagar, o membro clica em "Marcar como pago" normalmente (com opção de anexar comprovante).


### Gráficos (Recharts)
- Gráfico de barras: arrecadação por mês (confirmado vs pendente).
- Gráfico de linha: tendência de adimplência ao longo dos meses.
- Pizza: distribuição de status de pagamento do mês atual.

### Backup / Restore
- Exportar dados do caixa inteiro como JSON (para gerente).
- Importar JSON para restaurar caixa (cria novo caixa com dados históricos).

### Sincronização Offline
- Dados lidos em modo online são cacheados no IndexedDB.
- Em modo offline: leitura funciona normalmente; escritas ficam na fila e sincronizam ao voltar online.
- Banner visível quando offline.
- Conflitos de sincronia: last-write-wins com log de conflito no console.

### Notificações (FCM)
- Lembrete de pagamento: D-3 e D-1 antes do encerramento do mês.
- "Você é o Dono do Ponto este mês!" no início de cada mês.
- "Pagamento confirmado pelo gerente."
- Configurável: membro pode desativar no perfil.

### Landing Page do Convite (`/entrar?convite={token}`)
Primeira tela que qualquer pessoa vê ao receber um link de convite, antes de qualquer cadastro. Objetivo: vender o app e converter o clique em conta criada.

**Conteúdo da página:**
- Nome e emoji do caixa em destaque (ex: "💰 Caixinha da Galera").
- Nome de quem convidou: *"Pedro te convidou para participar"*.
- Resumo visual do caixa: valor por membro, total por ponto, quantos meses, mês atual.
- Lista de avatares coloridos dos membros já confirmados (sem expor nomes completos).
- Frase de benefício: *"Nunca mais perca o controle de quem pagou. Tudo num lugar só."*
- Botão principal: **"Entrar no caixa"** → redireciona para cadastro/login.
- Rodapé discreto: logo e nome do app.

**Regras:**
- Se o token estiver expirado ou revogado: página de erro amigável com orientação para pedir um novo link ao gerente.
- Se o usuário já for membro desse caixa: redireciona direto para o caixa (sem pedir cadastro de novo).
- A página é **pública** (sem autenticação) mas não expõe dados sensíveis — apenas nome do caixa, nome do gerente e avatares.
- Meta tags Open Graph configuradas para o link ficar bonito ao ser colado no WhatsApp (preview com nome e descrição do caixa).

### Ranking de Pontualidade
- Dentro de cada caixa, placar mostrando quem paga mais cedo todo mês.
- Pontuação simples: pagar antes do dia 5 = ouro 🥇, antes do dia 10 = prata 🥈, depois = bronze 🥉.
- Exibido como um card na tela do membro e na visão geral do gerente.
- Cria pressão social positiva dentro do grupo sem precisar de cobrança direta.
- Configurável pelo gerente: pode desativar o ranking se o grupo não quiser.



---

## 7. Autenticação

- Email + senha (Firebase Auth).
- Google Sign-In (OAuth popup).
- Apple Sign-In (OAuth popup — obrigatório para iOS PWA).
- Recuperação de senha por email.
- Ao fazer login/cadastro: sistema consulta Firestore para recuperar todos os caixas do usuário (como gerente ou membro).
- Feedback via toasts: "Bem-vindo de volta, {nome}!" | "Conta criada com sucesso!"
- Sessão persistida (`setPersistence(LOCAL)`).

---

## 8. Requisitos Não-Funcionais

- **Mobile-first:** breakpoints: `sm` (≥640px), `md` (≥768px), `lg` (≥1024px). Design pensado para 375px de largura.
- **PWA instalável:** `manifest.json` com ícones (192×192, 512×512), splash screens, `display: standalone`. Configurado via `next-pwa`. Funciona como app nativo na tela inicial do iOS e Android.
- **Play Store (Android):** o PWA é empacotado como APK usando **Bubblewrap** (TWA — Trusted Web Activity), sem reescrever código. Requisitos: Digital Asset Links configurado no domínio (arquivo `/.well-known/assetlinks.json`), nota mínima de qualidade do Lighthouse ≥ 80. O app na Play Store é essencialmente o PWA rodando em chrome headless — atualizações do site refletem automaticamente, sem republicar na loja.
- **Acessibilidade:** WCAG 2.1 AA. Navegação por teclado, `aria-label` em ações, contraste mínimo 4.5:1.
- **Performance:** LCP < 2.5s em 4G. Lazy loading de rotas. Imagens otimizadas (next/image).
- **Segurança:** Firestore Security Rules validam todas as operações. Sem dados sensíveis no client-side fora do contexto do usuário autenticado.
- **Preparação para monetização:** usar feature flags desde o início (`user.plano === 'free' | 'pro'`). Limite do free: **1 caixa ativo como gerente**. Participação como membro é ilimitada em ambos os planos. Toda verificação de limite centralizada em `lib/plano.ts`. Ao atingir o limite, exibir modal de upgrade com benefícios do Pro.
- **Tema claro/escuro:** via `next-themes`. Persistido em `localStorage`. Respeita preferência do sistema por padrão.
- **Tratamento de erros:** try/catch em todas as chamadas ao Firestore. Toasts de erro com mensagem amigável. Logs de erro em produção (Sentry recomendado).
- **Toasts:** usar `sonner` ou `react-hot-toast`. Tipos: success, error, warning, info. Auto-dismiss em 4s.

---

## 9. Regras de Segurança Firestore (esboço)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Usuários só leem/editam o próprio perfil
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // Caixas: gerente tem acesso total; membros têm leitura
    match /caixas/{caixaId} {
      allow read: if isMembro(caixaId) || isGerente(caixaId);
      allow write: if isGerente(caixaId);

      match /membros/{membroId} {
        allow read: if isMembro(caixaId) || isGerente(caixaId);
        allow write: if isGerente(caixaId);
      }

      match /pagamentos/{pagamentoId} {
        // Membro pode declarar o próprio pagamento; gerente confirma
        allow read: if isMembro(caixaId) || isGerente(caixaId);
        allow create: if request.auth.uid == resource.data.membroId;
        allow update: if isGerente(caixaId);
      }
    }

    function isMembro(caixaId) {
      return exists(/databases/$(database)/documents/caixas/$(caixaId)/membros/$(request.auth.uid));
    }
    function isGerente(caixaId) {
      return get(/databases/$(database)/documents/caixas/$(caixaId)).data.gerenteId == request.auth.uid;
    }
  }
}
```

---

## 10. Edge Cases a Tratar

| Situação | Comportamento esperado |
|---|---|
| Gerente free tenta criar segundo caixa | Modal de upgrade com benefícios do Pro; bloqueado até encerrar o caixa ativo ou assinar Pro |
| Membro é o Dono do Ponto e não tem chave Pix | Aviso visível para todos; gerente notificado para acionar o membro antes do mês fechar |
| Substituto entra no mês em que o slot já era o Dono do Ponto | Sistema alerta o gerente; substituto recebe naquele mês normalmente |
| Membro participa de dois caixas do mesmo gerente | Tratado normalmente — são caixas independentes, cada um com seu histórico e pagamentos |
| Membro tenta pagar mês já encerrado | Bloqueado com mensagem explicativa |
| Gerente tenta avançar mês com pendências | Modal de aviso; pode forçar com justificativa |
| Link de convite expirado | Tela de erro amigável com opção de pedir novo link |
| Caixa com apenas 1 membro restante | Alerta visual; gerente pode encerrar antecipadamente |
| Usuário perde conexão durante upload de comprovante | Retry automático; feedback de "aguardando conexão" |
| Dois gerentes editando o caixa simultaneamente | Firestore onSnapshot atualiza em tempo real; último salva ganha |
| Membro removido tenta acessar caixa | Redireciona para "Meus Caixas" com mensagem de acesso revogado |
| Gerente tenta deletar caixa com pagamentos confirmados | Confirmação dupla com resumo do que será perdido |

---

## 11. Fases de Entrega (Milestones)

### Fase 1 — MVP (semanas 1–3)
- Autenticação (email/senha + Google).
- Criar caixa, adicionar membros manualmente.
- Dashboard do gerente: visualizar membros e status de pagamentos.
- Dashboard do membro: visualizar caixa e marcar pagamento.
- Persistência no Firestore.

### Fase 2 — Core completo (semanas 4–6)
- Link de convite.
- Fluxo completo de confirmação de pagamento pelo gerente.
- Lógica do "Dono do Ponto" e avanço de mês.
- Histórico de pagamentos com filtros.
- Tema claro/escuro.

### Fase 3 — Recursos avançados (semanas 7–9)
- Exportação CSV, PDF, WhatsApp.
- Gráficos com Recharts.
- Backup/Restore JSON.
- Modo offline com IndexedDB.
- Apple Sign-In.

### Fase 4 — Polimento (semana 10+)
- Notificações FCM.
- Acessibilidade WCAG 2.1 AA.
- Testes E2E (Playwright).
- Deploy na Vercel com variáveis de ambiente configuradas.
- Sentry para monitoramento de erros.
- Publicação na Play Store via Bubblewrap/TWA.

### Estratégia de lançamento sugerida

**Etapa 1 — Teste solo:** criar um caixa real (ou importar um em andamento) e usar sozinho por 2–4 semanas. Objetivo: validar o fluxo completo de pagamento, avanço de mês e geração de relatórios antes de expor a outras pessoas.

**Etapa 2 — Beta fechado:** convidar 2–3 grupos conhecidos que já fazem caixinha. Priorizar grupos que têm um caixa em andamento — usar o fluxo de **cadastro de caixa já em andamento** (seção 4.8) como porta de entrada. Esses usuários têm contexto real e vão encontrar os problemas mais importantes.

**Etapa 3 — Abertura gradual:** com o feedback do beta incorporado, abrir para novos grupos via link público na Play Store e PWA.

> **Dica de produto:** o fluxo de importação (seção 4.8) é o principal diferencial de onboarding. Nenhum grupo vai abandonar um caixa que está na metade para começar do zero. A migração com histórico é o que vai converter os primeiros usuários reais.


