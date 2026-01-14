import { parseTextareaStrict, parseFileStrict } from "./dna-utils.js";

function setMsg(text, kind = "info") {
    const el = document.getElementById("gxMsg");
    if (!el) return;

    el.hidden = false;
    el.textContent = text;

    el.classList.remove("gx-msg--ok", "gx-msg--err", "gx-msg--info");
    el.classList.add(kind === "ok" ? "gx-msg--ok" : kind === "err" ? "gx-msg--err" : "gx-msg--info");
}

document.addEventListener("DOMContentLoaded", () => {
    const textarea = document.getElementById("sequence");
    const importBtn = document.getElementById("import-btn");
    const createBtn = document.getElementById("create-btn");

    const form = document.getElementById("customCreateForm");
    const rawHidden = document.getElementById("rawInputHidden");
    const realSubmit = document.getElementById("realSubmit");

    importBtn?.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".txt,.json";

        input.onchange = (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            const r = new FileReader();
            r.onload = (ev) => {
                const res = parseFileStrict(String(ev.target.result || ""));
                if (!res.ok) {
                    setMsg(res.error, "err");
                    return;
                }

                textarea.value = `${res.s1}\n${res.s2}`;
                setMsg("Imported. Click Create & Open.", "ok");
            };
            r.readAsText(file);
        };

        input.click();
    });

    createBtn?.addEventListener("click", () => {
        if (!textarea || !form || !rawHidden || !realSubmit) return;

        const res = parseTextareaStrict(textarea.value);
        const nameInput = document.getElementById("modelName");
        const name = nameInput?.value.trim() || "Custom Model";
        if (!res.ok) {
            setMsg(res.error, "err");
            return;
        }

        rawHidden.value = `${res.s1}\n${res.s2}`;
        nameHidden.value = name;

        setMsg("Creating model…", "info");

        form.requestSubmit(realSubmit);
    });
});
