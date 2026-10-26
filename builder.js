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
  const issues = check(state);
  const chars = [...state.chars].sort((a, b) => a.x - b.x);           // слева направо по холсту
  const multi = chars.length > 1;
  const loc = by(C.LOCATIONS, state.location), light = by(C.LIGHTS, state.light), fr = by(C.FRAMES, state.frame);
  const act = by(C.ACTIONS, state.action), tz = by(C.TEXTZONE, state.textzone);

  /* референсы */
  const refs = [], warn = [];
  chars.forEach(c => {
    const o = by(C.OUTFITS, c.outfit), base = by(C.OUTFITS, `${c.who}-base`);
    if (o.ref) refs.push({ key: o.id, file: o.ref, label: `${C.CHARS[c.who].name} · ${o.name}` });
    else {
      refs.push({ key: base.id, file: base.ref, label: `${C.CHARS[c.who].name} · базовый (эталона «${o.name}» пока нет)` });
      warn.push(`Для «${C.CHARS[c.who].name} · ${o.name}» нет эталона. Лучше сначала сделать его кнопкой «Новый эталон», иначе одежда будет меняться от кадра к кадру.`);
    }
    if (o.draft) warn.push(`«${C.CHARS[c.who].name} · ${o.name}» — черновое описание, проверьте результат внимательнее.`);
  });
  if (multi) refs.push({ key: "lineup", file: C.LINEUP_REF, label: "Вся семья: эталон роста" });

  const L = [];
  const mouthOpen = [];

  if (!multi) {
    const c = chars[0], ch = C.CHARS[c.who], o = by(C.OUTFITS, c.outfit), p = by(C.POSES, c.pose), e = emotion(c, p);
    if (e.mouth === "open") mouthOpen.push(c.who);
    L.push(`Use the attached image as a strict character reference: capybara ${ch.en}. Keep exactly the same face, head shape, boxy muzzle, heart-shaped nose, eyes, eyebrows, ears, paws, proportions, fur, outfit, accessories, colors and 3D style. Do not change, remove or add clothing.`);
    L.push(`Character details: ${ch.body}. Eyes: ${ch.face}. Paws: four short fingers with small darker brown pads.`);
    L.push(`Outfit: ${o.en}.`);
    if (p.prop) L.push(`Prop: ${p.prop}.`);
    L.push(`Pose: ${poseText(p, c.who).replace("{object}", c.object || "the object")}.`);
    L.push(`Expression: ${e.en}.`);
    if (act.id !== "none") L.push(`Action: ${fillAction(act, chars, state)}.`);
    L.push(`Placement: the character stands ${placeWords(c)}.`);
    L.push(`Scene: ${loc.en}.`);
    L.push(`Frame: ${fr.en}, full body visible. ${tz.en}`.trim());
    L.push(`Camera: ${camText(state, p)}.`);
  } else {
    L.push("Use the attached reference images as strict character references:");
    L.push(refs.map((r, i) => `Image ${i + 1} = ${i < chars.length ? `capybara ${C.CHARS[chars[i].who].en}` : "lineup reference for relative height"}`).join(", ") + ".");
    L.push("Keep each character exactly as in his or her reference: the same face, head shape, boxy muzzle, heart-shaped nose, eyes, eyebrows, ears, paws, fur color, body proportions, outfit, accessories, colors and 3D style. Do not redesign, restyle, remove or swap clothing between characters.");
    L.push(`Shared family features: ${C.CHARS.dad.face}; paws with four short fingers and small darker brown pads${chars.some(c => c.who === "mom") ? "; mom has two small curved black eyelashes at the outer corner of each eye" : ""}.`);
    L.push("");
    L.push("Characters, from left to right:");
    chars.forEach((c, i) => {
      const ch = C.CHARS[c.who], o = by(C.OUTFITS, c.outfit), p = by(C.POSES, c.pose), e = emotion(c, p);
      if (e.mouth === "open") mouthOpen.push(c.who);
      L.push(`${i + 1}. ${cap(ch.en)} (Image ${i + 1}):`);
      L.push(`   Outfit: ${o.en}.`);
      if (p.prop) L.push(`   Prop: ${p.prop}.`);
      const ov = act.override && act.override[c.who];
      L.push(`   Pose: ${ov || poseText(p, c.who).replace("{object}", c.object || "the object")}.`);
      L.push(`   Expression: ${e.en}.`);
      if (!ov || c.who !== act.offGround) L.push(`   Placement: ${placeWords(c)}.`);
    });
    L.push("");
    if (act.id !== "none") L.push(`Composition: ${fillAction(act, chars, state)}.`);
    L.push(`Relative height (very important, match Image ${refs.length}):`);
    chars.forEach(c => L.push(`- ${heightLine(c.who)}`));
    if (act.offGround) L.push(`The ${C.CHARS[act.offGround].en} is lifted off the ground as described, so his head is clearly above the group; everyone else stands on the same ground line.`);
    else L.push("All characters stand on the same ground line unless the pose says otherwise.");
    L.push("");
    L.push(`Scene: ${loc.en}.`);
    L.push(`Frame: ${fr.en}, full bodies visible. ${tz.en}`.trim());
    L.push(`Camera: ${camText(state, null)}.`);
  }
  L.push(`Lighting: ${light.en}.`);
  L.push(`Style: ${C.STYLE}. High detail, polished key art quality.`);
  if (state.extra) L.push(`Additional details (translate to English if needed): "${state.extra}".`);
  if (state.action === "product") L.push("Do not render any readable text or logos on the packaging; keep labels as simple shapes.");

  /* негатив: в Nano Banana нет отдельного поля, поэтому строка Avoid */
  let neg = [...C.NEG_BASE];
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

