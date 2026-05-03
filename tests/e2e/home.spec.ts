import { expect, test } from "@playwright/test";

test("home carrega e navega para login e cadastro", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("CAIXA DOS AMIGOS")).toBeVisible();
  await expect(page.getByRole("link", { name: /entrar/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /criar conta/i })).toBeVisible();

  await page.getByRole("link", { name: /entrar/i }).first().click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText("Acesse seus caixas com email e senha ou continue com Google.")).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: /criar conta/i }).first().click();
  await expect(page).toHaveURL(/\/cadastro/);
  await expect(page.getByText("Monte seu acesso agora e entre no seu primeiro caixa em poucos minutos.")).toBeVisible();
});
