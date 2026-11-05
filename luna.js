// Luna de miel: el itinerario se publica cifrado (luna-de-miel.enc) y solo se descifra con la contraseña.
// Formato: salida de `openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -md sha256 -salt -base64` (ver _privado/cifrar-luna.sh).
const LUNA_STORAGE = "luna-de-miel";

async function unlockHoneymoon(password) {
  const response = await fetch("luna-de-miel.enc", { cache: "no-cache" });
  if (!response.ok) throw new Error("network");
  const bytes = Uint8Array.from(atob((await response.text()).trim()), (c) => c.charCodeAt(0));
  const salt = bytes.slice(8, 16); // tras la cabecera "Salted__"
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 200000 }, material, 384));
  const key = await crypto.subtle.importKey("raw", bits.slice(0, 32), "AES-CBC", false, ["decrypt"]);
  let html;
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-CBC", iv: bits.slice(32) }, key, bytes.slice(16));
    html = new TextDecoder().decode(plain);
  } catch {
    throw new Error("password");
  }
  if (!html.startsWith("<!--luna-->")) throw new Error("password");
  return html;
}

function rememberPassword(password) {
  try { sessionStorage.setItem(LUNA_STORAGE, password); } catch { /* sin almacenamiento: se pedirá otra vez */ }
}

function savedPassword() {
  try { return sessionStorage.getItem(LUNA_STORAGE); } catch { return null; }
}

// Formulario de contraseña (lo usan el diálogo de la portada y la propia página)
function wireLockForm(form, onUnlocked) {
  const error = form.querySelector(".lock__error");
  const button = form.querySelector("button[type=submit]");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = form.elements.password.value;
    if (!password) return;
    button.disabled = true;
    error.hidden = true;
    try {
      const html = await unlockHoneymoon(password);
      rememberPassword(password);
      onUnlocked(html);
    } catch (err) {
      error.textContent = err.message === "password"
        ? "Esa no es la contraseña. Inténtalo de nuevo."
        : "No hemos podido cargar la página. Revisa tu conexión.";
      error.hidden = false;
      form.elements.password.select();
    } finally {
      button.disabled = false;
    }
  });
}

// En la portada: la pestaña del menú abre el diálogo
const lunaDialog = document.getElementById("luna-dialog");
if (lunaDialog) {
  document.querySelectorAll("[data-luna]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (savedPassword()) return;
      event.preventDefault();
      lunaDialog.showModal();
      lunaDialog.querySelector("input").focus();
    });
  });
  lunaDialog.querySelector(".lock__close").addEventListener("click", () => lunaDialog.close());
  lunaDialog.addEventListener("click", (event) => {
    if (event.target === lunaDialog) lunaDialog.close();
  });
  wireLockForm(lunaDialog.querySelector("form"), () => { location.href = "luna-de-miel.html"; });
}

// En la página de la luna de miel: descifra y pinta el itinerario
const lunaMain = document.getElementById("luna");
if (lunaMain) {
  const show = (html) => {
    lunaMain.innerHTML = html;
    document.title = "Luna de miel · Raúl & Judy";
    animateHoneymoon();
    restoreTodos();
    if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
  };
  wireLockForm(lunaMain.querySelector("form"), show);
  const saved = savedPassword();
  if (saved) unlockHoneymoon(saved).then(show).catch(() => {});
}

function animateHoneymoon() {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add(entry.target.matches(".thread") ? "is-drawn" : "is-visible");
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.15 });
  lunaMain.querySelectorAll(".reveal, .thread").forEach((el) => observer.observe(el));
}

// La lista de pendientes se recuerda en este navegador
function restoreTodos() {
  let done = {};
  try { done = JSON.parse(localStorage.getItem("luna-pendientes") || "{}"); } catch { /* lista vacía */ }
  lunaMain.querySelectorAll("[data-todo]").forEach((box) => {
    box.checked = Boolean(done[box.dataset.todo]);
    box.addEventListener("change", () => {
      done[box.dataset.todo] = box.checked;
      try { localStorage.setItem("luna-pendientes", JSON.stringify(done)); } catch { /* no se guarda */ }
    });
  });
}
