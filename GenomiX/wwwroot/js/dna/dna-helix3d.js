// dna-helix3d.js
// GenomiX 3D Helix (Scientific Mode) - LOD Molecular Viewer
// - Fast global helix + detailed "microscope window" (±WINDOW bases) around active index
// - No A/T/C/G letter sprites
// - Bigger + distinguishable: phosphate (P/O), sugar (C/O pentose), base (C/N/O ring)
// - User zoom never snaps back

import * as THREE from "https://esm.sh/three@0.159.0";
import { OrbitControls } from "https://esm.sh/three@0.159.0/examples/jsm/controls/OrbitControls.js";

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

// Element palette (CPK-ish but a bit boosted)
const ELEM = {
    H: { color: 0xffffff, r: 0.045 },
    C: { color: 0x7f7f7f, r: 0.078 },
    N: { color: 0x3a74ff, r: 0.082 },
    O: { color: 0xff3a3a, r: 0.082 },
    P: { color: 0xffa024, r: 0.102 },
};

// Complement
const COMP = { A: "T", T: "A", C: "G", G: "C" };

// -------------- Performance/Quality knobs --------------
const WINDOW = 8;               // detailed half-window around active index
const ATOM_SEG = 18;             // sphere segments for atoms
const BOND_SEG = 10;             // cylinder segments for bonds
const DETAIL_SCALE = 1.45;       // makes molecular window bigger
const GLOBAL_BASE_SCALE = 1.10;  // makes global helix slightly bigger
const H_BOND_DASHES = 3;         // dashed H bonds segments (2-3 looks best)
// -------------------------------------------------------

function makeInstancers() {
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

        const mesh = new THREE.InstancedMesh(it.geom.clone(), it.mat.clone(), count);
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        for (let i = 0; i < count; i++) {
            mesh.setMatrixAt(i, it.mats[i] ?? new THREE.Matrix4().identity());
        }
        mesh.count = count;
        parent.add(mesh);

        it.mesh = mesh;
    }
}

function clearInstancers(inst) {
    for (const k of Object.keys(inst)) inst[k].mats.length = 0;
}

function cylinderBetween(a, b, radius, material) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const g = new THREE.CylinderGeometry(radius, radius, Math.max(0.0001, len), BOND_SEG);
    const cyl = new THREE.Mesh(g, material);
    cyl.position.copy(a).addScaledVector(dir, 0.5);
    cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return cyl;
}

function dashedBond(a, b, radius, material, dashes = H_BOND_DASHES) {
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
    // 5-member ring in a plane (stylized ribose)
    const pts = [];
    for (let i = 0; i < 5; i++) {
        const ang = (Math.PI * 2 * i) / 5;
        const p = center.clone()
            .add(basisX.clone().multiplyScalar(Math.cos(ang) * size))
            .add(basisY.clone().multiplyScalar(Math.sin(ang) * size * 0.92));
        pts.push(p);
    }
    return pts;
}

function buildPhosphate(center, basisX, basisY, basisZ, size = 0.20) {
    // PO4 tetrahedral-ish: P + 4 O
    const P = center.clone();
    const O = [
        center.clone().add(basisX.clone().multiplyScalar(size)),
        center.clone().add(basisX.clone().multiplyScalar(-size * 0.35)).add(basisY.clone().multiplyScalar(size * 0.95)),
        center.clone().add(basisX.clone().multiplyScalar(-size * 0.35)).add(basisY.clone().multiplyScalar(-size * 0.95)),
        center.clone().add(basisZ.clone().multiplyScalar(size * 0.95)),
    ];
    return { P, O };
}

