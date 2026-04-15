// ─── GenomiX — 3D Simulation World View ──────────────────────────────────────
// Performance targets:
//   • NO per-frame GC — particle pool pre-allocated, no new THREE objects in loop
//   • Organisms: cylindrical billboard planes (stay upright, face camera on Y only)
//   • Food: flat planes lying on the ground (no billboarding needed)
//   • Decor: cylindrical billboard planes
//   • setBiome() called from 2D frame loop — instant env reaction
//   • onResize() for fullscreen

const GROUND_SIZE = 240;
const EMOJI_TEX = 80;
const MAX_PARTICLES = 60;   // hard cap — no heap churn beyond this

const BIOME_CFG = {
    temperate: { ground: 0x1c5230, fog: 0x060d1a, fN: 180, fF: 520, sky: 0x060d1a, amb: 0x556688, sun: 0xaaccff, decor: ['🌲', '🌳', '🌿', '🌲', '🌳', '🌱'] },
    desert: { ground: 0x9a6218, fog: 0x3a1804, fN: 130, fF: 400, sky: 0x1a0a02, amb: 0x886644, sun: 0xffcc66, decor: ['🌵', '🪨', '🌵', '💀', '🪨', '🌵'] },
    tundra: { ground: 0xa8c8e8, fog: 0x8ab0d0, fN: 140, fF: 420, sky: 0x060e20, amb: 0x6688bb, sun: 0xbbddff, decor: ['❄️', '🧊', '❄️', '🌨', '🪨', '❄️'] },
    rad: { ground: 0x3c1204, fog: 0x200802, fN: 110, fF: 360, sky: 0x0a0202, amb: 0x663322, sun: 0xee8844, decor: ['☢️', '💀', '🪣', '🔴', '☢️', '💀'] },
    plague: { ground: 0x140620, fog: 0x0a0414, fN: 100, fF: 340, sky: 0x080112, amb: 0x442266, sun: 0xaa66ff, decor: ['🦠', '💀', '🍄', '🦠', '💀', '🌫'] },
};

function biomeIdFromInfo(biome) {
    return biome?.id ?? 'temperate';
}

