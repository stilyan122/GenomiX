const CODON_TABLE = {
    UUU: "F", UUC: "F", UUA: "L", UUG: "L", CUU: "L", CUC: "L", CUA: "L", CUG: "L",
    AUU: "I", AUC: "I", AUA: "I", AUG: "M", GUU: "V", GUC: "V", GUA: "V", GUG: "V",
    UCU: "S", UCC: "S", UCA: "S", UCG: "S", CCU: "P", CCC: "P", CCA: "P", CCG: "P",
    ACU: "T", ACC: "T", ACA: "T", ACG: "T", GCU: "A", GCC: "A", GCA: "A", GCG: "A",
    UAU: "Y", UAC: "Y", UAA: "*", UAG: "*", CAU: "H", CAC: "H", CAA: "Q", CAG: "Q",
    AAU: "N", AAC: "N", AAA: "K", AAG: "K", GAU: "D", GAC: "D", GAA: "E", GAG: "E",
    UGU: "C", UGC: "C", UGA: "*", UGG: "W", CGU: "R", CGC: "R", CGA: "R", CGG: "R",
    AGU: "S", AGC: "S", AGA: "R", AGG: "R", GGU: "G", GGC: "G", GGA: "G", GGG: "G",
};

const AA = {
    A: { name: "Alanine", abbr: "Ala", cat: "nonpolar", color: "#4a7ee8" },
    R: { name: "Arginine", abbr: "Arg", cat: "positive", color: "#ff8833" },
    N: { name: "Asparagine", abbr: "Asn", cat: "polar", color: "#33cc88" },
    D: { name: "Aspartate", abbr: "Asp", cat: "negative", color: "#ff4466" },
    C: { name: "Cysteine", abbr: "Cys", cat: "special", color: "#cc88ff" },
    Q: { name: "Glutamine", abbr: "Gln", cat: "polar", color: "#44ccaa" },
    E: { name: "Glutamate", abbr: "Glu", cat: "negative", color: "#ff3355" },
    G: { name: "Glycine", abbr: "Gly", cat: "special", color: "#8888ff" },
    H: { name: "Histidine", abbr: "His", cat: "positive", color: "#ffaa44" },
    I: { name: "Isoleucine", abbr: "Ile", cat: "nonpolar", color: "#5577ee" },
    L: { name: "Leucine", abbr: "Leu", cat: "nonpolar", color: "#4466dd" },
    K: { name: "Lysine", abbr: "Lys", cat: "positive", color: "#ff9922" },
    M: { name: "Methionine", abbr: "Met", cat: "start", color: "#00dd99" },
    F: { name: "Phenylalanine", abbr: "Phe", cat: "aromatic", color: "#7766dd" },
    P: { name: "Proline", abbr: "Pro", cat: "special", color: "#9955ee" },
    S: { name: "Serine", abbr: "Ser", cat: "polar", color: "#33bb77" },
    T: { name: "Threonine", abbr: "Thr", cat: "polar", color: "#44cc88" },
    W: { name: "Tryptophan", abbr: "Trp", cat: "aromatic", color: "#6644cc" },
    Y: { name: "Tyrosine", abbr: "Tyr", cat: "aromatic", color: "#9988ee" },
    V: { name: "Valine", abbr: "Val", cat: "nonpolar", color: "#3366dd" },
    "*": { name: "Stop codon", abbr: "---", cat: "stop", color: "#dd2244" },
    "?": { name: "Unknown", abbr: "?", cat: "unknown", color: "#666688" },
};

const CAT_LABELS = {
    nonpolar: "Nonpolar aliphatic",
    aromatic: "Aromatic",
    polar: "Polar uncharged",
    positive: "Positively charged (+)",
    negative: "Negatively charged (−)",
    special: "Special residue",
    start: "Start / Nonpolar",
    stop: "Stop codon",
    unknown: "Unknown",
};

function aaData(letter) { return AA[letter] ?? AA["?"]; }

function toMRNA(dna) { return dna.toUpperCase().replace(/T/g, "U"); }

function codonInfo(dnaTriplet) {
    const mrna = toMRNA(dnaTriplet);
    const aa = CODON_TABLE[mrna] ?? "?";
    return { dna: dnaTriplet, mrna, aa, ...aaData(aa) };
}

const PAIR_W = 54;   
const CODON_W = PAIR_W * 3; 