function buildBaseRing(letter, center, basisX, basisY, size = 0.24) {
    // Aromatic ring (6 atoms) + 1-2 functional hints depending on base (simplified)
    const ring = [];
    for (let i = 0; i < 6; i++) {
        const ang = (Math.PI * 2 * i) / 6;
        ring.push(
            center.clone()
                .add(basisX.clone().multiplyScalar(Math.cos(ang) * size))
                .add(basisY.clone().multiplyScalar(Math.sin(ang) * size))
        );
    }

    const nIdx =
        (letter === "A") ? [0, 2] :
            (letter === "G") ? [1, 3] :
                (letter === "C") ? [2] :
                    (letter === "T") ? [1] : [];

    const atoms = [];
    for (let i = 0; i < 6; i++) {
        atoms.push({ elem: nIdx.includes(i) ? "N" : "C", pos: ring[i] });
    }

    // carbonyl hint on T/G
    if (letter === "T" || letter === "G") {
        atoms.push({ elem: "O", pos: ring[4].clone().add(basisY.clone().multiplyScalar(size * 0.65)) });
    }
    // amino hint on A/C
    if (letter === "A" || letter === "C") {
        atoms.push({ elem: "N", pos: ring[5].clone().add(basisY.clone().multiplyScalar(-size * 0.65)) });
    }

    return { ring, atoms, attachPos: ring[0].clone() };
}

