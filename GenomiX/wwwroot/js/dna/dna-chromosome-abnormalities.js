import * as THREE from "https://esm.sh/three@0.159.0";
import { OrbitControls } from "https://esm.sh/three@0.159.0/examples/jsm/controls/OrbitControls.js";

// ─── Mutation classification ───────────────────────────────────────────────

function reverseString(s) { return [...(s || "")].reverse().join(""); }

function longestCommonPrefix(a, b) {
    let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i;
}
function longestCommonSuffix(a, b, sA = 0, sB = 0) {
    let i = a.length - 1, j = b.length - 1, c = 0;
    while (i >= sA && j >= sB && a[i] === b[j]) { i--; j--; c++; } return c;
}

function classifyMainMutation(original, mutated) {
    const a = original || "", b = mutated || "";
    if (a === b) return { type: "none", start: 0, originalSegment: "", mutatedSegment: "", originalRange: [0, 0], mutatedRange: [0, 0] };
    const pre = longestCommonPrefix(a, b), suf = longestCommonSuffix(a, b, pre, pre);
    const eA = a.length - suf, eB = b.length - suf;
    const sA = a.slice(pre, eA), sB = b.slice(pre, eB);
    if (sA.length > 0 && sB.length === 0)
        return { type: "deletion", start: pre, originalSegment: sA, mutatedSegment: "", originalRange: [pre, eA - 1], mutatedRange: [pre, pre] };
    if (sA.length === 0 && sB.length > 0) {
        const dup = sB === a.slice(Math.max(0, pre - sB.length), pre) || a.includes(sB);
        return { type: dup ? "duplication" : "insertion", start: pre, originalSegment: "", mutatedSegment: sB, originalRange: [pre, pre], mutatedRange: [pre, eB - 1] };
    }
    if (sA.length === sB.length && reverseString(sA) === sB)
        return { type: "inversion", start: pre, originalSegment: sA, mutatedSegment: sB, originalRange: [pre, eA - 1], mutatedRange: [pre, eB - 1] };
    return { type: "substitution", start: pre, originalSegment: sA, mutatedSegment: sB, originalRange: [pre, eA - 1], mutatedRange: [pre, eB - 1] };
}

// ─── Chromosome geometry ───────────────────────────────────────────────────
// Design: clean, pill-shaped X chromosome, glossy gradient material,
// distinct mutation highlight band, gold centromere, tight sister chromatids.

const R_SEGS = 32;
const ARM_LEN = 3.2;
const R_MAX = 0.38;
const R_CENT = 0.14;
const R_TIP = 0.07;
const CHROM_X = 0.22;    // sister chromatid X-offset
const CENT_FRAC = 0.40;    // centromere at 40% from top

// Smooth radius profile for LatheGeometry
function chromProfile(nSteps = 64) {
    const pts = [];
    for (let i = 0; i <= nSteps; i++) {
        const t = i / nSteps;                        // 0=top 1=bottom
        const y = ARM_LEN - t * ARM_LEN * 2;

        // Tip taper
        const tipT = Math.min(t, 1 - t) / 0.10;
        const tipFac = Math.min(1, tipT);

        // Centromere constriction
        const centD = Math.abs(t - CENT_FRAC);
        const centFac = Math.min(1, centD / 0.12);

        const rBase = R_TIP + (R_MAX - R_TIP) * tipFac;
        const r = R_CENT + (rBase - R_CENT) * centFac;
        pts.push(new THREE.Vector2(r, y));
    }
    return pts;
}

