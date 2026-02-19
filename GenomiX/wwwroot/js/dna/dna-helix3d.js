import * as THREE from "https://esm.sh/three@0.159.0";
import { OrbitControls } from "https://esm.sh/three@0.159.0/examples/jsm/controls/OrbitControls.js";

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function qualityForN(N) {
    if (N >= 200) return { ATOM_SEG: 6, BOND_SEG: 4, H_DASHES: 2, DETAIL_SCALE: 1.25 };
    if (N >= 100) return { ATOM_SEG: 8, BOND_SEG: 5, H_DASHES: 2, DETAIL_SCALE: 1.30 };
    return { ATOM_SEG: 10, BOND_SEG: 6, H_DASHES: 2, DETAIL_SCALE: 1.35 };
}

const GLOBAL_BASE_SCALE = 1.10;

const ELEM = {
    H: { color: 0xffffff, r: 0.045 },
    C: { color: 0x7f7f7f, r: 0.078 },
    N: { color: 0x3a74ff, r: 0.082 },
    O: { color: 0xff3a3a, r: 0.090 },
    P: { color: 0xffa024, r: 0.098 },
};

function frameObject(camera, object, controls, padding = 1.25) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    object.position.sub(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let dist = (maxDim / 2) / Math.tan(fov / 2);
    dist *= padding;

    camera.position.set(0, maxDim * 0.25, dist);
    camera.near = Math.max(0.01, dist / 100);
    camera.far = dist * 100;
    camera.updateProjectionMatrix();

    camera.lookAt(0, 0, 0);
    controls?.target?.set?.(0, 0, 0);
    controls?.update?.();
}

function makeInstancers(ATOM_SEG) {
    const inst = {};
    for (const k of Object.keys(ELEM)) {
        const g = new THREE.SphereGeometry(ELEM[k].r, ATOM_SEG, ATOM_SEG);
        const m = new THREE.MeshStandardMaterial({
            color: ELEM[k].color,
            metalness: 0.08,
            roughness: 0.35,
        });
        inst[k] = { geom: g, mat: m, mesh: null, mats: [] };
    }
    return inst;
}

function pushAtom(inst, elem, pos, scale = 1.0) {
    const it = inst[elem];
    if (!it) return;
    const o = new THREE.Object3D();
    o.position.copy(pos);
    o.scale.set(scale, scale, scale);
    o.updateMatrix();
    it.mats.push(o.matrix.clone());
}

function commitInstancers(parent, inst) {
    for (const k of Object.keys(inst)) {
        const it = inst[k];
        const count = it.mats.length || 1;

        if (it.mesh) {
            parent.remove(it.mesh);
            it.mesh.geometry.dispose?.();
            it.mesh.material.dispose?.();
            it.mesh = null;
        }

        const mesh = new THREE.InstancedMesh(it.geom, it.mat, count);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        for (let i = 0; i < count; i++) {
            mesh.setMatrixAt(i, it.mats[i] ?? new THREE.Matrix4().identity());
        }
        mesh.count = count;
        parent.add(mesh);

        it.mesh = mesh;
    }
}

let bondGeometry = null;


function cylinderBetween(a, b, radius, material) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    if (!bondGeometry) return new THREE.Group(); 

    const cyl = new THREE.Mesh(bondGeometry, material);
    cyl.scale.set(radius, len, radius);
    cyl.position.copy(a).addScaledVector(dir, 0.5);
    cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return cyl;
}

function dashedBond(a, b, radius, material, dashes) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const u = dir.clone().normalize();

    const gap = 0.10;
    const seg = (len - gap * (dashes - 1)) / dashes;

    const g = new THREE.Group();
    let start = 0;
    for (let i = 0; i < dashes; i++) {
        const p0 = a.clone().addScaledVector(u, start);
        const p1 = a.clone().addScaledVector(u, start + seg);
        g.add(cylinderBetween(p0, p1, radius, material));
        start += seg + gap;
    }
    return g;
}

function buildPentose(center, basisX, basisY, size = 0.22) {
    const pts = [];
    for (let i = 0; i < 5; i++) {
        const ang = (Math.PI * 2 * i) / 5;
        const p = center
            .clone()
            .add(basisX.clone().multiplyScalar(Math.cos(ang) * size))
            .add(basisY.clone().multiplyScalar(Math.sin(ang) * size * 0.92));
        pts.push(p);
    }
    return pts;
}

