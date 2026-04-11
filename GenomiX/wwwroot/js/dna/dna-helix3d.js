import * as THREE from "https://esm.sh/three@0.159.0";
import { OrbitControls } from "https://esm.sh/three@0.159.0/examples/jsm/controls/OrbitControls.js";

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function qualityForN(N) {
    if (N >= 200) return { ATOM_SEG: 6, BOND_SEG: 4, H_DASHES: 2, DETAIL_SCALE: 1.25 };
    if (N >= 100) return { ATOM_SEG: 8, BOND_SEG: 5, H_DASHES: 2, DETAIL_SCALE: 1.30 };
    return { ATOM_SEG: 10, BOND_SEG: 6, H_DASHES: 2, DETAIL_SCALE: 1.35 };
}

function createLegendOverlay(mount, { baseHex, enableDetail, elem }) {
    mount.querySelectorAll('.dna-legend[data-gx="1"]').forEach(el => el.remove());

    const cs = getComputedStyle(mount);
    if (cs.position === "static") mount.style.position = "relative";

    const toHex = (num) => "#" + (num >>> 0).toString(16).padStart(6, "0");

    const bases = ["A", "T", "C", "G"];
    const elements = ["H", "C", "N", "O", "P"].filter(k => elem?.[k]);

    const legend = document.createElement("div");
    legend.className = "dna-legend";
    legend.dataset.gx = "1";

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

const GLOBAL_BASE_SCALE = 1.10;

const ELEM = {
    H: { color: 0xffffff, r: 0.055 },
    C: { color: 0x2b2b2b, r: 0.090 },
    N: { color: 0x2f52ff, r: 0.095 },
    O: { color: 0xff3030, r: 0.100 },
    P: { color: 0xffd000, r: 0.115 },
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

    camera.position.add(new THREE.Vector3(0.0, 0.25, 0.0));
    camera.lookAt(0, 0, 0);

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
let detailPanel = null;
let detailModal = null;
let detailBackdrop = null;
let escHandler = null;

function mountBasePairPreview3D(hostEl, { b1, b2, hb, baseHex, ELEM }) {
    if (!hostEl) return null;

    let paused = false;
    function pause() { paused = true; }
    function resume() { paused = false; }

    hostEl.innerHTML = "";
    hostEl.style.position = hostEl.style.position || "relative";

    const scene = new THREE.Scene();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    hostEl.appendChild(renderer.domElement);
    createLegendOverlay(hostEl, { baseHex, enableDetail: true, elem: ELEM });

    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 2000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 1.0;
    renderer.domElement.style.touchAction = "none";

    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const key = new THREE.DirectionalLight(0xffffff, 1.15); key.position.set(6, 10, 10); scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.55); fill.position.set(-8, 3, 6); scene.add(fill);
    const rim = new THREE.DirectionalLight(0x7ee6ff, 0.35); rim.position.set(0, -10, -8); scene.add(rim);

    const group = new THREE.Group();
    scene.add(group);

    const bondMat = new THREE.MeshStandardMaterial({
        color: 0xd7e2ff,
        metalness: 0.0,
        roughness: 0.90,
        transparent: true,
        opacity: 0.65
    });

    const bondDarkMat = new THREE.MeshStandardMaterial({
        color: 0x8ea0c8,
        metalness: 0.0,
        roughness: 0.92,
        transparent: true,
        opacity: 0.82
    });

    const hBondMat = new THREE.MeshStandardMaterial({
        color: 0xff4b4b,
        transparent: true,
        opacity: 0.85,
        roughness: 0.95,
        metalness: 0.0
    });

    const leftC = new THREE.Vector3(-0.85, 0, 0);
    const rightC = new THREE.Vector3(+0.85, 0, 0);

    const basisX_L = new THREE.Vector3(0, 1, 0);
    const basisY_L = new THREE.Vector3(0, 0, 1);

    const basisX_R = new THREE.Vector3(0, -1, 0);
    const basisY_R = new THREE.Vector3(0, 0, 1);

    if (!bondGeometry) bondGeometry = new THREE.CylinderGeometry(1, 1, 1, 10);

    function atomMesh(el) {
        const r = (ELEM?.[el]?.r ?? 0.09) * 1.15;
        const g = new THREE.SphereGeometry(r, 18, 18);
        const m = new THREE.MeshStandardMaterial({
            color: ELEM?.[el]?.color ?? 0xffffff,
            metalness: 0.08,
            roughness: 0.35
        });
        return new THREE.Mesh(g, m);
    }

    function addBond(a, b, radius, mat) {
        group.add(cylinderBetween(a, b, radius, mat));
    }

    function addDoubleBond(a, b, radius, mat, off = 0.02) {
        const dir = new THREE.Vector3().subVectors(b, a);
        const len = dir.length() || 1;
        const u = dir.clone().multiplyScalar(1 / len);
        const n = new THREE.Vector3().crossVectors(u, new THREE.Vector3(1, 0, 0));
        if (n.lengthSq() < 1e-6) n.crossVectors(u, new THREE.Vector3(0, 1, 0));
        n.normalize().multiplyScalar(off);

        addBond(a.clone().add(n), b.clone().add(n), radius, mat);
        addBond(a.clone().sub(n), b.clone().sub(n), radius, mat);
    }

    function makeBase(letter, center, bx, by, mirror = 1, scale = 0.33) {
        const t = baseTemplate(letter);
        const atoms = t.atoms.map(a => {
            const p = center.clone()
                .add(bx.clone().multiplyScalar(a.x * scale * mirror))
                .add(by.clone().multiplyScalar(a.y * scale));
            return { elem: a.e, pos: p };
        });

        const meshes = atoms.map(at => {
            const m = atomMesh(at.elem);
            m.position.copy(at.pos);
            group.add(m);
            return m;
        });

        for (const bd of t.bonds) {
            const a = atoms[bd[0]].pos;
            const b = atoms[bd[1]].pos;
            const order = bd[2] ?? 1;
            const rad = 0.014;
            if (order === 2) addDoubleBond(a, b, rad, bondDarkMat, 0.018);
            else addBond(a, b, rad, bondMat);
        }

        const anchors = {};
        for (const k of Object.keys(t.anchors || {})) {
            const idx = t.anchors[k];
            anchors[k] = atoms[idx]?.pos?.clone?.() ?? null;
        }

        return { atoms, meshes, anchors };
    }

    function stubBackbone(sideCenter, dir, flip = 1) {
        const sugar = sideCenter.clone().addScaledVector(dir, 0.62);
        const phos = sideCenter.clone().addScaledVector(dir, 1.05).add(new THREE.Vector3(0, 0.20 * flip, 0));

        const s = atomMesh("C"); s.position.copy(sugar); group.add(s);

        const p = atomMesh("P"); p.position.copy(phos); group.add(p);
        const o1 = atomMesh("O"); o1.position.copy(phos.clone().add(new THREE.Vector3(0.16, 0.10, 0))); group.add(o1);
        const o2 = atomMesh("O"); o2.position.copy(phos.clone().add(new THREE.Vector3(-0.12, -0.14, 0))); group.add(o2);
        const o3 = atomMesh("O"); o3.position.copy(phos.clone().add(new THREE.Vector3(-0.10, 0.14, 0.10))); group.add(o3);

        addBond(sideCenter, sugar, 0.014, bondMat);
        addBond(sugar, phos, 0.014, bondMat);
        addBond(phos, o1.position, 0.012, bondDarkMat);
        addBond(phos, o2.position, 0.012, bondDarkMat);
        addBond(phos, o3.position, 0.012, bondDarkMat);

        return { sugar, phos };
    }

    const backL = stubBackbone(leftC, new THREE.Vector3(-1, 0, 0), 1);
    const backR = stubBackbone(rightC, new THREE.Vector3(1, 0, 0), -1);

    const baseL = makeBase(b1, leftC, basisX_L, basisY_L, 1, 0.34);
    const baseR = makeBase(b2, rightC, basisX_R, basisY_R, 1, 0.34);

    addBond(backL.sugar, baseL.anchors.attach, 0.014, bondMat);
    addBond(backR.sugar, baseR.anchors.attach, 0.014, bondMat);

    const hbPairs = hbondPairs(b1, b2);
    for (const p of hbPairs) {
        const a = baseL.anchors[p[0]];
        const b = baseR.anchors[p[1]];
        if (!a || !b) continue;
        group.add(dashedBond(a, b, 0.010, hBondMat, 6));
    }

    frameObject(camera, group, controls, 1.65);
    controls.minDistance = 0.35;
    controls.maxDistance = 20;
    controls.update();

    function resize() {
        const w = Math.max(hostEl.clientWidth, 280);
        const h = Math.max(hostEl.clientHeight, 260);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(hostEl);

    let raf = 0;
    let running = true;
    const spin = { t: 0 };

    const loop = () => {
        if (!running) return;
        raf = requestAnimationFrame(loop);

        if (!paused) {
            spin.t += 0.008;
            group.rotation.y = Math.sin(spin.t) * 0.25;
            group.rotation.x = Math.cos(spin.t * 0.7) * 0.08;
        }

        controls.update();
        renderer.render(scene, camera);
    };

    loop();

    function dispose() {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        ro.disconnect();

        scene.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose?.();
            if (obj.material) {
                const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                for (const m of mats) m?.dispose?.();
            }
        });

        renderer.dispose();
        renderer.forceContextLoss?.();
        renderer.domElement?.remove();
        hostEl.innerHTML = "";
    }

    return { dispose, resize, pause, resume };
}

