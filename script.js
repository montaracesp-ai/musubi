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