// Build vertex color array for a LatheGeometry
// Mutation UV range guaranteed at least MIN_BAND_FRAC wide so 1bp is visible
function paintChromosome(geo, seqLen, mRange, isMutatedSide, mutType) {
    const MIN_BAND = 0.06;  // minimum visible band width as fraction of chromosome
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    const n = pos.count;
    const colors = new Float32Array(n * 3);
    const safe = Math.max(1, seqLen);
    const hasMut = mutType !== "none";

    // Expand mutation range to minimum visible size
    let uvS = hasMut && mRange ? mRange[0] / safe : 0;
    let uvE = hasMut && mRange ? mRange[1] / safe : 0;
    if (hasMut && uvE - uvS < MIN_BAND) {
        const mid = (uvS + uvE) / 2;
        uvS = Math.max(0, mid - MIN_BAND / 2);
        uvE = Math.min(1, mid + MIN_BAND / 2);
    }

    // Centromere zone
    const centS = CENT_FRAC - 0.07;
    const centE = CENT_FRAC + 0.07;

    // Mutation colors by type
    const mutColors = {
        substitution: isMutatedSide ? [1.0, 0.12, 0.26] : [1.0, 0.47, 0.10],
        deletion: isMutatedSide ? [1.0, 0.12, 0.26] : [1.0, 0.47, 0.10],
        insertion: isMutatedSide ? [0.13, 0.86, 0.65] : [1.0, 0.47, 0.10],
        duplication: isMutatedSide ? [0.13, 0.86, 0.65] : [1.0, 0.47, 0.10],
        inversion: isMutatedSide ? [0.67, 0.27, 1.0] : [1.0, 0.47, 0.10],
    };
    const mc = mutColors[mutType] || [1.0, 0.12, 0.26];

    for (let i = 0; i < n; i++) {
        const uvY = uv ? uv.getY(i) : (i / n);
        let r, g, b;

        if (uvY >= centS && uvY <= centE) {
            // Centromere: soft grey-blue
            r = 0.48; g = 0.56; b = 0.68;
        } else if (hasMut && uvY >= uvS && uvY <= uvE) {
            // Mutation band
            [r, g, b] = mc;
        } else {
            // G-banding: alternating blue tones
            const bandIdx = Math.floor(uvY * 12);
            if (bandIdx % 2 === 0) { r = 0.29; g = 0.50; b = 0.83; }  // light
            else { r = 0.17; g = 0.32; b = 0.60; }  // dark
        }

        colors[i * 3] = r; colors[i * 3 + 1] = g; colors[i * 3 + 2] = b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

// Build one complete chromosome (2 chromatids + centromere)
function buildChromosomeGroup(seqLen, mutation, isMutatedSide) {
    const group = new THREE.Group();
    const safe = Math.max(1, seqLen);
    const mRange = isMutatedSide ? mutation.mutatedRange : mutation.originalRange;
    const pts = chromProfile(64);

    for (const xSign of [-1, 1]) {
        const xOff = xSign * CHROM_X;

        // Main chromatid body
        const geo = new THREE.LatheGeometry(pts, R_SEGS);
        geo.computeVertexNormals();
        paintChromosome(geo, safe, mRange, isMutatedSide, mutation.type);

        const mat = new THREE.MeshPhongMaterial({
            vertexColors: true,
            shininess: 120,
            specular: new THREE.Color(0x99bbee),
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.x = xOff;
        group.add(mesh);

        // Specular highlight strip (inner back-face tube)
        const hlPts = pts.map(p => new THREE.Vector2(p.x * 0.28, p.y));
        const hlGeo = new THREE.LatheGeometry(hlPts, 14);
        const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, side: THREE.BackSide });
        group.add(new THREE.Mesh(hlGeo, (hlMesh => { hlMesh.position.x = xOff; return hlMat; })(new THREE.Mesh())));
        const hlMesh = new THREE.Mesh(hlGeo, hlMat);
        hlMesh.position.x = xOff;
        group.add(hlMesh);

        // Glow outline (only on mutated bands) — outer shell slightly transparent
        if (mutation.type !== "none") {
            const glowPts = pts.map(p => new THREE.Vector2(p.x * 1.06, p.y));
            const glowGeo = new THREE.LatheGeometry(glowPts, R_SEGS);
            const mutColors = { substitution: "#ff1f42", insertion: "#21dba4", duplication: "#21dba4", inversion: "#aa44ff" };
            const glowCol = mutColors[mutation.type] || "#ff1f42";
            const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(glowCol), transparent: true, opacity: 0.07, side: THREE.BackSide });
            const glowMesh = new THREE.Mesh(glowGeo, glowMat);
            glowMesh.position.x = xOff;
            group.add(glowMesh);
        }
    }

    // Centromere sphere
    const centY = ARM_LEN - CENT_FRAC * ARM_LEN * 2;
    const hasMut = mutation.type !== "none";
    const mutFracS = hasMut && mRange ? mRange[0] / safe : 0;
    const mutFracE = hasMut && mRange ? mRange[1] / safe : 0;
    // Centromere is highlighted only if mutation overlaps it
    const centHit = hasMut && mutFracS <= CENT_FRAC + 0.10 && mutFracE >= CENT_FRAC - 0.10;
    const centCol = centHit ? (isMutatedSide ? 0xff1f42 : 0xff7810) : 0xe8c97a;

    const cGeo = new THREE.SphereGeometry(0.24, 22, 16);
    const cMat = new THREE.MeshPhongMaterial({ color: centCol, shininess: 160, specular: 0xffffff });
    const cMesh = new THREE.Mesh(cGeo, cMat);
    cMesh.position.set(0, centY, 0);
    group.add(cMesh);

    // Centromere glow
    const cgGeo = new THREE.SphereGeometry(0.33, 14, 10);
    const cgMat = new THREE.MeshBasicMaterial({ color: centCol, transparent: true, opacity: 0.18, side: THREE.BackSide });
    const cgMesh = new THREE.Mesh(cgGeo, cgMat);
    cgMesh.position.set(0, centY, 0);
    group.add(cgMesh);

    return group;
}

