export function createHistoryController({
    undoStack,
    redoStack,
    getPairs,
    setCurrentIndex,
    closeEditPop,
    updateView,
    onUndo,    
    onRedo,    
}) {
    let panel = null;
    let panelOpen = false;
    let activeFilter = "all";
    let sessionStart = null;   
    let tickTimer = null;

    const historyBtn = document.getElementById("history-btn");

    const OP_META = {
        mutate: { label: "Substitution", short: "SUB", color: "#7090ff", icon: "⇄" },
        insert: { label: "Insertion", short: "INS", color: "#44e887", icon: "+" },
        delete: { label: "Deletion", short: "DEL", color: "#ff5566", icon: "−" },
        move: { label: "Move", short: "MOV", color: "#ffd54f", icon: "↕" },
    };

    function meta(type) { return OP_META[type] ?? { label: type, short: type, color: "#aaa", icon: "•" }; }

    const BASE_COLOR = { A: "#5fe8a0", T: "#ff7b7b", C: "#7ca8ff", G: "#ffd97a" };
    function baseHtml(b) {
        const col = BASE_COLOR[b] ?? "#ccc";
        return `<span class="gx-tl-base" style="--bc:${col}">${b}</span>`;
    }

    function describeOp(op) {
        switch (op.type) {
            case "mutate":
                return `Strand ${op.strand} · pos <strong>${(op.index ?? 0) + 1}</strong> · ${baseHtml(op.from)} → ${baseHtml(op.to)}${op.reason === "repair" ? ' <span class="gx-tl-tag-repair">repair</span>' : ""}`;
            case "insert":
                return `pos <strong>${(op.index ?? 0) + 1}</strong> · inserted ${baseHtml(op.b1)}–${baseHtml(op.b2)}`;
            case "delete":
                return `pos <strong>${(op.index ?? 0) + 1}</strong> · removed ${baseHtml(op.b1)}–${baseHtml(op.b2)}`;
            case "move":
                return `pos <strong>${(op.from ?? 0) + 1}</strong> → pos <strong>${(op.to ?? 0) + 1}</strong>`;
            default:
                return op.type;
        }
    }

    function fmtDuration(ms) {
        const s = Math.floor(ms / 1000);
        if (s < 60) return `${s}s`;
        const m = Math.floor(s / 60), ss = s % 60;
        if (m < 60) return `${m}m ${ss}s`;
        const h = Math.floor(m / 60), mm = m % 60;
        return `${h}h ${mm}m`;
    }

    function fmtRelTime(ts) {
        const diff = Date.now() - ts;
        const s = Math.floor(diff / 1000);
        if (s < 5) return "just now";
        if (s < 60) return `${s}s ago`;
        const m = Math.floor(s / 60);
        if (m < 60) return `${m}m ago`;
        return `${Math.floor(m / 60)}h ago`;
    }

    function fmtTimestamp(ts) {
        return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    }

    function computeStats() {
        const all = [...undoStack, ...redoStack];
        const byType = {};
        let netLen = 0;
        const positions = new Set();

        all.forEach(op => {
            byType[op.type] = (byType[op.type] || 0) + 1;
            if (op.type === "insert") netLen++;
            if (op.type === "delete") netLen--;
            const idx = op.index ?? op.idx ?? op.from ?? null;
            if (idx != null) positions.add(idx);
        });

        return { total: all.length, byType, netLen, positions: positions.size };
    }

    function makeStrip(opIndex, seqLen, opType) {
        const W = 200, H = 12;
        const safLen = Math.max(1, seqLen);
        const pct = Math.min(1, Math.max(0, opIndex / safLen));
        const px = Math.round(pct * (W - 6)) + 3;
        const col = meta(opType).color;

        return `<svg class="gx-tl-strip" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">
            <rect x="0" y="4" width="${W}" height="4" rx="2" fill="rgba(255,255,255,0.07)"/>
            <rect x="${px - 3}" y="1" width="6" height="10" rx="3" fill="${col}" opacity="0.85"/>
            <rect x="${px - 1}" y="3" width="2" height="6" rx="1" fill="white" opacity="0.6"/>
        </svg>`;
    }

    function buildTextReport() {
        const stats = computeStats();
        const all = [...undoStack].reverse();
        const lines = ["=== GenomiX Mutation Timeline ===",
            `Date: ${new Date().toLocaleString()}`,
            `Total edits: ${stats.total}  |  Net bp change: ${stats.netLen >= 0 ? "+" : ""}${stats.netLen}  |  Positions touched: ${stats.positions}`,
            ""];

        all.forEach((op, i) => {
            const m = meta(op.type);
            const pos = (op.index ?? op.idx ?? op.from ?? "?") + 1;
            let detail = "";
            if (op.type === "mutate") detail = `strand ${op.strand}: ${op.from} → ${op.to}`;
            if (op.type === "insert") detail = `+${op.b1}-${op.b2}`;
            if (op.type === "delete") detail = `-${op.b1}-${op.b2}`;
            if (op.type === "move") detail = `${(op.from ?? 0) + 1} → ${(op.to ?? 0) + 1}`;
            lines.push(`${String(i + 1).padStart(3, " ")}.  [${m.short}]  pos ${String(pos).padStart(5)}  ${detail.padEnd(20)}  ${fmtTimestamp(op.timestamp)}`);
        });

        return lines.join("\n");
    }

    function jumpToPos(op) {
        const idx = op.index ?? op.idx ?? op.from ?? null;
        if (idx == null) return;
        setCurrentIndex(idx);
        closeEditPop();
        updateView();
    }

    function undoToEntry(undoStackIndex) {
        if (!onUndo) return;
        const steps = undoStack.length - 1 - undoStackIndex;
        for (let i = 0; i < steps; i++) onUndo();
    }

    function redoToEntry(redoStackIndex) {
        if (!onRedo) return;
        const steps = redoStack.length - redoStackIndex;
        for (let i = 0; i < steps; i++) onRedo();
    }

    function buildPanel() {
        const el = document.createElement("div");
        el.id = "gx-timeline-panel";
        el.className = "gx-tl-panel";
        el.innerHTML = `
            <div class="gx-tl-header">
                <div class="gx-tl-header__left">
                    <span class="gx-tl-header__icon">🧬</span>
                    <span class="gx-tl-header__title">Mutation Timeline</span>
                </div>
                <button class="gx-tl-header__close" id="gx-tl-close" aria-label="Close">✕</button>
            </div>

            <div class="gx-tl-stats" id="gx-tl-stats">
                <div class="gx-tl-stat">
                    <div class="gx-tl-stat__v" id="gx-tls-total">0</div>
                    <div class="gx-tl-stat__k">edits</div>
                </div>
                <div class="gx-tl-stat">
                    <div class="gx-tl-stat__v" id="gx-tls-net">+0 bp</div>
                    <div class="gx-tl-stat__k">net change</div>
                </div>
                <div class="gx-tl-stat">
                    <div class="gx-tl-stat__v" id="gx-tls-pos">0</div>
                    <div class="gx-tl-stat__k">positions</div>
                </div>
                <div class="gx-tl-stat">
                    <div class="gx-tl-stat__v" id="gx-tls-time">—</div>
                    <div class="gx-tl-stat__k">session</div>
                </div>
            </div>

            <div class="gx-tl-filters" id="gx-tl-filters">
                <button class="gx-tl-filter is-active" data-filter="all">All</button>
                <button class="gx-tl-filter gx-tl-filter--mutate" data-filter="mutate">Sub</button>
                <button class="gx-tl-filter gx-tl-filter--insert" data-filter="insert">Ins</button>
                <button class="gx-tl-filter gx-tl-filter--delete" data-filter="delete">Del</button>
                <button class="gx-tl-filter gx-tl-filter--move"   data-filter="move">Mov</button>
            </div>

            <div class="gx-tl-body" id="gx-tl-body">
                <div class="gx-tl-empty" id="gx-tl-empty">
                    <div class="gx-tl-empty__icon">✏️</div>
                    <div class="gx-tl-empty__text">No edits yet.<br>Start modifying your DNA to see the timeline.</div>
                </div>
            </div>

            <div class="gx-tl-footer">
                <button class="gx-tl-footer-btn gx-tl-footer-btn--copy" id="gx-tl-copy">📋 Copy report</button>
                <div class="gx-tl-footer-count" id="gx-tl-footer-count"></div>
            </div>
        `;

        document.body.appendChild(el);

        el.querySelector("#gx-tl-close")?.addEventListener("click", closePanel);

        el.querySelector("#gx-tl-filters")?.addEventListener("click", e => {
            const btn = e.target.closest("[data-filter]");
            if (!btn) return;
            activeFilter = btn.dataset.filter;
            el.querySelectorAll(".gx-tl-filter").forEach(b => b.classList.toggle("is-active", b.dataset.filter === activeFilter));
            renderTimeline();
        });

        el.querySelector("#gx-tl-copy")?.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(buildTextReport());
                const btn = el.querySelector("#gx-tl-copy");
                const orig = btn.textContent;
                btn.textContent = "✓ Copied!";
                setTimeout(() => { btn.textContent = orig; }, 1800);
            } catch { }
        });

        return el;
    }

    function renderEntry({ op, lane, stepNum, undoIdx, redoIdx, seqLen }) {
        const m = meta(op.type);
        const isUndo = lane === "undo";
        const el = document.createElement("div");
        const opIndex = op.index ?? op.idx ?? op.from ?? 0;

        el.className = `gx-tl-entry gx-tl-entry--${op.type} ${isUndo ? "" : "gx-tl-entry--undone"}`;
        el.dataset.opId = op.id;

        const stepsAway = isUndo
            ? (undoIdx != null ? undoStack.length - 1 - undoIdx : null)
            : (redoIdx != null ? redoStack.length - redoIdx : null);

        const jumpBtn = (typeof opIndex === "number")
            ? `<button class="gx-tl-act gx-tl-act--goto" data-action="goto">Go to pos</button>`
            : "";

        let restoreBtn = "";
        if (onUndo && isUndo && stepsAway > 0)
            restoreBtn = `<button class="gx-tl-act gx-tl-act--undo" data-action="undo-to">Undo to here</button>`;
        if (onRedo && !isUndo)
            restoreBtn = `<button class="gx-tl-act gx-tl-act--redo" data-action="redo-to">Redo to here</button>`;

        el.innerHTML = `
            <div class="gx-tl-entry__track">
                <div class="gx-tl-entry__dot" style="--dc:${m.color}">
                    <span class="gx-tl-entry__dot-icon">${m.icon}</span>
                </div>
                <div class="gx-tl-entry__line"></div>
            </div>

            <div class="gx-tl-entry__card">
                <div class="gx-tl-entry__top">
                    <span class="gx-tl-badge" style="--bc:${m.color}">${m.short}</span>
                    <span class="gx-tl-entry__step">#${stepNum}</span>
                    <span class="gx-tl-entry__time" title="${fmtTimestamp(op.timestamp)}">${fmtRelTime(op.timestamp)}</span>
                    ${!isUndo ? `<span class="gx-tl-entry__undone-tag">undone</span>` : ""}
                </div>

                <div class="gx-tl-entry__desc">${describeOp(op)}</div>

                <div class="gx-tl-entry__strip" title="Position in sequence">
                    ${makeStrip(opIndex, seqLen, op.type)}
                    <span class="gx-tl-entry__strip-label">pos ${opIndex + 1} / ${seqLen}</span>
                </div>

                ${(jumpBtn || restoreBtn) ? `<div class="gx-tl-entry__actions">${jumpBtn}${restoreBtn}</div>` : ""}
            </div>
        `;

        el.addEventListener("click", e => {
            const action = e.target.closest("[data-action]")?.dataset.action;
            if (!action) return;
            e.stopPropagation();

            if (action === "goto") {
                jumpToPos(op);
            } else if (action === "undo-to" && undoIdx != null) {
                undoToEntry(undoIdx);
            } else if (action === "redo-to" && redoIdx != null) {
                redoToEntry(redoIdx);
            }
        });

        return el;
    }

    function renderTimeline() {
        if (!panel) return;

        const body = panel.querySelector("#gx-tl-body");
        const empty = panel.querySelector("#gx-tl-empty");
        const footCount = panel.querySelector("#gx-tl-footer-count");

        if (!body) return;

        const stats = computeStats();
        const seqLen = getPairs().length;
        panel.querySelector("#gx-tls-total").textContent = stats.total;
        panel.querySelector("#gx-tls-net").textContent = (stats.netLen >= 0 ? "+" : "") + stats.netLen + " bp";
        panel.querySelector("#gx-tls-pos").textContent = stats.positions;
        if (sessionStart) {
            panel.querySelector("#gx-tls-time").textContent = fmtDuration(Date.now() - sessionStart);
        }

        const entries = [];
        let globalStep = undoStack.length + redoStack.length;

        for (let i = undoStack.length - 1; i >= 0; i--) {
            entries.push({ op: undoStack[i], lane: "undo", stepNum: globalStep--, undoIdx: i, redoIdx: null });
        }

        entries.push({ divider: true });

        for (let j = redoStack.length - 1; j >= 0; j--) {
            entries.push({ op: redoStack[j], lane: "redo", stepNum: globalStep--, undoIdx: null, redoIdx: j });
        }

        const filtered = entries.filter(e => e.divider || activeFilter === "all" || e.op.type === activeFilter);

        body.innerHTML = "";

        if (stats.total === 0) {
            body.appendChild(empty || document.createElement("div"));
            if (empty) { empty.hidden = false; body.appendChild(empty); }
            if (footCount) footCount.textContent = "";
            return;
        }

        if (empty) empty.hidden = true;

        let renderedCount = 0;

        filtered.forEach(e => {
            if (e.divider) {
                const div = document.createElement("div");
                div.className = "gx-tl-divider";
                div.innerHTML = `<span class="gx-tl-divider__label">▶ Current state</span>`;
                body.appendChild(div);
                return;
            }
            renderedCount++;
            body.appendChild(renderEntry({ ...e, seqLen }));
        });

        if (footCount) footCount.textContent = renderedCount > 0 ? `${renderedCount} entries` : "";
    }

    function startTick() {
        if (tickTimer) return;
        tickTimer = setInterval(() => {
            if (!panelOpen || !panel) return;
            if (!sessionStart) return;
            const el = panel.querySelector("#gx-tls-time");
            if (el) el.textContent = fmtDuration(Date.now() - sessionStart);
        }, 1000);
    }

    function openPanel() {
        if (!panel) panel = buildPanel();
        panelOpen = true;
        panel.classList.add("is-open");
        historyBtn?.classList.add("is-active");
        const panelW = window.innerWidth <= 860 ? 0 : 400;
        document.body.style.transition = "padding-right .32s cubic-bezier(.4,0,.2,1)";
        document.body.style.paddingRight = panelW ? `${panelW}px` : "";
        renderTimeline();
        startTick();
    }

    function closePanel() {
        panelOpen = false;
        panel?.classList.remove("is-open");
        historyBtn?.classList.remove("is-active");
        document.body.style.paddingRight = "";
    }

    function togglePanel() {
        if (panelOpen) closePanel();
        else openPanel();
    }

    function renderHistory() {
        if (undoStack.length > 0 && !sessionStart) {
            sessionStart = undoStack[0].timestamp;
        }

        if (panelOpen) renderTimeline();

        updateHistoryBtn();
    }

    function updateHistoryBtn() {
        if (!historyBtn) return;
        const total = undoStack.length + redoStack.length;
        let badge = historyBtn.querySelector(".gx-hbtn-badge");
        if (total > 0) {
            if (!badge) {
                badge = document.createElement("span");
                badge.className = "gx-hbtn-badge";
                historyBtn.appendChild(badge);
            }
            badge.textContent = total;
        } else if (badge) {
            badge.remove();
        }
    }

    const onOutsideClick = e => {
        if (!panelOpen || !panel) return;
        if (panel.contains(e.target)) return;
        if (historyBtn?.contains(e.target)) return;
        closePanel();
    };

    function mount() {
        historyBtn?.addEventListener("click", togglePanel);
        document.addEventListener("pointerdown", onOutsideClick, { capture: true });
    }

    function dispose() {
        clearInterval(tickTimer);
        tickTimer = null;
        historyBtn?.removeEventListener("click", togglePanel);
        document.removeEventListener("pointerdown", onOutsideClick, { capture: true });
        panel?.remove();
        panel = null;
        panelOpen = false;
        sessionStart = null;
    }

    function closeHistory() { closePanel(); }

    return { mount, dispose, renderHistory, closeHistory };
}
