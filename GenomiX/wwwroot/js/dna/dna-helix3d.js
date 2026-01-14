import * as THREE from "https://esm.sh/three@0.159.0";
import { OrbitControls } from "https://esm.sh/three@0.159.0/examples/jsm/controls/OrbitControls.js";

export function mountHelix3D(strand1, strand2, mount, initialIndex = null) {
    if (!mount.style.minHeight) mount.style.minHeight = "440px";

    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.zoomSpeed = 0.95;
    controls.rotateSpeed = -Math.abs(0.9);
    renderer.domElement.style.touchAction = "none";

    const ambient = new THREE.AmbientLight(0xffffff, 0.95);
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(4, 6, 8);
    scene.add(ambient, dir);

    const group = new THREE.Group();
    scene.add(group);

    const r = 0.70;
    const perTurn = 10.5;
    const thetaStep = (Math.PI * 2) / perTurn;
    const rise = 0.25;
    const handedSign = -1;
    const SLIDE_SIGN = 1;

    const baseHex = { A: 0xff4b4b, T: 0xffd54b, C: 0x4ba3ff, G: 0x4bff88 };
    const baseGeom = new THREE.SphereGeometry(0.14, 24, 24);
    const rungGeom = new THREE.CylinderGeometry(0.06, 0.06, 2 * r, 16);

    const baseMeshes1 = [], baseMeshes2 = [];
    const rungMeshes = [], rungBaseOpacity = [];
    const labelSprites = [];

    function relLum(hex) {
        const rr = (hex >> 16) & 255, gg = (hex >> 8) & 255, bb = hex & 255;
        const t = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        return 0.2126 * t(rr) + 0.7152 * t(gg) + 0.0722 * t(bb);
    }
    function textColor(hex) { return relLum(hex) > 0.60 ? "#111111" : "#ffffff"; }

    function makeLabel(letter, colorHex) {
        const s = 96;
        const c = document.createElement("canvas");
        c.width = s; c.height = s;
        const ctx = c.getContext("2d");
        ctx.clearRect(0, 0, s, s);
        ctx.shadowColor = "rgba(0,0,0,0.65)";
        ctx.shadowBlur = 8;
        ctx.fillStyle = textColor(colorHex);
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.lineWidth = 3;
        ctx.font = "bold 64px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.strokeText(letter, s / 2, s / 2);
        ctx.fillText(letter, s / 2, s / 2);

        const tex = new THREE.CanvasTexture(c);
        tex.anisotropy = 8;
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
        const spr = new THREE.Sprite(mat);
        spr.scale.set(0.34, 0.34, 0.34);
        spr.renderOrder = 999;

        labelSprites.push(spr);
        return spr;
    }

    const N = strand1.length;
    const REV = true;

    for (let vi = 0; vi < N; vi++) {
        const si = REV ? (N - 1 - vi) : vi;
        const ang = handedSign * vi * thetaStep;
        const z = vi * rise;

        const x1 = r * Math.cos(ang), y1 = r * Math.sin(ang);
        const x2 = -x1, y2 = -y1;

        const b1 = strand1[si], b2 = strand2[si];

        const m1 = new THREE.Mesh(baseGeom, new THREE.MeshStandardMaterial({ color: baseHex[b1] ?? 0xffffff, metalness: 0.05, roughness: 0.35, side: THREE.DoubleSide }));
        const m2 = new THREE.Mesh(baseGeom, new THREE.MeshStandardMaterial({ color: baseHex[b2] ?? 0xffffff, metalness: 0.05, roughness: 0.35, side: THREE.DoubleSide }));
        m1.position.set(x1, y1, z);
        m2.position.set(x2, y2, z);
        group.add(m1, m2);
        baseMeshes1.push(m1);
        baseMeshes2.push(m2);

        const l1 = makeLabel(b1, baseHex[b1] ?? 0xffffff);
        const l2 = makeLabel(b2, baseHex[b2] ?? 0xffffff);
        l1.position.copy(m1.position).add(new THREE.Vector3(0, 0, 0.001));
        l2.position.copy(m2.position).add(new THREE.Vector3(0, 0, 0.001));
        group.add(l1, 
            l2);

        const baseOp = (b1 === "A" && b2 === "T") || (b1 === "T" && b2 === "A") ? 0.55 : 0.85;
        const rung = new THREE.Mesh(rungGeom, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: baseOp, metalness: 0.0, roughness: 0.45, side: THREE.DoubleSide }));
        const mid = new THREE.Vector3().addVectors(m1.position, m2.position).multiplyScalar(0.5);
        rung.position.copy(mid);
        rung.lookAt(m2.position);
        rung.rotateX(Math.PI / 2);
        group.add(rung);
        rungMeshes.push(rung);
        rungBaseOpacity.push(baseOp);
    }

    const back1 = baseMeshes1.map(m => m.position.clone());
    const back2 = baseMeshes2.map(m => m.position.clone());
    const tubeGeom1 = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(back1), Math.max(12, N * 2), 0.055, 12, false);
    const tubeGeom2 = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(back2), Math.max(12, N * 2), 0.055, 12, false);
    const tubeMat = new THREE.MeshStandardMaterial({ color: 0x1b2347, metalness: 0.12, roughness: 0.6, side: THREE.DoubleSide });
    const tube1 = new THREE.Mesh(tubeGeom1, tubeMat);
    const tube2 = new THREE.Mesh(tubeGeom2, tubeMat);
    group.add(tube1, tube2);

    const box = new THREE.Box3().setFromObject(group);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    group.position.sub(sphere.center);

    const fovRad = THREE.MathUtils.degToRad(camera.fov);
    let baseDist = (sphere.radius * 1.65) / Math.max(1e-6, Math.tan(fovRad / 2));
    let preferredDist = baseDist;
    camera.position.set(baseDist, 0, 0);
    controls.target.set(0, 0, 0);
    controls.minDistance = baseDist * 0.5;
    controls.maxDistance = baseDist * 3.0;
    controls.update();

    const ringGeom = new THREE.TorusGeometry(0.26, 0.018, 16, 56);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
    const ring1 = new THREE.Mesh(ringGeom, ringMat);
    const ring2 = new THREE.Mesh(ringGeom, ringMat);
    ring1.visible = ring2.visible = false;
    group.add(ring1, ring2);

    let active = -1;
    let desiredZ = 0;
    let ringPulse = 1.0;
    const tmp = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);

    function focusZOfVisualIndex(vi) { baseMeshes1[vi].getWorldPosition(tmp); return tmp.z; }

    function setActiveImmediate(vi) {
        if (vi < 0 || vi >= N) return;

        if (active >= 0) {
            const p1 = baseMeshes1[active], p2 = baseMeshes2[active];
            if (p1) { p1.scale.set(1, 1, 1); p1.material.emissive.setHex(0x000000); p1.material.emissiveIntensity = 0; }
            if (p2) { p2.scale.set(1, 1, 1); p2.material.emissive.setHex(0x000000); p2.material.emissiveIntensity = 0; }
            const rPrev = rungMeshes[active];
            if (rPrev) rPrev.material.opacity = rungBaseOpacity[active];
        }

        active = vi;
        const p1 = baseMeshes1[vi], p2 = baseMeshes2[vi], rMesh = rungMeshes[vi];
        if (p1 && p2) {
            p1.scale.set(1.6, 1.6, 1.6);
            p2.scale.set(1.6, 1.6, 1.6);
            p1.material.emissive.setHex(0xffffff); p1.material.emissiveIntensity = 0.6;
            p2.material.emissive.setHex(0xffffff); p2.material.emissiveIntensity = 0.6;
            ring1.position.copy(p1.position);
            ring2.position.copy(p2.position);
            ring1.visible = ring2.visible = true;
            if (rMesh) rMesh.material.opacity = Math.min(1, rungBaseOpacity[vi] * 1.6);
        }
    }

    function toIndex(seqIndex) {
        const vi = REV ? (N - 1 - seqIndex) : seqIndex;
        if (vi < 0 || vi >= N) return;
        desiredZ = focusZOfVisualIndex(vi);
        setActiveImmediate(vi);
        camera.position.x = preferredDist;
        ringPulse = 1.9;
    }

    const fit = (() => {
        function frameAll() {
            const box = new THREE.Box3().setFromObject(group);
            const sphere = box.getBoundingSphere(new THREE.Sphere());
            group.position.sub(sphere.center);
            const fovRad = THREE.MathUtils.degToRad(camera.fov);
            baseDist = (sphere.radius * 1.65) / Math.max(1e-6, Math.tan(fovRad / 2));
            preferredDist = baseDist * 0.65;
            camera.position.set(preferredDist, 0, 0);
            controls.target.set(0, 0, 0);
            controls.minDistance = baseDist * 0.35;
            controls.maxDistance = baseDist * 2.2;
            controls.update();
        }
        function snapToIndex(seqIndex) {
            const vi = REV ? (N - 1 - seqIndex) : seqIndex;
            if (vi < 0 || vi >= N) return;
            const z = focusZOfVisualIndex(vi);
            controls.target.set(0, 0, SLIDE_SIGN * z);
            camera.position.set(preferredDist, 0, 0);
            controls.update();
            setActiveImmediate(vi);
            ringPulse = 1.0;
        }
        function handleResize() {
            const keepZ = controls.target.z;
            frameAll();
            controls.target.z = keepZ;
            controls.update();
        }
        return { frameAll, snapToIndex, handleResize };
    })();

    function resize() {
        const w = Math.max(mount.clientWidth, 320);
        const h = Math.max(mount.clientHeight, 280);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        fit.handleResize();
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    
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
            ringMat.opacity = THREE.MathUtils.lerp(ringMat.opacity, 0.8, 0.12);
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

        for (const spr of labelSprites) {
            const m = spr.material;
            if (m?.map) m.map.dispose?.();
            m?.dispose?.();
        }

        group.traverse(obj => {
            if (!obj) return;
            if (obj.geometry) obj.geometry.dispose?.();
            if (obj.material) {
                const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                for (const m of mats) {
                    if (!m) continue;
                    if (m.map) m.map.dispose?.();
                    if (m.alphaMap) m.alphaMap.dispose?.();
                    if (m.emissiveMap) m.emissiveMap.dispose?.();
                    m.dispose?.();
                }
            }
        });

        renderer.dispose();
        renderer.forceContextLoss?.();
        mount.innerHTML = "";
    }

    const start = (initialIndex != null) ? Math.max(0, Math.min(N - 1, initialIndex)) : Math.floor(N / 2);
    fit.frameAll();
    fit.snapToIndex(start);

    return { toIndex, refresh, pause, resume, dispose, snapToIndex: (i) => fit.snapToIndex(i), frameAll: fit.frameAll };
}