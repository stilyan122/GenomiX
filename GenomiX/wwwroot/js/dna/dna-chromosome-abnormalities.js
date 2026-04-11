import * as THREE from "https://esm.sh/three@0.159.0";
import { OrbitControls } from "https://esm.sh/three@0.159.0/examples/jsm/controls/OrbitControls.js";
import { mergeGeometries } from "https://esm.sh/three@0.159.0/examples/jsm/utils/BufferGeometryUtils.js";

// ─── Mutation classification ───────────────────────────────────────────────

function reverseString(s) { return [...(s || "")].reverse().join(""); }

function longestCommonPrefix(a, b) {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return i;
}

function longestCommonSuffix(a, b, startA = 0, startB = 0) {
    let i = a.length - 1, j = b.length - 1, count = 0;
    while (i >= startA && j >= startB && a[i] === b[j]) { i--; j--; count++; }
    return count;
}

function classifyMainMutation(original, mutated) {
    const a = original || "", b = mutated || "";
    if (a === b) return { type: "none", start: 0, originalSegment: "", mutatedSegment: "", originalRange: [0, 0], mutatedRange: [0, 0] };
    const prefix = longestCommonPrefix(a, b);
    const suffix = longestCommonSuffix(a, b, prefix, prefix);
    const endA = a.length - suffix, endB = b.length - suffix;
    const segA = a.slice(prefix, endA), segB = b.slice(prefix, endB);
    if (segA.length > 0 && segB.length === 0)
        return { type: "deletion", start: prefix, originalSegment: segA, mutatedSegment: "", originalRange: [prefix, endA - 1], mutatedRange: [prefix, prefix] };
    if (segA.length === 0 && segB.length > 0) {
        const dup = segB === a.slice(Math.max(0, prefix - segB.length), prefix) || a.includes(segB);
        return { type: dup ? "duplication" : "insertion", start: prefix, originalSegment: "", mutatedSegment: segB, originalRange: [prefix, prefix], mutatedRange: [prefix, endB - 1] };
    }
    if (segA.length === segB.length && reverseString(segA) === segB)
        return { type: "inversion", start: prefix, originalSegment: segA, mutatedSegment: segB, originalRange: [prefix, endA - 1], mutatedRange: [prefix, endB - 1] };
    return { type: "substitution", start: prefix, originalSegment: segA, mutatedSegment: segB, originalRange: [prefix, endA - 1], mutatedRange: [prefix, endB - 1] };
}

function rangesOverlap(aS, aE, bS, bE) { return aS <= bE && bS <= aE; }

// ─── Chromosome shape constants ────────────────────────────────────────────

const MAX_SLOTS = 400;   // max visual segments (1 per bp up to this, grouped above)
const TOTAL_H = 11.2;  // total visual height of chromosome
const R_MAX = 0.42;  // widest radius (mid-arms)
const R_CENT = 0.20;  // centromere constriction
const R_TIP = 0.13;  // telomere tip radius
const SPREAD = 0.28;  // sister chromatid X-offset from center
const CENT_FRAC = 0.40;  // centromere at 40% of chromosome length
const CENT_W = 0.055; // centromere constriction half-width (fraction)

// Smooth radius profile: wide mid-arm → constricted centromere → tapered telomeres
function slotRadius(i, total) {
    if (total <= 1) return R_MAX;
    const t = i / (total - 1);            // 0 → 1 top-to-bottom
    const tipDist = Math.min(t, 1 - t);         // 0 at tips, 0.5 at middle
    const tipFac = Math.min(1, tipDist / 0.07); // 0 at tips, 1 past 7% in
    const centDist = Math.abs(t - CENT_FRAC);
    const centFac = Math.min(1, centDist / CENT_W); // 0 at centromere, 1 away
    const rBase = R_TIP + (R_MAX - R_TIP) * tipFac;
    return R_CENT + (rBase - R_CENT) * centFac;
}

