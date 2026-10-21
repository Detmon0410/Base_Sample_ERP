/*
 * Runs in the browser page of the build (after render.js). Draws the endpoints of an API as cards, one card for each module:
 *   window.renderApi(spec, theme) -> { svg, width, height, issues, crossings }
 * spec: { modules: [{ name, who, rows: [{ methods: ["GET", "POST"], path, text, roles: "ASF" | "AF" | "A" | "owner" }] }] }
 * A row: the methods as small coloured badges (GET blue, POST purple, PUT outlined, DELETE red), the path, what it does in a few words,
 * and three small letters A (Admin), S (Sale Worker), F (Factory Worker): dark when that role may call it, faint when not. "owner" means
 * that the permission depends on the owner of the file, and the row says so.
 */
(() => {
  const { textSvg, measure, resolveRole, esc } = window.__flow;
  const ROW = 28;
  const HEAD = 36;
  const PAD = 14;
  const GAP = 18;
  const BADGE_W = 52;
  const BADGE_GAP = 4;
  const CHIP = 20;
  const LETTERS = ["A", "S", "F"];

  window.renderApi = async (spec, theme) => {
    const ink = theme.connector.stroke;
    const action = resolveRole(theme, "action");
    const decision = resolveRole(theme, "decision");
    const error = resolveRole(theme, "error");
    const dark = resolveRole(theme, "startEnd");
    const badge = {
      GET: { fill: decision.fill, stroke: decision.stroke, text: decision.text },
      POST: { fill: action.fill, stroke: action.stroke, text: action.text },
      PUT: { fill: "#ffffff", stroke: action.stroke, text: action.text },
      DELETE: { fill: error.fill, stroke: error.stroke, text: error.text },
    };
    const maxBadges = Math.max(...spec.modules.flatMap((m) => m.rows.map((r) => r.methods.length)));
    const badgesW = maxBadges * BADGE_W + (maxBadges - 1) * BADGE_GAP;
    const pathW = Math.ceil(Math.max(...spec.modules.flatMap((m) => m.rows.map((r) => measure(r.path, 12.5, theme.font, "bold").width))));
    const textW = Math.ceil(Math.max(...spec.modules.flatMap((m) => m.rows.map((r) => measure(r.text, 11.5, theme.font).width))));
    const chipsW = 3 * CHIP + 2 * 4;
    const width = PAD + badgesW + 12 + pathW + 14 + textW + 14 + chipsW + PAD;
    const M = 12;
    const parts = [];
    let y = M;
    for (const mod of spec.modules) {
      const height = HEAD + mod.rows.length * ROW + 8;
      parts.push(`<rect x="${M}" y="${y}" width="${width}" height="${height}" rx="6" fill="#ffffff" stroke="${action.stroke}" stroke-width="${action.strokeWidth}"/>`);
      parts.push(`<path d="M${M},${y + HEAD} V${y + 6} Q${M},${y} ${M + 6},${y} H${M + width - 6} Q${M + width},${y} ${M + width},${y + 6} V${y + HEAD} Z" fill="${action.fill}" stroke="${action.stroke}" stroke-width="${action.strokeWidth}"/>`);
      parts.push(`<text x="${M + PAD}" y="${y + HEAD / 2}" font-family="${esc(theme.font)}" font-size="${theme.fontSize + 1}" font-weight="bold" fill="${action.text}" dominant-baseline="central">${esc(mod.name)}</text>`);
      if (mod.who) parts.push(`<text x="${M + width - PAD}" y="${y + HEAD / 2}" font-family="${esc(theme.font)}" font-size="11.5" fill="${action.text}" fill-opacity="0.8" text-anchor="end" dominant-baseline="central">${esc(mod.who)}</text>`);
      mod.rows.forEach((row, i) => {
        const cy = y + HEAD + i * ROW + ROW / 2 + 4;
        if (i) parts.push(`<path d="M${M + PAD},${cy - ROW / 2} H${M + width - PAD}" stroke="${ink}" stroke-opacity="0.12"/>`);
        row.methods.forEach((method, j) => {
          const bx = M + PAD + j * (BADGE_W + BADGE_GAP);
          const b = badge[method];
          parts.push(`<rect x="${bx}" y="${cy - 10}" width="${BADGE_W}" height="20" rx="4" fill="${b.fill}" stroke="${b.stroke}" stroke-width="1.2"/>`);
          parts.push(textSvg([method], bx + BADGE_W / 2, cy, 10.5, b.text, theme.font, "bold"));
        });
        const px = M + PAD + badgesW + 12;
        parts.push(`<text x="${px}" y="${cy}" font-family="${esc(theme.font)}" font-size="12.5" font-weight="bold" fill="${ink}" dominant-baseline="central">${esc(row.path)}</text>`);
        parts.push(`<text x="${px + pathW + 14}" y="${cy}" font-family="${esc(theme.font)}" font-size="11.5" fill="${ink}" fill-opacity="0.75" dominant-baseline="central">${esc(row.text)}</text>`);
        const cx0 = M + width - PAD - chipsW;
        if (row.roles === "owner") {
          parts.push(`<text x="${cx0 + chipsW}" y="${cy}" font-family="${esc(theme.font)}" font-size="10.5" font-style="italic" fill="${ink}" fill-opacity="0.75" text-anchor="end" dominant-baseline="central">by owner</text>`);
        } else {
          LETTERS.forEach((letter, k) => {
            const on = row.roles.includes(letter);
            const x = cx0 + k * (CHIP + 4);
            parts.push(`<rect x="${x}" y="${cy - CHIP / 2}" width="${CHIP}" height="${CHIP}" rx="4" fill="${on ? dark.fill : "#ffffff"}" stroke="${on ? dark.stroke : ink}" stroke-opacity="${on ? 1 : 0.25}" stroke-width="1"/>`);
            parts.push(textSvg([letter], x + CHIP / 2, cy, 10.5, on ? dark.text : ink, theme.font, "bold").replace("<text ", `<text fill-opacity="${on ? 1 : 0.3}" `));
          });
        }
      });
      y += height + GAP;
    }
    const w = Math.ceil(width + 2 * M);
    const h = Math.ceil(y - GAP + M);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#ffffff"/>${parts.join("")}</svg>`;
    return { svg, width: w, height: h, issues: [], crossings: 0 };
  };
})();
