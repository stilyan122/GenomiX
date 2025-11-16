export const COMPLEMENT = { A: "T", T: "A", C: "G", G: "C" };

const CODON_TABLE = {
    UUU: "F", UUC: "F", UUA: "L", UUG: "L", CUU: "L", CUC: "L", CUA: "L", CUG: "L",
    AUU: "I", AUC: "I", AUA: "I", AUG: "M", GUU: "V", GUC: "V", GUA: "V", GUG: "V",
    UCU: "S", UCC: "S", UCA: "S", UCG: "S", CCU: "P", CCC: "P", CCA: "P", CCG: "P",
    ACU: "T", ACC: "T", ACA: "T", ACG: "T", GCU: "A", GCC: "A", GCA: "A", GCG: "A",
    UAU: "Y", UAC: "Y", UAA: "*", UAG: "*", CAU: "H", CAC: "H", CAA: "Q", CAG: "Q",
    AAU: "N", AAC: "N", AAA: "K", AAG: "K", GAU: "D", GAC: "D", GAA: "E", GAG: "E",
    UGU: "C", UGC: "C", UGA: "*", UGG: "W", CGU: "R", CGC: "R", CGA: "R", CGG: "R",
    AGU: "S", AGC: "S", AGA: "R", AGG: "R", GGU: "G", GGC: "G", GGA: "G", GGG: "G"
};

const ACTG_RX = /^[ACGT]+$/;

const RNA_MAP = { A: "U", T: "A", C: "G", G: "C" };

export function normalizeLine(line = "") {
    const raw = String(line || "");
    const upper = raw.toUpperCase().trim();
    const compact = upper.replace(/\s+/g, "");
    return { upper, compact };
}

export function findInvalidDNA(compact) {
    if (!compact)
        return {
            invalid: [], firstIdx: -1
        };

    if (ACTG_RX.test(compact))
        return {
            invalid: [], firstIdx: -1
        };

    const invalidSet = new Set();
    let firstIdx = -1;

    for (let i = 0; i < compact.length; i++) {
        const ch = compact[i];

        if (!COMPLEMENT[ch]) {
            invalidSet.add(ch);

            if (firstIdx === -1)
                firstIdx = i;
        }
    }
    return { invalid: [...invalidSet], firstIdx };
}

export function generateComplement(strand) {
    return (strand || "")
        .split("")
        .map(b => COMPLEMENT[b] || "")
        .join("");
}

export function checkComplementarity(s1 = "", s2 = "") {
    const n = Math.min(s1.length, s2.length);
    for (let i = 0; i < n; i++) {
        const exp = COMPLEMENT[s1[i]] || "";
        const got = s2[i];
        if (exp !== got) {
            return { ok: false, firstMismatch: i, expected: exp, got };
        }
    }
    return { ok: s1.length === s2.length };
}

export function parseTextareaStrict(text = "") {
    const lines = String(text || "")
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l.length > 0);

    if (lines.length === 0)
        return {
            ok: false, error: "No sequence provided."
        }; 

    if (lines.length > 2) {
        return {
            ok: false, error: "Provide one strand (we’ll generate the complement) or two strands on two lines."
        };
    }

    const L1 = normalizeLine(lines[0]);
    const inv1 = findInvalidDNA(L1.compact);

    if (inv1.invalid.length) {
        return {
            ok: false, error: `Invalid characters in strand 1 at pos ${inv1.firstIdx + 1}: ${inv1.invalid.join(", ")}. Allowed: A, C, G, T.`
        };
    }

    if (lines.length === 1) {
        const s1 = L1.compact;
        const s2 = generateComplement(s1);

        return {
            ok: true, s1, s2
        };
    }

    const L2 = normalizeLine(lines[1]);
    const inv2 = findInvalidDNA(L2.compact);

    if (inv2.invalid.length) {
        return {
            ok: false, error: `Invalid characters in strand 2 at pos ${inv2.firstIdx + 1}: ${inv2.invalid.join(", ")}. Allowed: A, C, G, T.`
        };
    }

    if (L1.compact.length !== L2.compact.length) {
        return {
            ok: false, error: `Strands must have equal lengths. Got ${L1.compact.length} and ${L2.compact.length}.`
        };
    }

    const comp = checkComplementarity(L1.compact, L2.compact);

    if (!comp.ok) {
        return {
            ok: false,
            error: `Strands are not complementary at position ${comp.firstMismatch + 1}. Expected ${comp.expected} (complement of ${L1.compact[comp.firstMismatch]}), got ${comp.got}.`
        };
    }

    return { ok: true, s1: L1.compact, s2: L2.compact };
}

