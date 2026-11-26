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

for (const whos of [["dad"], ["dad", "mom", "son"]]) {
  const dirty = {
    ...state(whos, "newyear"),
    location: "autumn",
    action: "product",
    product: "A bright blue cake",
    extra: "A purple cafe",
    chars: state(whos, "newyear").chars.map((c) => ({
      ...c,
      pose: "hold",
      object: "",
    })),
  };
  for (const outputMode of ["neutral", "reference"]) {
    const result = B.build({
      ...dirty,
      outputMode,
      bodyTurn: "left",
      gaze: "up",
    });
    assert.equal(result.issues.length, 0);
    assert.ok(result.prompt.includes("solid pure white (#FFFFFF)"));
    assert.ok(!result.prompt.includes("A bright blue cake"));
    assert.ok(!result.prompt.includes("A purple cafe"));
    assert.ok(!result.prompt.includes("cream-to-peach"));
    if (outputMode === "neutral") {
      assert.ok(result.prompt.includes("full left-facing profile"));
      assert.ok(result.prompt.includes("eyes looking slightly upward"));
      assert.ok(result.prompt.includes("arms relaxed down beside the body"));
      assert.ok(!result.refs.some((r) => r.external));
    } else {
      const source = result.refs.at(-1);
      assert.equal(source.key, "pose-source");
      assert.equal(source.external, true);
      assert.ok(
        result.prompt.includes(`Pose source: Image ${result.refs.length}`),
      );
      assert.ok(result.prompt.includes("joint angles and paw positions"));
      assert.ok(!result.prompt.includes("full left-facing profile"));
      assert.ok(!result.prompt.includes("eyes looking slightly upward"));
      assert.ok(!result.prompt.includes("Expression: a calm"));
    }
  }
}
const back = B.build({
  ...state(["dad"]),
  outputMode: "neutral",
  bodyTurn: "back",
  gaze: "camera",
});
assert.ok(back.prompt.includes("eyes and face are not visible"));
assert.ok(!back.prompt.includes("Gaze: eyes looking toward the camera"));
console.log(
  "White-background checks passed: neutral direction, source pose, scene isolation and reference numbering.",
);
