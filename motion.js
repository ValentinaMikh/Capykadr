/* Small interaction cues; never block an action or capture pointer events. */
(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  function layer() {
    let el = document.getElementById("uiEffects");
    if (!el) {
      el = document.createElement("div");
      el.id = "uiEffects";
      el.className = "ui-effects";
      el.setAttribute("aria-hidden", "true");
      document.body.append(el);
    }
    return el;
  }
  function particle(className, x, y, text = "", props = {}) {
    if (reduced.matches) return;
    const host = layer();
    while (host.childElementCount >= 32) host.firstElementChild.remove();
    const el = document.createElement("span");
    el.className = className;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    for (const [key, value] of Object.entries(props))
      el.style.setProperty(key, value);
    host.append(el);
    const cleanup = () => el.remove();
    el.addEventListener("animationend", cleanup, { once: true });
    setTimeout(cleanup, 1100);
  }
  function reveal(container) {
    if (reduced.matches || !container) return;
    container
      .querySelectorAll(
        ".character-choice,.season-choice,.family-preview,.examples,.scene-choice,.scene-empty,.reference-panel,.prompt-panel,.gallery-card",
      )
      .forEach((el, index) => {
        el.style.setProperty("--enter-delay", `${Math.min(index, 5) * 35}ms`);
        el.classList.add("ui-enter");
        const cleanup = () => el.classList.remove("ui-enter");
        el.addEventListener(
          "animationend",
          (event) => {
            if (event.target === el) cleanup();
          },
          { once: true },
        );
        setTimeout(cleanup, 800);
      });
  }
  function success(button) {
    if (reduced.matches || !button?.isConnected) return;
    button.classList.remove("ui-success");
    void button.offsetWidth;
    button.classList.add("ui-success");
    setTimeout(() => button.classList.remove("ui-success"), 500);
  }
  function select(button) {
    if (reduced.matches || !button?.isConnected) return;
    const image = button.querySelector(".portrait img");
    if (!image) return;
    image.classList.add("ui-character-selected");
    setTimeout(() => image.classList.remove("ui-character-selected"), 350);
  }
  function like(button) {
    if (reduced.matches || !button?.isConnected) return;
    success(button);
    const r = button.getBoundingClientRect();
    for (let i = 0; i < 6; i++)
      particle("ui-heart", r.x + r.width / 2, r.y + r.height / 2, "♥", {
        "--heart-x": `${(i - 2.5) * 15}px`,
        "--heart-y": `${-65 - (i % 3) * 17}px`,
        "--heart-turn": `${(i - 2.5) * 12}deg`,
        "--heart-delay": `${i * 25}ms`,
        "--heart-color": i % 2 ? "#ff9bb7" : "#cad95a",
      });
  }
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 0 || reduced.matches) return;
      const button = event.target.closest("button,.nav a");
      if (
        !button ||
        button.disabled ||
        button.getAttribute("aria-disabled") === "true"
      )
        return;
      particle("ui-press-ring", event.clientX, event.clientY);
    },
    { passive: true },
  );
  window.CapyMotion = { reveal, like, success, select };
})();
