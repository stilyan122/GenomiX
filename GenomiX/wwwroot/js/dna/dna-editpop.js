export function createEditPopController({
    getPairEl, getBases, getCurrentIndex, setCurrentIndex, getSelectedStrand,      
    setSelectedStrand, setSelectedBaseEl, positionAtIndex, updateView,             
    mutateAt, insertPairAt, deletePairAt, movePair,               
}) {
    let pop = null;
    let open = false;

    let insertMode = false;
    let insertIdx = 0;
    let pick1 = null;

    let mutBox = null;
    let moveBox = null;
    let pickHint = null;

    function ensure() {
        if (pop) return pop;

        pop = document.createElement("div");
        pop.className = "gx-editpop is-hidden";
        pop.innerHTML = `
          <div class="gx-editpop__head">
            <div class="gx-editpop__title">Edit base pair</div>
            <button class="gx-editpop__x" type="button" aria-label="Close">×</button>
          </div>

          <div class="gx-editpop__meta">
            <span class="gx-editpop__chip mono" data-role="idx">#-</span>
            <span class="gx-editpop__chip mono" data-role="pair">-–-</span>
            <span class="gx-editpop__badge" data-role="badge" hidden>Mismatch</span>
          </div>

          <div class="gx-editpop__actions">
            <button class="gx-editpop__pill" type="button" data-act="mutate">Mutate</button>
            <button class="gx-editpop__pill" type="button" data-act="insert">Insert</button>
            <button class="gx-editpop__pill" type="button" data-act="delete">Delete</button>
            <button class="gx-editpop__pill" type="button" data-act="move">Move</button>
          </div>

          <div class="gx-mutate is-hidden" data-role="mutbox">
            <div class="gx-mutate__hint" data-role="pickhint">Pick base</div>
            <div class="gx-mutate__choices">
              <button class="gx-mutate__b" data-base="A">A</button>
              <button class="gx-mutate__b" data-base="T">T</button>
              <button class="gx-mutate__b" data-base="C">C</button>
              <button class="gx-mutate__b" data-base="G">G</button>
            </div>
          </div>

          <div class="gx-move is-hidden" data-role="movebox">
            <div class="gx-move__row">
              <button class="gx-move__btn" type="button" data-move="left">← Left</button>
              <button class="gx-move__btn" type="button" data-move="right">Right →</button>
            </div>
          </div>
        `;

        document.body.appendChild(pop);

        mutBox = pop.querySelector('[data-role="mutbox"]');
        moveBox = pop.querySelector('[data-role="movebox"]');
        pickHint = pop.querySelector('[data-role="pickhint"]');

        const setHint = (t) => { if (pickHint) pickHint.textContent = t; };

        function openPicker() {
            moveBox?.classList.add("is-hidden");
            mutBox?.classList.remove("is-hidden");
            mutBox?.classList.add("is-open");
        }
        function closePicker() {
            mutBox?.classList.add("is-hidden");
            mutBox?.classList.remove("is-open");
            insertMode = false;
            pick1 = null;
            mutBox?.classList.remove("has-first-pick");
            setHint("Pick base");
        }
        function openMoveBox() {
            mutBox?.classList.add("is-hidden");
            mutBox?.classList.remove("is-open");
            moveBox?.classList.remove("is-hidden");
        }
        function closeMoveBox() { moveBox?.classList.add("is-hidden"); }
        function toggleMoveBox() {
            const isOpen = moveBox && !moveBox.classList.contains("is-hidden");
            if (isOpen) closeMoveBox();
            else openMoveBox();
        }

        pop.querySelector(".gx-editpop__x")?.addEventListener("click", () => close());

        pop.querySelector('[data-act="mutate"]')?.addEventListener("click", () => {
            closeMoveBox();
            insertMode = false;
            pick1 = null;
            mutBox?.classList.remove("has-first-pick");
            if (mutBox?.classList.contains("is-open")) closePicker();
            else openPicker();
        });

        pop.querySelector('[data-act="insert"]')?.addEventListener("click", () => {
            closeMoveBox();
            insertMode = true;
            pick1 = null;
            mutBox?.classList.remove("has-first-pick");

            insertIdx = getCurrentIndex() + 1;
            setHint("Insert: pick base for strand 1");

            if (mutBox?.classList.contains("is-open")) closePicker();
            else openPicker();
        });

        pop.querySelector('[data-act="delete"]')?.addEventListener("click", () => {
            const idx = getCurrentIndex();
            deletePairAt(idx);
            const nextIdx = Math.max(0, Math.min(idx, getPairCount() - 1));
            setCurrentIndex(nextIdx);
            close();
            closePicker();
            updateView();
        });

        pop.querySelector('[data-act="move"]')?.addEventListener("click", () => {
            toggleMoveBox();
        });

        moveBox?.querySelectorAll("[data-move]")?.forEach(btn => {
            btn.addEventListener("click", () => {
                const dir = btn.getAttribute("data-move");
                const from = getCurrentIndex();
                const to = dir === "left" ? from - 1 : from + 1;

                movePair(from, to);
                const clamped = Math.max(0, Math.min(to, getPairCount() - 1));
                setCurrentIndex(clamped);
                syncMeta(clamped);
                positionAtIndex(clamped);
                updateView();
            });
        });

        pop.querySelectorAll(".gx-mutate__b")?.forEach(btn => {
            btn.addEventListener("click", () => {
                const b = btn.getAttribute("data-base");
                if (!b) return;

                const current = getCurrentIndex();

                if (!insertMode) {
                    mutateAt(current, getSelectedStrand(), b);
                    closePicker();
                    return;
                }

                if (pick1 === null) {
                    pick1 = b;
                    mutBox?.classList.add("has-first-pick");
                    setHint("Insert: pick base for strand 2");
                    return;
                }

                mutBox?.classList.remove("has-first-pick");
                setHint("Insert: pick base for strand 1");

                const pickedTop = pick1;
                const pickedBottom = b;

                insertPairAt(Math.min(insertIdx, getPairCount()), pickedTop, pickedBottom);
                setCurrentIndex(Math.min(insertIdx, getPairCount() - 1));

                close();
                closePicker();
                updateView();
            });
        });

        return pop;
    }

    function getPairCount() {
        const first = getPairEl(0);
        if (!first) return 0;
        const ladder = first.parentElement;
        return ladder ? ladder.children.length : 0;
    }

    function syncMeta(i) {
        if (!pop) return;
        const { s1, s2, COMP } = getBases();
        const idxEl = pop.querySelector('[data-role="idx"]');
        const pairEl = pop.querySelector('[data-role="pair"]');
        const badge = pop.querySelector('[data-role="badge"]');

        const b1 = s1[i], b2 = s2[i];
        if (idxEl) idxEl.textContent = `#${i + 1}`;
        if (pairEl) pairEl.textContent = `${b1}–${b2}`;

        const mismatch = (COMP[b1] || "") !== b2;
        if (badge) badge.hidden = !mismatch;
    }

    function openAt(i, strandClicked = 1) {
        ensure();

        setSelectedStrand(strandClicked);

        const pair = getPairEl(i);
        const baseEl = pair?.querySelector(`.base[data-strand="${strandClicked}"]`)
            ?? pair?.querySelector('.base[data-strand="1"]')
            ?? null;

        setSelectedBaseEl(baseEl);

        mutBox?.classList.remove("is-open");
        mutBox?.classList.add("is-hidden");
        mutBox?.classList.remove("has-first-pick");
        moveBox?.classList.add("is-hidden");
        insertMode = false;
        pick1 = null;

        syncMeta(i);

        open = true;
        pop.classList.remove("is-hidden");
        pop.getBoundingClientRect();
        positionAtIndex(i);
    }

    function close() {
        open = false;
        pop?.classList.add("is-hidden");
    }

    function isOpen() { return open; }
    function getEl() { return pop; }

    function dispose() {

        pop?.remove();
        pop = null;
        open = false;
        mutBox = null;
        moveBox = null;
        pickHint = null;
    }
    function hide() {
        pop?.classList.add("is-hidden");
    }

    function show() {
        if (!open || !pop) return;
        pop.classList.remove("is-hidden");
    }

    function reposition(i) {
        if (!open || !pop) return;

        pop.getBoundingClientRect();
        positionAtIndex(i);
    }

    return { openAt, close, syncMeta, isOpen, getEl, hide, show, reposition, dispose };
}