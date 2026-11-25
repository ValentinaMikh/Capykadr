const { test, expect } = require("@playwright/test");
async function mockAccount(page, signedIn = true, gallery = {}) {
  await page.addInitScript(
    ({ signedIn, gallery }) => {
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
        const proxy = new Proxy(q, {
          get: (target, key) => (key === "then" ? target.then : () => proxy),
        });
        return proxy;
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
              select: (fields) =>
                query(
                  name === "profiles"
                    ? fields === "name,role"
                      ? { name: "Дарья" }
                      : gallery.profiles || []
                    : name === "publications"
                      ? gallery.publications || []
                      : name === "publication_likes"
                        ? gallery.likes || []
                        : [],
                ),
              delete: () => query(),
              update: () => query(),
              insert: (row) => {
                window.__inserts.push({ name, row });
                return query();
              },
            }),
            rpc: async () => ({ data: true }),
            storage: {
              from: () => ({
                createSignedUrls: async (paths) => ({
                  data: paths.map((path) => ({
                    signedUrl: path.startsWith("assets/")
                      ? path
                      : "assets/figma/268b2.png",
                  })),
                }),
                remove: async () => ({ error: null }),
              }),
            },
          }),
        }),
        set: () => {},
      });
    },
    { signedIn, gallery },
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
  expect(
    await page.evaluate(() =>
      [...document.fonts].some(
        (f) => f.family === "Roboto Flex" && f.status === "loaded",
      ),
    ),
  ).toBe(true);
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
  await expect(page.locator(".gate .logo")).toBeInViewport();
  expect(
    await page
      .locator(".gate .logo")
      .evaluate((el) => el.getBoundingClientRect().top),
  ).toBe(44);
  await page.locator("#gBtn").click();
  await expect(page.locator("#gErr")).toHaveText("Проверьте почту");
  await page.locator("#gEmail").fill("team@example.com");
  await page.locator("#gBtn").click();
  await expect(page.locator("#gErr")).toHaveText("Введите пароль");
  const labels = await page.locator("#gateF label").allTextContents();
  const loginButton = await page.locator("#gBtn").boundingBox();
  await page.locator('[data-gm="up"]').click();
  expect(await page.locator("#gateF label").allTextContents()).toEqual(labels);
  await expect(page.locator("#gPassL")).toHaveText("Пароль");
  const registrationButton = await page.locator("#gBtn").boundingBox();
  expect(registrationButton.width / loginButton.width).toBeCloseTo(0.8, 2);
  expect(registrationButton.height / loginButton.height).toBeCloseTo(0.8, 2);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: testInfo.outputPath("registration.png"),
    fullPage: true,
  });
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

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
  { width: 3840, height: 2160 },
]) {
  test(`wide constructor follows the Figma anchors at ${viewport.width}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await openFamily(page);
    await page.locator("#chooseBtn").click();
    const preview = await page.locator(".family-preview").boundingBox();
    expect(preview.x).toBeCloseTo(708 + (viewport.width - 1920) / 2, 0);
    expect(preview.y).toBeCloseTo(204, 0);
    expect(preview.width).toBe(548);
    expect(preview.height).toBe(537);
    const seasons = await page.locator(".season-list").boundingBox();
    expect(seasons.x).toBeCloseTo(349 + (viewport.width - 1920) / 2, 0);
    const choose = await page.locator("#chooseBtn").boundingBox();
    expect(choose.y + choose.height + 20).toBeCloseTo(
      (await page.locator(".step-nav").boundingBox()).y,
      0,
    );
    const nav = await page.locator(".step-nav").boundingBox();
    expect(viewport.height - nav.y - nav.height).toBeCloseTo(38, 0);
    await capture(page, testInfo, "wide-season-" + viewport.width);
    for (const step of [0, 2, 3]) {
      await page.locator(`[data-step="${step}"]`).click();
      await capture(page, testInfo, "wide-step-" + step + "-" + viewport.width);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(viewport.width);
      expect(
        await page.evaluate(() => document.documentElement.scrollHeight),
      ).toBeLessThanOrEqual(viewport.height);
    }
  });
}

test("example photo opens an accessible preview with copy, favourite and apply", async ({
  page,
}, testInfo) => {
  await openFamily(page);
  await page.locator("#chooseBtn").click();
  await page.locator('[data-season="autumn"]').click();
  const example = page.locator('[data-example="3e23f.png"]');
  await example.click();
  const dialog = page.getByRole("dialog", {
    name: "Урожай яблок",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".photo-full")).toHaveAttribute(
    "src",
    "assets/figma/3e23f.png",
  );
  await expect(dialog.locator(".photo-prompt")).toContainText(
    "a wicker basket filled with red and green apples",
  );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: testInfo.outputPath("example-modal.png"),
    fullPage: true,
  });
  await page.evaluate(() => {
    navigator.clipboard.writeText = async (t) => {
      window.__copied = t;
    };
  });
  await dialog.locator('[data-photo-action="copy"]').click();
  await expect
    .poll(() => page.evaluate(() => window.__copied))
    .toContain("wicker basket");
  await dialog.locator('[data-photo-action="like"]').click();
  await expect(dialog.locator(".photo-like")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(example).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  await example.click();
  await expect(page.locator(".photo-like")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator('[data-photo-action="apply"]').click();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("capykadr-state-v1")).chars.map(
        (c) => c.who,
      ),
    ),
  ).toEqual(["son"]);
  await expect(page.locator(".prompt-panel pre")).toContainText(
    "wicker basket",
  );
});

function galleryFixture() {
  const state = {
    chars: [
      {
        who: "dad",
        outfit: "dad-autumn",
        pose: "hold",
        emo: "auto",
        x: 50,
        y: 86,
        object: "a cake",
      },
    ],
    location: "cafe",
    light: "golden",
    frame: "1:1",
    camera: "auto",
    textzone: "none",
    action: "none",
    product: "",
    extra: "",
    designSeason: "autumn",
    designScene: "custom",
  };
  const prompt =
    "Use the attached image as a strict capybara character reference. Keep the same face, outfit, proportions and 3D style. " +
    "A capybara holding a cake in a cozy cafe. ".repeat(30);
  return {
    publications: Array.from({ length: 21 }, (_, i) => ({
      id: "pub-" + i,
      user_id: "author",
      title: i ? "Работа " + (i + 1) : "Покупка торта",
      image_path: "assets/figma/268b2.png",
      created_at: "2026-10-27T08:30:00Z",
      state,
      prompt,
      hidden: false,
    })),
    likes: Array.from({ length: 15 }, (_, i) => ({
      pub_id: "pub-0",
      user_id: "member-" + i,
    })),
    profiles: [{ id: "author", name: "Valentina" }],
  };
}
test("gallery grid, pagination, filters and publication modal retain their actions", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1074 });
  await mockAccount(page, true, galleryFixture());
  await page.goto("/#gallery");
  await expect(page.locator(".gallery-card")).toHaveCount(15);
  const first = page.locator(".gallery-card").first();
  const rect = await first.boundingBox();
  expect(rect.x).toBe(64);
  expect(rect.y).toBe(220);
  await expect(first.locator(".gallery-likes")).toHaveText("15");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: testInfo.outputPath("gallery.png"),
    fullPage: true,
  });
  await first.click();
  const dialog = page.getByRole("dialog", {
    name: "Покупка торта",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("gallery-modal.png"),
    fullPage: true,
  });
  await dialog.locator(".photo-like").click();
  await expect(dialog.locator(".photo-like")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.keyboard.press("Escape");
  await expect(first.locator(".gallery-likes")).toHaveText("16");
  await expect(first).toBeFocused();
  await page.locator('[data-gallery-page="2"]').click();
  await expect(page.locator(".gallery-card")).toHaveCount(6);
  await page.locator("#galleryFilterToggle").click();
  await expect(page.locator("#galleryFilters")).toBeVisible();
  await page.locator('[data-s="mine"]').click();
  await expect(page.locator(".gallery-card")).toHaveCount(0);
  await page.locator('[data-s="new"]').click();
  await expect(page.locator(".gallery-card")).toHaveCount(15);
  await page.locator("#galleryFilterToggle").click();
  await page.locator(".gallery-card").first().click();
  await page.locator('[data-photo-action="apply"]').click();
  await expect(page.locator(".prompt-panel pre")).toContainText(
    "cozy cafe interior",
  );
});
for (const viewport of [
  { width: 390, height: 844 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
])
  test(`gallery and photo preview fit ${viewport.width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await mockAccount(page, true, galleryFixture());
    await page.goto("/#gallery");
    await expect(page.locator(".gallery-card")).toHaveCount(15);
    await page.locator(".gallery-card").first().click();
    await expect(page.locator(".photo-modal")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(viewport.width);
    const image = await page.locator(".photo-full").boundingBox();
    expect(image.width).toBeCloseTo(image.height, 0);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: testInfo.outputPath("photo-modal-" + viewport.width + ".png"),
      fullPage: true,
    });
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(
        () => !!document.activeElement.closest(".photo-modal"),
      ),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.locator(".photo-modal")).toHaveCount(0);
  });

