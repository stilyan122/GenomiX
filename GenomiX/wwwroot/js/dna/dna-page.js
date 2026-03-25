import { parseTextareaStrict, parseFileStrict } from "./dna-utils.js";
import { visualizeDNA } from "./dna-viewer.js";

let lastS1 = null;
let lastS2 = null;
let currentModel = null;

let viewerApi = null;
let currentModeSci = false;

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
            visualScene: "Визуален механизъм",
            mechanismFlow: "Как се развива в тялото",
            affectedSystems: "Засегнати системи",
            whyMatters: "Защо това е важно",

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
            mechanism: "Биологичен механизъм",
            symptoms: "Възможни прояви",
            food: "Хранене и начин на живот",
            meds: "Лекарства и вещества за внимание",
            monitoring: "Какво да се проследява",
            notice: "Важно",
            close: "Затвори",
            fallbackTitle: "Потенциален генетичен маркер"
        }
        : {
            missingModelId: "Missing model id.",
            nothingToSave: "Nothing to save.",
            saveModel: "Save model",
            saving: "Saving...",
            saved: "Saved ✓",

            mechanismFlow: "How it evolves in the body",
            affectedSystems: "Affected systems",
            whyMatters: "Why this matters",

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
            mechanism: "Biological mechanism",
            visualScene: "Visual mechanism",
            symptoms: "Possible signs",
            food: "Food and lifestyle",
            meds: "Medication cautions",
            monitoring: "What to monitor",
            notice: "Important",
            close: "Close",
            fallbackTitle: "Potential genetic marker detected"
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

        function step() {
            if (i < text.length) {
                el.textContent += text.charAt(i);
                i++;
                setTimeout(step, speed);
            }
        }

        step();
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
        };
    }

    function ensureViewer(s1, s2) {
        if (!viewerApi) {
            viewerApi = visualizeDNA(s1, s2, { scientific: currentModeSci });
            attachModelChanged(viewerApi);
            return viewerApi;
        }

        viewerApi.setModel?.(s1, s2);
        viewerApi.setScientific?.(currentModeSci);
        attachModelChanged(viewerApi);
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

    function getIconForType(type) {
        switch (type) {
            case "gene-mutation": return "🧬";
            case "protein-change": return "⚛️";
            case "cell-change": return "🔬";
            case "flow-block": return "🩸";
            case "accumulation": return "⚠️";
            case "signal-loss": return "🧠";
            case "organ-effect": return "❤️";
            default: return "•";
        }
    }

    function animateVM(container) {
        const steps = container.querySelectorAll(".gx-vm-step, .gx-vm-arrow");

        steps.forEach((el, i) => {
            el.style.opacity = "0";
            el.style.transform = "translateY(10px)";

            setTimeout(() => {
                el.style.transition = "all .4s ease";
                el.style.opacity = "1";
                el.style.transform = "translateY(0)";
            }, i * 140);
        });
    }

    function renderVisualMechanism(container, explanation) {
        const steps = explanation?.visualMechanism || [];

        if (!container) return;

        if (!Array.isArray(steps) || steps.length === 0) {
            container.innerHTML = `<p class="gx-ai-empty">—</p>`;
            return;
        }

        container.innerHTML = `
            <div class="gx-vm">
                ${steps.map((s, i) => `
                    <div class="gx-vm-step gx-vm-${esc(s.type || "")}">
                        <div class="gx-vm-node">
                            <div class="gx-vm-icon">${getIconForType(s.type)}</div>
                        </div>

                        <div class="gx-vm-content">
                            <div class="gx-vm-title">${esc(s.title || "")}</div>
                            <div class="gx-vm-desc">${esc(s.description || "")}</div>
                        </div>
                    </div>
                    ${i < steps.length - 1 ? `<div class="gx-vm-arrow">↓</div>` : ``}
                `).join("")}
            </div>
        `;

        animateVM(container);
    }

    async function aiRevealSequence() {
        const overlay = document.createElement("div");
        overlay.className = "gx-ai-reveal";
        overlay.innerHTML = `
        <div class="gx-ai-reveal__inner">
            <div class="gx-ai-reveal__icon">🧬</div>
            <div class="gx-ai-reveal__text">${currentLang === "bg" ? "AI биологичен анализ..." : "AI biological analysis..."}</div>
        </div>
    `;
        document.body.appendChild(overlay);

        requestAnimationFrame(() => overlay.classList.add("is-on"));

        await new Promise(r => setTimeout(r, 1400));

        overlay.classList.remove("is-on");
        await new Promise(r => setTimeout(r, 260));
        overlay.remove();
    }

    function renderDiseaseScene(container, explanation) {
        if (!container) return;

        const theme = explanation?.visualTheme || "blood";

        if (theme === "blood") {
            container.innerHTML = renderBloodScene();
            return;
        }

        if (theme === "lung") {
            container.innerHTML = renderLungScene();
            return;
        }

        if (theme === "neuro") {
            container.innerHTML = renderNeuroScene();
            return;
        }

        if (theme === "metabolic") {
            container.innerHTML = renderMetabolicScene();
            return;
        }

        container.innerHTML = renderBloodScene();
    }

    function renderBloodScene() {
        return `
        <div class="gx-scene gx-scene--blood">
            <div class="gx-scene__label gx-scene__label--left">DNA</div>
            <div class="gx-scene__dna"></div>

            <div class="gx-scene__arrow"></div>

            <div class="gx-rbc gx-rbc--normal"></div>
            <div class="gx-rbc gx-rbc--sickle"></div>

            <div class="gx-scene__arrow"></div>

            <div class="gx-vessel">
                <span class="gx-vessel__cell c1"></span>
                <span class="gx-vessel__cell c2"></span>
                <span class="gx-vessel__cell c3"></span>
            </div>
        </div>
    `;
    }

    function renderLungScene() {
        return `
        <div class="gx-scene gx-scene--lung">
            <div class="gx-scene__channel">
                <div class="gx-scene__gate"></div>
                <span class="gx-ion i1"></span>
                <span class="gx-ion i2"></span>
                <span class="gx-ion i3"></span>
            </div>

            <div class="gx-scene__arrow"></div>

            <div class="gx-mucus">
                <span class="gx-mucus__blob b1"></span>
                <span class="gx-mucus__blob b2"></span>
                <span class="gx-mucus__blob b3"></span>
            </div>
        </div>
    `;
    }

    function renderNeuroScene() {
        return `
        <div class="gx-scene gx-scene--neuro">
            <div class="gx-neuron gx-neuron--left"></div>
            <div class="gx-synapse">
                <span class="gx-signal s1"></span>
                <span class="gx-signal s2"></span>
                <span class="gx-signal s3"></span>
            </div>
            <div class="gx-neuron gx-neuron--right is-dim"></div>
        </div>
    `;
    }

    function renderMetabolicScene() {
        return `
        <div class="gx-scene gx-scene--metabolic">
            <div class="gx-enzyme"></div>
            <div class="gx-scene__arrow"></div>
            <div class="gx-molecule-cloud">
                <span class="gx-molecule m1"></span>
                <span class="gx-molecule m2"></span>
                <span class="gx-molecule m3"></span>
                <span class="gx-molecule m4"></span>
                <span class="gx-molecule m5"></span>
            </div>
        </div>
    `;
    }

    function showDiseasePopup(explanation, bestResult) {
        const { backdrop, modal } = ensureDiseaseModal();

        const theme = explanation?.visualTheme || "blood";
        modal.className = `gx-modal gx-ai-modal gx-ai-theme-${theme}`;

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

            <section class="gx-ai-card gx-ai-card--scene">
                <h3>${currentLang === "bg" ? "Визуален механизъм" : "Visual mechanism"}</h3>
                <div id="gx-disease-scene"></div>
            </section>

            <div class="gx-ai-grid gx-ai-grid--single">
                <section class="gx-ai-card">
                    <p>${esc(explanation?.biologicalMechanism || "")}</p>
                </section>

                <section class="gx-ai-card gx-ai-card--flow">
                    <h3>${esc(T.visualScene)}</h3>
                    <div class="gx-flow-bg">
                        <span class="gx-flow-pulse"></span>
                        <span class="gx-flow-particle p1"></span>
                        <span class="gx-flow-particle p2"></span>
                        <span class="gx-flow-particle p3"></span>
                    </div>
                    <h3>${esc(T.mechanismFlow)}</h3>
                    <div id="gx-vm-container"></div>
                </section>

                <section class="gx-ai-card">
                    <h3>${esc(T.affectedSystems)}</h3>
                    ${systemsHtml(explanation?.affectedSystems)}
                </section>

                <section class="gx-ai-card">
                    <h3>${esc(T.whyMatters)}</h3>
                    <p>${esc(explanation?.whyThisMatters || "")}</p>
                </section>

                <section class="gx-ai-card">
                    <h3>${esc(T.symptoms)}</h3>
                    ${listHtml(explanation?.possibleSymptoms)}
                </section>

                <section class="gx-ai-card">
                    <h3>${esc(T.food)}</h3>
                    ${listHtml(explanation?.foodAndLifestyleConsiderations)}
                </section>

                <section class="gx-ai-card">
                    <h3>${esc(T.meds)}</h3>
                    ${listHtml(explanation?.medicationConsiderations)}
                </section>

                <section class="gx-ai-card">
                    <h3>${esc(T.monitoring)}</h3>
                    ${listHtml(explanation?.helpfulMonitoringIdeas)}
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

        renderDiseaseScene(
            document.getElementById("gx-disease-scene"),
            explanation
        );

        renderVisualMechanism(
            document.getElementById("gx-vm-container"),
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

    visualizeBtn?.addEventListener("click", runVisualize);
    modeBasic?.addEventListener("change", rerenderForMode);
    modeSci?.addEventListener("change", rerenderForMode);

    scanDiseaseBtn?.addEventListener("click", async () => {
        const token = tokenEl?.value || "";
        const modelId = modelIdEl?.value || "";

        try {
            const s1 = currentModel?.s1 ?? lastS1 ?? "";
            const s2 = currentModel?.s2 ?? lastS2 ?? "";

            if (!s1 || !s2) {
                alert(T.noDna);
                return;
            }

            scanDiseaseBtn.disabled = true;
            const originalText = scanDiseaseBtn.textContent;

            scanDiseaseBtn.textContent = T.scanning;

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
                showNoDiseasePopup();
                scanDiseaseBtn.textContent = originalText;
                return;
            }

            scanDiseaseBtn.textContent = T.generating;

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
            await aiRevealSequence();
            showDiseasePopup(explainData.explanation, bestResult);

            scanDiseaseBtn.textContent = originalText;
        } catch (err) {
            console.error(err);
            alert(err?.message || T.analysisFailed);
            scanDiseaseBtn.textContent = T.scanBtn;
        } finally {
            scanDiseaseBtn.disabled = false;
        }
    });

    setModeUI(!!modeSci?.checked);
});