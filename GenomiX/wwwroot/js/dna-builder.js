import {
    parseTextareaStrict, parseFileStrict,
    purinePyrimidine, countBases, gcContent, tmWallace, codonAt
} from "./dna-utils.js";

import * as THREE from "https://esm.sh/three@0.159.0";
import { OrbitControls } from "https://esm.sh/three@0.159.0/examples/jsm/controls/OrbitControls.js";

let lastS1 = null;
let lastS2 = null;

let ladderEl = null;
let containerForLadder = null;
let tooltipEl = null;
let progressEl = null;
let progressContainerEl = null;
let prevEl = null;
let nextEl = null;

document.addEventListener("DOMContentLoaded", () => {
    const dnaSequenceInput = document.getElementById("sequence");
    const importBtn = document.getElementById("import-btn");
    const visualizeBtn = document.getElementById("visualize-btn");
    const visualizer = document.getElementById("dna-visual");
    const dnaInputSection = document.getElementById("dna-input-section");
    const dnaVisualizerSection = document.getElementById("dna-visualizer-section");
    const modeBasic = document.getElementById("basicMode");
    const modeSci = document.getElementById("scientificMode");

    importBtn?.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".txt,.json";
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;
            const r = new FileReader();
            r.onload = ev => {
                const res = parseFileStrict(String(ev.target.result || ""));
                if (!res.ok) { alert(res.error); return; }
                dnaSequenceInput.value = `${res.s1}\n${res.s2}`;
            };
            r.readAsText(file);
        };
        input.click();
    });

    visualizeBtn?.addEventListener("click", () => {
        const res = parseTextareaStrict(dnaSequenceInput.value);
        if (!res.ok) { alert(res.error); return; }

        dnaInputSection.style.display = "none";
        dnaVisualizerSection.style.display = "block";

        lastS1 = res.s1;
        lastS2 = res.s2;

        visualizeDNA(res.s1, res.s2, { scientific: !!modeSci?.checked });
    });

    modeBasic?.addEventListener("change", () => rerenderForMode());
    modeSci?.addEventListener("change", () => rerenderForMode());

    function rerenderForMode() {
        const sci = !!modeSci?.checked;
        if (lastS1 && lastS2) {
            visualizeDNA(lastS1, lastS2, { scientific: sci });
            return;
        }
        if (!dnaSequenceInput) return;
        const res = parseTextareaStrict(dnaSequenceInput.value);
        if (res.ok) {
            lastS1 = res.s1; lastS2 = res.s2;
            visualizeDNA(res.s1, res.s2, { scientific: sci });
        }
    }
});