test("wide screens with browser toolbars keep the step navigation visible", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1920, height: 900 });
  await openFamily(page);
  await page.locator("#chooseBtn").click();
  const nav = await page.locator(".step-nav").boundingBox();
  expect(900 - nav.y - nav.height).toBeCloseTo(38, 0);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(
    900,
  );
  await capture(page, testInfo, "wide-short-window");
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 920 },
  { width: 1920, height: 1080 },
]) {
  test(`builder dock stays centred above the page while scrolling at ${viewport.width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await openFamily(page);
    const dock = page.locator("#builderDock");
    await expect
      .poll(() =>
        page.evaluate(() =>
          parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue(
              "--builder-dock-height",
            ),
          ),
        ),
      )
      .toBeGreaterThan(0);
    const before = await dock.boundingBox();
    expect(before.x + before.width / 2).toBeCloseTo(viewport.width / 2, 0);
    expect(viewport.height - before.y - before.height).toBeCloseTo(
      viewport.width >= 1920 ? 38 : viewport.width <= 900 ? 24 : 36,
      0,
    );
    await page.evaluate(() => {
      document.getElementById("steps").style.minHeight = "1800px";
      window.scrollTo(0, 600);
    });
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(0);
    const after = await dock.boundingBox();
    expect(after.x).toBeCloseTo(before.x, 1);
    expect(after.y).toBeCloseTo(before.y, 1);
    await page.screenshot({
      path: testInfo.outputPath("fixed-dock-" + viewport.width + ".png"),
    });
    await page.locator("#chooseBtn").click();
    await expect(page.locator(".season-list")).toBeVisible();
    await page.locator('[data-season="autumn"]').click();
    await page.locator("#chooseBtn").click();
    const actions = await page.locator("#builderActions").boundingBox(),
      nav = await page.locator(".step-nav").boundingBox();
    expect(actions.y + actions.height).toBeLessThanOrEqual(nav.y);
    await page.locator('.nav [data-v="gallery"]').click();
    await expect(dock).toBeHidden();
  });
}
