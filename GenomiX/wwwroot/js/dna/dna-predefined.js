const $ = (id) => document.getElementById(id);
const inp = document.getElementById("gxPredefSearch");
const hint = document.querySelector(".gx-predef__hint");

inp?.addEventListener("input", () => hint && (hint.style.display = inp.value ? "none" : "block"));

function setActiveChip(chips, active) {
    for (const c of chips) c.classList.remove("is-active");
    active.classList.add("is-active");
}

function applyFilter(grid, query, activeSpecies) {
    const q = (query || "").trim().toLowerCase();
    const cards = Array.from(grid.querySelectorAll(".gx-predef__card"));

    for (const card of cards) {
        const sp = (card.getAttribute("data-species") || "").trim().toLowerCase();

        const matchSpecies = activeSpecies === "all" || sp === activeSpecies;
        const matchText = !q || sp.includes(q);

        card.style.display = (matchSpecies && matchText) ? "" : "none";
    }
}

(function initPredefined() {
    const grid = $("gxPredefGrid");
    if (!grid) return;

    const search = $("gxPredefSearch");
    const chips = Array.from(document.querySelectorAll(".gx-predef__chip"));

    let activeSpecies = "all";

    const run = () => applyFilter(grid, search?.value || "", activeSpecies);

    if (search) search.addEventListener("input", run);

    for (const chip of chips) {
        chip.addEventListener("click", () => {
            setActiveChip(chips, chip);
            activeSpecies = (chip.getAttribute("data-filter") || "all").trim().toLowerCase();
            run();
        });
    }

    run();
})();
