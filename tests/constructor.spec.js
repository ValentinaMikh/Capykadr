const { test, expect } = require("@playwright/test");
async function mockAccount(page, signedIn = true) {
  await page.addInitScript(
    ({ signedIn }) => {
      window.__inserts = [];
      const user = {
        id: "test-user",
        email: "test@example.com",
        user_metadata: { name: "Дарья" },
      };
      const query = (data = []) => {
        const q = {
          then: (resolve) =>
            Promise.resolve({ data, error: null }).then(resolve),
        };
        return new Proxy(q, {
          get: (target, key) => (key === "then" ? target.then : () => q),
        });
      };
      Object.defineProperty(window, "supabase", {
        configurable: true,
        get: () => ({
          createClient: () => ({
            auth: {
              getSession: async () => ({
                data: { session: signedIn ? { user } : null },
              }),
              onAuthStateChange: () => {},
              signOut: async () => ({}),
              signInWithPassword: async () => ({ data: { user }, error: null }),
            },
            from: (name) => ({
              select: () => query(name === "profiles" ? { name: "Дарья" } : []),
              insert: (row) => {
                window.__inserts.push({ name, row });
                return query();
              },
            }),
            rpc: async () => ({ data: true }),
            storage: {
              from: () => ({ createSignedUrls: async () => ({ data: [] }) }),
            },
          }),
        }),
        set: () => {},
      });
    },
    { signedIn },
  );
}
async function openFamily(page) {
  await mockAccount(page);
  await page.goto("/");
  await expect(page.locator("#app")).toBeVisible();
  await expect(page.locator("#chooseBtn")).toBeDisabled();
  for (const who of ["dad", "mom", "son"])
    await page.locator(`[data-cast="${who}"]`).click();
}
async function assetsLoad(page) {
  await expect
    .poll(() =>
      page
        .locator("#v-builder img:visible")
        .evaluateAll((images) =>
          images.every((i) => i.complete && i.naturalWidth > 0),
        ),
    )
    .toBe(true);
}
async function capture(page, testInfo, name) {
  await page.evaluate(() => document.fonts.ready);
  await assetsLoad(page);
  await page.screenshot({
    path: testInfo.outputPath(name + ".png"),
    fullPage: true,
  });
}
test("login matches form structure and validates inputs", async ({
  page,
}, testInfo) => {
  await mockAccount(page, false);
  await page.goto("/");
  await expect(page.locator("#gateForm")).toBeVisible();
  await expect(page.locator("#gName")).toBeVisible();
  await page.locator("#gBtn").click();
  await expect(page.locator("#gErr")).toHaveText("Проверьте почту");
  await page.locator("#gEmail").fill("team@example.com");
  await page.locator("#gBtn").click();
  await expect(page.locator("#gErr")).toHaveText("Введите пароль");
  await page.locator('[data-gm="up"]').click();
  await expect(page.locator("#gPassL")).toHaveText("Пароль команды");
  await page.locator('[data-gm="in"]').click();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: testInfo.outputPath("login.png"),
    fullPage: true,
  });
});
test("complete family, every season, scene, references, custom prompt and persistence", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openFamily(page);
  await capture(page, testInfo, "characters");
  await page.locator("#chooseBtn").click();
  await expect(page.locator("#chooseBtn")).toBeDisabled();
  for (const season of ["spring", "summer", "autumn", "winter"]) {
    await page.locator(`[data-season="${season}"]`).click();
    await capture(page, testInfo, season);
    const outfits = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("capykadr-state-v1")).chars.map(
        (c) => c.outfit,
      ),
    );
    expect(outfits).toEqual(
      ["dad", "mom", "son"].map(
        (w) => `${w}-${season === "spring" ? "base" : season}`,
      ),
    );
  }
  await expect(page.locator('[data-season="newyear"]')).toBeDisabled();
  await page.locator('[data-season="autumn"]').click();
  await page.locator("#chooseBtn").click();
  await expect(page.locator("#chooseBtn")).toBeDisabled();
  await page.locator('[data-scene="cafe"]').click();
  await capture(page, testInfo, "scenes");
  await page.locator("#chooseBtn").click();
  await expect(page.locator(".prompt-panel pre")).toContainText(
    "cozy cafe interior",
  );
  await expect(page.locator("[data-dl]")).toHaveCount(4);
  await capture(page, testInfo, "prompt");
  const download = page.waitForEvent("download");
  await page.locator('[data-dl="0"]').click();
  expect((await download).suggestedFilename()).toBe("1-dad-base.png");
  await page.locator('[data-step="1"]').click();
  await page.locator('[data-step="3"]').click();
  await expect(page.locator(".prompt-panel pre")).toContainText(
    "cozy cafe interior",
  );
  await page.locator('[data-step="2"]').click();
  await page.locator("#describeAction").click();
  await page.locator("#sceneExtra").fill("A blue cup on the table");
  await page.locator("#sceneFrame").selectOption("16:9");
  await page
    .locator("#sceneForm")
    .getByRole("button", { name: "Выбрать", exact: true })
    .click();
  await expect(page.locator(".prompt-panel pre")).toContainText(
    "A blue cup on the table",
  );
  await expect(page.locator(".prompt-panel pre")).toContainText(
    "horizontal 16:9",
  );
  await page.evaluate(() => {
    navigator.clipboard.writeText = async (t) => {
      window.__copied = t;
    };
  });
  await page.locator("#copyBtn").click();
  await expect
    .poll(() => page.evaluate(() => window.__copied))
    .toContain("A blue cup");
  expect(
    await page.evaluate(() =>
      window.__inserts.some((x) => x.name === "prompt_history"),
    ),
  ).toBe(true);
  await page.reload();
  await page.locator('[data-step="3"]').click();
  await expect(page.locator(".prompt-panel pre")).toContainText("A blue cup");
  expect(errors).toEqual([]);
});
for (const width of [390, 768, 1024, 1440])
  test(`all steps fit viewport ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 920 });
    await openFamily(page);
    await capture(page, testInfo, "characters-" + width);
    await page.locator("#chooseBtn").click();
    await page.locator('[data-season="autumn"]').click();
    for (const step of [1, 2, 3]) {
      await page.locator(`[data-step="${step}"]`).click();
      await capture(page, testInfo, "step-" + step + "-" + width);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
  });
test("deselecting every character blocks continuation", async ({ page }) => {
  await openFamily(page);
  for (const who of ["dad", "mom", "son"])
    await page.locator(`[data-cast="${who}"]`).click();
  await expect(page.locator("#chooseBtn")).toBeDisabled();
  await expect(page.locator('[data-step="1"]')).toBeDisabled();
  await page.reload();
  await expect(page.locator("#chooseBtn")).toBeDisabled();
});
