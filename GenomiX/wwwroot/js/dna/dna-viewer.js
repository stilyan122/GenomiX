import { purinePyrimidine, countBases, gcContent, tmWallace, codonAt } from "./dna-utils.js";
import { mountHelix3D } from "./dna-helix3d.js";
import { createHistoryController } from "./dna-history.js";
import { createEditPopController } from "./dna-editpop.js";
import { createNanobotCinematicRepair } from "./dna-nanobot.js";

let gxHistoryIdSeed = 0;

export function visualizeDNA(strand1, strand2, { scientific = false, containerId = "dna-visual", compareMutatedIndices = [] } = {}) {
    const visualizer = document.getElementById(containerId);

    if (!visualizer)
        throw new Error("Missing #dna-visual");

    visualizer._disposeAll?.();
    visualizer._disposeAll = null;

    const legend3D = visualizer.querySelector("#gx-legend-3d");

    visualizer.replaceChildren();
    if (legend3D) legend3D.classList.add("gx-hidden");

    visualizer.classList.toggle("mode--sci", scientific);

    let inspectorEl = null;

    inspectorEl = document.createElement("div");
    inspectorEl.className = "gx-inspector is-hidden";
    inspectorEl.innerHTML = `
      <div class="gx-inspector__hd">
        <div class="gx-inspector__title">Inspector</div>
        <div class="gx-inspector__chip" id="gxPairState">—</div>
      </div>
      <div class="gx-inspector__bd">
        <div class="gx-inspector__row"><span class="gx-inspector__k">Index</span><span class="gx-inspector__v" id="gxI">—</span></div>
        <div class="gx-inspector__row"><span class="gx-inspector__k">Base 1</span><span class="gx-inspector__v" id="gxB1">—</span></div>
        <div class="gx-inspector__row"><span class="gx-inspector__k">Base 2</span><span class="gx-inspector__v" id="gxB2">—</span></div>
        <div class="gx-inspector__row"><span class="gx-inspector__k">Pair</span><span class="gx-inspector__v" id="gxPair">—</span></div>
        <div class="gx-inspector__row"><span class="gx-inspector__k">H-bonds</span><span class="gx-inspector__v" id="gxHB">—</span></div>
      </div>
    `;

    visualizer.appendChild(inspectorEl);

    const undoStack = [];
    const redoStack = [];
    let replaying = false;

    const COMP = { A: "T", T: "A", C: "G", G: "C" };

    let s1 = strand1.split("");
    let s2 = strand2.split("");

    const originalS1 = [...s1];
    const originalS2 = [...s2];

    let currentModel = null;
    const api = { onModelChanged: null };

    let ladderEl = null;
    let containerForLadder = null;
    let tooltipEl = null;
    let progressEl = null;
    let progressContainerEl = null;
    let prevEl = null;
    let nextEl = null;
    let panelRefs = null;
    let threeWrap = null;
    let ladderWrap = null;

    let threeApi = null;

    let current = Math.floor(Math.max(1, strand1.length) / 2);
    let lastTx = null;
    let selectedStrand = 1;
    let selectedBaseEl = null;

    const pairs = [];

    const undoBtn = document.getElementById("undo-btn");
    const redoBtn = document.getElementById("redo-btn");

    const nanobot = createNanobotCinematicRepair({
        getPairEl: (i) => pairs[i],
        isMismatch: (i) => (COMP[s1[i]] || "") !== s2[i],
        repairAt,
        focusIndex: (i) => { current = i; updateView(); },
        getCurrentIndex: () => current,
        setCurrentIndex: (i) => { current = i; }
    });

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    function setSelectedBase(el) {
        if (selectedBaseEl) selectedBaseEl.classList.remove("is-selected");
        selectedBaseEl = el;
        if (selectedBaseEl) selectedBaseEl.classList.add("is-selected");
    }

    function isHelixFullscreen() {
        return document.fullscreenElement === threeWrap;
    }

    function withMeta(op) {
        return {
            id: crypto.randomUUID?.() ?? `h_${Date.now()}_${++gxHistoryIdSeed}`,
            timestamp: Date.now(),
            ...op
        };
    }

    function syncTextarea() {
        const dnaSequenceInput = document.getElementById("sequence");
        if (!dnaSequenceInput) return;
        dnaSequenceInput.value = `${s1.join("")}\n${s2.join("")}`;
    }

    function getMutationIndices(a1, a2, b1, b2) {
        const out = [];
        const len = Math.max(a1.length, b1.length, a2.length, b2.length);

        for (let i = 0; i < len; i++) {
            const x1 = a1[i] || "";
            const x2 = a2[i] || "";
            const y1 = b1[i] || "";
            const y2 = b2[i] || "";

            if (x1 !== y1 || x2 !== y2) {
                out.push(i);
            }
        }

        return out;
    }

    function syncCurrentModel() {
        const now = new Date().toISOString();
        const s1Str = s1.join("");
        const s2Str = s2.join("");

        if (!currentModel) currentModel = { version: 1, createdAt: now, updatedAt: now, s1: s1Str, s2: s2Str };
        else currentModel = { ...currentModel, version: 1, updatedAt: now, s1: s1Str, s2: s2Str };

        api.onModelChanged?.(currentModel);
        syncTextarea();
    }

    function syncUndoRedoButtons() {
        if (undoBtn) undoBtn.disabled = undoStack.length === 0;
        if (redoBtn) redoBtn.disabled = redoStack.length === 0;
    }

    function clearRedo() {
        redoStack.length = 0;
        syncUndoRedoButtons();
    }

    function record(op) {
        if (replaying) return;
        undoStack.push(withMeta(op));
        clearRedo();
        syncUndoRedoButtons();
        history.renderHistory();
    }

    function uidOfIndex(i) { return pairs[i]?.dataset?.uid ?? null; }
    function indexOfUid(uid) { return pairs.findIndex(p => p.dataset.uid === uid); }

    function setPairDom(i) {
        const pair = pairs[i];
        if (!pair) return;

        const top = pair.children[0];
        const bot = pair.children[1];

        const b1 = s1[i], b2 = s2[i];

        top.className = `base ${b1}`;
        top.textContent = b1;
        top.dataset.strand = "1";

        bot.className = `base ${b2}`;
        bot.textContent = b2;
        bot.dataset.strand = "2";
    }

    function setMismatchDom(i) {
        const pair = pairs[i];
        if (!pair) return;
        const b1 = s1[i], b2 = s2[i];
        const mismatch = (COMP[b1] || "") !== b2;
        pair.classList.toggle("is-mismatch", mismatch);
    }

    function animateBaseSwap(i, strandNum) {
        const pair = pairs[i];
        if (!pair) return;

        const baseEl = pair.querySelector(`.base[data-strand="${strandNum}"]`);
        if (!baseEl) return;

        baseEl.classList.remove("gx-swap");
        void baseEl.offsetWidth;
        baseEl.classList.add("gx-swap");

        setTimeout(() => baseEl.classList.remove("gx-swap"), 420);
    }

    function refreshAllMismatch() {
        for (let i = 0; i < pairs.length; i++) setMismatchDom(i);
    }

    function reindexPairs(from = 0) {
        for (let k = from; k < pairs.length; k++) pairs[k].dataset.i = String(k);
    }

    function makePairEl(i, uid) {
        const pair = document.createElement("div");
        pair.className = "base-pair";
        pair.dataset.uid = uid ?? (crypto.randomUUID?.() ?? (String(Math.random()).slice(2) + "-" + Date.now()));

        const top = document.createElement("div");
        top.className = `base ${s1[i]}`;
        top.textContent = s1[i];
        top.dataset.strand = "1";

        const bot = document.createElement("div");
        bot.className = `base ${s2[i]}`;
        bot.textContent = s2[i];
        bot.dataset.strand = "2";

        pair.appendChild(top);
        pair.appendChild(bot);
        return pair;
    }

    function bindPairClick(pairEl) {
        pairEl.addEventListener("click", (e) => {
            e.preventDefault();
            onUserNavigate();

            let baseEl = e.target.closest(".base");
            if (!baseEl) baseEl = pairEl.querySelector('.base[data-strand="1"]');

            const strandClicked = baseEl?.dataset?.strand === "2" ? 2 : 1;

            current = Number(pairEl.dataset.i || 0);

            edit.openAt(current, strandClicked);
            updateView();
        });
    }

    function applyMutationByUid(uid, strand, base) {
        const i = indexOfUid(uid);
        if (i < 0) return;
        if (strand === 1) s1[i] = base;
        else s2[i] = base;

        setPairDom(i);
        setMismatchDom(i);
    }

    function insertByOp(op) {
        const idx = Math.max(0, Math.min(op.idx, pairs.length));
        s1.splice(idx, 0, op.b1);
        s2.splice(idx, 0, op.b2);

        const pairEl = makePairEl(idx, op.uid);
        pairs.splice(idx, 0, pairEl);
        ladderEl.insertBefore(pairEl, ladderEl.children[idx] || null);
        bindPairClick(pairEl);

        reindexPairs(idx);
        refreshAllMismatch();
    }

    function deleteByUid(uid) {
        const idx = indexOfUid(uid);
        if (idx < 0) return;
        if (pairs.length <= 1) return;

        s1.splice(idx, 1);
        s2.splice(idx, 1);

        const removed = pairs.splice(idx, 1)[0];
        removed?.remove();

        reindexPairs(idx);
        refreshAllMismatch();
    }

    function moveByUid(uid, toIndex) {
        const from = indexOfUid(uid);
        if (from < 0) return;
        const to = Math.max(0, Math.min(toIndex, pairs.length - 1));
        if (from === to) return;

        const b1 = s1.splice(from, 1)[0];
        const b2 = s2.splice(from, 1)[0];
        s1.splice(to, 0, b1);
        s2.splice(to, 0, b2);

        const el = pairs.splice(from, 1)[0];
        pairs.splice(to, 0, el);

        const refNode = ladderEl.children[to] || null;
        ladderEl.insertBefore(el, refNode);

        reindexPairs(Math.min(from, to));
        refreshAllMismatch();
    }

    function undo() {
        if (!undoStack.length) return;

        const op = undoStack.pop();
        replaying = true;

        try {
            if (op.type === "mutate") applyMutationByUid(op.uid, op.strand, op.from);
            else if (op.type === "insert") deleteByUid(op.uid);
            else if (op.type === "delete") insertByOp(op);
            else if (op.type === "move") moveByUid(op.uid, op.from);

            syncCurrentModel();
            updateView();

            redoStack.push(op);
            syncUndoRedoButtons();
            history.renderHistory();
        } finally {
            replaying = false;
        }
    }

    function redo() {
        if (!redoStack.length) return;

        const op = redoStack.pop();
        replaying = true;

        try {
            if (op.type === "mutate") applyMutationByUid(op.uid, op.strand, op.to);
            else if (op.type === "insert") insertByOp(op);
            else if (op.type === "delete") deleteByUid(op.uid);
            else if (op.type === "move") moveByUid(op.uid, op.to);

            syncCurrentModel();
            updateView();

            undoStack.push(op);
            syncUndoRedoButtons();
            history.renderHistory();
        } finally {
            replaying = false;
        }
    }

    function mutateAt(i, strandNum, newBase) {
        (containerForLadder || visualizer)?.classList.remove("gx-scan-complete");

        if (!COMP[newBase]) return;

        const uid = uidOfIndex(i);
        if (!uid) return;

        const prev = (strandNum === 1) ? s1[i] : s2[i];

        if (strandNum === 1) s1[i] = newBase;
        else s2[i] = newBase;

        setPairDom(i);
        setMismatchDom(i);

        syncCurrentModel();
        updateView();

        record({ type: "mutate", uid, index: i, strand: strandNum, from: prev, to: newBase });
    }

    function insertPairAt(idx, b1, b2) {
        (containerForLadder || visualizer)?.classList.remove("gx-scan-complete");

        const insertAt = Math.max(0, Math.min(idx, pairs.length));

        s1.splice(insertAt, 0, b1);
        s2.splice(insertAt, 0, b2);

        const uid = crypto.randomUUID?.() ?? (String(Math.random()).slice(2) + Date.now());
        const pairEl = makePairEl(insertAt, uid);

        pairs.splice(insertAt, 0, pairEl);
        ladderEl.insertBefore(pairEl, ladderEl.children[insertAt] || null);
        bindPairClick(pairEl);

        reindexPairs(insertAt);
        refreshAllMismatch();
        syncCurrentModel();

        record({ type: "insert", uid, index: insertAt, idx: insertAt, b1, b2 });
    }

    function deletePairAt(idx) {
        (containerForLadder || visualizer)?.classList.remove("gx-scan-complete");

        if (pairs.length <= 1) return;

        const delAt = Math.max(0, Math.min(idx, pairs.length - 1));
        const uid = uidOfIndex(delAt);

        const b1 = s1[delAt];
        const b2 = s2[delAt];

        s1.splice(delAt, 1);
        s2.splice(delAt, 1);

        const removed = pairs.splice(delAt, 1)[0];
        removed?.remove();

        reindexPairs(delAt);
        refreshAllMismatch();
        syncCurrentModel();

        record({ type: "delete", uid, index: delAt, idx: delAt, b1, b2 });
    }

    function movePair(from, to) {
        (containerForLadder || visualizer)?.classList.remove("gx-scan-complete");

        if (to < 0 || to >= pairs.length) return;
        if (from === to) return;

        const uid = uidOfIndex(from);

        const b1 = s1.splice(from, 1)[0];
        const b2 = s2.splice(from, 1)[0];
        s1.splice(to, 0, b1);
        s2.splice(to, 0, b2);

        const el = pairs.splice(from, 1)[0];
        pairs.splice(to, 0, el);

        const refNode = ladderEl.children[to] || null;
        ladderEl.insertBefore(el, refNode);

        const start = Math.min(from, to);
        reindexPairs(start);
        refreshAllMismatch();
        syncCurrentModel();

        record({ type: "move", uid, from, to, index: to });
    }

    function repairAt(i, { silent = false } = {}) {

        if (i < 0 || i >= pairs.length) return;

        const b1 = s1[i];
        const b2 = s2[i];

        const want2 = COMP[b1];
        const want1 = COMP[b2];

        if (want2 === b2) return;

        if (want2) {
            const uid = uidOfIndex(i);
            const prev = s2[i];
            s2[i] = want2;

            setPairDom(i);
            setMismatchDom(i);
            animateBaseSwap(i, 2);
            syncCurrentModel();
            updateView();

            if (!silent) record({ type: "mutate", uid, index: i, strand: 2, from: prev, to: want2, reason: "repair" });
            return;
        }

        if (want1) {
            const uid = uidOfIndex(i);
            const prev = s1[i];
            s1[i] = want1;

            setPairDom(i);
            setMismatchDom(i);
            animateBaseSwap(i, 1);
            syncCurrentModel();
            updateView();

            if (!silent) record({ type: "mutate", uid, index: i, strand: 1, from: prev, to: want1, reason: "repair" });
        }
    }

    function ensureFsBar() {
        let bar = threeWrap.querySelector(".gx-fs__bar");
        if (bar) return bar;

        bar = document.createElement("div");
        bar.className = "gx-fs__bar";
        bar.innerHTML = `
                <button type="button" class="gx-btn gx-btn--primary" id="gx-fs-exit">
                  Exit fullscreen
                </button>
              `;
        threeWrap.appendChild(bar);

        bar.querySelector("#gx-fs-exit")?.addEventListener("click", async () => {
            if (document.fullscreenElement) document.exitFullscreen();
        });

        return bar;
    }

    function buildCommonOverlay(targetMount) {
        const overlay = document.createElement("div");
        overlay.className = "dna-overlay";
        const tip = document.createElement("div");
        tip.className = "dna-tooltip";
        tip.textContent = "";
        overlay.appendChild(tip);
        targetMount.appendChild(overlay);

        const progCont = document.createElement("div");
        progCont.className = "progress-container";
        const progBar = document.createElement("div");
        progBar.className = "progress-bar";
        progCont.appendChild(progBar);
        targetMount.appendChild(progCont);

        const prevBtn = document.createElement("button");
        const nextBtn = document.createElement("button");
        prevBtn.className = "dna-nav";
        nextBtn.className = "dna-nav";
        prevBtn.id = "prev-base";
        nextBtn.id = "next-base";
        prevBtn.textContent = "⟨";
        nextBtn.textContent = "⟩";
        targetMount.appendChild(prevBtn);
        targetMount.appendChild(nextBtn);

        tooltipEl = tip;
        progressEl = progBar;
        progressContainerEl = progCont;
        prevEl = prevBtn;
        nextEl = nextBtn;

        return { overlay, progCont, prevBtn, nextBtn };
    }

    function ensureFullscreenBtn() {
        const legend = document.getElementById("gx-legend-3d");

        const host =
            legend?.parentElement ||
            threeWrap?.querySelector(".gx-helix3d-ui") ||
            document.getElementById("gx-helix-actions") ||
            threeWrap;

        let btn = host?.querySelector("#helix-fullscreen-btn");

        if (!btn) {
            btn = document.createElement("button");
            btn.type = "button";
            btn.id = "helix-fullscreen-btn";
            btn.className = "gx-btn gx-btn--primary";
            btn.textContent = "Fullscreen 3D";

            btn.addEventListener("click", () => {
                if (document.fullscreenElement) {
                    console.log('pukanka')
                    document.exitFullscreen();
                } else {
                    console.log('ebasi maikata')
                    threeWrap.classList.add("gx-fs");
                    ensureFsBar();
                    threeWrap.requestFullscreen();
                    setTimeout(() => threeApi?.refresh?.(), 60);
                }
            });
        }

        if (legend && legend.parentElement) {
            legend.insertAdjacentElement("afterend", btn);
        } else {
            host?.appendChild(btn);
        }

        btn.style.display = "";
        return btn;

    }

    function hideFullscreenBtn() {
        const btn = document.getElementById("helix-fullscreen-btn");
        if (btn) btn.style.display = "none";
    }

    function showFullscreenBtn() {
        const btn = document.getElementById("helix-fullscreen-btn");
        if (btn) btn.style.display = "";
    }

    const scanBtn = document.getElementById("scan-dna-btn");

    function countMismatches() {
        let c = 0;
        for (let i = 0; i < pairs.length; i++) {
            const b1 = s1[i], b2 = s2[i];
            if ((COMP[b1] || "") !== b2) c++;
        }
        return c;
    }

    function setScanUi(on) {
        (containerForLadder || visualizer)?.classList.toggle("gx-scanmode", !!on);

        if (scanBtn) scanBtn.disabled = !!on;
        if (repairAllBtn) repairAllBtn.disabled = !!on || countMismatches() === 0;
        if (undoBtn) undoBtn.disabled = !!on || undoStack.length === 0;
        if (redoBtn) redoBtn.disabled = !!on || redoStack.length === 0;
    }

    function pulsePair(i, kind = "warn") {
        const el = pairs[i];
        if (!el) return;
        el.classList.remove("gx-scan-hit", "gx-scan-warn");
        void el.offsetWidth;

        el.classList.add(kind === "hit" ? "gx-scan-hit" : "gx-scan-warn");
        setTimeout(() => el.classList.remove("gx-scan-hit", "gx-scan-warn"), 520);
    }

    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    let scanRunning = false;
    let scannedOnce = false;

    function setRepairVisibility() {
        if (!repairAllBtn) return;
        repairAllBtn.classList.toggle("is-hidden", !scannedOnce);
    }

    let scanAbort = false;

    let stickyTip = null;
    let stickyTipActive = false;

    function setStickyTip(text) {
        stickyTip = text;
        stickyTipActive = true;
        if (tooltipEl) tooltipEl.textContent = text;
    }

    function renderNormalTipNow() {
        const b1 = s1[current], b2 = s2[current];
        const h =
            (b1 === "A" && b2 === "T") || (b1 === "T" && b2 === "A") ? 2 :
                (b1 === "C" && b2 === "G") || (b1 === "G" && b2 === "C") ? 3 : "-";

        const normalTip = `Base ${current + 1}: ${b1}-${b2} (${h} H)`;
        if (tooltipEl) tooltipEl.textContent = normalTip;
    }

    function clearStickyTip() {
        stickyTip = null;
        stickyTipActive = false;
        renderNormalTipNow();
    }

    function onUserNavigate() {
        clearStickyTip();
        hideScanner?.();
    }

    async function runScanMode() {
        showScanner();

        setStickyTip("Scanning DNA…");

        for (let i = 0; i < pairs.length; i++) {
            if (scanAbort) break;

            current = i;
            updateView();
            positionScannerAtIndex(i);

            pairs[current]?.classList.add("gx-scan-active");
            pairs[current - 1]?.classList.remove("gx-scan-active");

            const isMis = (COMP[s1[i]] || "") !== s2[i];

            if (isMis) {
                pulsePair(i, "hit");
                setStickyTip(`Scan alert: anomaly at base ${i + 1} (${s1[i]}–${s2[i]})`);
                await sleep(260);
            } else {
                if (i % 6 === 0) pulsePair(i, "warn");
                await sleep(110);
            }
        }

        if (!scanAbort) {
            const left = countMismatches();
            setStickyTip(
                left === 0
                    ? "Scan complete ✓ DNA is stable (press ⟨ ⟩ to continue)"
                    : `Scan complete ✓ ${left} anomaly${left === 1 ? "" : "ies"} found (press ⟨ ⟩ to review)`
            );
        }

        hideScanner();
    }

    scanBtn?.addEventListener("click", async () => {
        if (scanRunning) return;

        scanRunning = true;
        scanAbort = false;

        setScanUi(true);

        try {
            await runScanMode();

            if (!scanAbort) {
                scannedOnce = true;
                setRepairVisibility();

                (containerForLadder || visualizer)?.classList.add("gx-scan-complete");
            }
        } finally {
            scanRunning = false;
            setScanUi(false);
        }
    });

    const repairAllBtn = document.getElementById("repair-dna-btn");

    setRepairVisibility();

    function updateRepairAllButton() {
        if (!repairAllBtn) return;
        let count = 0;
        for (let i = 0; i < pairs.length; i++) {
            const b1 = s1[i], b2 = s2[i];
            if ((COMP[b1] || "") !== b2) count++;
        }
        repairAllBtn.disabled = count === 0;
    }

    repairAllBtn.addEventListener("click", async () => {
        closeEditPop();
        await nanobot.run();
        updateView();
    });

    let overlayRefs = null;

    if (scientific) {
        const shell = document.createElement("div");
        shell.className = "dna-shell";

        const left = document.createElement("div");
        left.className = "dna-left";

        const toggle = document.createElement("div");
        toggle.className = "sci-viewtoggle";
        toggle.innerHTML = `
      <button class="sci-tab is-active" data-view="2d">2D Ladder</button>
      <button class="sci-tab" data-view="3d">3D Helix</button>
    `;

        ladderWrap = document.createElement("div");
        ladderWrap.className = "dna-ladder-wrap";

        threeWrap = document.createElement("div");
        threeWrap.className = "dna-3dwrap hidden";

        threeWrap.innerHTML = `<div class="gx-helix3d-ui"></div>`;

        left.appendChild(toggle);
        left.appendChild(ladderWrap);
        left.appendChild(threeWrap);

        const panel = document.createElement("aside");
        panel.className = "dna-science";
        panel.innerHTML = `
      <div class="sci-section">
        <h4>Overview</h4>
        <div class="sci-stats">
          <div><span>Length</span><strong id="s_len">0</strong></div>
          <div><span>GC%</span><strong id="s_gc">0%</strong></div>
          <div><span>Tm (°C)</span><strong id="s_tm">0</strong></div>
          <div><span>A:C:G:T</span><strong id="s_comp">-</strong></div>
        </div>
      </div>
      <div class="sci-section">
        <h4>Active base</h4>
        <div class="sci-active">
          <div><span>Index</span><strong id="s_idx">-</strong></div>
          <div><span>Pair</span><strong id="s_pair">-</strong></div>
          <div><span>Bonds</span><strong id="s_bonds">-</strong></div>
          <div><span>Pur/Pyr</span><strong id="s_type">-</strong></div>
        </div>
      </div>
      <div class="sci-section">
        <h4>Codon (frame 0)</h4>
        <div class="sci-codon">
          <div><span>mRNA</span><strong id="s_codon">-</strong></div>
          <div><span>AA</span><strong id="s_aa">-</strong></div>
        </div>
      </div>
    `;

        panelRefs = {
            s_len: panel.querySelector("#s_len"),
            s_gc: panel.querySelector("#s_gc"),
            s_tm: panel.querySelector("#s_tm"),
            s_comp: panel.querySelector("#s_comp"),
            s_idx: panel.querySelector("#s_idx"),
            s_pair: panel.querySelector("#s_pair"),
            s_bonds: panel.querySelector("#s_bonds"),
            s_type: panel.querySelector("#s_type"),
            s_codon: panel.querySelector("#s_codon"),
            s_aa: panel.querySelector("#s_aa"),
        };

        const ladder = document.createElement("div");
        ladder.className = "dna-ladder";
        ladderWrap.appendChild(ladder);

        shell.appendChild(left);
        shell.appendChild(panel);
        visualizer.appendChild(shell);

        ladderEl = ladder;
        containerForLadder = ladderWrap;

        overlayRefs = buildCommonOverlay(ladderWrap);;

        let block3DPick = false;

        function ensure3D(idx) {
            if (!threeApi) {
                threeApi = mountHelix3D(s1.join(""), s2.join(""), threeWrap, idx ?? current, {
                    detailPanel: true, mutatedIndices: compareMutatedIndices
                });
            }

            threeApi.onPick((seqIndex) => {
                if (block3DPick) return;
                if (isHelixFullscreen()) return;
            });
        }

        function removeFsBar() {
            threeWrap.querySelector(".gx-fs__bar")?.remove();
        }

        function enterFullscreen() {
            if (threeWrap.classList.contains("hidden")) onTab3D();

            threeWrap.classList.add("gx-fs");
            ensureFsBar();

            threeWrap.requestFullscreen?.();

            setTimeout(() => threeApi?.refresh?.(), 60);
        }

        const fsBtn = ensureFullscreenBtn();
        fsBtn.disabled = true;
        fsBtn.style.opacity = "0.55";

        function exitFullscreen() {
            if (document.fullscreenElement) document.exitFullscreen();
        }

        fsBtn?.addEventListener("click", () => {
            if (document.fullscreenElement) exitFullscreen();
            else enterFullscreen();
        });

        document.addEventListener("fullscreenchange", () => {
            const isFs = (document.fullscreenElement === threeWrap);
            block3DPick = isFs;

            if (isFs) {
                threeWrap.classList.add("gx-fs");
                ensureFsBar();
                hideFullscreenBtn();
            } else {
                threeWrap.classList.remove("gx-fs");
                removeFsBar();
                showFullscreenBtn();
            }

            setTimeout(() => threeApi?.refresh?.(), 60);
        });

        const [tab2d, tab3d] = toggle.querySelectorAll(".sci-tab");

        const onTab2D = () => {
            threeWrap.querySelectorAll(".dna-legend").forEach(el => el.remove());
            tab2d.classList.add("is-active");
            tab3d.classList.remove("is-active");
            threeWrap.classList.add("hidden");
            ladderWrap.classList.remove("hidden");

            fsBtn.disabled = true;
            fsBtn.style.opacity = "0.55";

            const legend = document.getElementById("gx-legend-3d");
            if (legend) visualizer.appendChild(legend);

            containerForLadder = ladderWrap;
            progressContainerEl = overlayRefs.progCont;

            ladderWrap.appendChild(overlayRefs.overlay);
            ladderWrap.appendChild(overlayRefs.progCont);
            ladderWrap.appendChild(overlayRefs.prevBtn);
            ladderWrap.appendChild(overlayRefs.nextBtn);

            if (scanOverlay)
                (containerForLadder || visualizer).appendChild(scanOverlay);

            updateView();
        };

        const onTab3D = () => {
            tab3d.classList.add("is-active");
            tab2d.classList.remove("is-active");

            ladderWrap.classList.add("hidden");
            threeWrap.classList.remove("hidden");

            ensure3D(current);
            containerForLadder = threeWrap;

            let legend = threeWrap.querySelector(".dna-legend");

            if (!legend) {
                legend = createLegendOverlay(threeWrap, {
                    baseHex: { A: 0xff4b4b, T: 0xffd54b, C: 0x4ba3ff, G: 0x4bff88 },
                    enableDetail: true,
                    elem: {
                        H: { color: 0xffffff },
                        C: { color: 0x7f7f7f },
                        N: { color: 0x3a74ff },
                        O: { color: 0xff3a3a },
                        P: { color: 0xffa024 }
                    }
                });
            }

            threeWrap.appendChild(overlayRefs.overlay);
            threeWrap.appendChild(overlayRefs.progCont);
            threeWrap.appendChild(overlayRefs.prevBtn);
            threeWrap.appendChild(overlayRefs.nextBtn);

            if (scanOverlay)
                (containerForLadder || visualizer).appendChild(scanOverlay);

            fsBtn.disabled = false;
            fsBtn.style.opacity = "1";

            progressContainerEl = overlayRefs.progCont;

            threeApi?.refresh?.();
            threeApi?.fit?.();
            threeApi?.toIndex?.(current);

            ensureFullscreenBtn();
            updateView();
        };

        tab2d.addEventListener("click", onTab2D);
        tab3d.addEventListener("click", onTab3D);

        const comp = countBases(strand1);
        panelRefs.s_len.textContent = String(strand1.length);
        panelRefs.s_gc.textContent = (gcContent(strand1) * 100).toFixed(1) + "%";
        panelRefs.s_tm.textContent = String(tmWallace(strand1));
        panelRefs.s_comp.textContent = `${comp.A}:${comp.C}:${comp.G}:${comp.T}`;

        var disposeTabs = () => {
            tab2d.removeEventListener("click", onTab2D);
            tab3d.removeEventListener("click", onTab3D);
        };
    } else {
        const ladder = document.createElement("div");
        ladder.className = "dna-ladder";
        visualizer.appendChild(ladder);

        ladderEl = ladder;
        containerForLadder = visualizer;

        overlayRefs = buildCommonOverlay(visualizer);

        var disposeTabs = () => { };
    }

    for (let i = 0; i < s1.length; i++) {
        const pair = document.createElement("div");
        pair.className = "base-pair";
        pair.dataset.i = String(i);
        pair.dataset.uid = crypto.randomUUID?.() ?? (String(Math.random()).slice(2) + "-" + Date.now() + "-" + i);

        const top = document.createElement("div");
        top.className = `base ${s1[i]}`;
        top.textContent = s1[i];
        top.dataset.strand = "1";

        const bot = document.createElement("div");
        bot.className = `base ${s2[i]}`;
        bot.textContent = s2[i];
        bot.dataset.strand = "2";

        pair.appendChild(top);
        pair.appendChild(bot);

        ladderEl.appendChild(pair);
        pairs.push(pair);

        bindPairClick(pair);
        setPairDom(i);
        setMismatchDom(i);
    }

    let posRAF1 = 0, posRAF2 = 0;

    function positionEditPopAtPair(i) {
        const popEl = edit.getEl();
        if (!popEl) return;

        const pair = pairs[i];
        if (!pair) return;

        popEl.style.position = "fixed";

        const r = pair.getBoundingClientRect();

        const popRect = popEl.getBoundingClientRect();
        const popW = popRect.width || 320;
        const popH = popRect.height || 200;

        const gap = 12;
        const pad = 10;

        const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
        const clampPos = (left, top) => ({
            left: clamp(left, pad, window.innerWidth - popW - pad),
            top: clamp(top, pad, window.innerHeight - popH - pad),
        });

        const cx = r.left + r.width / 2;
        const above = clampPos(cx - popW / 2, r.top - popH - gap);

        const overlapsPair = (pos) => {
            const a = { left: pos.left, top: pos.top, right: pos.left + popW, bottom: pos.top + popH };
            return !(a.right < r.left || a.left > r.right || a.bottom < r.top || a.top > r.bottom);
        };

        const hasSpaceAbove = (r.top - popH - gap) >= pad && !overlapsPair(above);

        let pos;

        if (hasSpaceAbove) {
            pos = above;
        } else {
            const below = clampPos(cx - popW / 2, r.bottom + gap);
            const hasSpaceBelow = (r.bottom + popH + gap) <= (window.innerHeight - pad) && !overlapsPair(below);

            if (hasSpaceBelow) {
                pos = below;
            } else {
                const cy = r.top + r.height / 2;
                const leftPos = clampPos(r.left - popW - gap, cy - popH / 2);
                const rightPos = clampPos(r.right + gap, cy - popH / 2);

                if (!overlapsPair(rightPos)) pos = rightPos;
                else if (!overlapsPair(leftPos)) pos = leftPos;
                else pos = below;
            }
        }

        popEl.style.left = `${pos.left}px`;
        popEl.style.top = `${pos.top}px`;
    }

    let scanOverlay = null;
    let scanBeam = null;
    let scanRing = null;

    function ensureScannerOverlay() {
        if (scanOverlay) return;

        scanOverlay = document.createElement("div");
        scanOverlay.className = "gx-scanner is-hidden";
        scanOverlay.innerHTML = `
      <div class="gx-scanner__beam"></div>
      <div class="gx-scanner__ring"></div>
    `;

        scanBeam = scanOverlay.querySelector(".gx-scanner__beam");
        scanRing = scanOverlay.querySelector(".gx-scanner__ring");

        (containerForLadder || visualizer).appendChild(scanOverlay);
    }

    function showScanner() {
        ensureScannerOverlay();
        scanOverlay.classList.remove("is-hidden");
    }

    function hideScanner() {
        scanOverlay?.classList.add("is-hidden");
    }

    function positionScannerAtIndex(i) {
        ensureScannerOverlay();
        const pair = pairs[i];
        if (!pair) return;

        const r = pair.getBoundingClientRect();
        const cx = Math.round(r.left + r.width / 2);
        const cy = Math.round(r.top + r.height / 2);

        scanOverlay.style.position = "fixed";
        scanOverlay.style.left = `${cx}px`;
        scanOverlay.style.top = `${cy}px`;
    }

    function scheduleEditPopPosition(i) {
        if (!edit.isOpen()) return;
        cancelAnimationFrame(posRAF1);
        cancelAnimationFrame(posRAF2);
        posRAF1 = requestAnimationFrame(() => {
            posRAF2 = requestAnimationFrame(() => positionEditPopAtPair(i));
        });
    }

    const edit = createEditPopController({
        getPairEl: (i) => pairs[i],
        getBases: () => ({ s1, s2, COMP }),
        getCurrentIndex: () => current,
        setCurrentIndex: (i) => { current = i; },
        getSelectedStrand: () => selectedStrand,
        setSelectedStrand: (n) => { selectedStrand = n; },
        setSelectedBaseEl: setSelectedBase,
        positionAtIndex: (i) => positionEditPopAtPair(i),
        updateView,
        mutateAt,
        insertPairAt,
        deletePairAt,
        movePair,
        repairAt
    });

    function closeEditPop() { edit.close(); }

    const history = createHistoryController({
        undoStack,
        redoStack,
        getPairs: () => pairs,
        setCurrentIndex: (i) => { current = i; },
        closeEditPop,
        updateView,
        onUndo: undo,
        onRedo: redo,
    });
    history.mount();

    function measureStep() {
        const sample = ladderEl.querySelector(".base-pair");
        if (!sample) return 52;
        const st = getComputedStyle(sample);
        return sample.offsetWidth + parseFloat(st.marginLeft) + parseFloat(st.marginRight);
    }

    function edgeTranslateX(idx) {
        const step = measureStep();
        const totalWidth = pairs.length * step;
        const viewWidth = containerForLadder?.clientWidth ?? 0;
        const targetCenter = (idx + 0.5) * step;

        let tx = viewWidth / 2 - targetCenter;

        const edgeOffset = Math.min(viewWidth * 0.25, 40);
        const maxTx = edgeOffset;
        const minTx = viewWidth - totalWidth - edgeOffset;

        if (totalWidth <= viewWidth) tx = (viewWidth - totalWidth) / 2;
        else tx = Math.max(minTx, Math.min(maxTx, tx));

        return tx;
    }

    function onNext() {
        onUserNavigate();
        if (current < pairs.length - 1) current++;
        closeEditPop();
        updateView();
    }

    function onPrev() {
        onUserNavigate();
        if (current > 0) current--;
        closeEditPop();
        updateView();
    }

    function onProgressClick(e) {
        onUserNavigate();
        const rect = progressContainerEl.getBoundingClientRect();
        current = Math.round(((e.clientX - rect.left) / rect.width) * (pairs.length - 1));
        closeEditPop();
        updateView();
    }

    function updateView() {
        if (!ladderEl) return;

        if (threeApi && typeof threeApi.toIndex === "function") {
            threeApi.toIndex(current, { zoom: false });
        }

        const targetTx = edgeTranslateX(current);
        const prevTx = (lastTx ?? targetTx);
        const dist = Math.abs(targetTx - prevTx);
        const glideMs = Math.max(240, Math.min(1100, dist * 2.0));

        const popWasOpen = edit.isOpen();
        if (popWasOpen) edit.hide();

        ladderEl.style.transition = `transform ${glideMs}ms cubic-bezier(.22,1,.36,1)`;
        ladderEl.style.transform = `translateX(${targetTx}px) translateY(-50%)`;
        ladderEl.dataset.tx = String(targetTx);
        lastTx = targetTx;

        afterLadderSettles(glideMs, () => {
            if (!edit.isOpen()) return;
            edit.syncMeta(current);
            edit.reposition(current);
            edit.show();
        });

        pairs.forEach(p => p.classList.remove("active"));
        const active = pairs[current];
        if (active) {
            active.classList.add("active");

            const b1 = s1[current], b2 = s2[current];
            const h =
                (b1 === "A" && b2 === "T") || (b1 === "T" && b2 === "A") ? 2 :
                    (b1 === "C" && b2 === "G") || (b1 === "G" && b2 === "C") ? 3 : "-";

            const normalTip = `Base ${current + 1}: ${b1}-${b2} (${h} H)`;
            if (tooltipEl)
                tooltipEl.textContent = stickyTipActive ?
                    stickyTip : normalTip;

            if (panelRefs) {
                panelRefs.s_idx.textContent = String(current + 1);
                panelRefs.s_pair.textContent = `${b1}–${b2}`;
                panelRefs.s_bonds.textContent = String(h);
                panelRefs.s_type.textContent = `${purinePyrimidine(b1)}/${purinePyrimidine(b2)}`;
                const { codon, aa } = codonAt(s1.join(""), current, 0);
                panelRefs.s_codon.textContent = codon || "-";
                panelRefs.s_aa.textContent = aa || "-";
            }
        }

        if (progressEl) progressEl.style.width = `${((current + 1) / Math.max(1, pairs.length)) * 100}%`;

        if (edit.isOpen()) {
            edit.syncMeta(current);
            scheduleEditPopPosition(current);
        }

        if (scanRunning)
            positionScannerAtIndex(current);

        updateRepairAllButton();
    }

    function afterLadderSettles(glideMs, cb) {
        if (!glideMs || glideMs < 30) {
            requestAnimationFrame(() => cb());
            return;
        }

        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            ladderEl.removeEventListener("transitionend", onEnd);
            cb();
        };

        const onEnd = (ev) => {
            if (ev.propertyName !== "transform") return;
            finish();
        };

        ladderEl.addEventListener("transitionend", onEnd, { once: true });

        setTimeout(finish, glideMs + 60);
    }

    function onResize() { updateView(); }

    nextEl?.addEventListener("click", onNext);
    prevEl?.addEventListener("click", onPrev);
    progressContainerEl?.addEventListener("click", onProgressClick);
    window.addEventListener("resize", onResize, { passive: true });
    function onUndoClick() { closeEditPop(); undo(); history.renderHistory(); }
    function onRedoClick() { closeEditPop(); redo(); history.renderHistory(); }
    undoBtn?.addEventListener("click", onUndoClick);
    redoBtn?.addEventListener("click", onRedoClick);

    const onPointerDownEditGlobal = (e) => {
        if (!edit.isOpen()) return;
        const t = e.target;
        const popEl = edit.getEl();
        const clickedOnPair = pairs.some(p => p.contains(t));
        if (popEl && !popEl.contains(t) && !clickedOnPair) closeEditPop();
    };
    document.addEventListener("pointerdown", onPointerDownEditGlobal, { capture: true });

    window.mountCompareDNAView = (containerId, s1, s2, mutatedIndices = []) => {
        visualizeDNA(s1, s2, {
            scientific: true,
            containerId,
            compareMutatedIndices: mutatedIndices
        });
    };

    visualizer._disposeAll = () => {
        undoBtn?.removeEventListener("click", onUndoClick);
        redoBtn?.removeEventListener("click", onRedoClick);

        nextEl?.removeEventListener("click", onNext);
        prevEl?.removeEventListener("click", onPrev);
        progressContainerEl?.removeEventListener("click", onProgressClick);
        window.removeEventListener("resize", onResize, { passive: true });

        document.removeEventListener("pointerdown", onPointerDownEditGlobal, { capture: true });
        edit.dispose();

        history.dispose();

        if (nanobot ?? false) {
            nanobot?.dispose();
        }

        disposeTabs?.();
        threeApi?.dispose?.();
        threeApi = null;

        scanAbort = true;

        cancelAnimationFrame(posRAF1);
        cancelAnimationFrame(posRAF2);
    };

    syncCurrentModel();
    syncUndoRedoButtons();
    history.renderHistory();
    updateView();

    api.getModel = () => ({ s1: s1.join(""), s2: s2.join(""), current });

    api.setScientific = (on) => {
        const wantSci = !!on;
        if (wantSci === scientific) return;

        const keepS1 = s1.join("");
        const keepS2 = s2.join("");
        const keepIndex = current;

        visualizer._disposeAll?.();

        const newApi = visualizeDNA(keepS1, keepS2, { scientific: wantSci });
        newApi.onModelChanged = api.onModelChanged;

        return newApi;
    };

    api.setModel = (newS1, newS2) => {
        if (!newS1 || !newS2) return;

        s1 = String(newS1).split("");
        s2 = String(newS2).split("");

        ladderEl.innerHTML = "";
        pairs.length = 0;

        for (let i = 0; i < s1.length; i++) {
            const pair = document.createElement("div");
            pair.className = "base-pair";
            pair.dataset.i = String(i);
            pair.dataset.uid = crypto.randomUUID?.() ?? (String(Math.random()).slice(2) + "-" + Date.now() + "-" + i);

            const top = document.createElement("div");
            top.className = `base ${s1[i]}`;
            top.textContent = s1[i];
            top.dataset.strand = "1";

            const bot = document.createElement("div");
            bot.className = `base ${s2[i]}`;
            bot.textContent = s2[i];
            bot.dataset.strand = "2";

            pair.appendChild(top);
            pair.appendChild(bot);

            ladderEl.appendChild(pair);
            pairs.push(pair);

            bindPairClick(pair);
            setPairDom(i);
            setMismatchDom(i);
        }

        current = Math.max(0, Math.min(current, pairs.length - 1));
        lastTx = null;

        if (threeApi) {
            threeApi.dispose?.();
            threeApi = null;
        }

        syncCurrentModel();
        syncUndoRedoButtons();
        history.renderHistory();
        updateView();
    };

    api.dispose = () => visualizer._disposeAll?.();

    api.getOriginalModel = () => ({
        s1: originalS1.join(""),
        s2: originalS2.join("")
    });

    api.getCurrentModel = () => ({
        s1: s1.join(""),
        s2: s2.join("")
    });

    api.getMutationIndices = () =>
        getMutationIndices(
            originalS1,
            originalS2,
            s1,
            s2
        );

    return api;
}