export function createGalaxyView(agents, agentMap, foods, EMOJI, FOOD_EMOJI, onHover, getEnv) {

    let scene, camera, renderer, animId;
    let mounted = false;
    let currentBiomeId = '';

    // Scene objects updated per biome
    let groundMesh, skyMesh, ambientLight, sunLight;
    const decorPlanes = [];   // cylindrical billboard planes

    // Emoji texture cache
    const texCache = new Map();

    // Organism/food planes
    const orgPlanes = new Map(); // id → { plane, lastStatus }
    const foodPlanes = new Map(); // index → plane

    // ── Particle pool — pre-allocated, no GC ─────────────────────────────────
    // Slots: { mesh, active, vx, vy, vz, life, maxLife, isRing, maxScale }
    const pool = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
        const m = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.4, 0.4),
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, color: 0xffffff })
        );
        m.visible = false;
        pool.push({ mesh: m, active: false, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1, isRing: false, maxScale: 1 });
    }
    // Ring pool (separate geometry)
    const ringPool = [];
    for (let i = 0; i < 8; i++) {
        const m = new THREE.Mesh(
            new THREE.RingGeometry(0.1, 0.6, 20),
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide })
        );
        m.visible = false; m.rotation.x = -Math.PI / 2;
        ringPool.push({ mesh: m, active: false, life: 0, maxLife: 1, maxScale: 1 });
    }

    // Camera state
    let isDragging = false, prevMouse = { x: 0, y: 0 };
    let camTheta = 0.4, camPhi = 1.0, camRadius = 190;
    let autoTheta = 0.4;
    let frameCount = 0;

    const raycaster = new THREE.Raycaster();
    const mouse2d = new THREE.Vector2();

    // ── Emoji texture ─────────────────────────────────────────────────────────
    function getEmojiTex(emoji) {
        if (texCache.has(emoji)) return texCache.get(emoji);
        const c = document.createElement('canvas');
        c.width = c.height = EMOJI_TEX;
        const ctx = c.getContext('2d');
        ctx.font = `${Math.round(EMOJI_TEX * 0.68)}px system-ui,Apple Color Emoji,Segoe UI Emoji`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(emoji, EMOJI_TEX / 2, EMOJI_TEX / 2 + 2);
        const tex = new THREE.CanvasTexture(c);
        texCache.set(emoji, tex);
        return tex;
    }

    // ── Plane factory ─────────────────────────────────────────────────────────
    function makePlane(emoji, size) {
        const m = new THREE.Mesh(
            new THREE.PlaneGeometry(size, size),
            new THREE.MeshBasicMaterial({ map: getEmojiTex(emoji), transparent: true, depthWrite: false, side: THREE.DoubleSide })
        );
        return m;
    }

    // Cylindrical billboard: rotate plane around Y to face camera, stay upright
    function cylindricalBillboard(plane) {
        if (!camera) return;
        const dx = camera.position.x - plane.position.x;
        const dz = camera.position.z - plane.position.z;
        plane.rotation.set(0, Math.atan2(dx, dz), 0);
    }

    // ── Coordinate mapping ────────────────────────────────────────────────────
    function simToWorld(sx, sy, y) {
        return new THREE.Vector3((sx - 0.5) * GROUND_SIZE, y, ((sy ?? 0.5) - 0.5) * GROUND_SIZE);
    }
    const orgY = a => a.status === 'dead' ? 1.0 : 4 + a.fitness * 3;
    const orgSz = a => a.status === 'dead' ? 5 : 7 + a.fitness * 5;

    // ── Biome update ─────────────────────────────────────────────────────────
    // 40 decor positions spread across the whole ground using a seeded grid
    // with per-cell jitter — no diagonal line, covers all four quadrants evenly
    const DECOR_POS = (() => {
        const pos = [];
        const cols = 5, rows = 4;
        let seed = 42;
        const rng = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; };
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                for (let k = 0; k < 2; k++) {
                    pos.push({
                        x: (c + 0.15 + rng() * 0.70) / cols,
                        z: (r + 0.15 + rng() * 0.70) / rows,
                        scale: 0.7 + rng() * 0.6,
                    });
                }
            }
        }
        return pos;
    })();

    function applyBiome(id, force = false) {
        if (id === currentBiomeId && !force) return;
        currentBiomeId = id;
        const cfg = BIOME_CFG[id] ?? BIOME_CFG.temperate;

        groundMesh?.material.color.setHex(cfg.ground);
        skyMesh?.material.color.setHex(cfg.sky);
        if (scene?.fog) { scene.fog.color.setHex(cfg.fog); scene.fog.near = cfg.fN; scene.fog.far = cfg.fF; }
        ambientLight?.color.setHex(cfg.amb);
        sunLight?.color.setHex(cfg.sun);

        decorPlanes.forEach(p => scene.remove(p));
        decorPlanes.length = 0;
        const half = GROUND_SIZE * 0.46;
        DECOR_POS.forEach((dp, i) => {
            const emoji = cfg.decor[i % cfg.decor.length];
            const sz = 8 + dp.scale * 4;
            const plane = makePlane(emoji, sz);
            const wx = (dp.x - 0.5) * 2 * half;
            const wz = (dp.z - 0.5) * 2 * half;
            plane.position.set(wx, sz * 0.5, wz);
            plane.material.opacity = 0.68 + dp.scale * 0.18;
            scene.add(plane);
            decorPlanes.push(plane);
        });
    }

    // ── Ground ────────────────────────────────────────────────────────────────
    function buildGround(color) {
        const geo = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE, 36, 36);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i), z = pos.getZ(i);
            if (Math.max(Math.abs(x), Math.abs(z)) / (GROUND_SIZE / 2) < 0.90) {
                pos.setY(i, Math.sin(x * 0.10) * Math.cos(z * 0.09) * 1.5 + Math.sin(x * 0.24 + 1) * Math.sin(z * 0.21) * 0.7);
            }
        }
        geo.computeVertexNormals();
        const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.04 }));
        m.rotation.x = -Math.PI / 2; m.receiveShadow = true;
        return m;
    }

    function buildGrid() {
        const g = new THREE.GridHelper(GROUND_SIZE, 24, 0x2d6e3e, 0x1e4e2a);
        g.position.y = 0.12; g.material.opacity = 0.28; g.material.transparent = true;
        return g;
    }

    function buildStars() {
        const geo = new THREE.BufferGeometry();
        const n = 280, pos = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
            const t = Math.random() * Math.PI * 2, p = Math.random() * Math.PI * 0.46, r = 860;
            pos[i * 3] = r * Math.sin(p) * Math.cos(t);
            pos[i * 3 + 1] = r * Math.cos(p) + 30;
            pos[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
        }
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        return new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xddeeff, size: 2.0, sizeAttenuation: true }));
    }

    // ── Organisms ─────────────────────────────────────────────────────────────
    function addOrgPlane(a) {
        const plane = makePlane(EMOJI[a.species] || '🧬', orgSz(a));
        plane.position.copy(simToWorld(a.x, a.y, orgY(a)));
        plane.material.opacity = a.status === 'dead' ? 0.28 : 1.0;
        plane.userData = { id: a.id };
        scene.add(plane);
        orgPlanes.set(a.id, { plane, lastStatus: a.status });
    }

    function rebuildSpheres() {
        orgPlanes.forEach(({ plane }) => scene.remove(plane));
        orgPlanes.clear();
        agentMap.forEach(a => addOrgPlane(a));
    }

    function updateOrgs(t) {
        agentMap.forEach((a, id) => {
            let entry = orgPlanes.get(id);
            if (!entry) { addOrgPlane(a); return; }
            const { plane, lastStatus } = entry;
            const alive = a.status !== 'dead';
            const ty = alive ? orgY(a) + Math.sin(t * 1.5 + a.x * 8) * 0.45 : 1.0;
            const tp = simToWorld(a.x, a.y, ty);

            plane.position.x += (tp.x - plane.position.x) * 0.10;
            plane.position.y += (ty - plane.position.y) * 0.10;
            plane.position.z += (tp.z - plane.position.z) * 0.10;
            plane.material.opacity = alive ? 1.0 : 0.28;
            plane.scale.setScalar(orgSz(a) / 7);
            cylindricalBillboard(plane);

            if (lastStatus !== a.status) {
                if (a.status === 'dead') spawnDeath(plane.position.clone());
                if (a.status === 'reproduced') spawnBirth(plane.position.clone());
                entry.lastStatus = a.status;
            }
        });

        // Billboard decor too
        decorPlanes.forEach(p => cylindricalBillboard(p));
    }

    // ── Food — flat on the ground ─────────────────────────────────────────────
    let prevFoodCount = -1;
    function syncFood() {
        const n = foods.length;
        // Fast path: if count unchanged, just update opacity
        if (n === prevFoodCount) {
            foods.forEach((f, i) => {
                const p = foodPlanes.get(i);
                if (p) p.material.opacity = Math.max(0.1, f.s) * 0.90;
            });
            return;
        }
        prevFoodCount = n;
        // Remove stale
        foodPlanes.forEach((plane, key) => {
            if (key >= n) { scene.remove(plane); foodPlanes.delete(key); }
        });
        // Add new
        foods.forEach((f, i) => {
            if (!foodPlanes.has(i)) {
                const plane = makePlane(FOOD_EMOJI[f.type] || '🌿', 6);
                // Lie flat on the ground, rotated around X
                plane.rotation.x = -Math.PI / 2;
                plane.position.copy(simToWorld(f.x, f.y, 0.3));
                scene.add(plane);
                foodPlanes.set(i, plane);
            }
            foodPlanes.get(i).material.opacity = Math.max(0.1, f.s) * 0.90;
        });
    }

    // ── Particle pool helpers ─────────────────────────────────────────────────
    function getFreeSlot() {
        return pool.find(s => !s.active);
    }
    function getFreeRing() {
        return ringPool.find(s => !s.active);
    }

    function spawnDeath(pos) {
        for (let i = 0; i < 7; i++) {
            const s = getFreeSlot(); if (!s) break;
            s.active = true; s.life = s.maxLife = 0.45 + Math.random() * 0.25;
            const a = Math.random() * Math.PI * 2, el = (Math.random() - 0.2) * Math.PI;
            const sp = 7 + Math.random() * 10;
            s.vx = Math.cos(a) * Math.cos(el) * sp; s.vy = Math.sin(el) * sp + sp * 0.4; s.vz = Math.sin(a) * Math.cos(el) * sp;
            s.mesh.position.copy(pos);
            s.mesh.material.color.setHex(0xff3020);
            s.mesh.visible = true;
        }
        const r = getFreeRing(); if (r) {
            r.active = true; r.life = r.maxLife = 0.38; r.maxScale = 16;
            r.mesh.position.copy(pos); r.mesh.material.color.setHex(0xff5530); r.mesh.visible = true;
        }
    }

    function spawnBirth(pos) {
        for (let i = 0; i < 6; i++) {
            const s = getFreeSlot(); if (!s) break;
            s.active = true; s.life = s.maxLife = 0.40 + Math.random() * 0.22;
            const a = Math.random() * Math.PI * 2, el = (Math.random() - 0.1) * Math.PI;
            const sp = 5 + Math.random() * 8;
            s.vx = Math.cos(a) * Math.cos(el) * sp; s.vy = Math.sin(el) * sp + sp * 0.5; s.vz = Math.sin(a) * Math.cos(el) * sp;
            s.mesh.position.copy(pos);
            s.mesh.material.color.setHex(0x30ee80);
            s.mesh.visible = true;
        }
        for (let ri = 0; ri < 2; ri++) {
            const r = getFreeRing(); if (r) {
                r.active = true; r.life = r.maxLife = 0.32 + ri * 0.14; r.maxScale = 10 + ri * 5;
                r.mesh.position.copy(pos); r.mesh.material.color.setHex(0x44ee88); r.mesh.visible = true;
            }
        }
    }

    function stepParticles(dt) {
        pool.forEach(s => {
            if (!s.active) return;
            s.life -= dt;
            if (s.life <= 0) { s.active = false; s.mesh.visible = false; return; }
            const t = s.life / s.maxLife;
            s.mesh.position.x += s.vx * dt; s.mesh.position.y += s.vy * dt; s.mesh.position.z += s.vz * dt;
            s.vy -= 11 * dt; s.vx *= 0.88; s.vz *= 0.88;
            s.mesh.material.opacity = t * 0.85;
        });
        ringPool.forEach(r => {
            if (!r.active) return;
            r.life -= dt;
            if (r.life <= 0) { r.active = false; r.mesh.visible = false; return; }
            const t = r.life / r.maxLife;
            r.mesh.scale.setScalar(Math.max(0.01, r.maxScale * (1 - t)));
            r.mesh.material.opacity = t * 0.70;
        });
    }

    // ── Camera ────────────────────────────────────────────────────────────────
    function updateCamera() {
        camera.position.set(
            camRadius * Math.sin(camPhi) * Math.cos(camTheta),
            camRadius * Math.cos(camPhi),
            camRadius * Math.sin(camPhi) * Math.sin(camTheta)
        );
        camera.lookAt(0, 4, 0);
    }

    // ── Mount ─────────────────────────────────────────────────────────────────
    function mount(container) {
        if (mounted) return;
        mounted = true;

        const W = container.clientWidth || container.offsetWidth || 800;
        const H = container.clientHeight || container.offsetHeight || 500;

        scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x060d1a, 180, 520);

        camera = new THREE.PerspectiveCamera(50, W / H, 0.5, 1600);
        updateCamera();

        renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));  // cap at 1.5x for perf
        renderer.setSize(W, H);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.setClearColor(0x060d1a, 1);
        // Insert before existing children (the fullscreen button) so the button stays on top
        if (container.firstChild) {
            container.insertBefore(renderer.domElement, container.firstChild);
        } else {
            container.appendChild(renderer.domElement);
        }

        // Lights
        ambientLight = new THREE.AmbientLight(0x556688, 1.0); scene.add(ambientLight);
        sunLight = new THREE.DirectionalLight(0xaaccff, 1.6);
        sunLight.position.set(80, 140, 60); sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = sunLight.shadow.mapSize.height = 512; // 512 not 1024 — faster
        sunLight.shadow.camera.left = sunLight.shadow.camera.bottom = -130;
        sunLight.shadow.camera.right = sunLight.shadow.camera.top = 130;
        sunLight.shadow.camera.far = 480;
        scene.add(sunLight);
        scene.add(new THREE.HemisphereLight(0x223355, 0x1a4820, 0.7));

        // Sky + environment
        skyMesh = new THREE.Mesh(new THREE.SphereGeometry(950, 20, 14), new THREE.MeshBasicMaterial({ color: 0x060d1a, side: THREE.BackSide }));
        scene.add(skyMesh);
        groundMesh = buildGround(0x1c5230); scene.add(groundMesh);
        scene.add(buildGrid());
        scene.add(buildStars());

        // Add particle meshes to scene
        pool.forEach(s => scene.add(s.mesh));
        ringPool.forEach(r => scene.add(r.mesh));

        // Initial biome
        const env = getEnv ? getEnv() : {};
        applyBiome(biomeIdFromInfo(env ? require_biome_from_env(env) : { id: 'temperate' }));

        rebuildSpheres();
        autoTheta = camTheta;

        // Resize
        const ro = new ResizeObserver(entries => {
            if (!renderer) return;
            const { width, height } = entries[0].contentRect;
            if (!width || !height) return;
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        });
        ro.observe(container);

        // Controls
        renderer.domElement.addEventListener('pointerdown', e => {
            isDragging = false; prevMouse = { x: e.clientX, y: e.clientY };
            renderer.domElement.setPointerCapture(e.pointerId);
        });
        renderer.domElement.addEventListener('pointermove', e => {
            if (e.buttons) {
                isDragging = true;
                camTheta -= (e.clientX - prevMouse.x) * 0.007;
                camPhi = Math.max(0.22, Math.min(1.48, camPhi + (e.clientY - prevMouse.y) * 0.006));
                autoTheta = camTheta;
                prevMouse = { x: e.clientX, y: e.clientY };
            }
            const rect = renderer.domElement.getBoundingClientRect();
            mouse2d.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        });
        renderer.domElement.addEventListener('wheel', e => {
            camRadius = Math.max(40, Math.min(480, camRadius + e.deltaY * 0.40));
            e.preventDefault();
        }, { passive: false });
        renderer.domElement.addEventListener('pointerup', e => {
            if (!isDragging) {
                raycaster.setFromCamera(mouse2d, camera);
                const hits = raycaster.intersectObjects([...orgPlanes.values()].map(e => e.plane));
                if (hits.length) {
                    const id = hits[0].object.userData.id, a = agentMap.get(id);
                    onHover && onHover(a ? { id: a.id, name: a.name, species: a.species, fitness: a.fitness, status: a.status } : null, e.clientX, e.clientY);
                } else { onHover && onHover(null, 0, 0); }
            }
            isDragging = false;
        });

        let lastNow = performance.now(), timeAcc = 0;
        function loop(now) {
            animId = requestAnimationFrame(loop);
            const dt = Math.min((now - lastNow) / 1000, 0.05); lastNow = now;
            timeAcc += dt; frameCount++;

            autoTheta += dt * 0.05;
            camTheta += (autoTheta - camTheta) * 0.014;
            updateCamera();
            updateOrgs(timeAcc);
            syncFood();
            stepParticles(dt);
            renderer.render(scene, camera);
        }
        requestAnimationFrame(loop);
    }

    // ── Public API ────────────────────────────────────────────────────────────
    // Called every frame from 2D loop with current biome object
    function setBiome(biome, force = false) {
        if (!mounted) return;
        applyBiome(biomeIdFromInfo(biome), force);
    }

    function onResize() {
        if (!renderer || !camera) return;
        setTimeout(() => {
            const el = renderer.domElement.parentElement; if (!el) return;
            const w = el.clientWidth || el.offsetWidth, h = el.clientHeight || el.offsetHeight;
            if (!w || !h) return;
            renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
        }, 80);
    }

    function unmount() {
        if (!mounted) return;
        cancelAnimationFrame(animId);
        pool.forEach(s => { s.active = false; scene?.remove(s.mesh); });
        ringPool.forEach(r => { r.active = false; scene?.remove(r.mesh); });
        orgPlanes.forEach(({ plane }) => scene?.remove(plane));
        orgPlanes.clear();
        foodPlanes.forEach(p => scene?.remove(p));
        foodPlanes.clear();
        decorPlanes.forEach(p => scene?.remove(p));
        decorPlanes.length = 0;
        texCache.forEach(t => t.dispose()); texCache.clear();
        renderer?.domElement?.remove(); renderer?.dispose();
        scene = camera = renderer = null; mounted = false;
    }

    return { mount, unmount, rebuildSpheres, setBiome, onResize };
}

// Helper used only at init time — avoids importing biomeInfo
function require_biome_from_env(env) {
    if (env.rad > 0.55) return { id: 'rad' };
    if (env.dis > 0.55) return { id: 'plague' };
    if (env.temp < -2) return { id: 'tundra' };
    if (env.temp > 40) return { id: 'desert' };
    return { id: 'temperate' };
}