// X-offset: chromatids converge at centromere
function slotXOffset(i, total) {
    if (total <= 1) return 0;
    const t = i / (total - 1);
    const centDist = Math.abs(t - CENT_FRAC);
    const pullIn = Math.max(0, 1 - centDist / (CENT_W * 2.5));
    return SPREAD * (1 - pullIn);
}

// G-banding simulation: alternating dark/light bands, centromere grey
function normalBandColor(i, total) {
    const t = total > 1 ? i / (total - 1) : 0.5;
    if (Math.abs(t - CENT_FRAC) < CENT_W * 1.2) return 0x607095; // centromere grey-blue
    const bandSize = Math.max(1, Math.floor(total / 18));
    return Math.floor(i / bandSize) % 2 ? 0x3a72cc : 0x5096e8;
}

// Radial segment count – fewer for tiny bands (performance)
function radialSegs(bandH) {
    if (bandH > 0.4) return 20;
    if (bandH > 0.15) return 16;
    if (bandH > 0.05) return 12;
    return 8;
}

// ─── Band descriptor array ─────────────────────────────────────────────────
//
// Returns one entry per visual slot for one chromosome side.
// type:
//   "normal"          – unchanged base pair
//   "hit"             – substitution affected bp
//   "inversion"       – inverted bp (mutated side)
//   "duplication"     – duplicated bp (mutated side)
//   "deletion-ghost"  – DELETED bp shown as phantom gap on mutated side
//   "insertion-gap"   – insertion placeholder on original side
//   "insertion-new"   – inserted bp shown on mutated side

function computeChromosomeBands(sequence, mutation, isMutatedSide) {
    const seq = sequence || "";
    const seqLen = seq.length;
    if (seqLen === 0) return [];

    const visLen = Math.min(seqLen, MAX_SLOTS);
    const bpPerSlot = seqLen / visLen;

    const mRange = isMutatedSide ? mutation.mutatedRange : mutation.originalRange;
    const mS = mRange?.[0] ?? -1;
    const mE = mRange?.[1] ?? -1;
    const hasMut = mutation.type !== "none";

    // 1. Base bands from the sequence
    const bands = [];
    for (let i = 0; i < visLen; i++) {
        const bpS = Math.floor(i * bpPerSlot);
        const bpE = Math.min(seqLen - 1, Math.ceil((i + 1) * bpPerSlot) - 1);
        const hit = hasMut && rangesOverlap(bpS, bpE, mS, mE);
        let type = "normal";
        if (hit) {
            if (mutation.type === "inversion") type = "inversion";
            else if (mutation.type === "duplication") type = "duplication";
            else if (mutation.type === "insertion") type = "insertion-new";
            else type = "hit"; // substitution or deletion boundary
        }
        bands.push({ bpS, bpE, type });
    }

    // 2. Inject ghost slots for DELETION on mutated side
    if (isMutatedSide && mutation.type === "deletion") {
        const delLen = mutation.originalSegment?.length ?? 0;
        if (delLen > 0) {
            const atSlot = Math.min(bands.length, Math.round(mutation.mutatedRange[0] / bpPerSlot));
            const ghostCount = Math.max(1, Math.min(Math.round(delLen / bpPerSlot), 60));
            const ghosts = Array.from({ length: ghostCount }, () => ({ type: "deletion-ghost", bpS: -1, bpE: -1 }));
            bands.splice(atSlot, 0, ...ghosts);
        }
    }

    // 3. Inject gap placeholders for INSERTION on original side
    if (!isMutatedSide && mutation.type === "insertion") {
        const insLen = mutation.mutatedSegment?.length ?? 0;
        if (insLen > 0) {
            const atSlot = Math.min(bands.length, Math.round(mutation.originalRange[0] / bpPerSlot));
            const gapCount = Math.max(1, Math.min(Math.round(insLen / bpPerSlot), 60));
            const gaps = Array.from({ length: gapCount }, () => ({ type: "insertion-gap", bpS: -1, bpE: -1 }));
            bands.splice(atSlot, 0, ...gaps);
        }
    }

    return bands;
}