function buildPhosphate(center, basisX, basisY, basisZ, size = 0.20) {
    const P = center.clone();
    const O = [
        center.clone().add(basisX.clone().multiplyScalar(size * 1.10)),
        center.clone().add(basisX.clone().multiplyScalar(-size * 0.55)).add(basisY.clone().multiplyScalar(size * 0.95)),
        center.clone().add(basisX.clone().multiplyScalar(-size * 0.55)).add(basisY.clone().multiplyScalar(-size * 0.95)),
        center.clone().add(basisZ.clone().multiplyScalar(size * 1.15)),
    ];
    return { P, O };
}

function buildBaseRing(letter, center, basisX, basisY, size = 0.24) {
    const ring = [];
    for (let i = 0; i < 6; i++) {
        const ang = (Math.PI * 2 * i) / 6;
        ring.push(
            center
                .clone()
                .add(basisX.clone().multiplyScalar(Math.cos(ang) * size))
                .add(basisY.clone().multiplyScalar(Math.sin(ang) * size))
        );
    }

    const nIdx =
        letter === "A" ? [0, 2] :
            letter === "G" ? [1, 3] :
                letter === "C" ? [2] :
                    letter === "T" ? [1] : [];

    const atoms = [];
    for (let i = 0; i < 6; i++) atoms.push({ elem: nIdx.includes(i) ? "N" : "C", pos: ring[i] });

    if (letter === "T" || letter === "G") atoms.push({ elem: "O", pos: ring[4].clone().add(basisY.clone().multiplyScalar(size * 0.65)) });
    if (letter === "A" || letter === "C") atoms.push({ elem: "N", pos: ring[5].clone().add(basisY.clone().multiplyScalar(-size * 0.65)) });

    return { ring, atoms, attachPos: ring[0].clone() };
}

function createLegendOverlay(mount, { baseHex, enableDetail, elem }) {
    mount.querySelectorAll(".dna-legend").forEach(el => el.remove());

    const cs = getComputedStyle(mount);
    if (cs.position === "static") mount.style.position = "relative";

    const toHex = (num) => "#" + (num >>> 0).toString(16).padStart(6, "0");

    const bases = ["A", "T", "C", "G"];
    const elements = ["H", "C", "N", "O", "P"].filter(k => elem?.[k]);

    const legend = document.createElement("div");
    legend.className = "dna-legend";
    legend.innerHTML = `
        <div class="dna-legend-title">Legend</div>

        <div class="dna-legend-section">
            <div class="dna-legend-subtitle">Bases</div>
            <div class="dna-legend-row">
                ${bases.map(b => `
                    <div class="dna-legend-item">
                        <span class="dna-swatch" style="background:${toHex(baseHex[b] ?? 0xffffff)}"></span>
                        <span class="dna-label">${b}</span>
                    </div>
                `).join("")}
            </div>
        </div>

        <div class="dna-legend-section" style="margin-top:10px;">
            <div class="dna-legend-subtitle">Atoms</div>
            <div class="dna-legend-row">
                ${elements.map(k => `
                    <div class="dna-legend-item">
                        <span class="dna-swatch" style="background:${toHex(elem[k].color)}"></span>
                        <span class="dna-label">${k}</span>
                    </div>
                `).join("")}
            </div>
        </div>
    `;

    mount.appendChild(legend);

    if (!document.getElementById("dna-legend-style")) {
        const style = document.createElement("style");
        style.id = "dna-legend-style";
        style.textContent = `
            .dna-legend{
                position:absolute;
                left:12px;
                top:12px;
                z-index:10;
                padding:10px 12px;
                border-radius:12px;
                background:rgba(10,14,25,.55);
                border:1px solid rgba(255,255,255,.12);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                color:rgba(255,255,255,.92);
                font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
                user-select:none;
                pointer-events:none;
                max-width: 340px;
            }
            .dna-legend-title{
                font-size:12px;
                letter-spacing:.08em;
                text-transform:uppercase;
                opacity:.85;
                margin-bottom:8px;
            }
            .dna-legend-subtitle{
                font-size:12px;
                opacity:.78;
                margin-bottom:6px;
            }
            .dna-legend-row{
                display:flex;
                gap:10px;
                align-items:center;
                flex-wrap:wrap;
            }
            .dna-legend-item{
                display:flex;
                align-items:center;
                gap:6px;
            }
            .dna-swatch{
                width:12px;
                height:12px;
                border-radius:4px;
                box-shadow: 0 0 0 1px rgba(255,255,255,.18) inset;
            }
            .dna-label{
                font-size:13px;
                font-weight:600;
            }
        `;
        document.head.appendChild(style);
    }

    return legend;
}

