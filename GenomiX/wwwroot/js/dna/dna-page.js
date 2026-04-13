import { parseTextareaStrict, parseFileStrict } from "./dna-utils.js";
import { visualizeDNA } from "./dna-viewer.js";
import { renderChromosomeAbnormalitiesCompare } from "./dna-chromosome-abnormalities.js";
import { createCodonOverlay } from "./dna-codon-overlay.js";

let lastS1 = null;
let lastS2 = null;
let currentModel = null;

let viewerApi = null;
let currentModeSci = false;
let codonOverlay = null;

document.addEventListener("DOMContentLoaded", () => {
    const dnaSequenceInput = document.getElementById("sequence");
    const importBtn = document.getElementById("import-btn");
    const visualizeBtn = document.getElementById("visualize-btn");
    const dnaInputSection = document.getElementById("dna-input-section");
    const dnaVisualizerSection = document.getElementById("dna-visualizer-section");
    const modeBasic = document.getElementById("basicMode");
    const modeSci = document.getElementById("scientificMode");

    const saveBtn = document.getElementById("save-btn");
    const modelIdEl = document.getElementById("gx-model-id");
    const tokenEl = document.querySelector('input[name="__RequestVerificationToken"]');
    const scanDiseaseBtn = document.getElementById("scan-disease-btn");

    const currentLang =
        document.documentElement.lang?.toLowerCase().startsWith("bg")
            ? "bg"
            : "en";

    const T = currentLang === "bg"
        ? {
            missingModelId: "Липсва идентификатор на модела.",
            nothingToSave: "Няма какво да се запази.",
            saveModel: "Запази модел",
            saving: "Запазване...",
            saved: "Запазено ✓",

            noDna: "Няма ДНК за сканиране.",
            scanBtn: "Сканирай за заболявания",
            scanning: "Сканиране...",
            generating: "Генериране на AI анализ...",

            scanFailed: "Сканирането за заболявания се провали.",
            explainFailed: "AI анализът се провали.",
            analysisFailed: "Анализът се провали.",

            noMarkersTitle: "Няма открити известни маркери",
            noMarkersText: "В текущия ДНК модел не бяха открити съхранени образователни маркери за заболявания.",

            aiInsight: "AI Анализ",
            foodPriorities: "Хранителни приоритети",
            medicinesToDiscuss: "Лекарства и вещества за обсъждане с лекар",
            monitoring: "Изследвания и проследяване",
            notice: "Важно",
            close: "Затвори",
            fallbackTitle: "Потенциален генетичен маркер",

            whatYouMayFeel: "Какво може да усещаш",
            affectedSystems: "Засегнати системи",
            whatHappensInBody: "Какво се случва в тялото",
        }
        : {
            missingModelId: "Missing model id.",
            nothingToSave: "Nothing to save.",
            saveModel: "Save model",
            saving: "Saving...",
            saved: "Saved ✓",

            noDna: "No DNA to scan.",
            scanBtn: "Scan for diseases",
            scanning: "Scanning...",
            generating: "Generating AI insight...",

            scanFailed: "Disease scan failed.",
            explainFailed: "AI explanation failed.",
            analysisFailed: "Analysis failed.",

            noMarkersTitle: "No known markers detected",
            noMarkersText: "No stored educational disease markers were detected in the current DNA model.",

            aiInsight: "AI Insight",
            foodPriorities: "Food priorities",
            medicinesToDiscuss: "Medicines and substances to discuss with a doctor",
            monitoring: "Tests and monitoring",
            notice: "Important",
            close: "Close",
            fallbackTitle: "Potential genetic marker detected",

            whatYouMayFeel: "What you may feel",
            affectedSystems: "Affected systems",
            whatHappensInBody: "What happens in the body",
        };

    function esc(s) {
        return String(s ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function listHtml(items) {
        if (!Array.isArray(items) || items.length === 0) {
            return `<p class="gx-ai-empty">—</p>`;
        }

        return `<ul class="gx-ai-list">${items.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`;
    }

    function systemsHtml(items) {
        if (!Array.isArray(items) || items.length === 0) {
            return `<p class="gx-ai-empty">—</p>`;
        }

        return `
        <div class="gx-system-chips">
            ${items.map(x => `<span class="gx-system-chip">${esc(x)}</span>`).join("")}
        </div>
    `;
    }

    function typeText(el, text, speed = 10) {
        if (!el) return;

        let i = 0;
        el.textContent = "";

        function stepType() {
            if (i < text.length) {
                el.textContent += text.charAt(i);
                i++;
                setTimeout(stepType, speed);
            }
        }

        stepType();
    }

    function showScanLoading() {
        const el = document.createElement("div");
        el.id = "gx-scan-loading";
        el.className = "gx-scan-loading";

        el.innerHTML = `
        <div class="gx-scan-loading__inner">
            <div class="gx-scan-loading__hud">
                <div class="gx-scan-loading__title">
                    ${currentLang === "bg" ? "Сканиране на ДНК" : "DNA scan in progress"}
                </div>
                <div class="gx-scan-loading__sub" id="gx-scan-loading-sub">
                    ${currentLang === "bg" ? "Търсене на генетични маркери..." : "Searching for genetic markers..."}
                </div>
            </div>

            <div class="gx-scan-radar">
                <div class="gx-scan-radar__ring r1"></div>
                <div class="gx-scan-radar__ring r2"></div>
                <div class="gx-scan-radar__ring r3"></div>
                <div class="gx-scan-radar__beam"></div>
                <div class="gx-scan-radar__core"></div>
            </div>
        </div>
    `;

        document.body.appendChild(el);
        requestAnimationFrame(() => el.classList.add("is-on"));
        return el;
    }

    function setScanLoadingText(el, text) {
        const sub = el?.querySelector("#gx-scan-loading-sub");
        if (sub) sub.textContent = text;
    }

    function hideScanLoading(el) {
        if (!el) return;
        el.classList.remove("is-on");
        setTimeout(() => el.remove(), 220);
    }

    function visualStepIcon(kind) {
        switch (kind) {
            case "mutation": return "🧬";
            case "abnormal-protein": return "⚛️";
            case "misfolded-protein": return "🧩";
            case "blocked-channel": return "🚪";
            case "transport-failure": return "↔️";
            case "cell-deformation": return "🔴";
            case "blocked-flow": return "🩸";
            case "accumulation": return "⚠️";
            case "signal-loss": return "🧠";
            case "inflammation": return "🔥";
            case "tissue-damage": return "🧫";
            case "organ-effect": return "❤️";
            case "pain-crisis": return "⚡";
            case "breathing-problem": return "🫁";
            case "infection-risk": return "🦠";
            case "low-oxygen": return "O₂";
            default: return "•";
        }
    }

    function renderStepFrame(step, fromHtml, toHtml) {
        return `
        <div class="gx-stepviz">
            <div class="gx-stepviz__from">
                ${fromHtml}
            </div>

            <div class="gx-stepviz__arrow">
                <div class="gx-stepviz__arrow-line"></div>
                <div class="gx-stepviz__arrow-head"></div>
            </div>

            <div class="gx-stepviz__to">
                ${toHtml}
            </div>
        </div>

        <div class="gx-stepviz__labels">
            <div class="gx-bio__from">${esc(step.fromLabel || "")}</div>
            <div class="gx-bio__to">${esc(step.toLabel || "")}</div>
        </div>
    `;
    }

    function renderStepVisual(step) {
        switch (step.kind) {
            case "mutation":
                return renderGeneMutationVisual(step);

            case "misfolded-protein":
            case "abnormal-protein":
                return renderProteinFoldVisual(step);

            case "accumulation":
                return renderEnzymeReactionVisual(step);

            case "blocked-channel":
                return renderChannelVisual(step);

            case "transport-failure":
                return renderTransportFailureVisual(step);

            case "cell-deformation":
                return renderCellVisual(step);

            case "blocked-flow":
            case "low-oxygen":
                return renderFlowVisual(step);

            case "signal-loss":
                return renderSignalLossVisual(step);

            case "inflammation":
                return renderInflammationVisual(step);

            case "tissue-damage":
                return renderTissueDamageVisual(step);

            case "organ-effect":
                return renderOrganEffectVisual(step);

            case "pain-crisis":
                return renderPainCrisisVisual(step);

            case "breathing-problem":
                return renderBreathingProblemVisual(step);

            case "infection-risk":
                return renderInfectionRiskVisual(step);

            default:
                return renderGenericVisual(step);
        }
    }

    function renderGeneMutationVisual(step) {
        const fromHtml = `
        <div class="gx-geneviz gx-geneviz--normal">
            <span class="gx-geneviz__rail gx-geneviz__rail--left"></span>
            <span class="gx-geneviz__rail gx-geneviz__rail--right"></span>

            <span class="gx-geneviz__pair p1"></span>
            <span class="gx-geneviz__pair p2"></span>
            <span class="gx-geneviz__pair p3"></span>
            <span class="gx-geneviz__pair p4"></span>
            <span class="gx-geneviz__pair p5"></span>

            <span class="gx-geneviz__hotspot"></span>
        </div>
    `;

        const toHtml = `
        <div class="gx-geneviz gx-geneviz--mutated">
            <span class="gx-geneviz__rail gx-geneviz__rail--left"></span>
            <span class="gx-geneviz__rail gx-geneviz__rail--right"></span>

            <span class="gx-geneviz__pair p1"></span>
            <span class="gx-geneviz__pair p2"></span>
            <span class="gx-geneviz__pair p3 is-broken"></span>
            <span class="gx-geneviz__pair p4"></span>
            <span class="gx-geneviz__pair p5"></span>

            <span class="gx-geneviz__hotspot gx-geneviz__hotspot--mut"></span>
        </div>
    `;

        return `<div class="gx-bio">${renderStepFrame(step, fromHtml, toHtml)}</div>`;
    }

    function renderProteinFoldVisual(step) {
        const fromHtml = `
        <div class="gx-proteinfold gx-proteinfold--ok">
            <span class="gx-proteinfold__node n1"></span>
            <span class="gx-proteinfold__node n2"></span>
            <span class="gx-proteinfold__node n3"></span>
            <span class="gx-proteinfold__node n4"></span>

            <span class="gx-proteinfold__bond b1"></span>
            <span class="gx-proteinfold__bond b2"></span>
            <span class="gx-proteinfold__bond b3"></span>
        </div>
    `;

        const toHtml = `
        <div class="gx-proteinfold gx-proteinfold--bad">
            <span class="gx-proteinfold__node n1"></span>
            <span class="gx-proteinfold__node n2"></span>
            <span class="gx-proteinfold__node n3"></span>
            <span class="gx-proteinfold__node n4"></span>

            <span class="gx-proteinfold__bond b1"></span>
            <span class="gx-proteinfold__bond b2"></span>
            <span class="gx-proteinfold__bond b3"></span>

            <span class="gx-proteinfold__warn"></span>
        </div>
    `;

        return `<div class="gx-bio">${renderStepFrame(step, fromHtml, toHtml)}</div>`;
    }

    function renderEnzymeReactionVisual(step) {
        const fromHtml = `
        <div class="gx-enzymeviz gx-enzymeviz--ok">
            <div class="gx-enzymeviz__enzyme"></div>
            <div class="gx-enzymeviz__substrate"></div>
            <div class="gx-enzymeviz__product p1"></div>
            <div class="gx-enzymeviz__product p2"></div>
        </div>
    `;

        const toHtml = `
        <div class="gx-enzymeviz gx-enzymeviz--bad">
            <div class="gx-enzymeviz__enzyme"></div>
            <div class="gx-enzymeviz__substrate is-stuck"></div>
            <div class="gx-enzymeviz__waste w1"></div>
            <div class="gx-enzymeviz__waste w2"></div>
            <div class="gx-enzymeviz__waste w3"></div>
            <div class="gx-enzymeviz__waste w4"></div>
        </div>
    `;

        return `<div class="gx-bio">${renderStepFrame(step, fromHtml, toHtml)}</div>`;
    }

    function renderNeuroDamageVisual(step) {
        const healthy = `
        <div class="gx-neuroviz gx-neuroviz--ok">
            <div class="n n1"></div>
            <div class="n n2"></div>
            <div class="n n3"></div>
            <div class="link l1"></div>
            <div class="link l2"></div>
        </div>
    `;

        const damaged = `
        <div class="gx-neuroviz gx-neuroviz--bad">
            <div class="n n1"></div>
            <div class="n n2"></div>
            <div class="n n3"></div>
            <div class="link l1"></div>
            <div class="link l2"></div>
            <div class="warn">!</div>
        </div>
    `;

        return `<div class="gx-bio">${renderStepFrame(step, healthy, damaged)}</div>`;
    }

    function renderChannelVisual(step) {
        const open = `
        <div class="gx-channel gx-channel--open">
            <span class="gx-ion i1"></span>
            <span class="gx-ion i2"></span>
        </div>
    `;

        const blocked = `
        <div class="gx-channel gx-channel--blocked">
            <span class="gx-gate"></span>
        </div>
    `;

        return `<div class="gx-bio">${renderStepFrame(step, open, blocked)}</div>`;
    }

    function renderCellVisual(step) {
        const normal = `<div class="gx-cell gx-cell--normal"></div>`;
        const damaged = `<div class="gx-cell gx-cell--damaged"></div>`;

        return `<div class="gx-bio">${renderStepFrame(step, normal, damaged)}</div>`;
    }

    function renderFlowVisual(step) {
        const open = `
        <div class="gx-vessel gx-vessel--open">
            <span class="gx-vessel__cell c1"></span>
            <span class="gx-vessel__cell c2"></span>
        </div>
    `;

        const blocked = `
        <div class="gx-vessel gx-vessel--blocked">
            <span class="gx-vessel__cell is-block"></span>
        </div>
    `;

        return `<div class="gx-bio">${renderStepFrame(step, open, blocked)}</div>`;
    }

    function renderTransportFailureVisual(step) {
        const normal = `
        <div class="gx-transport gx-transport--ok">
            <span class="gx-transport__node gx-transport__node--left"></span>
            <span class="gx-transport__flow"></span>
            <span class="gx-transport__node gx-transport__node--right"></span>
        </div>
    `;

        const failed = `
        <div class="gx-transport gx-transport--bad">
            <span class="gx-transport__node gx-transport__node--left"></span>
            <span class="gx-transport__barrier"></span>
            <span class="gx-transport__node gx-transport__node--right"></span>
        </div>
    `;

        return `<div class="gx-bio">${renderStepFrame(step, normal, failed)}</div>`;
    }

    function renderSignalLossVisual(step) {
        const normal = `
        <div class="gx-signalviz gx-signalviz--ok">
            <span class="gx-signalviz__node n1"></span>
            <span class="gx-signalviz__node n2"></span>
            <span class="gx-signalviz__node n3"></span>
            <span class="gx-signalviz__pulse p1"></span>
            <span class="gx-signalviz__pulse p2"></span>
        </div>
    `;

        const failed = `
        <div class="gx-signalviz gx-signalviz--bad">
            <span class="gx-signalviz__node n1"></span>
            <span class="gx-signalviz__node n2"></span>
            <span class="gx-signalviz__node n3"></span>
            <span class="gx-signalviz__break"></span>
        </div>
    `;

        return `<div class="gx-bio">${renderStepFrame(step, normal, failed)}</div>`;
    }

    function renderInflammationVisual(step) {
        const normal = `
        <div class="gx-inflam gx-inflam--ok">
            <span class="gx-inflam__cell c1"></span>
            <span class="gx-inflam__cell c2"></span>
            <span class="gx-inflam__cell c3"></span>
        </div>
    `;

        const inflamed = `
        <div class="gx-inflam gx-inflam--bad">
            <span class="gx-inflam__cell c1"></span>
            <span class="gx-inflam__cell c2"></span>
            <span class="gx-inflam__cell c3"></span>
            <span class="gx-inflam__flare f1"></span>
            <span class="gx-inflam__flare f2"></span>
            <span class="gx-inflam__flare f3"></span>
        </div>
    `;

        return `<div class="gx-bio">${renderStepFrame(step, normal, inflamed)}</div>`;
    }

    function renderTissueDamageVisual(step) {
        const healthy = `
        <div class="gx-tissue gx-tissue--ok">
            <span class="gx-tissue__cell t1"></span>
            <span class="gx-tissue__cell t2"></span>
            <span class="gx-tissue__cell t3"></span>
            <span class="gx-tissue__cell t4"></span>
        </div>
    `;

        const damaged = `
        <div class="gx-tissue gx-tissue--bad">
            <span class="gx-tissue__cell t1"></span>
            <span class="gx-tissue__cell t2 is-damaged"></span>
            <span class="gx-tissue__cell t3"></span>
            <span class="gx-tissue__cell t4 is-damaged"></span>
            <span class="gx-tissue__crack"></span>
        </div>
    `;

        return `<div class="gx-bio">${renderStepFrame(step, healthy, damaged)}</div>`;
    }

    function renderOrganEffectVisual(step) {
        const normal = `
        <div class="gx-organ gx-organ--ok">
            <div class="gx-organ__body"></div>
            <div class="gx-organ__pulse"></div>
        </div>
    `;

        const affected = `
        <div class="gx-organ gx-organ--bad">
            <div class="gx-organ__body"></div>
            <div class="gx-organ__stress"></div>
            <div class="gx-organ__warn">!</div>
        </div>
    `;

        return `<div class="gx-bio">${renderStepFrame(step, normal, affected)}</div>`;
    }

    function renderPainCrisisVisual(step) {
        const calm = `
        <div class="gx-pain gx-pain--ok">
            <span class="gx-pain__node p1"></span>
            <span class="gx-pain__node p2"></span>
            <span class="gx-pain__node p3"></span>
        </div>
    `;

        const crisis = `
        <div class="gx-pain gx-pain--bad">
            <span class="gx-pain__node p1"></span>
            <span class="gx-pain__node p2"></span>
            <span class="gx-pain__node p3"></span>
            <span class="gx-pain__bolt b1"></span>
            <span class="gx-pain__bolt b2"></span>
        </div>
    `;

        return `<div class="gx-bio">${renderStepFrame(step, calm, crisis)}</div>`;
    }

    function renderBreathingProblemVisual(step) {
        const normal = `
        <div class="gx-lungviz gx-lungviz--ok">
            <div class="gx-lungviz__lung left"></div>
            <div class="gx-lungviz__lung right"></div>
            <div class="gx-lungviz__airflow"></div>
        </div>
    `;

        const bad = `
        <div class="gx-lungviz gx-lungviz--bad">
            <div class="gx-lungviz__lung left"></div>
            <div class="gx-lungviz__lung right"></div>
            <div class="gx-lungviz__airflow is-weak"></div>
            <div class="gx-lungviz__warn">!</div>
        </div>
    `;

        return `<div class="gx-bio">${renderStepFrame(step, normal, bad)}</div>`;
    }

    function renderInfectionRiskVisual(step) {
        const normal = `
        <div class="gx-infect gx-infect--ok">
            <span class="gx-infect__shield"></span>
            <span class="gx-infect__dot d1"></span>
            <span class="gx-infect__dot d2"></span>
        </div>
    `;

        const risky = `
        <div class="gx-infect gx-infect--bad">
            <span class="gx-infect__shield is-broken"></span>
            <span class="gx-infect__bug b1"></span>
            <span class="gx-infect__bug b2"></span>
            <span class="gx-infect__bug b3"></span>
        </div>
    `;

        return `<div class="gx-bio">${renderStepFrame(step, normal, risky)}</div>`;
    }

    function renderGenericVisual(step) {
        return `
        <div class="gx-bio gx-bio--generic">
            <div class="gx-bio__statebox">${esc(step.fromLabel || "")}</div>
            <div class="gx-bio__mid-arrow"></div>
            <div class="gx-bio__statebox">${esc(step.toLabel || "")}</div>
        </div>
    `;
    }

    function renderVisualSteps(container, explanation) {
        if (!container) return;

        const steps = explanation?.visualSteps || [];

        if (!Array.isArray(steps) || steps.length === 0) {
            container.innerHTML = `<p class="gx-ai-empty">—</p>`;
            return;
        }

        container.innerHTML = `
        <div class="gx-vsteps">
            ${steps.map((step, i) => `
                <section class="gx-vstep gx-vstep--${esc(step.kind || "generic")}">
                    <div class="gx-vstep__top">
                        <div class="gx-vstep__index">${i + 1}</div>
                        <div class="gx-vstep__icon">${visualStepIcon(step.kind)}</div>
                        <div class="gx-vstep__head">
                            <h4 class="gx-vstep__title">${esc(step.title || "")}</h4>
                            <p class="gx-vstep__desc">${esc(step.description || "")}</p>
                        </div>
                    </div>

                    <div class="gx-vstep__visual">
                        ${renderStepVisual(step)}
                    </div>
                </section>
            `).join("")}
        </div>
    `;

        animateVisualSteps(container);
    }

    function animateVisualSteps(container) {
        const items = container.querySelectorAll(".gx-vstep");

        items.forEach((el, i) => {
            el.style.opacity = "0";
            el.style.transform = "translateY(10px)";

            setTimeout(() => {
                el.style.transition = "opacity .35s ease, transform .35s ease";
                el.style.opacity = "1";
                el.style.transform = "translateY(0)";
            }, i * 120);
        });
    }

    function setModeUI(isSci) {
        currentModeSci = !!isSci;
        document.documentElement.classList.toggle("mode-scientific", currentModeSci);
    }

    function attachModelChanged(api) {
        if (!api) return;

        api.onModelChanged = (m) => {
            currentModel = m;
            lastS1 = m.s1;
            lastS2 = m.s2;
            api?.setInspectorData?.(m);
            codonOverlay?.setSequence(m.s1);
        };
    }

    function ensureCodonOverlay() {
        if (codonOverlay) return;
        // Defer slightly so the ladder-wrap is in the DOM
        requestAnimationFrame(() => {
            codonOverlay = createCodonOverlay(viewerApi);
            if (lastS1) codonOverlay.setSequence(lastS1);
        });
    }

    function ensureViewer(s1, s2) {
        if (!viewerApi) {
            viewerApi = visualizeDNA(s1, s2, { scientific: currentModeSci });
            attachModelChanged(viewerApi);
            ensureCodonOverlay();
            return viewerApi;
        }

        // setScientific tears down the old DOM and returns a brand-new API instance
        // when the mode actually changes — we MUST capture that return value.
        const maybeNew = viewerApi.setScientific?.(currentModeSci);
        if (maybeNew && maybeNew !== viewerApi) {
            viewerApi = maybeNew;
            attachModelChanged(viewerApi);
            // Codon overlay DOM was destroyed with the old viewer — rebuild it
            codonOverlay?.destroy?.();
            codonOverlay = null;
            ensureCodonOverlay();
        }

        viewerApi.setModel?.(s1, s2);
        attachModelChanged(viewerApi);
        codonOverlay?.setSequence(s1);
        return viewerApi;
    }

    function runVisualize() {
        const res = parseTextareaStrict(dnaSequenceInput.value);
        if (!res.ok) {
            alert(res.error);
            return;
        }

        dnaInputSection.style.display = "none";
        dnaVisualizerSection.style.display = "block";

        lastS1 = res.s1;
        lastS2 = res.s2;

        ensureViewer(res.s1, res.s2);
    }

    function rerenderForMode() {
        const isSci = !!modeSci?.checked;
        setModeUI(isSci);

        const s1 = currentModel?.s1 ?? lastS1;
        const s2 = currentModel?.s2 ?? lastS2;

        if (s1 && s2) {
            ensureViewer(s1, s2);
        }
    }

    function createNanobot() {
        let nano = document.getElementById("gx-nano");

        if (!nano) {
            nano = document.createElement("div");
            nano.id = "gx-nano";
            nano.className = "gx-nano is-hidden";

            nano.innerHTML = `
            <div class="gx-nano-bot">
                <div class="gx-nano-bot__core"></div>
                <div class="gx-nano-bot__ring"></div>
                <div class="gx-nano-bot__legs">
                    <span class="l1"></span>
                    <span class="l2"></span>
                    <span class="l3"></span>
                    <span class="l4"></span>
                </div>
                <div class="gx-nano-bot__beam"></div>
            </div>
        `;

            document.body.appendChild(nano);
        }

        return nano;
    }

    async function moveNanobotToElement(nano, targetEl) {
        const rect = targetEl.getBoundingClientRect();

        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        nano.classList.remove("is-hidden");
        nano.style.left = `${x}px`;
        nano.style.top = `${y}px`;
        nano.classList.add("is-move");

        await new Promise(r => setTimeout(r, 700));

        nano.classList.remove("is-move");
    }

    async function nanobotAnalyze(nano) {
        nano.classList.add("is-scan");
        await new Promise(r => setTimeout(r, 900));
        nano.classList.remove("is-scan");
    }

    async function runNanobotReveal(bestResult) {
        const nano = createNanobot();

        const first = bestResult?.matches?.[0];
        if (!first) return;

        const index = first.matchedIndex;

        const el =
            document.querySelector(`[data-i="${index}"]`) ||
            document.querySelectorAll(".base-pair")[index];

        if (!el) return;

        nano.classList.remove("is-hidden");
        nano.style.left = "90px";
        nano.style.top = "90px";

        await new Promise(r => setTimeout(r, 120));
        await moveNanobotToElement(nano, el);
        await nanobotAnalyze(nano);

        el.classList.add("is-disease-hit");
        await new Promise(r => setTimeout(r, 800));
        el.classList.remove("is-disease-hit");

        nano.classList.add("is-hidden");
    }

    function flashDiseaseHit(bestResult) {
        if (!bestResult?.matches?.length) return;

        const first = bestResult.matches[0];
        const start = first?.matchedIndex ?? -1;
        const len = first?.patternSequence?.length ?? 0;

        if (start < 0 || len <= 0) return;

        const pairs = document.querySelectorAll(".base-pair, .gx-base-pair, [data-pair-index]");
        if (!pairs.length) return;

        for (let i = start; i < start + len; i++) {
            const el =
                document.querySelector(`[data-pair-index="${i}"]`) ||
                pairs[i];

            if (!el) continue;

            el.classList.add("is-disease-hit");
            setTimeout(() => el.classList.remove("is-disease-hit"), 1800);
        }
    }

    function pickBestDiseaseResult(results) {
        if (!Array.isArray(results) || results.length === 0) return null;

        return [...results].sort((a, b) => {
            if ((b.confidence ?? 0) !== (a.confidence ?? 0)) {
                return (b.confidence ?? 0) - (a.confidence ?? 0);
            }

            return (b.matchedPatterns ?? 0) - (a.matchedPatterns ?? 0);
        })[0];
    }

    function ensureDiseaseModal() {
        let backdrop = document.getElementById("gx-disease-modal-backdrop");
        let modal = document.getElementById("gx-disease-modal");

        if (!backdrop) {
            backdrop = document.createElement("div");
            backdrop.id = "gx-disease-modal-backdrop";
            backdrop.className = "gx-modal-backdrop";
            backdrop.style.display = "none";
            document.body.appendChild(backdrop);
        }

        if (!modal) {
            modal = document.createElement("div");
            modal.id = "gx-disease-modal";
            modal.className = "gx-modal gx-ai-modal";
            modal.style.display = "none";
            document.body.appendChild(modal);
        }

        return { backdrop, modal };
    }

    function openModal(backdrop, modal) {
        backdrop.style.display = "block";
        modal.style.display = "block";
        document.body.classList.add("gx-ai-modal-open");
    }

    function closeModal(backdrop, modal) {
        backdrop.style.display = "none";
        modal.style.display = "none";
        document.body.classList.remove("gx-ai-modal-open");
    }

    function showNoDiseasePopup() {
        const { backdrop, modal } = ensureDiseaseModal();

        modal.innerHTML = `
            <div class="gx-modal__hd gx-ai-modal__hd">
                <div class="gx-ai-modal__hero">
                    <div class="gx-ai-modal__icon">🧬</div>
                    <div>
                        <div class="gx-modal__title">${esc(T.noMarkersTitle)}</div>
                    </div>
                </div>
                <button type="button" class="gx-modal__close" id="gx-disease-close" aria-label="${esc(T.close)}">✕</button>
            </div>

            <div class="gx-ai-modal__body">
                <section class="gx-ai-card gx-ai-card--summary">
                    <div class="gx-ai-card__kicker">${esc(T.aiInsight)}</div>
                    <p class="gx-ai-summary">${esc(T.noMarkersText)}</p>
                </section>
            </div>
        `;

        const close = () => closeModal(backdrop, modal);

        openModal(backdrop, modal);
        backdrop.onclick = close;
        document.getElementById("gx-disease-close")?.addEventListener("click", close);
    }

    function showDiseasePopup(explanation, bestResult) {
        const { backdrop, modal } = ensureDiseaseModal();

        modal.className = "gx-modal gx-ai-modal";

        modal.innerHTML = `
        <div class="gx-modal__hd gx-ai-modal__hd gx-ai-modal__hd--clean">
            <div class="gx-ai-modal__hero">
                <div class="gx-ai-modal__icon">🧬</div>
                <div class="gx-ai-modal__titlewrap">
                    <div class="gx-modal__title">${esc(explanation?.title || T.fallbackTitle)}</div>
                    <div class="gx-ai-modal__sub">${esc(bestResult?.diseaseName || "")}</div>
                </div>
            </div>

            <button type="button" class="gx-modal__close" id="gx-disease-close" aria-label="${esc(T.close)}">✕</button>
        </div>

        <div class="gx-ai-modal__body">
            <section class="gx-ai-card gx-ai-card--summary">
                <div class="gx-ai-card__kicker">${esc(T.aiInsight)}</div>
                <p id="gx-ai-summary" class="gx-ai-summary"></p>
            </section>

            <section class="gx-ai-card gx-ai-card--flow">
                <h3>${esc(T.whatHappensInBody)}</h3>
                <div id="gx-visual-steps"></div>
            </section>

            <div class="gx-ai-grid gx-ai-grid--single">
                <section class="gx-ai-card">
                    <h3>${esc(T.affectedSystems)}</h3>
                    ${systemsHtml(explanation?.affectedSystems)}
                </section>

                <section class="gx-ai-card">
                    <h3>${esc(T.whatYouMayFeel)}</h3>
                    ${listHtml(explanation?.possibleSymptoms)}
                </section>

                <section class="gx-ai-card">
                    <h3>${esc(T.medicinesToDiscuss)}</h3>
                    ${listHtml(explanation?.medicinesToDiscussWithDoctor)}
                </section>

                <section class="gx-ai-card">
                    <h3>${esc(T.monitoring)}</h3>
                    ${listHtml(explanation?.helpfulMonitoringIdeas)}
                </section>

                <section class="gx-ai-card">
                    <h3>${esc(T.foodPriorities)}</h3>
                    ${listHtml(explanation?.foodPriorities)}
                </section>

                <section class="gx-ai-card gx-ai-card--notice">
                    <h3>${esc(T.notice)}</h3>
                    <p>${esc(explanation?.educationalNotice || "")}</p>
                </section>
            </div>
        </div>
    `;

        const close = () => closeModal(backdrop, modal);

        openModal(backdrop, modal);
        backdrop.onclick = close;
        document.getElementById("gx-disease-close")?.addEventListener("click", close);

        typeText(
            document.getElementById("gx-ai-summary"),
            explanation?.shortSummary || "",
            10
        );

        renderVisualSteps(
            document.getElementById("gx-visual-steps"),
            explanation
        );
    }

    saveBtn?.addEventListener("click", async () => {
        try {
            const modelId = modelIdEl?.value;
            const token = tokenEl?.value;

            if (!modelId) {
                alert(T.missingModelId);
                return;
            }

            const s1 = currentModel?.s1 ?? lastS1 ?? "";
            const s2 = currentModel?.s2 ?? lastS2 ?? "";

            if (!s1 || !s2) {
                alert(T.nothingToSave);
                return;
            }

            saveBtn.disabled = true;
            const old = saveBtn.textContent;
            saveBtn.textContent = T.saving;

            const res = await fetch("/dna/builder/save", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "RequestVerificationToken": token || ""
                },
                body: JSON.stringify({
                    modelId,
                    strand1: s1,
                    strand2: s2
                })
            });

            if (!res.ok) {
                const msg = await res.text().catch(() => "");
                throw new Error(msg || `Save failed (${res.status})`);
            }

            saveBtn.textContent = T.saved;
            setTimeout(() => (saveBtn.textContent = old), 900);
        } catch (e) {
            alert(e?.message || T.analysisFailed);
            saveBtn.textContent = T.saveModel;
        } finally {
            saveBtn.disabled = false;
        }
    });

    importBtn?.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".txt,.json";

        input.onchange = e => {
            const file = e.target.files?.[0];
            if (!file) return;

            const r = new FileReader();
            r.onload = ev => {
                const res = parseFileStrict(String(ev.target?.result || ""));
                if (!res.ok) {
                    alert(res.error);
                    return;
                }

                dnaSequenceInput.value = `${res.s1}\n${res.s2}`;
                lastS1 = res.s1;
                lastS2 = res.s2;

                if (viewerApi) {
                    ensureViewer(res.s1, res.s2);
                }
            };

            r.readAsText(file);
        };

        input.click();
    });

    function ensureCompareModal() {
        let backdrop = document.getElementById("gx-compare-backdrop");
        let modal = document.getElementById("gx-compare-modal");

        if (!backdrop) {
            backdrop = document.createElement("div");
            backdrop.id = "gx-compare-backdrop";
            backdrop.className = "gx-modal-backdrop";
            backdrop.style.display = "none";
            document.body.appendChild(backdrop);
        }

        if (!modal) {
            modal = document.createElement("div");
            modal.id = "gx-compare-modal";
            modal.className = "gx-modal gx-compare-modal";
            modal.style.display = "none";
            document.body.appendChild(modal);
        }

        return { backdrop, modal };
    }

    function openCompareModal(original, current) {
        const { backdrop, modal } = ensureCompareModal();

        // Dispose any previous 3D chromosome scenes
        ["gx-chrom-normal", "gx-chrom-mutated"].forEach(id => {
            document.getElementById(id)?._gxDispose?.();
        });

        const compareTitle = currentLang === "bg" ? "Сравнение на хромозоми" : "Chromosome comparison";
        const sameLabel = original.s1 === current.s1
            ? (currentLang === "bg" ? " — последователностите са идентични" : " — sequences are identical")
            : "";

        modal.innerHTML = `
        <div class="gx-compare-modal__hd">
            <div>
                <div class="gx-compare-modal__title">${compareTitle}</div>
                <div style="font-size:13px;color:rgba(160,190,255,.65);margin-top:3px">
                    ${currentLang === "bg" ? "3D интерактивен изглед • Завъртете с мишката" : "3D interactive view • Drag to rotate"}<span style="color:rgba(100,220,130,.75)">${sameLabel}</span>
                </div>
            </div>
            <button type="button" class="gx-modal__close" id="gx-compare-close" aria-label="${esc(T.close)}">✕</button>
        </div>

        <div class="gx-compare-modal__body">
            <div class="gx-chrom-compare-grid">
                <section class="gx-chromosome-box">
                    <div id="gx-chrom-normal"></div>
                </section>
                <section class="gx-chromosome-box">
                    <div id="gx-chrom-mutated"></div>
                </section>
            </div>
            <div id="gx-chrom-info"></div>
        </div>
    `;

        backdrop.style.display = "block";
        modal.style.display = "block";
        document.body.classList.add("gx-ai-modal-open");

        const close = () => {
            // Dispose 3D scenes on close to free GPU memory
            ["gx-chrom-normal", "gx-chrom-mutated"].forEach(id => {
                document.getElementById(id)?._gxDispose?.();
            });
            backdrop.style.display = "none";
            modal.style.display = "none";
            document.body.classList.remove("gx-ai-modal-open");
        };

        backdrop.onclick = close;
        document.getElementById("gx-compare-close")?.addEventListener("click", close);

        // Slight defer so the modal is in the DOM and has dimensions
        requestAnimationFrame(() => {
            renderChromosomeAbnormalitiesCompare({
                normalMount: document.getElementById("gx-chrom-normal"),
                mutatedMount: document.getElementById("gx-chrom-mutated"),
                infoMount: document.getElementById("gx-chrom-info"),
                originalSequence: original.s1,
                mutatedSequence: current.s1
            });
        });
    }

    const compareBtn = document.getElementById("compare-btn");

    compareBtn?.addEventListener("click", () => {
        if (!viewerApi) return;

        const original = viewerApi.getOriginalModel?.();
        const current = viewerApi.getCurrentModel?.();

        if (!original || !current) {
            alert(T.analysisFailed);
            return;
        }

        openCompareModal(original, current);
    });

    visualizeBtn?.addEventListener("click", runVisualize);
    modeBasic?.addEventListener("change", rerenderForMode);
    modeSci?.addEventListener("change", rerenderForMode);

    scanDiseaseBtn?.addEventListener("click", async () => {
        const token = tokenEl?.value || "";
        const modelId = modelIdEl?.value || "";
        let loadingEl = null;

        try {
            const s1 = currentModel?.s1 ?? lastS1 ?? "";
            const s2 = currentModel?.s2 ?? lastS2 ?? "";

            if (!s1 || !s2) {
                alert(T.noDna);
                return;
            }

            scanDiseaseBtn.disabled = true;
            loadingEl = showScanLoading();

            const scanRes = await fetch("/dna/scandiseases", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "RequestVerificationToken": token
                },
                body: JSON.stringify({
                    modelId,
                    strand1: s1,
                    strand2: s2
                })
            });

            if (!scanRes.ok) {
                const errorText = await scanRes.text().catch(() => "");
                throw new Error(errorText || T.scanFailed);
            }

            const scanData = await scanRes.json();
            const bestResult = pickBestDiseaseResult(scanData.results);

            if (!bestResult) {
                hideScanLoading(loadingEl);
                showNoDiseasePopup();
                return;
            }

            setScanLoadingText(
                loadingEl,
                currentLang === "bg"
                    ? "Подготовка на кратък AI анализ..."
                    : "Preparing compact AI insight..."
            );

            const explainRes = await fetch("/dna/explain-disease-scan", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "RequestVerificationToken": token
                },
                body: JSON.stringify({
                    diseaseName: bestResult.diseaseName,
                    description: bestResult.description,
                    geneName: bestResult.matches?.[0]?.geneName || "",
                    matchedPatterns: bestResult.matchedPatterns,
                    totalPatterns: bestResult.totalPatterns,
                    confidence: bestResult.confidence
                })
            });

            if (!explainRes.ok) {
                const errorText = await explainRes.text().catch(() => "");
                throw new Error(errorText || T.explainFailed);
            }

            const explainData = await explainRes.json();

            setScanLoadingText(
                loadingEl,
                currentLang === "bg"
                    ? "Открит hotspot в ДНК модела..."
                    : "Detected hotspot in DNA model..."
            );

            hideScanLoading(loadingEl);

            await runNanobotReveal(bestResult);

            showDiseasePopup(explainData.explanation, bestResult);
        } catch (err) {
            hideScanLoading(loadingEl);
            alert(err?.message || T.analysisFailed);
        } finally {
            scanDiseaseBtn.disabled = false;
        }
    });

    setModeUI(!!modeSci?.checked);
});