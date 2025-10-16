/* ================ CONFIG API ================ */
const PROD_API = "https://TON-SERVICE.onrender.com"; // ← remplace par ton URL Render
const isProdHost = /github\.io|netlify\.app$/i.test(location.hostname);
const API = isProdHost ? PROD_API : "http://127.0.0.1:5000";

/* ================ SÉLECTEURS (peuvent être null au tout début) ================ */
const albumsView = document.getElementById("albums-view");
const albumsGrid = document.getElementById("albums-grid");
const photosView = document.getElementById("photos-view");
const photosGrid = document.getElementById("photos-grid");
const albumTitle = document.getElementById("album-title");
const backBtn = document.getElementById("back-to-albums");
const homeLink = document.getElementById("home-link");

const btnPortrait = document.querySelector('[data-filter="portrait"]');
const btnLandscape = document.querySelector('[data-filter="landscape"]');

/* Admin UI: on re-query à chaque fois dans toggleAdminUI() */
const loginForm = document.getElementById("login-form");
const logoutBtn = document.getElementById("logout-btn");
const createAlbumForm = document.getElementById("create-album-form");

/* Lightbox */
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightbox-image");
const lbCloseBtn = document.querySelector(".lb-close");
const lbPrevBtn = document.querySelector(".lb-prev");
const lbNextBtn = document.querySelector(".lb-next");

/* ================ ÉTAT ================ */
let albums = [];
let currentAlbum = null;
let currentFilter = "portrait";
let isAdmin = false;
let lbIndex = 0;

/* ================ HELPERS ================ */
function setFilter(value) {
  currentFilter = value;
  document
    .querySelectorAll("[data-filter]")
    .forEach((b) => b.classList.remove("is-active"));
  (value === "portrait" ? btnPortrait : btnLandscape)?.classList.add(
    "is-active"
  );
  if (currentAlbum) renderPhotos();
  else renderAlbums();
}
function firstPhotoUrlByOrientation(album, orientation) {
  const p = album.photos.find((ph) => ph.orientation === orientation);
  return p ? p.url : "";
}
function countByOrientation(album, orientation) {
  return album.photos.filter((ph) => ph.orientation === orientation).length;
}
function getCurrentPhotoList() {
  if (!currentAlbum) return [];
  return currentAlbum.photos.filter((p) => p.orientation === currentFilter);
}

/* 🔧 Robuste: recalcule les refs DOM et enlève toujours 'hidden' */
function toggleAdminUI() {
  const panel = document.getElementById("admin-panel");
  if (!panel) return;
  panel.classList.remove("hidden");
  const loggedIn = panel.querySelector(".admin-logged-in");
  const loggedOut = panel.querySelector(".admin-logged-out");
  if (isAdmin) {
    loggedOut?.classList.add("hidden");
    loggedIn?.classList.remove("hidden");
  } else {
    loggedIn?.classList.add("hidden");
    loggedOut?.classList.remove("hidden");
  }
}

/* ================ API ================ */
async function checkAuth() {
  try {
    const r = await fetch(`${API}/auth/me`, { credentials: "include" });
    const j = await r.json();
    isAdmin = !!j.authenticated;
  } catch {
    isAdmin = false;
  }
  toggleAdminUI();
}
async function loadAlbums() {
  try {
    const res = await fetch(`${API}/albums`, { credentials: "include" });
    if (!res.ok) throw new Error("Erreur /albums " + res.status);
    albums = await res.json();
    renderAlbums();
  } catch (err) {
    console.error(err);
    const grid = document.getElementById("albums-grid");
    if (grid)
      grid.innerHTML = `<p style="opacity:.8;text-align:center;padding:20px">Erreur de chargement des albums.</p>`;
  }
}