function renderBasePairSVG(b1, b2, seqIndex) {
    const baseColor = { A: "#4bff88", T: "#ffd54b", C: "#4ba3ff", G: "#ff4b4b" };
    const elemColor = { H: "#ffffff", C: "#7f7f7f", N: "#3a74ff", O: "#ff3a3a", P: "#ffa024" };
    const baseName = { A: "Adenine", T: "Thymine", C: "Cytosine", G: "Guanine" };

    const chip = (k) => `
    <span style="
      display:inline-flex; align-items:center; gap:6px;
      padding:4px 8px; border-radius:999px;
      background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.10);
      font-size:12px;">
      <span style="width:10px;height:10px;border-radius:50%;background:${elemColor[k]};display:inline-block;"></span>
      ${k}
    </span>
  `;

    const nucleotide = (base, x, y) => {
        const c = baseColor[base] || "#fff";

        const phosphate = `
      <circle cx="${x + 30}" cy="${y + 40}" r="12"
        fill="rgba(255,160,36,0.14)" stroke="rgba(255,255,255,0.75)" stroke-width="1.4"/>
      <text x="${x + 24}" y="${y + 45}" fill="${elemColor.P}" font-size="12" font-weight="800">P</text>

      <circle cx="${x + 12}" cy="${y + 20}" r="8"
        fill="rgba(255,58,58,0.12)" stroke="rgba(255,255,255,0.55)" stroke-width="1.2"/>
      <text x="${x + 8}" y="${y + 25}" fill="${elemColor.O}" font-size="11" font-weight="800">O</text>

      <circle cx="${x + 12}" cy="${y + 60}" r="8"
        fill="rgba(255,58,58,0.12)" stroke="rgba(255,255,255,0.55)" stroke-width="1.2"/>
      <text x="${x + 8}" y="${y + 65}" fill="${elemColor.O}" font-size="11" font-weight="800">O</text>

      <circle cx="${x + 52}" cy="${y + 40}" r="8"
        fill="rgba(255,58,58,0.12)" stroke="rgba(255,255,255,0.55)" stroke-width="1.2"/>
      <text x="${x + 48}" y="${y + 45}" fill="${elemColor.O}" font-size="11" font-weight="800">O</text>
    `;

        const bondPS = `
      <line x1="${x + 42}" y1="${y + 40}" x2="${x + 78}" y2="${y + 80}"
        stroke="rgba(255,255,255,0.75)" stroke-width="2.2"/>
    `;

        const sugar = `
      <polygon points="
        ${x + 80},${y + 80}
        ${x + 120},${y + 62}
        ${x + 150},${y + 82}
        ${x + 140},${y + 125}
        ${x + 95},${y + 125}"
        fill="rgba(120,140,255,0.22)"
        stroke="rgba(255,255,255,0.75)"
        stroke-width="1.4"/>
    `;

        const bondSB = `
      <line x1="${x + 150}" y1="${y + 82}" x2="${x + 190}" y2="${y + 70}"
        stroke="rgba(255,255,255,0.75)" stroke-width="2.2"/>
    `;

        const ring = `
      <polygon points="
        ${x + 200},${y + 45}
        ${x + 235},${y + 65}
        ${x + 235},${y + 105}
        ${x + 200},${y + 125}
        ${x + 165},${y + 105}
        ${x + 165},${y + 65}"
        fill="rgba(255,255,255,0.03)"
        stroke="${c}"
        stroke-width="2.6"/>

      <text x="${x + 162}" y="${y + 60}" fill="${elemColor.N}" font-size="12" font-weight="900">N</text>
      <text x="${x + 232}" y="${y + 60}" fill="${elemColor.N}" font-size="12" font-weight="900">N</text>

      ${base === "T" || base === "G"
                ? `<text x="${x + 212}" y="${y + 137}" fill="${elemColor.O}" font-size="12" font-weight="900">O</text>`
                : ""}

      ${base === "A" || base === "C"
                ? `<text x="${x + 170}" y="${y + 141}" fill="${elemColor.N}" font-size="12" font-weight="900">N</text>`
                : ""}

      <text x="${x + 250}" y="${y + 90}" fill="${c}" font-size="16" font-weight="950">${base}</text>
    `;

        const label = `
      <text x="${x + 165}" y="${y + 170}" fill="${c}" font-size="14" font-weight="900">
        ${baseName[base] || base}
      </text>
    `;

        return phosphate + bondPS + sugar + bondSB + ring + label;
    };

    const hb =
        ((b1 === "A" && b2 === "T") || (b1 === "T" && b2 === "A")) ? 2 :
            ((b1 === "C" && b2 === "G") || (b1 === "G" && b2 === "C")) ? 3 : 0;

    const hbLines = hb === 0 ? "" : `
    <g stroke="rgba(255,255,255,0.65)" stroke-width="2.2" stroke-dasharray="7 6">
      ${hb >= 1 ? `<line x1="250" y1="115" x2="250" y2="235"/>` : ""}
      ${hb >= 2 ? `<line x1="230" y1="120" x2="230" y2="230"/>` : ""}
      ${hb >= 3 ? `<line x1="270" y1="120" x2="270" y2="230"/>` : ""}
    </g>
  `;

    return `
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div style="opacity:0.9;font-size:12px;">
        Index: <b>${seqIndex}</b> • Pair: <b>${b1}-${b2}</b>
      </div>

      <svg viewBox="0 0 360 420" width="100%" height="auto"
           style="border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);">
        <!-- top nucleotide -->
        <g>${nucleotide(b1, 20, 25)}</g>

        <!-- bottom nucleotide -->
        <g>${nucleotide(b2, 20, 215)}</g>

        <!-- H bonds between bases -->
        ${hbLines}
      </svg>

      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${chip("H")}${chip("C")}${chip("N")}${chip("O")}${chip("P")}
      </div>
    </div>
  `;
}

