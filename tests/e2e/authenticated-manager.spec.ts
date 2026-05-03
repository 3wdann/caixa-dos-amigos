import { expect, test } from "@playwright/test";

import { getManagerTestCredentials } from "./helpers/auth";

test("gerente consegue entrar, criar um caixa e excluir no final", async ({ page }) => {
  const credentials = getManagerTestCredentials();

  test.skip(!credentials, "Defina E2E_MANAGER_EMAIL e E2E_MANAGER_PASSWORD para rodar este fluxo.");

  const uniqueName = `E2E Caixa ${Date.now()}`;

  await page.goto("/login");
  await page.getByLabel("Email").fill(credentials!.email);
  await page.getByLabel("Senha").fill(credentials!.password);
  await page.getByRole("button", { name: /^Entrar$/ }).click();

  await expect(page).toHaveURL(/\/painel/);
  await expect(page.getByText("Seu painel")).toBeVisible();

  await page.getByLabel("Nome do caixa").fill(uniqueName);
  await page.getByLabel("Descricao").fill("Caixa criado automaticamente pelo Playwright.");
  await page.getByLabel("Valor mensal por membro").fill("100");
  await page.getByLabel("Total de membros / meses").fill("2");
  await page.getByLabel("Data de inicio").fill("2026-05-10");
  await page.getByRole("button", { name: /Criar caixa/i }).click();

  await expect(page.getByText(uniqueName)).toBeVisible();

  const caixaCard = page.locator("div").filter({ hasText: uniqueName }).first();
  await caixaCard.getByRole("link", { name: /Abrir detalhes/i }).click();

  await expect(page).toHaveURL(/\/painel\/caixas\//);
  await expect(page.getByRole("heading", { name: uniqueName })).toBeVisible();

  await page.getByRole("button", { name: "Excluir caixa por completo" }).click();
  await page.getByRole("button", { name: "Clique novamente para excluir" }).click();

  await expect(page).toHaveURL(/\/painel$/);
  await expect(page.getByText(uniqueName)).not.toBeVisible();
});