function baseTemplate(letter) {
    const A = {
        atoms: [
            { e: "N", x: -1.05, y: 0.75 },
            { e: "C", x: -0.55, y: 1.10 },
            { e: "N", x: 0.05, y: 0.95 },
            { e: "C", x: 0.55, y: 0.55 },
            { e: "C", x: 0.45, y: -0.05 },
            { e: "N", x: -0.05, y: -0.35 },
            { e: "C", x: -0.65, y: -0.05 },
            { e: "C", x: -0.95, y: 0.35 },
            { e: "N", x: 0.95, y: 0.85 },
            { e: "H", x: 1.35, y: 1.05 },
            { e: "H", x: 1.35, y: 0.65 },
            { e: "H", x: -1.25, y: 0.95 },
            { e: "N", x: 0.10, y: -0.95 },
            { e: "H", x: 0.10, y: -1.35 },
            { e: "H", x: -0.35, y: -1.10 }
        ],
        bonds: [
            [0, 1, 1], [1, 2, 2], [2, 3, 1], [3, 4, 2], [4, 5, 1], [5, 6, 2], [6, 7, 1], [7, 0, 2],
            [2, 8, 1], [8, 9, 1], [8, 10, 1], [0, 11, 1],
            [5, 12, 1], [12, 13, 1], [12, 14, 1]
        ],
        anchors: { attach: 6, hb1: 8, hb2: 2 }
    };

    const T = {
        atoms: [
            { e: "N", x: -0.95, y: 0.75 },
            { e: "C", x: -0.35, y: 1.05 },
            { e: "O", x: 0.10, y: 1.45 },
            { e: "C", x: 0.35, y: 0.55 },
            { e: "C", x: 0.25, y: -0.10 },
            { e: "O", x: -0.20, y: -0.55 },
            { e: "N", x: -0.75, y: -0.25 },
            { e: "H", x: -0.95, y: -0.65 },
            { e: "C", x: 0.95, y: 0.85 },
            { e: "H", x: 1.35, y: 1.05 },
            { e: "H", x: 1.35, y: 0.65 },
            { e: "H", x: 0.95, y: 1.25 }
        ],
        bonds: [
            [0, 1, 1], [1, 3, 2], [3, 4, 1], [4, 6, 2], [6, 0, 1],
            [1, 2, 2], [4, 5, 2], [6, 7, 1],
            [3, 8, 1], [8, 9, 1], [8, 10, 1], [8, 11, 1]
        ],
        anchors: { attach: 0, hb1: 2, hb2: 7 }
    };

    const G = {
        atoms: [
            { e: "N", x: -1.05, y: 0.75 },
            { e: "C", x: -0.55, y: 1.10 },
            { e: "N", x: 0.05, y: 0.95 },
            { e: "C", x: 0.55, y: 0.55 },
            { e: "O", x: 0.95, y: 0.25 },
            { e: "C", x: 0.45, y: -0.05 },
            { e: "N", x: -0.05, y: -0.35 },
            { e: "C", x: -0.65, y: -0.05 },
            { e: "C", x: -0.95, y: 0.35 },
            { e: "N", x: 0.10, y: -0.95 },
            { e: "H", x: 0.10, y: -1.35 },
            { e: "N", x: 1.05, y: 0.95 },
            { e: "H", x: 1.45, y: 1.10 },
            { e: "H", x: 1.45, y: 0.80 },
            { e: "H", x: -1.25, y: 0.95 }
        ],
        bonds: [
            [0, 1, 1], [1, 2, 2], [2, 3, 1], [3, 5, 2], [5, 6, 1], [6, 7, 2], [7, 8, 1], [8, 0, 2],
            [3, 4, 2], [2, 11, 1], [11, 12, 1], [11, 13, 1], [6, 9, 1], [9, 10, 1], [0, 14, 1]
        ],
        anchors: { attach: 7, hb1: 4, hb2: 11, hb3: 10 }
    };

    const C = {
        atoms: [
            { e: "N", x: -0.95, y: 0.75 },
            { e: "C", x: -0.35, y: 1.05 },
            { e: "N", x: 0.25, y: 0.85 },
            { e: "C", x: 0.35, y: 0.25 },
            { e: "C", x: 0.10, y: -0.30 },
            { e: "O", x: -0.25, y: -0.75 },
            { e: "C", x: -0.70, y: -0.20 },
            { e: "N", x: 0.85, y: 1.05 },
            { e: "H", x: 1.25, y: 1.20 },
            { e: "H", x: 1.25, y: 0.85 },
            { e: "H", x: -1.15, y: 0.95 }
        ],
        bonds: [
            [0, 1, 1], [1, 2, 2], [2, 3, 1], [3, 4, 2], [4, 6, 1], [6, 0, 2],
            [4, 5, 2], [2, 7, 1], [7, 8, 1], [7, 9, 1], [0, 10, 1]
        ],
        anchors: { attach: 6, hb1: 10, hb2: 2, hb3: 5 }
    };

    if (letter === "A") return A;
    if (letter === "T") return T;
    if (letter === "G") return G;
    return C;
}

