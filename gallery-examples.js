/* Gallery examples: match saved generation settings, then prefer less-used photos. */
window.CapyExamples = (() => {
  const seasons = new Set([
    "base",
    "spring",
    "summer",
    "autumn",
    "winter",
    "newyear",
  ]);
  const seasonOf = (id) => {
    const season = String(id || "").split("-")[1];
    return seasons.has(season) ? (season === "base" ? "spring" : season) : null;
  };
  const castOf = (state) =>
    [...new Set((state.chars || []).map((c) => c.who))].sort().join(",");
  function score(publication, target) {
    const state = publication.state;
    if (
      publication.hidden ||
      !publication.image_path ||
      !publication.url ||
      !state ||
      !Array.isArray(state.chars) ||
      !state.chars.length ||
      !state.chars.every((c) => c && typeof c.who === "string")
    )
      return null;
    if (
      state.chars.length !== target.chars.length ||
      castOf(state) !== castOf(target)
    )
      return null;
    if (
      state.constructorVersion != null &&
      Number(state.constructorVersion) !== target.constructorVersion
    )
      return null;
    if ((state.outputMode || "scene") !== (target.outputMode || "scene"))
      return null;
    const clothingSeasons = state.chars
      .map((c) => seasonOf(c.outfit))
      .filter(Boolean);
    const savedSeason = clothingSeasons.length
      ? clothingSeasons
      : state.designSeason
        ? [state.designSeason]
        : [];
    if (
      target.designSeason &&
      savedSeason.some((s) => s !== target.designSeason)
    )
      return null;
    let value =
      1 +
      (savedSeason.length ? 10 : 0) +
      (state.constructorVersion != null ? 3 : 0);
    const weights = {
      designScene: 30,
      location: 12,
      action: 10,
      frame: 3,
      camera: 3,
      light: 2,
      textzone: 1,
      bodyTurn: 3,
      gaze: 2,
    };
    for (const [key, weight] of Object.entries(weights))
      if (
        !(key === "designScene" && target[key] === "custom") &&
        target[key] != null &&
        target[key] !== "" &&
        state[key] === target[key]
      )
        value += weight;
    for (const char of target.chars) {
      const other = state.chars.find((c) => c.who === char.who);
      if (other.outfit === char.outfit) value += 8;
      if (other.pose === char.pose) value += 4;
      if (other.emo && other.emo === char.emo) value += 1;
      if (other.object && other.object === char.object) value += 4;
    }
    for (const key of ["extra", "product"])
      if (target[key] && state[key] === target[key]) value += 8;
    return value;
  }
  function select(items, target, usage = new Map(), excluded = new Set()) {
    const ranked = items
      .map((item) => ({
        item,
        score: excluded.has(item.image_path) ? null : score(item, target),
      }))
      .filter((row) => row.score !== null)
      .sort(
        (a, b) =>
          b.score - a.score ||
          (usage.get(a.item.image_path) || 0) -
            (usage.get(b.item.image_path) || 0) ||
          (Date.parse(b.item.created_at) || 0) -
            (Date.parse(a.item.created_at) || 0) ||
          String(a.item.id).localeCompare(String(b.item.id)),
      );
    const images = new Set(),
      ids = new Set(),
      result = [];
    for (const { item } of ranked) {
      if (images.has(item.image_path) || ids.has(item.id)) continue;
      images.add(item.image_path);
      ids.add(item.id);
      result.push(item);
      if (result.length === 6) break;
    }
    return result;
  }
  return { select };
})();
