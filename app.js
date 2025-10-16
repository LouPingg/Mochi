/* ================ CONFIG API ================ */

const PROD_API = "https://mochi-backend-ingj.onrender.com"; //

/** Auto: si on est sur GitHub Pages/Netlify => PROD, sinon LOCAL */
const isProdHost = /github\.io|netlify\.app$/i.test(location.hostname);
const API = isProdHost ? PROD_API : "http://127.0.0.1:5000";

/* ================ SÉLECTEURS ================ */
const albumsView = document.getElementById("albums-view");
const albumsGrid = document.getElementById("albums-grid");
const photosView = document.getElementById("photos-view");
const photosGrid = document.getElementById("photos-grid");
const albumTitle = document.getElementById("album-title");
const backBtn = document.getElementById("back-to-albums");
const homeLink = document.getElementById("home-link");

const btnPortrait = document.querySelector('[data-filter="portrait"]');
const btnLandscape = document.querySelector('[data-filter="landscape"]');

// Admin UI
const adminPanel = document.getElementById("admin-panel");
const loginForm = document.getElementById("login-form");
const logoutBtn = document.getElementById("logout-btn");
const adminLoggedIn = adminPanel?.querySelector(".admin-logged-in");
const adminLoggedOut = adminPanel?.querySelector(".admin-logged-out");
const createAlbumForm = document.getElementById("create-album-form");

// Lightbox
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
  // UI boutons
  document
    .querySelectorAll("[data-filter]")
    .forEach((b) => b.classList.remove("is-active"));
  (value === "portrait" ? btnPortrait : btnLandscape)?.classList.add(
    "is-active"
  );
  // Rendu
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
function toggleAdminUI() {
  if (!adminPanel) return;
  adminPanel.classList.remove("hidden");
  if (isAdmin) {
    adminLoggedOut?.classList.add("hidden");
    adminLoggedIn?.classList.remove("hidden");
  } else {
    adminLoggedIn?.classList.add("hidden");
    adminLoggedOut?.classList.remove("hidden");
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
    albumsGrid.innerHTML = `<p style="opacity:.8;text-align:center;padding:20px">Erreur de chargement des albums.</p>`;
  }
}

/* ================ RENDU ================ */
function renderAlbums() {
  const visible = albums.filter(
    (a) => countByOrientation(a, currentFilter) > 0
  );

  albumsGrid.innerHTML = visible
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
    albumsGrid.innerHTML = `<p style="opacity:.8;text-align:center;padding:20px">Aucun album ne contient de photo <strong>${currentFilter}</strong>.</p>`;
  }

  photosView.classList.add("hidden");
  albumsView.classList.remove("hidden");
}

function renderPhotos() {
  if (!currentAlbum) return;
  const list = getCurrentPhotoList();
  photosGrid.innerHTML = list
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
    photosGrid.innerHTML = `<p style="opacity:.8;text-align:center;padding:20px">Aucune photo <strong>${currentFilter}</strong> dans cet album.</p>`;
  }
}

/* ================ NAVIGATION ================ */
function openAlbum(id) {
  currentAlbum = albums.find((a) => a.id === id);
  if (!currentAlbum) return;
  albumTitle.textContent = currentAlbum.title;
  renderPhotos();
  albumsView.classList.add("hidden");
  photosView.classList.remove("hidden");
}
function backToAlbums() {
  currentAlbum = null;
  renderAlbums();
}

/* ================ LIGHTBOX ================ */
function openLightbox(index) {
  const list = getCurrentPhotoList();
  if (!list.length) return;
  lbIndex = Math.max(0, Math.min(index, list.length - 1));
  updateLightbox();
  lightbox.classList.remove("hidden");
}
function updateLightbox() {
  const list = getCurrentPhotoList();
  if (!list.length) return;
  lightboxImage.src = list[lbIndex].url;
}
function closeLightbox() {
  lightbox.classList.add("hidden");
  lightboxImage.src = "";
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

/* ================ EVENTS PUBLICS ================ */
albumsGrid.addEventListener("click", (e) => {
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

/* Ouverture album au clavier (Enter/Espace) */
albumsGrid.addEventListener("keydown", (e) => {
  const card = e.target.closest("[data-album]");
  if (!card) return;
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    openAlbum(card.dataset.album);
  }
});

photosGrid.addEventListener("click", (e) => {
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
backBtn.addEventListener("click", backToAlbums);

// clic logo = retour accueil + refresh doux
homeLink?.addEventListener("click", async (e) => {
  e.preventDefault();
  currentAlbum = null;
  await loadAlbums(); // récupère les derniers albums du serveur
  setFilter(currentFilter); // garde le filtre actuel
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// Filtres
btnPortrait.addEventListener("click", () => setFilter("portrait"));
btnLandscape.addEventListener("click", () => setFilter("landscape"));

/* Lightbox controls */
lbCloseBtn.addEventListener("click", closeLightbox);
lbNextBtn.addEventListener("click", nextPhoto);
lbPrevBtn.addEventListener("click", prevPhoto);
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});
window.addEventListener("keydown", (e) => {
  if (lightbox.classList.contains("hidden")) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowRight") nextPhoto();
  if (e.key === "ArrowLeft") prevPhoto();
});

/* ================ ADMIN ================ */
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(loginForm);
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
    loginForm.reset();
  } catch (err) {
    alert(err.message);
  }
});

logoutBtn?.addEventListener("click", async () => {
  await fetch(`${API}/auth/logout`, { credentials: "include" });
  isAdmin = false;
  toggleAdminUI();
});

/* Créer album + 1ʳᵉ photo (anti double-submit) */
createAlbumForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const submitBtn = createAlbumForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.textContent = "Création...";

  const fd = new FormData(createAlbumForm);
  const title = fd.get("title");
  const file = fd.get("file");
  const url = fd.get("url");
  const orientation = fd.get("orientation");

  try {
    // 1) Créer l’album
    let r = await fetch(`${API}/albums`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title }),
    });
    let data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data?.error || "Création de l'album impossible");

    const album = data;
    albums.push(album);

    // 2) Ajouter la première photo (si fournie)
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
      if (!r.ok) throw new Error(data?.error || "Ajout de la photo impossible");

      const photo = data;
      const a = albums.find((a) => a.id === album.id);
      if (a) a.photos.push(photo);
      createdOrientation = photo.orientation || null;
    }

    // 3) Retour à albums + filtre cohérent
    currentAlbum = null;
    if (createdOrientation) setFilter(createdOrientation);
    else setFilter(currentFilter);
    renderAlbums();
    createAlbumForm.reset();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    alert(err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
});

/* ================ INIT (force l'UI admin visible) ================ */
(async function init() {
  setFilter("portrait");
  // Affiche tout de suite le panneau admin (mode déconnecté par défaut)
  isAdmin = false;
  toggleAdminUI();

  // Puis on vérifie réellement côté serveur (cookie)
  await checkAuth();
  await loadAlbums();

  // Petit log utile en prod
  console.log("[Mochi] API =", API, "| host =", location.hostname);
})();
