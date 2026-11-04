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

// El hilo de "Nuestra historia" avanza según el scroll
const line = document.querySelector(".story__line");

function updateThread() {
  const rect = line.getBoundingClientRect();
  const start = window.innerHeight * 0.6;
  const progress = Math.min(1, Math.max(0, (start - rect.top) / rect.height));
  line.style.setProperty("--progress", progress);
}

updateThread();
window.addEventListener("scroll", updateThread, { passive: true });
window.addEventListener("resize", updateThread);

// Confirmación de asistencia: el formulario es nuestro y las respuestas se envían a Google Forms.
// Los `entry.` son los de cada pregunta del Google Form «Boda Raul y Judy».
const GOOGLE_FORM = {
  action: "https://docs.google.com/forms/d/e/1FAIpQLSdvzsZ3WtdVsxKgQ8Y5VTc_XpWA7R-NsRNxOdOkuGQX3nAzCw/formResponse",
  fields: {
    name: "entry.473919416",
    attending: "entry.322437586",
    allergies: "entry.589030232",
    song: "entry.515396184",
    message: "entry.724771481",
  },
};

const rsvpForm = document.getElementById("rsvp-form");
const rsvpMore = rsvpForm.querySelector(".rsvp-form__more");
const rsvpError = rsvpForm.querySelector(".rsvp-form__error");
const rsvpThanks = document.getElementById("rsvp-thanks");
const formConnected = Boolean(GOOGLE_FORM.action);
const COMING = "Sí, allí estaré";

rsvpForm.querySelector(".rsvp-form__note").hidden = formConnected;

rsvpForm.addEventListener("change", (event) => {
  if (event.target.name !== "attending") return;
  const coming = event.target.value === COMING;
  rsvpMore.hidden = !coming;
  // Las alergias solo son obligatorias para quien viene
  rsvpForm.querySelector("[name=allergies]").required = coming;
});

rsvpForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(rsvpForm);
  if (!data.get("name").trim() || !data.get("attending")) {
    rsvpError.textContent = "Dinos tu nombre y si vendrás, por favor.";
    rsvpError.hidden = false;
    return;
  }
  if (data.get("attending") === COMING && !data.get("allergies").trim()) {
    rsvpError.textContent = "Cuéntanos si tienes alguna alergia, o escribe «Ninguna».";
    rsvpError.hidden = false;
    rsvpForm.querySelector("[name=allergies]").focus();
    return;
  }
  rsvpError.hidden = true;

  const button = rsvpForm.querySelector("button");
  button.disabled = true;
  try {
    if (formConnected) await sendToGoogle(data);
    showThanks(data.get("attending") === COMING, data.get("name").trim().split(" ")[0]);
  } catch {
    rsvpError.textContent = "No hemos podido enviarlo. Comprueba tu conexión e inténtalo de nuevo.";
    rsvpError.hidden = false;
    button.disabled = false;
  }
});

// Envío clásico de formulario a un iframe oculto: funciona en todos los navegadores
// (fetch con no-cors falla en silencio en algunos, sobre todo Safari en iPhone).
// Google no deja leer su respuesta, así que damos el envío por bueno cuando el iframe carga.
function sendToGoogle(data) {
  return new Promise((resolve) => {
    const name = `google-form-${Date.now()}`;
    const iframe = document.createElement("iframe");
    iframe.name = name;
    iframe.hidden = true;
    const form = document.createElement("form");
    form.action = GOOGLE_FORM.action;
    form.method = "POST";
    form.target = name;
    form.hidden = true;
    for (const [key, entry] of Object.entries(GOOGLE_FORM.fields)) {
      const value = (data.get(key) || "").trim();
      if (!value) continue;
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = entry;
      input.value = value;
      form.append(input);
    }
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      resolve();
      setTimeout(() => { iframe.remove(); form.remove(); }, 5000);
    };
    // El iframe vacío también dispara "load" al insertarse: solo vale cuando ya muestra la página de Google
    iframe.addEventListener("load", () => {
      try {
        if (iframe.contentWindow.location.href === "about:blank") return;
      } catch {
        // Otro origen (Google): el envío ha llegado
      }
      done();
    });
    setTimeout(done, 8000);
    document.body.append(iframe, form);
    form.submit();
  });
}

function showThanks(coming, firstName) {
  rsvpThanks.querySelector(".rsvp-thanks__title").textContent =
    coming ? `¡Hilo atado, ${firstName}!` : `Gracias, ${firstName}`;
  rsvpThanks.querySelector(".rsvp-thanks__text").textContent = coming
    ? "Ya formas parte de nuestro nudo. Nos vemos el 17 de julio."
    : "Te echaremos de menos. Gracias por decírnoslo.";
  rsvpForm.hidden = true;
  rsvpThanks.hidden = false;
  rsvpThanks.focus();
  requestAnimationFrame(() => rsvpThanks.querySelector(".thread").classList.add("is-drawn"));
}