// ─── Build Three.js chromosome group ──────────────────────────────────────
//
// Uses geometry merging: one draw call per band-type per chromatid.

function buildChromosomeGroup(sequence, mutation, isMutatedSide) {
    const group = new THREE.Group();
    const bands = computeChromosomeBands(sequence, mutation, isMutatedSide);
    const nSlots = bands.length;
    if (nSlots === 0) return group;

    const bandH = TOTAL_H / nSlots;
    const segs = radialSegs(bandH);

    // Material pool (shared, avoids thousands of objects)
    const matPool = {
        normal: new THREE.MeshPhongMaterial({ color: 0x3a72cc, shininess: 88, specular: 0x66aaff }),
        normal2: new THREE.MeshPhongMaterial({ color: 0x5096e8, shininess: 88, specular: 0x66aaff }),
        centromere: new THREE.MeshPhongMaterial({ color: 0x607095, shininess: 70, specular: 0x66aaff }),
        hit: new THREE.MeshPhongMaterial({ color: isMutatedSide ? 0xff2244 : 0xff7722, emissive: isMutatedSide ? 0x550010 : 0x441500, shininess: 96, specular: 0xffaacc }),
        inversion: new THREE.MeshPhongMaterial({ color: isMutatedSide ? 0xaa44ff : 0xff7722, emissive: isMutatedSide ? 0x220033 : 0x441500, shininess: 96, specular: 0xccaaff }),
        duplication: new THREE.MeshPhongMaterial({ color: isMutatedSide ? 0x00d8aa : 0xff7722, emissive: isMutatedSide ? 0x003322 : 0x441500, shininess: 96, specular: 0xaaffee }),
        "insertion-new": new THREE.MeshPhongMaterial({ color: 0x22ddaa, emissive: 0x003322, shininess: 96, specular: 0xaaffee }),
        "deletion-ghost-fill": new THREE.MeshBasicMaterial({ color: 0xff1133, transparent: true, opacity: 0.10, side: THREE.DoubleSide }),
        "deletion-ghost-wire": new THREE.LineBasicMaterial({ color: 0xff3355, transparent: true, opacity: 0.55 }),
        "insertion-gap": new THREE.MeshBasicMaterial({ color: 0x1a2a55, transparent: true, opacity: 0.45 }),
        telomere: new THREE.MeshPhongMaterial({ color: 0x4a88dd, shininess: 90, specular: 0x66aaff }),
        bridge: new THREE.MeshPhongMaterial({ color: 0x556688, shininess: 65 }),
        glow: (col) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.18, side: THREE.BackSide }),
    };

    // Geometry accumulator per material key: { geos[], mat }
    const buckets = {};
    function bucket(key) {
        if (!buckets[key]) buckets[key] = [];
        return buckets[key];
    }

    // Geometry cache by (rTop,rBot,h,segs) → avoid duplicate geometry objects
    const geoCache = new Map();
    function cylGeo(rTop, rBot, h, s = segs) {
        const k = `${rTop.toFixed(3)}_${rBot.toFixed(3)}_${h.toFixed(5)}_${s}`;
        if (!geoCache.has(k)) geoCache.set(k, new THREE.CylinderGeometry(rTop, rBot, h, s, 1));
        return geoCache.get(k);
    }
    function clonePos(geo, x, y, z) {
        const g = geo.clone();
        g.applyMatrix4(new THREE.Matrix4().makeTranslation(x, y, z));
        return g;
    }

    // Ghost / gap bands rendered individually (few of them, need special materials)
    const individualMeshes = [];

    for (let c = 0; c < 2; c++) {
        const xSign = c === 0 ? -1 : 1;

        for (let i = 0; i < nSlots; i++) {
            const band = bands[i];
            const y = (TOTAL_H / 2) - (i + 0.5) * bandH;
            const xOffset = slotXOffset(i, nSlots);
            const x = xSign * xOffset;
            const r = slotRadius(i, nSlots);
            const rTop = i === 0 ? R_TIP : (slotRadius(Math.max(0, i - 1), nSlots) + r) / 2;
            const rBot = i === nSlots - 1 ? R_TIP : (r + slotRadius(Math.min(nSlots - 1, i + 1), nSlots)) / 2;

            // ── Special: deletion ghost ───────────────────────────────────
            if (band.type === "deletion-ghost") {
                const ghostR = slotRadius(Math.round(nSlots * 0.25), nSlots) * 0.85;
                const openGeo = new THREE.CylinderGeometry(ghostR, ghostR, bandH, 14, 1, true);

                const fillMesh = new THREE.Mesh(openGeo.clone(), matPool["deletion-ghost-fill"]);
                fillMesh.position.set(x, y, 0);
                individualMeshes.push(fillMesh);

                const edgesGeo = new THREE.EdgesGeometry(new THREE.CylinderGeometry(ghostR, ghostR, bandH, 14, 1));
                const edgeMesh = new THREE.LineSegments(edgesGeo, matPool["deletion-ghost-wire"]);
                edgeMesh.position.set(x, y, 0);
                individualMeshes.push(edgeMesh);
                continue;
            }

            // ── Special: insertion gap placeholder ────────────────────────
            if (band.type === "insertion-gap") {
                const gapR = slotRadius(Math.round(nSlots * 0.25), nSlots) * 0.45;
                const gapGeo = new THREE.CylinderGeometry(gapR, gapR, bandH * 0.6, 10);
                const gapMesh = new THREE.Mesh(gapGeo, matPool["insertion-gap"]);
                gapMesh.position.set(x, y, 0);
                individualMeshes.push(gapMesh);
                continue;
            }

            // ── Normal band: accumulate into merge buckets ─────────────────
            const geo = clonePos(cylGeo(rTop, rBot, bandH), x, y, 0);

            // Determine material bucket key
            let matKey;
            if (band.type === "hit") matKey = "hit";
            else if (band.type === "inversion") matKey = "inversion";
            else if (band.type === "duplication") matKey = "duplication";
            else if (band.type === "insertion-new") matKey = "insertion-new";
            else {
                // Normal: centromere or alternating G-band
                const t = nSlots > 1 ? i / (nSlots - 1) : 0.5;
                if (Math.abs(t - CENT_FRAC) < CENT_W * 1.2) matKey = "centromere";
                else { const bs = Math.max(1, Math.floor(nSlots / 18)); matKey = Math.floor(i / bs) % 2 ? "normal" : "normal2"; }
            }

            bucket(matKey).push(geo);

            // Glow halo for mutated bands
            if (band.type !== "normal" && band.type !== "centromere") {
                const glowR = (rTop + rBot) / 2 + 0.06;
                const glowGeo = clonePos(cylGeo(glowR, glowR, bandH, 12), x, y, 0);
                const glowCol = band.type === "inversion" ? 0xaa44ff
                    : band.type === "duplication" ? 0x00d8aa
                        : band.type === "insertion-new" ? 0x22ddaa
                            : (isMutatedSide ? 0xff2244 : 0xff7722);
                bucket("glow_" + glowCol.toString(16)).push({ geo: glowGeo, col: glowCol });
            }
        }

        // Telomere caps (top and bottom hemispheres)
        const xSpread = xSign * SPREAD;
        [1, -1].forEach(dir => {
            const capY = dir * (TOTAL_H / 2);
            const phiSt = dir > 0 ? Math.PI : 0;
            const capGeo = new THREE.SphereGeometry(R_TIP, 14, 8, 0, Math.PI * 2, phiSt, Math.PI / 2);
            capGeo.applyMatrix4(new THREE.Matrix4().makeTranslation(xSpread, capY, 0));
            bucket("telomere").push(capGeo);
        });
    }

    // Centromere bridge
    {
        const centY = (TOTAL_H / 2) - (CENT_FRAC * (nSlots - 1) + 0.5) * (TOTAL_H / nSlots);
        const bridgeGeo = new THREE.CylinderGeometry(0.09, 0.09, SPREAD * 2, 12).clone();
        bridgeGeo.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI / 2));
        bridgeGeo.applyMatrix4(new THREE.Matrix4().makeTranslation(0, centY, 0));
        bucket("bridge").push(bridgeGeo);
    }

    // ── Flush buckets → merged meshes ─────────────────────────────────────
    const matByKey = {
        normal: matPool.normal, normal2: matPool.normal2, centromere: matPool.centromere,
        hit: matPool.hit, inversion: matPool.inversion, duplication: matPool.duplication,
        "insertion-new": matPool["insertion-new"],
        telomere: matPool.telomere, bridge: matPool.bridge,
    };

    for (const [key, geos] of Object.entries(buckets)) {
        if (!geos.length) continue;

        if (key.startsWith("glow_")) {
            // Each glow bucket has {geo, col} objects
            const col = parseInt(key.slice(5), 16);
            const merged = mergeGeometries(geos.map(g => g.geo));
            if (merged) group.add(new THREE.Mesh(merged, matPool.glow(col)));
            continue;
        }

        const mat = matByKey[key];
        if (!mat) continue;
        const merged = mergeGeometries(geos);
        if (merged) group.add(new THREE.Mesh(merged, mat));
    }

    // Add individual special meshes
    individualMeshes.forEach(m => group.add(m));

    return group;
}