/* ================ RENDU ================ */
function renderAlbums() {
  const grid = document.getElementById("albums-grid");
  const aView = document.getElementById("albums-view");
  const pView = document.getElementById("photos-view");
  if (!grid || !aView || !pView) return;

  const visible = albums.filter(
    (a) => countByOrientation(a, currentFilter) > 0
  );
  grid.innerHTML = visible
    .map((a) => {
      const cover = firstPhotoUrlByOrientation(a, currentFilter);
      const count = countByOrientation(a, currentFilter);
      return `
      <article class="album-card" data-album="${
        a.id
      }" tabindex="0" aria-label="Ouvrir ${a.title}">
        ${
          cover
            ? `<img src="${cover}" alt="Aperçu ${a.title}" loading="lazy">`
            : ""
        }
        <div class="title">${a.title}</div>
        <div class="meta">${count} photo(s)</div>
        ${
          isAdmin
            ? `<button class="btn-trash" data-del-album="${a.id}">🗑</button>`
            : ""
        }
      </article>`;
    })
    .join("");

  if (!visible.length) {
    grid.innerHTML = `<p style="opacity:.8;text-align:center;padding:20px">Aucun album ne contient de photo <strong>${currentFilter}</strong>.</p>`;
  }

  pView.classList.add("hidden");
  aView.classList.remove("hidden");
}
function renderPhotos() {
  const grid = document.getElementById("photos-grid");
  const titleEl = document.getElementById("album-title");
  const aView = document.getElementById("albums-view");
  const pView = document.getElementById("photos-view");
  if (!currentAlbum || !grid || !titleEl || !aView || !pView) return;

  titleEl.textContent = currentAlbum.title;
  const list = getCurrentPhotoList();
  grid.innerHTML = list
    .map(
      (p, i) => `
      <figure class="card ${p.orientation}" data-index="${i}">
        <img src="${p.url}" alt="${p.orientation}">
        ${
          isAdmin
            ? `<button class="btn-trash" data-del-photo="${p.id}">🗑</button>`
            : ""
        }
      </figure>`
    )
    .join("");

  if (!list.length) {
    grid.innerHTML = `<p style="opacity:.8;text-align:center;padding:20px">Aucune photo <strong>${currentFilter}</strong> dans cet album.</p>`;
  }

  aView.classList.add("hidden");
  pView.classList.remove("hidden");
}

/* ================ NAVIGATION ================ */
function openAlbum(id) {
  currentAlbum = albums.find((a) => a.id === id);
  if (!currentAlbum) return;
  renderPhotos();
}
function backToAlbums() {
  currentAlbum = null;
  renderAlbums();
}

/* ================ LIGHTBOX ================ */
function openLightbox(index) {
  const list = getCurrentPhotoList();
  const lb = document.getElementById("lightbox");
  if (!list.length || !lb) return;
  lbIndex = Math.max(0, Math.min(index, list.length - 1));
  updateLightbox();
  lb.classList.remove("hidden");
}
function updateLightbox() {
  const list = getCurrentPhotoList();
  const img = document.getElementById("lightbox-image");
  if (!list.length || !img) return;
  img.src = list[lbIndex].url;
}
function closeLightbox() {
  const lb = document.getElementById("lightbox");
  const img = document.getElementById("lightbox-image");
  if (!lb || !img) return;
  lb.classList.add("hidden");
  img.src = "";
}
function nextPhoto() {
  const list = getCurrentPhotoList();
  lbIndex = (lbIndex + 1) % list.length;
  updateLightbox();
}
function prevPhoto() {
  const list = getCurrentPhotoList();
  lbIndex = (lbIndex - 1 + list.length) % list.length;
  updateLightbox();
}

/* ================ EVENTS ================ */
document.getElementById("albums-grid")?.addEventListener("click", (e) => {
  const del = e.target.closest("[data-del-album]");
  if (del && isAdmin) {
    const id = del.dataset.delAlbum;
    if (confirm("Supprimer cet album ?")) {
      fetch(`${API}/albums/${id}`, { method: "DELETE", credentials: "include" })
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then(() => {
          albums = albums.filter((a) => a.id !== id);
          renderAlbums();
        });
    }
    return;
  }
  const card = e.target.closest("[data-album]");
  if (card) openAlbum(card.dataset.album);
});
document.getElementById("albums-grid")?.addEventListener("keydown", (e) => {
  const card = e.target.closest("[data-album]");
  if (!card) return;
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    openAlbum(card.dataset.album);
  }
});

