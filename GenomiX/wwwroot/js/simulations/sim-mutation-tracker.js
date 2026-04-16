export function createMutationTracker(lang = "en") {
    const bg = lang === "bg";

    const events = [];     
    let orgMap = {};     
    let tick = 0;
    let filter = "all";

    const flashes = {};

    const T = {
        title: bg ? "Мутационен тракер" : "Mutation Tracker",
        all: bg ? "Всички" : "All",
        mutations: bg ? "Мутации" : "Mutations",
        deaths: bg ? "Смъртни" : "Deaths",
        repro: bg ? "Размн." : "Repro",
        statsTotal: bg ? "Събития" : "Events",
        statsMut: bg ? "Мутации" : "Mutations",
        statsDeath: bg ? "Смъртни" : "Deaths",
        statsRepro: bg ? "Размножавания" : "Repro",
        empty: bg ? "Без събития.\nСтартирайте симулацията." : "No events yet.\nStart the simulation.",
        copy: bg ? "📋 Копирай доклад" : "📋 Copy report",
        hint: bg ? "Промени на организми в реално време" : "Live organism changes",
        mutLabel: bg ? "Мутация" : "Mutation",
        deathLabel: bg ? "Смърт" : "Death",
        reproLabel: bg ? "Размножаване" : "Reproduction",
        fitDelta: bg ? "годност" : "fitness",
        tickLabel: bg ? "тик" : "tick",
        rate: bg ? "Степен" : "Rate",
        perTick: bg ? "/тик" : "/tick",
    };

    const TYPE_META = {
        mutation: { icon: "🧬", color: "#ff7722", label: T.mutLabel },
        death: { icon: "💀", color: "#ff2244", label: T.deathLabel },
        reproduction: { icon: "🌱", color: "#44dd88", label: T.reproLabel },
    };

    const SPECIES_EMOJI = {
        mouse: "🐭", pig: "🐷", cow: "🐮", rabbit: "🐰", fox: "🦊", bird: "🐦"
    };
    function spEmoji(sp) { return SPECIES_EMOJI[sp] || "🧬"; }


    function detectChanges(orgs, currentTick) {
        const newEvents = [];

        for (const o of orgs) {
            const prev = orgMap[o.id];

            if (!prev) {
                orgMap[o.id] = { status: o.status, fitness: o.fitness, name: o.name || o.id, species: o.species || "mouse" };
                continue;
            }

            const statusChanged = prev.status !== o.status;
            const fitnessDelta = (o.fitness ?? 0) - (prev.fitness ?? 0);
            const wasMutated = !statusChanged && Math.abs(fitnessDelta) >= 0.008;

            if (statusChanged && o.status === "dead") {
                newEvents.push({
                    type: "death",
                    tick: currentTick,
                    orgId: o.id,
                    name: prev.name,
                    species: prev.species,
                    prevFitness: prev.fitness,
                    newFitness: 0,
                    delta: -prev.fitness,
                });
                flashes[o.id] = { t: 1, type: "death" };
            } else if (statusChanged && o.status === "reproduced") {
                newEvents.push({
                    type: "reproduction",
                    tick: currentTick,
                    orgId: o.id,
                    name: prev.name,
                    species: prev.species,
                    prevFitness: prev.fitness,
                    newFitness: o.fitness,
                    delta: fitnessDelta,
                });
                flashes[o.id] = { t: 1, type: "reproduction" };
            } else if (wasMutated) {
                newEvents.push({
                    type: "mutation",
                    tick: currentTick,
                    orgId: o.id,
                    name: prev.name,
                    species: prev.species,
                    prevFitness: prev.fitness,
                    newFitness: o.fitness,
                    delta: fitnessDelta,
                });
                flashes[o.id] = { t: 1, type: "mutation" };
            }

            orgMap[o.id] = { status: o.status, fitness: o.fitness, name: prev.name, species: prev.species };
        }

        return newEvents;
    }


    function stats() {
        const total = events.length;
        const muts = events.filter(e => e.type === "mutation").length;
        const deaths = events.filter(e => e.type === "death").length;
        const repros = events.filter(e => e.type === "reproduction").length;
        const rate = tick > 0 ? (total / tick).toFixed(2) : "0.00";
        return { total, muts, deaths, repros, rate };
    }


    function buildReport() {
        const s = stats();
        const lines = [
            "=== GenomiX Mutation Tracker Report ===",
            `Date: ${new Date().toLocaleString()}`,
            `Total events: ${s.total}  |  Mutations: ${s.muts}  |  Deaths: ${s.deaths}  |  Reproductions: ${s.repros}`,
            `Mutation rate: ${s.rate} events/tick  |  Ticks processed: ${tick}`,
            ""
        ];
        [...events].reverse().forEach((e, i) => {
            const m = TYPE_META[e.type];
            const df = e.delta >= 0 ? `+${e.delta.toFixed(3)}` : e.delta.toFixed(3);
            lines.push(`${String(i + 1).padStart(4)}  [${m.label.padEnd(12)}]  Tick ${String(e.tick).padStart(5)}  ${spEmoji(e.species)} ${e.name.padEnd(22)}  Δfitness ${df}`);
        });
        return lines.join("\n");
    }


    let panel = null;
    let panelOpen = false;
    let toggleBtn = null;
    let badgeEl = null;

    function buildPanel() {
        const el = document.createElement("div");
        el.id = "gx-mut-panel";
        el.className = "gx-mut-panel";
        el.innerHTML = `
            <div class="gx-mut-hd">
                <div class="gx-mut-hd__left">
                    <span class="gx-mut-hd__icon">🧬</span>
                    <div>
                        <div class="gx-mut-hd__title">${T.title}</div>
                        <div class="gx-mut-hd__hint">${T.hint}</div>
                    </div>
                </div>
                <button class="gx-mut-close" id="gx-mut-close" aria-label="Close">✕</button>
            </div>

            <div class="gx-mut-stats" id="gx-mut-stats">
                <div class="gx-mut-stat"><div class="gx-mut-stat__v" id="gx-ms-total">0</div><div class="gx-mut-stat__k">${T.statsTotal}</div></div>
                <div class="gx-mut-stat"><div class="gx-mut-stat__v gx-mut-stat__v--mut" id="gx-ms-mut">0</div><div class="gx-mut-stat__k">${T.statsMut}</div></div>
                <div class="gx-mut-stat"><div class="gx-mut-stat__v gx-mut-stat__v--death" id="gx-ms-death">0</div><div class="gx-mut-stat__k">${T.statsDeath}</div></div>
                <div class="gx-mut-stat"><div class="gx-mut-stat__v gx-mut-stat__v--repro" id="gx-ms-repro">0</div><div class="gx-mut-stat__k">${T.statsRepro}</div></div>
                <div class="gx-mut-stat"><div class="gx-mut-stat__v" id="gx-ms-rate">0.00</div><div class="gx-mut-stat__k">${T.rate}${T.perTick}</div></div>
            </div>

            <div class="gx-mut-filters" id="gx-mut-filters">
                <button class="gx-mut-filter is-active" data-f="all">${T.all}</button>
                <button class="gx-mut-filter gx-mut-filter--mut" data-f="mutation">🧬 ${T.mutations}</button>
                <button class="gx-mut-filter gx-mut-filter--death" data-f="death">💀 ${T.deaths}</button>
                <button class="gx-mut-filter gx-mut-filter--repro" data-f="reproduction">🌱 ${T.repro}</button>
            </div>

            <div class="gx-mut-body" id="gx-mut-body">
                <div class="gx-mut-empty" id="gx-mut-empty">${T.empty}</div>
            </div>

            <div class="gx-mut-foot">
                <button class="gx-mut-copy" id="gx-mut-copy">${T.copy}</button>
                <div class="gx-mut-foot__count" id="gx-mut-foot-count"></div>
            </div>
        `;

        document.body.appendChild(el);

        el.querySelector("#gx-mut-close")?.addEventListener("click", closePanel);

        el.querySelector("#gx-mut-filters")?.addEventListener("click", e => {
            const btn = e.target.closest("[data-f]");
            if (!btn) return;
            filter = btn.dataset.f;
            el.querySelectorAll(".gx-mut-filter").forEach(b => b.classList.toggle("is-active", b.dataset.f === filter));
            renderFeed();
        });

        el.querySelector("#gx-mut-copy")?.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(buildReport());
                const btn = el.querySelector("#gx-mut-copy");
                const orig = btn.textContent;
                btn.textContent = "✓ Copied!";
                setTimeout(() => { btn.textContent = orig; }, 1800);
            } catch { }
        });

        return el;
    }


    function renderEntry(e) {
        const m = TYPE_META[e.type];
        const el = document.createElement("div");
        el.className = `gx-mut-entry gx-mut-entry--${e.type}`;

        let bottomRow = "";
        if (e.type === "reproduction") {
            const pct = Math.round((e.prevFitness ?? e.newFitness ?? 0) * 100);
            bottomRow = `
                <div class="gx-mut-entry__repro">
                    <span class="gx-mut-entry__repro-label">🌱 ${bg ? "Потомък създаден" : "Offspring spawned"}</span>
                    <span class="gx-mut-entry__repro-fit" style="color:${m.color}">${(e.prevFitness ?? 0).toFixed(3)}</span>
                </div>`;
        } else if (e.type === "death") {
            bottomRow = `
                <div class="gx-mut-entry__delta is-neg">
                    💀 ${bg ? "Годност" : "Fitness"} <strong>0.000</strong>
                    <span class="gx-mut-entry__fitbar"><span class="gx-mut-entry__fitfill" style="width:0%;background:${m.color}"></span></span>
                </div>`;
        } else {
            const df = e.delta >= 0 ? `+${e.delta.toFixed(3)}` : e.delta.toFixed(3);
            bottomRow = `
                <div class="gx-mut-entry__delta ${e.delta < 0 ? "is-neg" : "is-pos"}">
                    Δ${T.fitDelta} <strong>${df}</strong>
                    <span class="gx-mut-entry__fitbar">
                        <span class="gx-mut-entry__fitfill" style="width:${Math.min(100, Math.abs(e.delta) * 400)}%;background:${m.color}"></span>
                    </span>
                </div>`;
        }

        el.innerHTML = `
            <div class="gx-mut-entry__track">
                <div class="gx-mut-entry__dot" style="--dc:${m.color}">${m.icon}</div>
                <div class="gx-mut-entry__line"></div>
            </div>
            <div class="gx-mut-entry__card">
                <div class="gx-mut-entry__top">
                    <span class="gx-mut-badge" style="--bc:${m.color}">${m.label}</span>
                    <span class="gx-mut-entry__org">${spEmoji(e.species)} ${e.name}</span>
                    <span class="gx-mut-entry__tick">${T.tickLabel} ${e.tick}</span>
                </div>
                ${bottomRow}
            </div>
        `;
        return el;
    }


    function renderFeed() {
        if (!panel) return;
        const body = panel.querySelector("#gx-mut-body");
        const empty = panel.querySelector("#gx-mut-empty");
        const footCount = panel.querySelector("#gx-mut-foot-count");
        if (!body) return;

        const s = stats();
        panel.querySelector("#gx-ms-total").textContent = s.total;
        panel.querySelector("#gx-ms-mut").textContent = s.muts;
        panel.querySelector("#gx-ms-death").textContent = s.deaths;
        panel.querySelector("#gx-ms-repro").textContent = s.repros;
        panel.querySelector("#gx-ms-rate").textContent = s.rate;

        const filtered = filter === "all" ? events : events.filter(e => e.type === filter);

        body.innerHTML = "";

        if (filtered.length === 0) {
            if (empty) { empty.hidden = false; body.appendChild(empty); }
            if (footCount) footCount.textContent = "";
            return;
        }

        if (empty) empty.hidden = true;
        filtered.forEach(e => body.appendChild(renderEntry(e)));
        if (footCount) footCount.textContent = `${filtered.length} events`;
        body.scrollTop = 0; 
    }


    function updateBadge() {
        if (!toggleBtn) return;
        if (!badgeEl) {
            badgeEl = document.createElement("span");
            badgeEl.className = "gx-mut-badge-btn";
            toggleBtn.appendChild(badgeEl);
        }
        badgeEl.textContent = events.length > 99 ? "99+" : String(events.length);
        badgeEl.style.display = events.length > 0 ? "grid" : "none";
    }


    function openPanel() {
        if (!panel) panel = buildPanel();
        panelOpen = true;
        panel.classList.add("is-open");
        toggleBtn?.classList.add("is-active");
        const w = window.innerWidth <= 860 ? 0 : 400;
        document.body.style.transition = "padding-right .32s cubic-bezier(.4,0,.2,1)";
        document.body.style.paddingRight = w ? `${w}px` : "";
        renderFeed();
    }

    function closePanel() {
        panelOpen = false;
        panel?.classList.remove("is-open");
        toggleBtn?.classList.remove("is-active");
        document.body.style.paddingRight = "";
    }

    const onOutside = e => {
        if (!panelOpen || !panel) return;
        if (panel.contains(e.target)) return;
        if (toggleBtn?.contains(e.target)) return;
        closePanel();
    };

    function onTick(orgs, currentTick, orgMeta) {
        tick = currentTick;

        if (orgMeta) {
            for (const m of orgMeta) {
                if (!orgMap[m.id]) {
                    orgMap[m.id] = { status: m.status || "alive", fitness: m.fitness ?? 1, name: m.name || String(m.id).slice(0, 8), species: m.species || "mouse" };
                }
            }
        }

        const newEvts = detectChanges(orgs, currentTick);

        if (newEvts.length > 0) {
            events.unshift(...newEvts.reverse());
            updateBadge();
            if (panelOpen) renderFeed();
        }
    }

    function tickFlashes(dt) {
        const snapshot = {};
        for (const [id, f] of Object.entries(flashes)) {
            f.t = Math.max(0, f.t - dt * 1.8);
            if (f.t > 0) snapshot[id] = { ...f };
            else delete flashes[id];
        }
        return snapshot;
    }

    function injectToggleBtn(containerEl) {
        if (!containerEl || document.getElementById("gx-mut-toggle")) return;

        const isBg = document.documentElement.lang?.toLowerCase().startsWith("bg");
        const label = isBg ? "Мутации" : "Mutations";

        toggleBtn = document.createElement("button");
        toggleBtn.id = "gx-mut-toggle";
        toggleBtn.type = "button";
        toggleBtn.className = "gx-btn gx-btn--ghost gx-mut-toggle-btn";
        toggleBtn.innerHTML = `🧬 ${label}`;

        toggleBtn.addEventListener("click", () => panelOpen ? closePanel() : openPanel());
        document.addEventListener("pointerdown", onOutside, { capture: true });

        containerEl.appendChild(toggleBtn);
        updateBadge();
    }

    function destroy() {
        closePanel();
        document.removeEventListener("pointerdown", onOutside, { capture: true });
        panel?.remove();
        toggleBtn?.remove();
        panel = toggleBtn = badgeEl = null;
    }

    return { onTick, tickFlashes, injectToggleBtn, destroy, openPanel, closePanel };
}
