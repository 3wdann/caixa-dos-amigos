import { expect, test } from "@playwright/test";

import { getManagerTestCredentials, getMemberTestCredentials } from "./helpers/auth";

test("gerente convida membro e o membro aceita pelo painel", async ({ browser }) => {
  const manager = getManagerTestCredentials();
  const member = getMemberTestCredentials();

  test.skip(
    !manager || !member,
    "Defina E2E_MANAGER_EMAIL/E2E_MANAGER_PASSWORD e E2E_MEMBER_EMAIL/E2E_MEMBER_PASSWORD.",
  );

  const managerPage = await browser.newPage();
  const memberPage = await browser.newPage();
  const uniqueName = `E2E Convite ${Date.now()}`;

  await managerPage.goto("/login");
  await managerPage.getByLabel("Email").fill(manager!.email);
  await managerPage.getByLabel("Senha").fill(manager!.password);
  await managerPage.getByRole("button", { name: /^Entrar$/ }).click();
  await expect(managerPage).toHaveURL(/\/painel/);

  await managerPage.getByLabel("Nome do caixa").fill(uniqueName);
  await managerPage.getByLabel("Descricao").fill("Fluxo E2E de convite e aceite.");
  await managerPage.getByLabel("Valor mensal por membro").fill("120");
  await managerPage.getByLabel("Total de membros / meses").fill("2");
  await managerPage.getByLabel("Data de inicio").fill("2026-05-10");
  await managerPage.getByRole("button", { name: /Criar caixa/i }).click();
  await expect(managerPage.getByText(uniqueName)).toBeVisible();

  const createdCard = managerPage.locator("div").filter({ hasText: uniqueName }).first();
  await createdCard.getByRole("link", { name: /Abrir detalhes/i }).click();
  await expect(managerPage).toHaveURL(/\/painel\/caixas\//);

  await managerPage.getByLabel("Email do membro").fill(member!.email);
  await managerPage.getByRole("button", { name: /Adicionar membro/i }).click();
  await expect(managerPage.getByText(member!.email)).toBeVisible();
  await expect(managerPage.getByText(/convite pendente/i)).toBeVisible();

  await memberPage.goto("/login");
  await memberPage.getByLabel("Email").fill(member!.email);
  await memberPage.getByLabel("Senha").fill(member!.password);
  await memberPage.getByRole("button", { name: /^Entrar$/ }).click();
  await expect(memberPage).toHaveURL(/\/painel/);

  await expect(memberPage.getByText(uniqueName)).toBeVisible();
  await memberPage.getByRole("button", { name: /Entrar nesse caixa/i }).click();
  await expect(memberPage).toHaveURL(/\/painel\/caixas\//);
  await expect(memberPage.getByRole("heading", { name: uniqueName })).toBeVisible();

  await managerPage.reload();
  await expect(managerPage.getByText(member!.email)).not.toBeVisible();

  await managerPage.getByRole("button", { name: "Excluir caixa por completo" }).click();
  await managerPage.getByRole("button", { name: "Clique novamente para excluir" }).click();
  await expect(managerPage).toHaveURL(/\/painel$/);

  await managerPage.close();
  await memberPage.close();
});