/* ---------- новый сезонный эталон (T-поза) ---------- */
function buildReference(outfitId) {
  const o = by(C.OUTFITS, outfitId), ch = C.CHARS[o.who], base = by(C.OUTFITS, `${o.who}-base`);
  const p = [
    `Use the attached image as a strict character reference: capybara ${ch.en}. Keep exactly the same face, head shape, boxy muzzle, heart-shaped nose, eyes with eyebrows${o.who === "mom" ? " and two eyelashes on each eye" : ""}, ears, paws with fingers and dark pads, fur color, body proportions and 3D style. Replace only the outfit with the outfit described below.`,
    `Outfit: ${o.en}.`,
    `Expression: ${by(C.EMOTIONS, C.DEFAULT_EMO[o.who]).en}.`,
    `Style: ${C.STYLE}.`,
    "Pose and framing: T-pose, standing straight and symmetrical, facing the viewer directly, arms extended horizontally to the sides, legs slightly apart. Straight-on front view, full body including any headwear, centered composition.",
    "Background: plain pure white background, soft even studio lighting, soft contact shadow under the feet.",
    "High detail, character model sheet quality.",
    "",
    `Avoid: ${uniq([...C.NEG_BASE, ...C.NEG_TEETH, ...C.NEG_TPOSE, ...ch.neg, ...o.neg]).join(", ")}.`
  ];
  return { prompt: p.join("\n"), refs: [{ key: base.id, file: base.ref, label: `${ch.name} · базовый` }],
    instructions: [`Приложите одну картинку: эталон «${ch.name} · базовый» (кнопка «Скачать» ниже).`, "Вставьте промт и сгенерируйте.", "Удачный результат сохраните: он станет эталоном для всех поз в этой одежде. Админ загружает его в сервис."] };
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
  s.push("Приложите эталоны строго в этом порядке: " + refs.map((r, i) => `${i + 1} — ${r.label}`).join("; ") + ". Скачать их можно кнопками ниже, номера уже в названиях файлов.");
  s.push(`Если есть выбор формата, поставьте ${fr.id}.`);
  s.push("Вставьте промт целиком и сгенерируйте 2–4 варианта.");
  s.push("Проверьте каждый вариант по чек-листу ниже. Не прошёл хотя бы один пункт — перегенерируйте.");
  if (multi) s.push("Если нейросеть выравнивает рост, сгенерируйте персонажей по отдельности и соберите кадр в редакторе по таблице роста.");
  s.push("Надписи и логотипы добавляйте в редакторе, не генерируйте их.");
  s.push("Удачный кадр опубликуйте в галерее: промт и настройки сохранятся вместе с картинкой.");
  return s;
}

window.CapyBuilder = { build, buildReference, check, poseAllowed, actionAllowed };
})();
