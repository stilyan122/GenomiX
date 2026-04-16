const CODON_TABLE = {
    TTT: 'Phe', TTC: 'Phe',
    TTA: 'Leu', TTG: 'Leu', CTT: 'Leu', CTC: 'Leu', CTA: 'Leu', CTG: 'Leu',
    ATT: 'Ile', ATC: 'Ile', ATA: 'Ile',
    ATG: 'Met',
    GTT: 'Val', GTC: 'Val', GTA: 'Val', GTG: 'Val',
    TCT: 'Ser', TCC: 'Ser', TCA: 'Ser', TCG: 'Ser', AGT: 'Ser', AGC: 'Ser',
    CCT: 'Pro', CCC: 'Pro', CCA: 'Pro', CCG: 'Pro',
    ACT: 'Thr', ACC: 'Thr', ACA: 'Thr', ACG: 'Thr',
    GCT: 'Ala', GCC: 'Ala', GCA: 'Ala', GCG: 'Ala',
    TAT: 'Tyr', TAC: 'Tyr',
    TAA: 'Stop', TAG: 'Stop', TGA: 'Stop',
    CAT: 'His', CAC: 'His',
    CAA: 'Gln', CAG: 'Gln',
    AAT: 'Asn', AAC: 'Asn',
    AAA: 'Lys', AAG: 'Lys',
    GAT: 'Asp', GAC: 'Asp',
    GAA: 'Glu', GAG: 'Glu',
    TGT: 'Cys', TGC: 'Cys',
    TGG: 'Trp',
    CGT: 'Arg', CGC: 'Arg', CGA: 'Arg', CGG: 'Arg', AGA: 'Arg', AGG: 'Arg',
    GGT: 'Gly', GGC: 'Gly', GGA: 'Gly', GGG: 'Gly',
};

const AA1 = {
    Phe: 'F', Leu: 'L', Ile: 'I', Met: 'M', Val: 'V', Ser: 'S', Pro: 'P',
    Thr: 'T', Ala: 'A', Tyr: 'Y', His: 'H', Gln: 'Q', Asn: 'N', Lys: 'K',
    Asp: 'D', Glu: 'E', Cys: 'C', Trp: 'W', Arg: 'R', Gly: 'G', Stop: '*',
};

const AA_CLASS = {
    Phe: 'nonpolar', Leu: 'nonpolar', Ile: 'nonpolar', Met: 'nonpolar', Val: 'nonpolar',
    Pro: 'nonpolar', Ala: 'nonpolar', Trp: 'nonpolar', Gly: 'nonpolar',
    Ser: 'polar', Thr: 'polar', Tyr: 'polar', Asn: 'polar', Gln: 'polar', Cys: 'polar',
    Lys: 'basic', Arg: 'basic', His: 'basic',
    Asp: 'acidic', Glu: 'acidic',
    Stop: 'stop',
};

function translate(dnaRaw) {
    const seq = dnaRaw.toUpperCase().replace(/[^ATCG]/g, '');
    if (seq.length < 3) return { error: 'tooShort', seq };

    const startIdx = seq.indexOf('ATG');
    if (startIdx === -1) return { error: 'noStart', seq };

    const codons = [];
    for (let i = startIdx; i + 2 < seq.length; i += 3) {
        const codon = seq.slice(i, i + 3);
        const aa = CODON_TABLE[codon] ?? '???';
        codons.push({ codon, aa, pos: i, isStart: i === startIdx });
        if (aa === 'Stop') break;
    }

    const aas = codons.filter(c => c.aa !== 'Stop' && c.aa !== '???');
    const stopCodon = codons.find(c => c.aa === 'Stop');
    const frame = (startIdx % 3) + 1;

    return {
        seq,
        startIdx,
        codons,
        proteinLength: aas.length,
        protein: aas.map(c => AA1[c.aa] ?? '?').join(''),
        stopCodon: stopCodon?.codon ?? null,
        frame,
        hasStop: !!stopCodon,
        preSeq: seq.slice(0, startIdx),
    };
}

