// Charts drawn as inline SVG.
//
// Deliberately dependency-free: a charting library would be a megabyte of
// download on a page that already asks the visitor for a gigabyte of model
// weights. These are simple, themed, and computed from real values.

const INK = "#070807";
const ACID = "#f0fd71";
const LINE = "rgba(7,8,7,0.28)";

const W = 640;
const H = 320;
const PAD = { top: 16, right: 16, bottom: 46, left: 56 };

export function renderChart(spec, table) {
  if (spec.kind === "histogram") return histogram(spec, table);
  if (spec.kind === "bar") return bar(spec, table);
  if (spec.kind === "scatter") return scatter(spec, table);
  return "";
}

function numbers(table, name) {
  return table.rows
    .map((r) => Number.parseFloat(String(r[name]).replace(/[\s,_]/g, "")))
    .filter(Number.isFinite);
}

function frame(title, body, xLabel, yLabel) {
  return `<figure class="ml-chart">
  <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeAttr(title)}" preserveAspectRatio="xMidYMid meet">
    <rect x="0" y="0" width="${W}" height="${H}" fill="none"></rect>
    ${body}
    <line x1="${PAD.left}" y1="${H - PAD.bottom}" x2="${W - PAD.right}" y2="${H - PAD.bottom}" stroke="${INK}" stroke-width="1"></line>
    <line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${H - PAD.bottom}" stroke="${INK}" stroke-width="1"></line>
    <text x="${W / 2}" y="${H - 10}" text-anchor="middle" font-size="11" fill="${INK}">${escapeText(xLabel)}</text>
    <text x="14" y="${H / 2}" text-anchor="middle" font-size="11" fill="${INK}" transform="rotate(-90 14 ${H / 2})">${escapeText(yLabel)}</text>
  </svg>
  <figcaption>${escapeText(title)}</figcaption>
</figure>`;
}

function histogram(spec, table) {
  const values = numbers(table, spec.x);
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return "";

  const binCount = Math.min(20, Math.max(5, Math.ceil(Math.sqrt(values.length))));
  const width = (max - min) / binCount;
  const bins = new Array(binCount).fill(0);
  values.forEach((v) => {
    const i = Math.min(binCount - 1, Math.floor((v - min) / width));
    bins[i] += 1;
  });

  const peak = Math.max(...bins);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const barW = plotW / binCount;

  const bars = bins
    .map((count, i) => {
      const h = (count / peak) * plotH;
      const x = PAD.left + i * barW;
      const y = H - PAD.bottom - h;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(barW - 1.5).toFixed(1)}" height="${h.toFixed(1)}" fill="${ACID}" stroke="${INK}" stroke-width="1"><title>${count} rows</title></rect>`;
    })
    .join("");

  const ticks = axisTicks(min, max)
    .map((t) => {
      const x = PAD.left + ((t - min) / (max - min)) * plotW;
      return `<text x="${x.toFixed(1)}" y="${H - PAD.bottom + 16}" text-anchor="middle" font-size="10" fill="${INK}">${fmt(t)}</text>`;
    })
    .join("");

  return frame(`Distribution of ${spec.x}`, bars + ticks, spec.x, "Rows");
}

function bar(spec, table) {
  const counts = new Map();
  table.rows.forEach((r) => {
    const v = String(r[spec.x] ?? "").trim();
    if (v) counts.set(v, (counts.get(v) || 0) + 1);
  });
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  if (!top.length) return "";

  const peak = top[0][1];
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const barW = plotW / top.length;

  const bars = top
    .map(([label, count], i) => {
      const h = (count / peak) * plotH;
      const x = PAD.left + i * barW;
      const y = H - PAD.bottom - h;
      const short = label.length > 10 ? `${label.slice(0, 9)}…` : label;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(barW - 4).toFixed(1)}" height="${h.toFixed(1)}" fill="${ACID}" stroke="${INK}" stroke-width="1"><title>${escapeAttr(label)}: ${count}</title></rect>
<text x="${(x + barW / 2 - 2).toFixed(1)}" y="${H - PAD.bottom + 15}" text-anchor="end" font-size="9" fill="${INK}" transform="rotate(-40 ${(x + barW / 2 - 2).toFixed(1)} ${H - PAD.bottom + 15})">${escapeText(short)}</text>`;
    })
    .join("");

  return frame(`${spec.x} by count`, bars, spec.x, "Rows");
}

function scatter(spec, table) {
  if (!spec.y) return "";
  const pairs = [];
  table.rows.forEach((r) => {
    const x = Number.parseFloat(String(r[spec.x]).replace(/[\s,_]/g, ""));
    const y = Number.parseFloat(String(r[spec.y]).replace(/[\s,_]/g, ""));
    if (Number.isFinite(x) && Number.isFinite(y)) pairs.push([x, y]);
  });
  if (pairs.length < 3) return "";

  const xs = pairs.map((p) => p[0]);
  const ys = pairs.map((p) => p[1]);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  if (xMin === xMax || yMin === yMax) return "";

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  // Cap drawn points; the SVG stays small and the shape is unchanged.
  const step = Math.max(1, Math.floor(pairs.length / 1200));

  const dots = pairs
    .filter((_, i) => i % step === 0)
    .map(([x, y]) => {
      const cx = PAD.left + ((x - xMin) / (xMax - xMin)) * plotW;
      const cy = H - PAD.bottom - ((y - yMin) / (yMax - yMin)) * plotH;
      return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="2.6" fill="none" stroke="${INK}" stroke-width="1" opacity="0.72"></circle>`;
    })
    .join("");

  const grid = axisTicks(yMin, yMax)
    .map((t) => {
      const y = H - PAD.bottom - ((t - yMin) / (yMax - yMin)) * plotH;
      return `<line x1="${PAD.left}" y1="${y.toFixed(1)}" x2="${W - PAD.right}" y2="${y.toFixed(1)}" stroke="${LINE}" stroke-width="0.5"></line>
<text x="${PAD.left - 8}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="10" fill="${INK}">${fmt(t)}</text>`;
    })
    .join("");

  return frame(`${spec.y} against ${spec.x}`, grid + dots, spec.x, spec.y);
}

function axisTicks(min, max, count = 4) {
  const out = [];
  for (let i = 0; i <= count; i += 1) out.push(min + ((max - min) * i) / count);
  return out;
}

function fmt(n) {
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  if (abs >= 10) return n.toFixed(0);
  return n.toFixed(2);
}

function escapeText(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s) {
  return escapeText(s).replace(/"/g, "&quot;");
}
