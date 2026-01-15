import { purinePyrimidine, countBases, gcContent, tmWallace, codonAt } from "./dna-utils.js";
import { mountHelix3D } from "./dna-helix3d.js";
import { createHistoryController } from "./dna-history.js";
import { createEditPopController } from "./dna-editpop.js";
import { createNanobotCinematicRepair } from "./dna-nanobot.js";

let gxHistoryIdSeed = 0;

export function visualizeDNA(strand1, strand2, { scientific = false } = {}) {
    const visualizer = document.getElementById("dna-visual");

    if (!visualizer)
        throw new Error("Missing #dna-visual");

    visualizer._disposeAll?.();
    visualizer._disposeAll = null;

    visualizer.innerHTML = "";
    visualizer.classList.toggle("mode--sci", scientific);

    const undoStack = [];
    const redoStack = [];
    let replaying = false;

    const COMP = { A: "T", T: "A", C: "G", G: "C" };

    let s1 = strand1.split("");
    let s2 = strand2.split("");

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

    function clamp(v, min, max)
    {
        return Math.max(min, Math.min(max, v));
    }

    function setSelectedBase(el) {
        if (selectedBaseEl) selectedBaseEl.classList.remove("is-selected");
        selectedBaseEl = el;
        if (selectedBaseEl) selectedBaseEl.classList.add("is-selected");
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
    function buildCommonOverlay(targetMount) {
        const overlay = document.createElement("div");
        overlay.className = "dna-overlay";
        const tip = document.createElement("div");
        tip.className = "dna-tooltip";
        tip.textContent = "Ready.";
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

    const repairAllBtn = document.getElementById("repair-dna-btn");

    function updateRepairAllButton() {
        if (!repairAllBtn) return;
        let count = 0;
        for (let i = 0; i < pairs.length; i++) {
            const b1 = s1[i], b2 = s2[i];
            if ((COMP[b1] || "") !== b2) count++;
        }
        repairAllBtn.disabled = count === 0;
        repairAllBtn.textContent = count ? `Repair DNA (${count})` : "Repair DNA";
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

        overlayRefs = buildCommonOverlay(ladderWrap);

        function ensure3D(idx) {
            if (!threeApi) threeApi = mountHelix3D(strand1, strand2, threeWrap, idx ?? current);
        }

        const [tab2d, tab3d] = toggle.querySelectorAll(".sci-tab");

        const onTab2D = () => {
            tab2d.classList.add("is-active");
            tab3d.classList.remove("is-active");
            threeWrap.classList.add("hidden");
            ladderWrap.classList.remove("hidden");

            containerForLadder = ladderWrap;

            ladderWrap.appendChild(overlayRefs.overlay);
            ladderWrap.appendChild(overlayRefs.progCont);
            ladderWrap.appendChild(overlayRefs.prevBtn);
            ladderWrap.appendChild(overlayRefs.nextBtn);

            updateView();
        };

        const onTab3D = () => {
            tab3d.classList.add("is-active");
            tab2d.classList.remove("is-active");
            ladderWrap.classList.add("hidden");
            threeWrap.classList.remove("hidden");

            ensure3D(current);
            containerForLadder = threeWrap;

            threeWrap.appendChild(overlayRefs.overlay);
            threeWrap.appendChild(overlayRefs.progCont);
            threeWrap.appendChild(overlayRefs.prevBtn);
            threeWrap.appendChild(overlayRefs.nextBtn);

            threeApi?.refresh?.();
            threeApi?.frameAll?.();
            threeApi?.snapToIndex?.(current);

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
        updateView
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

    function updateView() {
        if (!ladderEl) return;

        if (threeApi && typeof threeApi.toIndex === "function") {
            threeApi.toIndex(current);
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

        ladderEl.style.transition = `transform ${glideMs}ms cubic-bezier(.22,1,.36,1)`;
        ladderEl.style.transform = `translateX(${targetTx}px) translateY(-50%)`;
        lastTx = targetTx;

        pairs.forEach(p => p.classList.remove("active"));
        const active = pairs[current];
        if (active) {
            active.classList.add("active");

            const b1 = s1[current], b2 = s2[current];
            const h =
                (b1 === "A" && b2 === "T") || (b1 === "T" && b2 === "A") ? 2 :
                    (b1 === "C" && b2 === "G") || (b1 === "G" && b2 === "C") ? 3 : "-";

            if (tooltipEl) tooltipEl.textContent = `Base ${current + 1}: ${b1}-${b2} (${h} H)`;

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

    function onNext() {
        if (current < pairs.length - 1) current++;
        closeEditPop();
        updateView();
    }
    function onPrev() {
        if (current > 0) current--;
        closeEditPop();
        updateView();
    }
    function onProgressClick(e) {
        const rect = progressContainerEl.getBoundingClientRect();
        current = Math.round(((e.clientX - rect.left) / rect.width) * (pairs.length - 1));
        closeEditPop();
        updateView();
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

        cancelAnimationFrame(posRAF1);
        cancelAnimationFrame(posRAF2);
    };

    syncCurrentModel();
    syncUndoRedoButtons();
    history.renderHistory();
    updateView();

    return api;
}