function visualizeDNA(strand1, strand2, { scientific = false } = {}) {
    const visualizer = document.getElementById("dna-visual");
    visualizer.innerHTML = "";
    visualizer.classList.toggle("mode--sci", scientific);

    ladderEl = null;
    containerForLadder = null;
    tooltipEl = null;
    progressEl = null;
    progressContainerEl = null;
    prevEl = null;
    nextEl = null;

    let panelRefs = null;
    let threeApi = null; 

    if (scientific) {
        const shell = document.createElement("div");
        shell.className = "dna-shell";

        const left = document.createElement("div");
        left.className = "dna-left";

        const toggle = document.createElement("div");
        toggle.className = "sci-viewtoggle";
        toggle.innerHTML = `
      <button class="sci-tab is-active" data-view="2d">2D Ladder</button>
      <button class="sci-tab" data-view="3d">3D Helix</button>
    `;

        const ladderWrap = document.createElement("div");
        ladderWrap.className = "dna-ladder-wrap";

        const threeWrap = document.createElement("div");
        threeWrap.className = "dna-3dwrap hidden";

        left.appendChild(toggle);
        left.appendChild(ladderWrap);
        left.appendChild(threeWrap);

        const panel = document.createElement("aside");
        panel.className = "dna-science";
        panel.innerHTML = `
      <div class="sci-section">
        <h4>Overview</h4>
        <div class="sci-stats">
          <div><span>Length</span><strong id="s_len">0</strong></div>
          <div><span>GC%</span><strong id="s_gc">0%</strong></div>
          <div><span>Tm (°C)</span><strong id="s_tm">0</strong></div>
          <div><span>A:C:G:T</span><strong id="s_comp">-</strong></div>
        </div>
      </div>
      <div class="sci-section">
        <h4>Active base</h4>
        <div class="sci-active">
          <div><span>Index</span><strong id="s_idx">-</strong></div>
          <div><span>Pair</span><strong id="s_pair">-</strong></div>
          <div><span>Bonds</span><strong id="s_bonds">-</strong></div>
          <div><span>Pur/Pyr</span><strong id="s_type">-</strong></div>
        </div>
      </div>
      <div class="sci-section">
        <h4>Codon (frame 0)</h4>
        <div class="sci-codon">
          <div><span>mRNA</span><strong id="s_codon">-</strong></div>
          <div><span>AA</span><strong id="s_aa">-</strong></div>
        </div>
      </div>
    `;

        panelRefs = {
            s_len: panel.querySelector("#s_len"),
            s_gc: panel.querySelector("#s_gc"),
            s_tm: panel.querySelector("#s_tm"),
            s_comp: panel.querySelector("#s_comp"),
            s_idx: panel.querySelector("#s_idx"),
            s_pair: panel.querySelector("#s_pair"),
            s_bonds: panel.querySelector("#s_bonds"),
            s_type: panel.querySelector("#s_type"),
            s_codon: panel.querySelector("#s_codon"),
            s_aa: panel.querySelector("#s_aa"),
        };

        const ladder = document.createElement("div");
        ladder.className = "dna-ladder";
        ladderWrap.appendChild(ladder);

        shell.appendChild(left);
        shell.appendChild(panel);
        visualizer.appendChild(shell);

        containerForLadder = ladderWrap;
        ladderEl = ladder;

        const overlay = document.createElement("div");
        overlay.className = "dna-overlay";
        const tip = document.createElement("div");
        tip.className = "dna-tooltip";
        tip.textContent = "Ready.";
        overlay.appendChild(tip);
        ladderWrap.appendChild(overlay);

        const progCont = document.createElement("div");
        progCont.className = "progress-container";
        const progBar = document.createElement("div");
        progBar.className = "progress-bar";
        progCont.appendChild(progBar);
        ladderWrap.appendChild(progCont);

        const prevBtn = document.createElement("button");
        const nextBtn = document.createElement("button");
        prevBtn.className = "dna-nav"; nextBtn.className = "dna-nav";
        prevBtn.id = "prev-base"; nextBtn.id = "next-base";
        prevBtn.textContent = "⟨"; nextBtn.textContent = "⟩";
        ladderWrap.appendChild(prevBtn);
        ladderWrap.appendChild(nextBtn);

        tooltipEl = tip;
        progressEl = progBar;
        progressContainerEl = progCont;
        prevEl = prevBtn;
        nextEl = nextBtn;

        function ensure3D(idx) {
          if (!threeApi) {
            threeApi = mountHelix3D(strand1, strand2, threeWrap, idx ?? current);
          }
        }

        const [tab2d, tab3d] = toggle.querySelectorAll(".sci-tab");
        tab2d.addEventListener("click", () => {
            tab2d.classList.add("is-active");
            tab3d.classList.remove("is-active");
            threeWrap.classList.add("hidden");
            ladderWrap.classList.remove("hidden");
            containerForLadder = ladderWrap;
            if (threeApi) threeApi.pause();
            ladderWrap.appendChild(overlay);
            ladderWrap.appendChild(progCont);
            ladderWrap.appendChild(prevBtn);
            ladderWrap.appendChild(nextBtn);
            updateView();
        });

        tab3d.addEventListener("click", () => {
            tab3d.classList.add("is-active");
            tab2d.classList.remove("is-active");
            ladderWrap.classList.add("hidden");
            threeWrap.classList.remove("hidden");

            ensure3D(current);          
            containerForLadder = threeWrap;
            threeWrap.appendChild(overlay);
            threeWrap.appendChild(progCont);
            threeWrap.appendChild(prevBtn);
            threeWrap.appendChild(nextBtn);

            threeApi.refresh?.();
            threeApi.toIndex?.(current); 
            updateView();
        });

        const comp = countBases(strand1);
        panelRefs.s_len.textContent = String(strand1.length);
        panelRefs.s_gc.textContent = (gcContent(strand1) * 100).toFixed(1) + "%";
        panelRefs.s_tm.textContent = String(tmWallace(strand1));
        panelRefs.s_comp.textContent = `${comp.A}:${comp.C}:${comp.G}:${comp.T}`;

        visualizer._dispose3D?.();
        visualizer._dispose3D = () => { if (threeApi) { threeApi.dispose(); threeApi = null; } };
    } else {
        const ladder = document.createElement("div");
        ladder.className = "dna-ladder";
        visualizer.appendChild(ladder);

        containerForLadder = visualizer;
        ladderEl = ladder;

        const overlay = document.createElement("div");
        overlay.className = "dna-overlay";
        const tip = document.createElement("div");
        tip.className = "dna-tooltip";
        tip.textContent = "Ready.";
        overlay.appendChild(tip);
        visualizer.appendChild(overlay);

        const progCont = document.createElement("div");
        progCont.className = "progress-container";
        const progBar = document.createElement("div");
        progBar.className = "progress-bar";
        progCont.appendChild(progBar);
        visualizer.appendChild(progCont);

        const prevBtn = document.createElement("button");
        const nextBtn = document.createElement("button");
        prevBtn.className = "dna-nav"; nextBtn.className = "dna-nav";
        prevBtn.id = "prev-base"; nextBtn.id = "next-base";
        prevBtn.textContent = "⟨"; nextBtn.textContent = "⟩";
        visualizer.appendChild(prevBtn);
        visualizer.appendChild(nextBtn);

        tooltipEl = tip;
        progressEl = progBar;
        progressContainerEl = progCont;
        prevEl = prevBtn;
        nextEl = nextBtn;

        visualizer._dispose3D?.();
        visualizer._dispose3D = null;
    }

    const pairs = [];
    for (let i = 0; i < strand1.length; i++) {
        const pair = document.createElement("div");
        pair.className = "base-pair";
        const top = document.createElement("div");
        top.className = `base ${strand1[i]}`;
        top.textContent = strand1[i];
        const bot = document.createElement("div");
        bot.className = `base ${strand2[i]}`;
        bot.textContent = strand2[i];
        pair.appendChild(top);
        pair.appendChild(bot);
        ladderEl.appendChild(pair);
        pairs.push(pair);
    }

    let current = Math.floor(strand1.length / 2);

    function measureStep() {
        const sample = ladderEl.querySelector(".base-pair");
        if (!sample) return 52;
        const s = getComputedStyle(sample);
        return sample.offsetWidth + parseFloat(s.marginLeft) + parseFloat(s.marginRight);
    }

    function edgeTranslateX(idx) {
        const step = measureStep();
        const totalWidth = pairs.length * step;
        const viewWidth = containerForLadder.clientWidth;
        const targetCenter = (idx + 0.5) * step;
        let tx = viewWidth / 2 - targetCenter;
        const edgeOffset = Math.min(viewWidth * 0.25, 40);
        const maxTx = edgeOffset;
        const minTx = viewWidth - totalWidth - edgeOffset;
        if (totalWidth <= viewWidth) tx = (viewWidth - totalWidth) / 2;
        else tx = Math.max(minTx, Math.min(maxTx, tx));
        return tx;
    }

    function updateView() {
        if (!ladderEl) return;

        // keep 3D in sync (only when threeApi exists)
        if (threeApi && typeof threeApi.toIndex === "function") {
            threeApi.toIndex(current); // smooth focus + bigger highlight
        }

        ladderEl.style.transform = `translateX(${edgeTranslateX(current)}px) translateY(-50%)`;

        pairs.forEach(p => p.classList.remove("active"));
        const active = pairs[current];
        if (active) {
            active.classList.add("active");
            const b1 = strand1[current], b2 = strand2[current];
            const h = (b1 === "A" && b2 === "T") || (b1 === "T" && b2 === "A") ? 2 :
                (b1 === "C" && b2 === "G") || (b1 === "G" && b2 === "C") ? 3 : "-";

            if (tooltipEl) tooltipEl.textContent = `Base ${current + 1}: ${b1}–${b2} (${h} H)`;

            if (panelRefs) {
                panelRefs.s_idx.textContent = String(current + 1);
                panelRefs.s_pair.textContent = `${b1}–${b2}`;
                panelRefs.s_bonds.textContent = String(h);
                panelRefs.s_type.textContent = `${purinePyrimidine(b1)}/${purinePyrimidine(b2)}`;
                const { codon, aa } = codonAt(strand1, current, 0);
                panelRefs.s_codon.textContent = codon || "-";
                panelRefs.s_aa.textContent = aa || "-";
            }
        }

        if (progressEl) progressEl.style.width = `${((current + 1) / pairs.length) * 100}%`;
    }

    nextEl?.addEventListener("click", () => {
        if (current < pairs.length - 1) current++;
        updateView();
    });

    prevEl?.addEventListener("click", () => {
        if (current > 0) current--;
        updateView();
    });

    progressContainerEl?.addEventListener("click", e => {
        const rect = progressContainerEl.getBoundingClientRect();
        current = Math.round(((e.clientX - rect.left) / rect.width) * (pairs.length - 1));
        updateView();
    });

    window.addEventListener("resize", updateView, { passive: true });

    updateView();
}

