export function createHistoryController({
    undoStack,
    redoStack,
    getPairs,
    setCurrentIndex,
    closeEditPop,
    updateView
}) {
    let historyPop = null;
    let historyOpen = false;
    let histList = null, histMeta = null, histEmpty = null, histUndoCount = null, histRedoCount = null;

    const historyBtn = document.getElementById("history-btn");

    function labelForOp(op) {
        switch (op.type) {
            case "mutate": return `Mutate strand ${op.strand}: ${op.from} → ${op.to}`;
            case "insert": return `Insert ${op.b1}-${op.b2}`;
            case "delete": return `Delete ${op.b1}-${op.b2}`;
            case "move": return `Move base`;
            default: return op.type;
        }
    }

    function subForOp(op) {
        const idx = (op.index ?? op.idx);
        const baseTxt = (idx != null) ? `Base #${idx + 1}` : `—`;
        const t = op.timestamp ? new Date(op.timestamp).toLocaleTimeString() : "";
        return `${baseTxt}${t ? " • " + t : ""}`;
    }

    function positionHistoryPop() {
        if (!historyPop) return;
        const r = historyBtn?.getBoundingClientRect?.();
        historyPop.style.position = "fixed";

        const pad = 10;
        const w = historyPop.getBoundingClientRect().width || 420;
        const h = historyPop.getBoundingClientRect().height || 420;

        let left = r ? (r.right - w) : (window.innerWidth - w - 18);
        let top = r ? (r.bottom + 10) : 92;

        left = Math.max(pad, Math.min(window.innerWidth - w - pad, left));
        top = Math.max(pad, Math.min(window.innerHeight - h - pad, top));

        historyPop.style.left = `${left}px`;
        historyPop.style.top = `${top}px`;
    }

    function buildHistoryPop() {
        const pop = document.createElement("div");
        pop.className = "gx-hpop is-hidden";
        pop.innerHTML = `
          <div class="gx-hpop__head">
            <div class="gx-hpop__title">History</div>
            <div class="gx-hpop__meta" id="gx-history-meta">0 actions</div>
            <button class="gx-hpop__x" type="button" aria-label="Close">×</button>
          </div>
          <div class="gx-hpop__sub">
            <span class="gx-hcount">Undo: <strong id="gx-hist-undo-count">0</strong></span>
            <span class="gx-hcount">Redo: <strong id="gx-hist-redo-count">0</strong></span>
          </div>
          <div class="gx-hpop__body">
            <div class="gx-hpop__empty" id="gx-hist-empty" hidden>No actions yet.</div>
            <div class="gx-history__list" id="gx-history-list"></div>
          </div>
        `;

        pop.querySelector(".gx-hpop__x")?.addEventListener("click", closeHistory);

        histList = pop.querySelector("#gx-history-list");
        histMeta = pop.querySelector("#gx-history-meta");
        histEmpty = pop.querySelector("#gx-hist-empty");
        histUndoCount = pop.querySelector("#gx-hist-undo-count");
        histRedoCount = pop.querySelector("#gx-hist-redo-count");

        return pop;
    }

    function openHistory() {
        if (!historyPop) {
            historyPop = buildHistoryPop();
            document.body.appendChild(historyPop);
        }
        historyOpen = true;
        historyPop.classList.remove("is-hidden");
        positionHistoryPop();
        renderHistory();
    }

    function closeHistory() {
        historyOpen = false;
        historyPop?.classList.add("is-hidden");
    }

    function toggleHistory() {
        if (historyOpen) closeHistory();
        else openHistory();
    }

    function renderHistory() {
        if (!histList) return;
        histList.innerHTML = "";

        const undoView = [...undoStack].reverse().map(op => ({ op, lane: "undo" }));
        const redoView = [...redoStack].reverse().map(op => ({ op, lane: "redo" }));
        const all = [...undoView, ...redoView];

        const total = all.length;
        if (histMeta) histMeta.textContent = `${total} action${total === 1 ? "" : "s"}`;

        const pairs = getPairs();
        for (const { op, lane } of all) {
            const el = document.createElement("div");
            el.className =
                `gx-hitem gx-hitem--${op.type} ` +
                (lane === "redo" ? "gx-hitem--redoable" : "gx-hitem--undoable");

            el.innerHTML = `
                <div class="gx-hitem__left">
                  <div class="gx-hitem__top">${labelForOp(op)}</div>
                  <div class="gx-hitem__sub">${subForOp(op)}</div>
                </div>
                <div class="gx-hitem__tag">${op.type}</div>
              `;

            el.addEventListener("click", () => {
                const idx = (op.index ?? op.idx);
                if (typeof idx === "number" && idx >= 0 && idx < pairs.length) {
                    setCurrentIndex(idx);
                    closeEditPop();
                    updateView();
                }
            });

            histList.appendChild(el);
        }

        if (histUndoCount) histUndoCount.textContent = String(undoStack.length);
        if (histRedoCount) histRedoCount.textContent = String(redoStack.length);
        if (histEmpty) histEmpty.hidden = total !== 0;
    }

    const onPointerDownHistory = (e) => {
        if (!historyOpen || !historyPop) return;
        const t = e.target;
        if (historyPop.contains(t)) return;
        if (historyBtn && historyBtn.contains(t)) return;
        closeHistory();
    };

    function onHistoryBtnClick() { toggleHistory(); }

    function mount() {
        historyBtn?.addEventListener("click", onHistoryBtnClick);
        document.addEventListener("pointerdown", onPointerDownHistory, { capture: true });
    }

    function dispose() {
        historyBtn?.removeEventListener("click", onHistoryBtnClick);
        document.removeEventListener("pointerdown", onPointerDownHistory, { capture: true });

        historyPop?.remove();
        historyPop = null;
        historyOpen = false;

        histList = histMeta = histEmpty = histUndoCount = histRedoCount = null;
    }

    return { mount, dispose, renderHistory, closeHistory };
}