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

const cam = { x: 0, y: 0, zoom: 1, dragging: false, lx: 0, ly: 0 };
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function bindPanZoom(host) {
    if (!host) return;

    host.addEventListener("pointerdown", (e) => {
        cam.dragging = true;
        cam.lx = e.clientX;
        cam.ly = e.clientY;
        host.setPointerCapture?.(e.pointerId);
    });

    host.addEventListener("pointermove", (e) => {
        if (!cam.dragging) return;
        const dx = e.clientX - cam.lx;
        const dy = e.clientY - cam.ly;
        cam.lx = e.clientX;
        cam.ly = e.clientY;

        cam.x += dx / cam.zoom;
        cam.y += dy / cam.zoom;

        cam.x = clamp(cam.x, -900, 900);
        cam.y = clamp(cam.y, -500, 500);
    });

    window.addEventListener("pointerup", () => cam.dragging = false);

    host.addEventListener("wheel", (e) => {
        e.preventDefault();
        const z = cam.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08);
        cam.zoom = clamp(z, 0.7, 2.1);
    }, { passive: false });
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

    const host = document.getElementById("gx-pop-canvas");
    const canvas = document.getElementById("sim-canvas");
    const fsBtn = document.getElementById("gx-canvasfs");

    bindPanZoom(host);

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
            y: 0.40 + Math.random() * 0.55,
            vx: (Math.random() * 2 - 1) * 0.03,
            vy: (Math.random() * 2 - 1) * 0.015,
            wob: Math.random() * 10,
            popFx: 0
        };
    });

    const foods = [];

    function resizeCanvas() {
        if (!canvas || !host || !ctx) return;
        const r = host.getBoundingClientRect();
        const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        canvas.width = Math.floor(r.width * dpr);
        canvas.height = Math.floor(r.height * dpr);
        canvas.style.width = `${r.width}px`;
        canvas.style.height = `${r.height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawBackground(w, h) {
        const horizon = h * 0.32;

        const sky = ctx.createLinearGradient(0, 0, 0, horizon);
        sky.addColorStop(0, "rgba(16,24,44,1)");
        sky.addColorStop(1, "rgba(10,16,30,1)");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, horizon);

        const land = ctx.createLinearGradient(0, horizon, 0, h);
        land.addColorStop(0, "rgba(16,64,40,1)");
        land.addColorStop(1, "rgba(8,28,18,1)");
        ctx.fillStyle = land;
        ctx.fillRect(0, horizon, w, h - horizon);

        drawHillLayer(w, h, horizon, 0.25, 46, "rgba(8,40,28,.35)");
        drawHillLayer(w, h, horizon, 0.55, 34, "rgba(10,64,38,.35)");
        drawHillLayer(w, h, horizon, 0.90, 22, "rgba(14,92,52,.36)");
    }

    function drawHillLayer(w, h, horizon, parallax, amp, fill) {
        const ox = -cam.x * parallax;
        const oy = -cam.y * parallax;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, h);

        for (let x = 0; x <= w; x += 18) {
            const t = (x + ox) * 0.004;
            const y = horizon + oy + Math.sin(t) * amp + Math.sin(t * 1.7) * (amp * 0.35);
            ctx.lineTo(x, y);
        }

        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.restore();
    }

    function beginWorld(w, h) {
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(cam.zoom, cam.zoom);
        ctx.translate(-w / 2 + cam.x, -h / 2 + cam.y);
    }
    function endWorld() { ctx.restore(); }

    function drawFood(w, h) {
        for (const f of foods) {
            const x = f.x * w;
            const y = f.y * h;
            ctx.globalAlpha = Math.max(0, Math.min(1, f.s));
            ctx.fillStyle = "rgba(120,255,180,.9)";
            ctx.beginPath();
            ctx.arc(x, y, 3.2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    function drawAgents(w, h) {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        for (const a of agents) {
            const x = a.x * w;
            const y = a.y * h;

            ctx.globalAlpha = (a.status === "dead") ? 0.35 : 1;

            ctx.fillStyle = "rgba(0,0,0,.22)";
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

    function spawnFood(n) {
        for (let i = 0; i < n; i++) {
            foods.push({ x: Math.random(), y: 0.45 + Math.random() * 0.5, s: 1.0 });
        }
    }

    function stepSim(dt, w, h) {
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
                a.vx += Math.sin(a.wob) * 0.008;
                a.vy += Math.cos(a.wob * 0.9) * 0.006;

                let target = null;
                if (foods.length) {
                    let best = 1e9;
                    for (const f of foods) {
                        const dx = f.x - a.x;
                        const dy = f.y - a.y;
                        const d2 = dx * dx + dy * dy;
                        if (d2 < best) { best = d2; target = f; }
                    }
                }
                if (target) {
                    a.vx += (target.x - a.x) * 0.06;
                    a.vy += (target.y - a.y) * 0.04;
                }

                const sp = 0.05;
                a.vx = clamp(a.vx, -sp, sp);
                a.vy = clamp(a.vy, -sp, sp);
            }

            a.x += a.vx * dt;
            a.y += a.vy * dt;

            if (a.x < 0.03) { a.x = 0.03; a.vx *= -0.7; }
            if (a.x > 0.97) { a.x = 0.97; a.vx *= -0.7; }
            if (a.y < 0.38) { a.y = 0.38; a.vy *= -0.7; }
            if (a.y > 0.95) { a.y = 0.95; a.vy *= -0.7; }

            if (a.status !== "dead") {
                for (let i = foods.length - 1; i >= 0; i--) {
                    const f = foods[i];
                    const dx = f.x - a.x;
                    const dy = f.y - a.y;
                    if (dx * dx + dy * dy < 0.0012) {
                        foods.splice(i, 1);
                        a.vx += (Math.random() * 2 - 1) * 0.02;
                        a.vy += (Math.random() * 2 - 1) * 0.015;
                        break;
                    }
                }
            }
        }
    }

    function syncStatusesFromCounts(r) {
        const total = agents.length;
        const dead = clamp(Number(r.dead ?? 0), 0, total);
        const rep = clamp(Number(r.reproduced ?? 0), 0, total - dead);

        for (const a of agents) a.status = "alive";

        for (let i = 0; i < dead; i++) agents[i].status = "dead";
        for (let i = dead; i < dead + rep; i++) agents[i].status = "reproduced";
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

        beginWorld(w, h);

        if (running) {
            stepSim(dt, w, h);
            drawFood(w, h);
        } else {
            foods.length = 0;
        }

        drawAgents(w, h);

        endWorld();

        requestAnimationFrame(frame);
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas, { passive: true });
    requestAnimationFrame(frame);

    fsBtn?.addEventListener("click", async () => {
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
                return;
            }
            if (host?.requestFullscreen) await host.requestFullscreen();
            else if (canvas?.requestFullscreen) await canvas.requestFullscreen();
        } catch {
            log("Fullscreen blocked by browser.");
        }
    });

    document.addEventListener("fullscreenchange", () => {
        resizeCanvas();
    });

    const pushFactors = debounce(async () => {
        try {
            await postJson(`/simulations/${popId}/factors`, factorsPayload());
            if (statusEl) statusEl.textContent = "Environment updated ✓";
            log(`Env: T=${sTemp.value}°C • rad=${Number(sRad.value).toFixed(2)} • dis=${Number(sDis.value).toFixed(2)} • res=${Number(sRes.value).toFixed(2)}`);
            setTimeout(() => { if (!running && statusEl) statusEl.textContent = "Ready."; }, 700);
        } catch (e) {
            if (statusEl) statusEl.textContent = e?.message || "Factors update failed.";
            log("Env update failed.");
        }
    }, 180);

    [sTemp, sRad, sDis, sRes, sSpeed].forEach(el => {
        el?.addEventListener("input", () => {
            if (statusEl) statusEl.textContent = "Adjusting…";
            pushFactors();
        });
    });

    async function doTick(steps) {
        if (inFlight) return;
        inFlight = true;
        try {
            const r = await postJson(`/simulations/${popId}/tick`, { steps });
            applyTickResult(r);
            syncStatusesFromCounts(r);
        } catch (e) {
            if (statusEl) statusEl.textContent = e?.message || "Tick failed.";
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

        const speed = clamp(Number(sSpeed.value || 1), 1, 50);
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
            if (statusEl) statusEl.textContent = e?.message || "Could not start.";
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
            if (statusEl) statusEl.textContent = e?.message || "Could not pause.";
            log("Could not pause.");
        }
    });

    btnStep?.addEventListener("click", async () => {
        if (statusEl) statusEl.textContent = "Step…";
        log("Tick ×10");
        await doTick(10);
        if (!running && statusEl) statusEl.textContent = "Ready.";
    });

    window.addEventListener("beforeunload", () => clearTimeout(loopTimer));

    const scenarioSel = document.getElementById("gx-scenario");
    const scenarioApply = document.getElementById("gx-scenario-apply");

    const SCENARIOS = [
        { id: "gold", name: "🌿 Golden Valley", f: { temperature: 22, radiation: 0.05, diseasePressure: 0.08, resources: 0.85, speed: 10 }, desc: "Balanced, stable growth." },
        { id: "ice", name: "❄️ Ice Age", f: { temperature: -10, radiation: 0.06, diseasePressure: 0.12, resources: 0.55, speed: 12 }, desc: "Cold stress, slower survival." },
        { id: "rad", name: "☢️ Radiation Leak", f: { temperature: 22, radiation: 0.75, diseasePressure: 0.10, resources: 0.70, speed: 14 }, desc: "Fast collapse under radiation." },
        { id: "plague", name: "🦠 Plague", f: { temperature: 22, radiation: 0.05, diseasePressure: 0.85, resources: 0.70, speed: 14 }, desc: "Disease dominates." },
        { id: "drought", name: "🏜️ Drought", f: { temperature: 35, radiation: 0.10, diseasePressure: 0.15, resources: 0.18, speed: 12 }, desc: "Resource collapse." }
    ];

    function fillScenarioSelect() {
        if (!scenarioSel) return;
        for (const s of SCENARIOS) {
            const opt = document.createElement("option");
            opt.value = s.id;
            opt.textContent = s.name;
            scenarioSel.appendChild(opt);
        }
    }

    function setSlider(el, v) {
        if (!el) return;
        el.value = String(v);
        el.dispatchEvent(new Event("input", { bubbles: true }));
    }

    scenarioApply?.addEventListener("click", async () => {
        if (!scenarioSel?.value) return;
        const s = SCENARIOS.find(x => x.id === scenarioSel.value);
        if (!s) return;

        setSlider(sTemp, s.f.temperature);
        setSlider(sRad, s.f.radiation);
        setSlider(sDis, s.f.diseasePressure);
        setSlider(sRes, s.f.resources);
        setSlider(sSpeed, s.f.speed);

        try {
            await postJson(`/simulations/${popId}/factors`, factorsPayload());
            if (statusEl) statusEl.textContent = "Scenario applied ✓";
            log(`Scenario applied: ${s.name}`);
            if (s.desc) log(s.desc);
        } catch (e) {
            if (statusEl) statusEl.textContent = e?.message || "Scenario apply failed.";
            log("Scenario apply failed.");
        }
    });

    fillScenarioSelect();
    log("Valley renderer online ✅");
});