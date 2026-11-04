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

// Hilo rojo que recorre toda la página: sale del hilo de la portada, rodea el sello 結,
// baja por el centro de "Nuestra historia", cambia de lado y termina en el nudo de "Ata tu hilo"
const pageSvg = document.querySelector(".page-thread");
const pagePath = pageSvg.querySelector("path");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let pageLength = 0;
let pageSamples = [];
let pageReady = reduceMotion;

function box(selector) {
  const r = document.querySelector(selector).getBoundingClientRect();
  return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
}

// Curva en S de un lateral a otro
function cross(x1, y1, x2, y2) {
  const mid = (y1 + y2) / 2;
  return `C ${x1} ${mid} ${x2} ${mid} ${x2} ${y2}`;
}

function buildPageThread() {
  pageSvg.style.height = "0";
  const width = document.documentElement.clientWidth;
  const height = document.documentElement.scrollHeight;
  pageSvg.setAttribute("width", width);
  pageSvg.setAttribute("height", height);
  pageSvg.style.height = "";

  const margin = Math.max(12, Math.min(64, width * 0.05));
  const xL = margin;
  const xR = width - margin;

  const hero = box(".thread--hero");
  const start = { x: hero.x + hero.w * 395 / 400, y: hero.y + hero.h * 42 / 60 };
  const seal = box(".legend__mark");
  const r = seal.w / 2 + 14;
  const cx = seal.x + seal.w / 2;
  const cy = seal.y + seal.h / 2;
  const story = box(".story__thread");
  const sx = story.x + story.w / 2;
  const storyEnd = story.y + story.h;
  const centered = sx > width / 3;
  const finalKnot = box(".knot--final").y;
  const fecha = box("#fecha");
  const momentos = box("#momentos");
  const knot = box(".thread--rsvp");
  const end = { x: knot.x + knot.w * 5 / 120, y: knot.y + knot.h * 40 / 60 };

  pagePath.setAttribute("d", [
    `M ${start.x} ${start.y}`,
    `C ${start.x + 80} ${start.y} ${xR} ${start.y + 40} ${xR} ${start.y + 160}`,
    `L ${xR} ${cy - r - 160}`,
    `C ${xR} ${cy - r - 40} ${cx + 120} ${cy - r} ${cx} ${cy - r}`,
    `A ${r} ${r} 0 1 0 ${cx} ${cy + r}`,
    `A ${r} ${r} 0 1 0 ${cx} ${cy - r}`,
    `C ${cx - 120} ${cy - r} ${xL} ${cy - r + 40} ${xL} ${cy + 160}`,
    `L ${xL} ${story.y - 160}`,
    cross(xL, story.y - 160, sx, story.y),
    // En escritorio el hilo sale por el nudo final para no tachar su texto;
    // en móvil va por el lateral y puede bajar hasta el final de la historia
    ...(centered
      ? [`L ${sx} ${finalKnot}`, `C ${xR - 40} ${finalKnot} ${xR} ${finalKnot + 20} ${xR} ${finalKnot + 160}`]
      : [`L ${sx} ${storyEnd}`, cross(sx, storyEnd, xR, fecha.y + 60)]),
    `L ${xR} ${momentos.y - 20}`,
    cross(xR, momentos.y - 20, xL, momentos.y + 80),
    `L ${xL} ${end.y - 140}`,
    `C ${xL} ${end.y - 40} ${end.x - 100} ${end.y} ${end.x} ${end.y}`,
  ].join(" "));

  // Para cada tramo, la altura máxima alcanzada: así el hilo avanza al ritmo del scroll
  pageLength = pagePath.getTotalLength();
  pageSamples = [];
  let maxY = -Infinity;
  for (let l = 0; l <= pageLength; l += 8) {
    maxY = Math.max(maxY, pagePath.getPointAtLength(l).y);
    pageSamples.push([l, maxY]);
  }
  pagePath.style.strokeDasharray = pageLength;
  drawPageThread();
}

function drawPageThread() {
  let drawn = 0;
  if (pageReady) {
    const atBottom = scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
    const target = scrollY + innerHeight * 0.65;
    drawn = reduceMotion || atBottom ? pageLength : 0;
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
document.fonts.ready.then(queueRebuild);
window.addEventListener("load", queueRebuild);
window.addEventListener("resize", queueRebuild);
window.addEventListener("scroll", drawPageThread, { passive: true });
// Empieza a crecer cuando el hilo de la portada ya se ha dibujado
setTimeout(() => {
  pageReady = true;
  drawPageThread();
}, 2000);