function hbondPairs(L, R) {
    const canonical =
        (L === "A" && R === "T") || (L === "T" && R === "A") ||
        (L === "G" && R === "C") || (L === "C" && R === "G");

    if (!canonical) return [];

    if ((L === "A" && R === "T") || (L === "T" && R === "A")) {
        if (L === "A") return [["hb1", "hb1"], ["hb2", "hb2"]];
        return [["hb1", "hb1"], ["hb2", "hb2"]];
    }

    if ((L === "G" && R === "C") || (L === "C" && R === "G")) {
        if (L === "G") return [["hb1", "hb1"], ["hb2", "hb2"], ["hb3", "hb3"]];
        return [["hb1", "hb1"], ["hb2", "hb2"], ["hb3", "hb3"]];
    }

    return [];
}

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

export function mountHelix3D(strand1, strand2, mount, initialIndex = null, opts = {}) {
    const SHOW_DETAIL_PANEL = opts?.detailPanel !== false;
    const mutatedSet = new Set(opts?.mutatedIndices || []);

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
    mount.querySelectorAll('.dna-legend[data-gx="1"]').forEach(el => el.remove());
    mount.querySelectorAll('.dna-detail-panel[data-gx="1"]').forEach(el => el.remove());

    mount.appendChild(renderer.domElement);

    mount.style.position = mount.style.position || "relative";

    let bpPreview = null;

    function renderBasePairSVG(b1, b2, seqIndex) {
        return gxPairSVG(b1, b2, seqIndex);
    }

    function gxPairSVG(b1, b2, seqIndex) {
        const canonical =
            (b1 === "A" && b2 === "T") || (b1 === "T" && b2 === "A") ||
            (b1 === "G" && b2 === "C") || (b1 === "C" && b2 === "G");

        const hb =
            ((b1 === "A" && b2 === "T") || (b1 === "T" && b2 === "A")) ? 2 :
                ((b1 === "G" && b2 === "C") || (b1 === "C" && b2 === "G")) ? 3 : 0;

        let L = b1, R = b2;
        if (canonical) {
            if (b1 === "T" && b2 === "A") { L = "A"; R = "T"; }
            if (b1 === "C" && b2 === "G") { L = "G"; R = "C"; }
        }

        const W = 1100, H = 520;

        let inner = "";
        if (L === "A" && R === "T") inner = svgAT();
        else if (L === "G" && R === "C") inner = svgGC();
        else inner = svgNonCanonical(L, R);

        return `
          <div class="gx-comp">
            <svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" class="gx-chem" aria-label="Base pair complementarity diagram">
              ${gxDefs()}
              <rect x="18" y="18" width="${W - 36}" height="${H - 36}" rx="20"
                    fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.10)"/>
              ${inner}
            </svg>
          </div>
          `;
    }

    function gxDefs() {
        return `
  <defs>
    <filter id="gxShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="16" stdDeviation="16" flood-color="rgba(0,0,0,0.55)"/>
    </filter>

    <style>
      .gxRing { stroke: rgba(0,0,0,.90); stroke-width: 8; stroke-linejoin: round; }
      .gxBond { stroke: rgba(0,0,0,.80); stroke-width: 5; stroke-linecap: round; }
      .gxBond2 { stroke: rgba(0,0,0,.65); stroke-width: 4; stroke-linecap: round; }

      .gxTxt {
        font-family: system-ui, Segoe UI, Arial;
        font-weight: 950;
        font-size: 30px;
        paint-order: stroke;
        stroke: rgba(0,0,0,.65);
        stroke-width: 10px;
      }
      .gxRed { fill: #ff4b4b; }
      .gxBlk { fill: rgba(255,255,255,.95); }

      .gxHB { stroke: #ff4b4b; stroke-width: 7; stroke-dasharray: 2 14; stroke-linecap: round; opacity: .95; }

      .gxName {
        font-family: system-ui, Segoe UI, Arial;
        font-size: 44px;
        font-weight: 950;
        fill: rgba(255,255,255,.92);
        paint-order: stroke;
        stroke: rgb(0 71 105);
        stroke-width: 10px;
      }
    </style>
  </defs>
  `;
    }

    function nameOf(x) {
        return ({ A: "Adenine", T: "Thymine", G: "Guanine", C: "Cytosine" }[x] || x);
    }

    function regularPoly(n, cx, cy, r, rotRad) {
        const pts = [];
        for (let i = 0; i < n; i++) {
            const a = rotRad + (Math.PI * 2 * i) / n;
            pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
        }
        return pts;
    }

    const poly = (pts, fill) =>
        `<polygon points="${pts.map(p => p.join(",")).join(" ")}" fill="${fill}" class="gxRing"/>`;

    const ln = (x1, y1, x2, y2, cls = "gxBond") =>
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"/>`;

    const dbl = (x1, y1, x2, y2, off = 7) => {
        const dx = x2 - x1, dy = y2 - y1;
        const L = Math.hypot(dx, dy) || 1;
        const nx = -(dy / L) * off, ny = (dx / L) * off;
        return `
    ${ln(x1, y1, x2, y2, "gxBond")}
    ${ln(x1 + nx, y1 + ny, x2 + nx, y2 + ny, "gxBond")}
  `;
    };

    const hbLine = (x1, y1, x2, y2) =>
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="gxHB"/>`;

    function mixText(x, y, parts, anchor = "middle") {
        return `
    <text x="${x}" y="${y}" text-anchor="${anchor}" class="gxTxt">
      ${parts.map(p => `<tspan class="${p.cls}">${p.t}</tspan>`).join("")}
    </text>
  `;
    }

    function svgGC() {
        const colG = "#12a7ff";
        const colC = "#28e58c";

        const rings = `
      <g filter="url(#gxShadow)">
        <path d="
          M 160 150
          L 90 235
          L 150 340
          L 245 305
          L 245 180
          Z" fill="${colG}" class="gxRing"/>
        <path d="
          M 360 120
          L 245 180
          L 245 305
          L 375 360
          L 470 305
          L 470 200
          Z" fill="${colG}" class="gxRing"/>
        <line x1="245" y1="180" x2="245" y2="305" class="gxBond"/>
        <path d="
          M 850 120
          L 740 200
          L 740 310
          L 870 370
          L 965 310
          L 965 185
          Z" fill="${colC}" class="gxRing"/>
      </g>
    `;

        const bonds = `
      ${ln(360, 120, 360, 85, "gxBond2")}
      ${ln(366, 120, 366, 85, "gxBond2")}
      ${ln(740, 310, 700, 330, "gxBond2")}
      ${ln(746, 310, 706, 330, "gxBond2")}
    `;

        const labels = `
      ${mixText(360, 65, [{ t: "O", cls: "gxRed" }])}
      ${mixText(160, 130, [{ t: "N" }])}
      ${mixText(150, 365, [{ t: "N" }])}
      ${mixText(150, 395, [{ t: "H" }])}
      ${mixText(375, 395, [{ t: "N" }])}
      ${mixText(505, 195, [{ t: "N" }, { t: "-" }, { t: "H", cls: "gxRed" }])}
      ${mixText(490, 305, [{ t: "N" }, { t: "-" }, { t: "H", cls: "gxRed" }])}
      ${mixText(480, 340, [{ t: "H" }])}
      ${mixText(850, 85, [{ t: "H", cls: "gxRed" }, { t: "-" }, { t: "N" }, { t: "-" }, { t: "H" }])}
      ${ln(850, 120, 850, 160, "gxBond2")}
      ${mixText(720, 200, [{ t: "N", cls: "gxRed" }])}
      ${mixText(705, 330, [{ t: "O", cls: "gxRed" }])}
      ${ln(740, 310, 705, 330, "gxBond2")}
      ${ln(746, 310, 711, 330, "gxBond2")}
      ${mixText(870, 400, [{ t: "N" }])}
      ${mixText(870, 430, [{ t: "H" }])}
    `;

        const hbonds = `
      ${hbLine(400, 60, 760, 70)}
      ${hbLine(550, 185, 690, 190)}
      ${hbLine(550, 300, 660, 315)}
    `;

        const names = `
      <text x="320" y="470" text-anchor="middle" class="gxName">Guanine</text>
      <text x="880" y="470" text-anchor="middle" class="gxName">Cytosine</text>
    `;

        return `<g>${rings}${bonds}${hbonds}${labels}${names}</g>`;
    }

    function svgAT() {
        const colA = "#ff4b4b";
        const colT = "#ffd54b";

        const rings = `
    <g filter="url(#gxShadow)">
      <path d="
        M 160 150
        L 90 235
        L 150 340
        L 245 305
        L 245 180
        Z" fill="${colA}" class="gxRing"/>
      <path d="
        M 360 120
        L 245 180
        L 245 305
        L 375 360
        L 470 305
        L 470 200
        Z" fill="${colA}" class="gxRing"/>
      <line x1="245" y1="180" x2="245" y2="305" class="gxBond"/>
      <line x1="360" y1="120" x2="360" y2="75" class="gxBond"/>
      <path d="
        M 850 120
        L 740 200
        L 740 310
        L 870 370
        L 965 310
        L 965 185
        Z" fill="${colT}" class="gxRing"/>
    </g>
  `;

        const bonds = `
    ${ln(850, 120, 850, 85, "gxBond2")}
    ${ln(856, 120, 856, 85, "gxBond2")}
    ${ln(740, 310, 700, 330, "gxBond2")}
    ${ln(746, 310, 706, 330, "gxBond2")}
  `;

        const labels = `
    ${mixText(160, 130, [{ t: "N" }])}
    ${mixText(150, 365, [{ t: "N" }])}
    ${mixText(150, 395, [{ t: "H" }])}
    ${mixText(375, 395, [{ t: "N" }])}
    ${mixText(360, 65, [{ t: "H" }, { t: "-" }, { t: "N" }, { t: "-" }, { t: "H", cls: "gxRed" }])}
    ${mixText(485, 195, [{ t: "N", cls: "gxRed" }])}
    ${mixText(850, 65, [{ t: "O", cls: "gxRed" }])}
    ${mixText(705, 335, [{ t: "O" }])}
    ${mixText(720, 200, [{ t: "H", cls: "gxRed" }, { t: "-" }, { t: "N" }])}
    ${mixText(870, 400, [{ t: "N" }])}
    ${mixText(870, 430, [{ t: "H" }])}
    ${mixText(955, 190, [{ t: "CH3" }], "start")}
  `;

        const hbonds = `
    ${hbLine(420, 53, 830, 55)}
    ${hbLine(510, 185, 680, 190)}
  `;

        const names = `
    <text x="320" y="470" text-anchor="middle" class="gxName">Adenine</text>
    <text x="880" y="470" text-anchor="middle" class="gxName">Thymine</text>
  `;

        return `<g>${rings}${bonds}${hbonds}${labels}${names}</g>`;
    }

    function svgNonCanonical(L, R) {
        const cxL = 340, cxR = 760, cy = 240;
        const nameL = nameOf(L), nameR = nameOf(R);
        return `
          <g>
            <text x="${cxL}" y="440" text-anchor="middle" class="gxName">${nameL}</text>
            <text x="${cxR}" y="440" text-anchor="middle" class="gxName">${nameR}</text>
            <text x="${(cxL + cxR) / 2}" y="${cy}" text-anchor="middle"
                  style="font: 700 24px system-ui; fill: rgba(255,255,255,.70);">
              Non-canonical pair
            </text>
          </g>
        `;
    }

    function showDetailPanel(svgHtml, extraHtml = "") {
        if (!SHOW_DETAIL_PANEL) return;

        if (!detailBackdrop) {
            detailBackdrop = document.createElement("div");
            detailBackdrop.className = "gx-modal-backdrop";
            document.body.appendChild(detailBackdrop);

            detailBackdrop.addEventListener("click", (e) => {
                if (e.target === detailBackdrop) hideDetailPanel();
            });
        }

        if (!detailModal) {
            detailModal = document.createElement("div");
            detailModal.className = "gx-modal";
            document.body.appendChild(detailModal);
        }

        detailModal.innerHTML = `
            <div class="gx-modal__hd">
              <div class="gx-modal__title">Base-pair detail</div>
  
              <div class="gx-modal__tabs" role="tablist" aria-label="Base pair views">
                <button type="button" class="gx-tab is-active" data-tab="mol">3D Molecule</button>
                <button type="button" class="gx-tab" data-tab="comp">Complementarity</button>
              </div>
  
              <button type="button" class="gx-modal__close" id="bpCloseBtn">✕</button>
            </div>
  
            <div class="gx-modal__bd">
              <div class="gx-modal__pane is-active" data-pane="mol">
                <div class="gx-modal__grid onecol">
                  <div class="gx-modal__left">
                    <div class="gx-bp3d__mount" id="gxBp3dMount"></div>
                  </div>
                </div>
              </div>
  
              <div class="gx-modal__pane" data-pane="comp">
                <div class="gx-modal__grid onecol">
                  <div class="gx-modal__right">
                    <div class="gx-bp3d__mount" id="gxBpCompMount"></div>
                  </div>
                </div>
              </div>
            </div>
          `;

        detailModal.querySelector("#bpCloseBtn")?.addEventListener("click", hideDetailPanel);

        detailBackdrop.style.display = "block";
        detailModal.style.display = "block";

        escHandler = (ev) => {
            if (ev.key === "Escape") hideDetailPanel();
        };

        document.addEventListener("keydown", escHandler);

        const tabs = [...detailModal.querySelectorAll(".gx-tab")];
        const panes = [...detailModal.querySelectorAll(".gx-modal__pane")];

        function setTab(name) {
            tabs.forEach(t => t.classList.toggle("is-active", t.dataset.tab === name));
            panes.forEach(p => p.classList.toggle("is-active", p.dataset.pane === name));

            if (name !== "mol") bpPreview?.pause?.();
            else bpPreview?.resume?.();
        }

        tabs.forEach(t => t.addEventListener("click", () => setTab(t.dataset.tab)));
        setTab("mol");
    }

    function isMutatedVisualIndex(vi) {
        const seqIndex = REV ? (N - 1 - vi) : vi;
        return mutatedSet.has(seqIndex);
    }

    function applyBaseVisual(mesh, isMutated, isActive = false, isHovered = false) {
        if (!mesh?.material) return;

        const m = mesh.material;

        if (isMutated) {
            m.emissive.setHex(0xff2a55);
            m.emissiveIntensity = isActive ? 1.35 : isHovered ? 1.05 : 0.72;
            mesh.scale.setScalar(isActive ? 1.55 : isHovered ? 1.24 : 1.08);
        } else {
            m.emissive.setHex(isActive || isHovered ? 0xffffff : 0x000000);
            m.emissiveIntensity = isActive ? 0.38 : isHovered ? 0.28 : 0.0;
            mesh.scale.setScalar(isActive ? 1.45 : isHovered ? 1.18 : 1.0);
        }
    }

    function applyRungVisual(rung, baseOpacity, isMutated, isActive = false) {
        if (!rung?.material) return;

        if (isMutated) {
            rung.material.color.setHex(0xff4b6e);
            rung.material.opacity = isActive ? 1.0 : Math.max(0.92, baseOpacity);
        } else {
            rung.material.color.setHex(0xffffff);
            rung.material.opacity = isActive ? Math.min(1, baseOpacity * 1.6) : baseOpacity;
        }
    }

    function hideDetailPanel() {
        bpPreview?.dispose?.();
        bpPreview = null;

        detailPanel?.dispose?.();
        detailPanel = null;

        if (detailBackdrop) detailBackdrop.style.display = "none";
        if (detailModal) detailModal.style.display = "none";

        if (escHandler) document.removeEventListener("keydown", escHandler);
        escHandler = null;
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

    const baseMeshes1 = [];
    const baseMeshes2 = [];
    const rungMeshes = [];
    const rungBaseOpacity = [];

    let onPick = null;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    createLegendOverlay(mount, { baseHex, enableDetail: ENABLE_DETAIL, elem: ELEM });

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

        if (SHOW_DETAIL_PANEL) {
            const hb =
                ((b1 === "A" && b2 === "T") || (b1 === "T" && b2 === "A")) ? 2 :
                    ((b1 === "C" && b2 === "G") || (b1 === "G" && b2 === "C")) ? 3 : 0;

            showDetailPanel(renderBasePairSVG(b1, b2, seqIndex), "");

            const hostMol = detailModal?.querySelector("#gxBp3dMount");
            const hostComp = detailModal?.querySelector("#gxBpCompMount");

            bpPreview?.dispose?.();
            bpPreview = mountBasePairPreview3D(hostMol, { b1, b2, hb, baseHex, ELEM });

            if (hostComp)
                hostComp.innerHTML = renderBasePairSVG(b1, b2, seqIndex);
        };
    });

    for (let vi = 0; vi < N; vi++) {
        const si = REV ? (N - 1 - vi) : vi;
        const ang = handedSign * vi * thetaStep;
        const z = vi * rise;

        const x1 = r * Math.cos(ang), y1 = r * Math.sin(ang);
        const x2 = -x1, y2 = -y1;

        const b1 = strand1[si], b2 = strand2[si];
        const isMutated = mutatedSet.has(si);

        const m1 = new THREE.Mesh(baseGeom, new THREE.MeshStandardMaterial({
            color: baseHex[b1] ?? 0xffffff,
            metalness: 0.05,
            roughness: 0.35,
            emissive: isMutated ? 0xff2a55 : 0x000000,
            emissiveIntensity: isMutated ? 0.72 : 0
        }));

        const m2 = new THREE.Mesh(baseGeom, new THREE.MeshStandardMaterial({
            color: baseHex[b2] ?? 0xffffff,
            metalness: 0.05,
            roughness: 0.35,
            emissive: isMutated ? 0xff2a55 : 0x000000,
            emissiveIntensity: isMutated ? 0.72 : 0
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

        if (isMutated) {
            m1.scale.setScalar(1.08);
            m2.scale.setScalar(1.08);
        }

        const baseOp =
            ((b1 === "A" && b2 === "T") || (b1 === "T" && b2 === "A")) ? 0.50 :
                ((b1 === "C" && b2 === "G") || (b1 === "G" && b2 === "C")) ? 0.85 : 0.20;

        const rung = new THREE.Mesh(rungGeom, globalRungMat.clone());
        rung.material.opacity = baseOp;

        const mid = new THREE.Vector3().addVectors(m1.position, m2.position).multiplyScalar(0.5);
        rung.position.copy(mid);
        rung.lookAt(m2.position);
        rung.rotateX(Math.PI / 2);

        if (isMutated) {
            rung.material.color.setHex(0xff4b6e);
            rung.material.opacity = Math.max(0.92, baseOp);
        }

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

        const a = baseMeshes1[i];
        const b = baseMeshes2[i];
        const isMut = isMutatedVisualIndex(i);

        applyBaseVisual(a, isMut, false, false);
        applyBaseVisual(b, isMut, false, false);
    }
    function setHover(i) {
        if (i === hoverIndex) return;

        clearHover(hoverIndex);
        hoverIndex = i;

        if (hoverIndex < 0) {
            hoverRing1.visible = hoverRing2.visible = false;
            return;
        }

        const a = baseMeshes1[hoverIndex];
        const b = baseMeshes2[hoverIndex];
        const isMut = isMutatedVisualIndex(hoverIndex);

        applyBaseVisual(a, isMut, false, true);
        applyBaseVisual(b, isMut, false, true);

        hoverRing1.position.copy(a.position);
        hoverRing2.position.copy(b.position);

        if (isMut) {
            hoverRingMat.color.setHex(0xff5a7a);
        } else {
            hoverRingMat.color.setHex(0x7ee6ff);
        }

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
            const wasMut = isMutatedVisualIndex(active);

            applyBaseVisual(baseMeshes1[active], wasMut, false, false);
            applyBaseVisual(baseMeshes2[active], wasMut, false, false);
            applyRungVisual(rungMeshes[active], rungBaseOpacity[active], wasMut, false);
        }

        active = vi;

        const isMut = isMutatedVisualIndex(vi);

        applyBaseVisual(baseMeshes1[vi], isMut, true, false);
        applyBaseVisual(baseMeshes2[vi], isMut, true, false);
        applyRungVisual(rungMeshes[vi], rungBaseOpacity[vi], isMut, true);

        if (isMut) {
            ringMat.color.setHex(0xff4b6e);
        } else {
            ringMat.color.setHex(0xffffff);
        }

        ring1.position.copy(baseMeshes1[vi].position);
        ring2.position.copy(baseMeshes2[vi].position);
        ring1.visible = ring2.visible = true;
        ringPulse = 1.85;
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

        bpPreview?.dispose?.();
        bpPreview = null;
        detailPanel = null;

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

        renderer.domElement?.remove();

        mount.querySelectorAll('.dna-legend[data-gx="1"]').forEach(el => el.remove());
        mount.querySelectorAll('.dna-detail-panel[data-gx="1"]').forEach(el => el.remove());

        detailModal?.remove();
        detailModal = null;
        detailBackdrop?.remove();
        detailBackdrop = null;
        if (escHandler) document.removeEventListener("keydown", escHandler);
        escHandler = null;
    }

    return {
        toIndex, refresh, pause, resume, dispose,
        onPick: (fn) => { onPick = fn; },
        fit: () => frameObject(camera, root, controls, 1.35),
    };
}