export function parseFileStrict(content = "") {
    let parsed;
    try {
        parsed = JSON.parse(content);
    } catch {
        parsed = null;
    }

    if (parsed && typeof parsed === "object") {
        const keys = Object.keys(parsed);
        const pick = (rx) => keys.find(k => rx.test(k.trim()));
        const k1 = pick(/^(dna|sequence|seq|strand1|forward|seq1)$/i);
        const k2 = pick(/^(strand2|reverse|seq2)$/i);

        const line1 = k1 ? String(parsed[k1] || "") : "";
        const line2 = k2 ? String(parsed[k2] || "") : "";

        if (!line1 && !line2 && keys.length === 1) {
            const only = String(parsed[keys[0]] || "");
            const n1 = normalizeLine(only);
            const inv = findInvalidDNA(n1.compact);

            if (inv.invalid.length) {
                return {
                    ok: false, error: `Invalid characters in JSON strand at pos ${inv.firstIdx + 1}: ${inv.invalid.join(", ")}`
                };
            }

            return {
                ok: true, s1: n1.compact, s2: generateComplement(n1.compact)
            };
        }

        if (line1 && !line2) {
            const n1 = normalizeLine(line1);
            const inv = findInvalidDNA(n1.compact);

            if (inv.invalid.length) {
                return {
                    ok: false, error: `Invalid characters in JSON strand1 at pos ${inv.firstIdx + 1}: ${inv.invalid.join(", ")}`
                };
            }

            return {
                ok: true, s1: n1.compact, s2: generateComplement(n1.compact)
            };
        }

        if (line1 && line2) {
            const n1 = normalizeLine(line1), n2 = normalizeLine(line2);
            const inv1 = findInvalidDNA(n1.compact), inv2 = findInvalidDNA(n2.compact);

            if (inv1.invalid.length)
                return {
                    ok: false, error: `Invalid characters in JSON strand1 at pos ${inv1.firstIdx + 1}: ${inv1.invalid.join(", ")}`
                };

            if (inv2.invalid.length)
                return {
                    ok: false, error: `Invalid characters in JSON strand2 at pos ${inv2.firstIdx + 1}: ${inv2.invalid.join(", ")}`
                };

            if (n1.compact.length !== n2.compact.length) {
                return {
                    ok: false, error: `JSON strands must have equal lengths. Got ${n1.compact.length} and ${n2.compact.length}.`
                };
            }

            const comp = checkComplementarity(n1.compact, n2.compact);

            if (!comp.ok) {
                return {
                    ok: false,
                    error: `JSON strands not complementary at position ${comp.firstMismatch + 1}. Expected ${comp.expected}, got ${comp.got}.`
                };
            }

            return {
                ok: true, s1: n1.compact, s2: n2.compact
            };
        }
    }

    const lines = String(content || "")
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l.length > 0);

    const compactLines = lines.map(normalizeLine).filter(x => x.compact.length > 0);

    if (compactLines.length === 0)
        return {
            ok: false, error: "No DNA lines found in file."
        };

    const L1 = compactLines[0], L2 = compactLines[1];

    const inv1 = findInvalidDNA(L1.compact);

    if (inv1.invalid.length) {
        return {
            ok: false, error: `Invalid characters in file strand 1 at pos ${inv1.firstIdx + 1}: ${inv1.invalid.join(", ")}`
        };
    }

    if (!L2) {
        return {
            ok: true, s1: L1.compact, s2: generateComplement(L1.compact)
        };
    }

    const inv2 = findInvalidDNA(L2.compact);

    if (inv2.invalid.length) {
        return {
            ok: false, error: `Invalid characters in file strand 2 at pos ${inv2.firstIdx + 1}: ${inv2.invalid.join(", ")}`
        };
    }

    if (L1.compact.length !== L2.compact.length) {
        return {
            ok: false, error: `File strands must have equal lengths. Got ${L1.compact.length} and ${L2.compact.length}.`
        };
    }

    const comp = checkComplementarity(L1.compact, L2.compact);
    if (!comp.ok) {
        return {
            ok: false,
            error: `File strands not complementary at position ${comp.firstMismatch + 1}. Expected ${comp.expected}, got ${comp.got}.`
        };
    }

    return {
        ok: true, s1: L1.compact, s2: L2.compact
    };
}

// FIX

export function countBases(s = "") {
    const c = { A: 0, C: 0, G: 0, T: 0 };
    for (const ch of s) if (c.hasOwnProperty(ch)) c[ch]++;
    return c;
}

export function gcContent(s = "") {
    const c = countBases(s), n = s.length || 0;
    return n ? (c.G + c.C) / n : 0;
}

export function tmWallace(s = "") {
    const c = countBases(s);
    return 2 * (c.A + c.T) + 4 * (c.G + c.C);
}

export function transcribeToRNA(dna5to3 = "") {
    return dna5to3.split("").map(b => RNA_MAP[b] || "").join("");
}

export function codonAt(strand1, index, frame = 0) {
    const rna = transcribeToRNA(strand1); 
    const start = index - ((index - frame + 3) % 3); 
    if (start < 0 || start + 2 >= rna.length) return { frame, codon: "", aa: "" };
    const codon = rna.slice(start, start + 3);
    return { frame, codon, aa: CODON_TABLE[codon] || "?" };
}

export const bondsFor = (b1, b2) =>
    (b1 === "A" && b2 === "T") || (b1 === "T" && b2 === "A") ? 2 :
        (b1 === "C" && b2 === "G") || (b1 === "G" && b2 === "C") ? 3 : "-";

export const purinePyrimidine = b =>
    (b === "A" || b === "G") ? "Purine" :
        (b === "C" || b === "T") ? "Pyrimidine" : "-";