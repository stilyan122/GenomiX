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

    const grid = document.querySelector(".gx-rungrid");
    const envBtn = document.getElementById("gx-envtoggle");
    envBtn?.addEventListener("click", () => {
        grid?.classList.toggle("is-env-collapsed");
    });

    const logBody = document.getElementById("gx-run-logBody");
    function log(line) {
        if (!logBody) return;
        const div = document.createElement("div");
        div.className = "gx-logline";
        div.textContent = line;
        logBody.appendChild(div);
        logBody.scrollTop = logBody.scrollHeight;
    }

    function factorsPayload() {
        return {
            temperature: Number(sTemp.value),
            radiation: Number(sRad.value),
            diseasePressure: Number(sDis.value),
            resources: Number(sRes.value),
            speed: Number(sSpeed.value)
        };
    }

    let running = false;
    let inFlight = false;
    let loopTimer = 0;

    function setUiRunning(on) {
        running = !!on;
        if (btnRun) btnRun.disabled = running;
        if (btnPause) btnPause.disabled = !running;
        if (btnStep) btnStep.disabled = running;
        if (statusEl) statusEl.textContent = running ? "Running…" : "Paused.";
    }

    function applyTickResult(r) {
        if (typeof r.tick === "number") vTick.textContent = String(r.tick);
        if (typeof r.alive === "number") vAlive.textContent = String(r.alive);
        if (typeof r.dead === "number") vDead.textContent = String(r.dead);
        if (typeof r.reproduced === "number") vRep.textContent = String(r.reproduced);
        if (typeof r.avgFitness === "number") vAvg.textContent = r.avgFitness.toFixed(3);
    }

    const canvas = document.getElementById("sim-canvas");
    const host = document.getElementById("gx-pop-canvas");
    const fsBtn = document.getElementById("gx-canvasfs");

    const seedEl = document.getElementById("sim-seed");
    const seed = seedEl ? JSON.parse(seedEl.textContent || "{}") : {};
    const seedOrgs = Array.isArray(seed.organisms) ? seed.organisms : [];

    const ctx = canvas?.getContext("2d", { alpha: true }) ?? null;

    const speciesEmoji = {
        mouse: "🐭",
        pig: "🐷",
        cow: "🐮",
        rabbit: "🐰",
        fox: "🦊",
        bird: "🐦"
    };

    const agents = seedOrgs.map((o, idx) => {
        const sp = o.species || ["mouse", "pig", "cow", "rabbit", "fox", "bird"][idx % 6];
        return {
            id: o.id,
            name: o.name || `Org ${idx + 1}`,
            sci: o.sci || "",
            species: sp,
            status: o.status || "alive",
            fitness: Number(o.fitness ?? 1),
            x: Math.random(),
            y: 0.35 + Math.random() * 0.55,
            vx: (Math.random() * 2 - 1) * 0.04,
            vy: (Math.random() * 2 - 1) * 0.02,
            wob: Math.random() * 10,
            popFx: 0
        };
    });

    const foods = [];
    function spawnFood(n = 2) {
        for (let i = 0; i < n; i++) {
            foods.push({ x: Math.random(), y: 0.45 + Math.random() * 0.5, s: 1.0 });
        }
    }

    function resizeCanvas() {
        if (!canvas || !host) return;
        const r = host.getBoundingClientRect();
        const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        canvas.width = Math.floor(r.width * dpr);
        canvas.height = Math.floor(r.height * dpr);
        canvas.style.width = `${r.width}px`;
        canvas.style.height = `${r.height}px`;
        if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawBackground(w, h) {
        if (!ctx) return;

        const g1 = ctx.createLinearGradient(0, 0, 0, h);
        g1.addColorStop(0, "rgba(50,90,150,.35)");
        g1.addColorStop(0.55, "rgba(20,30,55,.15)");
        g1.addColorStop(1, "rgba(10,12,18,0)");
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, w, h);

        ctx.globalAlpha = 0.35;
        ctx.fillStyle = "rgba(70,140,120,.35)";
        ctx.beginPath();
        ctx.moveTo(0, h * 0.62);
        ctx.bezierCurveTo(w * 0.25, h * 0.52, w * 0.5, h * 0.72, w, h * 0.60);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = 0.22;
        ctx.fillStyle = "rgba(100,180,150,.35)";
        ctx.beginPath();
        ctx.moveTo(0, h * 0.72);
        ctx.bezierCurveTo(w * 0.22, h * 0.78, w * 0.55, h * 0.62, w, h * 0.74);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = 1;
    }

    function drawFood(w, h) {
        if (!ctx) return;
        for (const f of foods) {
            const x = f.x * w;
            const y = f.y * h;
            ctx.globalAlpha = Math.max(0, Math.min(1, f.s));
            ctx.fillStyle = "rgba(120,255,180,.9)";
            ctx.beginPath();
            ctx.arc(x, y, 3.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    function drawAgents(w, h) {
        if (!ctx) return;

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        for (const a of agents) {
            const x = a.x * w;
            const y = a.y * h;

            if (a.status === "dead") {
                ctx.globalAlpha = 0.35;
            } else {
                ctx.globalAlpha = 1;
            }

            ctx.fillStyle = "rgba(0,0,0,.25)";
            ctx.beginPath();
            ctx.ellipse(x, y + 10, 10, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            if (a.popFx > 0) {
                const r = 10 + (1 - a.popFx) * 28;
                ctx.strokeStyle = `rgba(120,170,255,${0.35 * a.popFx})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.stroke();
            }

            const em = speciesEmoji[a.species] || "🧬";
            ctx.font = "20px system-ui, Segoe UI Emoji";
            ctx.fillStyle = "rgba(255,255,255,.95)";
            ctx.fillText(em, x, y - 2);

            const col =
                a.status === "alive" ? "rgba(120,255,180,.95)" :
                    a.status === "reproduced" ? "rgba(120,170,255,.95)" :
                        "rgba(255,120,120,.9)";

            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(x + 14, y - 12, 3.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 1;
        }
    }

    function stepSim(dt) {
        const w = canvas ? (canvas.clientWidth || 1) : 1;
        const h = canvas ? (canvas.clientHeight || 1) : 1;

        const res = Math.max(0, Math.min(1, Number(sRes?.value ?? 0.7)));
        if (Math.random() < 0.02 + res * 0.06) spawnFood(1);
        if (foods.length > 240) foods.splice(0, foods.length - 240);

        for (const f of foods) f.s = Math.max(0.15, f.s - dt * 0.02);

        for (const a of agents) {
            if (a.popFx > 0) a.popFx = Math.max(0, a.popFx - dt * 0.9);

            if (a.status === "dead") {
                a.vx *= 0.98;
                a.vy *= 0.98;
            } else {
                a.wob += dt * 1.5;
                const wobx = Math.sin(a.wob) * 0.01;
                const woby = Math.cos(a.wob * 0.9) * 0.006;

                let target = null;
                if (foods.length && Math.random() < 0.12) {
                    let bestD = 1e9;
                    for (const f of foods) {
                        const dx = f.x - a.x;
                        const dy = f.y - a.y;
                        const d2 = dx * dx + dy * dy;
                        if (d2 < bestD) { bestD = d2; target = f; }
                    }
                }

                if (target) {
                    a.vx += (target.x - a.x) * 0.08;
                    a.vy += (target.y - a.y) * 0.05;
                }

                a.vx += wobx;
                a.vy += woby;

                const sp = 0.06;
                a.vx = Math.max(-sp, Math.min(sp, a.vx));
                a.vy = Math.max(-sp, Math.min(sp, a.vy));
            }

            a.x += a.vx * dt;
            a.y += a.vy * dt;

            if (a.x < 0.03) { a.x = 0.03; a.vx *= -0.7; }
            if (a.x > 0.97) { a.x = 0.97; a.vx *= -0.7; }
            if (a.y < 0.35) { a.y = 0.35; a.vy *= -0.7; }
            if (a.y > 0.95) { a.y = 0.95; a.vy *= -0.7; }

            if (a.status !== "dead") {
                for (let i = foods.length - 1; i >= 0; i--) {
                    const f = foods[i];
                    const dx = f.x - a.x;
                    const dy = f.y - a.y;
                    if (dx * dx + dy * dy < 0.0012) {
                        foods.splice(i, 1);
                        a.vx += (Math.random() * 2 - 1) * 0.03;
                        a.vy += (Math.random() * 2 - 1) * 0.02;
                        if (Math.random() < 0.08) log(`${a.name} ate food 🌿`);
                        break;
                    }
                }
            }
        }
    }

    let lastT = performance.now();
    function frame(now) {
        if (!ctx || !canvas || !host) return;

        const dt = Math.min(0.05, (now - lastT) / 1000);
        lastT = now;

        const r = host.getBoundingClientRect();
        const w = r.width || 1;
        const h = r.height || 1;

        ctx.clearRect(0, 0, w, h);
        drawBackground(w, h);

        if (running) {
            stepSim(dt);
            drawFood(w, h);
        } else {
            foods.length = 0;
        }

        drawAgents(w, h);

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);

    fsBtn?.addEventListener("click", async () => {
        if (!host) return;
        if (document.fullscreenElement) await document.exitFullscreen();
        else await host.requestFullscreen?.();
    });

    document.addEventListener("fullscreenchange", () => {
        resizeCanvas();
        log(document.fullscreenElement ? "Canvas fullscreen enabled." : "Canvas fullscreen exited.");
    });

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas, { passive: true });
    spawnFood(16);
    requestAnimationFrame(frame);

    const pushFactors = debounce(async () => {
        try {
            await postJson(`/simulations/${popId}/factors`, factorsPayload());
            statusEl.textContent = "Environment updated ✓";
            log(`Env: T=${sTemp.value}°C • rad=${Number(sRad.value).toFixed(2)} • dis=${Number(sDis.value).toFixed(2)} • res=${Number(sRes.value).toFixed(2)}`);
            setTimeout(() => { if (!running) statusEl.textContent = "Ready."; }, 700);
        } catch (e) {
            statusEl.textContent = e?.message || "Factors update failed.";
            log("Env update failed.");
        }
    }, 180);

    [sTemp, sRad, sDis, sRes, sSpeed].forEach(el => {
        el?.addEventListener("input", () => {
            statusEl.textContent = "Adjusting…";
            pushFactors();
        });
    });

    async function doTick(steps) {
        if (inFlight) return;
        inFlight = true;
        try {
            const r = await postJson(`/simulations/${popId}/tick`, { steps });
            applyTickResult(r);

            if (typeof r.dead === "number" && r.dead > 0 && Math.random() < 0.35) log("Some organisms died ☠️");
            if (typeof r.reproduced === "number" && r.reproduced > 0 && Math.random() < 0.35) log("Reproduction detected ✨");

            if (typeof r.dead === "number") {
                const wantDead = r.dead;
                let deadNow = agents.filter(a => a.status === "dead").length;
                while (deadNow < wantDead && deadNow < agents.length) {
                    const cand = agents.find(a => a.status !== "dead");
                    if (!cand) break;
                    cand.status = "dead";
                    deadNow++;
                }
            }
            if (typeof r.reproduced === "number") {
                const reps = r.reproduced;
                for (let k = 0; k < Math.min(3, reps); k++) {
                    const a = agents[Math.floor(Math.random() * agents.length)];
                    if (a && a.status !== "dead") { a.status = "reproduced"; a.popFx = 1; }
                }
            }
        } catch (e) {
            statusEl.textContent = e?.message || "Tick failed.";
            log("Tick failed.");
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
            log("Simulation started ▶️");
            scheduleLoop();
        } catch (e) {
            statusEl.textContent = e?.message || "Could not start.";
            log("Could not start.");
        }
    });

    btnPause?.addEventListener("click", async () => {
        try {
            await postJson(`/simulations/${popId}/running`, { isRunning: false });
            setUiRunning(false);
            log("Simulation paused ⏸");
            clearTimeout(loopTimer);
        } catch (e) {
            statusEl.textContent = e?.message || "Could not pause.";
            log("Could not pause.");
        }
    });

    btnStep?.addEventListener("click", async () => {
        statusEl.textContent = "Step…";
        log("Tick ×10");
        await doTick(10);
        statusEl.textContent = "Ready.";
    });

    window.addEventListener("beforeunload", () => clearTimeout(loopTimer));

    log("Valley renderer online ✅");
});