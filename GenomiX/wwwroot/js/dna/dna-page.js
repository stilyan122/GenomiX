import { parseTextareaStrict, parseFileStrict } from "./dna-utils.js";
import { visualizeDNA } from "./dna-viewer.js";

let lastS1 = null;
let lastS2 = null;
let currentModel = null;

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

    modeBasic?.addEventListener("change", rerenderForMode);
    modeSci?.addEventListener("change", rerenderForMode);
});