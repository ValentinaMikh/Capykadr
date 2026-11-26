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
          then: async (resolve) => {
            if (gallery.delay)
              await new Promise((done) => setTimeout(done, gallery.delay));
            return resolve({
              data: typeof data === "function" ? await data() : data,
              error: null,
            });
          },
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
                        : name === "ref_images"
                          ? async () =>
                              window.__getRefRows
                                ? await window.__getRefRows()
                                : gallery.refImages || []
                          : [],
                ),
              upsert: async (row) => {
                window.__inserts.push({ name, row });
                if (name === "ref_images" && window.__setRefRow)
                  return window.__setRefRow(row);
                return { error: null };
              },
              delete: () => query(),
              update: () => query(),
              insert: (row) => {
                if (gallery.likeError && name === "publication_likes")
                  return Promise.resolve({
                    error: { message: "Test save failure" },
                  });
                window.__inserts.push({ name, row });
                return query();
              },
            }),
            rpc: async () => ({ data: gallery.admin !== false }),
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
    animations: "disabled",
    path: testInfo.outputPath(name + ".png"),
    fullPage: true,
  });
}
test("login and registration match the latest Figma forms and validate inputs", async ({
  page,
}, testInfo) => {
  await mockAccount(page, false);
  await page.goto("/");
  await expect(page.locator("#gateForm")).toBeVisible();
  await expect(page.locator("#gName")).toBeHidden();
  await page.evaluate(() => document.fonts.ready);
  const box = (selector) => page.locator(selector).boundingBox();
  expect((await box(".gate .logo")).y).toBe(44);
  expect((await box("#gEmail")).y).toBe(333);
  expect((await box("#gPass")).y).toBe(437);
  expect(await box("#gBtn")).toMatchObject({
    x: 518,
    y: 569,
    width: 404,
    height: 58,
  });
  await capture(page, testInfo, "login");
  await page.locator("#gBtn").click();
  await expect(page.locator("#gErr")).toHaveText("Проверьте почту");
  await page.locator("#gEmail").fill("team@example.com");
  await page.locator("#gBtn").click();
  await expect(page.locator("#gErr")).toHaveText("Введите пароль");
  await page.locator('[data-gm="up"]').click();
  await expect(page.locator("#gName")).toBeVisible();
  await expect(page.locator("#gPassL")).toHaveText("Пароль");
  await expect(page.locator("#gForgot")).toBeVisible();
  await expect(page.locator("#gConsentAction")).toHaveText(
    "Зарегистрироваться",
  );
  expect((await box("#gName")).y).toBe(333);
  expect((await box("#gEmail")).y).toBe(437);
  expect((await box("#gPass")).y).toBe(541);
  expect(await box("#gBtn")).toMatchObject({
    x: 518,
    y: 660,
    width: 404,
    height: 58,
  });
  await page.locator("#gEmail").fill("");
  await capture(page, testInfo, "registration");
  await page.locator("#gEmail").fill("team@example.com");
  await page.locator("#gPass").fill("example-password");
  await page.locator("#gBtn").click();
  await expect(page.locator("#gErr")).toContainText("Как вас зовут?");
  await expect(page.locator("#gBtn")).toBeEnabled();
  await page.locator('[data-gm="in"]').click();
  await expect(page.locator("#gName")).toBeHidden();
  await expect(page.locator("#gErr")).toBeEmpty();
});
for (const width of [390, 1920])
  test(`authentication forms fit ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 920 });
    await mockAccount(page, false);
    await page.goto("/");
    await expect(page.locator("#gateForm")).toBeVisible();
    for (const mode of ["in", "up"]) {
      await page.locator(`[data-gm="${mode}"]`).click();
      await expect(page.locator("#gBtn")).toBeInViewport();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await capture(page, testInfo, `auth-${mode}-${width}`);
    }
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
  await expect(page.locator('[data-season="newyear"]')).toBeEnabled();
  await page.locator('[data-season="autumn"]').click();
  await page.locator("#chooseBtn").click();
  await expect(page.locator("#chooseBtn")).toBeDisabled();
  await page.locator('[data-scene="cafe"]').click();
  await capture(page, testInfo, "scenes");
  await page.locator("#chooseBtn").click();
  await expect(page.locator(".prompt-panel pre")).toContainText(
    "cozy cafe interior",
  );
  await expect(page.locator("[data-dl]")).toHaveCount(5);
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
  test(`wide working area stays centred in the viewport at ${viewport.width}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await openFamily(page);
    await page.locator("#chooseBtn").click();
    const preview = await page.locator(".family-preview").boundingBox();
    expect(preview.x).toBeCloseTo((viewport.width - 1290) / 2 + 359, 0);
    expect(preview.y).toBeCloseTo((viewport.height - 625) / 2, 0);
    expect(preview.width).toBe(548);
    expect(preview.height).toBe(537);
    const seasons = await page.locator(".season-list").boundingBox();
    expect(seasons.x).toBeCloseTo((viewport.width - 1290) / 2, 0);
    const choose = await page.locator("#chooseBtn").boundingBox();
    expect(choose.y + choose.height + 20).toBeCloseTo(
      (await page.locator(".step-nav").boundingBox()).y,
      0,
    );
    const nav = await page.locator(".step-nav").boundingBox();
    expect(viewport.height - nav.y - nav.height).toBeCloseTo(38, 0);
    const seasonArea = await page.locator(".season-layout").boundingBox();
    expect(seasonArea.x + seasonArea.width / 2).toBeCloseTo(
      viewport.width / 2,
      0,
    );
    expect(seasonArea.y + seasonArea.height / 2).toBeCloseTo(
      viewport.height / 2,
      0,
    );
    await capture(page, testInfo, "wide-season-" + viewport.width);
    for (const step of [0, 2, 3]) {
      await page.locator(`[data-step="${step}"]`).click();
      const workingArea = await page.locator("#steps > div").boundingBox();
      expect(workingArea.x + workingArea.width / 2).toBeCloseTo(
        viewport.width / 2,
        0,
      );
      expect(workingArea.y + workingArea.height / 2).toBeCloseTo(
        viewport.height / 2,
        0,
      );
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
  await expect(dialog).toHaveCSS("background-color", "rgb(0, 0, 0)");
  await expect(dialog.locator(".photo-full")).toHaveAttribute(
    "src",
    "assets/figma/3e23f.png",
  );
  await expect(dialog.locator(".photo-prompt")).toContainText(
    "a wicker basket filled with red and green apples",
  );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    animations: "disabled",
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
  await expect(page.locator(".photo-like img")).toHaveAttribute(
    "src",
    /34c49.svg$/,
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
  expect(rect.y).toBe(192);
  await expect(page.locator("#galleryFilterToggle")).toHaveText("Фильтры");
  expect(
    await page.locator("#galleryFilterToggle").boundingBox(),
  ).toMatchObject({ x: 73.5, y: 127, width: 152, height: 51 });
  await expect(first.locator(".gallery-likes")).toHaveText("15");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("gallery.png"),
    fullPage: true,
  });
  await first.click();
  const dialog = page.getByRole("dialog", {
    name: "Покупка торта",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveCSS("background-color", "rgb(0, 0, 0)");
  await page.screenshot({
    animations: "disabled",
    path: testInfo.outputPath("gallery-modal.png"),
    fullPage: true,
  });
  await expect(dialog.locator(".photo-like img")).toHaveAttribute(
    "src",
    /6cefc.svg$/,
  );
  await dialog.locator(".photo-like").click();
  await expect(dialog.locator(".photo-like")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(dialog.locator(".photo-like img")).toHaveAttribute(
    "src",
    /34c49.svg$/,
  );
  await capture(page, testInfo, "gallery-liked");
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
      animations: "disabled",
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
      animations: "disabled",
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

for (const viewport of [
  { width: 720, height: 920 },
  { width: 420, height: 1086 },
]) {
  test(`responsive prompt follows Figma at ${viewport.width}px and keeps scrollable actions usable`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await openFamily(page);
    await page.locator("#chooseBtn").click();
    await page.locator('[data-season="autumn"]').click();
    await page.locator('[data-step="2"]').click();
    await page.locator('[data-scene="leaves"]').click();
    await page.locator("#chooseBtn").click();
    await page.evaluate(() => document.fonts.ready);
    await assetsLoad(page);
    const box = (selector) => page.locator(selector).boundingBox();
    expect(await box(".top")).toMatchObject({ height: 95 });
    expect(await box(".top .brand-icon")).toMatchObject({
      width: 41,
      height: 41,
      y: 25,
    });
    expect(await box(".ubtn")).toMatchObject({ width: 41, height: 41, y: 25 });
    expect((await box(".nav")).y).toBe(25);
    const prompt = await box(".prompt-panel");
    expect(prompt.width).toBeCloseTo(372.996, 1);
    expect(prompt.height).toBeCloseTo(408.084, 1);
    expect(prompt.y).toBe(viewport.width === 420 ? 98 : 99);
    expect(prompt.x).toBeCloseTo(viewport.width === 420 ? 24 : 329, 0);
    const refs = await box(".reference-panel");
    expect(refs.y).toBeCloseTo(viewport.width === 420 ? 546 : 95, 0);
    const examples = await box(".result-layout .examples");
    expect(examples.y).toBeCloseTo(viewport.width === 420 ? 738 : 538, 0);
    const downloadIcon = await box('[data-dl="0"] span img');
    expect(downloadIcon.width).toBeCloseTo(38.8418, 2);
    expect(downloadIcon.height).toBeCloseTo(38.8418, 2);
    expect(
      await page.locator(".ubtn img").evaluate((img) => img.currentSrc),
    ).toMatch(/e972a.svg$/);
    const button = await box("#copyBtn");
    expect(button.width).toBe(402);
    expect(button.height).toBe(72);
    const nav = await box(".step-nav");
    expect(nav.width).toBeCloseTo(349.354, 1);
    expect(nav.y + nav.height).toBeCloseTo(
      viewport.height - (viewport.width === 420 ? 44 : 36),
      1,
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(viewport.width);
    await page.screenshot({
      animations: "disabled",
      path: testInfo.outputPath("responsive-prompt-" + viewport.width + ".png"),
    });
    const pre = page.locator(".prompt-panel pre");
    await pre.evaluate((el) => (el.scrollTop = 300));
    expect(await pre.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await expect
      .poll(() =>
        page
          .locator(".prompt-panel")
          .evaluate((el) =>
            parseFloat(el.style.getPropertyValue("--prompt-thumb-offset")),
          ),
      )
      .toBeGreaterThan(0);
    const examplesGrid = page.locator(".result-layout .example-grid");
    await examplesGrid.evaluate((el) => (el.scrollLeft = 400));
    expect(await examplesGrid.evaluate((el) => el.scrollLeft)).toBeGreaterThan(
      0,
    );
    if (viewport.width === 420) {
      const grid = page.locator(".reference-grid");
      await grid.evaluate((el) => (el.scrollLeft = 500));
      expect(await grid.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
      const download = page.waitForEvent("download");
      await page.locator('[data-dl="3"]').click();
      expect((await download).suggestedFilename()).toContain("4-");
    }
    await page.evaluate(() => {
      navigator.clipboard.writeText = async (value) =>
        (window.__copied = value);
    });
    await page.locator("#copyBtn").click();
    await expect
      .poll(() => page.evaluate(() => window.__copied))
      .toContain("character reference");
  });
}

for (const width of [1440, 390]) {
  test(`one or two selected characters stay centred at ${width}px in every season`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1080 });
    await mockAccount(page);
    await page.goto("/");
    for (const selected of [
      ["dad"],
      ["mom"],
      ["son"],
      ["dad", "mom"],
      ["dad", "son"],
      ["mom", "son"],
    ]) {
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      for (const who of selected)
        await page.locator(`[data-cast="${who}"]`).click();
      await page.locator("#chooseBtn").click();
      const verifyPositions = async () => {
        const preview = await page.locator(".family-preview").boundingBox();
        const art = await page.locator(".family-art").boundingBox();
        await expect(page.locator(".family-art > div")).toHaveCount(
          selected.length,
        );
        for (let i = 0; i < selected.length; i++) {
          const character = await page
            .locator(`.family-${selected[i]}`)
            .boundingBox();
          const center = character.x + character.width / 2;
          expect(center).toBeCloseTo(
            art.x +
              art.width * (selected.length === 1 ? 0.5 : i === 0 ? 0.35 : 0.65),
            0,
          );
          if (selected.length === 1)
            expect(character.y + character.height / 2).toBeCloseTo(
              preview.y + preview.height / 2,
              0,
            );
          expect(character.y).toBeGreaterThanOrEqual(preview.y);
          expect(character.y + character.height).toBeLessThanOrEqual(
            preview.y + preview.height + 1,
          );
        }
      };
      await verifyPositions();
      await capture(page, testInfo, `selected-${selected.join("-")}-${width}`);
      for (const season of ["spring", "summer", "autumn", "winter"]) {
        await page.locator(`[data-season="${season}"]`).click();
        await verifyPositions();
      }
    }
  });
}

test("New Year uses the supplied outfit reference and survives reload", async ({
  page,
}, testInfo) => {
  await openFamily(page);
  await page.locator("#chooseBtn").click();
  await page.locator('[data-season="newyear"]').click();
  await expect(page.locator(".newyear-outfit-preview")).toBeVisible();
  await expect(page.locator(".newyear-outfit-preview")).toHaveAttribute(
    "src",
    "assets/figma/capybara-style-v2.png",
  );
  await capture(page, testInfo, "newyear-outfit");
  await page.locator("#chooseBtn").click();
  await page.locator('[data-scene="walk"]').click();
  await page.locator("#chooseBtn").click();
  const prompt = page.locator(".prompt-panel pre");
  await expect(prompt).toContainText("softly rounded head");
  await expect(prompt).toContainText("sage-green knitted scarf");
  await expect(prompt).toContainText("latest style image takes priority");
  await expect(prompt).toContainText("bare furry legs and rounded bare feet");
  await expect(prompt).toContainText("New Year celebration");
  await expect(prompt).toContainText("match Image 4");
  await expect(prompt).toContainText(
    "Image 5 = visual style and holiday outfit reference",
  );
  await expect(page.locator("[data-dl]")).toHaveCount(5);
  const download = page.waitForEvent("download");
  await page.locator('[data-dl="4"]').click();
  expect((await download).suggestedFilename()).toBe("5-newyear-outfit.png");
  await page.evaluate(() => {
    navigator.clipboard.writeText = async (text) => (window.__copied = text);
  });
  await page.locator("#copyBtn").click();
  await expect
    .poll(() => page.evaluate(() => window.__copied))
    .toContain("white snowflakes");
  await page.reload();
  await page.locator('[data-step="3"]').click();
  await expect(prompt).toContainText("sage-green knitted scarf");
  await expect(prompt).toContainText("latest style image takes priority");
  await expect(prompt).toContainText("bare furry legs and rounded bare feet");
  await capture(page, testInfo, "newyear-prompt");
});

test("playful loading, hover and confirmed like effects clean up without changing actions", async ({
  page,
}, testInfo) => {
  await mockAccount(page, true, { ...galleryFixture(), delay: 120 });
  await page.goto("/#gallery");
  await expect(page.locator(".gallery-skeleton")).toHaveCount(15);
  await expect(page.locator("#gList")).toHaveAttribute("aria-busy", "true");
  await expect(page.locator(".gallery-card")).toHaveCount(15);
  await expect(page.locator("#gList")).toHaveAttribute("aria-busy", "false");
  const card = page.locator(".gallery-card").first();
  await card.hover();
  expect(
    await card.evaluate((el) => getComputedStyle(el, "::after").content),
  ).toBe("none");
  await expect(card).toHaveCSS("box-shadow", "none");
  await card.click();
  await page.locator(".photo-like").click();
  await expect(page.locator(".photo-like")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".ui-heart")).toHaveCount(6);
  await expect(page.locator("#uiEffects")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  expect(
    await page
      .locator("#uiEffects")
      .evaluate((el) => getComputedStyle(el).pointerEvents),
  ).toBe("none");
  await page.waitForTimeout(100);
  await page.screenshot({
    path: testInfo.outputPath("like-hearts.png"),
    animations: "allow",
  });
  await expect(page.locator(".ui-heart")).toHaveCount(0);
  await page.locator(".photo-like").click();
  await expect(page.locator(".photo-like")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(page.locator(".ui-heart")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(card).toBeFocused();
});
test("reduced motion keeps likes and copying usable without particles or animation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockAccount(page, true, galleryFixture());
  await page.goto("/#gallery");
  const card = page.locator(".gallery-card").first();
  await card.hover();
  expect(
    await card.evaluate((el) => getComputedStyle(el, "::after").animationName),
  ).toBe("none");
  await card.click();
  await page.locator(".photo-like").click();
  await expect(page.locator(".photo-like")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".ui-heart")).toHaveCount(0);
  await expect(page.locator(".ui-press-ring")).toHaveCount(0);
  await page.evaluate(() => {
    navigator.clipboard.writeText = async (value) => (window.__copied = value);
  });
  await page.locator('[data-photo-action="copy"]').click();
  await expect
    .poll(() => page.evaluate(() => window.__copied))
    .toContain("capybara");
});
test("a rejected like does not celebrate or change the saved state", async ({
  page,
}) => {
  await mockAccount(page, true, { ...galleryFixture(), likeError: true });
  await page.goto("/#gallery");
  await page.locator(".gallery-card").first().click();
  await page.locator(".photo-like").click();
  await expect(page.locator("#toast")).toHaveText(
    "Не удалось сохранить отметку",
  );
  await expect(page.locator(".photo-like")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(page.locator(".photo-like")).toBeEnabled();
  await expect(page.locator(".ui-heart")).toHaveCount(0);
});

test("character shimmer stays behind artwork and only the newly selected character grows", async ({
  page,
}, testInfo) => {
  await mockAccount(page);
  await page.goto("/");
  const dad = page.locator('[data-cast="dad"]');
  await dad.hover();
  await expect
    .poll(() =>
      dad
        .locator(".character-image")
        .evaluate((el) => parseFloat(getComputedStyle(el, "::before").opacity)),
    )
    .toBeGreaterThan(0.9);
  expect(
    await dad
      .locator(".portrait")
      .evaluate((el) => getComputedStyle(el).zIndex),
  ).toBe("1");
  expect(
    await dad
      .locator(".character-image")
      .evaluate((el) => getComputedStyle(el, "::before").zIndex),
  ).toBe("0");
  await dad.click();
  await expect(dad.locator(".portrait img")).toHaveClass(
    /ui-character-selected/,
  );
  expect(
    await dad
      .locator(".portrait img")
      .evaluate((el) => getComputedStyle(el).rotate),
  ).toBe("none");
  const mom = page.locator('[data-cast="mom"]');
  await mom.click();
  await expect(mom.locator(".portrait img")).toHaveClass(
    /ui-character-selected/,
  );
  await expect(dad.locator(".portrait img")).not.toHaveClass(
    /ui-character-selected/,
  );
  await expect(page.locator(".ui-character-selected")).toHaveCount(0);
  await page.locator("#chooseBtn").click();
  await page.locator('[data-step="2"]').click();
  const scene = page.locator('[data-scene="walk"]');
  await scene.hover();
  expect(
    await scene
      .locator(".scene-image")
      .evaluate((el) => getComputedStyle(el, "::after").content),
  ).toBe("none");
  await expect(scene.locator(".scene-image")).toHaveCSS("box-shadow", "none");
  await page.screenshot({
    path: testInfo.outputPath("scene-without-overlay.png"),
    animations: "disabled",
  });
});

for (const width of [1440, 420])
  test(`white-background modes preserve choices and copy without scene overrides at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1080 });
    await openFamily(page);
    await page.locator("#chooseBtn").click();
    await page.locator('[data-season="newyear"]').click();
    await page.locator("#chooseBtn").click();
    await page.getByLabel("На белом фоне", { exact: true }).check();
    await expect(page.locator(".scene-grid")).toHaveCount(0);
    await expect(page.locator("#describeAction")).toHaveCount(0);
    await page.locator("#whiteTurn").selectOption("left");
    await page.locator("#whiteGaze").selectOption("up");
    await capture(page, testInfo, "white-controls-" + width);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.locator("#chooseBtn").click();
    await expect(page.locator(".prompt-panel pre")).toContainText(
      "full left-facing profile",
    );
    await expect(page.locator(".prompt-panel pre")).toContainText(
      "eyes looking slightly upward",
    );
    await expect(page.locator(".prompt-panel pre")).toContainText(
      "solid pure white (#FFFFFF)",
    );
    await page.locator('[data-step="2"]').click();
    await page.locator("#whiteTurn").selectOption("back");
    await expect(page.locator("#whiteGaze")).toBeDisabled();
    await page.locator("#whitePose").selectOption("reference");
    await expect(page.locator("#whiteTurn")).toHaveCount(0);
    await expect(page.locator(".source-pose-hint")).toContainText(
      "последним изображением",
    );
    await page.locator("#chooseBtn").click();
    await expect(page.locator(".reference-external")).toContainText(
      "Приложите изображением 6",
    );
    await expect(page.locator("[data-dl]")).toHaveCount(5);
    await expect(page.locator(".prompt-panel pre")).toContainText(
      "Pose source: Image 6",
    );
    await page.evaluate(() => {
      navigator.clipboard.writeText = async (value) =>
        (window.__copied = value);
    });
    await page.locator("#copyBtn").click();
    await expect
      .poll(() => page.evaluate(() => window.__copied))
      .toContain("joint angles and paw positions");
    await page.reload();
    await page.locator('[data-step="3"]').click();
    await expect(page.locator(".prompt-panel pre")).toContainText(
      "Pose source: Image 6",
    );
    await capture(page, testInfo, "white-source-" + width);
    await page.locator('[data-step="2"]').click();
    await page.getByLabel("На белом фоне", { exact: true }).uncheck();
    await expect(page.locator(".scene-grid")).toBeVisible();
  });

for (const width of [1440, 390])
  test(`new son references display and download unchanged at ${width}px despite legacy uploads`, async ({
    page,
  }, testInfo) => {
    const cases = [
      ["spring", "base"],
      ["summer", "summer"],
      ["autumn", "autumn"],
      ["winter", "winter"],
      ["newyear", "winter"],
    ];
    await page.setViewportSize({ width, height: 1080 });
    await mockAccount(page, true, {
      refImages: ["base", "summer", "autumn", "winter", "newyear"].map(
        (season) => ({
          id: "son-" + season,
          image_path: "assets/figma/268b2.png",
          updated_at: "2026-11-25T00:00:00Z",
        }),
      ),
    });
    await page.goto("/");
    await expect(
      page.locator('[data-cast="son"] .portrait img'),
    ).toHaveAttribute("src", /son-base-v3.png$/);
    await page.locator('[data-cast="son"]').click();
    await page.locator("#chooseBtn").click();
    for (const [season, file] of cases) {
      await page.locator('[data-step="1"]').click();
      await page.locator(`[data-season="${season}"]`).click();
      if (season !== "newyear") {
        await expect(page.locator(".family-son img")).toHaveAttribute(
          "src",
          new RegExp("son-" + file + "-v3.png$"),
        );
        await expect(page.locator(".family-son img")).toHaveCSS(
          "object-fit",
          "contain",
        );
      } else
        await expect(page.locator(".newyear-outfit-preview")).toHaveAttribute(
          "src",
          /son-winter-v3.png$/,
        );
      await capture(page, testInfo, `son-${season}-${width}`);
      await page.locator('[data-step="3"]').click();
      await expect(page.locator('[data-dl="0"] > img')).toHaveAttribute(
        "src",
        new RegExp("son-" + file + "-v3.png$"),
      );
      const downloaded = page.waitForEvent("download");
      await page.locator('[data-dl="0"]').click();
      const stream = await (await downloaded).createReadStream();
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const hash = (bytes) =>
        require("node:crypto").createHash("sha256").update(bytes).digest("hex");
      const expected = require("node:fs").readFileSync(
        require("node:path").join(
          __dirname,
          "../assets/son/son-" + file + "-v3.png",
        ),
      );
      expect(hash(Buffer.concat(chunks))).toBe(hash(expected));
    }
  });
test("later administrator uploads can replace the bundled son reference", async ({
  page,
}) => {
  await mockAccount(page, true, {
    refImages: [
      {
        id: "son-base",
        image_path: "assets/figma/268b2.png",
        updated_at: "2099-01-01T00:00:00Z",
      },
    ],
  });
  await page.goto("/");
  await page.locator('[data-cast="son"]').click();
  await page.locator('[data-step="3"]').click();
  await expect(page.locator('[data-dl="0"] > img')).toHaveAttribute(
    "src",
    "assets/figma/268b2.png",
  );
});

async function connectVersionRegistry(page, registry, admin = true) {
  await page.exposeFunction("__getRefRows", () => registry.rows);
  await page.exposeFunction("__setRefRow", (row) => {
    if (registry.fail || !admin) return { error: { message: "Denied" } };
    registry.rows = registry.rows.filter((r) => r.id !== row.id).concat(row);
    return { error: null };
  });
  await mockAccount(page, true, { admin });
}

test("admin switches the whole team, preserves drafts and restores current son images", async ({
  page,
  browser,
}, testInfo) => {
  const registry = { rows: [] };
  const colleagueContext = await browser.newContext();
  const colleague = await colleagueContext.newPage();
  try {
    await connectVersionRegistry(page, registry);
    await connectVersionRegistry(colleague, registry, false);
    await page.goto("/#admin");
    await colleague.goto("/");
    await expect(page.locator('[data-version="2"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(
      colleague.locator('[data-cast="son"] img').first(),
    ).toHaveAttribute("src", /son-base-v3/);
    await colleague.locator('[data-cast="son"]').click();
    await colleague.locator("#chooseBtn").click();
    await colleague.locator('[data-season="autumn"]').click();
    await page.locator('[data-version="1"]').click();
    await expect(page.locator('[data-version="1"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(registry.rows[0].image_path).toBe("versions/v1.json");
    await capture(page, testInfo, "admin-version-1");
    await colleague.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(colleague.locator("body")).toHaveAttribute(
      "data-constructor-version",
      "1",
    );
    await expect(
      colleague.locator('[data-cast="son"] img').first(),
    ).toHaveAttribute("src", /9870a.png/);
    await colleague.locator('[data-cast="dad"]').click();
    await colleague.locator("#chooseBtn").click();
    await colleague.locator('[data-season="winter"]').click();
    await expect(colleague.locator('[data-season="newyear"]')).toBeDisabled();
    await colleague.locator("#chooseBtn").click();
    await expect(
      colleague.getByLabel("На белом фоне", { exact: true }),
    ).toHaveCount(0);
    await colleague.locator('[data-scene="walk"]').click();
    await colleague.locator("#chooseBtn").click();
    await expect(colleague.locator(".prompt-panel pre")).toContainText(
      "boxy muzzle",
    );
    await expect(colleague.locator(".prompt-panel pre")).not.toContainText(
      "latest style image",
    );
    await page.locator('[data-version="2"]').click();
    await expect(page.locator('[data-version="2"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await colleague.clock.install();
    await colleague.clock.fastForward(31000);
    await expect(colleague.locator("body")).toHaveAttribute(
      "data-constructor-version",
      "2",
    );
    await expect(colleague.locator('[data-cast="son"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(colleague.locator('[data-cast="dad"]')).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await colleague.locator("#chooseBtn").click();
    await expect(colleague.locator('[data-season="autumn"]')).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(colleague.locator(".family-son img")).toHaveAttribute(
      "src",
      /son-autumn-v3/,
    );
    await page.reload();
    await expect(page.locator('[data-version="2"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  } finally {
    await colleagueContext.close();
  }
});

for (const width of [1440, 390])
  test(`original version uses frozen seasonal images and ignores current uploads at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1080 });
    const registry = {
      rows: [
        { id: "constructor-version", image_path: "versions/v1.json" },
        {
          id: "son-base",
          image_path: "assets/son/son-base-v3.png",
          updated_at: "2027-01-01",
        },
      ],
    };
    await connectVersionRegistry(page, registry);
    await page.goto("/");
    await page.locator('[data-cast="son"]').click();
    await page.locator("#chooseBtn").click();
    for (const [season, image] of [
      ["spring", "9870a"],
      ["summer", "4d195"],
      ["autumn", "2b890"],
      ["winter", "4a990"],
    ]) {
      await page.locator(`[data-season="${season}"]`).click();
      await expect(page.locator(".family-son img")).toHaveAttribute(
        "src",
        `assets/figma/${image}.png`,
      );
      await assetsLoad(page);
    }
    await capture(page, testInfo, `original-winter-${width}`);
    await page.locator("#chooseBtn").click();
    await page.locator('[data-scene="walk"]').click();
    await page.locator("#chooseBtn").click();
    await expect(page.locator(".prompt-panel pre")).toContainText(
      "boxy muzzle",
    );
    await expect(page.locator(".reference-panel img[src*='son-']")).toHaveCount(
      0,
    );
    await page.goto("/#admin");
    await expect(page.locator("[data-refkey]")).toHaveCount(0);
    await capture(page, testInfo, `admin-original-${width}`);
  });

test("failed team-version save keeps the active version and an ordinary member cannot switch", async ({
  page,
  browser,
}) => {
  const registry = { rows: [], fail: true };
  await connectVersionRegistry(page, registry);
  await page.goto("/#admin");
  await page.locator('[data-version="1"]').click();
  await expect(page.locator("#versionError")).toContainText(
    "Не удалось сменить версию",
  );
  await expect(page.locator('[data-version="2"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator('[data-version="1"]')).toBeEnabled();
  expect(registry.rows).toEqual([]);
  const memberContext = await browser.newContext();
  try {
    const member = await memberContext.newPage();
    await connectVersionRegistry(member, registry, false);
    await member.goto("/#admin");
    await expect(member.locator("#v-builder")).toBeVisible();
    await expect(member.locator("[data-version]")).toHaveCount(0);
    await expect(member.locator("#navAdmin")).toBeHidden();
  } finally {
    await memberContext.close();
  }
});
