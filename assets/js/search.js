import Fuse from 'fuse.js';
const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");
let fuse;
let allPages = [];

async function initSearch() {

    const response = await fetch("/index.json");

    allPages = await response.json();

    fuse = new Fuse(allPages, {
        keys: [
            "title",
            "platform",
            "difficulty"
        ],
        threshold: 0.35
    });
}

initSearch();

searchInput.addEventListener("input", () => {


    const query = searchInput.value.trim();

    if (!query) {

        searchResults.classList.remove("active");
        searchResults.innerHTML = "";

        return;
    }

    const results = fuse.search(query);

    console.log(results);
    

    if (results.length === 0) {

        searchResults.innerHTML = `
            <div class="search-empty">
                No machines found.
            </div>
        `;

        searchResults.classList.add("active");

        return;
    }

    searchResults.innerHTML = results.map(result => {

        const item = result.item;

     return `
        <a class="search-result" href="${item.permalink}">

            <div class="search-machine-info">

                <div class="search-machine-title">
                    ${item.title.replace(" - Writeup", "")}
                </div>

                <div class="search-machine-meta">
                    ${item.platform} • ${item.difficulty}
                </div>

            </div>

            <img
                class="search-machine-image"
                src="${item.image}"
                alt="${item.title}"
            >

        </a>
        `;

    }).join("");

    searchResults.classList.add("active");
});

searchInput.addEventListener("focus", () => {

    if (searchInput.value.trim() !== "") {

        searchResults.classList.add("active");
    }
});

document.addEventListener("click", (e) => {

    if (!e.target.closest(".search-wrapper")) {

        searchResults.classList.remove("active");
    }
});