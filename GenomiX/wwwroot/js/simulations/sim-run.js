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
    if (!host) return () => { };

    const onDown = (e) => {
        cam.dragging = true;
        cam.lx = e.clientX;
        cam.ly = e.clientY;
        host.setPointerCapture?.(e.pointerId);
    };

    const onMove = (e) => {
        if (!cam.dragging) return;
        const dx = e.clientX - cam.lx;
        const dy = e.clientY - cam.ly;
        cam.lx = e.clientX;
        cam.ly = e.clientY;

        cam.x += dx / cam.zoom;
        cam.y += dy / cam.zoom;

        cam.x = clamp(cam.x, -900, 900);
        cam.y = clamp(cam.y, -520, 520);
    };

    const onUp = () => { cam.dragging = false; };

    const onWheel = (e) => {
        e.preventDefault();
        const z = cam.zoom * (e.deltaY < 0 ? 1.08 : (1 / 1.08));
        cam.zoom = clamp(z, 0.75, 2.4);
    };

    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    host.addEventListener("wheel", onWheel, { passive: false });

    return () => {
        host.removeEventListener("pointerdown", onDown);
        host.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        host.removeEventListener("wheel", onWheel);
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
    envBtn?.addEventListener("click", () => grid?.classList.toggle("is-env-collapsed"));

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
            temperature: Number(sTemp?.value ?? 22),
            radiation: Number(sRad?.value ?? 0.1),
            diseasePressure: Number(sDis?.value ?? 0.1),
            resources: Number(sRes?.value ?? 0.7),
            speed: Number(sSpeed?.value ?? 1)
        };
    }

    let running = false;
    let inFlight = false;
    let loopTimer = 0;

    let prevDead = 0;
    let prevRep = 0;

    function setUiRunning(on) {
        running = !!on;
        if (btnRun) btnRun.disabled = running;
        if (btnPause) btnPause.disabled = !running;
        if (btnStep) btnStep.disabled = running;
        if (statusEl) statusEl.textContent = running ? "Running…" : "Paused.";
    }

    function applyTickResult(r) {
        if (typeof r.tick === "number" && vTick) vTick.textContent = String(r.tick);
        if (typeof r.alive === "number" && vAlive) vAlive.textContent = String(r.alive);
        if (typeof r.dead === "number" && vDead) vDead.textContent = String(r.dead);
        if (typeof r.reproduced === "number" && vRep) vRep.textContent = String(r.reproduced);
        if (typeof r.avgFitness === "number" && vAvg) vAvg.textContent = r.avgFitness.toFixed(3);
    }

    const host = document.getElementById("gx-pop-canvas");
    const canvas = document.getElementById("sim-canvas");
    const fsBtn = document.getElementById("gx-canvasfs");

    const disposePan = bindPanZoom(host);
    const ctx = canvas?.getContext("2d", { alpha: true }) ?? null;

    const seedEl = document.getElementById("sim-seed");
    const seed = seedEl ? JSON.parse(seedEl.textContent || "{}") : {};
    const seedOrgs = Array.isArray(seed.organisms) ? seed.organisms : [];

    const speciesEmoji = { mouse: "🐭", pig: "🐷", cow: "🐮", rabbit: "🐰", fox: "🦊", bird: "🐦" };

    function hashStr(s) {
        let h = 2166136261;
        for (let i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return (h >>> 0);
    }

    const agents = seedOrgs.map((o, idx) => {
        const sp = (o.species || "").toString().toLowerCase() || ["mouse", "pig", "cow", "rabbit", "fox", "bird"][idx % 6];
        const id = (o.id || `${idx}`).toString();
        const st = (o.status || "alive").toString().toLowerCase();
        const dead = st === "dead";
        return {
            id,
            ord: hashStr(id),
            name: o.name || `Org ${idx + 1}`,
            species: sp,
            dead: dead,
            reproFx: 0,
            x: Math.random(),
            y: 0.40 + Math.random() * 0.52,
            vx: (Math.random() * 2 - 1) * 0.04,
            vy: (Math.random() * 2 - 1) * 0.02,
            wob: Math.random() * 10
        };
    }).sort((a, b) => a.ord - b.ord);

    const foods = [];
    function spawnFood(n = 2) {
        for (let i = 0; i < n; i++) foods.push({ x: Math.random(), y: 0.46 + Math.random() * 0.48, s: 1.0 });
    }

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

    function drawBackground(w, h) {
        const horizon = h * 0.42;

        const sky = ctx.createLinearGradient(0, 0, 0, horizon);
        sky.addColorStop(0, "rgba(8,12,24,1)");
        sky.addColorStop(1, "rgba(6,10,18,1)");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, horizon);

        const ground = ctx.createLinearGradient(0, horizon, 0, h);
        ground.addColorStop(0, "rgba(10,34,24,1)");
        ground.addColorStop(1, "rgba(6,18,14,1)");
        ctx.fillStyle = ground;
        ctx.fillRect(0, horizon, w, h - horizon);

        drawHillLayer(w, h, horizon, 0.22, 42, "rgba(18,64,44,.26)");
        drawHillLayer(w, h, horizon, 0.50, 28, "rgba(18,86,56,.30)");
        drawHillLayer(w, h, horizon, 0.85, 18, "rgba(22,120,76,.34)");
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
            ctx.arc(x, y, 3.5, 0, Math.PI * 2);
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

            ctx.globalAlpha = a.dead ? 0.35 : 1;

            ctx.fillStyle = "rgba(0,0,0,.25)";
            ctx.beginPath();
            ctx.ellipse(x, y + 10, 10, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            if (a.reproFx > 0) {
                const r = 12 + (1 - a.reproFx) * 34;
                ctx.strokeStyle = `rgba(120,170,255,${0.38 * a.reproFx})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.stroke();
            }

            const em = speciesEmoji[a.species] || "🧬";
            ctx.font = "20px system-ui, Segoe UI Emoji";
            ctx.fillStyle = "rgba(255,255,255,.95)";
            ctx.fillText(em, x, y - 2);

            const col = a.dead ? "rgba(255,120,120,.9)" : (a.reproFx > 0 ? "rgba(120,170,255,.95)" : "rgba(120,255,180,.95)");
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(x + 14, y - 12, 3.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 1;
        }
    }

    function stepSim(dt) {
        const res = Math.max(0, Math.min(1, Number(sRes?.value ?? 0.7)));

        if (Math.random() < 0.02 + res * 0.06) spawnFood(1);
        if (foods.length > 240) foods.splice(0, foods.length - 240);
        for (const f of foods) f.s = Math.max(0.15, f.s - dt * 0.02);

        for (const a of agents) {
            if (a.reproFx > 0) a.reproFx = Math.max(0, a.reproFx - dt * 0.9);

            if (a.dead) {
                a.vx *= 0.98;
                a.vy *= 0.98;
            } else {
                a.wob += dt * 1.5;
                const wobx = Math.sin(a.wob) * 0.01;
                const woby = Math.cos(a.wob * 0.9) * 0.006;

                let target = null;
                if (foods.length) {
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
            if (a.y < 0.40) { a.y = 0.40; a.vy *= -0.7; }
            if (a.y > 0.95) { a.y = 0.95; a.vy *= -0.7; }

            if (!a.dead) {
                for (let i = foods.length - 1; i >= 0; i--) {
                    const f = foods[i];
                    const dx = f.x - a.x;
                    const dy = f.y - a.y;
                    if (dx * dx + dy * dy < 0.0012) {
                        foods.splice(i, 1);
                        a.vx += (Math.random() * 2 - 1) * 0.03;
                        a.vy += (Math.random() * 2 - 1) * 0.02;
                        if (Math.random() < 0.06) log(`${a.name} ate food 🌿`);
                        break;
                    }
                }
            }
        }
    }

    function syncDeaths(deadTotal) {
        if (!Number.isFinite(deadTotal)) return;
        const want = Math.max(0, Math.min(agents.length, Math.floor(deadTotal)));
        let cur = 0;
        for (const a of agents) if (a.dead) cur++;

        if (want <= cur) return;

        let need = want - cur;
        for (const a of agents) {
            if (need <= 0) break;
            if (!a.dead) {
                a.dead = true;
                need--;
            }
        }
    }

    function flashRepro(n) {
        const count = Math.max(0, Math.min(agents.length, Math.floor(n)));
        for (let i = 0; i < Math.min(3, count); i++) {
            const a = agents[Math.floor(Math.random() * agents.length)];
            if (a && !a.dead) a.reproFx = 1;
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

        beginWorld(w, h);
        if (running) {
            stepSim(dt);
            drawFood(w, h);
        } else {
            foods.length = 0;
        }
        drawAgents(w, h);
        endWorld();

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);

    const pushFactors = debounce(async () => {
        try {
            await postJson(`/simulations/${popId}/factors`, factorsPayload());
            if (statusEl) statusEl.textContent = "Environment updated ✓";
            log(`Env: T=${sTemp?.value ?? 22}°C • rad=${Number(sRad?.value ?? 0).toFixed(2)} • dis=${Number(sDis?.value ?? 0).toFixed(2)} • res=${Number(sRes?.value ?? 0).toFixed(2)}`);
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

            const deadTotal = typeof r.dead === "number" ? r.dead : prevDead;
            const repTotal = typeof r.reproduced === "number" ? r.reproduced : prevRep;

            const newlyDead = Math.max(0, deadTotal - prevDead);
            const newlyRep = Math.max(0, repTotal - prevRep);

            prevDead = Math.max(prevDead, deadTotal);
            prevRep = Math.max(prevRep, repTotal);

            syncDeaths(prevDead);
            if (newlyDead > 0) log(`Deaths +${newlyDead} ☠️`);
            if (newlyRep > 0) { flashRepro(newlyRep); log(`Reproduced +${newlyRep} ✨`); }
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

        const speed = Math.max(1, Math.min(50, Number(sSpeed?.value || 1)));
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
        if (statusEl) statusEl.textContent = "Ready.";
    });

    async function toggleFullscreen() {
        if (!host) return;
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else await host.requestFullscreen();
        } catch {
            log("Fullscreen blocked by browser.");
        }
    }

    fsBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        toggleFullscreen();
    });

    host?.addEventListener("dblclick", (e) => {
        e.preventDefault();
        toggleFullscreen();
    });

    document.addEventListener("fullscreenchange", () => {
        resizeCanvas();
        log(document.fullscreenElement ? "Canvas fullscreen enabled." : "Canvas fullscreen exited.");
    });

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas, { passive: true });

    log("Valley renderer online ✅");

    window.addEventListener("beforeunload", () => {
        clearTimeout(loopTimer);
        disposePan?.();
    });
});