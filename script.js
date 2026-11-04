// Cuenta atrás hasta la fecha del <time id="wedding-date">
const target = new Date(document.getElementById("wedding-date").getAttribute("datetime"));
const els = {
  days: document.getElementById("cd-days"),
  hours: document.getElementById("cd-hours"),
  mins: document.getElementById("cd-mins"),
  secs: document.getElementById("cd-secs"),
};

function tick() {
  const diff = Math.max(0, target - Date.now());
  els.days.textContent = Math.floor(diff / 86400000);
  els.hours.textContent = Math.floor(diff / 3600000) % 24;
  els.mins.textContent = Math.floor(diff / 60000) % 60;
  els.secs.textContent = Math.floor(diff / 1000) % 60;
}

tick();
setInterval(tick, 1000);

// Los hilos se dibujan y los bloques aparecen al entrar en pantalla
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entry.target.classList.add(entry.target.matches(".thread") ? "is-drawn" : "is-visible");
    observer.unobserve(entry.target);
  }
}, { threshold: 0.25 });

document.querySelectorAll(".reveal, .thread").forEach((el) => observer.observe(el));

// Hilo rojo que recorre toda la página: dibuja el & de la portada, rodea el sello 結,
// baja por el centro de "Nuestra historia", pasa por detrás de "La hora mágica"
// y termina anudado en "Ata tu hilo"
const SVG_NS = "http://www.w3.org/2000/svg";
const pageSvg = document.querySelector(".page-thread");
const pagePath = pageSvg.querySelector("path");
const textMask = pageSvg.querySelector("#text-mask");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let pageLength = 0;
let ampLength = 0;
let pageSamples = [];
let pageReady = false;

// & de un solo trazo en una caja de 104×120: empieza en el remate derecho y acaba en la cola
const AMP = [
  [104, 66],
  [96, 66, 90, 72, 88, 80],
  [84, 100, 70, 118, 48, 118],
  [28, 118, 14, 102, 22, 82],
  [30, 62, 58, 50, 66, 36],
  [74, 22, 68, 6, 52, 6],
  [34, 6, 24, 26, 32, 48],
  [40, 70, 70, 100, 96, 120],
];

// Lo que el hilo difumina al pasar por detrás
const TEXT_SELECTOR = [
  ".hero__kicker", ".hero__tagline", ".hero__date", ".hero__place", ".countdown", ".btn",
  ".section__title", ".section__lead", ".legend__text", ".legend__note",
  ".knot__date", ".knot h3", ".knot p", ".cities", ".dates__item", ".card", ".faq", ".ph",
].join(", ");

function box(el) {
  if (typeof el === "string") el = document.querySelector(el);
  const r = el.getBoundingClientRect();
  return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
}

// Curva suave que pasa por todos los puntos. El primero y el último solo marcan
// la dirección de entrada y salida. Las tangentes se escalan con la distancia
// entre puntos para que no haya bucles ni giros bruscos.
function smoothCurve(points) {
  const dir = (i) => {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    return [(x1 - x0) / len, (y1 - y0) / len];
  };
  const out = [];
  for (let i = 1; i < points.length - 2; i++) {
    const [ax, ay] = points[i];
    const [bx, by] = points[i + 1];
    const d = Math.hypot(bx - ax, by - ay) / 3;
    const [tax, tay] = dir(i);
    const [tbx, tby] = dir(i + 1);
    out.push(`C ${ax + tax * d} ${ay + tay * d} ${bx - tbx * d} ${by - tby * d} ${bx} ${by}`);
  }
  return out.join(" ");
}

// Tramo por un lateral con un ligero vaivén
function sway(x, y1, y2, amplitude) {
  const steps = Math.max(1, Math.round(Math.abs(y2 - y1) / 380));
  const pts = [];
  for (let k = 1; k < steps; k++) {
    pts.push([x + (k % 2 ? amplitude : -amplitude), y1 + (y2 - y1) * k / steps]);
  }
  return pts;
}

function buildMask(width, height) {
  textMask.replaceChildren();
  textMask.setAttribute("x", 0);
  textMask.setAttribute("y", 0);
  textMask.setAttribute("width", width);
  textMask.setAttribute("height", height);
  const base = document.createElementNS(SVG_NS, "rect");
  base.setAttribute("width", width);
  base.setAttribute("height", height);
  base.setAttribute("fill", "#fff");
  textMask.append(base);
  const group = document.createElementNS(SVG_NS, "g");
  group.setAttribute("filter", "url(#fade-blur)");
  for (const el of document.querySelectorAll(TEXT_SELECTOR)) {
    const b = box(el);
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", b.x - 14);
    rect.setAttribute("y", b.y - 10);
    rect.setAttribute("width", b.w + 28);
    rect.setAttribute("height", b.h + 20);
    rect.setAttribute("fill", "#000");
    rect.setAttribute("fill-opacity", "0.85");
    group.append(rect);
  }
  textMask.append(group);
}

