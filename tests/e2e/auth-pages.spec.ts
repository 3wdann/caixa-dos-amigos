import { expect, test } from "@playwright/test";

test("login mostra campos e provedores disponiveis", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Senha")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Entrar$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /continuar com google/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /continuar com apple/i })).toHaveCount(0);
});

test("cadastro mostra campos e provedores disponiveis", async ({ page }) => {
  await page.goto("/cadastro");

  await expect(page.getByLabel("Nome")).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Senha")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Criar conta$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /criar conta com google/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /criar conta com apple/i })).toHaveCount(0);
});
