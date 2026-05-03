import { expect, test } from "@playwright/test";

test("login valida campos obrigatorios", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill("email-invalido");
  await page.getByLabel("Senha").fill("123");
  await page.getByRole("button", { name: /^Entrar$/ }).click();

  await expect(page.getByText("Informe um email")).toBeVisible();
  await expect(page.getByText(/A senha deve ter no m.nimo 6 caracteres\./i)).toBeVisible();
});

test("cadastro valida nome, email e senha", async ({ page }) => {
  await page.goto("/cadastro");

  await page.getByLabel("Nome").fill("aa");
  await page.getByLabel("Email").fill("email-invalido");
  await page.getByLabel("Senha").fill("123");
  await page.getByRole("button", { name: /^Criar conta$/ }).click();

  await expect(page.getByText("Informe seu nome completo.")).toBeVisible();
  await expect(page.getByText("Informe um email")).toBeVisible();
  await expect(page.getByText(/A senha deve ter no m.nimo 6 caracteres\./i)).toBeVisible();
});