function buildPageThread() {
  pageSvg.style.height = "0";
  const width = document.documentElement.clientWidth;
  const height = document.documentElement.scrollHeight;
  pageSvg.setAttribute("width", width);
  pageSvg.setAttribute("height", height);
  pageSvg.style.height = "";

  const mobile = width < 720;
  const margin = Math.max(14, Math.min(64, width * 0.05));
  const xL = margin;
  const xR = width - margin;
  const amp = mobile ? 5 : 14;

  // El & ocupa el hueco del carácter del título
  const names = document.querySelector(".hero__names");
  const glyph = box(names.querySelector("span"));
  const fontSize = parseFloat(getComputedStyle(names).fontSize);
  const scale = (fontSize * 0.72) / 120;
  const ox = glyph.x + glyph.w / 2 - 52 * scale;
  const oy = glyph.y + glyph.h * 0.8 - 120 * scale;
  const pt = (x, y) => `${ox + x * scale} ${oy + y * scale}`;
  const ampD = `M ${pt(...AMP[0])} ` + AMP.slice(1)
    .map(([a, b, c, d, e, f]) => `C ${pt(a, b)} ${pt(c, d)} ${pt(e, f)}`).join(" ");
  const tail = [ox + 96 * scale, oy + 120 * scale];

  const namesBox = box(names);
  const hero = box(".hero");
  const seal = box(".legend__mark");
  const r = seal.w / 2 + 16;
  const cx = seal.x + seal.w / 2;
  const cy = seal.y + seal.h / 2;
  const story = box(".story__thread");
  const sx = story.x + story.w / 2;
  const finalKnot = box(".knot--final").y;
  const fecha = box("#fecha");
  const golden = box("#hora-magica");
  const knot = box(".thread--rsvp");
  const end = [knot.x + knot.w * 5 / 120, knot.y + knot.h * 40 / 60];

  const loop = [];
  for (let k = 0; k <= 8; k++) {
    const a = -Math.PI / 2 - k * Math.PI / 4;
    loop.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }

  const heroRight = hero.y + hero.h * 0.55;
  const leftStart = cy + (mobile ? 260 : 220);
  const afterStory = mobile ? fecha.y + 260 : finalKnot + 340;
  const goldenIn = golden.y + 60;
  const goldenOut = golden.y + golden.h - 60;

  const points = [
    [tail[0] - 26, tail[1] - 20],
    tail,
    [tail[0] + (mobile ? 30 : 90), namesBox.y + namesBox.h + 60],
    [xR, heroRight],
    ...sway(xR, heroRight, cy - r - 240, amp),
    [xR - amp, cy - r - 240],
    [cx + (mobile ? 90 : 180), cy - r - 30],
    ...loop,
    [cx - (mobile ? 90 : 180), cy - r + 10],
    [xL, leftStart],
    ...sway(xL, leftStart, story.y - 300, amp),
    [xL, story.y - 300],
    [sx, story.y],
    [sx, story.y + 80],
    ...(mobile
      ? [[sx, story.y + story.h - 80], [sx, story.y + story.h]]
      : [[sx, finalKnot - 80], [sx, finalKnot], [sx + 50, finalKnot + 70]]),
    [xR, afterStory],
    ...sway(xR, afterStory, goldenIn, amp),
    [xR, goldenIn],
    [xL, goldenOut],
    ...sway(xL, goldenOut, end[1] - 280, amp),
    [xL, end[1] - 280],
    [end[0] - 80, end[1] + 4],
    end,
    [end[0] + 30, end[1]],
  ];

  pagePath.setAttribute("d", `${ampD} ${smoothCurve(points)}`);

  // Longitud del & y, para el resto, la altura máxima alcanzada en cada punto:
  // así el hilo avanza al ritmo del scroll
  const ampOnly = document.createElementNS(SVG_NS, "path");
  ampOnly.setAttribute("d", ampD);
  ampLength = ampOnly.getTotalLength();
  pageLength = pagePath.getTotalLength();
  pageSamples = [];
  let maxY = -Infinity;
  for (let l = ampLength; l <= pageLength; l += 8) {
    maxY = Math.max(maxY, pagePath.getPointAtLength(l).y);
    pageSamples.push([l, maxY]);
  }
  pagePath.style.strokeDasharray = pageLength;

  buildMask(width, height);
  drawPageThread();
}

function drawPageThread() {
  let drawn = 0;
  if (pageReady) {
    const atBottom = scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
    const target = scrollY + innerHeight * 0.65;
    drawn = reduceMotion || atBottom ? pageLength : ampLength;
    for (const [l, y] of pageSamples) {
      if (drawn === pageLength || y > target) break;
      drawn = l;
    }
  }
  pagePath.style.strokeDashoffset = pageLength - drawn;
}

let rebuildQueued = false;
function queueRebuild() {
  if (rebuildQueued) return;
  rebuildQueued = true;
  requestAnimationFrame(() => {
    rebuildQueued = false;
    buildPageThread();
  });
}

buildPageThread();
window.addEventListener("load", queueRebuild);
window.addEventListener("resize", queueRebuild);
window.addEventListener("scroll", drawPageThread, { passive: true });

// Cuando cargan las fuentes, el hilo dibuja el & despacio y luego sigue al scroll
document.fonts.ready.then(() => {
  buildPageThread();
  pagePath.getBoundingClientRect();
  if (!reduceMotion) pagePath.style.transition = "stroke-dashoffset 2.4s ease-in-out";
  pageReady = true;
  drawPageThread();
  setTimeout(() => { pagePath.style.transition = ""; }, 2500);
});
