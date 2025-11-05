document.addEventListener("DOMContentLoaded", () => {
  // --- STATE MANAGEMENT ---
  let memories = [];
  let currentPageIndex = 0;

  // --- ELEMENT SELECTORS ---
  const landingView = document.getElementById("landing-view");
  const scrapbookView = document.getElementById("scrapbook-view");
  const wallView = document.getElementById("wall-view");

  const openScrapbookBtn = document.getElementById("open-scrapbook-btn");
  const scrapbookContainer = document.getElementById("scrapbook-container");
  const prevPageBtn = document.getElementById("prev-page-btn");
  const nextPageBtn = document.getElementById("next-page-btn");
  const pageCounter = document.getElementById("page-counter");
  const polaroidWallContainer = document.getElementById(
    "polaroid-wall-container"
  );

  // --- FUNCTIONS ---

  // Fetches data and initializes the app
  async function initializeApp() {
    try {
      const response = await fetch("data/memories.json");
      memories = await response.json();
      if (memories.length > 0) {
        renderScrapbookPages();
        renderPolaroidWall();
        updateScrapbookView();
      }
    } catch (error) {
      console.error("Could not load memories:", error);
    }
  }

  // Creates all scrapbook pages from the data
  function renderScrapbookPages() {
    scrapbookContainer.innerHTML = ""; // Clear existing content
    memories.forEach((memory, index) => {
      const page = document.createElement("div");
      page.className = "scrapbook-page";
      page.dataset.index = index;

      let photoSide = `<div class="page-photo"><img src="${
        memory.photo
      }" alt="Memory ${index + 1}" loading="lazy"></div>`;
      let messageSide = `<div class="page-message"><p>"${memory.message}"</p></div>`;

      // Alternate layout for variety
      page.innerHTML =
        index % 2 === 0 ? photoSide + messageSide : messageSide + photoSide;

      scrapbookContainer.appendChild(page);
    });

    // Add the special button on the last page
    const lastPage = scrapbookContainer.querySelector(
      `[data-index="${memories.length - 1}"]`
    );
    if (lastPage) {
      const surpriseButton = document.createElement("button");
      surpriseButton.id = "open-wall-btn";
      surpriseButton.className = "cta-button";
      surpriseButton.textContent = "Open Surprise Wall ✨";
      surpriseButton.style.marginTop = "2rem";

      lastPage.querySelector(".page-message").appendChild(surpriseButton);
      surpriseButton.addEventListener("click", showPolaroidWall);
    }
  }

  // Shows/hides pages based on the current index
  function updateScrapbookView() {
    const pages = document.querySelectorAll(".scrapbook-page");
    pages.forEach((page, index) => {
      if (index === currentPageIndex) {
        page.classList.add("active");
      } else {
        page.classList.remove("active");
      }
    });

    pageCounter.textContent = `${currentPageIndex + 1} / ${memories.length}`;
    prevPageBtn.disabled = currentPageIndex === 0;
    nextPageBtn.disabled = currentPageIndex === memories.length - 1;
  }

  // Creates all polaroid cards
  function renderPolaroidWall() {
    polaroidWallContainer.innerHTML = "";
    memories.forEach((memory) => {
      const card = document.createElement("div");
      card.className = "polaroid-card";

      const randomRotation = Math.random() * 10 - 5; // -5 to +5 degrees

      card.innerHTML = `
                <div class="polaroid-card-inner">
                    <div class="polaroid-front" style="transform: rotate(${randomRotation}deg);">
                        <img src="${memory.photo}" alt="Memory Photo" loading="lazy">
                        <p class="polaroid-caption">${memory.date}</p>
                    </div>
                    <div class="polaroid-back">
                        <p>"${memory.message}"</p>
                    </div>
                </div>
            `;

      card.addEventListener("click", () => {
        card.classList.toggle("is-flipped");
      });

      polaroidWallContainer.appendChild(card);
    });
  }

  // Navigation functions
  function showNextPage() {
    if (currentPageIndex < memories.length - 1) {
      currentPageIndex++;
      updateScrapbookView();
    }
  }

  function showPrevPage() {
    if (currentPageIndex > 0) {
      currentPageIndex--;
      updateScrapbookView();
    }
  }

  // View switching functions
  function showScrapbook() {
    landingView.classList.remove("active");
    scrapbookView.classList.add("active");
  }

  function showPolaroidWall() {
    scrapbookView.classList.remove("active");
    wallView.classList.add("active");
  }

  // --- EVENT LISTENERS ---
  openScrapbookBtn.addEventListener("click", showScrapbook);
  nextPageBtn.addEventListener("click", showNextPage);
  prevPageBtn.addEventListener("click", showPrevPage);

  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    // Only navigate if the scrapbook is visible
    if (scrapbookView.classList.contains("active")) {
      if (e.key === "ArrowRight") showNextPage();
      if (e.key === "ArrowLeft") showPrevPage();
    }
  });

  // --- INITIALIZATION ---
  initializeApp();
});