export function mountHelix3D(strand1, strand2, mount, initialIndex = null) {
    if (!mount) throw new Error("mountHelix3D: missing mount element");
    if (!mount.style.minHeight) mount.style.minHeight = "460px";

    const N = strand1.length;
    const Q = qualityForN(N);
    const ATOM_SEG = Q.ATOM_SEG;
    const BOND_SEG = Q.BOND_SEG;
    const H_DASHES = Q.H_DASHES;
    const DETAIL_SCALE = Q.DETAIL_SCALE;

    const scene = new THREE.Scene();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;

    mount.querySelectorAll("canvas").forEach(c => c.remove());
    mount.querySelectorAll(".dna-legend").forEach(el => el.remove());
    mount.querySelectorAll(".dna-detail-panel").forEach(el => el.remove());

    mount.appendChild(renderer.domElement);

    mount.style.position = mount.style.position || "relative";

    const detailPanel = document.createElement("div");
    detailPanel.className = "dna-detail-panel";
    detailPanel.style.cssText = `
      position:absolute; right:12px; top:12px;
      width:360px; max-width:calc(100% - 24px);
      background:rgba(8,12,22,0.82);
      border:1px solid rgba(255,255,255,0.10);
      border-radius:14px;
      padding:10px;
      backdrop-filter: blur(8px);
      color:#fff;
      font-family: system-ui, Segoe UI, Arial, sans-serif;
      display:none;
      z-index:20;        
      pointer-events:auto;
    `;
    mount.appendChild(detailPanel);

    function showDetailPanel(svgHtml) {
        detailPanel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;">
      <div style="font-weight:700;letter-spacing:0.2px;">Base-pair detail</div>
      <button id="bpCloseBtn" style="
        border:0; background:rgba(255,255,255,0.10); color:#fff;
        padding:6px 10px; border-radius:10px; cursor:pointer;">✕</button>
    </div>
    ${svgHtml}
  `;
        detailPanel.style.display = "block";
        detailPanel.querySelector("#bpCloseBtn")?.addEventListener("click", () => {
            detailPanel.style.display = "none";
        });
    }

    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 6000);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = true;
    controls.panSpeed = 0.55;
    controls.zoomSpeed = 1.05;
    controls.rotateSpeed = 0.85;
    renderer.domElement.style.touchAction = "none";

    scene.add(new THREE.AmbientLight(0xffffff, 0.42));
    const key = new THREE.DirectionalLight(0xffffff, 1.15); key.position.set(7, 11, 13); scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.55); fill.position.set(-10, 3, 6); scene.add(fill);
    const rim = new THREE.DirectionalLight(0x7ee6ff, 0.45); rim.position.set(0, -12, -10); scene.add(rim);

    const root = new THREE.Group();
    scene.add(root);

    bondGeometry = new THREE.CylinderGeometry(1, 1, 1, BOND_SEG);

    const globalGroup = new THREE.Group();
    const detailGroup = new THREE.Group();
    root.add(globalGroup, detailGroup);

    let rotateTimer = 0;
    const back1 = [];
    const back2 = [];
    const ENABLE_DETAIL = N <= 140;
    detailGroup.visible = ENABLE_DETAIL;

    controls.addEventListener("start", () => {
        if (ENABLE_DETAIL) detailGroup.visible = false;
    });

    controls.addEventListener("end", () => {
        if (!ENABLE_DETAIL) return;
        clearTimeout(rotateTimer);

        rotateTimer = setTimeout(() => {
            detailGroup.visible = true;
        }, 120);
    });

    const globalRungMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 0.75 });

    function makeLine(points) {
        const geom = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({ color: 0x1b2347, transparent: true, opacity: 0.55 });
        return new THREE.Line(geom, mat);
    }

    const bondMat = new THREE.MeshStandardMaterial({
        color: 0xd7e2ff,
        metalness: 0.0,
        roughness: 0.90,
        transparent: true,
        opacity: 0.62
    });

    const bondDarkMat = new THREE.MeshStandardMaterial({
        color: 0x8ea0c8,
        metalness: 0.0,
        roughness: 0.92,
        transparent: true,
        opacity: 0.72
    });

    const hBondMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.35,
        roughness: 0.95,
        metalness: 0.0
    });

    const REV = true;

    const r = 1.28 * GLOBAL_BASE_SCALE;
    const perTurn = 10.5;
    const thetaStep = (Math.PI * 2) / perTurn;
    const rise = 0.52 * GLOBAL_BASE_SCALE;
    const handedSign = -1;

    const baseHex = { A: 0xff4b4b, T: 0xffd54b, C: 0x4ba3ff, G: 0x4bff88 };
    const baseGeom = new THREE.SphereGeometry(0.18 * GLOBAL_BASE_SCALE, 16, 16);
    const rungGeom = new THREE.CylinderGeometry(0.055 * GLOBAL_BASE_SCALE, 0.055 * GLOBAL_BASE_SCALE, 2 * r, 12);
    createLegendOverlay(mount, { baseHex, enableDetail: ENABLE_DETAIL, elem: ELEM });

    const baseMeshes1 = [];
    const baseMeshes2 = [];
    const rungMeshes = [];
    const rungBaseOpacity = [];

    let onPick = null;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    renderer.domElement.addEventListener("pointerdown", (e) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects([...baseMeshes1, ...baseMeshes2], false);
        if (!hits.length) return;

        const vi = hits[0].object?.userData?.vi;
        if (!Number.isFinite(vi)) return;

        const seqIndex = REV ? (N - 1 - vi) : vi;
        const b1 = strand1[seqIndex];
        const b2 = strand2[seqIndex];

        showDetailPanel(renderBasePairSVG(b1, b2, seqIndex));
        onPick?.(seqIndex);
    });

    for (let vi = 0; vi < N; vi++) {
        const si = REV ? (N - 1 - vi) : vi;
        const ang = handedSign * vi * thetaStep;
        const z = vi * rise;

        const x1 = r * Math.cos(ang), y1 = r * Math.sin(ang);
        const x2 = -x1, y2 = -y1;

        const b1 = strand1[si], b2 = strand2[si];

        const m1 = new THREE.Mesh(baseGeom, new THREE.MeshStandardMaterial({
            color: baseHex[b1] ?? 0xffffff, metalness: 0.05, roughness: 0.35, emissive: 0x000000, emissiveIntensity: 0
        }));
        const m2 = new THREE.Mesh(baseGeom, new THREE.MeshStandardMaterial({
            color: baseHex[b2] ?? 0xffffff, metalness: 0.05, roughness: 0.35, emissive: 0x000000, emissiveIntensity: 0
        }));

        m1.position.set(x1, y1, z);
        m2.position.set(x2, y2, z);
        m1.userData.vi = vi;
        m2.userData.vi = vi;

        globalGroup.add(m1, m2);
        baseMeshes1.push(m1);
        baseMeshes2.push(m2);
        back1.push(m1.position.clone());
        back2.push(m2.position.clone());

        const baseOp =
            ((b1 === "A" && b2 === "T") || (b1 === "T" && b2 === "A")) ? 0.50 :
                ((b1 === "C" && b2 === "G") || (b1 === "G" && b2 === "C")) ? 0.85 : 0.20;

        const rung = new THREE.Mesh(rungGeom, globalRungMat.clone());
        rung.material.opacity = baseOp;

        const mid = new THREE.Vector3().addVectors(m1.position, m2.position).multiplyScalar(0.5);
        rung.position.copy(mid);
        rung.lookAt(m2.position);
        rung.rotateX(Math.PI / 2);

        globalGroup.add(rung);
        rungMeshes.push(rung);
        rungBaseOpacity.push(baseOp);
    }

    const line1 = makeLine(back1);
    const line2 = makeLine(back2);
    globalGroup.add(line1, line2);

    const beadGeom = new THREE.SphereGeometry(0.11 * GLOBAL_BASE_SCALE, 14, 14);
    const beadMat = new THREE.MeshStandardMaterial({ color: 0xffa024, metalness: 0.08, roughness: 0.35 });
    const beads = new THREE.InstancedMesh(beadGeom, beadMat, N * 2);
    beads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const tmp = new THREE.Object3D();
    let beadCount = 0;
    for (let i = 0; i < N; i++) {
        tmp.position.copy(back1[i]); tmp.updateMatrix(); beads.setMatrixAt(beadCount++, tmp.matrix);
        tmp.position.copy(back2[i]); tmp.updateMatrix(); beads.setMatrixAt(beadCount++, tmp.matrix);
    }
    beads.count = beadCount;
    globalGroup.add(beads);

    let detailInst = null;

    if (ENABLE_DETAIL) {
        detailInst = makeInstancers(ATOM_SEG);
        const zAxis = new THREE.Vector3(0, 0, 1);

        function makeBackbonePoints(a, ang, isStrand2, scale) {
            const out = a.clone().setZ(0).normalize();
            const tan = new THREE.Vector3(-Math.sin(ang), Math.cos(ang), 0).normalize();
            const tanS = isStrand2 ? tan.clone().negate() : tan;

            const sugarCenter = a.clone().addScaledVector(out, 0.34 * scale);

            const phosphateCenter = a.clone()
                .addScaledVector(out, 0.70 * scale)
                .addScaledVector(tanS, 0.22 * scale);

            const sugarBasisY = out.clone().cross(zAxis).normalize();
            const sugarRing = buildPentose(sugarCenter, tanS, sugarBasisY, 0.22 * scale);

            const ph = buildPhosphate(phosphateCenter, tanS, sugarBasisY, out, 0.26 * scale);

            return { out, tanS, sugarCenter, sugarRing, ph };
        }

        function addPO4(ph, scale) {
            pushAtom(detailInst, "P", ph.P, 1.0);
            for (const o of ph.O) pushAtom(detailInst, "O", o, 1.0);

            for (const o of ph.O) {
                detailGroup.add(cylinderBetween(ph.P, o, 0.014 * scale, bondMat));
            }
        }

        function addSugar(sugarRing, scale) {
            for (const p of sugarRing) pushAtom(detailInst, "C", p, 1.0);
            for (let i = 0; i < 5; i++) {
                detailGroup.add(cylinderBetween(sugarRing[i], sugarRing[(i + 1) % 5], 0.016 * scale, bondDarkMat));
            }
        }

        function addSugarToPhosphate(sugarRing, ph, scale) {
            detailGroup.add(cylinderBetween(sugarRing[3], ph.P, 0.016 * scale, bondDarkMat));
        }

        function addPhosphateToNextSugar(ph, nextSugarRing, scale) {
            detailGroup.add(cylinderBetween(ph.P, nextSugarRing[1], 0.015 * scale, bondDarkMat));
        }

        function addBase(letter, baseCenter, tan, out, sugarRing, scale) {
            const baseBasisY = out.clone().cross(zAxis).normalize();
            const base = buildBaseRing(letter, baseCenter, tan, baseBasisY, 0.28 * scale);
            for (const at of base.atoms) pushAtom(detailInst, at.elem, at.pos, 1.0);

            for (let i = 0; i < 6; i += 2) {
                detailGroup.add(cylinderBetween(base.ring[i], base.ring[(i + 1) % 6], 0.013 * scale, bondMat));
            }
            detailGroup.add(cylinderBetween(base.attachPos, sugarRing[0], 0.014 * scale, bondMat));

            return base;
        }

        const scale = DETAIL_SCALE;

        const strand1Nodes = [];
        const strand2Nodes = [];

        for (let seq = 0; seq < N; seq++) {
            const vi = REV ? (N - 1 - seq) : seq;
            const ang = handedSign * vi * thetaStep;

            const a1 = baseMeshes1[vi].position.clone();
            const a2 = baseMeshes2[vi].position.clone();

            const n1 = makeBackbonePoints(a1, ang, false, scale);
            const n2 = makeBackbonePoints(a2, ang, true, scale);

            strand1Nodes.push(n1);
            strand2Nodes.push(n2);

            addSugar(n1.sugarRing, scale);
            addSugar(n2.sugarRing, scale);

            addPO4(n1.ph, scale);
            addPO4(n2.ph, scale);

            addSugarToPhosphate(n1.sugarRing, n1.ph, scale);
            addSugarToPhosphate(n2.sugarRing, n2.ph, scale);

            const out1 = n1.out;
            const out2 = n2.out;

            const baseC1 = a1.clone().addScaledVector(out1, -0.40 * scale);
            const baseC2 = a2.clone().addScaledVector(out2, -0.40 * scale);

            const b1 = strand1[seq];
            const b2 = strand2[seq];

            const base1 = addBase(b1, baseC1, n1.tanS, out1, n1.sugarRing, scale);
            const base2 = addBase(b2, baseC2, n2.tanS, out2, n2.sugarRing, scale);

            const hb =
                ((b1 === "A" && b2 === "T") || (b1 === "T" && b2 === "A")) ? 2 :
                    ((b1 === "C" && b2 === "G") || (b1 === "G" && b2 === "C")) ? 3 : 0;

            if (hb > 0) {
                const aPts = [base1.ring[2], base1.ring[4], base1.ring[0]];
                const bPts = [base2.ring[2], base2.ring[4], base2.ring[0]];
                for (let k = 0; k < hb; k++) {
                    detailGroup.add(dashedBond(aPts[k], bPts[k], 0.010 * scale, hBondMat, H_DASHES));
                }
            }
        }

        for (let i = 0; i < N - 1; i++) {
            addPhosphateToNextSugar(strand1Nodes[i].ph, strand1Nodes[i + 1].sugarRing, scale);
            addPhosphateToNextSugar(strand2Nodes[i].ph, strand2Nodes[i + 1].sugarRing, scale);
        }

        commitInstancers(detailGroup, detailInst);
    } else {
        detailGroup.visible = false;
    }

    const ringGeom = new THREE.TorusGeometry(0.42 * GLOBAL_BASE_SCALE, 0.024 * GLOBAL_BASE_SCALE, 16, 56);

    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.90 });
    const ring1 = new THREE.Mesh(ringGeom, ringMat);
    const ring2 = new THREE.Mesh(ringGeom, ringMat);
    ring1.visible = ring2.visible = false;
    root.add(ring1, ring2);

    const hoverRingMat = new THREE.MeshBasicMaterial({ color: 0x7ee6ff, transparent: true, opacity: 0.85 });
    const hoverRing1 = new THREE.Mesh(ringGeom.clone(), hoverRingMat);
    const hoverRing2 = new THREE.Mesh(ringGeom.clone(), hoverRingMat);
    hoverRing1.visible = hoverRing2.visible = false;
    root.add(hoverRing1, hoverRing2);

    frameObject(camera, root, controls, 1.35);
    controls.minDistance = 0.6;
    controls.maxDistance = 200;
    controls.update();

    let Z_MIN = 0;
    let Z_MAX = 0;

    function computeZRange() {
        Z_MIN = Infinity;
        Z_MAX = -Infinity;
        for (let i = 0; i < baseMeshes1.length; i++) {
            const z = baseMeshes1[i].position.z;
            if (z < Z_MIN) Z_MIN = z;
            if (z > Z_MAX) Z_MAX = z;
        }
        if (!Number.isFinite(Z_MIN) || !Number.isFinite(Z_MAX)) {
            Z_MIN = 0;
            Z_MAX = 0;
        }
    }
    computeZRange();

    const clampZ = (z) => clamp(z, Z_MIN, Z_MAX);

    let hoverIndex = -1;
    function clearHover(i) {
        if (i < 0) return;
        const a = baseMeshes1[i], b = baseMeshes2[i];
        if (a) { a.scale.setScalar(1); a.material.emissive.setHex(0); a.material.emissiveIntensity = 0; }
        if (b) { b.scale.setScalar(1); b.material.emissive.setHex(0); b.material.emissiveIntensity = 0; }
    }
    function setHover(i) {
        if (i === hoverIndex) return;
        clearHover(hoverIndex);
        hoverIndex = i;
        if (hoverIndex < 0) { hoverRing1.visible = hoverRing2.visible = false; return; }
        const a = baseMeshes1[hoverIndex], b = baseMeshes2[hoverIndex];
        a.scale.setScalar(1.18); b.scale.setScalar(1.18);
        a.material.emissive.setHex(0xffffff); b.material.emissive.setHex(0xffffff);
        a.material.emissiveIntensity = 0.28; b.material.emissiveIntensity = 0.28;
        hoverRing1.position.copy(a.position);
        hoverRing2.position.copy(b.position);
        hoverRing1.visible = hoverRing2.visible = true;
    }

    renderer.domElement.addEventListener("pointermove", (e) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        raycaster.setFromCamera(mouse, camera);
        const hits = raycaster.intersectObjects([...baseMeshes1, ...baseMeshes2], false);
        if (!hits.length) return setHover(-1);
        const vi = hits[0].object?.userData?.vi;
        setHover(Number.isFinite(vi) ? vi : -1);
    });

    let active = -1;
    let desiredZ = 0;
    let ringPulse = 1.0;
    const one = new THREE.Vector3(1, 1, 1);

    renderer.domElement.addEventListener("wheel", (e) => {
        const useHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
        const wantsScrollDNA = useHorizontal || e.shiftKey;
        if (!wantsScrollDNA) return;
        e.preventDefault();

        const raw = useHorizontal ? e.deltaX : e.deltaY;
        const dir = raw > 0 ? 1 : -1;
        const stepBases = e.ctrlKey ? 6 : 1;

        desiredZ = clampZ(desiredZ + dir * stepBases * rise);
        const vi = Math.round(desiredZ / rise);
        setActiveImmediate(clamp(vi, 0, N - 1));
    }, { passive: false });

    function focusZOfVisualIndex(vi) {
        return baseMeshes1[vi]?.position?.z ?? 0;
    }

    function setActiveImmediate(vi) {
        if (vi < 0 || vi >= N) return;

        if (active >= 0) {
            baseMeshes1[active].scale.set(1, 1, 1);
            baseMeshes2[active].scale.set(1, 1, 1);
            baseMeshes1[active].material.emissive.setHex(0x000000);
            baseMeshes2[active].material.emissive.setHex(0x000000);
            baseMeshes1[active].material.emissiveIntensity = 0;
            baseMeshes2[active].material.emissiveIntensity = 0;
            rungMeshes[active].material.opacity = rungBaseOpacity[active];
        }

        active = vi;

        baseMeshes1[vi].scale.set(1.45, 1.45, 1.45);
        baseMeshes2[vi].scale.set(1.45, 1.45, 1.45);
        baseMeshes1[vi].material.emissive.setHex(0xffffff);
        baseMeshes2[vi].material.emissive.setHex(0xffffff);
        baseMeshes1[vi].material.emissiveIntensity = 0.38;
        baseMeshes2[vi].material.emissiveIntensity = 0.38;

        rungMeshes[vi].material.opacity = Math.min(1, rungBaseOpacity[vi] * 1.6);

        ring1.position.copy(baseMeshes1[vi].position);
        ring2.position.copy(baseMeshes2[vi].position);
        ring1.visible = ring2.visible = true;
        ringPulse = 1.85;

        const seqIndex = REV ? (N - 1 - vi) : vi;
    }

    function toIndex(seqIndex) {
        const vi = REV ? (N - 1 - seqIndex) : seqIndex;
        if (vi < 0 || vi >= N) return;
        desiredZ = clampZ(focusZOfVisualIndex(vi));
        setActiveImmediate(vi);
    }

    function resize() {
        const w = Math.max(mount.clientWidth, 320);
        const h = Math.max(mount.clientHeight, 280);
        renderer.setPixelRatio(1);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }

    resize();
    window.addEventListener("resize", resize);
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    const start = (initialIndex != null) ? Math.max(0, Math.min(N - 1, initialIndex)) : Math.floor(N / 2);
    const startVi = REV ? (N - 1 - start) : start;
    desiredZ = clampZ(focusZOfVisualIndex(startVi));
    setActiveImmediate(startVi);
    controls.target.z = desiredZ;
    controls.update();

    let running = true;
    let rafId = 0;

    function animate() {
        if (!running) return;
        rafId = requestAnimationFrame(animate);

        controls.target.z = THREE.MathUtils.lerp(controls.target.z, desiredZ, 0.18);
        controls.update();

        if (ring1.visible) {
            ringPulse = THREE.MathUtils.lerp(ringPulse, 1.0, 0.15);
            ring1.scale.lerp(one.clone().multiplyScalar(ringPulse), 0.25);
            ring2.scale.copy(ring1.scale);
            ringMat.opacity = THREE.MathUtils.lerp(ringMat.opacity, 0.82, 0.12);

            ring1.lookAt(camera.position);
            ring2.lookAt(camera.position);
        }

        hoverRing1.lookAt(camera.position);
        hoverRing2.lookAt(camera.position);

        renderer.render(scene, camera);
    }
    animate();

    function refresh() { resize(); renderer.render(scene, camera); }
    function pause() { }
    function resume() { }

    function dispose() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        ro.disconnect();
        window.removeEventListener("resize", resize);

        bondGeometry?.dispose?.();
        bondGeometry = null;

        if (detailInst) {
            for (const k of Object.keys(detailInst)) {
                const it = detailInst[k];
                it.mesh?.geometry?.dispose?.();
                it.mesh?.material?.dispose?.();
                it.geom?.dispose?.();
                it.mat?.dispose?.();
            }
        }

        root.traverse((obj) => {
            if (!obj) return;
            if (obj.geometry) obj.geometry.dispose?.();
            if (obj.material) {
                const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                for (const m of mats) m?.dispose?.();
            }
        });

        renderer.dispose();
        renderer.forceContextLoss?.();

        mount.querySelectorAll(".dna-legend").forEach(el => el.remove());
        mount.querySelectorAll(".dna-detail-panel").forEach(el => el.remove());

        mount.innerHTML = "";
        mount.querySelectorAll(".dna-legend").forEach(el => el.remove());
    }

    return {
        toIndex, refresh, pause, resume, dispose,
        onPick: (fn) => { onPick = fn; },
        fit: () => frameObject(camera, root, controls, 1.35),
    };
}