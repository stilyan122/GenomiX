function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function easeOutBack(t) {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function rafWait(ms) { return new Promise(r => setTimeout(r, ms)); }

function safeSpeed(speed) {
    const s = Number(speed);
    if (!Number.isFinite(s) || s <= 0) return 1;
    return clamp(s, 0.25, 3.0);
}
function safeDuration(ms) {
    const d = Number(ms);
    if (!Number.isFinite(d) || d < 0) return 0;
    return Math.round(d);
}

function tween(durationMs, onFrame) {
    durationMs = safeDuration(durationMs);
    return new Promise(resolve => {
        const start = performance.now();
        function frame(now) {
            const t = durationMs === 0 ? 1 : Math.min(1, (now - start) / durationMs);
            const e = easeInOutCubic(t);
            onFrame(t, e);
            if (t < 1) requestAnimationFrame(frame);
            else resolve();
        }
        requestAnimationFrame(frame);
    });
}

function arcLerp(ax, ay, bx, by, t, lift = 48) {
    const x = lerp(ax, bx, t);
    const y = lerp(ay, by, t) - Math.sin(Math.PI * t) * lift;
    return { x, y };
}

export function createNanobotCinematicRepair({
    getPairEl,
    isMismatch,
    repairAt,
    focusIndex,
    getCurrentIndex,
    setCurrentIndex,
}) {
    let bot = null;
    let beam = null;
    let dot = null;
    let scanRing = null;

    let hud = null;
    let hudTitle = null;
    let hudSub = null;

    let sparks = [];
    let mount = null;

    let running = false;

    let lastBotX = null, lastBotY = null;
    let bank = 0;

    function callRepair(i) {
        try { return repairAt(i); }
        catch { return repairAt(i, { silent: false }); }
    }

    function ensure() {
        if (bot) return;

        mount = document.getElementById("dna-visual") ?? document.body;
        if (mount !== document.body) {
            const cs = getComputedStyle(mount);
            if (cs.position === "static") mount.style.position = "relative";
        }

        bot = document.createElement("div");
        bot.className = "gx-nano is-hidden";
        bot.style.setProperty("--bank", "0deg");

        bot.innerHTML = `
      <div class="gx-crystalbot">
        <div class="gx-crystalbot__body">
          <div class="gx-crystalbot__facet f1"></div>
          <div class="gx-crystalbot__facet f2"></div>
          <div class="gx-crystalbot__facet f3"></div>
          <div class="gx-crystalbot__facet f4"></div>

          <div class="gx-crystalbot__core"></div>
          <div class="gx-crystalbot__sparkle"></div>
        </div>

        <div class="gx-crystalbot__legs">
          <div class="gx-cleg k1"><i></i><b></b></div>
          <div class="gx-cleg k2"><i></i><b></b></div>
          <div class="gx-cleg k3"><i></i><b></b></div>
          <div class="gx-cleg k4"><i></i><b></b></div>
        </div>
      </div>
    `;

        beam = document.createElement("div");
        beam.className = "gx-nano-beam is-hidden";

        dot = document.createElement("div");
        dot.className = "gx-nano-dot is-hidden";

        hud = document.createElement("div");
        hud.className = "gx-nano-hud";
        hud.innerHTML = `
      <div class="gx-nano-hud__title">Nanobot repair</div>
      <div class="gx-nano-hud__sub">Preparing…</div>
    `;
        hudTitle = hud.querySelector(".gx-nano-hud__title");
        hudSub = hud.querySelector(".gx-nano-hud__sub");

        sparks = Array.from({ length: 14 }, () => {
            const s = document.createElement("div");
            s.className = "gx-nano-spark";
            s.style.opacity = "0";
            document.body.appendChild(s);
            return s;
        });

        document.body.appendChild(bot);
        document.body.appendChild(beam);
        document.body.appendChild(dot);
        mount.appendChild(hud);

        scanRing = document.createElement("div");
        scanRing.className = "gx-nano-scanring";
        scanRing.style.position = "fixed";
        scanRing.style.transform = "translate(-50%, -50%)";
        scanRing.style.left = "0px";
        scanRing.style.top = "0px";
        scanRing.style.pointerEvents = "none";
        scanRing.style.display = "none";
        document.body.appendChild(scanRing);
    }

    function setHud(title, sub, ok = false) {
        if (!hudSub) return;
        if (hudTitle) hudTitle.textContent = title;
        hudSub.textContent = sub;
        hudSub.classList.toggle("gx-nano-hud__ok", !!ok);
    }

    function hideAll() {
        bot?.classList.add("is-hidden");
        beam?.classList.add("is-hidden");
        dot?.classList.add("is-hidden");
        bot?.classList.remove("is-alert", "is-scan", "is-repair", "is-move");
        beam?.classList.remove("is-alert", "is-zap");
        if (hudSub) hudSub.classList.remove("gx-nano-hud__ok");
        if (scanRing) scanRing.style.display = "none";

        lastBotX = lastBotY = null;
        bank = 0;
        if (bot) bot.style.setProperty("--bank", "0deg");
    }

    function pairCenter(i) {
        const el = getPairEl(i);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, rect: r };
    }

    function placeBot(x, y) {
        bot.style.left = `${x}px`;
        bot.style.top = `${y}px`;

        bot.classList.toggle(
            "is-move",
            lastBotX !== null && Math.hypot(x - lastBotX, y - lastBotY) > 0.8
        );

        if (lastBotX != null && lastBotY != null) {
            const dx = x - lastBotX;
            const targetBank = clamp(dx * 0.10, -8, 8);
            bank = lerp(bank, targetBank, 0.22);
            bot.style.setProperty("--bank", `${bank}deg`);
        }

        lastBotX = x;
        lastBotY = y;
    }

    function placeBeam(x, yTop, yBottom) {
        beam.style.left = `${x}px`;
        beam.style.top = `${yTop}px`;
        beam.style.height = `${Math.max(10, yBottom - yTop)}px`;
    }

    function placeDot(x, y) {
        dot.style.left = `${x}px`;
        dot.style.top = `${y}px`;
    }

    function burstSparks(cx, cy) {
        for (let i = 0; i < sparks.length; i++) {
            const s = sparks[i];
            const ang = Math.random() * Math.PI * 2;
            const dist = 10 + Math.random() * 20;
            const dx = Math.cos(ang) * dist;
            const dy = Math.sin(ang) * dist;
            const life = 180 + Math.random() * 240;

            s.style.left = `${cx}px`;
            s.style.top = `${cy}px`;
            s.style.opacity = "1";
            s.style.transform = "translate(0px,0px) scale(1)";

            s.animate(
                [
                    { transform: "translate(0px,0px) scale(1)", opacity: 1 },
                    { transform: `translate(${dx}px,${dy}px) scale(.6)`, opacity: 0 }
                ],
                { duration: life, easing: "cubic-bezier(.22,1,.36,1)", fill: "forwards" }
            );
        }
    }

    function pulseScanRing(speed) {
        if (!scanRing) return;
        const s = safeSpeed(speed);
        const dur = safeDuration(520 / s);

        scanRing.getAnimations().forEach(a => a.cancel());
        scanRing.animate(
            [
                { opacity: 0, transform: "translate(-50%, -50%) scale(.70)" },
                { opacity: 1, transform: "translate(-50%, -50%) scale(1.05)" },
                { opacity: 0, transform: "translate(-50%, -50%) scale(1.40)" },
            ],
            { duration: dur, easing: "cubic-bezier(.22,1,.36,1)" }
        );
    }

    function ringPos() {
        const br = bot.getBoundingClientRect();
        const ringX = br.left + br.width * 0.50;
        const ringY = br.top + br.height * 0.84;
        return { ringX: Math.round(ringX), ringY: Math.round(ringY), br };
    }

    function localSpeedForIndex(i, mismatchesLeft) {
        const fast = 2.2;
        const normal = 1.4;
        const slow = 0.9;

        const bad = isMismatch(i);
        const near = isMismatch(i - 1) || isMismatch(i + 1);
        const cinematicBias = mismatchesLeft <= 2 ? 0.90 : 1.0;

        if (bad) return slow * cinematicBias;
        if (near) return normal * cinematicBias;
        return fast * cinematicBias;
    }

    async function approachTo(i) {
        const c = pairCenter(i);
        if (!c) return;

        bot.classList.remove("is-hidden");
        beam.classList.add("is-hidden");
        dot.classList.add("is-hidden");

        const startX = c.x - 120;
        const startY = Math.max(60, c.y - 190);
        const endX = c.x;
        const endY = c.y - 54;

        placeBot(startX, startY);

        await tween(760, (_, e) => {
            const p = arcLerp(startX, startY, endX, endY, e, 54);
            placeBot(p.x, p.y);
        });

        await tween(160, (t) => {
            const s = easeOutBack(t);
            placeBot(lerp(endX + 8, endX, s), lerp(endY - 5, endY, s));
        });

        await rafWait(90);
    }

    async function moveHoverTo(i, speed) {
        const curRect = bot.getBoundingClientRect();
        const fromX = curRect.left + curRect.width / 2;
        const fromY = curRect.top + curRect.height / 2;

        const c = pairCenter(i);
        if (!c) return;

        const tx = c.x;
        const ty = c.y - 54;

        const dist = Math.hypot(tx - fromX, ty - fromY);
        const dur = safeDuration((220 + dist * 0.55) / safeSpeed(speed));

        await tween(dur, (_, e) => {
            const p = arcLerp(fromX, fromY, tx, ty, e, 18);
            placeBot(p.x, p.y);
        });
    }

    async function scanBeamPulse(i, speed) {
        beam.classList.remove("is-hidden");
        dot.classList.remove("is-hidden");

        const s = safeSpeed(speed);
        const downMs = safeDuration(460 / s);
        const upMs = safeDuration(380 / s);

        scanRing.style.display = "";

        await tween(downMs, (_, e) => {
            const c = pairCenter(i);
            if (!c) return;

            const by0 = c.y - 54;
            const top = by0 + 10;

            const br = bot.getBoundingClientRect();
            const ringX = Math.round(br.left + br.width * 0.50);
            const ringY = Math.round(br.top + br.height * 0.86);   

            scanRing.style.left = `${ringX}px`;
            scanRing.style.top = `${ringY}px`;

            const bx = c.x;
            placeBeam(bx, top, ringY);
            placeDot(bx, lerp(top, ringY, e));
        });

        await tween(upMs, (_, e) => {
            const c = pairCenter(i);
            if (!c) return;

            const by0 = c.y - 54;
            const top = by0 + 10;

            const br = bot.getBoundingClientRect();
            const ringX = Math.round(br.left + br.width * 0.50);
            const ringY = Math.round(br.top + br.height * 0.86);

            scanRing.style.left = `${ringX}px`;
            scanRing.style.top = `${ringY}px`;

            const bx = c.x;
            placeBeam(bx, top, ringY);
            placeDot(bx, lerp(ringY, top, e));
        });

        scanRing.style.display = "none";
    }

    async function doRepairAt(i) {
        const c = pairCenter(i);
        if (!c) { callRepair(i); return; }

        bot.classList.add("is-repair");

        {
            const br = bot.getBoundingClientRect();
            const fromX = br.left + br.width / 2;
            const fromY = br.top + br.height / 2;

            const workX = c.x;
            const workY = c.y - 38;

            await tween(150, (_, e) => {
                const p = arcLerp(fromX, fromY, workX, workY, easeOutCubic(e), 14);
                placeBot(p.x, p.y);
            });
        }

        const cx = c.x, cy = c.y;
        burstSparks(cx, cy);

        beam.classList.add("is-zap");
        await rafWait(80);
        beam.classList.remove("is-zap");
        await rafWait(45);

        beam.classList.add("is-zap");
        burstSparks(cx, cy);
        await rafWait(85);

        callRepair(i);

        beam.classList.remove("is-zap");

        {
            const br = bot.getBoundingClientRect();
            const bx = br.left + br.width / 2;
            const by = br.top + br.height / 2;

            await tween(120, (t) => {
                const k = Math.sin(t * Math.PI);
                placeBot(bx - k * 4, by - k * 2.5);
            });
        }

        {
            const br = bot.getBoundingClientRect();
            const fromX = br.left + br.width / 2;
            const fromY = br.top + br.height / 2;

            const endX = c.x;
            const endY = c.y - 54;

            await tween(210, (_, e) => {
                const s = easeOutBack(e);
                placeBot(lerp(fromX, endX, s), lerp(fromY, endY, s));
            });
        }

        bot.classList.remove("is-repair", "is-alert");
        beam.classList.remove("is-alert");
    }

    async function scanStep(i, speed) {
        const speedBoost = isMismatch(i) ? 1.0 : 1.22;
        speed = safeSpeed(speed * speedBoost);

        setCurrentIndex(i);
        focusIndex(i);

        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);

        bot.classList.add("is-scan");
        bot.classList.remove("is-alert", "is-repair");

        await moveHoverTo(i, speed);

        const ringSpeed = speed * (isMismatch(i) ? 1 : 1.35);
        pulseScanRing(ringSpeed);

        await scanBeamPulse(i, speed);

        if (!isMismatch(i)) {
            bot.classList.remove("is-alert");
            beam.classList.remove("is-alert");
            await rafWait(safeDuration(70 / speed));
            return false;
        }

        bot.classList.add("is-alert");
        beam.classList.add("is-alert");
        await rafWait(170);

        await doRepairAt(i);

        await rafWait(110);
        bot.classList.remove("is-scan");
        return true;
    }

    async function exitFrom(i) {
        const c = pairCenter(i);
        if (!c) { hideAll(); return; }

        const curRect = bot.getBoundingClientRect();
        const fromX = curRect.left + curRect.width / 2;
        const fromY = curRect.top + curRect.height / 2;

        const endX = c.x + 190;
        const endY = Math.max(60, c.y - 210);

        bot.classList.remove("is-alert", "is-scan", "is-repair");
        beam.classList.add("is-hidden");
        dot.classList.add("is-hidden");
        if (scanRing) scanRing.style.display = "none";

        await tween(880, (_, e) => {
            const spiral = Math.pow(1 - e, 1.6) * 18;
            const x = lerp(fromX, endX, e) + Math.cos(e * 6.0) * spiral;
            const y = lerp(fromY, endY, e) + Math.sin(e * 6.0) * spiral - Math.sin(Math.PI * e) * 18;
            placeBot(x, y);
            bot.style.opacity = String(lerp(1, 0, Math.pow(e, 1.1)));
        });

        bot.style.opacity = "";
        hideAll();
    }

    async function run() {
        if (running) return;
        running = true;
        ensure();

        try {
            const targets = [];
            for (let i = 0; ; i++) {
                const el = getPairEl(i);
                if (!el) break;
                targets.push(i);
            }
            if (!targets.length) return;

            const mismatchIdx = targets.filter(isMismatch);
            const total = mismatchIdx.length;

            if (!total) {
                setHud("Nanobot repair", "No mismatches found.", true);
                await rafWait(650);
                return;
            }

            hideAll();
            setHud("Nanobot repair", `Repairing 0/${total}`);

            const start = Math.max(0, Math.min(getCurrentIndex?.() ?? 0, targets.length - 1));
            await approachTo(start);

            let fixed = 0;

            for (const i of targets) {
                const left = total - fixed;
                if (left <= 0) break;

                const speed = localSpeedForIndex(i, left);
                setHud("Nanobot repair", `Repairing ${fixed}/${total}`);

                const didFix = await scanStep(i, speed);
                if (didFix) {
                    fixed++;
                    setHud("Nanobot repair", `Repairing ${fixed}/${total}`);
                }

                await rafWait(safeDuration(100 / speed));
            }

            setHud("Nanobot repair", "DNA stabilized ✓", true);
            await rafWait(520);

            await exitFrom(getCurrentIndex?.() ?? targets[targets.length - 1]);
        } finally {
            running = false;
        }
    }

    function dispose() {
        bot?.remove(); beam?.remove(); dot?.remove();
        hud?.remove();
        sparks?.forEach(s => s.remove());
        scanRing?.remove();

        bot = beam = dot = scanRing = null;
        hud = hudTitle = hudSub = null;
        sparks = [];
        mount = null;

        running = false;
    }

    return { run, dispose, isRunning: () => running };
}