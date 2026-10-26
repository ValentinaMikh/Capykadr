/* CapyKadr — интерфейс. Промты собирает builder.js по справочникам data.js, без нейросетей.
   Данные (вход, история, галерея, аналитика, эталоны) — Supabase, права ограничены RLS. */
(() => {
"use strict";
const C = window.CAPY, B = window.CapyBuilder, CFG = window.CAPY_CONFIG;
const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY);
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const by = (l, id) => l.find(o => o.id === id);
const clone = o => JSON.parse(JSON.stringify(o));
const WHO = ["dad", "mom", "son"];
const KEY = "capykadr-state-v1";

let ME = null, ADMIN = false;
let REFS = {}, REFURL = {};            // эталоны: key -> путь в хранилище / подписанная ссылка

/* =====================================================================
   СОСТОЯНИЕ
   ===================================================================== */
const DEF = {
  chars: [{ who: "dad", outfit: "dad-base", pose: "stand", emo: "auto", x: 50, y: 86, object: "" }],
  location: "white", light: "studio", frame: "1:1", camera: "auto", textzone: "none",
  action: "none", product: "", extra: ""
};
function normalize(s) {
  if (!s || !Array.isArray(s.chars) || !s.chars.length) return clone(DEF);
  const out = Object.assign(clone(DEF), s);
  const seen = new Set();
  out.chars = s.chars.filter(c => c && C.CHARS[c.who] && !seen.has(c.who) && seen.add(c.who)).slice(0, 3).map(c => {
    const o = by(C.OUTFITS, c.outfit);
    return {
      who: c.who, outfit: o && o.who === c.who ? c.outfit : `${c.who}-base`,
      pose: by(C.POSES, c.pose) ? c.pose : "stand",
      emo: by(C.EMOTIONS, c.emo) ? c.emo : "auto",
      x: clamp(+c.x || 50, 4, 96), y: clamp(+c.y || 86, 20, 98), object: String(c.object || "")
    };
  });
  if (!out.chars.length) return clone(DEF);
  ["location", "light", "frame", "camera", "textzone", "action"].forEach(k => {
    const list = { location: C.LOCATIONS, light: C.LIGHTS, frame: C.FRAMES, camera: C.CAMERAS, textzone: C.TEXTZONE, action: C.ACTIONS }[k];
    if (!by(list, out[k])) out[k] = DEF[k];
  });
  return out;
}
let S = (() => { try { return normalize(JSON.parse(localStorage.getItem(KEY))); } catch (e) { return clone(DEF); } })();
let MODE = "scene", ACTIVE = S.chars[0].who, REFSEL = "dad-spring", OUTTAB = "prompt", WHY = "";
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function charOf(who) { return S.chars.find(c => c.who === who); }

/* =====================================================================
   МЕЛОЧИ: тост, окна, буфер
   ===================================================================== */
let toastT;
function toast(t) { const el = $("toast"); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, 4200); }
function modal(html, mount, wide) {
  const m = $("modal");
  m.innerHTML = `<div class="wrap"><div class="win${wide ? " wide" : ""}" role="dialog" aria-modal="true"><button class="x" type="button" aria-label="Закрыть">×</button>${html}</div></div>`;
  const wrap = m.firstChild, win = wrap.firstChild, prev = document.activeElement;
  const close = () => { m.innerHTML = ""; document.removeEventListener("keydown", onKey); if (prev && prev.focus) prev.focus(); };
  const onKey = e => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onKey);
  wrap.addEventListener("click", e => { if (e.target === wrap) close(); });
  win.querySelector(".x").addEventListener("click", close);
  if (mount) mount(win, close);
  const f = win.querySelector("input,textarea,button:not(.x)"); if (f) f.focus();
  return close;
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; }
  catch (e) {
    const ta = document.createElement("textarea"); ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand("copy"); } catch (e2) {}
    ta.remove(); return ok;
  }
}
const fmtDate = d => new Date(d).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const extOf = f => ((f.name || "").split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
async function logEvent(kind, meta) { if (!ME) return; try { await sb.from("events").insert({ kind, meta }); } catch (e) {} }

/* =====================================================================
   ФИГУРКИ ДЛЯ ХОЛСТА (простые силуэты в цветах одежды)
   ===================================================================== */
const P = C.PAL, FUR = P.fur, FURD = "#C46A2E", PINK = "#F2A7B8";
const LOOK = {
  "dad-base":      { top: P.red, stripes: 1, bottom: "pants", bc: P.beige },
  "mom-base":      { top: P.red, bottom: "skirt" },
  "son-base":      { top: P.red, stripes: 1, bottom: "shorts", bc: P.red, hat: "cap", shoes: P.green },
  "dad-spring":    { top: P.offwhite, inner: P.red, bottom: "pants", bc: P.beige },
  "mom-spring":    { top: P.yellow, inner: P.red, bottom: "skirt", hat: "flower" },
  "son-spring":    { top: P.clover, inner: P.red, bottom: "shorts", bc: P.red, hat: "cap", shoes: P.green },
  "dad-summer":    { top: P.red, stripes: 1, bottom: "none", glasses: 1 },
  "mom-summer":    { top: P.red, bottom: "dress", hat: "boater" },
  "son-summer":    { top: P.red, stripes: 1, bottom: "none" },
  "dad-autumn":    { top: P.red, stripes: 1, bottom: "pants", bc: P.beige, scarf: P.yellow },
  "mom-autumn":    { top: P.red, bottom: "skirt", hat: "beret", shoes: P.yellow },
  "son-autumn":    { top: P.yellow, bottom: "shorts", bc: P.red, hat: "cap", shoes: P.yellow },
  "dad-winter":    { top: P.red, knit: 1, bottom: "none", hat: "beanie", pom: P.offwhite, scarf: P.red },
  "dad-winter-sw": { top: P.red, knit: 1, bottom: "none" },
  "mom-winter":    { top: P.red, knit: 1, bottom: "skirt", hat: "earmuffs", scarf: PINK },
  "son-winter":    { top: P.red, knit: 1, bottom: "none", hat: "beanie", pom: P.green, scarf: P.green }
};
function figSVG(who, outfit, uid) {
  const L = LOOK[outfit] || LOOK[`${who}-base`];
  const bw = who === "mom" ? 26 : who === "son" ? 28 : 33;           // половина ширины туловища
  const head = who === "son" ? { y: 6, h: 92 } : { y: 14, h: 80 };
  const id = `c${uid}`;
  let s = `<svg viewBox="0 0 100 200" preserveAspectRatio="none" aria-hidden="true"><defs><clipPath id="${id}"><rect x="${50 - bw}" y="90" width="${bw * 2}" height="68" rx="20"/></clipPath></defs>`;
  // ноги и стопы
  s += `<rect x="31" y="150" width="15" height="40" rx="6" fill="${who === "mom" ? FURD : FUR}"/><rect x="54" y="150" width="15" height="40" rx="6" fill="${who === "mom" ? FURD : FUR}"/>`;
  s += L.shoes ? `<ellipse cx="38" cy="192" rx="12" ry="7" fill="${L.shoes}"/><ellipse cx="62" cy="192" rx="12" ry="7" fill="${L.shoes}"/>`
               : `<ellipse cx="38" cy="192" rx="10" ry="5" fill="${FURD}"/><ellipse cx="62" cy="192" rx="10" ry="5" fill="${FURD}"/>`;
  // низ
  if (L.bottom === "pants") s += `<path d="M${50 - bw + 3} 148h${(bw - 3) * 2}v34h-20v-20h-${(bw - 3) * 2 - 40}v20h-20z" fill="${L.bc}"/>`;
  if (L.bottom === "shorts") s += `<rect x="${50 - bw + 2}" y="146" width="${(bw - 2) * 2}" height="24" rx="6" fill="${L.bc}"/>`;
  if (L.bottom === "skirt") s += `<path d="M${50 - bw} 146h${bw * 2}l8 26h-${bw * 2 + 16}z" fill="${P.red}"/><path d="M${50 - bw - 3} 154h${bw * 2 + 6}M${50 - bw - 5} 162h${bw * 2 + 10}" stroke="${P.offwhite}" stroke-width="4"/>`;
  if (L.bottom === "dress") s += `<path d="M${50 - bw} 120h${bw * 2}l12 58h-${bw * 2 + 24}z" fill="${P.red}"/><path d="M${50 - bw - 9} 168h${bw * 2 + 18}" stroke="${P.offwhite}" stroke-width="6"/>`;
  // руки
  s += `<rect x="${50 - bw - 12}" y="96" width="14" height="46" rx="7" fill="${L.top}"/><rect x="${50 + bw - 2}" y="96" width="14" height="46" rx="7" fill="${L.top}"/>`;
  s += `<circle cx="${50 - bw - 5}" cy="145" r="7" fill="${FURD}"/><circle cx="${50 + bw + 5}" cy="145" r="7" fill="${FURD}"/>`;
  // туловище
  if (L.bottom !== "dress") {
    s += `<rect x="${50 - bw}" y="90" width="${bw * 2}" height="68" rx="20" fill="${L.top}"/>`;
    if (L.stripes) s += `<g clip-path="url(#${id})" fill="${P.offwhite}"><rect x="0" y="104" width="100" height="8"/><rect x="0" y="122" width="100" height="8"/><rect x="0" y="140" width="100" height="8"/></g>`;
    if (L.inner) s += `<rect x="44" y="92" width="12" height="62" fill="${L.inner}"/>`;
    if (L.knit) s += `<g clip-path="url(#${id})" stroke="${P.offwhite}" stroke-width="3" fill="none"><path d="M10 110l6 -6 6 6 6 -6 6 6 6 -6 6 6 6 -6 6 6 6 -6 6 6 6 -6 6 6 6 -6"/></g>`;
  } else s += `<rect x="${50 - bw + 2}" y="92" width="${(bw - 2) * 2}" height="34" rx="12" fill="${P.red}"/><rect x="${50 - bw + 2}" y="104" width="${(bw - 2) * 2}" height="6" fill="${P.offwhite}"/>`;
  // шарф
  if (L.scarf) s += `<rect x="${50 - bw + 4}" y="86" width="${(bw - 4) * 2}" height="11" rx="5" fill="${L.scarf}"/><rect x="${50 + 6}" y="92" width="10" height="34" rx="4" fill="${L.scarf}"/>`;
  // голова
  const hy = head.y, hh = head.h;
  s += `<circle cx="30" cy="${hy + 8}" r="8" fill="${FUR}"/><circle cx="70" cy="${hy + 8}" r="8" fill="${FUR}"/><circle cx="30" cy="${hy + 8}" r="4" fill="${PINK}"/><circle cx="70" cy="${hy + 8}" r="4" fill="${PINK}"/>`;
  s += `<rect x="22" y="${hy}" width="56" height="${hh}" rx="24" fill="${FUR}"/>`;
  s += `<rect x="33" y="${hy + hh * .42}" width="34" height="${hh * .55}" rx="12" fill="${P.muzzle}"/>`;
  s += `<path d="M50 ${hy + hh * .52}c-3-4-9-2-7 3l7 6 7-6c2-5-4-7-7-3z" fill="#4A2015"/>`;
  const ey = hy + hh * .3;
  s += `<circle cx="29" cy="${ey}" r="4" fill="#fff"/><circle cx="71" cy="${ey}" r="4" fill="#fff"/><circle cx="29" cy="${ey}" r="2.6" fill="#5A3010"/><circle cx="71" cy="${ey}" r="2.6" fill="#5A3010"/>`;
  s += `<path d="M24 ${ey - 7}h9M67 ${ey - 7}h9" stroke="${FURD}" stroke-width="2.4" stroke-linecap="round"/>`;
  if (who === "mom") s += `<path d="M24 ${ey - 2}l-4 -3M24 ${ey}l-5 -1M76 ${ey - 2}l4 -3M76 ${ey}l5 -1" stroke="#222" stroke-width="1.6" stroke-linecap="round"/>`;
  // головные уборы и аксессуары
  if (L.hat === "cap") s += `<path d="M24 ${hy + 14}q26 -24 52 0z" fill="${P.yellow}"/><rect x="18" y="${hy + 10}" width="34" height="6" rx="3" fill="${P.yellow}"/><circle cx="50" cy="${hy + 6}" r="3.5" fill="${P.clover}"/>`;
  if (L.hat === "beanie") s += `<path d="M22 ${hy + 16}q28 -32 56 0z" fill="${P.red}"/><rect x="20" y="${hy + 12}" width="60" height="9" rx="4" fill="${P.offwhite}"/><circle cx="50" cy="${hy - 8}" r="7" fill="${L.pom}"/>`;
  if (L.hat === "beret") s += `<ellipse cx="46" cy="${hy + 2}" rx="26" ry="8" fill="${P.red}"/>`;
  if (L.hat === "boater") s += `<ellipse cx="50" cy="${hy + 4}" rx="34" ry="6" fill="${P.beige}"/><rect x="34" y="${hy - 8}" width="32" height="12" rx="3" fill="${P.beige}"/><rect x="34" y="${hy}" width="32" height="3" fill="${P.red}"/>`;
  if (L.hat === "earmuffs") s += `<path d="M24 ${hy + 10}q26 -26 52 0" stroke="#D97A93" stroke-width="3" fill="none"/><circle cx="24" cy="${hy + 12}" r="9" fill="${PINK}"/><circle cx="76" cy="${hy + 12}" r="9" fill="${PINK}"/>`;
  if (L.hat === "flower") s += `<circle cx="50" cy="${hy + 3}" r="6" fill="#fff"/><circle cx="50" cy="${hy + 3}" r="2.4" fill="${P.yellow}"/>`;
  if (L.glasses) s += `<rect x="21" y="${ey - 6}" width="16" height="11" rx="4" fill="#2E5A2A" stroke="${P.yellow}" stroke-width="2.5"/><rect x="63" y="${ey - 6}" width="16" height="11" rx="4" fill="#2E5A2A" stroke="${P.yellow}" stroke-width="2.5"/>`;
  return s + "</svg>";
}

/* =====================================================================
   КОНСТРУКТОР: шаги
   ===================================================================== */
const PGROUP = [
  ["Базовые", ["stand", "sit", "lie"]],
  ["Универсальные", ["wave", "hold", "point", "walk", "run", "jump", "think", "table"]],
  ["Сюжетные", ["hand", "cake-flowers", "leaves-branch", "umbrella", "skip", "cake", "puddle", "catch-leaves"]],
  ["Сезонные", ["snowball", "garland-dad", "ornament", "star-mom", "garland-mom", "slide", "paddle", "palm", "swimring", "water"]]
];
const SEASON_NAME = Object.fromEntries(C.SEASONS);

function renderSteps() {
  const el = $("steps");
  $("stageBox").hidden = MODE !== "scene";
  if (MODE === "ref") return renderRefSteps(el);
  const cur = charOf(ACTIVE) || S.chars[0]; ACTIVE = cur.who;
  const o = by(C.OUTFITS, cur.outfit);
  let h = "";

  // 1. Кто в кадре
  h += `<section class="block"><header><span class="n">01</span><h2>Кто в кадре</h2></header><div class="cast">`;
  WHO.forEach(w => {
    const on = !!charOf(w);
    h += `<button type="button" class="castbtn" data-cast="${w}" aria-pressed="${on}">${figSVG(w, `${w}-base`, "c" + w)}${C.CHARS[w].name}</button>`;
  });
  h += `</div><p class="hint">От одного до трёх героев. Рост в промте подставится сам: мама ≈ 88%, сын ≈ 67% от папы.</p></section>`;

  // 2. Персонаж
  h += `<section class="block"><header><span class="n">02</span><h2>Одежда, поза, эмоция</h2></header>`;
  if (S.chars.length > 1) {
    h += `<div class="ctabs" role="tablist">` + S.chars.map(c => `<button type="button" role="tab" data-tab="${c.who}" aria-selected="${c.who === ACTIVE}">${C.CHARS[c.who].name}</button>`).join("") + `</div>`;
  }
  h += `<div class="sub">Сезон</div><div class="seg" role="radiogroup" aria-label="Сезон">` +
    C.SEASONS.map(([id, nm]) => `<button type="button" role="radio" data-season="${id}" aria-checked="${o.season === id}">${nm}</button>`).join("") + `</div>`;
  h += `<div class="sub">Одежда</div><div class="cards">` + C.OUTFITS.filter(x => x.who === ACTIVE && x.season === o.season).map(x =>
    `<button type="button" class="card" role="radio" data-outfit="${x.id}" aria-checked="${x.id === cur.outfit}"><b>${esc(x.name)}</b>${x.draft ? `<span class="tag draft">черновик</span>` : !x.ref ? `<span class="tag">без эталона</span>` : ""}<small>${SEASON_NAME[x.season]}</small></button>`).join("") + `</div>`;
  if (!o.ref || o.draft) h += `<p class="why">${!o.ref ? "Эталона в этой одежде пока нет: приложится базовый, одежда может «плыть». Сделайте эталон в режиме «Новый эталон»." : "Описание одежды черновое — проверьте результат внимательнее."}</p>`;

  h += `<div class="sub">Поза</div>`;
  PGROUP.forEach(([gname, ids]) => {
    h += `<div class="hint" style="margin:10px 0 6px">${gname}</div><div class="row">`;
    ids.forEach(pid => {
      const p = by(C.POSES, pid); if (!p) return;
      const why = B.poseAllowed(p, ACTIVE, cur.outfit);
      if (why && p.who !== "*" && !p.who.includes(ACTIVE)) return;             // чужие позы не показываем
      h += `<button type="button" class="chip" data-pose="${pid}" aria-pressed="${pid === cur.pose}" ${why ? `aria-disabled="true" data-why="${esc(why)}"` : ""}>${esc(p.name)}</button>`;
    });
    h += `</div>`;
  });
  if (WHY) h += `<p class="why" role="status">${esc(WHY)}</p>`;
  const pose = by(C.POSES, cur.pose);
  if (pose.needs === "object") h += `<label class="f" for="objIn">${pose.id === "hold" ? "Что держит" : "На что показывает"}</label><input id="objIn" type="text" value="${esc(cur.object)}" placeholder="например: банку мёда / a jar of honey">`;

  h += `<div class="sub">Эмоция</div><div class="row">` + C.EMOTIONS.map(e =>
    `<button type="button" class="chip" data-emo="${e.id}" aria-pressed="${e.id === cur.emo}">${esc(e.name)}</button>`).join("") + `</div>`;
  h += `<p class="hint">«По позе» — спокойная улыбка, а в динамичных позах смех.</p></section>`;

  // 3. Действие
  const season = (() => { const ss = [...new Set(S.chars.map(c => by(C.OUTFITS, c.outfit).season))].filter(x => x !== "base"); return ss.length === 1 ? ss[0] : null; })();
  h += `<section class="block"><header><span class="n">03</span><h2>Что делают вместе</h2></header><div class="row">`;
  C.ACTIONS.forEach(a => {
    const why = B.actionAllowed(a, S.chars, season);
    h += `<button type="button" class="chip" data-action="${a.id}" aria-pressed="${a.id === S.action}" ${why ? `aria-disabled="true" data-why="${esc(why)}"` : ""}>${esc(a.name)}</button>`;
  });
  h += `</div>`;
  if (S.action === "product") h += `<label class="f" for="prodIn">Какой продукт</label><input id="prodIn" type="text" value="${esc(S.product)}" placeholder="например: зелёная упаковка йогурта КуулКлевер"><p class="hint">Надписи на упаковке нейросеть не пишет. Лучше приложите фото упаковки последним референсом.</p>`;
  h += `</section>`;

  // 4. Место и свет
  h += `<section class="block"><header><span class="n">04</span><h2>Место и свет</h2></header><div class="cards">` + C.LOCATIONS.map(l =>
    `<button type="button" class="card" role="radio" data-loc="${l.id}" aria-checked="${l.id === S.location}"><b>${esc(l.name)}</b>${l.draft ? `<span class="tag draft">черновик</span>` : ""}<small>${l.season ? SEASON_NAME[l.season] : "Любой сезон"}</small></button>`).join("") + `</div>`;
  h += `<div class="sub">Свет</div><div class="row">` + C.LIGHTS.map(l => `<button type="button" class="chip" data-light="${l.id}" aria-pressed="${l.id === S.light}">${esc(l.name)}</button>`).join("") + `</div></section>`;

  // 5. Кадр
  h += `<section class="block"><header><span class="n">05</span><h2>Кадр</h2></header>`;
  h += `<div class="sub">Формат</div><div class="seg" role="radiogroup">` + C.FRAMES.map(f => `<button type="button" role="radio" data-frame="${f.id}" aria-checked="${f.id === S.frame}">${esc(f.name)}</button>`).join("") + `</div>`;
  h += `<div class="sub">Ракурс</div><div class="row">` + C.CAMERAS.map(c => `<button type="button" class="chip" data-cam="${c.id}" aria-pressed="${c.id === S.camera}">${esc(c.name)}</button>`).join("") + `</div>`;
  h += `<div class="sub">Место под текст</div><div class="seg" role="radiogroup">` + C.TEXTZONE.map(t => `<button type="button" role="radio" data-tz="${t.id}" aria-checked="${t.id === S.textzone}">${esc(t.name)}</button>`).join("") + `</div>`;
  h += `<label class="f" for="extraIn">Добавить своими словами</label><textarea id="extraIn" placeholder="Например: на столе тарелка с блинами, за окном снег">${esc(S.extra)}</textarea></section>`;

  el.innerHTML = h;
}

function renderRefSteps(el) {
  const o = by(C.OUTFITS, REFSEL), who = o.who;
  let h = `<section class="block"><header><span class="n">01</span><h2>Новый эталон в T-позе</h2></header>
    <p class="hint" style="margin-top:0">Эталон — картинка героя в новой одежде, от которой потом строятся все позы. Делается один раз: базовый эталон + промт → T-поза в новой одежде. Удачный результат админ загружает в CapyKadr.</p>
    <div class="sub">Персонаж</div><div class="seg" role="radiogroup">` +
    WHO.map(w => `<button type="button" role="radio" data-refwho="${w}" aria-checked="${w === who}">${C.CHARS[w].name}</button>`).join("") + `</div>`;
  h += `<div class="sub">Одежда</div><div class="cards">` + C.OUTFITS.filter(x => x.who === who && x.season !== "base").map(x => {
    const has = !!(REFS[x.id]);
    return `<button type="button" class="card" role="radio" data-refout="${x.id}" aria-checked="${x.id === REFSEL}"><b>${esc(x.name)}</b><span class="tag${x.draft ? " draft" : ""}">${has ? "эталон есть" : x.draft ? "черновик" : "нет эталона"}</span><small>${SEASON_NAME[x.season]}</small></button>`;
  }).join("") + `</div></section>`;
  el.innerHTML = h;
}

/* события шагов */
$("steps").addEventListener("click", e => {
  const t = e.target.closest("button"); if (!t) return;
  const d = t.dataset;
  if (t.getAttribute("aria-disabled") === "true") { WHY = d.why || ""; renderSteps(); return; }
  WHY = "";
  const cur = charOf(ACTIVE);
  if (d.cast) toggleCast(d.cast);
  else if (d.tab) ACTIVE = d.tab;
  else if (d.season) { const first = C.OUTFITS.find(x => x.who === ACTIVE && x.season === d.season); if (first) setOutfit(cur, first.id); }
  else if (d.outfit) setOutfit(cur, d.outfit);
  else if (d.pose) cur.pose = d.pose;
  else if (d.emo) cur.emo = d.emo;
  else if (d.action) { S.action = d.action; if (d.action === "shoulders") placeShoulders(); }
  else if (d.loc) S.location = d.loc;
  else if (d.light) S.light = d.light;
  else if (d.frame) S.frame = d.frame;
  else if (d.cam) S.camera = d.cam;
  else if (d.tz) { S.textzone = d.tz; arrange(); }
  else if (d.refwho) REFSEL = C.OUTFITS.find(x => x.who === d.refwho && x.season !== "base").id;
  else if (d.refout) REFSEL = d.refout;
  else return;
  fix(); save(); renderAll();
});
$("steps").addEventListener("input", e => {
  const cur = charOf(ACTIVE);
  if (e.target.id === "objIn") cur.object = e.target.value;
  else if (e.target.id === "prodIn") S.product = e.target.value;
  else if (e.target.id === "extraIn") S.extra = e.target.value;
  else return;
  save(); renderOut();
});
document.querySelectorAll("[data-mode]").forEach(b => b.addEventListener("click", () => {
  MODE = b.dataset.mode;
  document.querySelectorAll("[data-mode]").forEach(x => x.setAttribute("aria-checked", String(x === b)));
  renderAll();
}));

function toggleCast(w) {
  const c = charOf(w);
  if (c) {
    if (S.chars.length === 1) { toast("В кадре должен остаться хотя бы один герой"); return; }
    S.chars = S.chars.filter(x => x.who !== w);
    if (ACTIVE === w) ACTIVE = S.chars[0].who;
  } else {
    const seasons = S.chars.map(x => by(C.OUTFITS, x.outfit).season).filter(s => s !== "base");
    const o = seasons.length ? C.OUTFITS.find(x => x.who === w && x.season === seasons[0]) : null;
    S.chars.push({ who: w, outfit: o ? o.id : `${w}-base`, pose: "stand", emo: "auto", x: 50, y: 86, object: "" });
    S.chars.sort((a, b) => C.CHARS[a.who].order - C.CHARS[b.who].order);
    ACTIVE = w;
  }
  arrange();
}
function setOutfit(c, id) { c.outfit = id; }
function fix() {
  const notes = [];
  S.chars.forEach(c => {
    const p = by(C.POSES, c.pose);
    if (B.poseAllowed(p, c.who, c.outfit)) { notes.push(`${C.CHARS[c.who].name}: поза «${p.name}» недоступна в этой одежде, выбрана «Стоит»`); c.pose = "stand"; }
  });
  const a = by(C.ACTIONS, S.action);
  if (B.actionAllowed(a, S.chars, null) && a.id !== "none") { notes.push(`Действие «${a.name}» не подходит для этого состава, оно снято`); S.action = "none"; }
  if (S.action === "shoulders") placeShoulders();
  if (notes.length) toast(notes.join(". "));
}

/* =====================================================================
   ХОЛСТ
   ===================================================================== */
const LOC_BG = {
  white: "#FFFFFF", green: "radial-gradient(circle at 50% 45%,#A9D46A,#80BA27)", cream: "#FFF4E6",
  spring: "linear-gradient(#FDF1F4 0 55%,#CFE8B0 55%)", meadow: "linear-gradient(#CFE9FA 0 55%,#B9DC8A 55%)",
  autumn: "linear-gradient(160deg,#FFF4E6,#FBD9A8)", winter: "linear-gradient(#E6EEF7 0 58%,#FFFFFF 58%)",
  park: "linear-gradient(#DDEFD0 0 55%,#A8D07A 55%)", picnic: "linear-gradient(#DDEFD0 0 55%,#9CCB6A 55%)",
  kitchen: "linear-gradient(#F6EBDD 0 62%,#D9B98F 62%)", cafe: "linear-gradient(#E9D2B5 0 62%,#B88A5A 62%)", shop: "linear-gradient(#F4EFE6 0 64%,#E2D6C2 64%)"
};
const POSE_BOX = { sit: [1.15, .72], lie: [1.9, .42], air: [1, 1] };
function figBox(c, H) {
  const p = by(C.POSES, c.pose), [kw, kh] = POSE_BOX[p.ground] || [1, 1];
  const h = H * .5 * (C.CHARS[c.who].h / 100) * kh;
  return { w: h / kh * .52 * kw, h };
}
function arrange() {
  const n = S.chars.length;
  let xs = n === 1 ? [50] : n === 2 ? [36, 64] : [26, 50, 74];
  if (S.textzone === "left") xs = xs.map(x => 40 + x * .55);
  if (S.textzone === "right") xs = xs.map(x => 5 + x * .55);
  const order = [...S.chars].sort((a, b) => a.x - b.x || C.CHARS[a.who].order - C.CHARS[b.who].order);
  order.forEach((c, i) => { c.x = xs[i]; c.y = S.textzone === "top" ? 94 : 86; });
  if (S.action === "shoulders") placeShoulders();
}
function placeShoulders() {
  const d = charOf("dad"), s = charOf("son"); if (!d || !s) return;
  s.x = d.x; s.y = d.y - 27;
}
function renderCanvas() {
  const cv = $("canvas"); if (MODE !== "scene") return;
  const f = by(C.FRAMES, S.frame), [rw, rh] = f.id.split(":").map(Number);
  cv.style.aspectRatio = `${rw} / ${rh}`;
  cv.style.background = LOC_BG[S.location] || "#fff";
  const H = cv.clientHeight || 300;
  let h = "";
  const tz = { left: "left:0;top:0;bottom:0;width:33.3%", right: "right:0;top:0;bottom:0;width:33.3%", top: "left:0;right:0;top:0;height:33.3%" }[S.textzone];
  if (tz) h += `<div class="zone" style="${tz}">Место под текст</div>`;
  [...S.chars].sort((a, b) => a.y - b.y).forEach(c => {
    const bx = figBox(c, H), locked = S.action === "shoulders" && c.who === "son" && charOf("dad");
    h += `<div class="fig${c.who === ACTIVE ? " sel" : ""}${locked ? " locked" : ""}" data-fig="${c.who}" style="left:${c.x}%;top:${c.y}%;width:${bx.w}px;height:${bx.h}px;z-index:${locked ? 200 : Math.round(c.y)}" title="${C.CHARS[c.who].name} · ${esc(by(C.POSES, c.pose).name)}" role="button" tabindex="0" aria-label="${C.CHARS[c.who].name}: стрелками можно двигать">${figSVG(c.who, c.outfit, "f" + c.who)}${locked ? "" : `<span class="nm">${C.CHARS[c.who].name}</span>`}</div>`;
  });
  cv.innerHTML = h;
}
(() => {
  const cv = $("canvas"); let drag = null;
  cv.addEventListener("pointerdown", e => {
    const f = e.target.closest(".fig"); if (!f) return;
    const who = f.dataset.fig;
    if (ACTIVE !== who) { ACTIVE = who; renderSteps(); }
    if (f.classList.contains("locked")) { toast("Сын сидит на плечах у папы: двигайте папу"); return; }
    const r = cv.getBoundingClientRect(), c = charOf(who);
    drag = { who, f, r, dx: e.clientX - (r.left + r.width * c.x / 100), dy: e.clientY - (r.top + r.height * c.y / 100) };
    f.setPointerCapture(e.pointerId); e.preventDefault();
  });
  cv.addEventListener("pointermove", e => {
    if (!drag) return;
    const c = charOf(drag.who), r = drag.r;
    c.x = clamp((e.clientX - drag.dx - r.left) / r.width * 100, 4, 96);
    c.y = clamp((e.clientY - drag.dy - r.top) / r.height * 100, 20, 98);
    drag.f.style.left = c.x + "%"; drag.f.style.top = c.y + "%"; drag.f.style.zIndex = Math.round(c.y);
    if (drag.who === "dad" && S.action === "shoulders") {
      placeShoulders(); const sf = cv.querySelector('[data-fig="son"]'), s = charOf("son");
      if (sf) { sf.style.left = s.x + "%"; sf.style.top = s.y + "%"; }
    }
  });
  const end = () => { if (!drag) return; drag = null; save(); renderCanvas(); renderOut(); };
  cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
  cv.addEventListener("keydown", e => {
    const f = e.target.closest(".fig"); if (!f) return;
    const k = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] }[e.key]; if (!k) return;
    const c = charOf(f.dataset.fig); if (f.classList.contains("locked")) return;
    c.x = clamp(c.x + k[0], 4, 96); c.y = clamp(c.y + k[1], 20, 98); if (S.action === "shoulders") placeShoulders();
    e.preventDefault(); save(); renderCanvas(); renderOut();
    const nf = $("canvas").querySelector(`[data-fig="${c.who}"]`); if (nf) nf.focus();
  });
  if (window.ResizeObserver) new ResizeObserver(() => renderCanvas()).observe(cv);
})();
$("arrange").addEventListener("click", () => { arrange(); save(); renderCanvas(); renderOut(); });

