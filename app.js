// Données de test (juste pour valider l'UI)
const mockPhotos = [
  { id: 1, url: "https://picsum.photos/800/1200?1", orientation: "portrait" },
  { id: 2, url: "https://picsum.photos/1200/800?2", orientation: "landscape" },
  { id: 3, url: "https://picsum.photos/1200/800?3", orientation: "landscape" },
  { id: 4, url: "https://picsum.photos/800/1200?4", orientation: "portrait" },
  { id: 5, url: "https://picsum.photos/1200/800?5", orientation: "landscape" },
  { id: 6, url: "https://picsum.photos/800/1200?6", orientation: "portrait" },
];

const gallery = document.getElementById("gallery");
const btns = document.querySelectorAll("[data-filter]");

function render(photos) {
  gallery.innerHTML = `
    <div class="grid">
      ${photos
        .map(
          (p) => `
        <figure class="card ${p.orientation}">
          <img src="${p.url}" alt="${p.orientation}">
        </figure>
      `
        )
        .join("")}
    </div>
  `;
}

// Filtres
btns.forEach((btn) => {
  btn.addEventListener("click", () => {
    btns.forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    const f = btn.dataset.filter; // "portrait" | "landscape"
    render(mockPhotos.filter((p) => p.orientation === f));
  });
});

// Init: affiche "portrait" par défaut si ton bouton l’est
const defaultBtn = document.querySelector(".filtres .is-active") || btns[0];
defaultBtn.click();
