export const ensureSignedIn = async (
  page,
  {
    email = process.env.PROMPTFORGE_E2E_EMAIL ?? "admin@promptforge.local",
    password = process.env.PROMPTFORGE_E2E_PASSWORD ?? "PromptForgeAdmin!2026",
    name = process.env.PROMPTFORGE_E2E_NAME ?? "PromptForge QA",
    language = process.env.PROMPTFORGE_E2E_LANGUAGE ?? "en"
  } = {}
) => {
  await page.goto("/auth", { waitUntil: "domcontentloaded" });

  const login = async () => {
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Password").fill(password);
    await page.getByRole("button", { name: /^Sign in$/ }).last().click();
  };

  await login();

  try {
    await page.waitForURL("**/dashboard", {
      timeout: 8_000,
      waitUntil: "domcontentloaded"
    });
  } catch {
    await page.getByRole("button", { name: /^Create account$/ }).first().click();
    await page.getByPlaceholder("Name").fill(name);
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Password").fill(password);
    await page.locator("select").last().selectOption(language);

    await Promise.all([
      page.waitForURL("**/dashboard", {
        timeout: 30_000,
        waitUntil: "domcontentloaded"
      }),
      page.getByRole("button", { name: /^Create account$/ }).last().click()
    ]);
  }

  await page.evaluate(() => window.localStorage.removeItem("promptforge-draft"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForURL("**/dashboard", {
    timeout: 30_000,
    waitUntil: "domcontentloaded"
  });
};