export function createCodonOverlay(viewerApiRef) {
    let frame = 0;
    let visible = false;
    let s1Seq = "";

    let barEl = null;  
    let controlsEl = null;  
    let tooltipEl = null;  
    let ladderEl = null; 
    let wrapEl = null;  
    let toggleBtnEl = null; 
    let txObserver = null;  

    function findAnchors() {
        wrapEl = document.querySelector(".dna-ladder-wrap")
            ?? document.getElementById("dna-visual");
        ladderEl = wrapEl?.querySelector(".dna-ladder");
        return !!(wrapEl && ladderEl);
    }

    function extractTX(str) {
        const m = (str || "").match(/translateX\((-?[\d.]+)px\)/);
        return m ? parseFloat(m[1]) : 0;
    }

    function syncBarTransform() {
        if (!barEl || !ladderEl) return;
        const tx = extractTX(ladderEl.style.transform);
        const trans = ladderEl.style.transition || "";
        barEl.style.transition = trans;
        barEl.style.transform = `translateX(${tx}px)`;
    }

    function startObserver() {
        if (txObserver || !ladderEl) return;
        txObserver = new MutationObserver(syncBarTransform);
        txObserver.observe(ladderEl, { attributes: true, attributeFilter: ["style"] });
    }

    function stopObserver() {
        txObserver?.disconnect();
        txObserver = null;
    }

    function buildBar() {
        const el = document.createElement("div");
        el.className = "gx-codon-bar";
        return el;
    }

    function buildTooltip() {
        const el = document.createElement("div");
        el.className = "gx-codon-tip";
        el.style.display = "none";
        document.body.appendChild(el);
        return el;
    }

    function showTooltip(blockEl, info, startBp) {
        if (!tooltipEl) return;

        const isBg = document.documentElement.lang?.toLowerCase().startsWith("bg");
        const catLabel = CAT_LABELS[info.cat] || info.cat;

        tooltipEl.innerHTML = `
            <div class="gx-codon-tip__header" style="--ac:${info.color}">
                <span class="gx-codon-tip__aa">${info.aa}</span>
                <div class="gx-codon-tip__names">
                    <div class="gx-codon-tip__fullname">${info.name}</div>
                    <div class="gx-codon-tip__abbr">${info.abbr}</div>
                </div>
            </div>
            <div class="gx-codon-tip__row">
                <span class="gx-codon-tip__k">${isBg ? "мРНК кодон" : "mRNA codon"}</span>
                <code class="gx-codon-tip__v gx-codon-tip__mrna">${info.mrna}</code>
            </div>
            <div class="gx-codon-tip__row">
                <span class="gx-codon-tip__k">${isBg ? "ДНК триплет" : "DNA triplet"}</span>
                <code class="gx-codon-tip__v">${info.dna}</code>
            </div>
            <div class="gx-codon-tip__row">
                <span class="gx-codon-tip__k">${isBg ? "Категория" : "Category"}</span>
                <span class="gx-codon-tip__v">${catLabel}</span>
            </div>
            <div class="gx-codon-tip__row">
                <span class="gx-codon-tip__k">${isBg ? "Позиция" : "Position"}</span>
                <span class="gx-codon-tip__v">bp ${startBp + 1}–${startBp + 3}</span>
            </div>
            ${info.cat === "start" ? `<div class="gx-codon-tip__badge gx-codon-tip__badge--start">▶ START</div>` : ""}
            ${info.cat === "stop" ? `<div class="gx-codon-tip__badge gx-codon-tip__badge--stop">■ STOP</div>` : ""}
        `;

        const rect = blockEl.getBoundingClientRect();
        tooltipEl.style.display = "block";
        const tw = tooltipEl.offsetWidth || 220;
        const th = tooltipEl.offsetHeight || 160;

        let left = rect.left + rect.width / 2 - tw / 2;
        let top = rect.top - th - 8;

        if (top < 8) top = rect.bottom + 8;
        if (left < 8) left = 8;
        if (left + tw > window.innerWidth - 8) left = window.innerWidth - tw - 8;

        tooltipEl.style.left = `${left}px`;
        tooltipEl.style.top = `${top}px`;
    }

    function hideTooltip() {
        if (tooltipEl) tooltipEl.style.display = "none";
    }

    function render() {
        if (!barEl || !visible || !s1Seq) return;
        barEl.innerHTML = "";

        const s1 = s1Seq;
        const len = s1.length;

        if (frame > 0) {
            const leaderEl = document.createElement("div");
            leaderEl.className = "gx-codon-block gx-codon-block--leader";
            leaderEl.style.left = "0px";
            leaderEl.style.width = `${frame * PAIR_W - 2}px`;
            const fLabel = document.createElement("span");
            fLabel.className = "gx-codon-block__frame-gap";
            fLabel.textContent = `+${frame}`;
            leaderEl.appendChild(fLabel);
            barEl.appendChild(leaderEl);
        }

        for (let i = frame; i < len; i += 3) {
            const remaining = len - i;
            const isPartial = remaining < 3;
            const tripletDNA = s1.slice(i, i + 3);
            const info = codonInfo(tripletDNA);
            const blockW = isPartial
                ? remaining * PAIR_W - 2
                : CODON_W - 2;

            const block = document.createElement("div");
            block.className = [
                "gx-codon-block",
                `gx-codon-block--${info.cat}`,
                isPartial ? "gx-codon-block--partial" : "",
                info.cat === "start" ? "gx-codon-block--is-start" : "",
                info.cat === "stop" ? "gx-codon-block--is-stop" : "",
            ].filter(Boolean).join(" ");

            block.style.left = `${i * PAIR_W}px`;
            block.style.width = `${blockW}px`;
            block.style.setProperty("--ac", info.color);

            block.innerHTML = isPartial
                ? `<span class="gx-codon-block__partial">…</span>`
                : `<span class="gx-codon-block__aa">${info.aa}</span>
                   <span class="gx-codon-block__mrna">${info.mrna}</span>`;

            block.addEventListener("mouseenter", () => showTooltip(block, info, i));
            block.addEventListener("mouseleave", hideTooltip);

            barEl.appendChild(block);
        }

        syncBarTransform();
    }

    function buildControls() {
        const el = document.createElement("div");
        el.className = "gx-codon-controls";

        const isBg = document.documentElement.lang?.toLowerCase().startsWith("bg");
        const frameLabel = isBg ? "Рамка" : "Frame";

        el.innerHTML = `
            <span class="gx-codon-controls__label">${frameLabel}</span>
            <div class="gx-codon-controls__frames" id="gx-codon-frame-group">
                <button class="gx-codon-frame-btn is-active" data-frame="0">F0</button>
                <button class="gx-codon-frame-btn" data-frame="1">F1</button>
                <button class="gx-codon-frame-btn" data-frame="2">F2</button>
            </div>
        `;

        el.addEventListener("click", e => {
            const btn = e.target.closest("[data-frame]");
            if (!btn) return;
            frame = parseInt(btn.dataset.frame, 10);
            el.querySelectorAll(".gx-codon-frame-btn").forEach(b => b.classList.toggle("is-active", b.dataset.frame == frame));
            render();
        });

        return el;
    }

    function show() {
        if (!findAnchors()) return;

        if (!barEl) {
            barEl = buildBar();
            wrapEl.appendChild(barEl);
        }
        if (!controlsEl) {
            controlsEl = buildControls();
            wrapEl.appendChild(controlsEl);
        }
        if (!tooltipEl) {
            tooltipEl = buildTooltip();
        }

        barEl.classList.remove("is-hidden");
        controlsEl.classList.remove("is-hidden");
        wrapEl.classList.add("gx-codon-active");
        startObserver();
        render();
        visible = true;
        toggleBtnEl?.classList.add("is-active");
    }

    function hide() {
        barEl?.classList.add("is-hidden");
        controlsEl?.classList.add("is-hidden");
        wrapEl?.classList.remove("gx-codon-active");
        stopObserver();
        hideTooltip();
        visible = false;
        toggleBtnEl?.classList.remove("is-active");
    }

    function toggle() { visible ? hide() : show(); }

    function injectToggleBtn() {
        const isBg = document.documentElement.lang?.toLowerCase().startsWith("bg");
        const label = isBg ? "Кодони" : "Codons";

        toggleBtnEl = document.createElement("button");
        toggleBtnEl.id = "gx-codon-toggle-btn";
        toggleBtnEl.type = "button";
        toggleBtnEl.className = "gx-btn gx-btn--ghost";
        toggleBtnEl.textContent = label;
        toggleBtnEl.addEventListener("click", toggle);

        const undoBtn = document.getElementById("undo-btn");
        undoBtn.insertAdjacentElement('beforebegin', toggleBtnEl);
    }

    function setSequence(s1) {
        s1Seq = s1 || "";
        if (visible) render();
    }

    function destroy() {
        hide();
        stopObserver();
        barEl?.remove();
        controlsEl?.remove();
        tooltipEl?.remove();
        toggleBtnEl?.remove();
        barEl = controlsEl = tooltipEl = ladderEl = wrapEl = toggleBtnEl = null;
    }

    injectToggleBtn();

    return { setSequence, show, hide, toggle, destroy };
}