// ─── Mount scene ──────────────────────────────────────────────────────────

function mountChromosome3D(container, { sequence, label, mutation, isMutatedSide, lang }) {
    container._gxDispose?.();
    container.innerHTML = "";
    container.style.position = "relative";

    const H = 520;
    container.style.height = H + "px";
    const W = Math.max(200, container.clientWidth || 420);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, W / H, 0.1, 100);
    camera.position.set(0, 0.4, 15);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 7;
    controls.maxDistance = 38;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.55;
    controls.enablePan = false;
    controls.target.set(0, 0.4, 0);

    // Lighting
    scene.add(new THREE.AmbientLight(0x223355, 1.4));
    const key = new THREE.DirectionalLight(0xffffff, 3.2); key.position.set(5, 8, 8); scene.add(key);
    const fill = new THREE.DirectionalLight(0x5577cc, 1.6); fill.position.set(-4, 2, 3); scene.add(fill);
    const rim = new THREE.DirectionalLight(0x88aaff, 1.0); rim.position.set(0, -5, -3); scene.add(rim);
    const pt = new THREE.PointLight(0xaaccff, 1.4, 28); pt.position.set(3, 5, 6); scene.add(pt);

    const seqLen = sequence?.length || 1;
    const group = buildChromosomeGroup(seqLen, mutation, isMutatedSide);
    group.rotation.z = 0.07;
    scene.add(group);

    // ── Overlays ──────────────────────────────────────────────────────────
    const mk = (cls, html) => {
        const d = document.createElement("div");
        d.className = cls;
        if (html !== undefined) d.innerHTML = html;
        container.appendChild(d);
        return d;
    };

    mk("gx-chrom3d-label").textContent = label;

    const hasMut = mutation.type !== "none";
    const mutColors = { substitution: "#ff1f42", insertion: "#21dba4", duplication: "#21dba4", inversion: "#aa44ff" };
    const hitColor = mutColors[mutation.type] || (isMutatedSide ? "#ff1f42" : "#ff7810");

    let legHtml = `
        <div class="gx-chrom3d-legend__row"><span class="gx-chrom3d-legend__dot" style="background:#4a7fd4"></span>${lang === "bg" ? "Хроматин" : "Chromatin"}</div>
        <div class="gx-chrom3d-legend__row"><span class="gx-chrom3d-legend__dot" style="background:#e8c97a"></span>${lang === "bg" ? "Центромер" : "Centromere"}</div>`;
    if (hasMut)
        legHtml += `<div class="gx-chrom3d-legend__row"><span class="gx-chrom3d-legend__dot" style="background:${hitColor}"></span>${lang === "bg" ? "Мутирал" : "Mutated"}</div>`;
    mk("gx-chrom3d-legend", legHtml);

    const hint = mk("gx-chrom3d-hint");
    hint.textContent = lang === "bg" ? "🖱 Завъртете" : "🖱 Drag to rotate";

    mk("gx-chrom3d-badge").textContent = seqLen + " bp";

    renderer.domElement.addEventListener("pointerdown", () => {
        controls.autoRotate = false; hint.style.opacity = "0";
    }, { passive: true });
    renderer.domElement.addEventListener("dblclick", () => { controls.autoRotate = true; hint.style.opacity = "1"; });

    let animId;
    const animate = () => { animId = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); };
    animate();

    const ro = new ResizeObserver(() => {
        const w = Math.max(1, container.clientWidth);
        camera.aspect = w / H;
        camera.updateProjectionMatrix();
        renderer.setSize(w, H);
    });
    ro.observe(container);

    container._gxDispose = () => {
        cancelAnimationFrame(animId);
        ro.disconnect();
        controls.dispose();
        scene.traverse(o => { if (o.isMesh) { o.geometry?.dispose(); o.material?.dispose(); } });
        renderer.dispose();
    };
}

// ─── Mutation info ─────────────────────────────────────────────────────────

