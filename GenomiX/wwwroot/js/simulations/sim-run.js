function getToken() {
    return document.querySelector('input[name="__RequestVerificationToken"]')?.value || "";
}

async function postJson(url, body) {
    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "RequestVerificationToken": getToken()
        },
        body: JSON.stringify(body ?? {})
    });
    if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
    return await res.json().catch(() => ({}));
}

function debounce(fn, ms = 200) {
    let t = 0;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
    };
}

document.addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("sim-root");
    if (!root) return;

    const popId = root.dataset.popId;

    const btnRun = document.getElementById("sim-run");
    const btnPause = document.getElementById("sim-pause");
    const btnStep = document.getElementById("sim-step");

    const sTemp = document.getElementById("f-temp");
    const sRad = document.getElementById("f-rad");
    const sDis = document.getElementById("f-dis");
    const sRes = document.getElementById("f-res");
    const sSpeed = document.getElementById("f-speed");

    const vTick = document.getElementById("v-tick");
    const vAlive = document.getElementById("v-alive");
    const vDead = document.getElementById("v-dead");
    const vRep = document.getElementById("v-rep");
    const vAvg = document.getElementById("v-avg");

    const statusEl = document.getElementById("sim-status");

    let running = false;
    let inFlight = false;
    let raf = 0;
    let loopTimer = 0;

    function factorsPayload() {
        return {
            temperature: Number(sTemp.value),
            radiation: Number(sRad.value),
            diseasePressure: Number(sDis.value),
            resources: Number(sRes.value),
            speed: Number(sSpeed.value)
        };
    }

    const pushFactors = debounce(async () => {
        try {
            await postJson(`/simulations/${popId}/factors`, factorsPayload());
            statusEl.textContent = "Environment updated ✓";
            setTimeout(() => { if (!running) statusEl.textContent = "Ready."; }, 700);
        } catch (e) {
            statusEl.textContent = e?.message || "Factors update failed.";
        }
    }, 180);

    [sTemp, sRad, sDis, sRes, sSpeed].forEach(el => {
        el?.addEventListener("input", () => {
            statusEl.textContent = "Adjusting…";
            pushFactors();
        });
    });

    function setUiRunning(on) {
        running = !!on;
        btnRun.disabled = running;
        btnPause.disabled = !running;
        btnStep.disabled = running;
        statusEl.textContent = running ? "Running…" : "Paused.";
    }

    function applyTickResult(r) {
        if (typeof r.tick === "number") vTick.textContent = String(r.tick);
        if (typeof r.alive === "number") vAlive.textContent = String(r.alive);
        if (typeof r.dead === "number") vDead.textContent = String(r.dead);
        if (typeof r.reproduced === "number") vRep.textContent = String(r.reproduced);
        if (typeof r.avgFitness === "number") vAvg.textContent = r.avgFitness.toFixed(3);
    }

    async function doTick(steps) {
        if (inFlight) return;
        inFlight = true;
        try {
            const r = await postJson(`/simulations/${popId}/tick`, { steps });
            applyTickResult(r);
        } catch (e) {
            statusEl.textContent = e?.message || "Tick failed.";
            setUiRunning(false);
            clearTimeout(loopTimer);
        } finally {
            inFlight = false;
        }
    }

    function scheduleLoop() {
        clearTimeout(loopTimer);
        if (!running) return;

        const speed = Math.max(1, Math.min(50, Number(sSpeed.value || 1)));

        const steps = speed <= 10 ? speed : Math.round(10 + (speed - 10) * 2);

        const interval = Math.max(120, 520 - speed * 10);

        doTick(steps).then(() => {
            loopTimer = setTimeout(scheduleLoop, interval);
        });
    }

    btnRun?.addEventListener("click", async () => {
        try {
            await postJson(`/simulations/${popId}/running`, { isRunning: true });
            setUiRunning(true);
            scheduleLoop();
        } catch (e) {
            statusEl.textContent = e?.message || "Could not start.";
        }
    });

    btnPause?.addEventListener("click", async () => {
        try {
            await postJson(`/simulations/${popId}/running`, { isRunning: false });
            setUiRunning(false);
            clearTimeout(loopTimer);
        } catch (e) {
            statusEl.textContent = e?.message || "Could not pause.";
        }
    });

    btnStep?.addEventListener("click", async () => {
        statusEl.textContent = "Step…";
        await doTick(1);
        statusEl.textContent = "Ready.";
    });

    window.addEventListener("beforeunload", () => clearTimeout(loopTimer));
});
