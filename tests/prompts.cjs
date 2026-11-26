const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const context = { window: {} };
vm.createContext(context);
for (const file of ["data.js", "builder.js"])
  vm.runInContext(fs.readFileSync(file, "utf8"), context);
const { CAPY: C, CapyBuilder: B } = context.window;
const state = (whos, season = "base") => ({
  chars: whos.map((who, i) => ({
    who,
    outfit: `${who}-${season}`,
    pose: "stand",
    emo: "auto",
    x: whos.length === 1 ? 50 : 26 + i * 24,
    y: 86,
    object: "",
  })),
  location: season === "newyear" ? "newyear" : "white",
  light: "studio",
  frame: "1:1",
  camera: "auto",
  textzone: "none",
  action: "none",
  product: "",
  extra: "",
});
for (const outfit of C.OUTFITS) {
  const result = B.buildReference(outfit.id);
  assert.ok(result.prompt.includes(C.FACE_SHAPE), outfit.id);
  assert.ok(result.prompt.includes(C.BODY_SHAPE), outfit.id);
  assert.ok(!result.prompt.includes("boxy muzzle"));
}
for (const whos of [
  ["dad"],
  ["mom"],
  ["son"],
  ["dad", "son"],
  ["dad", "mom", "son"],
]) {
  for (const season of ["base", "newyear"]) {
    const result = B.build(state(whos, season));
    assert.equal(result.issues.length, 0);
    assert.ok(result.prompt.includes(C.FACE_SHAPE));
    assert.ok(result.prompt.includes("soft vertical oval"));
    assert.ok(
      result.prompt.includes("fully rounded lower corners and a curved chin"),
    );
    assert.ok(result.prompt.includes(C.BODY_SHAPE));
    assert.ok(result.prompt.includes("5-8%"));
    assert.ok(!result.prompt.includes("wide chunky almost rectangular torso"));
    assert.ok(!result.prompt.includes("preserve body proportions"));
    assert.ok(!result.prompt.includes("Keep exactly the same face"));
    if (season === "newyear") {
      const outfitIndex = result.refs.findIndex(
        (r) => r.key === "newyear-outfit",
      );
      assert.equal(outfitIndex, result.refs.length - 1);
      assert.ok(result.prompt.includes(`Image ${outfitIndex + 1}`));
      for (const text of [
        "red knitted beanie",
        "white snowflakes",
        "sage-green knitted scarf",
        "New Year celebration",
      ])
        assert.ok(result.prompt.includes(text), text);
      if (whos.length > 1)
        assert.ok(
          result.prompt.includes(
            `Relative height (very important, match Image ${whos.length + 1})`,
          ),
        );
      assert.equal(result.warnings.length, 0);
      assert.ok(fs.statSync("assets/figma/newyear-outfit.png").size > 0);
    }
  }
}
for (const who of ["dad", "mom", "son"]) {
  const reference = B.buildReference(`${who}-newyear`);
  assert.equal(reference.refs.length, 2);
  assert.equal(reference.refs[1].key, "newyear-outfit");
  assert.ok(
    reference.prompt.includes("Image 2 is the holiday outfit reference only"),
  );
}
console.log(
  "Prompt checks passed: oval muzzles, slimmer builds, all outfits, New Year clothing and reference numbering.",
);