// ─── Mount 3-D scene into DOM container ───────────────────────────────────

function mountChromosome3D(container, { sequence, label, mutation, isMutatedSide, lang }) {
    container._gxDispose?.();
    container.innerHTML = "";
    container.style.position = "relative";

    const H = 520;
    container.style.height = H + "px";

    const W = container.clientWidth || 400;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
    camera.position.set(0, 0, 20);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 6;
    controls.maxDistance = 45;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.50;
    controls.enablePan = false;

    // Lights
    scene.add(new THREE.AmbientLight(0x2a3a66, 1.6));
    const d1 = new THREE.DirectionalLight(0xffffff, 3.0); d1.position.set(6, 9, 8); scene.add(d1);
    const d2 = new THREE.DirectionalLight(0x3355dd, 1.4); d2.position.set(-5, -4, 3); scene.add(d2);
    const pt = new THREE.PointLight(0x88aaff, 2.0, 50); pt.position.set(3, 5, 6); scene.add(pt);

    // Build chromosome (deferred so container has dimensions)
    requestAnimationFrame(() => {
        const chromGroup = buildChromosomeGroup(sequence, mutation, isMutatedSide);
        scene.add(chromGroup);
    });

    // ── Overlays ─────────────────────────────────────────────────────────
    const mk = (cls, html) => {
        const d = document.createElement("div");
        d.className = cls;
        if (html !== undefined) d.innerHTML = html;
        container.appendChild(d);
        return d;
    };

    mk("gx-chrom3d-label").textContent = label;

    const hasMut = mutation.type !== "none";
    const hitColor = isMutatedSide ? "#ff2244" : "#ff7722";
    const insColor = "#22ddaa";
    const ghostColor = "#ff3355";

    let legendHtml = `
        <div class="gx-chrom3d-legend__row"><span class="gx-chrom3d-legend__dot" style="background:#5096e8"></span>${lang === "bg" ? "Непроменен сегмент" : "Unchanged bp"}</div>
        <div class="gx-chrom3d-legend__row"><span class="gx-chrom3d-legend__dot" style="background:#607095"></span>${lang === "bg" ? "Центромер" : "Centromere"}</div>`;

    if (hasMut) {
        if (mutation.type === "deletion") {
            if (isMutatedSide) {
                legendHtml += `<div class="gx-chrom3d-legend__row"><span class="gx-chrom3d-legend__dot" style="background:${ghostColor};opacity:.5;outline:1.5px solid ${ghostColor};"></span>${lang === "bg" ? "Изтрити bp (липсват)" : "Deleted bp (gap)"}</div>`;
            } else {
                legendHtml += `<div class="gx-chrom3d-legend__row"><span class="gx-chrom3d-legend__dot" style="background:${hitColor}"></span>${lang === "bg" ? "Изтрит регион" : "Deleted region"}</div>`;
            }
        } else if (mutation.type === "insertion") {
            if (isMutatedSide) {
                legendHtml += `<div class="gx-chrom3d-legend__row"><span class="gx-chrom3d-legend__dot" style="background:${insColor}"></span>${lang === "bg" ? "Вмъкнати bp (нови)" : "Inserted bp (new)"}</div>`;
            } else {
                legendHtml += `<div class="gx-chrom3d-legend__row"><span class="gx-chrom3d-legend__dot" style="background:#1a2a55;outline:1px solid #667"></span>${lang === "bg" ? "Точка на вмъкване" : "Insertion point"}</div>`;
            }
        } else if (mutation.type === "duplication") {
            legendHtml += `<div class="gx-chrom3d-legend__row"><span class="gx-chrom3d-legend__dot" style="background:${isMutatedSide ? "#00d8aa" : hitColor}"></span>${lang === "bg" ? "Дупликиран регион" : "Duplicated region"}</div>`;
        } else if (mutation.type === "inversion") {
            legendHtml += `<div class="gx-chrom3d-legend__row"><span class="gx-chrom3d-legend__dot" style="background:${isMutatedSide ? "#aa44ff" : hitColor}"></span>${lang === "bg" ? "Инвертиран регион" : "Inverted region"}</div>`;
        } else {
            legendHtml += `<div class="gx-chrom3d-legend__row"><span class="gx-chrom3d-legend__dot" style="background:${hitColor}"></span>${lang === "bg" ? "Заместен bp" : "Substituted bp"}</div>`;
        }
    }

    mk("gx-chrom3d-legend", legendHtml);

    const badge = mk("gx-chrom3d-badge");
    badge.textContent = (sequence?.length || 0) + " bp";

    // Interaction
    renderer.domElement.addEventListener("pointerdown", () => { controls.autoRotate = false; }, { passive: true });
    renderer.domElement.addEventListener("dblclick", () => { controls.autoRotate = true; });

    let animId;
    const animate = () => { animId = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); };
    animate();

    const ro = new ResizeObserver(() => {
        const w = container.clientWidth;
        camera.aspect = w / H;
        camera.updateProjectionMatrix();
        renderer.setSize(w, H);
    });
    ro.observe(container);

    container._gxDispose = () => {
        cancelAnimationFrame(animId);
        ro.disconnect();
        controls.dispose();
        scene.traverse(o => { if (o.isMesh || o.isLineSegments) { o.geometry?.dispose(); if (Array.isArray(o.material)) o.material.forEach(m => m.dispose()); else o.material?.dispose(); } });
        renderer.dispose();
    };
}

