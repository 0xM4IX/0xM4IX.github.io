import Fuse from "fuse.js";

document.addEventListener("DOMContentLoaded", async () => {
  const button = document.getElementById("search-toggle");
  const modal = document.getElementById("search-modal");
  const overlay = document.getElementById("search-overlay");
  const input = document.getElementById("search-input");
  const results = document.getElementById("search-results");

  if (!button || !modal || !overlay || !input || !results) {
    console.error("Search elements are missing.");
    return;
  }

  let fuse;

  try {
    const response = await fetch("/index.json");

    if (!response.ok) {
      throw new Error(`Failed to load index.json (${response.status})`);
    }

    const pages = await response.json();

    fuse = new Fuse(pages, {
      includeScore: true,
      threshold: 0.35,
      ignoreLocation: true,
      keys: [
        { name: "title", weight: 0.6 },
        { name: "tags", weight: 0.25 },
        { name: "description", weight: 0.15 },
      ],
    });
  } catch (err) {
    console.error(err);
    return;
  }

  function openSearch() {
    modal.style.display = "flex";
    overlay.style.display = "block";

    input.focus();
  }

  function closeSearch() {
    modal.style.display = "none";
    overlay.style.display = "none";

    input.value = "";
    results.innerHTML = "";
  }

  button.addEventListener("click", openSearch);

  overlay.addEventListener("click", closeSearch);

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openSearch();
    }

    if (e.key === "Escape") {
      closeSearch();
    }
  });

  input.addEventListener("input", () => {
    const query = input.value.trim();

    console.log(query);

    if (!query) {
      results.innerHTML = "";
      return;
    }

    const matches = fuse.search(query);

    if (!matches.length) {
      results.innerHTML = `
                <div class="search-empty">
                    No results found.
                </div>
            `;
      return;
    }

    results.innerHTML = matches
      .map(({ item }) => {
        return `
                <a class="search-result ${item.type}" href="${item.permalink}">

                    ${
                      item.type === "writeups"
                        ? `<img class="search-thumb" src="${item.image}" alt="${item.title}">`
                        : `
        <div class="search-post-icon">
            📝
        </div>
        `
                    }

                    <div class="search-content">

                        <h3>${item.title}</h3>

                        <div class="search-meta">

                            ${
                              item.platform
                                ? `<span>${item.platform}</span>`
                                : `<span>${item.type}</span>`
                            }

                            ${
                              item.difficulty
                                ? `<span class="badge">${item.difficulty}</span>`
                                : ""
                            }

                        </div>

                        ${item.description ? `<p>${item.description}</p>` : ""}

                    </div>

                </a>
            `;
      })
      .join("");
  });

  closeSearch();
});
