// Chart colour, as parameters rather than taste.
//
// Every value here was checked with the data-viz validator against this site's
// own paper surface (#edeced), not chosen by eye:
//
//   8 slots, adjacent pairs : PASS  (worst CVD dE 9.1, normal-vision dE 19.6)
//   first 3, --pairs all    : PASS  (CVD dE 9.2, normal-vision dE 24.0)
//   contrast                : WARN  -> relief required, satisfied by the table
//                                     view and direct labels, both of which ship
//
// Consequences that must not be quietly undone:
//   * Slot ORDER is the colourblind-safety mechanism, not decoration. Assign in
//     order, never cycle, never generate a ninth hue.
//   * Forms where every pair can appear together (scatter, bubble, small
//     multiples) cap at THREE series. Past that, fold to "Other" or facet.
//   * Sequential is one hue light-to-dark. Diverging is two hues with a GRAY
//     midpoint — never a rainbow, never a hue in the middle.

export const SURFACE = { light: "#edeced", dark: "#1a1a19" };

export const TEXT = {
  light: { primary: "#0b0b0b", secondary: "#52514e", muted: "#6f6e6a" },
  dark: { primary: "#ffffff", secondary: "#c3c2b7", muted: "#9b9a92" },
};

export const GRID = { light: "#d8d7d4", dark: "#333330" };

/** Fixed order. Assign by index; never cycle. */
export const CATEGORICAL = {
  light: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"],
  dark: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
};

/** One hue, light to dark. Magnitude only. */
export const SEQUENTIAL = {
  light: ["#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7", "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281", "#0d366b"],
  dark: ["#0d366b", "#104281", "#184f95", "#1c5cab", "#256abf", "#2a78d6", "#3987e5", "#5598e7", "#6da7ec", "#86b6ef", "#9ec5f4", "#b7d3f6", "#cde2fb"],
};

/** Blue <-> red with a neutral gray middle. Polarity only. */
export const DIVERGING = {
  light: { low: "#2a78d6", mid: "#f0efec", high: "#e34948" },
  dark: { low: "#3987e5", mid: "#383835", high: "#e66767" },
};

/** Forms where any two series can end up adjacent on screen. */
export const ALL_PAIRS_SERIES_CAP = 3;

export const PALETTES = [
  { id: "categorical", label: "Categorical", note: "Distinct series" },
  { id: "sequential", label: "Sequential", note: "One hue, more is darker" },
  { id: "diverging", label: "Diverging", note: "Above and below a midpoint" },
];

export function seriesColor(index, mode = "light") {
  const slots = CATEGORICAL[mode];
  // Deliberately clamped rather than wrapped: a ninth generated hue is
  // indistinguishable from an existing one under colour-vision deficiency.
  return slots[Math.min(index, slots.length - 1)];
}

/** Sample the sequential ramp at t in [0,1]. */
export function sequentialColor(t, mode = "light") {
  const ramp = SEQUENTIAL[mode];
  const clamped = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));
  return ramp[Math.round(clamped * (ramp.length - 1))];
}

/**
 * Sample the diverging scale at v in [-1,1]. Interpolates through the neutral
 * midpoint so zero reads as "nothing", which is the whole point of the form.
 */
export function divergingColor(v, mode = "light") {
  const { low, mid, high } = DIVERGING[mode];
  const t = Math.max(-1, Math.min(1, Number.isFinite(v) ? v : 0));
  return t < 0 ? mix(mid, low, -t) : mix(mid, high, t);
}

function mix(a, b, t) {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  const k = Math.max(0, Math.min(1, t));
  return rgbToHex(
    Math.round(pa[0] + (pb[0] - pa[0]) * k),
    Math.round(pa[1] + (pb[1] - pa[1]) * k),
    Math.round(pa[2] + (pb[2] - pa[2]) * k)
  );
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

/** Everything a renderer or code generator needs for one mode. */
export function theme(mode = "light") {
  return {
    mode,
    surface: SURFACE[mode],
    text: TEXT[mode],
    grid: GRID[mode],
    categorical: CATEGORICAL[mode],
    sequential: SEQUENTIAL[mode],
    diverging: DIVERGING[mode],
  };
}