// ─── Mutation info panel ───────────────────────────────────────────────────

function mutationInfoHtml(mutation, lang) {
    const bg = lang === "bg";
    const L = {
        title: bg ? "Открита мутация" : "Detected mutation",
        none: bg ? "✓ Последователностите са идентични — няма мутация" : "✓ Sequences are identical — no mutation",
        pos: bg ? "Позиция" : "Position",
        orig: bg ? "Оригинален сегмент" : "Original segment",
        mut: bg ? "Мутирал сегмент" : "Mutated segment",
        len: bg ? "Размер на промяната" : "Change size",
    };
    const typeNames = {
        en: { deletion: "Deletion", insertion: "Insertion", duplication: "Duplication", inversion: "Inversion", substitution: "Substitution" },
        bg: { deletion: "Делеция", insertion: "Инсерция", duplication: "Дупликация", inversion: "Инверсия", substitution: "Заместване" },
    };
    const typeDescs = {
        en: { deletion: "Segment removed from the sequence.", insertion: "New segment inserted into the sequence.", duplication: "Segment duplicated within the sequence.", inversion: "Segment reversed (inverted) in place.", substitution: "Segment replaced with a different sequence." },
        bg: { deletion: "Сегмент е премахнат от последователността.", insertion: "Нов сегмент е вмъкнат в последователността.", duplication: "Сегмент е дублиран в последователността.", inversion: "Сегмент е обърнат (инвертиран) на място.", substitution: "Сегмент е заменен с различна последователност." },
    };
    const icons = { deletion: "🗑", insertion: "➕", duplication: "🔁", inversion: "↔️", substitution: "🔄" };

    if (mutation.type === "none") {
        return `<div class="gx-chromosome-info gx-chromosome-info--ok">
            <div class="gx-chromosome-info__label">${L.title}</div>
            <div class="gx-chromosome-info__value gx-chrom-ok">${L.none}</div>
        </div>`;
    }

    const name = (bg ? typeNames.bg : typeNames.en)[mutation.type] || mutation.type;
    const desc = (bg ? typeDescs.bg : typeDescs.en)[mutation.type] || "";
    const icon = icons[mutation.type] || "•";
    const trunc = s => s.length > 80 ? s.slice(0, 80) + "…" : s;
    const oSeg = mutation.originalSegment || "—";
    const mSeg = mutation.mutatedSegment || "—";
    const changeLen = Math.max(mutation.originalSegment?.length ?? 0, mutation.mutatedSegment?.length ?? 0);

    return `<div class="gx-chromosome-info">
        <div class="gx-chromosome-info__label">${L.title}</div>
        <div class="gx-chromosome-info__value"><span class="gx-chrom-type-icon">${icon}</span> ${name}</div>
        <p class="gx-chrom-type-desc">${desc}</p>
        <div class="gx-chromosome-info__meta">
            <div class="gx-chrom-meta-row"><span class="gx-chrom-meta-k">${L.pos}</span><span class="gx-chrom-meta-v">${mutation.start}</span></div>
            <div class="gx-chrom-meta-row"><span class="gx-chrom-meta-k">${L.len}</span><span class="gx-chrom-meta-v">${changeLen} bp</span></div>
            <div class="gx-chrom-meta-row gx-chrom-meta-row--seq"><span class="gx-chrom-meta-k">${L.orig}</span><code class="gx-chrom-meta-seq">${trunc(oSeg)}</code></div>
            <div class="gx-chrom-meta-row gx-chrom-meta-row--seq"><span class="gx-chrom-meta-k gx-chrom-meta-k--mut">${L.mut}</span><code class="gx-chrom-meta-seq gx-chrom-meta-seq--mut">${trunc(mSeg)}</code></div>
        </div>
    </div>`;
}

// ─── Public export ─────────────────────────────────────────────────────────

export function renderChromosomeAbnormalitiesCompare({
    normalMount, mutatedMount, infoMount,
    originalSequence, mutatedSequence
}) {
    const lang = document.documentElement.lang?.toLowerCase().startsWith("bg") ? "bg" : "en";
    const mutation = classifyMainMutation(originalSequence, mutatedSequence);

    if (normalMount) mountChromosome3D(normalMount, { sequence: originalSequence, label: lang === "bg" ? "Оригинална хромозома" : "Original chromosome", mutation, isMutatedSide: false, lang });
    if (mutatedMount) mountChromosome3D(mutatedMount, { sequence: mutatedSequence, label: lang === "bg" ? "Мутирала хромозома" : "Mutated chromosome", mutation, isMutatedSide: true, lang });
    if (infoMount) infoMount.innerHTML = mutationInfoHtml(mutation, lang);

    return mutation;
}