/* Сборка промта из справочников CAPY. Без нейросетей: только шаблоны и правила.
   state = {
     chars: [{ who:"dad", outfit:"dad-base", pose:"stand", emo:"auto", x:30, y:80, scale:1, object:"" }],
     location:"white", light:"studio", frame:"1:1", camera:"auto", textzone:"none",
     action:"none", product:"", extra:""
   }
   x, y — положение на холсте в процентах (0 — левый/верхний край). */
(function () {
const C = window.CAPY;
const by = (list, id) => list.find(o => o.id === id);
const uniq = a => [...new Set(a.filter(Boolean))];
const poseText = (p, who) => typeof p.en === "string" ? p.en : p.en[who];

/* ---------- доступность вариантов (как rules() в GENA) ---------- */
function poseAllowed(p, who, outfitId) {
  if (p.who !== "*" && !p.who.includes(who)) return `Поза есть только у: ${p.who.map(w => C.CHARS[w].name.toLowerCase()).join(", ")}`;
  if (p.outfit && !p.outfit.includes(outfitId)) return `Нужна одежда: ${p.outfit.map(o => by(C.OUTFITS, o).name).join(", ")}`;
  return "";
}
function actionAllowed(a, chars, season) {
  const n = chars.length, whos = chars.map(c => c.who);
  if (n < a.min) return `Нужно персонажей: от ${a.min}`;
  if (n > a.max) return `Нужно персонажей: до ${a.max}`;
  if (a.only && !a.only.every(w => whos.includes(w))) return `Нужны: ${a.only.map(w => C.CHARS[w].name.toLowerCase()).join(" и ")}`;
  if (a.season && season && season !== a.season) return "Подходит только для зимы";
  return "";
}
function check(state) {
  const issues = [];
  state.chars.forEach(c => {
    const p = by(C.POSES, c.pose), o = by(C.OUTFITS, c.outfit);
    if (o.who !== c.who) issues.push(`${C.CHARS[c.who].name}: одежда от другого персонажа`);
    const why = poseAllowed(p, c.who, c.outfit); if (why) issues.push(`${C.CHARS[c.who].name}, «${p.name}»: ${why}`);
    if (p.needs === "object" && !c.object) issues.push(`${C.CHARS[c.who].name}, «${p.name}»: укажите предмет`);
  });
  const whos = state.chars.map(c => c.who);
  if (new Set(whos).size !== whos.length) issues.push("Каждый персонаж может быть в кадре только один раз");
  const a = by(C.ACTIONS, state.action);
  const why = actionAllowed(a, state.chars, sceneSeason(state)); if (why) issues.push(`«${a.name}»: ${why}`);
  if (a.needs === "product" && !state.product) issues.push("«Держат продукт»: опишите упаковку");
  return issues;
}
function sceneSeason(state) {
  const s = uniq(state.chars.map(c => by(C.OUTFITS, c.outfit).season)).filter(x => x !== "base");
  return s.length === 1 ? s[0] : null;
}

/* ---------- положение на холсте → слова ---------- */
function placeWords(c) {
  const h = c.x < 38 ? "on the left side" : c.x > 62 ? "on the right side" : "in the center";
  const d = c.y > 75 ? "in the foreground" : c.y < 45 ? "further back" : "in the middle ground";
  return `${h} of the frame, ${d} (about ${Math.round(c.x)}% from the left edge, feet at about ${Math.round(c.y)}% from the top)`;
}

/* ---------- эмоция ---------- */
function emotion(c, pose) {
  if (c.emo && c.emo !== "auto") return by(C.EMOTIONS, c.emo);
  return by(C.EMOTIONS, pose.mouth === "open" ? C.OPEN_DEFAULT_EMO : C.DEFAULT_EMO[c.who]);
}

/* ---------- главный промт ---------- */
function build(state) {
  if (["neutral", "reference"].includes(state.outputMode)) return buildWhite(state);
  const issues = check(state);
  const chars = [...state.chars].sort((a, b) => a.x - b.x);           // слева направо по холсту
  const multi = chars.length > 1;
  const situation = state.action === "none" ? window.CapyScenes?.find(state.designScene, state.designSeason) : null;
  const staging = situation ? window.CapyScenes.describe(situation, chars) : null;
  const loc = by(C.LOCATIONS, state.location), light = by(C.LIGHTS, state.light), fr = by(C.FRAMES, state.frame);
  const act = by(C.ACTIONS, state.action), tz = by(C.TEXTZONE, state.textzone);

  /* референсы */
  const refs = [], warn = [];
  chars.forEach(c => {
    const o = by(C.OUTFITS, c.outfit), base = by(C.OUTFITS, `${c.who}-base`);
    if (o.ref) refs.push({ key: o.id, file: o.ref, label: `${C.CHARS[c.who].name} · ${o.name}` });
    else {
      refs.push({ key: base.id, file: base.ref, label: `${C.CHARS[c.who].name} · базовый (эталона «${o.name}» пока нет)` });
      if (o.season !== "newyear") warn.push(`Для «${C.CHARS[c.who].name} · ${o.name}» нет эталона. Лучше сначала сделать его кнопкой «Новый эталон», иначе одежда будет меняться от кадра к кадру.`);
    }
    if (o.draft) warn.push(`«${C.CHARS[c.who].name} · ${o.name}» — черновое описание, проверьте результат внимательнее.`);
  });
  if (multi) refs.push({ key: "lineup", file: C.LINEUP_REF, label: "Вся семья: эталон роста" });
  const newyear = chars.some(c => by(C.OUTFITS, c.outfit).season === "newyear");
  if (chars.some(c => isWinterOutfit(by(C.OUTFITS, c.outfit))))
    refs.push({ ...(newyear ? C.NEWYEAR_REF : C.STYLE_REF) });

  const L = [];
  const mouthOpen = [];

  if (!multi) {
    const c = chars[0], ch = C.CHARS[c.who], o = by(C.OUTFITS, c.outfit), p = by(C.POSES, c.pose), e = emotion(c, p);
    if (e.mouth === "open") mouthOpen.push(c.who);
    L.push(`Use the attached image as a strict character reference: capybara ${ch.en}. Preserve the character identity, heart-shaped nose, eyes, eyebrows, ears, paws, relative family height and fur color. Apply the new muzzle shape and original-proportion body instructions below. The outfit description below is authoritative: replace any conflicting reference clothing with the described outfit, without adding unrelated clothing.`);
    L.push(`Face shape: ${C.FACE_SHAPE}.`);
    L.push(`Body shape: ${C.BODY_SHAPE}.`);
    L.push(styleInstructions(refs));
    if (newyear) L.push(`Image ${refs.length} is the visual style and holiday outfit reference: match its red knitted beanie, white winter patterns and sage-green scarf. Use Image 1 for recognizable character identity and relative family height only.`);
    L.push(`Character details: ${ch.body}. Eyes: ${ch.face}. Paws: four short fingers with small darker brown pads.`);
    L.push(`Outfit: ${outfitDescription(o)}.`);
    if (p.prop) L.push(`Prop: ${p.prop}.`);
    L.push(`Pose: ${staging?.roles[c.who] || poseText(p, c.who).replace("{object}", c.object || "the object")}.`);
    L.push(`Expression: ${e.en}.`);
    if (act.id !== "none") L.push(`Action: ${fillAction(act, chars, state)}.`);
    L.push(`Placement: the character ${staging ? "is placed" : "stands"} ${placeWords(c)}.`);
    L.push(`Scene: ${(staging?.setting || loc.en).replace(/[.\s]+$/, "")}.`);
    L.push(`Frame: ${fr.en}, full body visible. ${tz.en}`.trim());
    L.push(`Camera: ${camText(state, p)}.`);
  } else {
    L.push("Use the attached reference images as strict character references:");
    L.push(refs.map((r, i) => `Image ${i + 1} = ${r.key === "lineup" ? "lineup reference for relative height" : r.key === "newyear-outfit" ? "visual style and holiday outfit reference" : r.key === "style-reference" ? "latest visual style reference only" : `capybara ${C.CHARS[chars[i].who].en}`}`).join(", ") + ".");
    L.push("Preserve each character identity, heart-shaped nose, eyes, eyebrows, ears, paws, fur color, relative family height and recognizable identity. Apply the new muzzle shape and original-proportion body instructions below to every character. Each outfit description below is authoritative: replace conflicting reference clothing with the described outfit. Do not swap clothing between characters.");
    L.push(`Face shape for every character: ${C.FACE_SHAPE}.`);
    L.push(`Body shape for every character: ${C.BODY_SHAPE}.`);
    L.push(styleInstructions(refs));
    if (newyear) L.push(`Use Image ${refs.length} for the new visual style and holiday clothing design, not for character identity, pose, expression or relative height. Match its red knitted beanie, white winter patterns and sage-green scarf on each character with a New Year outfit.`);
    L.push(`Shared family features: ${C.CHARS.dad.face}; paws with four short fingers and small darker brown pads${chars.some(c => c.who === "mom") ? "; mom has two small curved black eyelashes at the outer corner of each eye" : ""}.`);
    L.push("");
    L.push("Characters, from left to right:");
    chars.forEach((c, i) => {
      const ch = C.CHARS[c.who], o = by(C.OUTFITS, c.outfit), p = by(C.POSES, c.pose), e = emotion(c, p);
      if (e.mouth === "open") mouthOpen.push(c.who);
      L.push(`${i + 1}. ${cap(ch.en)} (Image ${i + 1}):`);
      L.push(`   Outfit: ${outfitDescription(o)}.`);
      if (p.prop) L.push(`   Prop: ${p.prop}.`);
      const ov = act.override && act.override[c.who];
      L.push(`   Pose: ${ov || staging?.roles[c.who] || poseText(p, c.who).replace("{object}", c.object || "the object")}.`);
      L.push(`   Expression: ${e.en}.`);
      if (!ov || c.who !== act.offGround) L.push(`   Placement: ${placeWords(c)}.`);
    });
    L.push("");
    if (act.id !== "none") L.push(`Composition: ${fillAction(act, chars, state)}.`);
    L.push(`Relative height (very important, match Image ${refs.findIndex(r => r.key === "lineup") + 1}):`);
    chars.forEach(c => L.push(`- ${heightLine(c.who)}`));
    if (act.offGround) L.push(`The ${C.CHARS[act.offGround].en} is lifted off the ground as described, so his head is clearly above the group; everyone else stands on the same ground line.`);
    else L.push("All characters stand on the same ground line unless the pose says otherwise.");
    L.push("");
    L.push(`Scene: ${(staging?.setting || loc.en).replace(/[.\s]+$/, "")}.`);
    L.push(`Frame: ${fr.en}, full bodies visible. ${tz.en}`.trim());
    L.push(`Camera: ${camText(state, null)}.`);
  }
  L.push(`Lighting: ${light.en}.`);
  L.push(`Style: ${C.STYLE}. High detail, polished key art quality.`);
  if (staging) L.push(staging.staging);
  if (state.extra && state.extra !== situation?.en) L.push(`Additional details (translate to English if needed): "${state.extra}".`);
  if (state.action === "product") L.push("Do not render any readable text or logos on the packaging; keep labels as simple shapes.");

  /* негатив: в Nano Banana нет отдельного поля, поэтому строка Avoid */
  let neg = [...C.NEG_BASE, ...clothingNegatives(chars)];
  if (!mouthOpen.length) neg.push(...C.NEG_TEETH);
  if (multi) neg.push(...C.NEG_GROUP);
  else {
    const c = chars[0];
    neg.push(...C.CHARS[c.who].neg, ...by(C.OUTFITS, c.outfit).neg);   // запреты на одежду — только в одиночных кадрах
    if (state.location === "white") neg.push("background scenery", "ground texture", "furniture");
  }
  L.push("");
  L.push(`Avoid: ${uniq(neg).join(", ")}.`);

  return {
    prompt: L.join("\n").replace(/\n{3,}/g, "\n\n"),
    refs, warnings: warn, issues,
    instructions: instructions(refs, fr, multi),
    checklist: C.CHECKLIST
  };
}

/* White-background outputs deliberately exclude scene, action and pose overrides. */
function buildWhite(state) {
  const sourcePose = state.outputMode === "reference";
  const chars = [...state.chars].sort((a,b) => a.x-b.x);
  const clean = { ...state, outputMode: "scene", location: "white", light: "studio", action: "none", textzone: "none", extra: "", product: "",
    chars: chars.map(c => ({ ...c, pose: "stand", emo: "auto", object: "" })) };
  const base = build(clean);
  const refs = [...base.refs];
  if (sourcePose) refs.push({key:"pose-source", file:null, external:true, label:"Ваш исходник · поза, поворот и взгляд"});
  const frame = by(C.FRAMES,state.frame) || C.FRAMES[0];
  const turn = by(C.BODY_TURNS,state.bodyTurn) || C.BODY_TURNS[0];
  const gaze = by(C.GAZES,state.gaze) || C.GAZES[0];
  const lines = [
    "Create a clean full-body capybara character reference on a pure white background.",
    refs.map((r,i) => `Image ${i+1} = ${r.key === "pose-source" ? "source pose, body orientation and gaze only" : r.key === "lineup" ? "family relative-height reference only" : r.key === "newyear-outfit" ? "visual style and holiday outfit reference" : r.key === "style-reference" ? "latest visual style reference only" : `capybara ${C.CHARS[chars[i].who].en} identity reference`}`).join(", ")+".",
    "Preserve character identity, fur color, heart-shaped nose, eyes, ears, fingers and 3D style. Apply the following intentional shape and outfit corrections instead of copying conflicting reference shapes or clothing.",
    `Face shape: ${C.FACE_SHAPE}.`,
    `Body shape: ${C.BODY_SHAPE}.`,
    styleInstructions(refs),
    "Apply facial details only where visible; never rotate a back view or source pose to reveal the face."
  ];
  chars.forEach(c => lines.push(`${cap(C.CHARS[c.who].en)} outfit: ${outfitDescription(by(C.OUTFITS,c.outfit))}.`));
  const clothing = refs.findIndex(r=>r.key==="newyear-outfit");
  if (clothing >= 0) lines.push(`Match Image ${clothing+1} for visual style and holiday clothing, not for pose, orientation, expression or relative family height.`);
  if (sourcePose) {
    lines.push(`Pose source: Image ${refs.length}. Reproduce its exact pose, body rotation, head tilt, gaze direction, limb positions, joint angles and paw positions on each selected capybara. Preserve its expression. Do not replace the pose with a standing pose or a T-pose, and do not force the face toward the camera. Ignore poses in all other references. Keep paws in the same positions but remove held props.`);
  } else {
    lines.push("Pose: a quiet neutral standing stance, arms relaxed down beside the body, paws relaxed, feet naturally slightly apart. No action, no gestures, no held objects and no T-pose.");
    lines.push(`Body orientation: ${turn.en}.`);
    lines.push(`Gaze: ${turn.id === "back" ? "looking away in the direction of the head; eyes and face are not visible" : gaze.en}.`);
    lines.push("Expression: a calm gentle closed-mouth smile, no visible teeth.");
  }
  if (chars.length>1) {
    lines.push(`Relative heights: use Image ${refs.findIndex(r=>r.key==="lineup")+1} for scale only; do not copy its poses or outfits.`);
    chars.forEach(c=>lines.push(heightLine(c.who)));
    lines.push("Place the selected characters side by side with clear separation and no overlap, preserving their relative heights.");
  } else lines.push("Centered composition with one character.");
  lines.push("Background: solid pure white (#FFFFFF), seamless and evenly lit; no scenery, no gradient, no floor texture, no decorations, no props. Only a very soft neutral contact shadow is allowed.");
  lines.push(`Frame: ${frame.en}; show the complete body, headwear, paws and feet without cropping. ${sourcePose ? "Match the camera angle and viewing direction of the source image while preserving its pose." : "Straight-on undistorted camera at chest height; keep the specified body orientation."}`);
  lines.push(`Lighting: soft even neutral studio lighting. Style: ${C.STYLE}. High detail, character reference quality.`);
  lines.push(`Avoid: ${uniq([...C.NEG_BASE,...clothingNegatives(chars),...(sourcePose ? [] : C.NEG_TEETH),...(chars.length>1 ? C.NEG_GROUP : []),"colored background","background scenery","background gradient","floor texture","held props",...(sourcePose ? [] : ["action pose","gestures","T-pose"])]).join(", ")}.`);
  return { ...base, prompt:lines.join("\n\n"), refs, instructions:instructions(refs,frame,chars.length>1) };
}

/* ---------- новый сезонный эталон (T-поза) ---------- */
function buildReference(outfitId) {
  const o = by(C.OUTFITS, outfitId), ch = C.CHARS[o.who], base = by(C.OUTFITS, `${o.who}-base`);
  const refs = [{ key: base.id, file: base.ref, label: `${ch.name} · базовый` }];
  if (isWinterOutfit(o)) refs.push({ ...(o.season === "newyear" ? C.NEWYEAR_REF : C.STYLE_REF) });
  const p = [
    `Use the attached image as a strict character reference: capybara ${ch.en}. Preserve the character identity, heart-shaped nose, eyes with eyebrows${o.who === "mom" ? " and two eyelashes on each eye" : ""}, ears, paws with fingers and dark pads, fur color, relative family height and recognizable identity. Apply the new muzzle shape and original-proportion body instructions below and replace the outfit with the outfit described below.`,
    `Face shape: ${C.FACE_SHAPE}.`,
    `Body shape: ${C.BODY_SHAPE}.`,
    styleInstructions(refs),
    ...(o.season === "newyear" ? ["Image 2 is the visual style and holiday outfit reference. Match its red knitted beanie, white winter patterns and sage-green scarf; use Image 1 for recognizable character identity and relative family height only."] : []),
    `Outfit: ${outfitDescription(o)}.`,
    `Expression: ${by(C.EMOTIONS, C.DEFAULT_EMO[o.who]).en}.`,
    `Style: ${C.STYLE}.`,
    "Pose and framing: T-pose, standing straight and symmetrical, facing the viewer directly, arms extended horizontally to the sides, legs slightly apart. Straight-on front view, full body including any headwear, centered composition.",
    "Background: plain pure white background, soft even studio lighting, soft contact shadow under the feet.",
    "High detail, character model sheet quality.",
    "",
    `Avoid: ${uniq([...C.NEG_BASE, ...clothingNegatives([{outfit:o.id}]), ...C.NEG_TEETH, ...C.NEG_TPOSE, ...ch.neg, ...o.neg]).join(", ")}.`
  ];
  return { prompt: p.join("\n"), refs,
    instructions: [...(isWinterOutfit(o) ? ["Приложите вторым изображением новый референс стиля (для Нового года он задаёт и одежду)."] : []), `Приложите первой картинкой: эталон «${ch.name} · базовый» (кнопка «Скачать» ниже).`, "Вставьте промт и сгенерируйте.", "Удачный результат сохраните: он станет эталоном для всех поз в этой одежде. Админ загружает его в сервис."] };
}

function isWinterOutfit(outfit) {
  return ["winter", "newyear"].includes(outfit.season);
}
function outfitDescription(outfit) {
  const materials = isWinterOutfit(outfit)
    ? "For the knitted winter garments described above, show thick individual yarn loops, ribbed cuffs and the specified knitted patterns; keep trousers and other non-knit pieces in their specified fabrics."
    : "Use smooth lightweight cotton fabric and fine flat woven textiles, subtle seams and natural fabric folds. Colors and stripes are printed or dyed into a smooth surface. For items explicitly listed in this outfit only: caps are sewn cotton canvas, berets and scarves are smooth woven fabric, raincoats are smooth waterproof coated fabric and boots are rubber. Do not add headwear, scarves, outerwear or shoes that are not listed. No knitted clothing, wool, chunky yarn, crochet, cable stitches or visible knitting loops anywhere on this character, including hat, cuffs and scarf. These material rules override any knitted texture visible in the attached identity or style references.";
  return `${outfit.en}. Materials for this character: ${materials}`;
}
function clothingNegatives(chars) {
  return chars.every(c => !isWinterOutfit(by(C.OUTFITS,c.outfit)))
    ? ["knitted clothing", "wool texture", "chunky yarn", "crocheted cap", "cable-knit patterns", "visible knitting loops"]
    : [];
}

function styleInstructions(refs) {
  // Without winter clothing, the selected identity image also supplies the visual style.
  const index = Math.max(0, refs.findIndex(r => ["style-reference", "newyear-outfit"].includes(r.key)));
  return `Visual style authority for rendering and materials: Image ${index+1}. Match its short fuzzy fur, tactile textiles, rounded paws, matte finish and lighting quality. The latest style image takes priority for surface rendering only, never for head size, head-to-body proportions, cheek volume or muzzle silhouette. For those, the original identity references and the explicit Face shape instructions above take priority. Do not copy inflated cheeks, a shortened snout or an enlarged head from a style image. Keep the chosen character identities and relative family heights. The outfit-specific material rules override the style image: never copy its winter yarn texture onto clothing assigned smooth fabric. Do not copy its waving pose, gaze, smiling expression, tangerine or background; use the selected pose and expression, and the outfit described for each character.`;
}

/* ---------- вспомогательное ---------- */
function cap(s) { return s[0].toUpperCase() + s.slice(1); }
function camText(state, pose) {
  const c = by(C.CAMERAS, state.camera);
  if (c.en) return c.en;
  return pose ? `${C.CAM[pose.cam]}, full body, no wide-angle distortion` : C.CAMERAS[1].en;
}
function heightLine(w) {
  return { dad: "Dad is the tallest and widest character (100% height).",
           mom: "Mom is about 88% of dad's height, the top of her head is level with dad's eyes, she is slimmer than dad.",
           son: "Son is about 67% of dad's height, the top of his head is level with dad's shoulders, his head is almost as large as mom's." }[w];
}
function fillAction(a, chars, state) {
  const names = chars.map(c => C.CHARS[c.who].en);
  return a.en.replace("{who}", names.length > 1 ? "the characters" : `the ${names[0]}`)
    .replace("{product}", state.product || "the product")
    .replace("{A}", `the ${names[0]}`).replace("{B}", `the ${names[1] || names[0]}`);
}
function instructions(refs, fr, multi) {
  const s = [];
  s.push("Откройте Nano Banana.");
  s.push("Приложите эталоны строго в этом порядке: " + refs.map((r, i) => `${i + 1} — ${r.label}`).join("; ") + ". Готовые эталоны скачайте кнопками ниже; собственный исходник, если он указан, приложите отдельно последним изображением.");
  s.push(`Если есть выбор формата, поставьте ${fr.id}.`);
  s.push("Вставьте промт целиком и сгенерируйте 2–4 варианта.");
  s.push("Проверьте каждый вариант по чек-листу ниже. Не прошёл хотя бы один пункт — перегенерируйте.");
  if (multi) s.push("Если нейросеть выравнивает рост, сгенерируйте персонажей по отдельности и соберите кадр в редакторе по таблице роста.");
  s.push("Надписи и логотипы добавляйте в редакторе, не генерируйте их.");
  s.push("Удачный кадр опубликуйте в галерее: промт и настройки сохранятся вместе с картинкой.");
  return s;
}

window.CapyBuilder = { build, buildReference, check, poseAllowed, actionAllowed, sceneSeason };
})();
