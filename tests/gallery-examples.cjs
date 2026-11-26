const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync("gallery-examples.js", "utf8"), ctx);
const select = ctx.window.CapyExamples.select;
const target = {
  chars: [{ who: "dad", outfit: "dad-base", pose: "stand", emo: "auto" }],
  constructorVersion: 2,
  designSeason: "spring",
  outputMode: "scene",
  designScene: "walk",
  location: "spring",
  action: "none",
  frame: "1:1",
};
const photo = (id, changes = {}, stateChanges = {}) => ({
  id,
  image_path: `${id}.png`,
  url: `https://example.test/${id}.png`,
  created_at: "2026-11-26T12:00:00Z",
  state: { ...target, ...stateChanges },
  ...changes,
});
const ids = (rows) => Array.from(rows, (r) => r.id);
const best = photo("best"),
  nearby = photo("nearby", {}, { designScene: "cafe", location: "cafe" });
assert.deepEqual(ids(select([nearby, best], target)), ["best", "nearby"]);
for (const bad of [
  photo("hidden", { hidden: true }),
  photo("url", { url: null }),
  photo("state", { state: null }),
  photo("invalid", {}, { chars: [null] }),
  photo("cast", {}, { chars: [{ who: "mom", outfit: "mom-base" }] }),
  photo("season", {}, { chars: [{ who: "dad", outfit: "dad-winter" }] }),
  photo("version", {}, { constructorVersion: 1 }),
  photo("mode", {}, { outputMode: "reference" }),
])
  assert.equal(select([bad], target).length, 0, bad.id);
assert.deepEqual(
  ids(
    select(
      [
        photo("a"),
        photo("b", { image_path: "a.png" }),
        photo("a", { image_path: "c.png" }),
      ],
      target,
    ),
  ),
  ["a"],
);
assert.equal(
  select(
    Array.from({ length: 12 }, (_, i) => photo("p" + i)),
    target,
  ).length,
  6,
);
assert.deepEqual(
  ids(select([photo("a"), photo("b")], target, new Map([["a.png", 2]]))),
  ["b", "a"],
);
assert.equal(
  select(
    [
      photo(
        "legacy",
        {},
        { constructorVersion: undefined, outputMode: undefined },
      ),
    ],
    target,
  ).length,
  1,
);
const neutral = { ...target, outputMode: "neutral" };
assert.equal(
  select([photo("n", {}, { outputMode: "neutral" })], neutral).length,
  1,
);
assert.equal(select([photo("n")], neutral).length, 0);
assert.equal(
  select([photo("excluded")], target, new Map(), new Set(["excluded.png"]))
    .length,
  0,
);
assert.equal(
  select(
    [
      photo(
        "unknown",
        {},
        { designSeason: undefined, chars: [{ who: "dad" }] },
      ),
    ],
    target,
  ).length,
  1,
);
assert.equal(
  select([photo("original", {}, { constructorVersion: 1 })], {
    ...target,
    constructorVersion: 1,
  }).length,
  1,
);
console.log(
  "Gallery example checks passed: parameter ranking, seasons, characters, versions, output modes, hidden/malformed rows, unique photos, rotation and unavailable images.",
);