document.getElementById("photos-grid")?.addEventListener("click", (e) => {
  const del = e.target.closest("[data-del-photo]");
  if (del && isAdmin) {
    const id = del.dataset.delPhoto;
    if (confirm("Supprimer cette photo ?")) {
      fetch(`${API}/photos/${id}`, { method: "DELETE", credentials: "include" })
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then(() => {
          currentAlbum.photos = currentAlbum.photos.filter((p) => p.id !== id);
          renderPhotos();
        });
    }
    return;
  }
  const fig = e.target.closest("figure.card");
  if (!fig) return;
  openLightbox(Number(fig.dataset.index));
});
document
  .getElementById("back-to-albums")
  ?.addEventListener("click", backToAlbums);
document.getElementById("home-link")?.addEventListener("click", async (e) => {
  e.preventDefault();
  currentAlbum = null;
  await loadAlbums();
  setFilter(currentFilter);
  window.scrollTo({ top: 0, behavior: "smooth" });
});
btnPortrait?.addEventListener("click", () => setFilter("portrait"));
btnLandscape?.addEventListener("click", () => setFilter("landscape"));
document.querySelector(".lb-close")?.addEventListener("click", closeLightbox);
document.querySelector(".lb-next")?.addEventListener("click", nextPhoto);
document.querySelector(".lb-prev")?.addEventListener("click", prevPhoto);
document.getElementById("lightbox")?.addEventListener("click", (e) => {
  if (e.target === document.getElementById("lightbox")) closeLightbox();
});
window.addEventListener("keydown", (e) => {
  const lb = document.getElementById("lightbox");
  if (!lb || lb.classList.contains("hidden")) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowRight") nextPhoto();
  if (e.key === "ArrowLeft") prevPhoto();
});

/* Admin */
document.getElementById("login-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.currentTarget);
  const body = { username: fd.get("username"), password: fd.get("password") };
  try {
    const r = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error("Login invalide");
    isAdmin = true;
    toggleAdminUI();
    await loadAlbums();
    e.currentTarget.reset();
  } catch (err) {
    alert(err.message);
  }
});
document.getElementById("logout-btn")?.addEventListener("click", async () => {
  await fetch(`${API}/auth/logout`, { credentials: "include" });
  isAdmin = false;
  toggleAdminUI();
});
document
  .getElementById("create-album-form")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const submitBtn = formEl.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    const originalLabel = submitBtn.textContent;
    submitBtn.textContent = "Création...";

    const fd = new FormData(formEl);
    const title = fd.get("title");
    const file = fd.get("file");
    const url = fd.get("url");
    const orientation = fd.get("orientation");

    try {
      let r = await fetch(`${API}/albums`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title }),
      });
      let data = await r.json().catch(() => ({}));
      if (!r.ok)
        throw new Error(data?.error || "Création de l'album impossible");

      const album = data;
      albums.push(album);

      let createdOrientation = null;
      if ((file && file.size > 0) || url) {
        if (file && file.size > 0) {
          const form = new FormData();
          form.append("albumId", album.id);
          form.append("file", file);
          r = await fetch(`${API}/photos`, {
            method: "POST",
            credentials: "include",
            body: form,
          });
        } else {
          r = await fetch(`${API}/photos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              albumId: album.id,
              url,
              orientation: orientation || "",
            }),
          });
        }
        data = await r.json().catch(() => ({}));
        if (!r.ok)
          throw new Error(data?.error || "Ajout de la photo impossible");

        const photo = data;
        const a = albums.find((a) => a.id === album.id);
        if (a) a.photos.push(photo);
        createdOrientation = photo.orientation || null;
      }

      currentAlbum = null;
      if (createdOrientation) setFilter(createdOrientation);
      else setFilter(currentFilter);
      renderAlbums();
      formEl.reset();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      alert(err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });

/* ================ INIT ================ */
/* Script charge dans le <head> ; le DOM <body> n'est pas garanti.
   On force l'affichage du panneau après le premier tick, puis on continue. */
console.log("[Mochi] API =", API, "| host =", location.hostname);
setFilter("portrait");
// 1) montrer l'UI admin en déconnecté dès que possible
requestAnimationFrame(() => {
  isAdmin = false;
  toggleAdminUI();
});
// 2) ensuite on check l'auth et on charge
(async () => {
  try {
    await checkAuth();
  } catch {}
  try {
    await loadAlbums();
  } catch {}
  // Filet de sécurité : si jamais le panel était encore caché, on le ré-affiche
  setTimeout(() => {
    isAdmin = false;
    toggleAdminUI();
  }, 800);
})();
