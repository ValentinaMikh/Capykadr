/* Version presets are bundled; the admin-controlled reference registry stores
   a pointer to the active manifest. Existing authenticated-read/admin-write RLS
   applies, so switching the team does not require new database privileges. */
window.CapyVersions = (() => {
  const settingId = "constructor-version";
  const manifests = { 1: "versions/v1.json", 2: "versions/v2.json" };
  return {
    settingId,
    manifests,
    decode(rows) {
      const row = rows.find((r) => r.id === settingId);
      if (!row) return 2;
      const version = Object.keys(manifests).find(
        (v) => manifests[v] === row.image_path,
      );
      if (!version) throw new Error("Неизвестная версия конструктора");
      return Number(version);
    },
    preset(version) {
      return version === 1
        ? { data: window.CAPY_V1, builder: window.CapyBuilderV1 }
        : { data: window.CAPY, builder: window.CapyBuilder };
    },
  };
})();
