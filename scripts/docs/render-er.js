/*
 * Runs in the browser page of the build (after render.js). Draws a Mermaid erDiagram as tables with crow's foot ends:
 *   window.renderEr(code, theme, spec) -> { svg, width, height, issues, crossings }
 * spec: { tables: [names] | "all", names: true (title bars only), ghosts: true (the tables outside `tables` that they relate to, as
 * dashed title bars), dashed: [[parent, child]] (a link with no database key), extra: [{ line: 'A ||--o{ B : "label"' }] (a link of a
 * foreign key that the diagram code does not draw), direction: "DOWN" | "RIGHT" }.
 * ELK places the tables and routes the lines at 90 degrees; the line ends are drawn here: exactly one, zero or one, one or many,
 * zero or many.
 */
(() => {
  const { check, roundedPath, textSvg, measure, resolveRole, esc } = window.__flow;
  const ROW = 20;
  const TITLE = 28;
  const PAD = 10;
  const END = { "||": "one", "o|": "zeroOne", "|{": "oneMany", "o{": "zeroMany" };

  function parseEr(code) {
    const entities = [];
    const relationships = [];
    let current = null;
    for (const line of code.split("\n")) {
      const open = /^ {4}(\w+) \{$/.exec(line);
      const column = /^ {8}(\w+) (\w+)(?: ([A-Z]{2}(?:,[A-Z]{2})*))?(?: "([^"]*)")?$/.exec(line);
      if (open) entities.push((current = { name: open[1], columns: [] }));
      else if (/^ {4}\}$/.test(line)) current = null;
      else if (current && column) current.columns.push({ type: column[1], name: column[2], keys: column[3] ?? "", note: column[4] ?? "" });
      else relationships.push(...readRelation(line));
    }
    return { entities, relationships };
  }

  function readRelation(line) {
    const match = /^ {4}(\w+) (\|\||o\|)--(\|\||o\||\|\{|o\{) (\w+) : "?([^"]+)"?$/.exec(line);
    return match ? [{ parent: match[1], parentEnd: END[match[2]], childEnd: END[match[3]], child: match[4], label: match[5] }] : [];
  }

  function sizeTable(entity, theme, namesOnly) {
    const titleText = measure(entity.name, theme.fontSize, theme.font, "bold").width;
    if (namesOnly) return { width: Math.ceil(titleText + 2 * PAD + 8), height: 32 };
    const keyW = 30;
    const nameW = Math.max(...entity.columns.map((c) => measure(c.name, 12, theme.font).width));
    const typeW = Math.max(...entity.columns.map((c) => measure(c.type, 12, theme.font).width));
    const noteW = Math.max(0, ...entity.columns.map((c) => (c.note ? measure(c.note, 10.5, theme.font).width : 0)));
    entity.cols = { keyW, nameW: Math.ceil(nameW), typeW: Math.ceil(typeW), noteW: Math.ceil(noteW) };
    const body = keyW + 6 + nameW + 10 + typeW + (noteW ? 12 + noteW : 0);
    return { width: Math.ceil(Math.max(titleText + 2 * PAD, body + 2 * PAD)), height: TITLE + entity.columns.length * ROW + 6 };
  }

  const fx = (n) => Math.round(n * 10) / 10;

  /** The end of a line at `p` (on the edge of a table), `u` the unit vector from the table along the line. */
  function endSymbol(kind, p, u, stroke, width) {
    const n = { x: -u.y, y: u.x };
    const at = (d, w = 0) => `${fx(p.x + u.x * d + n.x * w)},${fx(p.y + u.y * d + n.y * w)}`;
    const line = (a, b) => `<path d="M${a} L${b}" stroke="${stroke}" stroke-width="${width}" fill="none"/>`;
    const bar = (d) => line(at(d, -6), at(d, 6));
    const circle = (d) => `<circle cx="${fx(p.x + u.x * d)}" cy="${fx(p.y + u.y * d)}" r="4" fill="#ffffff" stroke="${stroke}" stroke-width="${width}"/>`;
    const foot = () => line(at(12, 0), at(0, -7)) + line(at(12, 0), at(0, 7)) + line(at(12, 0), at(0, 0));
    switch (kind) {
      case "one":
        return bar(8) + bar(13);
      case "zeroOne":
        return bar(8) + circle(16);
      case "oneMany":
        return foot() + bar(16);
      case "zeroMany":
        return foot() + circle(19);
      default:
        return "";
    }
  }

  window.renderEr = async (code, theme, spec = {}) => {
    const { entities, relationships: base } = parseEr(code);
    const byName = new Map(entities.map((entity) => [entity.name, entity]));
    const relationships = [...base, ...(spec.extra ?? []).flatMap((item) => readRelation(`    ${item.line}`))];
    const shown = spec.tables === "all" || !spec.tables ? new Set(entities.map((entity) => entity.name)) : new Set(spec.tables);
    const ghosts = new Set();
    if (spec.ghosts) for (const r of relationships) {
      if (shown.has(r.parent) && !shown.has(r.child)) ghosts.add(r.child);
      if (shown.has(r.child) && !shown.has(r.parent)) ghosts.add(r.parent);
    }
    const rels = relationships.filter((r) => (shown.has(r.parent) || ghosts.has(r.parent)) && (shown.has(r.child) || ghosts.has(r.child)) && (shown.has(r.parent) || shown.has(r.child)));
    const ids = [...shown, ...ghosts].filter((id) => byName.has(id));
    const dashed = new Set((spec.dashed ?? []).map(([a, b]) => `${a}>${b}`));

    let nodes;
    let edges;
    if (spec.domains) {
      // the overview: one box per domain (its tables listed), one line per pair of domains, counting the relationships between them
      const domainOf = new Map(spec.domains.flatMap((d, i) => d.tables.map((t) => [t, i])));
      nodes = spec.domains.map((d, i) => {
        const width = Math.ceil(Math.max(measure(d.name, theme.fontSize, theme.font, "bold").width, ...d.tables.map((t) => measure(t, 12, theme.font).width)) + 2 * PAD + 8);
        return { id: `d${i}`, domain: d, width, height: TITLE + d.tables.length * ROW + 10 };
      });
      const pairs = new Map();
      for (const r of relationships) {
        const a = domainOf.get(r.parent);
        const b = domainOf.get(r.child);
        if (a === undefined || b === undefined || a === b) continue;
        const key = `${a}>${b}`;
        pairs.set(key, (pairs.get(key) ?? 0) + 1);
      }
      edges = [...pairs].map(([key, count], i) => {
        const [a, b] = key.split(">");
        return { id: `r${i}`, from: `d${a}`, to: `d${b}`, rel: { parentEnd: null, childEnd: null }, label: `${count} relationship${count > 1 ? "s" : ""}`, arrow: false, dashed: false };
      });
    } else {
      nodes = ids.map((id) => {
        const entity = byName.get(id);
        const ghost = ghosts.has(id);
        const size = sizeTable(entity, theme, spec.names || ghost);
        return { id, entity, ghost, namesOnly: spec.names || ghost, ...size };
      });
      edges = rels.map((r, i) => ({ id: `r${i}`, from: r.parent, to: r.child, rel: r, label: r.label, arrow: false, dashed: dashed.has(`${r.parent}>${r.child}`) }));
    }

    const elkNodes = nodes.map((n) => {
      const ports = edges.flatMap((e) => [...(e.from === n.id ? [{ id: `${e.id}.s`, width: 0, height: 0 }] : []), ...(e.to === n.id ? [{ id: `${e.id}.t`, width: 0, height: 0 }] : [])]);
      const group = (spec.groups ?? []).findIndex((names) => names.includes(n.id));
      const options = { "elk.portConstraints": "FREE", "elk.spacing.portPort": "22", "elk.portAlignment.default": "CENTER" };
      if (spec.groups) options["elk.partitioning.partition"] = String(group < 0 ? spec.groups.length : group);
      return { id: n.id, width: n.width, height: n.height, ports, layoutOptions: options };
    });
    const elkEdges = edges.map((e) => ({ id: e.id, sources: [`${e.id}.s`], targets: [`${e.id}.t`] }));
    const layout = await new ELK().layout({
      id: "root",
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": spec.direction ?? "DOWN",
        ...(spec.groups ? { "elk.partitioning.activate": "true" } : {}),
        "elk.edgeRouting": "ORTHOGONAL",
        "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
        "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
        "elk.spacing.nodeNode": String(spec.nodeGap ?? 56),
        "elk.layered.spacing.nodeNodeBetweenLayers": String(spec.layerGap ?? 80),
        "elk.spacing.edgeNode": "26",
        "elk.spacing.edgeEdge": "16",
        "elk.layered.spacing.edgeNodeBetweenLayers": "26",
        "elk.layered.spacing.edgeEdgeBetweenLayers": "16",
        "elk.padding": "[top=16,left=16,bottom=16,right=16]",
      },
      children: elkNodes,
      edges: elkEdges,
    });
    for (const child of layout.children) Object.assign(nodes.find((n) => n.id === child.id), { x: child.x, y: child.y });
    for (const laid of layout.edges) {
      const edge = edges.find((e) => e.id === laid.id);
      const section = laid.sections[0];
      edge.points = [section.startPoint, ...(section.bendPoints ?? []), section.endPoint].map((p) => ({ x: Math.round(p.x * 2) / 2, y: Math.round(p.y * 2) / 2 }));
    }

    // labels: on the longest segment, beside it, where no table, line or label is
    const hits = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    const segs = edges.flatMap((edge) => edge.points.slice(1).map((p, i) => ({ edge, a: edge.points[i], b: p })));
    const labels = [];
    for (const edge of edges) {
      const text = measure(edge.label, 11, theme.font, "bold");
      const w = Math.ceil(text.width + 8);
      const h = Math.ceil(text.height + 2);
      edge.labelRows = text.rows;
      const options = edge.points
        .slice(1)
        .map((p, i) => ({ a: edge.points[i], b: p, len: Math.abs(p.x - edge.points[i].x) + Math.abs(p.y - edge.points[i].y) }))
        .sort((m, n) => n.len - m.len);
      const candidates = [];
      for (const seg of options) {
        const mx = (seg.a.x + seg.b.x) / 2;
        const my = (seg.a.y + seg.b.y) / 2;
        if (seg.a.x === seg.b.x) candidates.push({ x: mx + 5, y: my - h / 2 }, { x: mx - 5 - w, y: my - h / 2 });
        else candidates.push({ x: mx - w / 2, y: my - 5 - h }, { x: mx - w / 2, y: my + 5 });
      }
      const fits = (box) => !nodes.some((n) => hits(box, n)) && !labels.some((o) => hits(box, o)) && !segs.some((sg) => sg.edge !== edge && hits(box, { x: Math.min(sg.a.x, sg.b.x) - 1, y: Math.min(sg.a.y, sg.b.y) - 1, width: Math.abs(sg.a.x - sg.b.x) + 2, height: Math.abs(sg.a.y - sg.b.y) + 2 }));
      const pick = candidates.map((c) => ({ ...c, width: w, height: h })).find(fits) ?? { ...candidates[0], width: w, height: h };
      labels.push({ text: edge.label, rows: edge.labelRows, ...pick });
    }

    const { connector } = theme;
    const head = resolveRole(theme, "erHeader");
    const body = resolveRole(theme, "action");
    const parts = [];
    for (const edge of edges) {
      const dash = edge.dashed ? ' stroke-dasharray="6 4"' : "";
      parts.push(`<path d="${roundedPath(edge.points)}" fill="none" stroke="${connector.stroke}" stroke-width="${connector.strokeWidth}"${dash} stroke-linejoin="round"/>`);
      const [first, second] = edge.points;
      const last = edge.points[edge.points.length - 1];
      const before = edge.points[edge.points.length - 2];
      const unit = (from, to) => {
        const d = Math.hypot(to.x - from.x, to.y - from.y) || 1;
        return { x: (to.x - from.x) / d, y: (to.y - from.y) / d };
      };
      parts.push(endSymbol(edge.rel.parentEnd, first, unit(first, second), connector.stroke, connector.strokeWidth));
      parts.push(endSymbol(edge.rel.childEnd, last, unit(last, before), connector.stroke, connector.strokeWidth));
    }
    for (const n of nodes) {
      const { x, y, width: w, height: h } = n;
      if (n.domain) {
        parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="#ffffff" stroke="${head.stroke}" stroke-width="${head.strokeWidth}"/>`);
        parts.push(`<path d="M${x},${y + TITLE} V${y + 5} Q${x},${y} ${x + 5},${y} H${x + w - 5} Q${x + w},${y} ${x + w},${y + 5} V${y + TITLE} Z" fill="${head.fill}" stroke="${head.stroke}" stroke-width="${head.strokeWidth}"/>`);
        parts.push(textSvg([n.domain.name], x + w / 2, y + TITLE / 2, theme.fontSize, head.text, theme.font, "bold"));
        n.domain.tables.forEach((t, i) => parts.push(textSvg([t], x + w / 2, y + TITLE + i * ROW + ROW / 2 + 4, 12, body.text, theme.font, "normal")));
        continue;
      }
      const stroke = n.ghost ? head.stroke : head.stroke;
      if (n.namesOnly) {
        parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${n.ghost ? "#ffffff" : head.fill}" stroke="${stroke}" stroke-width="${head.strokeWidth}"${n.ghost ? ' stroke-dasharray="5 3"' : ""}/>`);
        parts.push(textSvg([n.entity.name], x + w / 2, y + h / 2, theme.fontSize, head.text, theme.font, n.ghost ? "normal" : "bold"));
        continue;
      }
      parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="#ffffff" stroke="${stroke}" stroke-width="${head.strokeWidth}"/>`);
      parts.push(`<path d="M${x},${y + TITLE} V${y + 5} Q${x},${y} ${x + 5},${y} H${x + w - 5} Q${x + w},${y} ${x + w},${y + 5} V${y + TITLE} Z" fill="${head.fill}" stroke="${stroke}" stroke-width="${head.strokeWidth}"/>`);
      parts.push(textSvg([n.entity.name], x + w / 2, y + TITLE / 2, theme.fontSize, head.text, theme.font, "bold"));
      const { keyW, nameW, typeW } = n.entity.cols;
      n.entity.columns.forEach((c, i) => {
        const cy = y + TITLE + i * ROW + ROW / 2 + 3;
        const left = x + PAD;
        const t = (text, tx, size, weight, opacity = 1, anchor = "start") => `<text x="${tx}" y="${cy}" font-family="${esc(theme.font)}" font-size="${size}" font-weight="${weight}" fill="${body.text}" fill-opacity="${opacity}" text-anchor="${anchor}" dominant-baseline="central">${esc(text)}</text>`;
        if (c.keys) parts.push(t(c.keys.replace(",", " "), left, 10, "bold", 1));
        parts.push(t(c.name, left + keyW + 6, 12, c.keys.includes("PK") ? "bold" : "normal"));
        parts.push(t(c.type, left + keyW + 6 + nameW + 10, 12, "normal", 0.6));
        if (c.note) parts.push(t(c.note, left + keyW + 6 + nameW + 10 + typeW + 12, 10.5, "normal", 0.6));
      });
    }
    for (const label of labels) {
      parts.push(`<rect x="${label.x}" y="${label.y}" width="${label.width}" height="${label.height}" rx="3" fill="${connector.labelBackground}"/>`);
      parts.push(textSvg(label.rows, label.x + label.width / 2, label.y + label.height / 2, 11, connector.labelText, theme.font, "bold"));
    }
    const width = Math.ceil(layout.width);
    const height = Math.ceil(layout.height);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#ffffff"/>${parts.join("")}</svg>`;
    return { svg, width, height, ...check(nodes, edges, labels) };
  };
})();