function buildCodonBlock(entry) {
    const { codon, aa, isStart } = entry;
    const cls = AA_CLASS[aa] ?? 'nonpolar';
    const one = AA1[aa] ?? '?';
    const mRNA = codon.replace(/T/g, 'U');

    const div = document.createElement('div');
    div.className = `gx-codon gx-codon--${cls}${isStart ? ' gx-codon--start' : ''}`;

    div.innerHTML = `
        <div class="gx-codon__dna mono">${codon}</div>
        <div class="gx-codon__arrow">↓</div>
        <div class="gx-codon__mrna mono">${mRNA}</div>
        <div class="gx-codon__aa">${aa === 'Stop' ? '●' : one}</div>
        <div class="gx-codon__name">${aa}</div>
        ${isStart ? '<div class="gx-codon__badge gx-codon__badge--start">START</div>' : ''}
        ${aa === 'Stop' ? '<div class="gx-codon__badge gx-codon__badge--stop">STOP</div>' : ''}
    `;
    return div;
}
function buildUTRBlock(seq) {
    if (!seq) return null;
    const show = seq.length > 9 ? `…${seq.slice(-9)}` : seq;
    const div = document.createElement('div');
    div.className = 'gx-codon gx-codon--utr';
    div.innerHTML = `
        <div class="gx-codon__dna mono gx-codon__dna--utr">${show}</div>
        <div class="gx-codon__name">5′ UTR</div>
    `;
    return div;
}

function renderTranslation(result) {
    const track = document.getElementById('gx-codon-track');
    const noStart = document.getElementById('gx-tr-nostart');
    const seqWrap = document.getElementById('gx-protein-seq-wrap');
    const seqEl = document.getElementById('gx-protein-seq');
    const statAA = document.getElementById('gx-tr-aacount');
    const statPos = document.getElementById('gx-tr-startpos');
    const statStop = document.getElementById('gx-tr-stopcodon');
    const statFr = document.getElementById('gx-tr-frame');

    if (!track) return;
    track.innerHTML = '';
    noStart && (noStart.hidden = true);
    seqWrap && (seqWrap.hidden = true);

    if (result.error === 'noStart' || result.error === 'tooShort') {
        noStart && (noStart.hidden = false);
        if (statAA) statAA.textContent = '—';
        if (statPos) statPos.textContent = '—';
        if (statStop) statStop.textContent = '—';
        if (statFr) statFr.textContent = '—';
        return;
    }

    if (statAA) statAA.textContent = result.proteinLength;
    if (statPos) statPos.textContent = `bp ${result.startIdx + 1}`;
    if (statStop) statStop.textContent = result.stopCodon ?? '(none)';
    if (statFr) statFr.textContent = `+${result.frame}`;

    const utrBlock = buildUTRBlock(result.preSeq);
    if (utrBlock) {
        track.appendChild(utrBlock);
        const sep = document.createElement('div');
        sep.className = 'gx-codon-sep';
        track.appendChild(sep);
    }

    result.codons.forEach((entry, i) => {
        track.appendChild(buildCodonBlock(entry));
        if (i < result.codons.length - 1 && entry.aa !== 'Stop') {
            const bond = document.createElement('div');
            bond.className = 'gx-codon-bond';
            bond.title = 'Peptide bond';
            track.appendChild(bond);
        }
    });

    if (result.protein && seqWrap && seqEl) {
        seqEl.textContent = result.protein;
        seqWrap.hidden = false;
    }
}

function initTranslate() {
    const btn = document.getElementById('translate-btn');
    const panel = document.getElementById('gx-translate-panel');
    const close = document.getElementById('gx-tr-close');
    const copyBtn = document.getElementById('gx-tr-copy');
    const mount = document.getElementById('dnaMount');

    if (!btn || !panel || !mount) return;

    let translated = false;

    btn.addEventListener('click', () => {
        if (!panel.hidden) {
            panel.hidden = true;
            btn.classList.remove('is-active');
            return;
        }

        const s1 = mount.dataset.s1 ?? '';
        const result = translate(s1);
        renderTranslation(result);
        translated = true;

        panel.hidden = false;
        btn.classList.add('is-active');
        setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    });

    close?.addEventListener('click', () => {
        panel.hidden = true;
        btn.classList.remove('is-active');
    });

    copyBtn?.addEventListener('click', async () => {
        const seq = document.getElementById('gx-protein-seq')?.textContent ?? '';
        if (!seq) return;
        try {
            await navigator.clipboard.writeText(seq);
            const orig = copyBtn.textContent;
            copyBtn.textContent = copyBtn.closest('[data-copied]')?.dataset.copied
                ?? (document.documentElement.lang?.startsWith('bg') ? '✓ Копирано' : '✓ Copied');
            setTimeout(() => { copyBtn.textContent = orig; }, 1600);
        } catch { }
    });
}

document.addEventListener('DOMContentLoaded', initTranslate);
