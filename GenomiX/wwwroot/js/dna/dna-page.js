import { parseTextareaStrict, parseFileStrict } from "./dna-utils.js";
import { visualizeDNA } from "./dna-viewer.js";

let lastS1 = null;
let lastS2 = null;
let currentModel = null;

let viewerApi = null;
let currentModeSci = null;  

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

    function setModeUI(isSci) {
        currentModeSci = !!isSci;
        document.documentElement.classList.toggle("mode-scientific", currentModeSci);
    }

    function attachModelChanged(api) {
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
        return viewerApi;
    }

    function rerenderForMode() {
        const isSci = !!modeSci?.checked;
        setModeUI(isSci);

        if (viewerApi) {
            viewerApi.setScientific?.(isSci); 
            return;
        }
    }

    function runVisualize() {
        const res = parseTextareaStrict(dnaSequenceInput.value);
        if (!res.ok) { alert(res.error); return; }

        dnaInputSection.style.display = "none";
        dnaVisualizerSection.style.display = "block";

        lastS1 = res.s1;
        lastS2 = res.s2;

        ensureViewer(res.s1, res.s2);
    }

    saveBtn?.addEventListener("click", async () => {
        try {
            const modelId = modelIdEl?.value;
            const token = tokenEl?.value;

            if (!modelId) { alert("Missing model id."); return; }

            const s1 = currentModel?.s1 ?? lastS1 ?? "";
            const s2 = currentModel?.s2 ?? lastS2 ?? "";
            if (!s1 || !s2) { alert("Nothing to save."); return; }

            saveBtn.disabled = true;
            const old = saveBtn.textContent;
            saveBtn.textContent = "Saving...";

            const res = await fetch("/dna/builder/save", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "RequestVerificationToken": token || ""
                },
                body: JSON.stringify({ modelId, strand1: s1, strand2: s2 })
            });

            if (!res.ok) {
                const msg = await res.text().catch(() => "");
                throw new Error(msg || `Save failed (${res.status})`);
            }

            saveBtn.textContent = "Saved ✓";
            setTimeout(() => (saveBtn.textContent = old), 900);
        } catch (e) {
            alert(e?.message || "Save failed.");
            saveBtn.textContent = "Save model";
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
                if (!res.ok) { alert(res.error); return; }
                dnaSequenceInput.value = `${res.s1}\n${res.s2}`;
                lastS1 = res.s1; lastS2 = res.s2;
                if (viewerApi) ensureViewer(res.s1, res.s2);
            };
            r.readAsText(file);
        };
        input.click();
    });

    function runVisualize() {
        const res = parseTextareaStrict(dnaSequenceInput.value);
        if (!res.ok) { alert(res.error); return; }

        dnaInputSection.style.display = "none";
        dnaVisualizerSection.style.display = "block";

        lastS1 = res.s1;
        lastS2 = res.s2;

        const api = visualizeDNA(res.s1, res.s2, { scientific: !!modeSci?.checked });

        api.onModelChanged = (m) => { currentModel = m; lastS1 = m.s1; lastS2 = m.s2; };
    }

    visualizeBtn?.addEventListener("click", runVisualize);

    function rerenderForMode() {
        const sci = !!modeSci?.checked;
        if (lastS1 && lastS2) {
            const api = visualizeDNA(lastS1, lastS2, { scientific: sci });
            api.onModelChanged = (m) => { currentModel = m; lastS1 = m.s1; lastS2 = m.s2; };
            return;
        }

        const res = parseTextareaStrict(dnaSequenceInput.value);
        if (res.ok) {
            lastS1 = res.s1; lastS2 = res.s2;
            const api = visualizeDNA(res.s1, res.s2, { scientific: sci });
            api.onModelChanged = (m) => { currentModel = m; lastS1 = m.s1; lastS2 = m.s2; };
        }
    }

    visualizeBtn?.addEventListener("click", runVisualize);
    modeBasic?.addEventListener("change", rerenderForMode);
    modeSci?.addEventListener("change", rerenderForMode);

    function pickBestDiseaseResult(results) {
        if (!Array.isArray(results) || results.length === 0) return null;

        return [...results].sort((a, b) => {
            if ((b.confidence ?? 0) !== (a.confidence ?? 0)) {
                return (b.confidence ?? 0) - (a.confidence ?? 0);
            }

            return (b.matchedPatterns ?? 0) - (a.matchedPatterns ?? 0);
        })[0];
    }

    function escapeHtml(s) {
        return String(s ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
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
            modal.className = "gx-modal";
            modal.style.display = "none";
            document.body.appendChild(modal);
        }

        return { backdrop, modal };
    }

    function showNoDiseasePopup() {
        const { backdrop, modal } = ensureDiseaseModal();

        modal.innerHTML = `
        <div class="gx-modal__hd">
            <div class="gx-modal__title">No known markers detected</div>
            <button type="button" class="gx-modal__close" id="gx-disease-close">✕</button>
        </div>
        <div style="padding:16px;">
            <div class="gx-card">
                <p style="margin:0;">
                    No stored educational disease markers were detected in the current DNA model.
                </p>
            </div>
        </div>
    `;

        const close = () => {
            backdrop.style.display = "none";
            modal.style.display = "none";
        };

        backdrop.style.display = "block";
        modal.style.display = "block";
        backdrop.onclick = close;
        document.getElementById("gx-disease-close")?.addEventListener("click", close);
    }

    function showDiseasePopup(explanation, bestResult) {
        const { backdrop, modal } = ensureDiseaseModal();

        const lifestyle = Array.isArray(explanation?.lifestyleConsiderations)
            ? explanation.lifestyleConsiderations
            : [];

        const medication = Array.isArray(explanation?.medicationConsiderations)
            ? explanation.medicationConsiderations
            : [];

        const confidencePercent = Math.round((bestResult?.confidence ?? 0) * 100);

        modal.innerHTML = `
        <div class="gx-modal__hd">
            <div class="gx-modal__title">${escapeHtml(explanation?.title || "Potential genetic marker detected")}</div>
            <button type="button" class="gx-modal__close" id="gx-disease-close">✕</button>
        </div>

        <div style="padding:16px;">
            <div class="gx-card" style="margin-bottom:14px;">
                <h3 style="margin-top:0;">${escapeHtml(bestResult?.diseaseName || "")}</h3>
                <p><strong>Gene:</strong> ${escapeHtml(bestResult?.matches?.[0]?.geneName || "")}</p>
                <p><strong>Confidence:</strong> ${confidencePercent}%</p>
                <p style="margin-bottom:0;"><strong>Matched patterns:</strong> ${bestResult?.matchedPatterns ?? 0} / ${bestResult?.totalPatterns ?? 0}</p>
            </div>

            <div class="gx-card" style="margin-bottom:14px;">
                <h3 style="margin-top:0;">Summary</h3>
                <p style="margin-bottom:0;">${escapeHtml(explanation?.summary || "")}</p>
            </div>

            <div class="gx-card" style="margin-bottom:14px;">
                <h3 style="margin-top:0;">Biological context</h3>
                <p style="margin-bottom:0;">${escapeHtml(explanation?.biologyExplanation || "")}</p>
            </div>

            <div class="gx-card" style="margin-bottom:14px;">
                <h3 style="margin-top:0;">Lifestyle considerations</h3>
                ${lifestyle.length
                ? `<ul>${lifestyle.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`
                : `<p style="margin-bottom:0;">No additional notes.</p>`}
            </div>

            <div class="gx-card" style="margin-bottom:14px;">
                <h3 style="margin-top:0;">Medication considerations</h3>
                ${medication.length
                ? `<ul>${medication.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`
                : `<p style="margin-bottom:0;">No additional notes.</p>`}
            </div>

            <div class="gx-card">
                <h3 style="margin-top:0;">Important notice</h3>
                <p style="margin-bottom:0;">${escapeHtml(explanation?.warning || "")}</p>
            </div>
        </div>
    `;

        const close = () => {
            backdrop.style.display = "none";
            modal.style.display = "none";
        };

        backdrop.style.display = "block";
        modal.style.display = "block";
        backdrop.onclick = close;
        document.getElementById("gx-disease-close")?.addEventListener("click", close);
    }

    scanDiseaseBtn?.addEventListener("click", async () => {
        const token = document.querySelector("input[name='__RequestVerificationToken']")?.value || "";
        const modelId = document.getElementById("gx-model-id")?.value || "";

        try {
            const s1 = currentModel?.s1 ?? lastS1 ?? "";
            const s2 = currentModel?.s2 ?? lastS2 ?? "";

            if (!s1 || !s2) {
                alert("No DNA to scan.");
                return;
            }

            scanDiseaseBtn.disabled = true;
            const originalText = scanDiseaseBtn.textContent;
            scanDiseaseBtn.textContent = "Scanning...";

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
                throw new Error("Disease scan failed.");
            }

            const scanData = await scanRes.json();
            const bestResult = pickBestDiseaseResult(scanData.results);

            if (!bestResult) {
                showNoDiseasePopup();
                return;
            }

            scanDiseaseBtn.textContent = "Analyzing...";

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
                throw new Error("AI explanation failed.");
            }

            const explainData = await explainRes.json();
            showDiseasePopup(explainData.explanation, bestResult);

            scanDiseaseBtn.textContent = originalText;
        } catch (err) {
            console.error(err);
            alert(err?.message || "Disease analysis failed.");
        } finally {
            scanDiseaseBtn.disabled = false;
        }
    });

    setModeUI(!!modeSci?.checked);
});