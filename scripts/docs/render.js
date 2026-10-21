/*
 * Runs in the browser page of the build (with elk.bundled.js loaded first). A Mermaid flowchart is read into nodes and edges, laid
 * out by ELK (layered, orthogonal routing) in two passes, drawn as SVG with rounded elbows in the theme, and checked for overlaps.
 *   window.renderFlowchart(code, theme) -> { svg, width, height, issues }
 * Pass 1 lets ELK place the nodes; pass 2 fixes the side of every line end from that placement: forward lines leave the bottom and
 * enter the top, extra branches of a decision leave from its side tips, and lines that go back up leave and enter on a side, so a
 * loop runs in its own lane outside the main column.
 */
(() => {
  const GRID = 8;
  const snap = (value) => Math.ceil(value / GRID) * GRID;

  // ---------------------------------------------------------------- parse

  const SHAPES = [
    ["([", "])", "stadium"],
    ["[[", "]]", "subroutine"],
    ["[(", ")]", "cylinder"],
    ["[/", "/]", "parallelogram"],
    ["[\\", "\\]", "parallelogram"],
    ["((", "))", "circle"],
    ["{{", "}}", "hexagon"],
    ["[", "]", "rect"],
    ["{", "}", "diamond"],
    ["(", ")", "round"],
    [">", "]", "rect"],
  ];
  const EDGE_FORMS = [
    [/^--\s+"([^"]*)"\s+-->/, "solid", true],
    [/^--\s+(.+?)\s+-->/, "solid", true],
    [/^-\.\s+"([^"]*)"\s+\.->/, "dotted", true],
    [/^-\.\s+(.+?)\s+\.->/, "dotted", true],
    [/^-\.\s+"([^"]*)"\s+\.-(?!>)/, "dotted", false],
    [/^-\.\s+(.+?)\s+\.-(?!>)/, "dotted", false],
    [/^==\s+(.+?)\s+==>/, "thick", true],
    [/^-->(?:\|([^|]*)\|)?/, "solid", true],
    [/^---(?:\|([^|]*)\|)?/, "solid", false],
    [/^-\.->(?:\|([^|]*)\|)?/, "dotted", true],
    [/^-\.-(?:\|([^|]*)\|)?/, "dotted", false],
    [/^==>(?:\|([^|]*)\|)?/, "thick", true],
  ];
  const clean = (text) => text.trim().replace(/^"(.*)"$/s, "$1").replaceAll(" -> ", " → ").replace(/&quot;/g, '"');

  function parse(code) {
    const graph = { direction: "TB", nodes: new Map(), edges: [], classes: {} };
    const node = (id) => {
      if (!graph.nodes.has(id)) graph.nodes.set(id, { id, text: id, shape: "rect", cls: null, order: graph.nodes.size });
      return graph.nodes.get(id);
    };
    const readNode = (line, at) => {
      const idMatch = /^[A-Za-z0-9_]+/.exec(line.slice(at));
      if (!idMatch) throw new Error(`no node at "${line.slice(at)}"`);
      const item = node(idMatch[0]);
      at += idMatch[0].length;
      for (const [open, close, shape] of SHAPES) {
        if (!line.startsWith(open, at)) continue;
        const start = at + open.length;
        let end;
        if (line[start] === '"') end = line.indexOf(`"${close}`, start + 1) + 1;
        else end = line.indexOf(close, start);
        if (end <= 0) continue;
        item.text = clean(line.slice(start, end));
        item.shape = shape;
        at = end + close.length;
        break;
      }
      const cls = /^:::([A-Za-z0-9_-]+)/.exec(line.slice(at));
      if (cls) {
        item.cls = cls[1];
        at += cls[0].length;
      }
      return [item, at];
    };
    const lines = code.split("\n").map((line) => line.trim());
    const head = lines.shift();
    const dir = /^(?:flowchart|graph)\s+(TD|TB|LR|RL|BT)/.exec(head);
    if (dir) graph.direction = { TD: "TB", TB: "TB", BT: "TB", LR: "LR", RL: "LR" }[dir[1]];
    for (const line of lines) {
      if (!line || line.startsWith("%%") || line === "end" || line.startsWith("subgraph") || line.startsWith("direction") || line.startsWith("style") || line.startsWith("linkStyle")) continue;
      if (line.startsWith("classDef ")) continue;
      const classLine = /^class\s+([\w,]+)\s+(\w+)/.exec(line);
      if (classLine) {
        for (const id of classLine[1].split(",")) node(id).cls = classLine[2];
        continue;
      }
      let at = 0;
      let [from, next] = readNode(line, at);
      at = next;
      while (at < line.length) {
        while (line[at] === " ") at += 1;
        if (at >= line.length) break;
        const rest = line.slice(at);
        const form = EDGE_FORMS.find(([pattern]) => pattern.test(rest));
        if (!form) throw new Error(`no line at "${rest}"`);
        const match = form[0].exec(rest);
        at += match[0].length;
        while (line[at] === " ") at += 1;
        const [to, after] = readNode(line, at);
        at = after;
        graph.edges.push({ id: `e${graph.edges.length}`, from: from.id, to: to.id, label: match[1] ? clean(match[1]) : "", style: form[1], arrow: form[2] });
        from = to;
      }
    }
    return graph;
  }

  // ---------------------------------------------------------------- measure and size

  let canvas;
  function measure(text, size, font, weight = "normal") {
    canvas ??= document.createElement("canvas").getContext("2d");
    canvas.font = `${weight} ${size}px ${font}`;
    const rows = text.split(/<br\s*\/?>/i);
    return { rows, width: Math.max(...rows.map((row) => canvas.measureText(row).width)), height: rows.length * size * 1.3 };
  }

  function roleOf(item) {
    if (item.cls) return item.cls;
    if (item.shape === "diamond") return "decision";
    if (item.shape === "cylinder") return "store";
    if (item.shape === "parallelogram") return "io";
    return "action";
  }

  function sizeNode(item, theme) {
    const text = measure(item.text, theme.fontSize, theme.font, item.role === "startEnd" ? "bold" : "normal");
    item.rows = text.rows;
    const padX = 16;
    const padY = 8;
    let width = text.width + padX * 2;
    let height = text.height + padY * 2;
    if (item.shape === "diamond") {
      // the text box w x h fits in a diamond W x H when w/W + h/H <= 1; H = W / 2 keeps it flat
      const w = text.width + 12;
      const h = text.height + 8;
      width = w + 2 * h;
      height = width / 2;
    } else if (item.shape === "stadium") width += height / 2;
    else if (item.shape === "parallelogram") width += 28;
    else if (item.shape === "cylinder") height += 14;
    item.width = Math.max(snap(width), 96);
    item.height = Math.max(snap(height), 40);
    if (item.shape === "diamond") item.height = Math.max(snap(item.width / 2), 56);
  }

  // ---------------------------------------------------------------- layout

  const FORWARD = { TB: "S", BT: "N", LR: "E", RL: "W" };
  const BACKWARD = { TB: "N", BT: "S", LR: "W", RL: "E" };
  const ELK_DIRECTION = { TB: "DOWN", BT: "UP", LR: "RIGHT", RL: "LEFT" };
  const ELK_SIDE = { N: "NORTH", S: "SOUTH", E: "EAST", W: "WEST" };

  function baseOptions(direction) {
    return {
      "elk.algorithm": "layered",
      "elk.direction": ELK_DIRECTION[direction],
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
      "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
      "elk.layered.cycleBreaking.strategy": "MODEL_ORDER",
      "elk.spacing.nodeNode": "32",
      "elk.layered.spacing.nodeNodeBetweenLayers": "40",
      "elk.spacing.edgeNode": "24",
      "elk.spacing.edgeEdge": "16",
      "elk.layered.spacing.edgeNodeBetweenLayers": "20",
      "elk.layered.spacing.edgeEdgeBetweenLayers": "14",
      "elk.spacing.portPort": "16",
      "elk.layered.mergeEdges": "false",
      "elk.padding": "[top=16,left=16,bottom=16,right=16]",
    };
  }

  function elkGraph(graph, theme, sides) {
    const children = [...graph.nodes.values()].map((item) => {
      const child = { id: item.id, width: item.width, height: item.height, layoutOptions: {} };
      if (sides) {
        const ports = [];
        if (item.shape === "diamond") {
          child.layoutOptions["elk.portConstraints"] = "FIXED_POS";
          const tips = { N: [item.width / 2, 0], S: [item.width / 2, item.height], E: [item.width, item.height / 2], W: [0, item.height / 2] };
          for (const side of Object.keys(tips)) ports.push({ id: `${item.id}.${side}`, x: tips[side][0], y: tips[side][1], width: 0, height: 0, layoutOptions: { "elk.port.side": ELK_SIDE[side] } });
        } else {
          child.layoutOptions["elk.portConstraints"] = "FIXED_SIDE";
          for (const edge of graph.edges) {
            if (edge.from === item.id && sides[edge.id].kind !== "forward") ports.push({ id: `${edge.id}.out`, width: 0, height: 0, layoutOptions: { "elk.port.side": ELK_SIDE[sides[edge.id].from] } });
            if (edge.to === item.id && sides[edge.id].kind !== "forward") ports.push({ id: `${edge.id}.in`, width: 0, height: 0, layoutOptions: { "elk.port.side": ELK_SIDE[sides[edge.id].to] } });
          }
          if (graph.edges.some((edge) => edge.from === item.id && sides[edge.id].kind === "forward")) ports.push({ id: `${item.id}.fork`, width: 0, height: 0, layoutOptions: { "elk.port.side": ELK_SIDE[FORWARD[graph.direction]] } });
          if (graph.edges.some((edge) => edge.to === item.id && sides[edge.id].kind === "forward")) ports.push({ id: `${item.id}.merge`, width: 0, height: 0, layoutOptions: { "elk.port.side": ELK_SIDE[BACKWARD[graph.direction]] } });
        }
        child.ports = ports;
      }
      return child;
    });
    const edges = graph.edges.map((edge) => {
      const fromNode = graph.nodes.get(edge.from);
      const toNode = graph.nodes.get(edge.to);
      const source = sides ? (fromNode.shape === "diamond" ? `${edge.from}.${sides[edge.id].from}` : sides[edge.id].kind === "forward" ? `${edge.from}.fork` : `${edge.id}.out`) : edge.from;
      const target = sides ? (toNode.shape === "diamond" ? `${edge.to}.${sides[edge.id].to}` : sides[edge.id].kind === "forward" ? `${edge.to}.merge` : `${edge.id}.in`) : edge.to;
      const out = { id: edge.id, sources: [source], targets: [target], layoutOptions: {} };
      if (edge.label) {
        const text = measure(edge.label, theme.labelFontSize, theme.font, "bold");
        edge.labelRows = text.rows;
        edge.labelSize = { width: Math.ceil(text.width + 8), height: Math.ceil(text.height + 2) };
      }
      return out;
    });
    return { id: "root", layoutOptions: baseOptions(graph.direction), children, edges };
  }

  /** The side of each end of each line, from where pass 1 put the nodes. */
  function chooseSides(graph, placed) {
    const box = (id) => {
      const child = placed.children.find((item) => item.id === id);
      return { x: child.x, y: child.y, w: child.width, h: child.height, cx: child.x + child.width / 2, cy: child.y + child.height / 2 };
    };
    const vertical = graph.direction === "TB" || graph.direction === "BT";
    const forward = FORWARD[graph.direction];
    const backward = BACKWARD[graph.direction];
    // along: where a box starts and ends on the flow axis (TB and LR only); across: its middle on the other axis
    const across = (b) => (vertical ? b.cx : b.cy);
    const lateral = (delta) => (vertical ? (delta >= 0 ? "E" : "W") : delta >= 0 ? "S" : "N");
    const opposite = { N: "S", S: "N", E: "W", W: "E" };

    const middle = vertical ? placed.width / 2 : placed.height / 2;
    const sides = {};
    for (const edge of graph.edges) {
      const s = box(edge.from);
      const t = box(edge.to);
      const delta = across(t) - across(s);
      // forward or back as ELK breaks the cycles (MODEL_ORDER): a line to a node declared later goes forward
      const order = (id) => graph.nodes.get(id).order;
      // a dotted line (a side note: upload, files) leaves on its own side tip, apart from the solid fork
      if (edge.style === "dotted" && order(edge.to) > order(edge.from)) sides[edge.id] = { from: lateral(1), to: backward, kind: "note", delta };
      else if (order(edge.to) > order(edge.from)) sides[edge.id] = { from: forward, to: backward, kind: "forward", delta };
      else {
        // a line back: out and in on the same side, the side where the source lies (the outer side when straight below)
        const side = Math.abs(delta) < 4 ? lateral(across(s) < middle ? -1 : 1) : lateral(-delta);
        sides[edge.id] = { from: side, to: side, kind: "back", delta };
      }
    }

    // a decision: one tip per line. The forward line nearest to straight on keeps the forward tip, the other branches take the
    // side tips toward their targets; lines that come in use the backward tip, else a free tip.
    for (const item of graph.nodes.values()) {
      if (item.shape !== "diamond") continue;
      const outs = graph.edges.filter((edge) => edge.from === item.id);
      const ins = graph.edges.filter((edge) => edge.to === item.id);
      const used = new Set();
      const take = (wanted, fallbacks) => {
        for (const side of [wanted, ...fallbacks]) if (!used.has(side)) return used.add(side), side;
        return wanted;
      };
      const ranked = [...outs].sort((a, b) => Math.abs(sides[a.id].delta) - Math.abs(sides[b.id].delta));
      const forwardOuts = ranked.filter((edge) => sides[edge.id].kind === "forward");
      if (forwardOuts.length) sides[forwardOuts[0].id].from = take(forward, []);
      for (const edge of ranked) {
        if (edge === forwardOuts[0]) continue;
        const want = sides[edge.id].kind === "back" ? sides[edge.id].from : lateral(sides[edge.id].delta === 0 ? 1 : sides[edge.id].delta);
        sides[edge.id].from = take(want, [opposite[want], forward]);
        // the target end of a side branch going forward still enters from the top
      }
      used.add(backward);
      for (const edge of ins) {
        const current = sides[edge.id].to;
        sides[edge.id].to = current === backward || !["N", "S", "E", "W"].includes(current) ? backward : used.has(current) ? backward : current;
      }
    }
    return sides;
  }

  // ---------------------------------------------------------------- draw

  const esc = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  function roundedPath(points, radius = 8) {
    let d = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length - 1; i += 1) {
      const [a, b, c] = [points[i - 1], points[i], points[i + 1]];
      const lenIn = Math.hypot(b.x - a.x, b.y - a.y);
      const lenOut = Math.hypot(c.x - b.x, c.y - b.y);
      const r = Math.min(radius, lenIn / 2, lenOut / 2);
      if (r < 0.5) {
        d += ` L${b.x},${b.y}`;
        continue;
      }
      const p1 = { x: b.x - ((b.x - a.x) / lenIn) * r, y: b.y - ((b.y - a.y) / lenIn) * r };
      const p2 = { x: b.x + ((c.x - b.x) / lenOut) * r, y: b.y + ((c.y - b.y) / lenOut) * r };
      d += ` L${p1.x},${p1.y} Q${b.x},${b.y} ${p2.x},${p2.y}`;
    }
    const last = points[points.length - 1];
    return `${d} L${last.x},${last.y}`;
  }

  function shapeSvg(item, colors) {
    const { x, y, width: w, height: h } = item;
    const attrs = `fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="${colors.strokeWidth}"`;
    switch (item.shape) {
      case "diamond":
        return `<polygon points="${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}" ${attrs} stroke-linejoin="round"/>`;
      case "stadium":
      case "circle":
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" ${attrs}/>`;
      case "parallelogram":
        return `<polygon points="${x + 14},${y} ${x + w},${y} ${x + w - 14},${y + h} ${x},${y + h}" ${attrs}/>`;
      case "cylinder":
        return `<path d="M${x},${y + 7} A${w / 2},7 0 0 1 ${x + w},${y + 7} L${x + w},${y + h - 7} A${w / 2},7 0 0 1 ${x},${y + h - 7} Z M${x},${y + 7} A${w / 2},7 0 0 0 ${x + w},${y + 7}" ${attrs}/>`;
      case "subroutine":
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" ${attrs}/><path d="M${x + 8},${y} V${y + h} M${x + w - 8},${y} V${y + h}" fill="none" stroke="${colors.stroke}" stroke-width="${colors.strokeWidth}"/>`;
      default:
        return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" ${attrs}/>`;
    }
  }

  function textSvg(rows, cx, cy, size, color, font, weight) {
    const lh = size * 1.3;
    const top = cy - ((rows.length - 1) * lh) / 2;
    return rows
      .map((row, i) => `<text x="${cx}" y="${top + i * lh}" font-family="${esc(font)}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="middle" dominant-baseline="central">${esc(row)}</text>`)
      .join("");
  }

  const resolveRole = (theme, role) => {
    let value = theme.roles[role] ?? theme.roles.action;
    while (typeof value === "string") value = theme.roles[value];
    return value;
  };

  // ---------------------------------------------------------------- check

  function check(nodes, edges, labels) {
    const issues = [];
    const inside = (seg, b) => {
      const pad = 2;
      const [x1, x2] = [Math.min(seg.a.x, seg.b.x), Math.max(seg.a.x, seg.b.x)];
      const [y1, y2] = [Math.min(seg.a.y, seg.b.y), Math.max(seg.a.y, seg.b.y)];
      return x2 > b.x + pad && x1 < b.x + b.width - pad && y2 > b.y + pad && y1 < b.y + b.height - pad;
    };
    const segs = edges.flatMap((edge) => edge.points.slice(1).map((p, i) => ({ edge, a: edge.points[i], b: p })));
    for (const seg of segs) for (const n of nodes) if (inside(seg, n)) issues.push(`line ${seg.edge.from}->${seg.edge.to} crosses node ${n.id}`);
    const overlap = (a, b) => a.x < b.x + b.width - 1 && b.x < a.x + a.width - 1 && a.y < b.y + b.height - 1 && b.y < a.y + a.height - 1;
    for (const label of labels) {
      for (const n of nodes) if (overlap(label, n)) issues.push(`label "${label.text}" overlaps node ${n.id}`);
      for (const other of labels) if (other !== label && other.text < label.text && overlap(label, other)) issues.push(`labels "${label.text}" and "${other.text}" overlap`);
    }
    // two lines on top of each other (same axis, overlapping range), unless they meet at the same end point (a merge)
    let crossings = 0;
    for (let i = 0; i < segs.length; i += 1) {
      for (let j = i + 1; j < segs.length; j += 1) {
        const [p, q] = [segs[i], segs[j]];
        if (p.edge === q.edge) continue;
        const pv = p.a.x === p.b.x;
        const qv = q.a.x === q.b.x;
        if (pv === qv) {
          const fixedP = pv ? p.a.x : p.a.y;
          const fixedQ = qv ? q.a.x : q.a.y;
          if (Math.abs(fixedP - fixedQ) > 1) continue;
          const [p1, p2] = (pv ? [p.a.y, p.b.y] : [p.a.x, p.b.x]).sort((m, n) => m - n);
          const [q1, q2] = (qv ? [q.a.y, q.b.y] : [q.a.x, q.b.x]).sort((m, n) => m - n);
          const shared = Math.min(p2, q2) - Math.max(p1, q1);
          const sameEnd = p.edge.to === q.edge.to || p.edge.from === q.edge.from;
          if (shared > 2 && !sameEnd) issues.push(`lines ${p.edge.from}->${p.edge.to} and ${q.edge.from}->${q.edge.to} run on top of each other`);
        } else {
          const v = pv ? p : q;
          const hz = pv ? q : p;
          const [vy1, vy2] = [Math.min(v.a.y, v.b.y), Math.max(v.a.y, v.b.y)];
          const [hx1, hx2] = [Math.min(hz.a.x, hz.b.x), Math.max(hz.a.x, hz.b.x)];
          if (v.a.x > hx1 + 1 && v.a.x < hx2 - 1 && hz.a.y > vy1 + 1 && hz.a.y < vy2 - 1) crossings += 1;
        }
      }
    }
    // arrowheads into one node that nearly touch
    const heads = edges.filter((edge) => edge.arrow).map((edge) => ({ edge, p: edge.points[edge.points.length - 1] }));
    for (let i = 0; i < heads.length; i += 1)
      for (let j = i + 1; j < heads.length; j += 1) {
        const d = Math.hypot(heads[i].p.x - heads[j].p.x, heads[i].p.y - heads[j].p.y);
        if (d > 0.5 && d < 12) issues.push(`arrowheads of ${heads[i].edge.from}->${heads[i].edge.to} and ${heads[j].edge.from}->${heads[j].edge.to} touch`);
      }
    return { issues, crossings };
  }

  /**
   * The label of a line next to where it starts (a condition reads at its decision): beside the first segment, on the first side
   * where it touches no box, no other label and no other line.
   */
  function placeLabels(nodes, edges) {
    const placed = [];
    const hits = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    const segs = edges.flatMap((edge) => edge.points.slice(1).map((p, i) => ({ edge, i, a: edge.points[i], b: p })));
    const crossesLine = (box, own) =>
      segs.some((seg) => !(seg.edge === own && seg.i === 0) && hits(box, { x: Math.min(seg.a.x, seg.b.x) - 1, y: Math.min(seg.a.y, seg.b.y) - 1, width: Math.abs(seg.a.x - seg.b.x) + 2, height: Math.abs(seg.a.y - seg.b.y) + 2 }));
    for (const edge of edges.filter((item) => item.label)) {
      const [p0, p1] = edge.points;
      const { width: w, height: h } = edge.labelSize;
      const gap = 5;
      const candidates = [];
      if (p0.x === p1.x) {
        const down = p1.y > p0.y;
        const y = down ? p0.y + gap : p0.y - gap - h;
        const y2 = down ? Math.max(p0.y + gap, Math.min((p0.y + p1.y) / 2 - h / 2, p0.y + 24)) : y;
        candidates.push({ x: p0.x + gap, y }, { x: p0.x - gap - w, y }, { x: p0.x + gap, y: y2 }, { x: p0.x - gap - w, y: y2 });
      } else {
        const right = p1.x > p0.x;
        const x = right ? p0.x + gap + 2 : p0.x - gap - 2 - w;
        candidates.push({ x, y: p0.y - gap + 1 - h }, { x, y: p0.y + gap - 1 });
      }
      const fits = (box) => !nodes.some((n) => hits(box, n)) && !placed.some((other) => hits(box, other)) && !crossesLine(box, edge);
      const choice = candidates.map((c) => ({ ...c, width: w, height: h })).find(fits) ?? { ...candidates[0], width: w, height: h };
      placed.push({ text: edge.label, rows: edge.labelRows, ...choice });
    }
    return placed;
  }

  // ---------------------------------------------------------------- tree (sitemap)

  /**
   * A chart marked `%% layout: tree` is drawn as a sitemap: the root as a banner over the whole width, the children of a node in
   * one row under a shared horizontal bus line, siblings of one level on one baseline; a node with three or more children that are
   * all leaves stacks them in a column on a shared vertical line. No arrowheads.
   */
  function renderTree(code, theme) {
    const graph = parse(code);
    const kids = new Map([...graph.nodes.keys()].map((id) => [id, []]));
    const hasParent = new Set();
    for (const edge of graph.edges) {
      kids.get(edge.from).push(edge.to);
      hasParent.add(edge.to);
    }
    const rootId = [...graph.nodes.keys()].find((id) => !hasParent.has(id));
    const H_GAP = 16;
    const V_GAP = 40;
    const INDENT = 24;
    const STACK_GAP = 14;
    for (const item of graph.nodes.values()) {
      item.role = roleOf(item);
      sizeNode(item, theme);
      item.width = Math.max(item.width, 112);
    }
    const node = (id) => graph.nodes.get(id);
    const stacked = (id) => kids.get(id).length >= 2 && kids.get(id).every((child) => kids.get(child).length === 0);
    const span = new Map();
    const measureSpan = (id) => {
      const item = node(id);
      let width;
      if (!kids.get(id).length) width = item.width;
      else if (stacked(id)) width = Math.max(item.width, INDENT + Math.max(...kids.get(id).map((child) => node(child).width)));
      else {
        const parts = kids.get(id).map(measureSpan);
        width = Math.max(item.width, parts.reduce((sum, part) => sum + part, 0) + H_GAP * (parts.length - 1));
      }
      span.set(id, width);
      return width;
    };
    const total = measureSpan(rootId);
    // rows: the height of a level is its tallest node that is not in a stacked column
    const depthOf = new Map([[rootId, 0]]);
    const inStack = new Set();
    const walk = (id) => {
      for (const child of kids.get(id)) {
        depthOf.set(child, depthOf.get(id) + 1);
        if (stacked(id)) inStack.add(child);
        walk(child);
      }
    };
    walk(rootId);
    const rowHeight = [];
    for (const [id, depth] of depthOf) if (!inStack.has(id)) rowHeight[depth] = Math.max(rowHeight[depth] ?? 0, node(id).height);
    const rowY = [];
    rowHeight.reduce((y, height, depth) => ((rowY[depth] = y), y + height + V_GAP), 16);
    const place = (id, left) => {
      const item = node(id);
      const room = span.get(id);
      item.x = left + (room - item.width) / 2;
      item.y = rowY[depthOf.get(id)];
      item.height = rowHeight[depthOf.get(id)];
      if (stacked(id)) {
        item.x = left;
        let y = item.y + item.height + STACK_GAP;
        for (const child of kids.get(id)) {
          const c = node(child);
          c.x = left + INDENT;
          c.y = y;
          y += c.height + STACK_GAP;
        }
        return;
      }
      let at = left + (room - (kids.get(id).reduce((sum, child) => sum + span.get(child), 0) + H_GAP * (kids.get(id).length - 1))) / 2;
      for (const child of kids.get(id)) {
        place(child, at);
        at += span.get(child) + H_GAP;
      }
    };
    place(rootId, 16);
    const root = node(rootId);
    root.x = 16;
    root.width = total;

    const edges = graph.edges.map((edge) => {
      const parent = node(edge.from);
      const child = node(edge.to);
      if (stacked(edge.from)) {
        const x = parent.x + INDENT / 2;
        edge.points = [{ x, y: parent.y + parent.height }, { x, y: child.y + child.height / 2 }, { x: child.x, y: child.y + child.height / 2 }];
      } else {
        const px = parent.x + parent.width / 2;
        const cx = child.x + child.width / 2;
        const bus = child.y - V_GAP / 2;
        edge.points = Math.abs(px - cx) < 0.5 ? [{ x: px, y: parent.y + parent.height }, { x: cx, y: child.y }] : [{ x: px, y: parent.y + parent.height }, { x: px, y: bus }, { x: cx, y: bus }, { x: cx, y: child.y }];
      }
      edge.arrow = false;
      return edge;
    });
    const nodes = [...graph.nodes.values()];
    const { connector } = theme;
    const parts = [];
    for (const edge of edges) parts.push(`<path d="${roundedPath(edge.points)}" fill="none" stroke="${connector.stroke}" stroke-width="${connector.strokeWidth}" stroke-linejoin="round"/>`);
    for (const item of nodes) {
      const colors = resolveRole(theme, item.role);
      parts.push(shapeSvg(item, colors));
      parts.push(textSvg(item.rows, item.x + item.width / 2, item.y + item.height / 2, theme.fontSize, colors.text, theme.font, item.role === "startEnd" ? "bold" : "normal"));
    }
    const width = Math.ceil(total + 32);
    const height = Math.ceil(Math.max(...nodes.map((item) => item.y + item.height)) + 16);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#ffffff"/>${parts.join("")}</svg>`;
    return { svg, width, height, ...check(nodes, edges, []) };
  }

  // ---------------------------------------------------------------- main

  window.renderFlowchart = async (code, theme) => {
    if (/^\s*%%\s*layout:\s*tree/m.test(code)) return renderTree(code, theme);
    const graph = parse(code);
    for (const item of graph.nodes.values()) {
      item.role = roleOf(item);
      sizeNode(item, theme);
    }
    const elk = new ELK();
    const first = await elk.layout(elkGraph(graph, theme, null));
    const sides = chooseSides(graph, first);
    const done = await elk.layout(elkGraph(graph, theme, sides));

    const nodes = done.children.map((child) => Object.assign(graph.nodes.get(child.id), { x: child.x, y: child.y }));
    const edges = done.edges.map((laid) => {
      const edge = graph.edges.find((item) => item.id === laid.id);
      const section = laid.sections[0];
      edge.points = [section.startPoint, ...(section.bendPoints ?? []), section.endPoint].map((p) => ({ x: Math.round(p.x * 2) / 2, y: Math.round(p.y * 2) / 2 }));
      return edge;
    });
    const labels = placeLabels(nodes, edges);

    const { connector } = theme;
    const parts = [];
    parts.push(`<defs><marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto"><path d="M0,0.5 L10,5 L0,9.5 Z" fill="${connector.stroke}"/></marker></defs>`);
    for (const edge of edges) {
      const dash = edge.style === "dotted" ? ' stroke-dasharray="5 4"' : "";
      const width = edge.style === "thick" ? connector.strokeWidth * 2 : connector.strokeWidth;
      parts.push(`<path d="${roundedPath(edge.points)}" fill="none" stroke="${connector.stroke}" stroke-width="${width}"${dash} stroke-linejoin="round"${edge.arrow ? ' marker-end="url(#arrow)"' : ""}/>`);
    }
    for (const item of nodes) {
      const colors = resolveRole(theme, item.role);
      parts.push(shapeSvg(item, colors));
      parts.push(textSvg(item.rows, item.x + item.width / 2, item.y + item.height / 2, theme.fontSize, colors.text, theme.font, item.role === "startEnd" ? "bold" : "normal"));
    }
    for (const label of labels) {
      parts.push(`<rect x="${label.x}" y="${label.y}" width="${label.width}" height="${label.height}" rx="3" fill="${connector.labelBackground}"/>`);
      parts.push(textSvg(label.rows, label.x + label.width / 2, label.y + label.height / 2, theme.labelFontSize, connector.labelText, theme.font, "bold"));
    }
    const width = Math.ceil(done.width);
    const height = Math.ceil(done.height);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#ffffff"/>${parts.join("")}</svg>`;
    return { svg, width, height, ...check(nodes, edges, labels) };
  };
})();
