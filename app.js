// =====================
// Données de démo
// =====================
const albums = [
  {
    id: "a1",
    title: "Soirée de samedi",
    cover: "https://picsum.photos/id/1011/800/540",
    photos: [
      {
        id: "p1",
        url: "https://picsum.photos/id/1011/1200/800",
        orientation: "landscape",
      },
      {
        id: "p2",
        url: "https://picsum.photos/id/1027/800/1200",
        orientation: "portrait",
      },
      {
        id: "p3",
        url: "https://picsum.photos/id/1035/1200/800",
        orientation: "landscape",
      },
      {
        id: "p4",
        url: "https://picsum.photos/id/1005/800/1200",
        orientation: "portrait",
      },
    ],
  },
  {
    id: "a2",
    title: "Balade au parc",
    cover: "https://picsum.photos/id/1062/800/540",
    photos: [
      {
        id: "p5",
        url: "https://picsum.photos/id/1062/1200/800",
        orientation: "landscape",
      },
      {
        id: "p6",
        url: "https://picsum.photos/id/1025/800/1200",
        orientation: "portrait",
      },
      {
        id: "p7",
        url: "https://picsum.photos/id/1043/1200/800",
        orientation: "landscape",
      },
      {
        id: "p8",
        url: "https://picsum.photos/id/1021/800/1200",
        orientation: "portrait",
      },
    ],
  },
];

// =====================
// Sélecteurs
// =====================
const albumsView = document.getElementById("albums-view");
const albumsGrid = document.getElementById("albums-grid");
const photosView = document.getElementById("photos-view");
const photosGrid = document.getElementById("photos-grid");
const albumTitle = document.getElementById("album-title");
const backBtn = document.getElementById("back-to-albums");

const btnPortrait = document.querySelector('[data-filter="portrait"]');
const btnLandscape = document.querySelector('[data-filter="landscape"]');

// Lightbox
const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightbox-image");
const lbCloseBtn = document.querySelector(".lb-close");
const lbPrevBtn = document.querySelector(".lb-prev");
const lbNextBtn = document.querySelector(".lb-next");

// =====================
// État
// =====================
let currentAlbum = null; // album ouvert (ou null si vue Albums)
let currentFilter = "portrait"; // 'portrait' | 'landscape'
let lbIndex = 0; // index courant dans la liste filtrée

// =====================
// Helpers
// =====================
function firstPhotoUrlByOrientation(album, orientation) {
  const p = album.photos.find((ph) => ph.orientation === orientation);
  return p ? p.url : album.cover;
}
function countByOrientation(album, orientation) {
  return album.photos.filter((ph) => ph.orientation === orientation).length;
}
function getCurrentPhotoList() {
  if (!currentAlbum) return [];
  return currentAlbum.photos.filter((p) => p.orientation === currentFilter);
}

// =====================
// Rendu
// =====================
function renderAlbums() {
  const visible = albums.filter(
    (a) => countByOrientation(a, currentFilter) > 0
  );

  albumsGrid.innerHTML = visible
    .map((a) => {
      const coverForFilter = firstPhotoUrlByOrientation(a, currentFilter);
      const count = countByOrientation(a, currentFilter);
      return `
      <article class="album-card" data-album="${a.id}" tabindex="0" aria-label="Ouvrir l'album ${a.title}">
        <img src="${coverForFilter}" alt="Aperçu ${currentFilter} — ${a.title}" loading="lazy">
        <div class="title">${a.title}</div>
        <div class="meta">${count} photo(s) ${currentFilter}</div>
      </article>
    `;
    })
    .join("");

  if (visible.length === 0) {
    albumsGrid.innerHTML = `<p style="opacity:.8;text-align:center;padding:20px">
      Aucun album ne contient de photos <strong>${currentFilter}</strong>.
    </p>`;
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
      <img src="${p.url}" alt="${p.orientation}" loading="lazy">
    </figure>
  `
    )
    .join("");

  if (list.length === 0) {
    photosGrid.innerHTML = `<p style="opacity:.8;text-align:center;padding:20px">
      Aucune photo <strong>${currentFilter}</strong> dans cet album.
    </p>`;
  }
}

// =====================
// Navigation Albums/Photos
// =====================
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
  renderAlbums(); // ré-affiche la liste filtrée
}

// =====================
// Lightbox
// =====================
function openLightbox(index) {
  const list = getCurrentPhotoList();
  if (!list.length || !lightbox) return;
  lbIndex = Math.max(0, Math.min(index, list.length - 1));
  updateLightbox();
  lightbox.classList.remove("hidden");
}
function updateLightbox() {
  const list = getCurrentPhotoList();
  if (!list.length || !lightboxImage) return;
  lightboxImage.src = list[lbIndex].url;
}
function closeLightbox() {
  if (!lightbox) return;
  lightbox.classList.add("hidden");
  if (lightboxImage) lightboxImage.src = "";
}
function nextPhoto() {
  const list = getCurrentPhotoList();
  if (!list.length) return;
  lbIndex = (lbIndex + 1) % list.length;
  updateLightbox();
}
function prevPhoto() {
  const list = getCurrentPhotoList();
  if (!list.length) return;
  lbIndex = (lbIndex - 1 + list.length) % list.length;
  updateLightbox();
}
function onContextChanged() {
  if (lightbox && !lightbox.classList.contains("hidden")) closeLightbox();
}

// =====================
// Événements
// =====================

// Ouvrir album
albumsGrid.addEventListener("click", (e) => {
  const card = e.target.closest("[data-album]");
  if (card) openAlbum(card.dataset.album);
});
albumsGrid.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const card = e.target.closest("[data-album]");
    if (card) openAlbum(card.dataset.album);
  }
});

// Retour
backBtn.addEventListener("click", () => {
  onContextChanged();
  backToAlbums();
});

// Filtres (actifs en vue Albums + Photos)
function activateFilter(btn, value) {
  document
    .querySelectorAll("[data-filter]")
    .forEach((b) => b.classList.remove("is-active"));
  btn.classList.add("is-active");
  currentFilter = value;

  if (currentAlbum) renderPhotos();
  else renderAlbums();

  onContextChanged(); // ferme la lightbox si ouverte
}
btnPortrait?.addEventListener("click", () =>
  activateFilter(btnPortrait, "portrait")
);
btnLandscape?.addEventListener("click", () =>
  activateFilter(btnLandscape, "landscape")
);

// Ouvrir la lightbox (dans la vue Photos)
photosGrid.addEventListener("click", (e) => {
  const fig = e.target.closest("figure.card");
  if (!fig) return;
  const index = Number(fig.dataset.index || 0);
  openLightbox(index);
});

// Contrôles lightbox
lbCloseBtn && lbCloseBtn.addEventListener("click", closeLightbox);
lbNextBtn && lbNextBtn.addEventListener("click", nextPhoto);
lbPrevBtn && lbPrevBtn.addEventListener("click", prevPhoto);
lightbox &&
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });
window.addEventListener("keydown", (e) => {
  if (!lightbox || lightbox.classList.contains("hidden")) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowRight") nextPhoto();
  if (e.key === "ArrowLeft") prevPhoto();
});

// =====================
// Init
// =====================
(function init() {
  // état visuel filtre par défaut
  document
    .querySelectorAll("[data-filter]")
    .forEach((b) => b.classList.remove("is-active"));
  btnPortrait?.classList.add("is-active");
  currentFilter = "portrait";

  renderAlbums();
})();
