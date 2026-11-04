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
// Para conectarlo, rellena `action` y los `entry.` con los del enlace prellenado del Google Form.
const GOOGLE_FORM = {
  action: "", // https://docs.google.com/forms/d/e/<id>/formResponse
  fields: {
    name: "",
    attending: "",
    companion: "",
    allergies: "",
    song: "",
    message: "",
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
  if (event.target.name === "attending") rsvpMore.hidden = event.target.value !== COMING;
});

rsvpForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(rsvpForm);
  if (!data.get("name").trim() || !data.get("attending")) {
    rsvpError.textContent = "Dinos tu nombre y si vendrás, por favor.";
    rsvpError.hidden = false;
    return;
  }
  rsvpError.hidden = true;

  const button = rsvpForm.querySelector("button");
  button.disabled = true;
  try {
    if (formConnected) {
      const body = new URLSearchParams();
      for (const [key, entry] of Object.entries(GOOGLE_FORM.fields)) {
        if (entry && data.get(key)) body.append(entry, data.get(key));
      }
      // Google no permite leer la respuesta (no-cors): si la petición sale, damos el envío por bueno
      await fetch(GOOGLE_FORM.action, { method: "POST", mode: "no-cors", body });
    }
    showThanks(data.get("attending") === COMING, data.get("name").trim().split(" ")[0]);
  } catch {
    rsvpError.textContent = "No hemos podido enviarlo. Comprueba tu conexión e inténtalo de nuevo.";
    rsvpError.hidden = false;
    button.disabled = false;
  }
});

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
