# V2 - Planos e preparacao Android/Play Store

## Modelo de planos

### Free

- Foco: gerente testando o produto com um grupo real.
- Limite: 1 caixa ativo como gerente.
- Participantes: sem limite na consulta publica, pois nao precisam criar conta.
- Recursos: criacao de caixa, membros, pagamentos, rodizio, PDF, CSV, WhatsApp, backup e consulta publica por ID.

### Pro

- Foco: gerente que administra varios grupos.
- Limite: caixas ativos ilimitados como gerente.
- Checkout: ainda nao implementado.
- Campo atual de controle: `users/{uid}.plano`, com valores `free` ou `pro`.

## Regras de produto

- O gerente e o usuario pagante.
- Participantes nao precisam criar conta para consultar o caixa.
- O bloqueio do Free deve ficar centralizado em `src/lib/plano.ts`.
- O backend/client deve impedir criacao de novo caixa ativo quando o gerente Free ja tiver 1 caixa ativo.
- Ao encerrar ou excluir um caixa ativo, o gerente Free libera o slot para criar outro.

## Preparacao Android/Play Store

Recomendacao tecnica para a V2:

1. Manter a base Next.js mobile-first como fonte principal.
2. Validar todos os fluxos no navegador mobile antes de empacotar.
3. Empacotar com Capacitor quando os fluxos de gerente estiverem estaveis.
4. Criar icones Android reais em PNG nos tamanhos exigidos pela Play Store.
5. Configurar splash screen, nome do app e pacote Android.
6. Revisar login Google dentro do WebView/Custom Tab antes de submeter.
7. Definir se o pagamento Pro sera via Play Billing, checkout web ou liberacao manual durante beta.

## Pendencias antes da Play Store

- Icone adaptativo Android.
- Politica de privacidade publica.
- Termos de uso.
- Tela de suporte/contato.
- Revisao de login Google no ambiente Android.
- Estrategia de billing compativel com as regras da Play Store.

## Liberacao manual do Pro no beta

Durante o beta, o usuario Free pode solicitar acesso Pro pela tela `/planos`.
A solicitacao fica salva em `upgradeRequests` com `status: pending`.

Conta master para validacao e operacao manual:

- `dancos3@gmail.com`
- Sempre que precisarmos de uma conta com funcoes gerenciais nos testes, use essa conta como referencia master.
- A liberacao Pro continua manual e nao fica exposta no app publico.

Para analisar solicitacoes, use uma service account local:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\Users\danco\OneDrive\Documentos\KeyFirebaseAdminToCodexcaixa-dos-amigos-46666-8ddf97ef3f2c.json"
npm run admin:upgrade:list
```

Para aprovar uma solicitacao:

```powershell
npm run admin:upgrade:approve -- --request ID_DA_SOLICITACAO
```

Para rejeitar uma solicitacao:

```powershell
npm run admin:upgrade:reject -- --request ID_DA_SOLICITACAO --reason "Motivo opcional"
```

Observacoes de seguranca:

- O app publico nao consegue alterar `users/{uid}.plano` diretamente.
- O script usa Firebase Admin SDK e deve rodar apenas por administradores.
- A aprovacao atualiza `users/{uid}.plano` para `pro` e marca a solicitacao como `approved`.
- Nao rode os comandos de aprovacao/rejeicao sem conferir o ID da solicitacao.
