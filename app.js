/* CapyKadr — интерфейс. Промты собирает builder.js по справочникам data.js, без нейросетей.
   Данные (вход, история, галерея, аналитика, эталоны) — Supabase, права ограничены RLS. */
(() => {
  "use strict";
  const C = window.CAPY,
    B = window.CapyBuilder,
    CFG = window.CAPY_CONFIG;
  const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY);
  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const by = (l, id) => l.find((o) => o.id === id);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const WHO = ["dad", "mom", "son"];
  const KEY = "capykadr-state-v1";

  let ME = null,
    ADMIN = false;
  let REFS = {},
    REFURL = {}; // эталоны: key -> путь в хранилище / подписанная ссылка

  /* =====================================================================
   СОСТОЯНИЕ
   ===================================================================== */
  const DEF = {
    chars: [
      {
        who: "dad",
        outfit: "dad-base",
        pose: "stand",
        emo: "auto",
        x: 50,
        y: 86,
        object: "",
      },
    ],
    location: "white",
    light: "studio",
    frame: "1:1",
    camera: "auto",
    textzone: "none",
    action: "none",
    product: "",
    extra: "",
  };
  function normalize(s) {
    if (!s || !Array.isArray(s.chars) || !s.chars.length) return clone(DEF);
    const out = Object.assign(clone(DEF), s);
    const seen = new Set();
    out.chars = s.chars
      .filter((c) => c && C.CHARS[c.who] && !seen.has(c.who) && seen.add(c.who))
      .slice(0, 3)
      .map((c) => {
        const o = by(C.OUTFITS, c.outfit);
        return {
          who: c.who,
          outfit: o && o.who === c.who ? c.outfit : `${c.who}-base`,
          pose: by(C.POSES, c.pose) ? c.pose : "stand",
          emo: by(C.EMOTIONS, c.emo) ? c.emo : "auto",
          x: clamp(+c.x || 50, 4, 96),
          y: clamp(+c.y || 86, 20, 98),
          object: String(c.object || ""),
        };
      });
    if (!out.chars.length) return clone(DEF);
    ["location", "light", "frame", "camera", "textzone", "action"].forEach(
      (k) => {
        const list = {
          location: C.LOCATIONS,
          light: C.LIGHTS,
          frame: C.FRAMES,
          camera: C.CAMERAS,
          textzone: C.TEXTZONE,
          action: C.ACTIONS,
        }[k];
        if (!by(list, out[k])) out[k] = DEF[k];
      },
    );
    return out;
  }
  let S = (() => {
    try {
      return normalize(JSON.parse(localStorage.getItem(KEY)));
    } catch (e) {
      return clone(DEF);
    }
  })();
  let ACTIVE = S.chars[0].who;
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(S));
    } catch (e) {}
  }
  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }
  function charOf(who) {
    return S.chars.find((c) => c.who === who);
  }

  /* =====================================================================
   МЕЛОЧИ: тост, окна, буфер
   ===================================================================== */
  let toastT;
  function toast(t) {
    const el = $("toast");
    el.textContent = t;
    el.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(() => (el.hidden = true), 4200);
  }
  function modal(html, mount, wide) {
    const m = $("modal");
    m.innerHTML = `<div class="wrap"><div class="win${wide ? " wide" : ""}" role="dialog" aria-modal="true"><button class="x" type="button" aria-label="Закрыть">×</button>${html}</div></div>`;
    const wrap = m.firstChild,
      win = wrap.firstChild,
      prev = document.activeElement;
    const close = () => {
      m.innerHTML = "";
      document.removeEventListener("keydown", onKey);
      if (prev && prev.focus) prev.focus();
    };
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    wrap.addEventListener("click", (e) => {
      if (e.target === wrap) close();
    });
    win.querySelector(".x").addEventListener("click", close);
    if (mount) mount(win, close);
    const f = win.querySelector("input,textarea,button:not(.x)");
    if (f) f.focus();
    return close;
  }
  async function copyText(t) {
    try {
      await navigator.clipboard.writeText(t);
      return true;
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (e2) {}
      ta.remove();
      return ok;
    }
  }
  const fmtDate = (d) =>
    new Date(d).toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  const uuid = () =>
    crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2);
  const extOf = (f) =>
    ((f.name || "").split(".").pop() || "png")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "png";
  async function logEvent(kind, meta) {
    if (!ME) return;
    try {
      await sb.from("events").insert({ kind, meta });
    } catch (e) {}
  }

  /* Four design steps share the existing prompt model and Supabase persistence. */
  const ART = "assets/figma/";
  const BASE_ART = { dad: "245ef.png", mom: "b44e6.png", son: "9870a.png" };
  const SEASON_ART = {
    spring: BASE_ART,
    summer: { dad: "e1ec0.png", mom: "a7e7b.png", son: "4d195.png" },
    autumn: { dad: "1a8e0.png", mom: "b8570.png", son: "2b890.png" },
    winter: { dad: "cc67a.png", mom: "e77ec.png", son: "4a990.png" },
  };
  const REF_ART = {
    "dad-base": "07558.png",
    "mom-base": "2cbd4.png",
    "son-base": "74fc8.png",
    lineup: "e1d62.png",
  };
  const SEASONS = [
    { id: "spring", name: "Весна", wash: "4d9e4.svg", icon: "f5fba.svg" },
    { id: "summer", name: "Лето", wash: "2acd9.svg", icon: "d8713.svg" },
    { id: "autumn", name: "Осень", wash: "88ccf.svg", icon: "ce611.svg" },
    { id: "winter", name: "Зима", wash: "e7d57.svg", icon: "3441b.svg" },
    { id: "newyear", name: "Новый<br>год", wash: "b8585.svg" },
  ];
  const SCENES = [
    { id: "walk", name: "Прогулка", pose: "walk" },
    {
      id: "leaves",
      name: "Игра с листьями",
      en: "playing with colorful fallen autumn leaves, tossing them gently into the air",
    },
    {
      id: "tea",
      name: "Согревающий чай",
      en: "holding mugs of warm tea with both paws, steam rising",
    },
    {
      id: "apples",
      name: "Урожай яблок",
      en: "harvesting ripe red apples into a wicker basket",
    },
    {
      id: "pie",
      name: "Домашний пирог",
      en: "baking a homemade apple pie at a cozy kitchen table",
    },
    {
      id: "cafe",
      name: "Посиделки в кафе",
      location: "cafe",
      en: "sitting at a round cafe table, sharing tea and pastries",
    },
  ];
  let STEP = 0,
    CAST = new Set(localStorage.getItem(KEY) ? S.chars.map((c) => c.who) : []),
    SEASON = S.designSeason || "",
    SCENE = S.designScene || "";
  let LAST = null;
  const art = (name, cls = "", alt = "") =>
    `<img src="${ART + name}" class="${cls}" alt="${esc(alt)}">`;
  const mark = (on) =>
    `<span class="pick-mark">${on ? art("229a2.svg") : art("9e3f4.svg", "plus")}</span>`;
  function arrange() {
    const xs =
      S.chars.length === 1
        ? [50]
        : S.chars.length === 2
          ? [36, 64]
          : [26, 50, 74];
    S.chars.forEach((c, i) => {
      c.x = xs[i];
      c.y = 86;
    });
  }
  function fix() {
    S.chars.forEach((c) => {
      if (B.poseAllowed(by(C.POSES, c.pose), c.who, c.outfit)) c.pose = "stand";
    });
    if (B.actionAllowed(by(C.ACTIONS, S.action), S.chars, B.sceneSeason(S)))
      S.action = "none";
  }
  function syncCast() {
    S.chars = WHO.filter((w) => CAST.has(w)).map(
      (w) =>
        charOf(w) || {
          who: w,
          outfit: `${w}-base`,
          pose: "stand",
          emo: "auto",
          x: 50,
          y: 86,
          object: "",
        },
    );
    ACTIVE = S.chars[0].who;
    arrange();
    if (SEASON) {
      S.chars.forEach((c) => {
        c.outfit = `${c.who}-${SEASON === "spring" ? "base" : SEASON}`;
      });
    }
    fix();
    save();
  }
  function setSeason(id) {
    SEASON = id;
    S.designSeason = id;
    // The spring frame uses the original clothes, exactly as shown in Figma.
    S.chars.forEach((c) => {
      c.outfit = `${c.who}-${id === "spring" ? "base" : id}`;
    });
    S.location = {
      spring: "spring",
      summer: "meadow",
      autumn: "autumn",
      winter: "winter",
    }[id];
    S.light = id === "winter" ? "winter" : "golden";
    fix();
  }
  function stepNav() {
    const icons = [
      ["b827d.svg", "4e312.svg"],
      ["cd23c.svg", "ba6d0.svg"],
      ["79636.svg", "b909d.svg"],
      ["0824f.svg", "20489.svg"],
    ];
    return `<nav class="step-nav" aria-label="Шаги конструктора">${["Персонажи", "Сезон", "Сюжет", "Промт"].map((name, i) => `<button type="button" data-step="${i}" aria-label="${name}" ${i === STEP ? 'aria-current="step"' : ""} ${i > 0 && !CAST.size ? "disabled" : ""}>${art(icons[i][i === STEP ? 0 : 1])}</button>`).join("")}</nav>`;
  }
  function examples() {
    const images =
      SEASON === "autumn" ? ["3e23f.png", "78299.png", "57b68.png"] : [];
    return `<aside class="examples"><h2>Примеры генераций</h2><div class="example-grid">${Array.from({ length: 6 }, (_, i) => art(images[i] || "268b2.png", "example-image", images[i] ? "Пример осенней генерации" : "")).join("")}</div></aside>`;
  }
  function familyPreview() {
    return `<div class="family-preview ${esc(SEASON)}"><div class="family-art">${WHO.filter(
      (w) => CAST.has(w),
    )
      .map(
        (w) =>
          `<div class="family-${w} ${w === "son" && (!SEASON || SEASON === "spring") ? "base-son" : ""}">${art((SEASON_ART[SEASON] || BASE_ART)[w], "", C.CHARS[w].name)}</div>`,
      )
      .join(
        "",
      )}</div>${SEASON === "autumn" ? `<div class="season-decoration leaves">${art("dc068.png")}</div>` : SEASON === "winter" ? `<div class="season-decoration snow">${art("77587.png")}</div>` : ""}</div>`;
  }
  function renderAll() {
    const el = $("steps");
    let h = "";
    if (STEP === 0) {
      h = `<div class="character-grid">${WHO.map((w) => `<button type="button" class="character-choice ${w}" data-cast="${w}" aria-pressed="${CAST.has(w)}"><span class="character-image"><span class="portrait ${w === "son" ? "base-son" : ""}">${art(BASE_ART[w], "", C.CHARS[w].name)}</span>${mark(CAST.has(w))}</span><span class="character-name">${C.CHARS[w].name}</span></button>`).join("")}</div>`;
    } else if (STEP === 1) {
      h = `<div class="season-layout"><div class="season-list" role="radiogroup" aria-label="Сезон">${SEASONS.map((s) => `<button type="button" class="season-choice" role="radio" data-season="${s.id}" aria-checked="${SEASON === s.id}" ${s.id === "newyear" ? "disabled" : ""}>${art(s.wash, "season-wash")}${s.icon ? art(s.icon, "season-icon") : `<span class="tree-parts">${["13c4a.svg", "0cc09.svg", "4d10b.svg", "b7f09.svg"].map((n, i) => art(n, "tree-" + i)).join("")}</span>`}<span class="season-name">${s.name}</span><span class="season-mark">${SEASON === s.id ? art("229a2.svg") : ""}</span></button>`).join("")}</div>${familyPreview()}${examples()}</div>`;
    } else if (STEP === 2) {
      h = `<div class="scene-grid">${SCENES.map((s) => `<button type="button" class="scene-choice" data-scene="${s.id}" aria-pressed="${SCENE === s.id}"><span class="scene-image">${art(s.id === "cafe" ? "914cd.png" : "268b2.png", "", s.name)}${SCENE === s.id ? `<span class="scene-check">${art("f4244.svg")}</span>` : ""}</span><span>${s.name}</span></button>`).join("")}${Array.from({ length: 4 }, () => '<div class="scene-empty" aria-hidden="true"></div>').join("")}</div>`;
    } else {
      LAST = B.build(S);
      h = `<div class="result-layout"><aside class="reference-panel"><h2>Прикрепите к промту</h2><div class="reference-grid">${LAST.refs.map((r, i) => `<button type="button" data-dl="${i}" aria-label="Скачать: ${esc(r.label)}" title="${esc(r.label)}"><img src="${esc(REFURL[r.key] || ART + (REF_ART[r.key] || REF_ART[`${r.key.split("-")[0]}-base`]))}" alt="${esc(r.label)}"><span>${art("37a62.svg")}</span></button>`).join("")}${Array.from({ length: Math.max(0, 6 - LAST.refs.length) }, () => '<div class="reference-empty" aria-hidden="true"></div>').join("")}</div></aside><div class="prompt-panel"><pre tabindex="0" aria-label="Промт">${esc(LAST.prompt)}</pre>${LAST.issues.length ? `<p role="alert" class="err">${LAST.issues.map(esc).join(". ")}</p>` : ""}</div>${examples()}</div>`;
    }
    el.innerHTML = h;
    $("builderActions").innerHTML =
      STEP === 3
        ? `<button type="button" class="choose primary" id="copyBtn" ${LAST.issues.length ? "disabled" : ""}>Копировать промт ${art("eb5dc.svg")}</button>`
        : `${STEP === 2 ? '<button type="button" class="choose secondary" id="describeAction">Описать действие</button>' : ""}<button type="button" class="choose primary" id="chooseBtn" ${(STEP === 0 && !CAST.size) || (STEP === 1 && !SEASON) || (STEP === 2 && !SCENE) ? "disabled" : ""}>Выбрать</button>`;
    $("builderNav").innerHTML = stepNav();
  }
  function renderOut() {
    if (STEP === 3) renderAll();
  }
  $("v-builder").addEventListener("click", async (e) => {
    const t = e.target.closest("button");
    if (!t || t.disabled) return;
    const d = t.dataset;
    if (d.cast) {
      CAST.has(d.cast) ? CAST.delete(d.cast) : CAST.add(d.cast);
      if (CAST.size) syncCast();
      else {
        try {
          localStorage.removeItem(KEY);
        } catch {}
      }
    } else if (d.season) {
      setSeason(d.season);
      save();
    } else if (d.scene) {
      SCENE = d.scene;
      S.designScene = SCENE;
      const s = SCENES.find((s) => s.id === SCENE);
      S.action = "none";
      S.extra = s.en || "";
      if (s.location) S.location = s.location;
      else
        S.location =
          {
            spring: "spring",
            summer: "meadow",
            autumn: "autumn",
            winter: "winter",
          }[SEASON] || "white";
      S.chars.forEach((c) => {
        c.pose = s.pose || "stand";
      });
      fix();
      save();
    } else if (d.step !== undefined) {
      if (+d.step > 0) {
        if (!CAST.size) return;
        syncCast();
      }
      STEP = +d.step;
    } else if (d.dl !== undefined) {
      await downloadRef(LAST.refs[+d.dl], +d.dl);
      return;
    } else if (t.id === "chooseBtn") {
      if (STEP === 0) syncCast();
      STEP++;
    } else if (t.id === "copyBtn") {
      await copyPrompt();
      return;
    } else if (t.id === "describeAction") {
      describeAction();
      return;
    } else return;
    renderAll();
  });
  function describeAction() {
    const options = (list, value) =>
      list
        .map(
          (x) =>
            `<option value="${x.id}" ${x.id === value ? "selected" : ""}>${esc(x.name)}</option>`,
        )
        .join("");
    modal(
      `<h2>Описать действие</h2><form id="sceneForm"><label class="f" for="sceneExtra">Что делают персонажи</label><textarea id="sceneExtra">${esc(S.extra)}</textarea><label class="f" for="sceneLoc">Место</label><select id="sceneLoc">${options(C.LOCATIONS, S.location)}</select><label class="f" for="sceneAction">Совместное действие</label><select id="sceneAction">${options(
        C.ACTIONS.filter((a) => !B.actionAllowed(a, S.chars, B.sceneSeason(S))),
        S.action,
      )}</select><label class="f" for="sceneProduct">Предмет или продукт</label><input id="sceneProduct" type="text" value="${esc(S.product)}">${S.chars
        .map(
          (c) =>
            `<fieldset><legend>${C.CHARS[c.who].name}</legend><label class="f" for="pose-${c.who}">Поза</label><select id="pose-${c.who}">${options(
              C.POSES.filter((p) => !B.poseAllowed(p, c.who, c.outfit)),
              c.pose,
            )}</select><label class="f" for="emo-${c.who}">Эмоция</label><select id="emo-${c.who}">${options(C.EMOTIONS, c.emo)}</select><label class="f" for="obj-${c.who}">Предмет в лапах</label><input id="obj-${c.who}" type="text" value="${esc(c.object)}"></fieldset>`,
        )
        .join(
          "",
        )}<label class="f" for="sceneLight">Свет</label><select id="sceneLight">${options(C.LIGHTS, S.light)}</select><label class="f" for="sceneFrame">Формат</label><select id="sceneFrame">${options(C.FRAMES, S.frame)}</select><label class="f" for="sceneCamera">Ракурс</label><select id="sceneCamera">${options(C.CAMERAS, S.camera)}</select><label class="f" for="sceneText">Место под текст</label><select id="sceneText">${options(C.TEXTZONE, S.textzone)}</select><div class="foot"><button type="submit" class="btn primary">Выбрать</button></div></form>`,
      (win, close) => {
        win.querySelector("form").addEventListener("submit", (e) => {
          e.preventDefault();
          S.extra = $("sceneExtra").value;
          S.product = $("sceneProduct").value;
          S.location = $("sceneLoc").value;
          S.action = $("sceneAction").value;
          S.light = $("sceneLight").value;
          S.frame = $("sceneFrame").value;
          S.camera = $("sceneCamera").value;
          S.textzone = $("sceneText").value;
          S.chars.forEach((c) => {
            c.pose = $(`pose-${c.who}`).value;
            c.emo = $(`emo-${c.who}`).value;
            c.object = $(`obj-${c.who}`).value;
          });
          const issues = B.check(S);
          if (issues.length) {
            toast(issues.join(". "));
            return;
          }
          SCENE = "custom";
          S.designScene = SCENE;
          save();
          close();
          STEP = 3;
          renderAll();
        });
      },
    );
  }
  async function downloadRef(ref, i) {
    const path = REFS[ref.key];
    let blob;
    if (path) {
      const { data, error } = await sb.storage.from("refs").download(path);
      if (error) {
        toast("Не удалось скачать эталон");
        return;
      }
      blob = data;
    } else {
      const file = REF_ART[ref.key];
      if (!file) {
        toast("Эталон ещё не загружен администратором");
        return;
      }
      const res = await fetch(ART + file);
      if (!res.ok) {
        toast("Не удалось скачать эталон");
        return;
      }
      blob = await res.blob();
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${i + 1}-${ref.key}.${path ? path.split(".").pop() : "png"}`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1500);
  }
  function stateMeta(st) {
    return {
      who: st.chars.map((c) => c.who),
      outfits: st.chars.map((c) => c.outfit),
      poses: st.chars.map((c) => c.pose),
      location: st.location,
      action: st.action,
      frame: st.frame,
    };
  }
  async function copyPrompt() {
    if (!LAST || LAST.issues.length) return;
    if (!(await copyText(LAST.prompt))) {
      toast("Не получилось скопировать. Выделите текст промта вручную.");
      return;
    }
    toast("Промт скопирован");
    const st = clone(S);
    sb.from("prompt_history")
      .insert({ state: st, prompt: LAST.prompt })
      .then(({ error }) => {
        if (error) toast("Промт скопирован, но историю сохранить не удалось");
      });
    logEvent("copy_prompt", stateMeta(st));
  }

  /* =====================================================================
   ЭТАЛОНЫ (картинки в закрытом хранилище refs)
   ===================================================================== */
  async function loadRefs() {
    REFS = {};
    REFURL = {};
    const { data } = await sb.from("ref_images").select("*");
    (data || []).forEach((r) => (REFS[r.id] = r.image_path));
    const keys = Object.keys(REFS);
    if (keys.length) {
      const { data: urls } = await sb.storage.from("refs").createSignedUrls(
        keys.map((k) => REFS[k]),
        60 * 60 * 12,
      );
      (urls || []).forEach((u, i) => {
        if (u && u.signedUrl) REFURL[keys[i]] = u.signedUrl;
      });
    }
  }

  /* =====================================================================
   МОИ ПРОМТЫ
   ===================================================================== */
  function sceneChips(st) {
    if (!st || !st.chars) return [];
    const out = st.chars.map(
      (c) =>
        `${C.CHARS[c.who] ? C.CHARS[c.who].name : c.who}: ${(by(C.OUTFITS, c.outfit) || {}).name || ""}, ${(by(C.POSES, c.pose) || {}).name || ""}`,
    );
    const l = by(C.LOCATIONS, st.location);
    if (l) out.push(l.name);
    const a = by(C.ACTIONS, st.action);
    if (a && a.id !== "none") out.push(a.name);
    out.push(st.frame);
    return out;
  }
  async function loadHistory() {
    const el = $("hList");
    el.innerHTML = `<div class="empty">Загружаем…</div>`;
    const { data, error } = await sb
      .from("prompt_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      el.innerHTML = `<div class="empty">Не удалось загрузить: ${esc(error.message)}</div>`;
      return;
    }
    if (!data.length) {
      el.innerHTML = `<div class="empty">Здесь появятся промты, которые вы скопируете в конструкторе.</div>`;
      return;
    }
    el.innerHTML = data
      .map(
        (r) => `<article class="hitem" data-id="${r.id}">
    <div><div class="meta">${fmtDate(r.created_at)}</div><div class="chips">${sceneChips(
      r.state,
    )
      .map((c) => `<span class="mini">${esc(c)}</span>`)
      .join("")}</div></div>
    <div class="acts"><span class="stars" role="radiogroup" aria-label="Оценка">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-rate="${n}" class="${r.rating >= n ? "on" : ""}" aria-label="${n} из 5">★</button>`).join("")}</span>
      <button class="btn small" type="button" data-apply>Применить</button>
      <button class="btn small" type="button" data-copy>Скопировать</button>
      <button class="btn small primary" type="button" data-pub>Опубликовать</button>
      <button class="btn small danger" type="button" data-del>Удалить</button></div></article>`,
      )
      .join("");
    el._data = data;
  }
  $("hList").addEventListener("click", async (e) => {
    const t = e.target.closest("button"),
      item = e.target.closest(".hitem");
    if (!t || !item) return;
    const row = $("hList")._data.find((r) => r.id === item.dataset.id);
    if (t.dataset.rate) {
      const v = +t.dataset.rate;
      row.rating = v;
      item
        .querySelectorAll("[data-rate]")
        .forEach((b) => b.classList.toggle("on", +b.dataset.rate <= v));
      await sb.from("prompt_history").update({ rating: v }).eq("id", row.id);
      logEvent("rate", { rating: v, ...stateMeta(row.state) });
      if (v >= 4)
        toast(
          "Отличный результат — поделитесь им в галерее, коллегам пригодится.",
        );
    } else if (t.dataset.apply !== undefined) {
      applyState(row.state);
    } else if (t.dataset.copy !== undefined) {
      if (await copyText(row.prompt)) toast("Промт скопирован");
    } else if (t.dataset.pub !== undefined) publishDialog(row);
    else if (t.dataset.del !== undefined) {
      if (t.dataset.sure) {
        await sb.from("prompt_history").delete().eq("id", row.id);
        item.remove();
        toast("Удалено");
      } else {
        t.dataset.sure = "1";
        t.textContent = "Точно удалить?";
        setTimeout(() => {
          if (t.isConnected) {
            delete t.dataset.sure;
            t.textContent = "Удалить";
          }
        }, 3000);
      }
    }
  });
  function applyState(st) {
    S = normalize(clone(st));
    ACTIVE = S.chars[0].who;
    CAST = new Set(S.chars.map((c) => c.who));
    SEASON = S.designSeason || "";
    SCENE = S.designScene || "";
    STEP = 3;
    document
      .querySelectorAll("[data-mode]")
      .forEach((x) =>
        x.setAttribute("aria-checked", String(x.dataset.mode === "scene")),
      );
    save();
    location.hash = "#builder";
    renderAll();
    toast("Настройки применены");
  }
  function publishDialog(row) {
    modal(
      `<h2>Поделиться в галерее</h2><p class="hint">Картинка, промт и настройки появятся у всей команды.</p>
    <label class="f" for="pFile">Картинка из Nano Banana</label><input id="pFile" type="file" accept="image/png,image/jpeg,image/webp">
    <img id="pPrev" alt="" hidden style="width:100%;border-radius:12px;margin-top:10px">
    <label class="f" for="pTitle">Название</label><input id="pTitle" type="text" value="${esc(sceneChips(row.state).slice(0, 2).join(" · "))}">
    <label class="f" for="pNote">Для чего делали и что дописали в промт</label><textarea id="pNote" placeholder="Например: баннер к Новому году, дописал «снег на шапке»"></textarea>
    <p class="err" id="pErr"></p><div class="foot"><button class="btn primary" type="button" id="pGo">Опубликовать</button></div>`,
      (win, close) => {
        const f = win.querySelector("#pFile");
        f.addEventListener("change", () => {
          const file = f.files[0];
          if (!file) return;
          const im = win.querySelector("#pPrev");
          im.src = URL.createObjectURL(file);
          im.hidden = false;
        });
        win.querySelector("#pGo").addEventListener("click", async (ev) => {
          const file = f.files[0],
            err = win.querySelector("#pErr");
          if (!file) {
            err.textContent = "Выберите картинку";
            return;
          }
          if (file.size > 15 * 1024 * 1024) {
            err.textContent = "Файл больше 15 МБ";
            return;
          }
          ev.target.disabled = true;
          err.textContent = "Загружаем…";
          const path = `${ME.id}/${uuid()}.${extOf(file)}`;
          const up = await sb.storage
            .from("works")
            .upload(path, file, { contentType: file.type });
          if (up.error) {
            err.textContent = "Не удалось загрузить: " + up.error.message;
            ev.target.disabled = false;
            return;
          }
          const ins = await sb.from("publications").insert({
            history_id: row.id,
            title: win.querySelector("#pTitle").value.trim() || null,
            note: win.querySelector("#pNote").value.trim() || null,
            image_path: path,
            state: row.state,
            prompt: row.prompt,
          });
          if (ins.error) {
            err.textContent = "Не удалось сохранить: " + ins.error.message;
            ev.target.disabled = false;
            return;
          }
          logEvent("publish", stateMeta(row.state));
          close();
          toast("Опубликовано в галерее");
        });
      },
    );
  }

  /* =====================================================================
   ГАЛЕРЕЯ
   ===================================================================== */
  let GAL = { sort: "new", who: "all", items: [], likes: [], names: {} };
  async function loadGallery() {
    const el = $("gList");
    el.innerHTML = `<div class="empty">Загружаем…</div>`;
    $("gWho").innerHTML = [
      ["all", "Все герои"],
      ...WHO.map((w) => [w, C.CHARS[w].name]),
    ]
      .map(
        ([id, nm]) =>
          `<button type="button" class="chip" data-gw="${id}" aria-pressed="${GAL.who === id}">${nm}</button>`,
      )
      .join("");
    const [pubs, likes, profs] = await Promise.all([
      sb
        .from("publications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300),
      sb.from("publication_likes").select("pub_id,user_id"),
      sb.from("profiles").select("id,name,email"),
    ]);
    if (pubs.error) {
      el.innerHTML = `<div class="empty">Не удалось загрузить: ${esc(pubs.error.message)}</div>`;
      return;
    }
    GAL.items = pubs.data;
    GAL.likes = likes.data || [];
    GAL.names = Object.fromEntries(
      (profs.data || []).map((p) => [
        p.id,
        p.name || (p.email || "").split("@")[0],
      ]),
    );
    const paths = GAL.items.map((p) => p.image_path);
    if (paths.length) {
      const { data: urls } = await sb.storage
        .from("works")
        .createSignedUrls(paths, 60 * 60 * 6);
      (urls || []).forEach((u, i) => (GAL.items[i].url = u && u.signedUrl));
    }
    drawGallery();
  }
  const likeCount = (id) => GAL.likes.filter((l) => l.pub_id === id).length;
  const iLike = (id) =>
    GAL.likes.some((l) => l.pub_id === id && l.user_id === ME.id);
  function drawGallery() {
    let list = GAL.items.slice();
    if (GAL.who !== "all")
      list = list.filter(
        (p) =>
          p.state &&
          p.state.chars &&
          p.state.chars.some((c) => c.who === GAL.who),
      );
    if (GAL.sort === "mine") list = list.filter((p) => p.user_id === ME.id);
    if (GAL.sort === "top")
      list.sort((a, b) => likeCount(b.id) - likeCount(a.id));
    const el = $("gList");
    if (!list.length) {
      el.innerHTML = `<div class="empty">${GAL.sort === "mine" ? "Вы ещё ничего не публиковали. Оцените удачный кадр в «Мои промты» и нажмите «Опубликовать»." : "Пока пусто. Станьте первым, кто поделится кадром."}</div>`;
      return;
    }
    el.innerHTML =
      `<div class="grid">` +
      list
        .map(
          (
            p,
          ) => `<button type="button" class="gcard${p.hidden ? " hid" : ""}" data-pid="${p.id}">
    <img src="${esc(p.url || "")}" alt="${esc(p.title || "Кадр")}" loading="lazy"><div><span class="likes">♥ ${likeCount(p.id)}</span><b>${esc(p.title || "Без названия")}</b>${esc(GAL.names[p.user_id] || "")}${p.hidden ? " · скрыто" : ""}</div></button>`,
        )
        .join("") +
      `</div>`;
  }
  $("gSort").addEventListener("click", (e) => {
    const b = e.target.closest("[data-s]");
    if (!b) return;
    GAL.sort = b.dataset.s;
    $("gSort")
      .querySelectorAll("[data-s]")
      .forEach((x) => x.setAttribute("aria-checked", String(x === b)));
    drawGallery();
  });
  $("gWho").addEventListener("click", (e) => {
    const b = e.target.closest("[data-gw]");
    if (!b) return;
    GAL.who = b.dataset.gw;
    $("gWho")
      .querySelectorAll("[data-gw]")
      .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    drawGallery();
  });
  $("gList").addEventListener("click", (e) => {
    const c = e.target.closest("[data-pid]");
    if (c) viewPub(GAL.items.find((p) => p.id === c.dataset.pid));
  });
  function viewPub(p) {
    const mine = p.user_id === ME.id;
    modal(
      `<div class="view"><img src="${esc(p.url || "")}" alt="${esc(p.title || "")}"><div>
    <h2>${esc(p.title || "Без названия")}</h2><p class="hint">${esc(GAL.names[p.user_id] || "")} · ${fmtDate(p.created_at)}</p>
    ${p.note ? `<p>${esc(p.note)}</p>` : ""}<div class="row" style="margin:10px 0">${sceneChips(
      p.state,
    )
      .map((c) => `<span class="mini">${esc(c)}</span>`)
      .join("")}</div>
    <div class="row"><button class="btn primary" type="button" data-v="apply">Применить настройки</button><button class="btn" type="button" data-v="copy">Скопировать промт</button>
    <button class="btn" type="button" data-v="like" aria-pressed="${iLike(p.id)}">${iLike(p.id) ? "♥ Полезно" : "♡ Полезно"} · ${likeCount(p.id)}</button></div>
    <p class="hint">Персонажи и одежда применятся вместе со всей сценой. Поменяйте что нужно и скопируйте свой промт.</p>
    ${ADMIN || mine ? `<div class="row" style="margin-top:14px">${ADMIN ? `<button class="btn small" type="button" data-v="hide">${p.hidden ? "Показать всем" : "Скрыть из галереи"}</button>` : ""}<button class="btn small danger" type="button" data-v="del">Удалить</button></div>` : ""}
  </div></div>`,
      (win, close) => {
        win.addEventListener("click", async (e) => {
          const b = e.target.closest("[data-v]");
          if (!b) return;
          const v = b.dataset.v;
          if (v === "apply") {
            close();
            applyState(p.state);
            logEvent("apply_gallery", { pub: p.id });
          }
          if (v === "copy") {
            if (await copyText(p.prompt)) toast("Промт скопирован");
          }
          if (v === "like") {
            if (iLike(p.id)) {
              await sb
                .from("publication_likes")
                .delete()
                .eq("pub_id", p.id)
                .eq("user_id", ME.id);
              GAL.likes = GAL.likes.filter(
                (l) => !(l.pub_id === p.id && l.user_id === ME.id),
              );
            } else {
              await sb.from("publication_likes").insert({ pub_id: p.id });
              GAL.likes.push({ pub_id: p.id, user_id: ME.id });
            }
            b.textContent = `${iLike(p.id) ? "♥ Полезно" : "♡ Полезно"} · ${likeCount(p.id)}`;
            b.setAttribute("aria-pressed", String(iLike(p.id)));
            drawGallery();
          }
          if (v === "hide") {
            await sb
              .from("publications")
              .update({ hidden: !p.hidden })
              .eq("id", p.id);
            p.hidden = !p.hidden;
            close();
            drawGallery();
          }
          if (v === "del") {
            if (!b.dataset.sure) {
              b.dataset.sure = "1";
              b.textContent = "Точно удалить?";
              return;
            }
            await sb.from("publications").delete().eq("id", p.id);
            await sb.storage.from("works").remove([p.image_path]);
            GAL.items = GAL.items.filter((x) => x.id !== p.id);
            close();
            drawGallery();
            toast("Удалено");
          }
        });
      },
      true,
    );
  }

  /* =====================================================================
   АДМИНКА
   ===================================================================== */
  async function loadAdmin() {
    const el = $("aBody");
    if (!ADMIN) {
      el.innerHTML = `<div class="empty">Раздел только для администратора.</div>`;
      return;
    }
    el.innerHTML = `<div class="empty">Загружаем…</div>`;
    const since = new Date(Date.now() - 90 * 864e5).toISOString();
    const [ev, profs, pubs, fbs] = await Promise.all([
      sb
        .from("events")
        .select("user_id,kind,meta,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(10000),
      sb.from("profiles").select("*").order("created_at", { ascending: false }),
      sb.from("publications").select("id,user_id,created_at,hidden"),
      sb
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    const events = ev.data || [],
      people = profs.data || [],
      pub = pubs.data || [],
      fb = fbs.data || [];
    const copies = events.filter((e) => e.kind === "copy_prompt"),
      d30 = Date.now() - 30 * 864e5;
    const cnt = (arr, fn) => {
      const m = new Map();
      arr.forEach((x) =>
        [].concat(fn(x) || []).forEach((k) => m.set(k, (m.get(k) || 0) + 1)),
      );
      return [...m].sort((a, b) => b[1] - a[1]);
    };
    const bars = (title, rows, nameOf) => {
      const max = Math.max(1, ...rows.map((r) => r[1]));
      return `<section class="block"><h3>${title}</h3>${
        rows.length
          ? `<div class="bars">${rows
              .slice(0, 10)
              .map(
                ([k, v]) =>
                  `<div class="bar"><div>${esc(nameOf(k))}<i style="width:${(v / max) * 100}%"></i></div><b>${v}</b></div>`,
              )
              .join("")}</div>`
          : `<p class="hint">Пока нет данных</p>`
      }</section>`;
    };
    const nm = (list) => (k) => (by(list, k) || {}).name || k;
    const name = (id) => {
      const p = people.find((x) => x.id === id);
      return p ? p.name || p.email : "—";
    };
    let h = `<div class="kpis">
    <div class="kpi"><b>${people.length}</b><span>человек в команде</span></div>
    <div class="kpi"><b>${copies.filter((e) => +new Date(e.created_at) > d30).length}</b><span>промтов за 30 дней</span></div>
    <div class="kpi"><b>${events.filter((e) => e.kind === "copy_reference").length}</b><span>эталонов за 90 дней</span></div>
    <div class="kpi"><b>${pub.length}</b><span>публикаций в галерее</span></div></div>`;
    h += `<div class="adm">`;
    h += bars(
      "Герои",
      cnt(copies, (e) => e.meta.who),
      (k) => (C.CHARS[k] || {}).name || k,
    );
    h += bars(
      "Одежда",
      cnt(copies, (e) => e.meta.outfits),
      (k) => {
        const o = by(C.OUTFITS, k);
        return o ? `${C.CHARS[o.who].name} · ${o.name}` : k;
      },
    );
    h += bars(
      "Позы",
      cnt(copies, (e) => e.meta.poses),
      nm(C.POSES),
    );
    h += bars(
      "Действия",
      cnt(copies, (e) => (e.meta.action !== "none" ? e.meta.action : null)),
      nm(C.ACTIONS),
    );
    h += bars(
      "Локации",
      cnt(copies, (e) => e.meta.location),
      nm(C.LOCATIONS),
    );
    h += bars(
      "Форматы",
      cnt(copies, (e) => e.meta.frame),
      (k) => k,
    );
    h += bars(
      "Состав кадра",
      cnt(copies, (e) =>
        (e.meta.who || []).map((w) => C.CHARS[w].name).join(" + "),
      ),
      (k) => k,
    );
    h += bars(
      "Оценки (★)",
      cnt(
        events.filter((e) => e.kind === "rate"),
        (e) => String(e.meta.rating),
      ),
      (k) => "★".repeat(+k),
    );
    h += `</div>`;

    // эталоны
    const keys = [
      ...C.OUTFITS.map((o) => [
        o.id,
        `${C.CHARS[o.who].name} · ${o.name}`,
        o.ref,
      ]),
      ["lineup", "Вся семья: эталон роста", C.LINEUP_REF],
    ];
    h += `<section class="block"><h2>Эталоны маскота</h2><p class="hint">Эти картинки дизайнеры скачивают и прикладывают к промту. Хранятся в закрытом хранилище: видят только вошедшие. Рядом — имя исходного файла из папки «Капибары рефы».</p>
    <div class="refgrid" style="margin-top:12px">${keys
      .map(
        ([
          k,
          label,
          file,
        ]) => `<div class="refcell"><div class="im">${REFURL[k] ? `<img src="${esc(REFURL[k])}" alt="">` : "нет"}</div><b>${esc(label)}</b><span style="color:var(--faint)">${esc(file || "эталона нет — сделайте в «Новый эталон»")}</span>
      <label class="btn small" style="margin-top:6px;width:100%">${REFS[k] ? "Заменить" : "Загрузить"}<input type="file" accept="image/png,image/jpeg,image/webp" data-refkey="${k}" class="sr"></label></div>`,
      )
      .join("")}</div></section>`;

    // команда
    h += `<section class="block"><h2>Команда</h2><table class="t"><thead><tr><th>Имя</th><th>Роль</th><th>Почта</th><th>Промтов</th><th>Последний раз</th></tr></thead><tbody>${people
      .map((p) => {
        const mine = copies.filter((e) => e.user_id === p.id),
          last = events.find((e) => e.user_id === p.id);
        return `<tr><td>${esc(p.name || "—")}</td><td>${esc(p.role || "—")}</td><td>${esc(p.email)}</td><td>${mine.length}</td><td>${last ? fmtDate(last.created_at) : "—"}</td></tr>`;
      })
      .join("")}</tbody></table></section>`;

    // пароль
    h += `<section class="block"><h2>Пароль команды</h2><p class="hint">С ним регистрируются новые люди. Уже зарегистрированные продолжают входить со своим паролем.</p>
    <div class="row" style="margin-top:10px;max-width:520px"><input id="tpw" type="text" autocomplete="off" placeholder="Новый пароль, от 8 символов" style="flex:1"><button class="btn primary" type="button" id="tpwGo">Сменить</button></div><p class="err" id="tpwErr"></p></section>`;

    // отзывы
    h += `<section class="block"><h2>Сообщения о проблемах</h2>${
      fb.length
        ? fb
            .map(
              (
                f,
              ) => `<div class="hitem" style="box-shadow:none;border:1px solid var(--line);margin-bottom:8px"><div><div class="meta">${esc(name(f.user_id))} · ${fmtDate(f.created_at)}${f.resolved ? " · решено" : ""}</div><p style="margin:6px 0 0;white-space:pre-wrap">${esc(f.text)}</p></div>
    <div class="acts">${f.image_path ? `<button class="btn small" type="button" data-fbimg="${esc(f.image_path)}">Скриншот</button>` : ""}${f.resolved ? "" : `<button class="btn small" type="button" data-fbok="${f.id}">Решено</button>`}</div></div>`,
            )
            .join("")
        : `<p class="hint">Сообщений нет.</p>`
    }</section>`;
    el.innerHTML = h;
  }
  $("aBody").addEventListener("change", async (e) => {
    const inp = e.target.closest("[data-refkey]");
    if (!inp || !inp.files[0]) return;
    const file = inp.files[0],
      key = inp.dataset.refkey,
      path = `${key}.${extOf(file)}`;
    toast("Загружаем эталон…");
    if (REFS[key] && REFS[key] !== path)
      await sb.storage.from("refs").remove([REFS[key]]);
    const up = await sb.storage
      .from("refs")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (up.error) {
      toast("Не удалось загрузить: " + up.error.message);
      return;
    }
    const r = await sb.from("ref_images").upsert({
      id: key,
      image_path: path,
      updated_at: new Date().toISOString(),
    });
    if (r.error) {
      toast("Не удалось сохранить: " + r.error.message);
      return;
    }
    await loadRefs();
    toast("Эталон сохранён");
    loadAdmin();
    renderOut();
  });
  $("aBody").addEventListener("click", async (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.id === "tpwGo") {
      const v = $("tpw").value.trim(),
        err = $("tpwErr");
      if (v.length < 8) {
        err.textContent = "Нужно не меньше 8 символов";
        return;
      }
      const { error } = await sb.rpc("set_team_password", { new_password: v });
      if (error) {
        err.textContent = "Не получилось: " + error.message;
        return;
      }
      $("tpw").value = "";
      err.textContent = "";
      toast("Пароль команды сменён. Сообщите его новым коллегам лично.");
    }
    if (b.dataset.fbok) {
      await sb
        .from("feedback")
        .update({ resolved: true })
        .eq("id", b.dataset.fbok);
      loadAdmin();
    }
    if (b.dataset.fbimg) {
      const { data } = await sb.storage
        .from("feedback")
        .createSignedUrl(b.dataset.fbimg, 600);
      if (data) window.open(data.signedUrl, "_blank", "noopener");
    }
  });

  /* =====================================================================
   ОБРАТНАЯ СВЯЗЬ И ПОМОЩЬ
   ===================================================================== */
  function feedbackDialog() {
    modal(
      `<h2>Что пошло не так?</h2><p class="hint">Опишите проблему или идею. Скриншот — по желанию.</p>
    <label class="f" for="fbT">Сообщение</label><textarea id="fbT"></textarea>
    <label class="f" for="fbF">Скриншот</label><input id="fbF" type="file" accept="image/png,image/jpeg,image/webp">
    <p class="err" id="fbE"></p><div class="foot"><button class="btn primary" type="button" id="fbGo">Отправить</button></div>`,
      (win, close) => {
        win.querySelector("#fbGo").addEventListener("click", async (ev) => {
          const text = win.querySelector("#fbT").value.trim(),
            file = win.querySelector("#fbF").files[0],
            err = win.querySelector("#fbE");
          if (!text) {
            err.textContent = "Напишите пару слов";
            return;
          }
          ev.target.disabled = true;
          let image_path = null;
          if (file) {
            image_path = `${ME.id}/${uuid()}.${extOf(file)}`;
            const up = await sb.storage
              .from("feedback")
              .upload(image_path, file, { contentType: file.type });
            if (up.error) image_path = null;
          }
          const { error } = await sb.from("feedback").insert({
            text: text + `\n\n[${location.hash || "#builder"}]`,
            image_path,
          });
          if (error) {
            err.textContent = "Не отправилось: " + error.message;
            ev.target.disabled = false;
            return;
          }
          close();
          toast("Спасибо! Сообщение у администратора.");
        });
      },
    );
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
    document
      .querySelectorAll("[data-gm]")
      .forEach((b) =>
        b.setAttribute("aria-checked", String(b.dataset.gm === m)),
      );
    $("gUpFields").hidden = false;
    $("gPassHint").hidden = m !== "up";
    $("gForgot").hidden = m !== "in";
    $("gPassL").textContent = m === "up" ? "Пароль команды" : "Пароль";
    $("gPass").autocomplete = m === "up" ? "new-password" : "current-password";
    $("gBtn").textContent = m === "up" ? "Зарегистрироваться" : "Войти";
    $("gErr").textContent = "";
  }
  document
    .querySelectorAll("[data-gm]")
    .forEach((b) => b.addEventListener("click", () => gateMode(b.dataset.gm)));

  $("gateF").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("gEmail").value.trim().toLowerCase(),
      pass = $("gPass").value,
      err = $("gErr");
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      err.textContent = "Проверьте почту";
      return;
    }
    if (!pass) {
      err.textContent = "Введите пароль";
      return;
    }
    $("gBtn").disabled = true;
    err.textContent = "";
    try {
      if (GM === "up") {
        const name = $("gName").value.trim(),
          role = "";
        if (!name) {
          err.textContent = "Как вас зовут? Имя увидят коллеги в галерее.";
          return;
        }
        const { data, error } = await sb.auth.signUp({
          email,
          password: pass,
          options: { data: { name, role, team_password: pass } },
        });
        if (error) {
          const m = error.message || "";
          err.textContent = /already|registered|exists/i.test(m)
            ? "Эта почта уже зарегистрирована. Войдите."
            : /database error|TEAM_PASSWORD/i.test(m)
              ? "Неверный пароль команды. Уточните его у администратора."
              : /password/i.test(m)
                ? "Пароль слишком короткий."
                : "Не получилось: " + m;
          return;
        }
        if (!data.session) {
          err.textContent =
            "Почти готово: Supabase просит подтвердить почту. Попросите администратора выключить подтверждение почты в настройках.";
          return;
        }
        await afterLogin(data.session.user);
      } else {
        const { data, error } = await sb.auth.signInWithPassword({
          email,
          password: pass,
        });
        if (error) {
          err.textContent = /confirm/i.test(error.message)
            ? "Почта не подтверждена."
            : "Неверная почта или пароль.";
          return;
        }
        await afterLogin(data.user);
      }
    } finally {
      $("gBtn").disabled = false;
    }
  });
  function showGate() {
    ME = null;
    ADMIN = false;
    $("gate").hidden = false;
    $("gateLoading").hidden = true;
    $("gateForm").hidden = false;
    $("top").hidden = true;
    $("app").hidden = true;
    $("fab").hidden = true;
  }
  async function afterLogin(user) {
    ME = {
      id: user.id,
      email: user.email,
      name: (user.user_metadata || {}).name || "",
    };
    const { data: prof } = await sb
      .from("profiles")
      .select("name,role")
      .eq("id", user.id)
      .maybeSingle();
    if (prof && prof.name) ME.name = prof.name;
    const { data: adm } = await sb.rpc("is_admin");
    ADMIN = !!adm;
    await loadRefs();
    const nm = ME.name || ME.email.split("@")[0];
    $("uAva").textContent = nm.trim()[0].toUpperCase();
    $("uName").textContent = nm;
    $("uMName").textContent = nm;
    $("uMEmail").textContent = ME.email;
    $("navAdmin").hidden = !ADMIN;
    $("gate").hidden = true;
    $("top").hidden = false;
    $("app").hidden = false;
    $("fab").hidden = true;
    route();
  }

  /* =====================================================================
   НАВИГАЦИЯ И МЕНЮ
   ===================================================================== */
  function route() {
    if (!ME) return;
    let v = (location.hash || "#builder").slice(1);
    if (
      !["builder", "gallery", "history", "admin"].includes(v) ||
      (v === "admin" && !ADMIN)
    )
      v = "builder";
    document
      .querySelectorAll("[data-view]")
      .forEach((s) => (s.hidden = s.dataset.view !== v));
    document
      .querySelectorAll(".nav a")
      .forEach((a) =>
        a.setAttribute("aria-current", a.dataset.v === v ? "page" : "false"),
      );
    if (v === "builder") renderAll();
    if (v === "gallery") loadGallery();
    if (v === "history") loadHistory();
    if (v === "admin") loadAdmin();
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  $("uBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    const o = $("uMenu").hidden;
    $("uMenu").hidden = !o;
    $("uBtn").setAttribute("aria-expanded", String(o));
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#uMenu")) {
      $("uMenu").hidden = true;
      $("uBtn").setAttribute("aria-expanded", "false");
    }
  });
  $("uMenu").addEventListener("click", async (e) => {
    const a = e.target.closest("[data-act]");
    if (!a) return;
    $("uMenu").hidden = true;
    if (a.dataset.act === "help") helpDialog();
    if (a.dataset.act === "feedback") feedbackDialog();
    if (a.dataset.act === "logout") {
      await sb.auth.signOut();
      showGate();
    }
  });
  $("fab").addEventListener("click", feedbackDialog);

  /* =====================================================================
   СТАРТ
   ===================================================================== */
  (async () => {
    gateMode("in");
    try {
      const { data } = await sb.auth.getSession();
      if (data.session) await afterLogin(data.session.user);
      else showGate();
    } catch (e) {
      showGate();
    }
    sb.auth.onAuthStateChange((ev) => {
      if (ev === "SIGNED_OUT") showGate();
    });
  })();
})();
