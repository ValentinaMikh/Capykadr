const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ctx = { window: {} };
vm.createContext(ctx);
for (const file of ["data.js", "situations.js", "builder.js"])
  vm.runInContext(fs.readFileSync(file, "utf8"), ctx);
const { CAPY: C, CapyScenes: scenes, CapyBuilder: B } = ctx.window;
const groups = [
  ["dad"],
  ["mom"],
  ["son"],
  ["dad", "mom"],
  ["dad", "son"],
  ["mom", "son"],
  ["dad", "mom", "son"],
];
let count = 0,
  builds = 0;
for (const season of ["spring", "summer", "autumn", "winter"]) {
  const catalog = scenes.forSeason(season);
  assert.equal(catalog.length, season === "winter" ? 22 : 10);
  assert.equal(new Set(catalog.map((s) => s.id)).size, catalog.length);
  for (const scene of catalog) {
    count++;
    assert.ok(scene.en.length > 180, scene.id);
    assert.ok(C.LOCATIONS.some((l) => l.id === scene.location));
    assert.ok(C.LIGHTS.some((l) => l.id === scene.light));
    for (const whos of groups) {
      const state = {
        chars: whos.map((who, i) => ({
          who,
          outfit: `${who}-${season === "spring" ? "base" : season}`,
          pose: "stand",
          emo: "auto",
          x: 26 + i * 24,
          y: 86,
          object: "",
        })),
        designSeason: season,
        designScene: scene.id,
        extra: scene.en,
        action: "none",
        product: "",
        location: scene.location,
        light: scene.light,
        frame: "1:1",
        camera: "auto",
        textzone: "none",
        outputMode: "scene",
      };
      const staging = scenes.describe(scene, state.chars);
      assert.equal(Object.keys(staging.roles).length, whos.length);
      const result = B.build(state);
      builds++;
      assert.equal(result.issues.length, 0, `${season}/${scene.id}/${whos}`);
      assert.ok(result.prompt.includes(staging.setting));
      assert.ok(
        result.prompt.includes(`exactly the selected ${whos.length} capybara`),
      );
      for (const who of whos)
        assert.ok(result.prompt.includes(staging.roles[who]));
      assert.ok(!/undefined|\{next\}|Image 0/.test(result.prompt));
      assert.equal(
        result.prompt.split(scene.en).length - 1,
        1,
        "scene not duplicated",
      );
      if (scene.id.endsWith("gift-card") && whos.length === 1)
        assert.ok(result.prompt.includes("facing the viewer"));
      for (const mode of ["neutral", "reference"]) {
        const white = B.build({ ...state, outputMode: mode });
        assert.ok(!white.prompt.includes("Situation staging."));
        assert.ok(!white.prompt.includes(scene.en));
      }
    }
  }
}
assert.equal(count, 52);
for (const id of [
  "open-gifts",
  "give-gifts",
  "gift-card",
  "decorate-tree",
  "garland",
  "gift-wrap",
])
  assert.ok(scenes.find(id, "newyear"));
for (const id of ["pool-game", "swim-ring", "beach", "picnic"])
  assert.ok(scenes.find(id, "summer"));
assert.equal(scenes.find("pool-game", "winter"), undefined);
assert.equal(scenes.find("gift-card", "summer"), undefined);
console.log(
  `Situation checks passed: ${count} detailed seasonal stories, ${builds} cast combinations, solo/group roles, locations, outfit consistency and white-background isolation.`,
);