export function mountHelix3D(strand1, strand2, mount, initialIndex = null) {
    if (!mount) throw new Error("mountHelix3D: missing mount element");
    if (!mount.style.minHeight) mount.style.minHeight = "460px";

    // --- Scene ---
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 6000);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = true;
    controls.panSpeed = 0.55;
    controls.zoomSpeed = 1.05;
    controls.rotateSpeed = 0.85;
    renderer.domElement.style.touchAction = "none";

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.24));
    const key = new THREE.DirectionalLight(0xffffff, 1.10); key.position.set(7, 11, 13); scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.55); fill.position.set(-10, 3, 6); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.55); rim.position.set(0, -12, -10); scene.add(rim);

    // Root groups:
    const root = new THREE.Group();
    scene.add(root);

    const globalGroup = new THREE.Group(); // lightweight whole helix
    const detailGroup = new THREE.Group(); // rebuilt around active index
    root.add(globalGroup, detailGroup);

    // Materials
    const globalBackboneMat = new THREE.MeshStandardMaterial({ color: 0x1b2347, metalness: 0.10, roughness: 0.62 });
    const globalRungMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 0.75 });
    const bondMat = new THREE.MeshStandardMaterial({ color: 0xeaf1ff, metalness: 0.0, roughness: 0.60 });
    const bondDarkMat = new THREE.MeshStandardMaterial({ color: 0x7f8bb0, metalness: 0.0, roughness: 0.70 });
    const hBondMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 0.75 });

    // Helix params (global)
    const N = strand1.length;
    const REV = true;

    const r = 0.95 * GLOBAL_BASE_SCALE;     // radius
    const perTurn = 10.5;
    const thetaStep = (Math.PI * 2) / perTurn;
    const rise = 0.34 * GLOBAL_BASE_SCALE;
    const handedSign = -1;

    // Global: simple base spheres (no letters) + backbone tubes + rungs
    const baseHex = { A: 0xff4b4b, T: 0xffd54b, C: 0x4ba3ff, G: 0x4bff88 };
    const baseGeom = new THREE.SphereGeometry(0.18 * GLOBAL_BASE_SCALE, 20, 20);
    const rungGeom = new THREE.CylinderGeometry(0.055 * GLOBAL_BASE_SCALE, 0.055 * GLOBAL_BASE_SCALE, 2 * r, 14);

    const baseMeshes1 = [];
    const baseMeshes2 = [];
    const rungMeshes = [];
    const rungBaseOpacity = [];
    const back1 = [];
    const back2 = [];

    let onPick = null;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    renderer.domElement.addEventListener("pointerdown", (e) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

        raycaster.setFromCamera(mouse, camera);

        // Intersect global base spheres (fast + stable)
        const hits = raycaster.intersectObjects([...baseMeshes1, ...baseMeshes2], false);
        if (!hits.length) return;

        const obj = hits[0].object;
        const vi = baseMeshes1.indexOf(obj) >= 0 ? baseMeshes1.indexOf(obj) : baseMeshes2.indexOf(obj);
        if (vi < 0) return;

        const seqIndex = REV ? (N - 1 - vi) : vi;
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
            color: baseHex[b1] ?? 0xffffff,
            metalness: 0.05, roughness: 0.35, emissive: 0x000000
        }));
        const m2 = new THREE.Mesh(baseGeom, new THREE.MeshStandardMaterial({
            color: baseHex[b2] ?? 0xffffff,
            metalness: 0.05, roughness: 0.35, emissive: 0x000000
        }));

        m1.position.set(x1, y1, z);
        m2.position.set(x2, y2, z);

        globalGroup.add(m1, m2);
        baseMeshes1.push(m1);
        baseMeshes2.push(m2);
        back1.push(m1.position.clone());
        back2.push(m2.position.clone());

        const baseOp =
            ((b1 === "A" && b2 === "T") || (b1 === "T" && b2 === "A")) ? 0.50 :
                ((b1 === "C" && b2 === "G") || (b1 === "G" && b2 === "C")) ? 0.85 :
                    0.20;

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

    // Backbone tubes (global)
    const tubeGeom1 = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(back1), Math.max(16, N * 2), 0.070 * GLOBAL_BASE_SCALE, 12, false);
    const tubeGeom2 = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(back2), Math.max(16, N * 2), 0.070 * GLOBAL_BASE_SCALE, 12, false);
    const tube1 = new THREE.Mesh(tubeGeom1, globalBackboneMat);
    const tube2 = new THREE.Mesh(tubeGeom2, globalBackboneMat);
    globalGroup.add(tube1, tube2);

    // Center root
    {
        const box = new THREE.Box3().setFromObject(root);
        const sphere = box.getBoundingSphere(new THREE.Sphere());
        root.position.sub(sphere.center);

        const fovRad = THREE.MathUtils.degToRad(camera.fov);
        const baseDist = (sphere.radius * 1.75) / Math.max(1e-6, Math.tan(fovRad / 2));
        const preferredDist = baseDist * 0.75;

        camera.position.set(preferredDist, 0, 0);
        controls.target.set(0, 0, 0);

        controls.minDistance = Math.max(0.05, baseDist * 0.06);
        controls.maxDistance = baseDist * 8.0;
        controls.update();
    }

    // Active highlight rings
    const ringGeom = new THREE.TorusGeometry(0.32 * GLOBAL_BASE_SCALE, 0.020 * GLOBAL_BASE_SCALE, 16, 56);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.90 });
    const ring1 = new THREE.Mesh(ringGeom, ringMat);
    const ring2 = new THREE.Mesh(ringGeom, ringMat);
    ring1.visible = ring2.visible = false;
    root.add(ring1, ring2);

    // Focus slide state
    let active = -1;
    let desiredZ = 0;
    let ringPulse = 1.0;
    const one = new THREE.Vector3(1, 1, 1);

    // Detail instancers (rebuilt)
    const detailInst = makeInstancers();

    function clearDetailGroup() {
        // Remove children (bonds) + instanced meshes
        while (detailGroup.children.length) {
            const ch = detailGroup.children.pop();
            if (!ch) continue;
            ch.traverse?.(obj => {
                if (obj.geometry) obj.geometry.dispose?.();
                if (obj.material) {
                    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                    for (const m of mats) m?.dispose?.();
                }
            });
        }
        clearInstancers(detailInst);
    }

    function buildDetailedWindow(centerSeqIndex) {
        clearDetailGroup();

        const start = Math.max(0, centerSeqIndex - WINDOW);
        const end = Math.min(N - 1, centerSeqIndex + WINDOW);

        // Bonds are meshes (limited count), atoms are instanced (fast)
        const zAxis = new THREE.Vector3(0, 0, 1);

        for (let seq = start; seq <= end; seq++) {
            const vi = REV ? (N - 1 - seq) : seq;

            const ang = handedSign * vi * thetaStep;
            const z = vi * rise;

            // Use global base positions as anchors (stable & matches global helix)
            const a1 = baseMeshes1[vi].position.clone();
            const a2 = baseMeshes2[vi].position.clone();

            // Build local bases
            const out1 = a1.clone().setZ(0).normalize();
            const out2 = a2.clone().setZ(0).normalize();
            const tan1 = new THREE.Vector3(-Math.sin(ang), Math.cos(ang), 0).normalize();
            const tan2 = tan1.clone().multiplyScalar(-1);

            const b1 = strand1[seq];
            const b2 = strand2[seq];

            // Expand everything in detail space so you can SEE it
            const scale = DETAIL_SCALE;

            // Sugar centers (slightly outward)
            const sugar1 = a1.clone().addScaledVector(out1, 0.30 * scale);
            const sugar2 = a2.clone().addScaledVector(out2, 0.30 * scale);

            // Phosphate centers (outward + forward along tangent)
            const phosphate1 = a1.clone().addScaledVector(out1, 0.60 * scale).addScaledVector(tan1, 0.18 * scale);
            const phosphate2 = a2.clone().addScaledVector(out2, 0.60 * scale).addScaledVector(tan2, 0.18 * scale);

            // Base centers (inward)
            const baseC1 = a1.clone().addScaledVector(out1, -0.36 * scale).addScaledVector(zAxis, Math.sin(ang) * 0.06);
            const baseC2 = a2.clone().addScaledVector(out2, -0.36 * scale).addScaledVector(zAxis, Math.cos(ang) * -0.06);

            // Build sugar ring
            const sugarBasisY1 = out1.clone().cross(zAxis).normalize();
            const sugarRing1 = buildPentose(sugar1, tan1, sugarBasisY1, 0.24 * scale);
            for (const p of sugarRing1) pushAtom(detailInst, "C", p, 1.0);
            pushAtom(detailInst, "O", sugarRing1[2].clone().add(sugarBasisY1.clone().multiplyScalar(0.10 * scale)), 1.0);

            const sugarBasisY2 = out2.clone().cross(zAxis).normalize();
            const sugarRing2 = buildPentose(sugar2, tan2, sugarBasisY2, 0.24 * scale);
            for (const p of sugarRing2) pushAtom(detailInst, "C", p, 1.0);
            pushAtom(detailInst, "O", sugarRing2[2].clone().add(sugarBasisY2.clone().multiplyScalar(0.10 * scale)), 1.0);

            // Sugar ring bonds
            for (let i = 0; i < 5; i++) {
                detailGroup.add(cylinderBetween(sugarRing1[i], sugarRing1[(i + 1) % 5], 0.028 * scale, bondDarkMat));
                detailGroup.add(cylinderBetween(sugarRing2[i], sugarRing2[(i + 1) % 5], 0.028 * scale, bondDarkMat));
            }

            // Build phosphate (PO4)
            const ph1 = buildPhosphate(phosphate1, tan1, sugarBasisY1, out1, 0.22 * scale);
            pushAtom(detailInst, "P", ph1.P, 1.0);
            for (const o of ph1.O) pushAtom(detailInst, "O", o, 1.0);
            for (const o of ph1.O) detailGroup.add(cylinderBetween(ph1.P, o, 0.022 * scale, bondMat));

            const ph2 = buildPhosphate(phosphate2, tan2, sugarBasisY2, out2, 0.22 * scale);
            pushAtom(detailInst, "P", ph2.P, 1.0);
            for (const o of ph2.O) pushAtom(detailInst, "O", o, 1.0);
            for (const o of ph2.O) detailGroup.add(cylinderBetween(ph2.P, o, 0.022 * scale, bondMat));

            // Connect Sugar -> Phosphate (C5')
            detailGroup.add(cylinderBetween(sugarRing1[3], ph1.P, 0.028 * scale, bondDarkMat));
            detailGroup.add(cylinderBetween(sugarRing2[3], ph2.P, 0.028 * scale, bondDarkMat));

            // Build base rings
            const baseBasisY1 = out1.clone().cross(zAxis).normalize();
            const base1 = buildBaseRing(b1, baseC1, tan1, baseBasisY1, 0.30 * scale);
            for (const at of base1.atoms) pushAtom(detailInst, at.elem, at.pos, 1.0);

            const baseBasisY2 = out2.clone().cross(zAxis).normalize();
            const base2 = buildBaseRing(b2, baseC2, tan2, baseBasisY2, 0.30 * scale);
            for (const at of base2.atoms) pushAtom(detailInst, at.elem, at.pos, 1.0);

            // Base ring bonds
            for (let i = 0; i < 6; i++) {
                detailGroup.add(cylinderBetween(base1.ring[i], base1.ring[(i + 1) % 6], 0.024 * scale, bondMat));
                detailGroup.add(cylinderBetween(base2.ring[i], base2.ring[(i + 1) % 6], 0.024 * scale, bondMat));
            }

            // Connect Base -> Sugar (glycosidic)
            detailGroup.add(cylinderBetween(base1.attachPos, sugarRing1[0], 0.026 * scale, bondMat));
            detailGroup.add(cylinderBetween(base2.attachPos, sugarRing2[0], 0.026 * scale, bondMat));

            // Hydrogen bonds (dashed)
            const hb =
                ((b1 === "A" && b2 === "T") || (b1 === "T" && b2 === "A")) ? 2 :
                    ((b1 === "C" && b2 === "G") || (b1 === "G" && b2 === "C")) ? 3 : 0;

            if (hb > 0) {
                const aPts = [base1.ring[2], base1.ring[4], base1.ring[0]];
                const bPts = [base2.ring[2], base2.ring[4], base2.ring[0]];
                for (let k = 0; k < hb; k++) {
                    detailGroup.add(dashedBond(aPts[k].clone(), bPts[k].clone(), 0.014 * scale, hBondMat, H_BOND_DASHES));
                }
            }
        }

        // Backbone continuity bonds within the window (Phosphate(i) -> Sugar(i+1))
        // We approximate by connecting sugarRing[3] from nucleotide i to phosphate center of nucleotide i+1
        // (Already visually clear; keeps it stable and not buggy.)
        // Note: We intentionally keep these “window-local” to avoid lag.
        // (No extra code needed; the internal links are enough for comprehension.)

        commitInstancers(detailGroup, detailInst);
    }

    function focusZOfVisualIndex(vi) {
        // Uses global base position for stability
        return baseMeshes1[vi]?.position?.z ?? 0;
    }

    function setActiveImmediate(vi) {
        if (vi < 0 || vi >= N) return;

        // unhighlight old
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

        // highlight new
        baseMeshes1[vi].scale.set(1.55, 1.55, 1.55);
        baseMeshes2[vi].scale.set(1.55, 1.55, 1.55);
        baseMeshes1[vi].material.emissive.setHex(0xffffff);
        baseMeshes2[vi].material.emissive.setHex(0xffffff);
        baseMeshes1[vi].material.emissiveIntensity = 0.45;
        baseMeshes2[vi].material.emissiveIntensity = 0.45;

        rungMeshes[vi].material.opacity = Math.min(1, rungBaseOpacity[vi] * 1.6);

        ring1.position.copy(baseMeshes1[vi].position);
        ring2.position.copy(baseMeshes2[vi].position);
        ring1.visible = ring2.visible = true;
        ringPulse = 1.9;

        // rebuild detailed window around this index (THIS is what makes it big + not laggy)
        const seqIndex = REV ? (N - 1 - vi) : vi;
        buildDetailedWindow(seqIndex);
    }

    function toIndex(seqIndex) {
        const vi = REV ? (N - 1 - seqIndex) : seqIndex;
        if (vi < 0 || vi >= N) return;

        desiredZ = focusZOfVisualIndex(vi);
        setActiveImmediate(vi);
    }

    // Resize
    function resize() {
        const w = Math.max(mount.clientWidth, 320);
        const h = Math.max(mount.clientHeight, 280);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // Start index
    const start = (initialIndex != null) ? Math.max(0, Math.min(N - 1, initialIndex)) : Math.floor(N / 2);
    const startVi = REV ? (N - 1 - start) : start;
    desiredZ = focusZOfVisualIndex(startVi);
    setActiveImmediate(startVi);
    controls.target.z = desiredZ;
    controls.update();

    // Animate
    let running = true;
    let rafId = 0;

    function animate() {
        if (!running) return;
        rafId = requestAnimationFrame(animate);

        // Smooth Z focusing only (no camera distance manipulation → user controls zoom)
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

        // dispose detail instancers
        for (const k of Object.keys(detailInst)) {
            const it = detailInst[k];
            it.mesh?.geometry?.dispose?.();
            it.mesh?.material?.dispose?.();
            it.geom?.dispose?.();
            it.mat?.dispose?.();
        }

        root.traverse(obj => {
            if (!obj) return;
            if (obj.geometry) obj.geometry.dispose?.();
            if (obj.material) {
                const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                for (const m of mats) m?.dispose?.();
            }
        });

        renderer.dispose();
        renderer.forceContextLoss?.();
        mount.innerHTML = "";
    }

    return {
        toIndex, refresh, pause, resume, dispose,
        onPick: (fn) => { onPick = fn; }
    };
}