/* =====================================================================
   ВЫХОД: промт, эталоны, инструкция
   ===================================================================== */
let LAST = null;
function renderOut() {
  const el = $("out");
  const r = MODE === "scene" ? B.build(S) : B.buildReference(REFSEL);
  LAST = r;
  const issues = r.issues || [], warns = r.warnings || [];
  let h = `<div class="acts"><button class="btn primary" type="button" id="copyBtn" ${issues.length ? "disabled" : ""}>Скопировать промт</button></div>`;
  if (issues.length) h += `<div class="msg err"><b>Промт не собрать:</b><ul>${issues.map(i => `<li>${esc(i)}</li>`).join("")}</ul></div>`;
  if (warns.length) h += `<div class="msg warn"><ul>${warns.map(i => `<li>${esc(i)}</li>`).join("")}</ul></div>`;
  h += `<div class="sub" style="margin-top:4px">Приложите эталоны в этом порядке</div><ul class="refs">` + r.refs.map((x, i) => {
    const has = !!REFS[x.key], url = REFURL[x.key];
    return `<li><span class="num">${i + 1}</span>${url ? `<img src="${esc(url)}" alt="">` : `<span class="ph"></span>`}<span>${esc(x.label)}${has ? "" : `<br><small style="color:var(--faint)">Файл ещё не загружен (${esc(x.file)})</small>`}</span>${has ? `<button class="btn small" type="button" data-dl="${i}">Скачать</button>` : ""}</li>`;
  }).join("") + `</ul>`;
  if (r.refs.some(x => REFS[x.key])) h += `<div class="row" style="margin-top:8px"><button class="btn small" type="button" id="dlAll">Скачать все по порядку</button></div>`;
  h += `<div class="seg otabs" role="radiogroup" style="margin-top:14px">` +
    [["prompt", "Промт"], ["how", "Инструкция"], ["check", "Чек-лист"]].map(([id, nm]) => `<button type="button" role="radio" data-ot="${id}" aria-checked="${OUTTAB === id}">${nm}</button>`).join("") + `</div>`;
  if (OUTTAB === "prompt") h += `<pre class="prompt" tabindex="0" aria-label="Промт">${esc(r.prompt)}</pre>`;
  if (OUTTAB === "how") h += `<ol class="steps">${r.instructions.map(s => `<li>${esc(s)}</li>`).join("")}</ol>`;
  if (OUTTAB === "check") h += `<ul class="check">${(r.checklist || C.CHECKLIST).map(s => `<li>${esc(s)}</li>`).join("")}</ul><p class="hint">Не прошёл хотя бы один пункт — перегенерируйте.</p>`;
  el.innerHTML = h;
}
$("out").addEventListener("click", async e => {
  const t = e.target.closest("button"); if (!t) return;
  if (t.dataset.ot) { OUTTAB = t.dataset.ot; renderOut(); return; }
  if (t.id === "copyBtn") return copyPrompt();
  if (t.dataset.dl !== undefined) return downloadRef(LAST.refs[+t.dataset.dl], +t.dataset.dl);
  if (t.id === "dlAll") { for (let i = 0; i < LAST.refs.length; i++) if (REFS[LAST.refs[i].key]) await downloadRef(LAST.refs[i], i); }
});
async function downloadRef(ref, i) {
  const path = REFS[ref.key]; if (!path) return;
  const { data, error } = await sb.storage.from("refs").download(path);
  if (error) { toast("Не удалось скачать эталон"); return; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(data);
  a.download = `${i + 1}-${ref.key}.${path.split(".").pop()}`; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
function stateMeta(st) {
  return { who: st.chars.map(c => c.who), outfits: st.chars.map(c => c.outfit), poses: st.chars.map(c => c.pose),
    emos: st.chars.map(c => c.emo), location: st.location, light: st.light, frame: st.frame, camera: st.camera, action: st.action, textzone: st.textzone };
}
async function copyPrompt() {
  if (!LAST || (LAST.issues && LAST.issues.length)) return;
  const ok = await copyText(LAST.prompt);
  if (!ok) { toast("Не получилось скопировать. Выделите текст промта вручную."); return; }
  if (MODE === "scene") {
    toast("Промт скопирован. Приложите эталоны, сгенерируйте в Nano Banana и оцените результат в «Мои промты».");
    const st = clone(S);
    sb.from("prompt_history").insert({ state: st, prompt: LAST.prompt }).then(() => {});
    logEvent("copy_prompt", stateMeta(st));
  } else {
    toast("Промт эталона скопирован. Приложите базовый эталон и сгенерируйте T-позу.");
    logEvent("copy_reference", { outfit: REFSEL });
  }
}

function renderAll() { renderSteps(); renderCanvas(); renderOut(); }

/* =====================================================================
   ЭТАЛОНЫ (картинки в закрытом хранилище refs)
   ===================================================================== */
async function loadRefs() {
  REFS = {}; REFURL = {};
  const { data } = await sb.from("ref_images").select("*");
  (data || []).forEach(r => REFS[r.id] = r.image_path);
  const keys = Object.keys(REFS);
  if (keys.length) {
    const { data: urls } = await sb.storage.from("refs").createSignedUrls(keys.map(k => REFS[k]), 60 * 60 * 12);
    (urls || []).forEach((u, i) => { if (u && u.signedUrl) REFURL[keys[i]] = u.signedUrl; });
  }
}

/* =====================================================================
   МОИ ПРОМТЫ
   ===================================================================== */
function sceneChips(st) {
  if (!st || !st.chars) return [];
  const out = st.chars.map(c => `${C.CHARS[c.who] ? C.CHARS[c.who].name : c.who}: ${(by(C.OUTFITS, c.outfit) || {}).name || ""}, ${(by(C.POSES, c.pose) || {}).name || ""}`);
  const l = by(C.LOCATIONS, st.location); if (l) out.push(l.name);
  const a = by(C.ACTIONS, st.action); if (a && a.id !== "none") out.push(a.name);
  out.push(st.frame);
  return out;
}
async function loadHistory() {
  const el = $("hList"); el.innerHTML = `<div class="empty">Загружаем…</div>`;
  const { data, error } = await sb.from("prompt_history").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) { el.innerHTML = `<div class="empty">Не удалось загрузить: ${esc(error.message)}</div>`; return; }
  if (!data.length) { el.innerHTML = `<div class="empty">Здесь появятся промты, которые вы скопируете в конструкторе.</div>`; return; }
  el.innerHTML = data.map(r => `<article class="hitem" data-id="${r.id}">
    <div><div class="meta">${fmtDate(r.created_at)}</div><div class="chips">${sceneChips(r.state).map(c => `<span class="mini">${esc(c)}</span>`).join("")}</div></div>
    <div class="acts"><span class="stars" role="radiogroup" aria-label="Оценка">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-rate="${n}" class="${r.rating >= n ? "on" : ""}" aria-label="${n} из 5">★</button>`).join("")}</span>
      <button class="btn small" type="button" data-apply>Применить</button>
      <button class="btn small" type="button" data-copy>Скопировать</button>
      <button class="btn small primary" type="button" data-pub>Опубликовать</button>
      <button class="btn small danger" type="button" data-del>Удалить</button></div></article>`).join("");
  el._data = data;
}
$("hList").addEventListener("click", async e => {
  const t = e.target.closest("button"), item = e.target.closest(".hitem"); if (!t || !item) return;
  const row = $("hList")._data.find(r => r.id === item.dataset.id);
  if (t.dataset.rate) {
    const v = +t.dataset.rate; row.rating = v;
    item.querySelectorAll("[data-rate]").forEach(b => b.classList.toggle("on", +b.dataset.rate <= v));
    await sb.from("prompt_history").update({ rating: v }).eq("id", row.id);
    logEvent("rate", { rating: v, ...stateMeta(row.state) });
    if (v >= 4) toast("Отличный результат — поделитесь им в галерее, коллегам пригодится.");
  } else if (t.dataset.apply !== undefined) { applyState(row.state); }
  else if (t.dataset.copy !== undefined) { if (await copyText(row.prompt)) toast("Промт скопирован"); }
  else if (t.dataset.pub !== undefined) publishDialog(row);
  else if (t.dataset.del !== undefined) {
    if (t.dataset.sure) { await sb.from("prompt_history").delete().eq("id", row.id); item.remove(); toast("Удалено"); }
    else { t.dataset.sure = "1"; t.textContent = "Точно удалить?"; setTimeout(() => { if (t.isConnected) { delete t.dataset.sure; t.textContent = "Удалить"; } }, 3000); }
  }
});
function applyState(st) {
  S = normalize(clone(st)); ACTIVE = S.chars[0].who; MODE = "scene";
  document.querySelectorAll("[data-mode]").forEach(x => x.setAttribute("aria-checked", String(x.dataset.mode === "scene")));
  save(); location.hash = "#builder"; renderAll(); toast("Настройки применены");
}
function publishDialog(row) {
  modal(`<h2>Поделиться в галерее</h2><p class="hint">Картинка, промт и настройки появятся у всей команды.</p>
    <label class="f" for="pFile">Картинка из Nano Banana</label><input id="pFile" type="file" accept="image/png,image/jpeg,image/webp">
    <img id="pPrev" alt="" hidden style="width:100%;border-radius:12px;margin-top:10px">
    <label class="f" for="pTitle">Название</label><input id="pTitle" type="text" value="${esc(sceneChips(row.state).slice(0, 2).join(" · "))}">
    <label class="f" for="pNote">Для чего делали и что дописали в промт</label><textarea id="pNote" placeholder="Например: баннер к Новому году, дописал «снег на шапке»"></textarea>
    <p class="err" id="pErr"></p><div class="foot"><button class="btn primary" type="button" id="pGo">Опубликовать</button></div>`, (win, close) => {
    const f = win.querySelector("#pFile");
    f.addEventListener("change", () => { const file = f.files[0]; if (!file) return; const im = win.querySelector("#pPrev"); im.src = URL.createObjectURL(file); im.hidden = false; });
    win.querySelector("#pGo").addEventListener("click", async ev => {
      const file = f.files[0], err = win.querySelector("#pErr");
      if (!file) { err.textContent = "Выберите картинку"; return; }
      if (file.size > 15 * 1024 * 1024) { err.textContent = "Файл больше 15 МБ"; return; }
      ev.target.disabled = true; err.textContent = "Загружаем…";
      const path = `${ME.id}/${uuid()}.${extOf(file)}`;
      const up = await sb.storage.from("works").upload(path, file, { contentType: file.type });
      if (up.error) { err.textContent = "Не удалось загрузить: " + up.error.message; ev.target.disabled = false; return; }
      const ins = await sb.from("publications").insert({ history_id: row.id, title: win.querySelector("#pTitle").value.trim() || null,
        note: win.querySelector("#pNote").value.trim() || null, image_path: path, state: row.state, prompt: row.prompt });
      if (ins.error) { err.textContent = "Не удалось сохранить: " + ins.error.message; ev.target.disabled = false; return; }
      logEvent("publish", stateMeta(row.state)); close(); toast("Опубликовано в галерее");
    });
  });
}

/* =====================================================================
   ГАЛЕРЕЯ
   ===================================================================== */
let GAL = { sort: "new", who: "all", items: [], likes: [], names: {} };
async function loadGallery() {
  const el = $("gList"); el.innerHTML = `<div class="empty">Загружаем…</div>`;
  $("gWho").innerHTML = [["all", "Все герои"], ...WHO.map(w => [w, C.CHARS[w].name])].map(([id, nm]) => `<button type="button" class="chip" data-gw="${id}" aria-pressed="${GAL.who === id}">${nm}</button>`).join("");
  const [pubs, likes, profs] = await Promise.all([
    sb.from("publications").select("*").order("created_at", { ascending: false }).limit(300),
    sb.from("publication_likes").select("pub_id,user_id"),
    sb.from("profiles").select("id,name,email")
  ]);
  if (pubs.error) { el.innerHTML = `<div class="empty">Не удалось загрузить: ${esc(pubs.error.message)}</div>`; return; }
  GAL.items = pubs.data; GAL.likes = likes.data || [];
  GAL.names = Object.fromEntries((profs.data || []).map(p => [p.id, p.name || (p.email || "").split("@")[0]]));
  const paths = GAL.items.map(p => p.image_path);
  if (paths.length) {
    const { data: urls } = await sb.storage.from("works").createSignedUrls(paths, 60 * 60 * 6);
    (urls || []).forEach((u, i) => GAL.items[i].url = u && u.signedUrl);
  }
  drawGallery();
}
const likeCount = id => GAL.likes.filter(l => l.pub_id === id).length;
const iLike = id => GAL.likes.some(l => l.pub_id === id && l.user_id === ME.id);
function drawGallery() {
  let list = GAL.items.slice();
  if (GAL.who !== "all") list = list.filter(p => p.state && p.state.chars && p.state.chars.some(c => c.who === GAL.who));
  if (GAL.sort === "mine") list = list.filter(p => p.user_id === ME.id);
  if (GAL.sort === "top") list.sort((a, b) => likeCount(b.id) - likeCount(a.id));
  const el = $("gList");
  if (!list.length) { el.innerHTML = `<div class="empty">${GAL.sort === "mine" ? "Вы ещё ничего не публиковали. Оцените удачный кадр в «Мои промты» и нажмите «Опубликовать»." : "Пока пусто. Станьте первым, кто поделится кадром."}</div>`; return; }
  el.innerHTML = `<div class="grid">` + list.map(p => `<button type="button" class="gcard${p.hidden ? " hid" : ""}" data-pid="${p.id}">
    <img src="${esc(p.url || "")}" alt="${esc(p.title || "Кадр")}" loading="lazy"><div><span class="likes">♥ ${likeCount(p.id)}</span><b>${esc(p.title || "Без названия")}</b>${esc(GAL.names[p.user_id] || "")}${p.hidden ? " · скрыто" : ""}</div></button>`).join("") + `</div>`;
}
$("gSort").addEventListener("click", e => { const b = e.target.closest("[data-s]"); if (!b) return; GAL.sort = b.dataset.s; $("gSort").querySelectorAll("[data-s]").forEach(x => x.setAttribute("aria-checked", String(x === b))); drawGallery(); });
$("gWho").addEventListener("click", e => { const b = e.target.closest("[data-gw]"); if (!b) return; GAL.who = b.dataset.gw; $("gWho").querySelectorAll("[data-gw]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); drawGallery(); });
$("gList").addEventListener("click", e => { const c = e.target.closest("[data-pid]"); if (c) viewPub(GAL.items.find(p => p.id === c.dataset.pid)); });
function viewPub(p) {
  const mine = p.user_id === ME.id;
  modal(`<div class="view"><img src="${esc(p.url || "")}" alt="${esc(p.title || "")}"><div>
    <h2>${esc(p.title || "Без названия")}</h2><p class="hint">${esc(GAL.names[p.user_id] || "")} · ${fmtDate(p.created_at)}</p>
    ${p.note ? `<p>${esc(p.note)}</p>` : ""}<div class="row" style="margin:10px 0">${sceneChips(p.state).map(c => `<span class="mini">${esc(c)}</span>`).join("")}</div>
    <div class="row"><button class="btn primary" type="button" data-v="apply">Применить настройки</button><button class="btn" type="button" data-v="copy">Скопировать промт</button>
    <button class="btn" type="button" data-v="like" aria-pressed="${iLike(p.id)}">${iLike(p.id) ? "♥ Полезно" : "♡ Полезно"} · ${likeCount(p.id)}</button></div>
    <p class="hint">Персонажи и одежда применятся вместе со всей сценой. Поменяйте что нужно и скопируйте свой промт.</p>
    ${ADMIN || mine ? `<div class="row" style="margin-top:14px">${ADMIN ? `<button class="btn small" type="button" data-v="hide">${p.hidden ? "Показать всем" : "Скрыть из галереи"}</button>` : ""}<button class="btn small danger" type="button" data-v="del">Удалить</button></div>` : ""}
  </div></div>`, (win, close) => {
    win.addEventListener("click", async e => {
      const b = e.target.closest("[data-v]"); if (!b) return;
      const v = b.dataset.v;
      if (v === "apply") { close(); applyState(p.state); logEvent("apply_gallery", { pub: p.id }); }
      if (v === "copy") { if (await copyText(p.prompt)) toast("Промт скопирован"); }
      if (v === "like") {
        if (iLike(p.id)) { await sb.from("publication_likes").delete().eq("pub_id", p.id).eq("user_id", ME.id); GAL.likes = GAL.likes.filter(l => !(l.pub_id === p.id && l.user_id === ME.id)); }
        else { await sb.from("publication_likes").insert({ pub_id: p.id }); GAL.likes.push({ pub_id: p.id, user_id: ME.id }); }
        b.textContent = `${iLike(p.id) ? "♥ Полезно" : "♡ Полезно"} · ${likeCount(p.id)}`; b.setAttribute("aria-pressed", String(iLike(p.id))); drawGallery();
      }
      if (v === "hide") { await sb.from("publications").update({ hidden: !p.hidden }).eq("id", p.id); p.hidden = !p.hidden; close(); drawGallery(); }
      if (v === "del") {
        if (!b.dataset.sure) { b.dataset.sure = "1"; b.textContent = "Точно удалить?"; return; }
        await sb.from("publications").delete().eq("id", p.id); await sb.storage.from("works").remove([p.image_path]);
        GAL.items = GAL.items.filter(x => x.id !== p.id); close(); drawGallery(); toast("Удалено");
      }
    });
  }, true);
}

/* =====================================================================
   АДМИНКА
   ===================================================================== */
async function loadAdmin() {
  const el = $("aBody");
  if (!ADMIN) { el.innerHTML = `<div class="empty">Раздел только для администратора.</div>`; return; }
  el.innerHTML = `<div class="empty">Загружаем…</div>`;
  const since = new Date(Date.now() - 90 * 864e5).toISOString();
  const [ev, profs, pubs, fbs] = await Promise.all([
    sb.from("events").select("user_id,kind,meta,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(10000),
    sb.from("profiles").select("*").order("created_at", { ascending: false }),
    sb.from("publications").select("id,user_id,created_at,hidden"),
    sb.from("feedback").select("*").order("created_at", { ascending: false }).limit(100)
  ]);
  const events = ev.data || [], people = profs.data || [], pub = pubs.data || [], fb = fbs.data || [];
  const copies = events.filter(e => e.kind === "copy_prompt"), d30 = Date.now() - 30 * 864e5;
  const cnt = (arr, fn) => { const m = new Map(); arr.forEach(x => [].concat(fn(x) || []).forEach(k => m.set(k, (m.get(k) || 0) + 1))); return [...m].sort((a, b) => b[1] - a[1]); };
  const bars = (title, rows, nameOf) => {
    const max = Math.max(1, ...rows.map(r => r[1]));
    return `<section class="block"><h3>${title}</h3>${rows.length ? `<div class="bars">${rows.slice(0, 10).map(([k, v]) => `<div class="bar"><div>${esc(nameOf(k))}<i style="width:${v / max * 100}%"></i></div><b>${v}</b></div>`).join("")}</div>` : `<p class="hint">Пока нет данных</p>`}</section>`;
  };
  const nm = (list) => k => (by(list, k) || {}).name || k;
  const name = id => { const p = people.find(x => x.id === id); return p ? (p.name || p.email) : "—"; };
  let h = `<div class="kpis">
    <div class="kpi"><b>${people.length}</b><span>человек в команде</span></div>
    <div class="kpi"><b>${copies.filter(e => +new Date(e.created_at) > d30).length}</b><span>промтов за 30 дней</span></div>
    <div class="kpi"><b>${events.filter(e => e.kind === "copy_reference").length}</b><span>эталонов за 90 дней</span></div>
    <div class="kpi"><b>${pub.length}</b><span>публикаций в галерее</span></div></div>`;
  h += `<div class="adm">`;
  h += bars("Герои", cnt(copies, e => e.meta.who), k => (C.CHARS[k] || {}).name || k);
  h += bars("Одежда", cnt(copies, e => e.meta.outfits), k => { const o = by(C.OUTFITS, k); return o ? `${C.CHARS[o.who].name} · ${o.name}` : k; });
  h += bars("Позы", cnt(copies, e => e.meta.poses), nm(C.POSES));
  h += bars("Действия", cnt(copies, e => e.meta.action !== "none" ? e.meta.action : null), nm(C.ACTIONS));
  h += bars("Локации", cnt(copies, e => e.meta.location), nm(C.LOCATIONS));
  h += bars("Форматы", cnt(copies, e => e.meta.frame), k => k);
  h += bars("Состав кадра", cnt(copies, e => (e.meta.who || []).map(w => C.CHARS[w].name).join(" + ")), k => k);
  h += bars("Оценки (★)", cnt(events.filter(e => e.kind === "rate"), e => String(e.meta.rating)), k => "★".repeat(+k));
  h += `</div>`;

  // эталоны
  const keys = [...C.OUTFITS.map(o => [o.id, `${C.CHARS[o.who].name} · ${o.name}`, o.ref]), ["lineup", "Вся семья: эталон роста", C.LINEUP_REF]];
  h += `<section class="block"><h2>Эталоны маскота</h2><p class="hint">Эти картинки дизайнеры скачивают и прикладывают к промту. Хранятся в закрытом хранилище: видят только вошедшие. Рядом — имя исходного файла из папки «Капибары рефы».</p>
    <div class="refgrid" style="margin-top:12px">${keys.map(([k, label, file]) => `<div class="refcell"><div class="im">${REFURL[k] ? `<img src="${esc(REFURL[k])}" alt="">` : "нет"}</div><b>${esc(label)}</b><span style="color:var(--faint)">${esc(file || "эталона нет — сделайте в «Новый эталон»")}</span>
      <label class="btn small" style="margin-top:6px;width:100%">${REFS[k] ? "Заменить" : "Загрузить"}<input type="file" accept="image/png,image/jpeg,image/webp" data-refkey="${k}" class="sr"></label></div>`).join("")}</div></section>`;

  // команда
  h += `<section class="block"><h2>Команда</h2><table class="t"><thead><tr><th>Имя</th><th>Роль</th><th>Почта</th><th>Промтов</th><th>Последний раз</th></tr></thead><tbody>${people.map(p => {
    const mine = copies.filter(e => e.user_id === p.id), last = events.find(e => e.user_id === p.id);
    return `<tr><td>${esc(p.name || "—")}</td><td>${esc(p.role || "—")}</td><td>${esc(p.email)}</td><td>${mine.length}</td><td>${last ? fmtDate(last.created_at) : "—"}</td></tr>`;
  }).join("")}</tbody></table></section>`;

  // пароль
  h += `<section class="block"><h2>Пароль команды</h2><p class="hint">С ним регистрируются новые люди. Уже зарегистрированные продолжают входить со своим паролем.</p>
    <div class="row" style="margin-top:10px;max-width:520px"><input id="tpw" type="text" autocomplete="off" placeholder="Новый пароль, от 8 символов" style="flex:1"><button class="btn primary" type="button" id="tpwGo">Сменить</button></div><p class="err" id="tpwErr"></p></section>`;

  // отзывы
  h += `<section class="block"><h2>Сообщения о проблемах</h2>${fb.length ? fb.map(f => `<div class="hitem" style="box-shadow:none;border:1px solid var(--line);margin-bottom:8px"><div><div class="meta">${esc(name(f.user_id))} · ${fmtDate(f.created_at)}${f.resolved ? " · решено" : ""}</div><p style="margin:6px 0 0;white-space:pre-wrap">${esc(f.text)}</p></div>
    <div class="acts">${f.image_path ? `<button class="btn small" type="button" data-fbimg="${esc(f.image_path)}">Скриншот</button>` : ""}${f.resolved ? "" : `<button class="btn small" type="button" data-fbok="${f.id}">Решено</button>`}</div></div>`).join("") : `<p class="hint">Сообщений нет.</p>`}</section>`;
  el.innerHTML = h;
}
$("aBody").addEventListener("change", async e => {
  const inp = e.target.closest("[data-refkey]"); if (!inp || !inp.files[0]) return;
  const file = inp.files[0], key = inp.dataset.refkey, path = `${key}.${extOf(file)}`;
  toast("Загружаем эталон…");
  if (REFS[key] && REFS[key] !== path) await sb.storage.from("refs").remove([REFS[key]]);
  const up = await sb.storage.from("refs").upload(path, file, { upsert: true, contentType: file.type });
  if (up.error) { toast("Не удалось загрузить: " + up.error.message); return; }
  const r = await sb.from("ref_images").upsert({ id: key, image_path: path, updated_at: new Date().toISOString() });
  if (r.error) { toast("Не удалось сохранить: " + r.error.message); return; }
  await loadRefs(); toast("Эталон сохранён"); loadAdmin(); renderOut();
});
$("aBody").addEventListener("click", async e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.id === "tpwGo") {
    const v = $("tpw").value.trim(), err = $("tpwErr");
    if (v.length < 8) { err.textContent = "Нужно не меньше 8 символов"; return; }
    const { error } = await sb.rpc("set_team_password", { new_password: v });
    if (error) { err.textContent = "Не получилось: " + error.message; return; }
    $("tpw").value = ""; err.textContent = ""; toast("Пароль команды сменён. Сообщите его новым коллегам лично.");
  }
  if (b.dataset.fbok) { await sb.from("feedback").update({ resolved: true }).eq("id", b.dataset.fbok); loadAdmin(); }
  if (b.dataset.fbimg) { const { data } = await sb.storage.from("feedback").createSignedUrl(b.dataset.fbimg, 600); if (data) window.open(data.signedUrl, "_blank", "noopener"); }
});

/* =====================================================================
   ОБРАТНАЯ СВЯЗЬ И ПОМОЩЬ
   ===================================================================== */
function feedbackDialog() {
  modal(`<h2>Что пошло не так?</h2><p class="hint">Опишите проблему или идею. Скриншот — по желанию.</p>
    <label class="f" for="fbT">Сообщение</label><textarea id="fbT"></textarea>
    <label class="f" for="fbF">Скриншот</label><input id="fbF" type="file" accept="image/png,image/jpeg,image/webp">
    <p class="err" id="fbE"></p><div class="foot"><button class="btn primary" type="button" id="fbGo">Отправить</button></div>`, (win, close) => {
    win.querySelector("#fbGo").addEventListener("click", async ev => {
      const text = win.querySelector("#fbT").value.trim(), file = win.querySelector("#fbF").files[0], err = win.querySelector("#fbE");
      if (!text) { err.textContent = "Напишите пару слов"; return; }
      ev.target.disabled = true;
      let image_path = null;
      if (file) { image_path = `${ME.id}/${uuid()}.${extOf(file)}`; const up = await sb.storage.from("feedback").upload(image_path, file, { contentType: file.type }); if (up.error) image_path = null; }
      const { error } = await sb.from("feedback").insert({ text: text + `\n\n[${location.hash || "#builder"}]`, image_path });
      if (error) { err.textContent = "Не отправилось: " + error.message; ev.target.disabled = false; return; }
      close(); toast("Спасибо! Сообщение у администратора.");
    });
  });
}
function helpDialog() {
  modal(`<h2>Как работать с CapyKadr</h2><ol class="steps" style="font-size:14.5px">
    <li><b>Соберите сцену.</b> Выберите героев, одежду, позы, место и действие. Недоступные варианты приглушены — нажмите, чтобы узнать почему.</li>
    <li><b>Расставьте героев</b> на холсте: положение и формат кадра попадут в промт.</li>
    <li><b>Скопируйте промт</b> и скачайте эталоны. Номера уже в именах файлов.</li>
    <li><b>Nano Banana:</b> приложите эталоны по порядку, вставьте промт, сгенерируйте 2–4 варианта.</li>
    <li><b>Проверьте</b> по чек-листу, оцените в «Мои промты» и опубликуйте удачный кадр в галерее.</li></ol>
    <p class="hint">Нужна одежда, которой ещё нет? Режим «Новый эталон» делает промт для T-позы в новой одежде.</p>`);
}

/* =====================================================================
   ВХОД
   ===================================================================== */
let GM = "in";
function gateMode(m) {
  GM = m;
  document.querySelectorAll("[data-gm]").forEach(b => b.setAttribute("aria-checked", String(b.dataset.gm === m)));
  $("gUpFields").hidden = m !== "up"; $("gPassHint").hidden = m !== "up"; $("gForgot").hidden = m !== "in";
  $("gPassL").textContent = m === "up" ? "Пароль команды" : "Пароль";
  $("gPass").autocomplete = m === "up" ? "new-password" : "current-password";
  $("gBtn").textContent = m === "up" ? "Зарегистрироваться" : "Войти"; $("gErr").textContent = "";
}
document.querySelectorAll("[data-gm]").forEach(b => b.addEventListener("click", () => gateMode(b.dataset.gm)));
$("gRoles").addEventListener("click", e => { const b = e.target.closest("[data-r]"); if (!b) return; $("gRoles").querySelectorAll("[data-r]").forEach(x => x.setAttribute("aria-checked", String(x === b))); });
$("gateF").addEventListener("submit", async e => {
  e.preventDefault();
  const email = $("gEmail").value.trim().toLowerCase(), pass = $("gPass").value, err = $("gErr");
  if (!/^\S+@\S+\.\S+$/.test(email)) { err.textContent = "Проверьте почту"; return; }
  if (!pass) { err.textContent = "Введите пароль"; return; }
  $("gBtn").disabled = true; err.textContent = "";
  try {
    if (GM === "up") {
      const name = $("gName").value.trim(), role = ($("gRoles").querySelector('[aria-checked="true"]') || {}).dataset?.r || "";
      if (!name) { err.textContent = "Как вас зовут? Имя увидят коллеги в галерее."; return; }
      const { data, error } = await sb.auth.signUp({ email, password: pass, options: { data: { name, role, team_password: pass } } });
      if (error) {
        const m = error.message || "";
        err.textContent = /already|registered|exists/i.test(m) ? "Эта почта уже зарегистрирована. Войдите." :
          /database error|TEAM_PASSWORD/i.test(m) ? "Неверный пароль команды. Уточните его у администратора." :
          /password/i.test(m) ? "Пароль слишком короткий." : "Не получилось: " + m;
        return;
      }
      if (!data.session) { err.textContent = "Почти готово: Supabase просит подтвердить почту. Попросите администратора выключить подтверждение почты в настройках."; return; }
      await afterLogin(data.session.user);
    } else {
      const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
      if (error) { err.textContent = /confirm/i.test(error.message) ? "Почта не подтверждена." : "Неверная почта или пароль."; return; }
      await afterLogin(data.user);
    }
  } finally { $("gBtn").disabled = false; }
});
function showGate() {
  ME = null; ADMIN = false;
  $("gate").hidden = false; $("gateLoading").hidden = true; $("gateForm").hidden = false;
  $("top").hidden = true; $("app").hidden = true; $("fab").hidden = true;
}
async function afterLogin(user) {
  ME = { id: user.id, email: user.email, name: (user.user_metadata || {}).name || "" };
  const { data: prof } = await sb.from("profiles").select("name,role").eq("id", user.id).maybeSingle();
  if (prof && prof.name) ME.name = prof.name;
  const { data: adm } = await sb.rpc("is_admin"); ADMIN = !!adm;
  await loadRefs();
  const nm = ME.name || ME.email.split("@")[0];
  $("uAva").textContent = nm.trim()[0].toUpperCase(); $("uName").textContent = nm; $("uMName").textContent = nm; $("uMEmail").textContent = ME.email;
  $("navAdmin").hidden = !ADMIN;
  $("gate").hidden = true; $("top").hidden = false; $("app").hidden = false; $("fab").hidden = false;
  try { if (!localStorage.getItem("capykadr-help")) { localStorage.setItem("capykadr-help", "1"); helpDialog(); } } catch (e) {}
  route();
}

/* =====================================================================
   НАВИГАЦИЯ И МЕНЮ
   ===================================================================== */
function route() {
  if (!ME) return;
  let v = (location.hash || "#builder").slice(1);
  if (!["builder", "gallery", "history", "admin"].includes(v) || (v === "admin" && !ADMIN)) v = "builder";
  document.querySelectorAll("[data-view]").forEach(s => s.hidden = s.dataset.view !== v);
  document.querySelectorAll(".nav a").forEach(a => a.setAttribute("aria-current", a.dataset.v === v ? "page" : "false"));
  if (v === "builder") renderAll();
  if (v === "gallery") loadGallery();
  if (v === "history") loadHistory();
  if (v === "admin") loadAdmin();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);
$("uBtn").addEventListener("click", e => { e.stopPropagation(); const o = $("uMenu").hidden; $("uMenu").hidden = !o; $("uBtn").setAttribute("aria-expanded", String(o)); });
document.addEventListener("click", e => { if (!e.target.closest("#uMenu")) { $("uMenu").hidden = true; $("uBtn").setAttribute("aria-expanded", "false"); } });
$("uMenu").addEventListener("click", async e => {
  const a = e.target.closest("[data-act]"); if (!a) return; $("uMenu").hidden = true;
  if (a.dataset.act === "help") helpDialog();
  if (a.dataset.act === "feedback") feedbackDialog();
  if (a.dataset.act === "logout") { await sb.auth.signOut(); showGate(); }
});
$("fab").addEventListener("click", feedbackDialog);

/* =====================================================================
   СТАРТ
   ===================================================================== */
(async () => {
  gateMode("in");
  try {
    const { data } = await sb.auth.getSession();
    if (data.session) await afterLogin(data.session.user); else showGate();
  } catch (e) { showGate(); }
  sb.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_OUT") showGate(); });
})();
})();
