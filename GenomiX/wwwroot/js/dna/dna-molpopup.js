import * as THREE from "https://esm.sh/three@0.159.0";
import { OrbitControls } from "https://esm.sh/three@0.159.0/examples/jsm/controls/OrbitControls.js";

const E = {
    H: { color: 0xffffff, r: 0.045 },
    C: { color: 0x7f7f7f, r: 0.078 },
    N: { color: 0x3a74ff, r: 0.082 },
    O: { color: 0xff3a3a, r: 0.082 },
    P: { color: 0xffa024, r: 0.102 },
};
const ATOM_SEG = 18;
const BOND_SEG = 10;

function atom(el) {
    const g = new THREE.SphereGeometry(E[el].r, ATOM_SEG, ATOM_SEG);
    const m = new THREE.MeshStandardMaterial({ color: E[el].color, metalness: 0.08, roughness: 0.35 });
    return new THREE.Mesh(g, m);
}
function bond(a, b, radius = 0.026, color = 0xeaf1ff) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const g = new THREE.CylinderGeometry(radius, radius, Math.max(0.0001, len), BOND_SEG);
    const m = new THREE.MeshStandardMaterial({ color, metalness: 0, roughness: 0.6 });
    const c = new THREE.Mesh(g, m);
    c.position.copy(a).addScaledVector(dir, 0.5);
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return c;
}

export function openMoleculePopup({ title, build }) {
    const root = document.createElement("div");
    root.className = "gx-molpop";
    root.innerHTML = `
    <div class="gx-molpop__card">
      <div class="gx-molpop__hd">
        <div class="gx-molpop__title">${title}</div>
        <button class="gx-btn gx-btn--primary" type="button" id="gxMolClose">Close</button>
      </div>
      <div class="gx-molpop__body"><div class="gx-molpop__mount" id="gxMolMount"></div></div>
    </div>
  `;
    document.body.appendChild(root);

    const mount = root.querySelector("#gxMolMount");
    const closeBtn = root.querySelector("#gxMolClose");

    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 2000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = true;
    controls.zoomSpeed = 1.1;
    controls.rotateSpeed = 0.85;
    renderer.domElement.style.touchAction = "none";

    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const key = new THREE.DirectionalLight(0xffffff, 1.15); key.position.set(6, 10, 10); scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.55); fill.position.set(-8, 3, 6); scene.add(fill);

    const group = new THREE.Group();
    scene.add(group);

    build({ THREE, group, atom, bond });

    const box = new THREE.Box3().setFromObject(group);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    group.position.sub(sphere.center);

    const fovRad = THREE.MathUtils.degToRad(camera.fov);
    const dist = (sphere.radius * 1.9) / Math.max(1e-6, Math.tan(fovRad / 2));
    camera.position.set(dist, 0, 0);
    controls.target.set(0, 0, 0);
    controls.minDistance = dist * 0.15;
    controls.maxDistance = dist * 10;
    controls.update();

    function resize() {
        const w = Math.max(mount.clientWidth, 320);
        const h = Math.max(mount.clientHeight, 240);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    let raf = 0;
    let running = true;
    const loop = () => {
        if (!running) return;
        raf = requestAnimationFrame(loop);
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
        root.remove();
    }

    closeBtn?.addEventListener("click", dispose);
    root.addEventListener("pointerdown", (e) => { if (e.target === root) dispose(); });

    return { dispose };
}
