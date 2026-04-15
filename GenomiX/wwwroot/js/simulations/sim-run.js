import { createMutationTracker } from "./sim-mutation-tracker.js";
import { createGalaxyView } from "./sim-galaxy.js";

const getToken = () => document.querySelector('input[name="__RequestVerificationToken"]')?.value || "";

async function postJson(url, body) {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "RequestVerificationToken": getToken() },
        body: JSON.stringify(body ?? {})
    });
    if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
    return res.json().catch(() => ({}));
}

function debounce(fn, ms = 200) { let t = 0; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

// ── Pan only — NO wheel zoom (it fights page scroll) ──────────────────────
const cam = { x: 0, y: 0, dragging: false, lx: 0, ly: 0 };

function bindPan(host, canvas) {
    if (!host) return;
    host.addEventListener("pointerdown", e => {
        if (e.target !== canvas && e.target !== host) return;
        cam.dragging = true; cam.lx = e.clientX; cam.ly = e.clientY;
        host.setPointerCapture?.(e.pointerId);
    });
    host.addEventListener("pointermove", e => {
        if (!cam.dragging) return;
        cam.x = clamp(cam.x + e.clientX - cam.lx, -700, 700);
        cam.y = clamp(cam.y + e.clientY - cam.ly, -350, 350);
        cam.lx = e.clientX; cam.ly = e.clientY;
    });
    window.addEventListener("pointerup", () => { cam.dragging = false; });
}

// ── Fitness color ─────────────────────────────────────────────────────────
function fitRGB(f) {
    if (f >= 0.65) return [lerp(60, 90, (f - .65) / .35), lerp(200, 235, (f - .65) / .35), lerp(110, 210, (f - .65) / .35)];
    if (f >= 0.35) return [lerp(235, 60, (f - .35) / .30), lerp(195, 200, (f - .35) / .30), lerp(40, 110, (f - .35) / .30)];
    return [238, lerp(50, 195, f / .35), 40];
}
function fitCSS(f, a = 1) { const [r, g, b] = fitRGB(f); return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`; }

// ── Biome ─────────────────────────────────────────────────────────────────
function biomeInfo(temp, rad, dis) {
    if (rad > 0.55) return { name: "☢️ Radiation Zone", cls: "is-rad", id: "rad", bg: [46, 5, 4] };
    if (dis > 0.55) return { name: "🦠 Plague Zone", cls: "is-plague", id: "plague", bg: [24, 4, 42] };
    if (temp < -2) return { name: "❄️ Frozen Tundra", cls: "is-cold", id: "tundra", bg: [4, 12, 46] };
    if (temp > 40) return { name: "🔥 Scorched Desert", cls: "is-hot", id: "desert", bg: [58, 10, 4] };
    return { name: "🌍 Temperate Biome", cls: "", id: "temperate", bg: [5, 10, 20] };
}

// Pre-seeded environment object positions (stable across frames)
const ENV_OBJS = Array.from({ length: 22 }, (_, i) => ({
    x: 0.04 + (i * 0.618033 % 0.92),          // Fibonacci spread across width
    yd: 0.38 + (i * 0.381966 % 0.20),          // y near horizon (ground level)
    scale: 0.55 + (i % 3) * 0.22,
    ph: i * 1.3,
}));

// ── Background ────────────────────────────────────────────────────────────
function drawBackground(ctx, w, h, biome) {
    const id = biome?.id ?? 'temperate';
    const hor = h * 0.30;

    // Sky gradient per biome
    const SKY = {
        temperate: [['rgba(6,12,28,1)', 'rgba(4,8,18,1)'], ['rgba(8,44,24,1)', 'rgba(3,16,9,1)']],
        desert: [['rgba(42,18,6,1)', 'rgba(28,10,4,1)'], ['rgba(52,28,8,1)', 'rgba(30,12,4,1)']],
        tundra: [['rgba(6,14,42,1)', 'rgba(4,10,32,1)'], ['rgba(18,34,58,1)', 'rgba(8,18,38,1)']],
        rad: [['rgba(22,4,4,1)', 'rgba(14,2,2,1)'], ['rgba(14,6,2,1)', 'rgba(8,3,1,1)']],
        plague: [['rgba(8,2,18,1)', 'rgba(5,1,12,1)'], ['rgba(14,4,22,1)', 'rgba(6,2,12,1)']],
    };
    const [skyC, gndC] = SKY[id] ?? SKY.temperate;
    const sky = ctx.createLinearGradient(0, 0, 0, hor);
    sky.addColorStop(0, skyC[0]); sky.addColorStop(1, skyC[1]);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, hor);

    const gnd = ctx.createLinearGradient(0, hor, 0, h);
    gnd.addColorStop(0, gndC[0]); gnd.addColorStop(1, gndC[1]);
    ctx.fillStyle = gnd; ctx.fillRect(0, hor, w, h - hor);

    // Rolling hills silhouette
    const hillColor = {
        temperate: 'rgba(5,28,18,.28)',
        desert: 'rgba(60,28,8,.30)',
        tundra: 'rgba(18,34,68,.30)',
        rad: 'rgba(40,8,4,.28)',
        plague: 'rgba(24,6,36,.28)',
    }[id] ?? 'rgba(5,28,18,.28)';

    [[0.18, 38, 0.6], [0.48, 24, 0.9], [0.82, 14, 1.2]].forEach(([p, amp, freq]) => {
        ctx.save(); ctx.beginPath(); ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 10) {
            const tt = (x - cam.x * p) * .0036 * freq;
            ctx.lineTo(x, hor - cam.y * p + Math.sin(tt) * amp + Math.sin(tt * 1.7) * amp * .28);
        }
        ctx.lineTo(w, h); ctx.closePath(); ctx.fillStyle = hillColor; ctx.fill(); ctx.restore();
    });

    // ── Environment objects ───────────────────────────────────────────────
    ctx.save();
    ctx.font = '18px system-ui, Apple Color Emoji, Segoe UI Emoji';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';

    const objEmoji = {
        temperate: ['🌲', '🌳', '🌿', '🌲', '🌳'],
        desert: ['🌵', '🪨', '🌵', '💀', '🪨'],
        tundra: ['❄️', '🧊', '🌨', '❄️', '🪨'],
        rad: ['☢️', '🪣', '💀', '🔴', '☢️'],
        plague: ['💀', '🦠', '💀', '🌫', '💀'],
    }[id] ?? ['🌲', '🌳', '🌿'];

    ENV_OBJS.forEach((o, i) => {
        const emoji = objEmoji[i % objEmoji.length];
        const px = o.x * w;
        const py = hor + (o.yd - 0.38) * h * 0.22;  // cluster near horizon
        const fs = Math.round(14 * o.scale + (id === 'temperate' ? 4 : 2));
        ctx.font = `${fs}px system-ui, Apple Color Emoji, Segoe UI Emoji`;
        ctx.globalAlpha = 0.55 + o.scale * 0.28;
        ctx.fillText(emoji, px, py);
    });
    ctx.globalAlpha = 1;
    ctx.restore();
}

const hspts = Array.from({ length: 3 }, () => ({ x: Math.random(), y: .36 + Math.random() * .55, ph: Math.random() * Math.PI * 2 }));

function drawBiomeOverlay(ctx, w, h, biome, env, t) {
    const [br, bg, bb] = biome.bg;
    ctx.fillStyle = `rgba(${br},${bg},${bb},.10)`; ctx.fillRect(0, 0, w, h);

    // Radiation hotspots
    if (env.rad > .35) hspts.forEach(hs => {
        const p = .5 + .5 * Math.sin(t * .8 + hs.ph), r = (50 + p * 35) * env.rad;
        const g = ctx.createRadialGradient(hs.x * w, hs.y * h, 0, hs.x * w, hs.y * h, r);
        g.addColorStop(0, `rgba(220,52,16,${.055 * env.rad * p})`); g.addColorStop(1, 'rgba(220,52,16,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hs.x * w, hs.y * h, r, 0, Math.PI * 2); ctx.fill();
    });

    // Plague clouds
    if (env.dis > .45) for (let i = 0; i < 3; i++) {
        const ox = ((Math.sin(t * .28 + i * 1.2) * .14 + .5 + i * .18) % 1);
        const oy = ((Math.cos(t * .22 + i * .95) * .10 + .58 + i * .08) % 1);
        const r = 70 * env.dis;
        const g = ctx.createRadialGradient(ox * w, oy * h, 0, ox * w, oy * h, r);
        g.addColorStop(0, `rgba(150,42,220,${.042 * env.dis})`); g.addColorStop(1, 'rgba(150,42,220,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ox * w, oy * h, r, 0, Math.PI * 2); ctx.fill();
    }

    // Tundra snow drift particles
    if (biome.id === 'tundra') {
        ctx.fillStyle = 'rgba(200,220,255,.55)';
        for (let i = 0; i < 18; i++) {
            const sx = ((i * 0.618 + t * 0.04) % 1) * w;
            const sy = ((i * 0.381 + t * 0.06 * (1 + i % 3)) % 1) * h;
            ctx.beginPath(); ctx.arc(sx, sy, 1.2 + (i % 3) * 0.6, 0, Math.PI * 2); ctx.fill();
        }
    }

    // Desert heat shimmer (horizontal wavy lines near horizon)
    if (biome.id === 'desert' && env.temp > 36) {
        const hor = h * 0.30;
        ctx.strokeStyle = 'rgba(255,160,60,.08)';
        ctx.lineWidth = 1;
        for (let row = 0; row < 5; row++) {
            const y0 = hor + row * 12;
            ctx.beginPath(); ctx.moveTo(0, y0);
            for (let x = 0; x <= w; x += 8) {
                ctx.lineTo(x, y0 + Math.sin(x * 0.04 + t * 3 + row) * 2.5);
            }
            ctx.stroke();
        }
    }
}

// ── Food ──────────────────────────────────────────────────────────────────
// Each food item has a type that matches the diet of the species that spawns it.
const FOOD_EMOJI = { seed: "🌾", plant: "🌿", worm: "🐛", meat: "🥩" };
const SPECIES_FOOD = { mouse: "seed", rabbit: "seed", cow: "plant", pig: "plant", bird: "worm", fox: "meat" };
const foods = [];
let _foodTypes = ["seed"]; // updated each tick from alive species

function updateFoodTypes(agentsList) {
    const alive = agentsList.filter(a => a.status !== "dead");
    if (!alive.length) return;
    // Collect unique food types from alive species
    const types = [...new Set(alive.map(a => SPECIES_FOOD[a.species] || "seed"))];
    _foodTypes = types;
}

function spawnFood(n) {
    for (let i = 0; i < n; i++) {
        const type = _foodTypes[Math.floor(Math.random() * _foodTypes.length)];
        foods.push({ x: Math.random(), y: .42 + Math.random() * .52, s: 1, ph: Math.random() * Math.PI * 2, type });
    }
}

function drawFood(ctx, w, h, t) {
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "11px system-ui,Segoe UI Emoji,Apple Color Emoji";
    for (const f of foods) {
        const alpha = Math.max(0, f.s) * (.80 + .20 * Math.sin(t * 2.8 + f.ph));
        if (alpha < 0.05) continue;
        ctx.globalAlpha = alpha;
        ctx.fillText(FOOD_EMOJI[f.type] || "🌿", f.x * w, f.y * h);
    }
    ctx.globalAlpha = 1;
}

// ── Agents ────────────────────────────────────────────────────────────────
const EMOJI = { mouse: "🐭", pig: "🐷", cow: "🐮", rabbit: "🐰", fox: "🦊", bird: "🐦" };
const FLASH = { mutation: [255, 110, 25], death: [255, 35, 65], reproduction: [55, 215, 130] };

// ── Particle system ───────────────────────────────────────────────────────────
// particles[]: { x, y, vx, vy, life, maxLife, r, g, b, size, type }
const particles = [];

function spawnDeathBurst(px, py, fitR, fitG, fitB) {
    // Main explosion — 18 sparks scatter outward
    for (let i = 0; i < 18; i++) {
        const angle = (i / 18) * Math.PI * 2 + Math.random() * .4;
        const speed = 60 + Math.random() * 120;
        const life = .45 + Math.random() * .35;
        particles.push({
            x: px, y: py,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life, maxLife: life,
            r: 255, g: 40 + Math.random() * 80, b: 20,
            size: 2 + Math.random() * 3,
            type: 'spark'
        });
    }
    // 6 larger colour blobs using organism's fitness colour
    for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 30 + Math.random() * 60;
        const life = .55 + Math.random() * .25;
        particles.push({
            x: px, y: py,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life, maxLife: life,
            r: fitR, g: fitG, b: fitB,
            size: 4 + Math.random() * 5,
            type: 'blob'
        });
    }
    // Shockwave ring
    particles.push({ x: px, y: py, vx: 0, vy: 0, life: .40, maxLife: .40, r: 255, g: 80, b: 30, size: 0, type: 'ring', maxR: 40 });
}

function spawnBirthBurst(px, py) {
    // 12 green/cyan orbs shoot outward
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const speed = 45 + Math.random() * 80;
        const life = .50 + Math.random() * .30;
        particles.push({
            x: px + (Math.random() - .5) * 8,
            y: py + (Math.random() - .5) * 8,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life, maxLife: life,
            r: 55 + Math.random() * 40, g: 220, b: 130 + Math.random() * 60,
            size: 2.5 + Math.random() * 2.5,
            type: 'spark'
        });
    }
    // Two expanding rings
    for (let i = 0; i < 2; i++) {
        particles.push({ x: px, y: py, vx: 0, vy: 0, life: .35 + i * .15, maxLife: .35 + i * .15, r: 60, g: 230, b: 140, size: 0, type: 'ring', maxR: 28 + i * 14 });
    }
    // Central flash
    particles.push({ x: px, y: py, vx: 0, vy: 0, life: .22, maxLife: .22, r: 180, g: 255, b: 200, size: 16, type: 'glow' });
}

function stepParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        if (p.type !== 'ring' && p.type !== 'glow') {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            // Gravity / drag
            p.vx *= 0.88;
            p.vy *= 0.88;
            p.vy += 18 * dt; // slight gravity on sparks
        }
    }
}

function drawParticles(ctx, w, h) {
    const scaleX = w, scaleY = h;
    for (const p of particles) {
        const t = p.life / p.maxLife; // 1 = fresh, 0 = dead

        if (p.type === 'ring') {
            const radius = p.maxR * (1 - t);
            ctx.globalAlpha = t * .75;
            ctx.strokeStyle = `rgb(${p.r},${p.g},${p.b})`;
            ctx.lineWidth = 2 * t;
            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.stroke();
        } else if (p.type === 'glow') {
            const r = p.size * (1 + (1 - t));
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
            grad.addColorStop(0, `rgba(${p.r},${p.g},${p.b},${t * .80})`);
            grad.addColorStop(1, `rgba(${p.r},${p.g},${p.b},0)`);
            ctx.globalAlpha = 1;
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
        } else {
            // spark / blob
            const alpha = p.type === 'blob' ? t * .70 : t * .90;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (p.type === 'blob' ? (.4 + t * .6) : t), 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.globalAlpha = 1;
}

function drawAgents(ctx, w, h, agents, flashes) {
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const a of agents) {
        const px = a.x * w, py = a.y * h;
        const dead = a.status === "dead", rep = a.status === "reproduced";
        // Shadow
        ctx.globalAlpha = dead ? .18 : .55; ctx.fillStyle = "rgba(0,0,0,.28)";
        ctx.beginPath(); ctx.ellipse(px, py + 10, 9, 3.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = dead ? .28 : 1;
        // Fitness bg circle
        if (!dead) { ctx.fillStyle = fitCSS(a.fitness, .50); ctx.beginPath(); ctx.arc(px, py, 12, 0, Math.PI * 2); ctx.fill(); }
        // Status ring
        ctx.strokeStyle = dead ? "rgba(255,80,80,.55)" : rep ? "rgba(100,160,255,.65)" : "rgba(65,220,125,.65)";
        ctx.lineWidth = dead ? 1.5 : 2; ctx.beginPath(); ctx.arc(px, py, 13.5, 0, Math.PI * 2); ctx.stroke();
        // Flash ring
        const fl = flashes?.[a.id];
        if (fl && fl.t > 0) { const [fr, fg, fb] = FLASH[fl.type] || FLASH.mutation; ctx.strokeStyle = `rgba(${fr},${fg},${fb},${fl.t * .68})`; ctx.lineWidth = 2; const r = 15 + (1 - fl.t) * 20; ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.stroke(); }
        // Emoji — always reset font and alpha before drawing
        ctx.globalAlpha = dead ? .30 : 1;
        ctx.font = "15px system-ui,Segoe UI Emoji,Apple Color Emoji,Segoe UI Symbol";
        ctx.fillStyle = dead ? "rgba(190,190,190,.6)" : "rgba(255,255,255,.98)";
        ctx.fillText(EMOJI[a.species] || "🧬", px, py - 1);
        // Status dot
        ctx.globalAlpha = 1; ctx.fillStyle = dead ? "rgba(255,80,80,.95)" : rep ? "rgba(100,160,255,.95)" : "rgba(65,220,125,.95)";
        ctx.beginPath(); ctx.arc(px + 11, py - 10, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// ── Popup card ────────────────────────────────────────────────────────────
function buildPopup(found) {
    if (!found) return "";
    const [r, g, b] = fitRGB(found.fitness);
    const fc = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
    const pct = Math.round(found.fitness * 100);
    const label = found.fitness >= .75 ? "Excellent" : found.fitness >= .50 ? "Good" : found.fitness >= .25 ? "Weak" : "Critical";
    const statusCls = found.status === "dead" ? "dead" : found.status === "reproduced" ? "reproduced" : "alive";
    const statusIcon = found.status === "dead" ? "💀" : found.status === "reproduced" ? "🌱" : "💚";
    return `
        <div class="gx-org-popup__header">
            <div class="gx-org-popup__top">
                <span class="gx-org-popup__emoji">${EMOJI[found.species] || "🧬"}</span>
                <div class="gx-org-popup__info">
                    <div class="gx-org-popup__name">${found.name}</div>
                    <div class="gx-org-popup__species">${found.species}</div>
                </div>
            </div>
        </div>
        <div class="gx-org-popup__body">
            <div class="gx-org-popup__fitness-row">
                <span class="gx-org-popup__fit-label">Fitness</span>
                <span class="gx-org-popup__fit-value" style="color:${fc}">${found.fitness.toFixed(3)}</span>
                <span class="gx-org-popup__fit-desc">${label}</span>
            </div>
            <div class="gx-org-popup__bar">
                <div class="gx-org-popup__bar-fill" style="width:${pct}%;background:${fc}"></div>
            </div>
            <span class="gx-org-popup__badge ${statusCls}">${statusIcon} ${found.status}</span>
        </div>`;
}

function bindPopup(host, canvas, agentMap) {
    const popup = document.getElementById("gx-org-popup");
    if (!popup || !host) return;
    // Move to <body> so it's above every stacking context (canvas, panels, etc.)
    document.body.appendChild(popup);
    host.addEventListener("mousemove", e => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left - cam.x;
        const my = e.clientY - rect.top - cam.y;
        let best = 26 * 26, found = null;
        for (const a of agentMap.values()) {
            const d = (a.x * rect.width - mx) ** 2 + (a.y * rect.height - my) ** 2;
            if (d < best) { best = d; found = a; }
        }
        if (found) {
            popup.hidden = false;
            popup.innerHTML = buildPopup(found);
            // Position using viewport coords — popup is position:fixed
            const pw = 240, ph = 200;
            let tx = e.clientX + 18;
            let ty = e.clientY - 20;
            if (tx + pw > window.innerWidth - 8) tx = e.clientX - pw - 14;
            if (ty + ph > window.innerHeight - 8) ty = e.clientY - ph - 10;
            if (ty < 8) ty = 8;
            popup.style.left = `${tx}px`;
            popup.style.top = `${ty}px`;
        } else {
            popup.hidden = true;
        }
    });
    host.addEventListener("mouseleave", () => { popup.hidden = true; });
}

// ── Side panel ────────────────────────────────────────────────────────────

function updateSpecies(agents) {
    const grid = document.getElementById("gx-species-grid"); if (!grid) return;
    const counts = {};
    agents.filter(a => a.status !== "dead").forEach(a => { counts[a.species] = (counts[a.species] || 0) + 1; });
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((s, [, n]) => s + n, 0) || 1;
    if (!entries.length) {
        grid.innerHTML = '<div style="grid-column:1/-1;font-size:11px;opacity:.35;padding:4px 0">No alive organisms</div>';
        return;
    }
    grid.innerHTML = entries.map(([sp, n]) => `
        <div class="gx-sp-card">
            <span class="gx-sp-card__emoji">${EMOJI[sp] || "🧬"}</span>
            <span class="gx-sp-card__name">${sp}</span>
            <span class="gx-sp-card__count">${n}</span>
            <div class="gx-sp-card__bar"><div class="gx-sp-card__fill" style="width:${Math.round(n / total * 100)}%"></div></div>
        </div>`).join("");
}

function updateStress(env) {
    const s = clamp(Math.pow(Math.abs(env.temp - 22) / 40, 1.4) + env.rad * .85 + env.dis * .70 - env.res * .55, 0, 2) / 2;
    const fill = document.getElementById("gx-stress-fill"), val = document.getElementById("gx-stress-val");
    if (fill) fill.style.width = `${s * 100}%`;
    if (val) val.textContent = s.toFixed(2);
}

function updateBiome(env) {
    const chip = document.getElementById("gx-biome-chip"); if (!chip) return;
    const b = biomeInfo(env.temp, env.rad, env.dis, env.res);
    chip.textContent = b.name; chip.className = "gx-biome-chip" + (b.cls ? " " + b.cls : "");
}

// ── Main ──────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("sim-root"); if (!root) return;
    const popId = root.dataset.popId;
    const lang = document.documentElement.lang?.toLowerCase().startsWith("bg") ? "bg" : "en";

    const btnRun = document.getElementById("sim-run"), btnPause = document.getElementById("sim-pause"), btnSave = document.getElementById("sim-save");
    const sTemp = document.getElementById("f-temp"), sRad = document.getElementById("f-rad");
    const sDis = document.getElementById("f-dis"), sRes = document.getElementById("f-res"), sSpeed = document.getElementById("f-speed");
    const vTick = document.getElementById("v-tick"), vAlive = document.getElementById("v-alive");
    const vDead = document.getElementById("v-dead"), vRep = document.getElementById("v-rep"), vAvg = document.getElementById("v-avg");
    const statusEl = document.getElementById("sim-status"), statusDot = document.getElementById("sim-statusdot");
    const logBody = document.getElementById("gx-run-logBody");

    // Mutation tracker
    const tracker = createMutationTracker(lang);
    // FIX: inject into the dedicated slot defined in Run.cshtml rather than
    // appending to the full button container (which put it after the env toggle)
    tracker.injectToggleBtn(
        document.getElementById("gx-tracker-btn-slot") ??
        document.querySelector(".gx-runhdr__right")
    );

    const log = line => {
        if (!logBody) return;
        const d = document.createElement("div"); d.className = "gx-logline"; d.textContent = line;
        logBody.appendChild(d); logBody.scrollTop = logBody.scrollHeight;
    };

    const getEnv = () => ({ temp: Number(sTemp?.value ?? 22), rad: Number(sRad?.value ?? .1), dis: Number(sDis?.value ?? .1), res: Number(sRes?.value ?? .7) });
    const factorsPayload = () => ({ temperature: Number(sTemp.value), radiation: Number(sRad.value), diseasePressure: Number(sDis.value), resources: Number(sRes.value), speed: Number(sSpeed.value) });

    // Canvas
    const host = document.getElementById("gx-pop-canvas");
    const canvas = document.getElementById("sim-canvas");
    const fsBtn = document.getElementById("gx-canvasfs");
    const ctx = canvas?.getContext("2d", { alpha: true }) ?? null;

    bindPan(host, canvas);

    // Seed agents
    const seedEl = document.getElementById("sim-seed");
    const seed = seedEl ? JSON.parse(seedEl.textContent || "{}") : {};
    const seedOrgs = Array.isArray(seed.organisms) ? seed.organisms : [];
    const agentMap = new Map(), agents = [];

    seedOrgs.forEach((o, i) => {
        const sp = o.species || ["mouse", "pig", "cow", "rabbit", "fox", "bird"][i % 6];
        const a = {
            id: o.id, name: o.name || `Org ${i + 1}`, sci: o.sci || "", species: sp,
            status: o.status || "alive", fitness: Number(o.fitness ?? 1),
            x: Math.random(), y: .42 + Math.random() * .52,
            vx: (Math.random() * 2 - 1) * .024, vy: (Math.random() * 2 - 1) * .012, wob: Math.random() * 10
        };
        agentMap.set(a.id, a); agents.push(a);
    });

    // Seed the HUD dead counter from loaded data
    const seedDead = agents.filter(a => a.status === "dead").length;
    if (vDead) vDead.textContent = String(seedDead);

    tracker.onTick([], 0, agents.map(a => ({ id: a.id, name: a.name, species: a.species, status: a.status, fitness: a.fitness })));
    bindPopup(host, canvas, agentMap);

    // Canvas resize — reads fixed CSS height, does NOT cause growth
    function resizeCanvas() {
        if (!canvas || !host || !ctx) return;
        const r = host.getBoundingClientRect();
        const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
        // Only update if dimensions actually changed
        // Don't set canvas.style dimensions - CSS handles sizing via inset:0
        // Only update the pixel buffer size for crisp rendering
        const newW = Math.floor(r.width * dpr), newH = Math.floor(r.height * dpr);
        if (canvas.width === newW && canvas.height === newH) return;
        canvas.width = newW; canvas.height = newH;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas, { passive: true });
    document.addEventListener("fullscreenchange", resizeCanvas);

    // Agent step
    function stepAgents(dt, w, h) {
        const res = clamp(Number(sRes?.value ?? .7), 0, 1);
        if (Math.random() < .025 + res * .055) spawnFood(1);
        if (foods.length > 200) foods.splice(0, foods.length - 200);
        foods.forEach(f => { f.s = Math.max(.1, f.s - dt * .018); });
        for (const a of agents) {
            if (a.status === "dead") { a.vx *= .97; a.vy *= .97; }
            else {
                a.wob += dt * 1.4; a.vx += Math.sin(a.wob) * .006; a.vy += Math.cos(a.wob * .88) * .005;
                let best = 1e9, tgt = null;
                foods.forEach(f => { const d = (f.x - a.x) ** 2 + (f.y - a.y) ** 2; if (d < best) { best = d; tgt = f; } });
                if (tgt) { a.vx += (tgt.x - a.x) * .05; a.vy += (tgt.y - a.y) * .04; }
                const sp = .04; a.vx = clamp(a.vx, -sp, sp); a.vy = clamp(a.vy, -sp, sp);
            }
            a.x = clamp(a.x + a.vx * dt, .03, .97); a.y = clamp(a.y + a.vy * dt, .40, .95);
            if (a.status !== "dead") for (let i = foods.length - 1; i >= 0; i--) {
                const f = foods[i];
                if ((f.x - a.x) ** 2 + (f.y - a.y) ** 2 < .0008) { foods.splice(i, 1); a.vx += (Math.random() * 2 - 1) * .014; a.vy += (Math.random() * 2 - 1) * .010; break; }
            }
        }
    }

    function syncFromResult(r) {
        if (!Array.isArray(r.organisms)) return;
        r.organisms.forEach(o => {
            const a = agentMap.get(o.id);
            if (a) {
                const prevStatus = a.status;
                a.status = o.status;
                a.fitness = o.fitness;
                // Spawn particles when status changes
                if (prevStatus !== 'dead' && o.status === 'dead') {
                    const [fr, fg, fb] = fitRGB(a.fitness);
                    const rect = canvas?.getBoundingClientRect();
                    if (rect) spawnDeathBurst(a.x * rect.width, a.y * rect.height, Math.round(fr), Math.round(fg), Math.round(fb));
                } else if (prevStatus !== 'reproduced' && o.status === 'reproduced') {
                    const rect = canvas?.getBoundingClientRect();
                    if (rect) spawnBirthBurst(a.x * rect.width, a.y * rect.height);
                }
            } else {
                // New offspring — create a fresh agent near its parent's position
                const px = (o.x && o.x > 0) ? o.x : Math.random();
                const py = (o.y && o.y > 0) ? o.y : (.42 + Math.random() * .52);
                const sp = o.species || "mouse";
                const newAgent = {
                    id: o.id,
                    name: o.name || sp,
                    sci: "",
                    species: sp,
                    status: o.status || "alive",
                    fitness: Number(o.fitness ?? 0.75),
                    x: px, y: py,
                    vx: (Math.random() * 2 - 1) * .024,
                    vy: (Math.random() * 2 - 1) * .012,
                    wob: Math.random() * 10
                };
                agentMap.set(newAgent.id, newAgent);
                agents.push(newAgent);
                // Birth burst for offspring
                const rect = canvas?.getBoundingClientRect();
                if (rect) spawnBirthBurst(px * rect.width, py * rect.height);
            }
        });
    }

    function applyTickResult(r) {
        if (typeof r.tick === "number") vTick.textContent = r.tick;
        if (typeof r.alive === "number") {
            vAlive.textContent = r.alive;
            if (r.alive > peakAlive) peakAlive = r.alive;
        }
        if (typeof r.dead === "number") vDead.textContent = r.dead;
        if (typeof r.reproduced === "number") vRep.textContent = r.reproduced;
        if (typeof r.avgFitness === "number") vAvg.textContent = r.avgFitness.toFixed(3);
        syncFromResult(r);
        // Count newly added organisms as "born"
        totalBorn = Math.max(totalBorn, agents.length);
        const env = getEnv(); updateStress(env); updateSpecies(agents); updateBiome(env);
        updateFoodTypes(agents);
        if (Array.isArray(r.organisms))
            tracker.onTick(r.organisms.map(o => ({ id: o.id, status: o.status, fitness: o.fitness })), r.tick ?? 0);
        // Extinction check
        if (r.alive === 0 && running && !extinctionShown) {
            setUiRunning(false);
            clearTimeout(loopTimer);
            extinctionShown = true;
            showExtinction(r.tick ?? 0, r.avgFitness ?? 0);
        }
    }

    // Animation
    let lastT = performance.now(), timeAcc = 0, flashes = {}, running = false, inFlight = false, loopTimer = 0;

    // Extinction tracking — count only non-dead organisms at start
    const initialAlive = agents.filter(a => a.status !== "dead").length;
    let peakAlive = initialAlive, totalBorn = initialAlive, extinctionShown = false;

    function frame(now) {
        const dt = clamp((now - lastT) / 1000, 0, .05); lastT = now; timeAcc += dt;
        flashes = tracker.tickFlashes(dt);
        if (ctx && canvas && host) {
            const r = host.getBoundingClientRect(), w = r.width || 1, h = r.height || 1;
            const env = getEnv(), biome = biomeInfo(env.temp, env.rad, env.dis, env.res);
            ctx.clearRect(0, 0, w, h);
            drawBackground(ctx, w, h, biome);
            ctx.save(); ctx.translate(cam.x, cam.y);
            drawBiomeOverlay(ctx, w, h, biome, env, timeAcc);
            if (running) { stepAgents(dt, w, h); drawFood(ctx, w, h, timeAcc); } else foods.length = 0;
            drawAgents(ctx, w, h, agents, flashes);
            ctx.restore();
            // Particles drawn in screen space (no cam offset) so they don't pan with camera
            stepParticles(dt);
            drawParticles(ctx, w, h);
            // Keep 3D view in sync with current biome
            if (galaxyActive && galaxy) galaxy.setBiome(biome);
        }
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    const env0 = getEnv(); updateStress(env0); updateSpecies(agents);

    function setUiRunning(on) {
        running = !!on;
        if (btnRun) btnRun.disabled = running;
        if (btnPause) btnPause.disabled = !running;
        if (statusEl) statusEl.textContent = running ? (lang === "bg" ? "Работи…" : "Running…") : (lang === "bg" ? "Пауза." : "Paused.");
        statusDot?.classList.toggle("is-running", running);
    }

    // Fullscreen — stopPropagation prevents triggering pan
    fsBtn?.addEventListener("click", async e => {
        e.stopPropagation();
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else await (host?.requestFullscreen?.() ?? canvas?.requestFullscreen?.());
        } catch (err) { log("Fullscreen: " + err.message); }
    });

    // Factor push
    const pushFactors = debounce(async () => {
        try {
            await postJson(`/simulations/${popId}/factors`, factorsPayload());
            if (statusEl) statusEl.textContent = lang === "bg" ? "Обновено ✓" : "Environment updated ✓";
            log(`T=${sTemp.value}°C · rad=${Number(sRad.value).toFixed(2)} · dis=${Number(sDis.value).toFixed(2)} · res=${Number(sRes.value).toFixed(2)}`);
            setTimeout(() => { if (!running && statusEl) statusEl.textContent = lang === "bg" ? "Готово." : "Ready."; }, 700);
            const e = getEnv(); updateStress(e);
        } catch (err) { if (statusEl) statusEl.textContent = err?.message || "Update failed."; }
    }, 200);
    [sTemp, sRad, sDis, sRes, sSpeed].forEach(el => el?.addEventListener("input", pushFactors));

    // Tick
    async function doTick(steps) {
        if (inFlight) return; inFlight = true;
        try { applyTickResult(await postJson(`/simulations/${popId}/tick`, { steps })); }
        catch (err) { if (statusEl) statusEl.textContent = err?.message || "Tick failed."; log("Tick failed."); setUiRunning(false); clearTimeout(loopTimer); }
        finally { inFlight = false; }
    }
    function scheduleLoop() {
        clearTimeout(loopTimer); if (!running) return;
        const speed = clamp(Number(sSpeed?.value || 1), 1, 50);
        const steps = speed <= 10 ? speed : Math.round(10 + (speed - 10) * 2);
        doTick(steps).then(() => { loopTimer = setTimeout(scheduleLoop, Math.max(120, 520 - speed * 10)); });
    }

    btnRun?.addEventListener("click", async () => {
        try { await postJson(`/simulations/${popId}/running`, { isRunning: true }); setUiRunning(true); log(lang === "bg" ? "Стартира ▶️" : "Started ▶️"); scheduleLoop(); }
        catch (e) { if (statusEl) statusEl.textContent = e?.message || "Error"; }
    });
    btnPause?.addEventListener("click", async () => {
        try { await postJson(`/simulations/${popId}/running`, { isRunning: false }); setUiRunning(false); log(lang === "bg" ? "Пауза ⏸" : "Paused ⏸"); clearTimeout(loopTimer); }
        catch (e) { if (statusEl) statusEl.textContent = e?.message || "Error"; }
    });

    // Save — snapshot current agent states to DB
    btnSave?.addEventListener("click", async () => {
        const origText = btnSave.textContent;
        btnSave.disabled = true;
        btnSave.textContent = lang === "bg" ? "Запазване…" : "Saving…";
        try {
            const payload = { organisms: agents.map(a => ({ id: a.id, status: a.status, fitness: a.fitness })) };
            await postJson(`/simulations/${popId}/save`, payload);
            btnSave.textContent = lang === "bg" ? "✓ Запазено" : "✓ Saved";
            log(lang === "bg" ? "Симулацията е запазена 💾" : "Simulation saved 💾");
            setTimeout(() => { btnSave.textContent = origText; btnSave.disabled = false; }, 1800);
        } catch (e) {
            btnSave.textContent = lang === "bg" ? "Грешка" : "Error";
            setTimeout(() => { btnSave.textContent = origText; btnSave.disabled = false; }, 1800);
        }
    });
    window.addEventListener("beforeunload", () => clearTimeout(loopTimer));

    // Scenarios
    const scenSel = document.getElementById("gx-scenario"), scenApply = document.getElementById("gx-scenario-apply");
    const SCEN = [
        { id: "gold", name: "🌿 Golden Valley", f: { temperature: 22, radiation: .05, diseasePressure: .08, resources: .85, speed: 10 }, desc: "Stable growth — watch fitness rise." },
        { id: "ice", name: "❄️ Ice Age", f: { temperature: -10, radiation: .06, diseasePressure: .12, resources: .55, speed: 12 }, desc: "Cold stress — fitness degrades." },
        { id: "rad", name: "☢️ Radiation Leak", f: { temperature: 22, radiation: .78, diseasePressure: .10, resources: .70, speed: 14 }, desc: "Rapid fitness collapse." },
        { id: "plague", name: "🦠 Plague", f: { temperature: 22, radiation: .05, diseasePressure: .88, resources: .70, speed: 14 }, desc: "Disease dominates." },
        { id: "drought", name: "🏜️ Drought", f: { temperature: 38, radiation: .12, diseasePressure: .15, resources: .14, speed: 12 }, desc: "Resource collapse." },
        { id: "eden", name: "🌸 Eden", f: { temperature: 22, radiation: .00, diseasePressure: .00, resources: 1.0, speed: 8 }, desc: "Perfect conditions." },
    ];
    const setSl = (el, v) => { if (el) { el.value = String(v); el.dispatchEvent(new Event("input", { bubbles: true })); } };
    if (scenSel) SCEN.forEach(s => { const o = document.createElement("option"); o.value = s.id; o.textContent = s.name; scenSel.appendChild(o); });
    scenApply?.addEventListener("click", async () => {
        const s = SCEN.find(x => x.id === scenSel?.value); if (!s) return;
        setSl(sTemp, s.f.temperature); setSl(sRad, s.f.radiation); setSl(sDis, s.f.diseasePressure); setSl(sRes, s.f.resources); setSl(sSpeed, s.f.speed);
        try { await postJson(`/simulations/${popId}/factors`, factorsPayload()); if (statusEl) statusEl.textContent = lang === "bg" ? "Сценарий ✓" : "Scenario applied ✓"; log(`▶ ${s.name}`); if (s.desc) log(s.desc); }
        catch (e) { if (statusEl) statusEl.textContent = e?.message || "Error"; }
    });

    // ── Floating environment panel ────────────────────────────────────────────
    // Move panel + backdrop to <body> so they're above every stacking context.
    // CSS display:none keeps them hidden by default — no JS tricks needed.
    const envPanel = document.getElementById("gx-env-panel");
    const envBackdrop = document.getElementById("gx-env-backdrop");
    if (envPanel) document.body.appendChild(envPanel);
    if (envBackdrop) document.body.appendChild(envBackdrop);

    const envToggle = document.getElementById("gx-env-toggle");
    const envClose = document.getElementById("gx-env-close");

    function openEnvPanel() {
        if (!envPanel) return;
        // Both display AND transform must be set via inline style.
        // Inline style beats CSS class rules, so even if the CSS has
        // display:flex + transform:translateX(100%), these win.
        envPanel.style.display = "flex";
        envPanel.style.transform = "translateX(0)";
        envPanel.style.transition = "transform .28s cubic-bezier(.4,0,.2,1)";
        envBackdrop && (envBackdrop.style.display = "block");
        const isMobile = window.innerWidth <= 860;
        if (!isMobile) {
            document.body.style.transition = "padding-right .28s cubic-bezier(.4,0,.2,1)";
            document.body.style.paddingRight = "360px";
        }
        envToggle?.classList.add("is-active");
    }
    function closeEnvPanel() {
        if (!envPanel) return;
        envPanel.style.transform = "translateX(100%)";
        // Wait for slide-out animation before hiding
        setTimeout(() => { if (envPanel) envPanel.style.display = "none"; }, 280);
        envBackdrop && (envBackdrop.style.display = "none");
        document.body.style.paddingRight = "";
        envToggle?.classList.remove("is-active");
    }

    envToggle?.addEventListener("click", openEnvPanel);
    envClose?.addEventListener("click", closeEnvPanel);
    envBackdrop?.addEventListener("click", closeEnvPanel);

    // ── Galaxy 3D view ────────────────────────────────────────────────────────
    const galaxyBtn = document.getElementById("gx-galaxy-btn");
    const galaxyWrap = document.getElementById("gx-galaxy-wrap");
    const canvas2dWrap = document.getElementById("gx-pop-canvas");
    const galaxyFsBtn = document.getElementById("gx-galaxy-fs");

    // Fullscreen for 3D panel
    galaxyFsBtn?.addEventListener("click", async e => {
        e.stopPropagation();
        try {
            if (document.fullscreenElement) await document.exitFullscreen();
            else await galaxyWrap?.requestFullscreen?.();
        } catch (err) { log("Fullscreen: " + err.message); }
    });
    document.addEventListener("fullscreenchange", () => {
        if (galaxy) galaxy.onResize();
    });

    let galaxy = null, galaxyActive = false;

    function onGalaxyHover(data, cx, cy) {
        const popup = document.getElementById("gx-org-popup");
        if (!popup) return;
        if (!data) { popup.hidden = true; return; }
        // Reuse existing buildPopup — find agent by id
        const a = agentMap.get(data.id);
        if (!a) { popup.hidden = true; return; }
        popup.hidden = false;
        popup.innerHTML = buildPopup(a);
        let tx = cx + 18, ty = cy - 20;
        if (tx + 240 > window.innerWidth - 8) tx = cx - 254;
        if (ty + 200 > window.innerHeight - 8) ty = cy - 210;
        if (ty < 8) ty = 8;
        popup.style.left = `${tx}px`;
        popup.style.top = `${ty}px`;
    }

    galaxyBtn?.addEventListener("click", () => {
        galaxyActive = !galaxyActive;
        galaxyBtn.classList.toggle("is-active", galaxyActive);
        galaxyBtn.textContent = galaxyActive
            ? (lang === "bg" ? "🌿 2D изглед" : "🌿 2D View")
            : (lang === "bg" ? "🌿 3D изглед" : "🌿 3D View");

        if (galaxyActive) {
            galaxyWrap.style.display = "block";
            canvas2dWrap.style.display = "none";
            if (!galaxy) {
                galaxy = createGalaxyView(agents, agentMap, foods, EMOJI, FOOD_EMOJI, onGalaxyHover, getEnv);
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        galaxy.mount(galaxyWrap);
                        // Apply current biome immediately on first mount
                        const env = getEnv();
                        galaxy.setBiome(biomeInfo(env.temp, env.rad, env.dis, env.res));
                    });
                });
            } else {
                // Already mounted — just show it and force biome sync
                const env = getEnv();
                galaxy.setBiome(biomeInfo(env.temp, env.rad, env.dis, env.res), true);
                galaxy.onResize();
            }
        } else {
            // Restore 2D — show the canvas wrap first, then resize the pixel buffer
            // after the browser has reflowed (display:none → block needs one rAF)
            galaxyWrap.style.display = "none";
            canvas2dWrap.style.display = "";
            requestAnimationFrame(() => resizeCanvas());
        }
    });
    const CAUSES = {
        en: {
            radiation: ["☢️ Radiation Poisoning", rad => rad > 0.55],
            plague: ["🦠 Global Pandemic", dis => dis > 0.55],
            freeze: ["❄️ Ice Age", temp => temp < -5],
            scorch: ["🔥 Scorched Earth", temp => temp > 40],
            starvation: ["💀 Mass Starvation", res => res < 0.15],
            collapse: ["⚠️ Ecosystem Collapse", () => false],
            natural: ["🌑 Natural Selection", () => true],
        },
        bg: {
            radiation: ["☢️ Радиационно отравяне", rad => rad > 0.55],
            plague: ["🦠 Глобална пандемия", dis => dis > 0.55],
            freeze: ["❄️ Ледникова епоха", temp => temp < -5],
            scorch: ["🔥 Изгаряне на Земята", temp => temp > 40],
            starvation: ["💀 Масово гладуване", res => res < 0.15],
            collapse: ["⚠️ Колапс на екосистемата", () => false],
            natural: ["🌑 Естествен отбор", () => true],
        }
    };

    function analyzeExtinctionCause() {
        const { temp, rad, dis, res } = getEnv();
        const c = CAUSES[lang] ?? CAUSES.en;
        const hits = [];
        if (c.radiation[1](rad)) hits.push(c.radiation[0]);
        if (c.plague[1](dis)) hits.push(c.plague[0]);
        if (c.freeze[1](temp)) hits.push(c.freeze[0]);
        if (c.scorch[1](temp)) hits.push(c.scorch[0]);
        if (c.starvation[1](res)) hits.push(c.starvation[0]);
        if (hits.length >= 3) return c.collapse[0];
        if (hits.length > 0) return hits[0];
        return c.natural[0];
    }

    function showExtinction(ticks, lastAvgFitness) {
        const overlay = document.getElementById("gx-extinction");
        if (!overlay) return;

        // Populate stats
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set("gx-ext-ticks", ticks);
        set("gx-ext-peak", peakAlive);
        set("gx-ext-born", totalBorn);
        set("gx-ext-avgfit", Number(lastAvgFitness).toFixed(3));
        set("gx-ext-cause", analyzeExtinctionCause());

        // Show overlay
        overlay.removeAttribute("hidden");
        overlay.style.display = "flex";

        // Canvas darkens — switch all agents to dead visually
        agents.forEach(a => { a.status = "dead"; });

        // Dismiss button
        const dismiss = document.getElementById("gx-ext-dismiss");
        dismiss?.addEventListener("click", () => {
            overlay.style.opacity = "0";
            overlay.style.transition = "opacity .3s";
            setTimeout(() => {
                overlay.style.display = "none";
                overlay.style.opacity = "";
                overlay.style.transition = "";
            }, 300);
        }, { once: true });

        log(lang === "bg" ? "💀 Изчезване — всички организми са загинали." : "💀 Extinction — all organisms have perished.");
    }

    log(lang === "bg" ? "Симулацията е готова ✅" : "Simulation ready ✅");

    // If all organisms were dead when the page loaded (saved after extinction), show the screen
    if (initialAlive === 0 && agents.length > 0) {
        extinctionShown = true;
        const lastFit = agents.length > 0
            ? agents.reduce((s, a) => s + a.fitness, 0) / agents.length
            : 0;
        setTimeout(() => showExtinction(0, lastFit), 600);
    }
});
