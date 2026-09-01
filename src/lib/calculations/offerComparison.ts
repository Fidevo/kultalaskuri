// src/lib/calculations/offerComparison.ts
//
// Tarjousvertailun logiikka. Vertailu tehdään AINA laskurin tavoitehintaan
// (targetValue / grandTotal) — ei pörssiarvoon eikä kurssiin — jotta
// targetPercent-kerroin ei vuoda näkyviin missään muodossa (CLAUDE.md sääntö 4).
//
// Laskuri viestii tavoitehinnan VÄHIMMÄISTASONA ("maksavat yleensä vähintään
// tämän verran", "älä myy alle tämän tason"). Siksi vertailussa on vain kaksi
// tilaa: tarjous joko yltää tavoitteeseen tai ei. Euromääräinen ero kertoo
// vivahteen (muutama euro vs. kymmeniä euroja alle) ilman että sitä tarvitsee
// pehmentää sanoiksi.

export type OfferBand = 'meets' | 'below';

export interface OfferAssessment {
  /** Syötetty summa euroina, tai null jos kenttä on tyhjä tai virheellinen. */
  amount: number | null;
  /** null jos amount on null tai tavoite <= 0. */
  band: OfferBand | null;
  /** amount - anchor. Positiivinen = tavoitteen yli. Null jos amount on null. */
  diff: number | null;
}

export interface ComparisonResult {
  assessments: OfferAssessment[];
  /** Suurin pätevä tarjous, tai null jos yhtään ei syötetty. */
  bestAmount: number | null;
  bestBand: OfferBand | null;
  bestDiff: number | null;
}

/** Suomalainen pilkkudesimaali -> number. Palauttaa null jos ei kelvollinen positiivinen luku. */
export function parseOfferAmount(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(',', '.').replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  if (isNaN(n) || n <= 0) return null;
  return n;
}

export function assessOffers(anchor: number, rawAmounts: string[]): ComparisonResult {
  const assessments: OfferAssessment[] = rawAmounts.map((raw) => {
    const amount = parseOfferAmount(raw);
    if (amount === null || anchor <= 0) {
      return { amount, band: null, diff: null };
    }
    const diff = Number((amount - anchor).toFixed(2));
    const band: OfferBand = amount >= anchor ? 'meets' : 'below';
    return { amount, band, diff };
  });

  let bestAmount: number | null = null;
  for (const a of assessments) {
    if (a.amount !== null && (bestAmount === null || a.amount > bestAmount)) {
      bestAmount = a.amount;
    }
  }

  const bestBand: OfferBand | null =
    bestAmount === null || anchor <= 0 ? null : bestAmount >= anchor ? 'meets' : 'below';
  const bestDiff = bestAmount === null ? null : Number((bestAmount - anchor).toFixed(2));

  return { assessments, bestAmount, bestBand, bestDiff };
}