function mutationInfoHtml(mutation, lang) {
    const bg = lang === "bg";
    const L = {
        title: bg ? "Открита мутация" : "Detected mutation",
        none: bg ? "✓ Последователностите са идентични" : "✓ Sequences are identical — no mutation",
        pos: bg ? "Позиция" : "Position", len: bg ? "Размер" : "Size",
        orig: bg ? "Оригинален сегмент" : "Original segment",
        mut: bg ? "Мутирал сегмент" : "Mutated segment",
    };
    const typeNames = {
        en: { deletion: "Deletion", insertion: "Insertion", duplication: "Duplication", inversion: "Inversion", substitution: "Substitution" },
        bg: { deletion: "Делеция", insertion: "Инсерция", duplication: "Дупликация", inversion: "Инверсия", substitution: "Заместване" },
    };
    const typeDescs = {
        en: { deletion: "Segment removed.", insertion: "New segment inserted.", duplication: "Segment duplicated.", inversion: "Segment inverted.", substitution: "Segment replaced." },
        bg: { deletion: "Сегмент е премахнат.", insertion: "Сегмент е вмъкнат.", duplication: "Сегмент е дублиран.", inversion: "Сегмент е инвертиран.", substitution: "Сегмент е заменен." },
    };
    const icons = { deletion: "🗑", insertion: "➕", duplication: "🔁", inversion: "↔️", substitution: "🔄" };
    const mutColors = { deletion: "rgba(255,31,66,.90)", insertion: "rgba(33,219,164,.90)", duplication: "rgba(33,219,164,.90)", inversion: "rgba(170,68,255,.90)", substitution: "rgba(255,31,66,.90)" };

    if (mutation.type === "none") return `<div class="gx-chromosome-info gx-chromosome-info--ok">
        <div class="gx-chromosome-info__label">${L.title}</div>
        <div class="gx-chromosome-info__value gx-chrom-ok">${L.none}</div></div>`;

    const name = (bg ? typeNames.bg : typeNames.en)[mutation.type] || mutation.type;
    const desc = (bg ? typeDescs.bg : typeDescs.en)[mutation.type] || "";
    const icon = icons[mutation.type] || "•";
    const col = mutColors[mutation.type] || "rgba(255,31,66,.90)";
    const trunc = s => s.length > 80 ? s.slice(0, 80) + "…" : s;
    const changeLen = Math.max(mutation.originalSegment?.length ?? 0, mutation.mutatedSegment?.length ?? 0);

    return `<div class="gx-chromosome-info">
        <div class="gx-chromosome-info__label">${L.title}</div>
        <div class="gx-chromosome-info__value">
            <span class="gx-chrom-type-badge" style="background:${col.replace(".90", ".15")};border-color:${col.replace(".90", ".40")};color:${col}">${icon} ${name}</span>
        </div>
        <p class="gx-chrom-type-desc">${desc}</p>
        <div class="gx-chromosome-info__meta">
            <div class="gx-chrom-meta-row"><span class="gx-chrom-meta-k">${L.pos}</span><span class="gx-chrom-meta-v">${mutation.start + 1}</span></div>
            <div class="gx-chrom-meta-row"><span class="gx-chrom-meta-k">${L.len}</span><span class="gx-chrom-meta-v">${changeLen} bp</span></div>
            <div class="gx-chrom-meta-row gx-chrom-meta-row--seq"><span class="gx-chrom-meta-k">${L.orig}</span><code class="gx-chrom-meta-seq">${trunc(mutation.originalSegment || "—")}</code></div>
            <div class="gx-chrom-meta-row gx-chrom-meta-row--seq"><span class="gx-chrom-meta-k gx-chrom-meta-k--mut">${L.mut}</span><code class="gx-chrom-meta-seq gx-chrom-meta-seq--mut">${trunc(mutation.mutatedSegment || "—")}</code></div>
        </div></div>`;
}

// ─── Export ────────────────────────────────────────────────────────────────

export function renderChromosomeAbnormalitiesCompare({
    normalMount, mutatedMount, infoMount, originalSequence, mutatedSequence
}) {
    const lang = document.documentElement.lang?.toLowerCase().startsWith("bg") ? "bg" : "en";
    const mutation = classifyMainMutation(originalSequence, mutatedSequence);

    if (normalMount) mountChromosome3D(normalMount, { sequence: originalSequence, label: lang === "bg" ? "Оригинална хромозома" : "Original chromosome", mutation, isMutatedSide: false, lang });
    if (mutatedMount) mountChromosome3D(mutatedMount, { sequence: mutatedSequence, label: lang === "bg" ? "Мутирала хромозома" : "Mutated chromosome", mutation, isMutatedSide: true, lang });
    if (infoMount) infoMount.innerHTML = mutationInfoHtml(mutation, lang);

    return mutation;
}