function mountHelix3D(strand1, strand2, mount, initialIndex = null) {
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
    controls.rotateSpeed = 0.9;
    renderer.domElement.style.touchAction = "none";

    const ambient = new THREE.AmbientLight(0xffffff, 0.95);
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(4, 6, 8);
    scene.add(ambient, dir);

    const group = new THREE.Group();
    scene.add(group);

    // geometry / palette
    const r = 0.70;
    const perTurn = 10.5;
    const thetaStep = (Math.PI * 2) / perTurn;
    const rise = 0.25;

    // === ROTATION SENSE: use negative angle for proper right-handed DNA ===
    const handedSign = -1; // flip to make it right-handed (left→right as you go forward)

    const baseHex = { A: 0xff4b4b, T: 0xffd54b, C: 0x4ba3ff, G: 0x4bff88 };

    const baseGeom = new THREE.SphereGeometry(0.14, 24, 24);     // a bit larger
    const rungGeom = new THREE.CylinderGeometry(0.06, 0.06, 2 * r, 16); // thicker rungs

    const baseMeshes1 = [], baseMeshes2 = [];
    const rungMeshes = [], rungBaseOpacity = [];

    function relLum(hex) {
        const rr = (hex >> 16) & 255, gg = (hex >> 8) & 255, bb = hex & 255;
        const toLin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) };
        return 0.2126 * toLin(rr) + 0.7152 * toLin(gg) + 0.0722 * toLin(bb);
    }
    function textColor(hex) { return (relLum(hex) > 0.60 ? "#111111" : "#ffffff"); }
    function makeLabel(letter, colorHex) {
        const s = 96, c = document.createElement("canvas"); c.width = s; c.height = s;
        const ctx = c.getContext("2d");
        ctx.clearRect(0, 0, s, s);
        ctx.shadowColor = "rgba(0,0,0,0.65)";
        ctx.shadowBlur = 8;
        ctx.fillStyle = textColor(colorHex);
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.lineWidth = 3;
        ctx.font = "bold 64px sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.strokeText(letter, s / 2, s / 2);
        ctx.fillText(letter, s / 2, s / 2);
        const tex = new THREE.CanvasTexture(c); tex.anisotropy = 8;
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false });
        const spr = new THREE.Sprite(mat); spr.scale.set(0.34, 0.34, 0.34); spr.renderOrder = 999;
        return spr;
    }

    for (let i = 0; i < strand1.length; i++) {
        const ang = handedSign * i * thetaStep;     // ← handedness fix
        const z = i * rise;
        const x1 = r * Math.cos(ang), y1 = r * Math.sin(ang);
        const x2 = -x1, y2 = -y1;

        const b1 = strand1[i], b2 = strand2[i];

        const m1 = new THREE.Mesh(
            baseGeom, new THREE.MeshStandardMaterial({ color: baseHex[b1] ?? 0xffffff, metalness: 0.05, roughness: 0.35 })
        );
        const m2 = new THREE.Mesh(
            baseGeom, new THREE.MeshStandardMaterial({ color: baseHex[b2] ?? 0xffffff, metalness: 0.05, roughness: 0.35 })
        );
        m1.position.set(x1, y1, z); m2.position.set(x2, y2, z);
        group.add(m1, m2);
        baseMeshes1.push(m1); baseMeshes2.push(m2);

        const s1 = makeLabel(b1, baseHex[b1] ?? 0xffffff);
        const s2 = makeLabel(b2, baseHex[b2] ?? 0xffffff);
        s1.position.copy(m1.position).add(new THREE.Vector3(0, 0, 0.001));
        s2.position.copy(m2.position).add(new THREE.Vector3(0, 0, 0.001));
        group.add(s1, s2);

        const baseOp = (b1 === "A" && b2 === "T") || (b1 === "T" && b2 === "A") ? 0.55 : 0.85;
        const rung = new THREE.Mesh(
            rungGeom,
            new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: baseOp, metalness: 0.0, roughness: 0.45 })
        );
        const mid = new THREE.Vector3().addVectors(m1.position, m2.position).multiplyScalar(0.5);
        rung.position.copy(mid); rung.lookAt(m2.position); rung.rotateX(Math.PI / 2);
        group.add(rung); rungMeshes.push(rung); rungBaseOpacity.push(baseOp);
    }

    // backbones (dark, so bases pop)
    const back1 = baseMeshes1.map(m => m.position.clone());
    const back2 = baseMeshes2.map(m => m.position.clone());
    const tubeGeom1 = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(back1), Math.max(12, strand1.length * 2), 0.055, 12, false);
    const tubeGeom2 = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(back2), Math.max(12, strand1.length * 2), 0.055, 12, false);
    const tubeMat = new THREE.MeshStandardMaterial({ color: 0x1b2347, metalness: 0.12, roughness: 0.6 });
    const tube1 = new THREE.Mesh(tubeGeom1, tubeMat);
    const tube2 = new THREE.Mesh(tubeGeom2, tubeMat);
    group.add(tube1, tube2);

    // center & horizontal layout (camera on +X)
    const box = new THREE.Box3().setFromObject(group);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    group.position.sub(sphere.center);

    const fovRad = THREE.MathUtils.degToRad(camera.fov);
    const baseDist = (sphere.radius * 1.65) / Math.max(1e-6, Math.tan(fovRad / 2));
    camera.position.set(baseDist, 0, 0);
    controls.target.set(0, 0, 0);
    controls.minDistance = baseDist * 0.5;
    controls.maxDistance = baseDist * 3.0;
    controls.update();

    // BIGGER, CLEARER HIGHLIGHT
    const ringGeom = new THREE.TorusGeometry(0.26, 0.018, 16, 56); // larger radius & tube
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
    const ring1 = new THREE.Mesh(ringGeom, ringMat);
    const ring2 = new THREE.Mesh(ringGeom, ringMat);
    ring1.visible = ring2.visible = false;
    group.add(ring1, ring2);

    // selection / animation state
    let active = -1;
    let desiredZ = 0;
    let ringPulse = 1.0;
    const tmp = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);

    function focusZOfIndex(i) {
        baseMeshes1[i].getWorldPosition(tmp);
        return tmp.z;
    }

    function setActiveImmediate(i) {
        if (i < 0 || i >= strand1.length) return;

        // clear previous
        if (active >= 0) {
            const p1 = baseMeshes1[active], p2 = baseMeshes2[active];
            if (p1) { p1.scale.set(1, 1, 1); p1.material.emissive.setHex(0x000000); p1.material.emissiveIntensity = 0; }
            if (p2) { p2.scale.set(1, 1, 1); p2.material.emissive.setHex(0x000000); p2.material.emissiveIntensity = 0; }
            const rPrev = rungMeshes[active];
            if (rPrev) rPrev.material.opacity = rungBaseOpacity[active];
        }

        active = i;

        const p1 = baseMeshes1[i], p2 = baseMeshes2[i], r = rungMeshes[i];
        if (p1 && p2) {
            p1.scale.set(1.6, 1.6, 1.6);
            p2.scale.set(1.6, 1.6, 1.6);
            p1.material.emissive.setHex(0xffffff); p1.material.emissiveIntensity = 0.6;
            p2.material.emissive.setHex(0xffffff); p2.material.emissiveIntensity = 0.6;

            ring1.position.copy(p1.position);
            ring2.position.copy(p2.position);
            ring1.visible = ring2.visible = true;

            if (r) r.material.opacity = Math.min(1, rungBaseOpacity[i] * 1.6);
        }
    }

    // smooth focus movement + pulse highlight
    function toIndex(i) {
        if (i < 0 || i >= strand1.length) return;
        desiredZ = focusZOfIndex(i);      // target z
        setActiveImmediate(i);            // update highlight immediately
        ringPulse = 1.9;                  // start with a big pulse and decay in animate()
    }

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

    function animate() {
        requestAnimationFrame(animate);

        // smooth slide of focus along helix axis
        controls.target.z = THREE.MathUtils.lerp(controls.target.z, desiredZ, 0.18);
        controls.update();

        // pulse the highlight ring a bit for visibility
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
    function pause() { /* keep render loop for smooth transitions; no-op here */ }
    function resume() { /* no-op; animation loop is continuous */ }
    function dispose() {
        ro.disconnect();
        renderer.dispose();
        mount.innerHTML = "";
        baseGeom.dispose(); rungGeom.dispose();
        tubeGeom1.dispose(); tubeGeom2.dispose();
        ringGeom.dispose();
    }

    // initial focus
    const start = (initialIndex != null)
        ? Math.max(0, Math.min(strand1.length - 1, initialIndex))
        : Math.floor(strand1.length / 2);

    desiredZ = focusZOfIndex(start);
    setActiveImmediate(start);

    return { toIndex, refresh, pause, resume, dispose };
}
