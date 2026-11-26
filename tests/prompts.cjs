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
  assert.ok(
    result.prompt.includes(
      `Visual style authority for rendering and materials: Image ${["winter", "newyear"].includes(outfit.season) ? 2 : 1}`,
    ),
  );
  assert.equal(
    result.refs.length,
    ["winter", "newyear"].includes(outfit.season) ? 2 : 1,
  );
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
    assert.ok(
      result.prompt.includes("clearly forward-projecting capybara muzzle"),
    );
    assert.ok(result.prompt.includes("restrained cheek volume"));
    assert.ok(
      result.prompt.includes(
        "son has a smaller youthful snout that still projects forward",
      ),
    );
    assert.ok(
      result.prompt.includes("surface rendering only, never for head size"),
    );
    assert.ok(result.prompt.includes(C.BODY_SHAPE));
    assert.ok(result.prompt.includes("latest style image takes priority"));
    assert.ok(result.prompt.includes("Do not copy its waving pose"));
    assert.equal(
      result.refs.some((r) => r.file === C.STYLE_REF.file),
      season === "newyear",
    );
    if (season === "newyear")
      assert.ok(result.prompt.includes("thick individual yarn loops"));
    else assert.ok(result.prompt.includes("smooth lightweight cotton fabric"));
    assert.equal(
      result.refs.some((r) =>
        ["style-reference", "newyear-outfit"].includes(r.key),
      ),
      season === "newyear",
    );
    assert.ok(
      result.prompt.includes("original identity-reference head-to-body ratio"),
    );
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
      assert.ok(
        fs.statSync(require("node:path").join("assets/figma", C.STYLE_REF.file))
          .size > 0,
      );
    }
  }
}
for (const who of ["dad", "mom", "son"]) {
  const reference = B.buildReference(`${who}-newyear`);
  assert.equal(reference.refs.length, 2);
  assert.equal(reference.refs[1].key, "newyear-outfit");
  assert.ok(
    reference.prompt.includes(
      "Image 2 is the visual style and holiday outfit reference",
    ),
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

for (const who of ["dad", "mom", "son"]) {
  for (const outputMode of ["scene", "neutral", "reference"]) {
    const result = B.build({
      ...state([who]),
      outputMode,
      bodyTurn: "front",
      gaze: "camera",
    });
    assert.ok(
      result.prompt.includes("original identity-reference head-to-body ratio"),
    );
    assert.ok(!result.prompt.includes("a short, broad projecting"));
    assert.ok(!result.prompt.includes("Match its compact plush 3D silhouette"));
    assert.ok(
      result.prompt.includes(
        "original identity references and the explicit Face shape instructions above take priority",
      ),
    );
  }
}
console.log(
  "Head checks passed: original proportions and restrained, forward-projecting muzzles for all characters and output modes.",
);

for (const season of ["base", "spring", "summer", "autumn"]) {
  for (const who of ["dad", "mom", "son"]) {
    for (const outputMode of ["scene", "neutral", "reference"]) {
      const result = B.build({ ...state([who], season), outputMode });
      assert.ok(result.prompt.includes("smooth lightweight cotton fabric"));
      assert.ok(
        result.prompt.includes("No knitted clothing, wool, chunky yarn"),
      );
      const positive = result.prompt.split("Avoid:")[0];
      assert.ok(!positive.includes("red knitted sweater"));
      assert.ok(!positive.includes("yellow knitted scarf"));
      assert.ok(!positive.includes("red knitted beret"));
      assert.ok(!positive.includes("on knitted clothing show"));
    }
    assert.ok(
      B.buildReference(`${who}-${season}`).prompt.includes(
        "No knitted clothing, wool, chunky yarn",
      ),
    );
  }
}
for (const season of ["winter", "newyear"]) {
  const result = B.build(state(["dad", "mom", "son"], season));
  assert.ok(result.prompt.includes("thick individual yarn loops"));
  assert.ok(!result.prompt.split("Avoid:")[1].includes("knitted clothing"));
}
const mixed = state(["dad", "son"], "summer");
mixed.chars[0].outfit = "dad-winter";
const combined = B.build(mixed);
assert.ok(combined.prompt.includes("thick individual yarn loops"));
assert.ok(combined.prompt.includes("No knitted clothing, wool, chunky yarn"));
assert.ok(!combined.prompt.split("Avoid:")[1].includes("knitted clothing"));
console.log(
  "Seasonal fabric checks passed: smooth spring/summer/autumn clothes, winter knitting and mixed outfits.",
);

for (const season of ["base", "summer", "autumn", "winter", "newyear"]) {
  const ref = B.build(state(["son"], season)).refs[0];
  assert.equal(ref.key, "son-" + season);
  assert.equal(ref.file, C.SON_REFERENCES[ref.key]);
  assert.ok(
    fs.statSync(require("node:path").join("assets/figma", ref.file)).size > 0,
  );
}
console.log(
  "Son reference checks passed: season-specific reference IDs and bundled files.",
);

// Freeze version 1 byte-for-byte against the pre-style-change source (apart from exports).
const crypto = require("node:crypto");
for (const [file, sha, restore] of [
  [
    "legacy/data-v1.js",
    "3dd2005b7fde2d675b55976f3251643902d76434",
    (s) => s.replace("window.CAPY_V1 =", "window.CAPY ="),
  ],
  [
    "legacy/builder-v1.js",
    "1cf03b9f8eba84e9d02da2f3a5e48f2024971428",
    (s) =>
      s
        .replace("window.CAPY_V1;", "window.CAPY;")
        .replace("window.CapyBuilderV1 =", "window.CapyBuilder ="),
  ],
]) {
  const source = Buffer.from(restore(fs.readFileSync(file, "utf8")));
  assert.equal(
    crypto
      .createHash("sha1")
      .update(`blob ${source.length}\0`)
      .update(source)
      .digest("hex"),
    sha,
    file,
  );
  vm.runInContext(fs.readFileSync(file, "utf8"), context);
}
vm.runInContext(fs.readFileSync("versions.js", "utf8"), context);
const V = context.window.CapyVersions;
assert.equal(V.decode([]), 2);
assert.equal(
  V.decode([{ id: V.settingId, image_path: "versions/v1.json" }]),
  1,
);
assert.throws(() =>
  V.decode([{ id: V.settingId, image_path: "versions/unknown.json" }]),
);
assert.equal(V.preset(1).builder, context.window.CapyBuilderV1);
assert.equal(V.preset(2).builder, B);
for (const season of ["base", "summer", "autumn", "winter"])
  for (const whos of [["dad"], ["mom"], ["son"], ["dad", "mom", "son"]]) {
    const original = V.preset(1).builder.build(state(whos, season));
    assert.equal(original.issues.length, 0);
    assert.ok(original.prompt.includes("boxy muzzle"));
    assert.ok(!original.prompt.includes("latest style image"));
    assert.ok(!original.refs.some((r) => r.key === "style-reference"));
    assert.equal(original.refs.length, whos.length + (whos.length > 1 ? 1 : 0));
  }
console.log(
  "Version checks passed: original source frozen, all original seasons, isolated builders and default version 2.",
);

const winterDad = B.build(state(["dad"], "winter"));
assert.ok(winterDad.prompt.includes("beige chino trousers"));
assert.ok(winterDad.prompt.includes("sage-green knitted scarf"));
assert.ok(
  !winterDad.prompt.split("Avoid:")[1].split(", ").includes("trousers"),
);
assert.ok(
  B.build(state(["mom"], "winter")).prompt.includes(
    "plain red pleated skirt without stripes",
  ),
);

// Winter clothing must never be suggested as a style attachment for non-winter outfits.
for (const whos of [
  ["dad"],
  ["mom"],
  ["son"],
  ["dad", "son"],
  ["dad", "mom", "son"],
]) {
  for (const season of ["base", "spring", "summer", "autumn"]) {
    for (const outputMode of ["scene", "neutral", "reference"]) {
      const result = B.build({ ...state(whos, season), outputMode });
      assert.ok(
        !result.refs.some((r) => r.file === C.SON_REFERENCES["son-winter"]),
      );
      assert.ok(
        !result.refs.some((r) =>
          ["style-reference", "newyear-outfit"].includes(r.key),
        ),
      );
      assert.ok(!result.prompt.includes("Image 0"));
      assert.ok(
        result.prompt.includes(
          "Visual style authority for rendering and materials: Image 1",
        ),
      );
      assert.equal(
        result.refs.length,
        whos.length +
          (whos.length > 1 ? 1 : 0) +
          (outputMode === "reference" ? 1 : 0),
      );
      if (outputMode === "reference")
        assert.ok(
          result.prompt.includes(`Pose source: Image ${result.refs.length}`),
        );
    }
  }
}
console.log(
  "Seasonal attachment checks passed: no winter son for non-winter outfits, all output modes and reference numbering.",
);
