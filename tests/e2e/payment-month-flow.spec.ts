import { expect, test, type Page } from "@playwright/test";

import {
  getManagerTestCredentials,
  getMemberTestCredentials,
  getSecondMemberTestCredentials,
} from "./helpers/auth";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: /^Entrar$/ }).click();
  await expect(page).toHaveURL(/\/painel/);
}

async function acceptInviteFromPanel(page: Page, caixaNome: string) {
  await expect(page.getByText(caixaNome)).toBeVisible();
  await page.getByRole("button", { name: /Entrar nesse caixa/i }).click();
  await expect(page).toHaveURL(/\/painel\/caixas\//);
  await expect(page.getByRole("heading", { name: caixaNome })).toBeVisible();
}

test("gerente confirma pagamentos e avanca o mes com dois membros", async ({ browser }) => {
  const manager = getManagerTestCredentials();
  const memberOne = getMemberTestCredentials();
  const memberTwo = getSecondMemberTestCredentials();

  test.skip(
    !manager || !memberOne || !memberTwo,
    "Defina E2E_MANAGER_*, E2E_MEMBER_* e E2E_SECOND_MEMBER_* para rodar este fluxo.",
  );

  const managerPage = await browser.newPage();
  const memberOnePage = await browser.newPage();
  const memberTwoPage = await browser.newPage();
  const uniqueName = `E2E Pagamento ${Date.now()}`;

  await login(managerPage, manager!.email, manager!.password);

  await managerPage.getByLabel("Nome do caixa").fill(uniqueName);
  await managerPage.getByLabel("Descricao").fill("Fluxo E2E de pagamento e avancar mes.");
  await managerPage.getByLabel("Valor mensal por membro").fill("150");
  await managerPage.getByLabel("Total de membros / meses").fill("2");
  await managerPage.getByLabel("Data de inicio").fill("2026-05-10");
  await managerPage.getByRole("button", { name: /Criar caixa/i }).click();

  const createdCard = managerPage.locator("div").filter({ hasText: uniqueName }).first();
  await expect(createdCard).toBeVisible();
  await createdCard.getByRole("link", { name: /Abrir detalhes/i }).click();
  await expect(managerPage).toHaveURL(/\/painel\/caixas\//);

  await managerPage.getByLabel("Email do membro").fill(memberOne!.email);
  await managerPage.getByRole("button", { name: /Adicionar membro/i }).click();
  await expect(managerPage.getByText(memberOne!.email)).toBeVisible();

  await managerPage.getByLabel("Email do membro").fill(memberTwo!.email);
  await managerPage.getByRole("button", { name: /Adicionar membro/i }).click();
  await expect(managerPage.getByText(memberTwo!.email)).toBeVisible();

  await login(memberOnePage, memberOne!.email, memberOne!.password);
  await acceptInviteFromPanel(memberOnePage, uniqueName);

  await login(memberTwoPage, memberTwo!.email, memberTwo!.password);
  await acceptInviteFromPanel(memberTwoPage, uniqueName);

  await managerPage.reload();
  await expect(managerPage.getByText(memberOne!.email)).not.toBeVisible();
  await expect(managerPage.getByText(memberTwo!.email)).not.toBeVisible();

  await managerPage.getByRole("button", { name: /Preparar rodizio automatico/i }).click();
  await expect(managerPage.getByText(/Dono do ponto do mes/i)).toBeVisible();

  await memberOnePage.getByRole("button", { name: /Marcar como pago|Marcar novamente como pago/i }).click();
  await expect(memberOnePage.getByText(/pendente de confirmacao do gerente/i)).toBeVisible();

  await memberTwoPage.getByRole("button", { name: /Marcar como pago|Marcar novamente como pago/i }).click();
  await expect(memberTwoPage.getByText(/pendente de confirmacao do gerente/i)).toBeVisible();

  await managerPage.reload();
  await expect(managerPage.getByRole("button", { name: /Confirmar pagamento/i })).toHaveCount(2);
  await managerPage.getByRole("button", { name: /Confirmar pagamento/i }).nth(0).click();
  await managerPage.getByRole("button", { name: /Confirmar pagamento/i }).nth(0).click();
  await expect(managerPage.getByText(/confirmado/i).first()).toBeVisible();

  await expect(managerPage.getByRole("button", { name: /Confirmar pagamento/i })).toHaveCount(1);
  await managerPage.getByRole("button", { name: /Confirmar pagamento/i }).click();

  await managerPage.getByRole("button", { name: /Encerrar mes e avancar/i }).click();
  await expect(managerPage.getByText(/Mes 2/i)).toBeVisible();

  await managerPage.getByRole("button", { name: "Excluir caixa por completo" }).click();
  await managerPage.getByRole("button", { name: "Clique novamente para excluir" }).click();
  await expect(managerPage).toHaveURL(/\/painel$/);

  await managerPage.close();
  await memberOnePage.close();
  await memberTwoPage.close();
});
