import * as THREE from "https://esm.sh/three@0.159.0";
import { OrbitControls } from "https://esm.sh/three@0.159.0/examples/jsm/controls/OrbitControls.js";

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function qualityForN(N) {
    if (N >= 200) return { ATOM_SEG: 8, BOND_SEG: 6, H_DASHES: 2, DETAIL_SCALE: 1.25 };
    if (N >= 100) return { ATOM_SEG: 10, BOND_SEG: 6, H_DASHES: 2, DETAIL_SCALE: 1.30 };
    return { ATOM_SEG: 12, BOND_SEG: 7, H_DASHES: 2, DETAIL_SCALE: 1.35 };
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

function cylinderBetween(a, b, radius, material, BOND_SEG) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const g = new THREE.CylinderGeometry(radius, radius, Math.max(0.0001, len), BOND_SEG);
    const cyl = new THREE.Mesh(g, material);
    cyl.position.copy(a).addScaledVector(dir, 0.5);
    cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return cyl;
}

function dashedBond(a, b, radius, material, dashes, BOND_SEG) {
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
        g.add(cylinderBetween(p0, p1, radius, material, BOND_SEG));
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;

    mount.querySelectorAll("canvas").forEach(c => c.remove());

    mount.appendChild(renderer.domElement);

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

    const globalGroup = new THREE.Group(); 
    const detailGroup = new THREE.Group();
    root.add(globalGroup, detailGroup);

    const globalBackboneMat = new THREE.MeshStandardMaterial({ color: 0x1b2347, metalness: 0.10, roughness: 0.62 });
    const globalRungMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 0.75 });

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
        const hits = raycaster.intersectObjects([...baseMeshes1, ...baseMeshes2], false);
        if (!hits.length) return;

        const vi = hits[0].object?.userData?.vi;
        if (!Number.isFinite(vi)) return;

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

    function padded(points) {
        const p = points.map(v => v.clone());
        if (p.length >= 2) { p.unshift(p[0].clone()); p.push(p[p.length - 1].clone()); }
        return p;
    }

    const curve1 = new THREE.CatmullRomCurve3(padded(back1), false, "centripetal");
    const curve2 = new THREE.CatmullRomCurve3(padded(back2), false, "centripetal");

    const tubeGeom1 = new THREE.TubeGeometry(curve1, Math.max(32, N * 2), 0.070 * GLOBAL_BASE_SCALE, 10, false);
    const tubeGeom2 = new THREE.TubeGeometry(curve2, Math.max(32, N * 2), 0.070 * GLOBAL_BASE_SCALE, 10, false);

    const tube1 = new THREE.Mesh(tubeGeom1, globalBackboneMat);
    const tube2 = new THREE.Mesh(tubeGeom2, globalBackboneMat);
    globalGroup.add(tube1, tube2);

    tube1.material.transparent = true;
    tube2.material.transparent = true;
    tube1.material.opacity = 0.55;
    tube2.material.opacity = 0.55;

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

    const detailInst = makeInstancers(ATOM_SEG);
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
            detailGroup.add(cylinderBetween(ph.P, o, 0.014 * scale, bondMat, BOND_SEG));
        }
    }

    function addSugar(sugarRing, scale) {
        for (const p of sugarRing) pushAtom(detailInst, "C", p, 1.0);
        for (let i = 0; i < 5; i++) {
            detailGroup.add(cylinderBetween(sugarRing[i], sugarRing[(i + 1) % 5], 0.016 * scale, bondDarkMat, BOND_SEG));
        }
    }

    function addSugarToPhosphate(sugarRing, ph, scale) {
        detailGroup.add(cylinderBetween(sugarRing[3], ph.P, 0.016 * scale, bondDarkMat, BOND_SEG));
    }

    function addPhosphateToNextSugar(ph, nextSugarRing, scale) {
        detailGroup.add(cylinderBetween(ph.P, nextSugarRing[1], 0.015 * scale, bondDarkMat, BOND_SEG));
    }

    function addBase(letter, baseCenter, tan, out, sugarRing, scale) {
        const baseBasisY = out.clone().cross(zAxis).normalize();
        const base = buildBaseRing(letter, baseCenter, tan, baseBasisY, 0.28 * scale);
        for (const at of base.atoms) pushAtom(detailInst, at.elem, at.pos, 1.0);

        for (let i = 0; i < 6; i += 2) {
            detailGroup.add(cylinderBetween(base.ring[i], base.ring[(i + 1) % 6], 0.013 * scale, bondMat, BOND_SEG));
        }
        detailGroup.add(cylinderBetween(base.attachPos, sugarRing[0], 0.014 * scale, bondMat, BOND_SEG));

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
                detailGroup.add(dashedBond(aPts[k], bPts[k], 0.010 * scale, hBondMat, H_DASHES, BOND_SEG));
            }
        }
    }

    for (let i = 0; i < N - 1; i++) {
        addPhosphateToNextSugar(strand1Nodes[i].ph, strand1Nodes[i + 1].sugarRing, scale);
        addPhosphateToNextSugar(strand2Nodes[i].ph, strand2Nodes[i + 1].sugarRing, scale);
    }

    commitInstancers(detailGroup, detailInst);

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
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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

        for (const k of Object.keys(detailInst)) {
            const it = detailInst[k];
            it.mesh?.geometry?.dispose?.();
            it.mesh?.material?.dispose?.();
            it.geom?.dispose?.();
            it.mat?.dispose?.();
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
        mount.innerHTML = "";
    }

    return {
        toIndex, refresh, pause, resume, dispose,
        onPick: (fn) => { onPick = fn; },
        fit: () => frameObject(camera, root, controls, 1.35),
    };
}
