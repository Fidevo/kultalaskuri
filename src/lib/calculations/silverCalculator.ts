// src/lib/calculations/silverCalculator.ts
//
// Hopean vastine goldCalculator.ts:lle. Hopean hintalaskenta tehdään VAIN
// calculateSilverValue()-funktion kautta (CLAUDE.md sääntö 2 koskee myös hopeaa).

// targetPercent-kertoimet hyväksytty omistajan toimesta 28.9.2026 (sääntö 2).
// Kalibrointi: seitsemän suomalaisen hopeanostajan julkiset ostohinnat 28.9.2026
// suhteutettuna SAMANHETKISEEN spot-hintaan (1,7313 €/g = 61,26 USD/oz).
// Havaitut keskiarvot: 999 74,6 % · 925 65,1 % · 830 65,2 % · 813 67,1 % ·
// 500 62,4 % · 350 62,5 %. Minimit: 999 68,2 % · 925 56,2 % · 830 55,7 % ·
// 500 57,8 % (minimit yhden "alkaen"-hintoja ilmoittavan ostajan).
//
// MENETELMÄ POIKKEAA KULLASTA TARKOITUKSELLA: kerroin on asetettu noin
// 3 %-yksikköä ostajien KESKIARVON alle (kullassa minimin alle). Omistajan
// linja: tavoitehinnan pitää olla taso, jonka valtaosa ostajista — ja tulevat
// luotetut ostajakumppanit — pystyy takaamaan. Minimin alle asetettuna kerroin
// olisi ollut niin matala, ettei tavoitehinnalla olisi merkitystä.
// Sijoitusharkoista maksetaan enemmän (78–85 %, vain kaksi havaintoa) — ne ovat
// toistaiseksi 999-luokassa. Älä muuta ilman tuoretta vertailudataa, joka on
// suhteutettu mittaushetken spot-hintaan.
export const SILVER_PURITIES = {
  '999': { label: '999 (99,9 %)', decimal: 0.999, description: 'Puhdas hopea: hopeaharkot ja sijoituskolikot.', targetPercent: 0.72 },
  '925': { label: '925 (92,5 %)', decimal: 0.925, description: 'Sterling-hopea: korut sekä monet ulkomaiset esineet.', targetPercent: 0.62 },
  '900': { label: '900 (90 %)',   decimal: 0.900, description: 'Vanhat hopearahat ja osa ulkomaisista esineistä.', targetPercent: 0.62 },
  '830': { label: '830 (83 %)',   decimal: 0.830, description: 'Suomalaiset hopea-aterimet ja -astiat (leima esim. 830H).', targetPercent: 0.62 },
  '813': { label: '813 (81,3 %)', decimal: 0.813, description: 'Vanha suomalainen pitoisuus, ns. 13-luotinen hopea (leima 813H).', targetPercent: 0.62 },
  '800': { label: '800 (80 %)',   decimal: 0.800, description: 'Keskieurooppalaiset, esim. saksalaiset aterimet.', targetPercent: 0.62 },
  '500': { label: '500 (50 %)',   decimal: 0.500, description: 'Vanhat suomalaiset juhlarahat. Tarkista ensin mahdollinen keräilyarvo.', targetPercent: 0.60 },
  '350': { label: '350 (35 %)',   decimal: 0.350, description: 'Suomen 1 markan kolikot 1964–1968.', targetPercent: 0.60 },
} as const;

export type SilverPurityCode = keyof typeof SILVER_PURITIES;

export function isSilverPurity(code: unknown): code is SilverPurityCode {
  return typeof code === 'string' && Object.prototype.hasOwnProperty.call(SILVER_PURITIES, code);
}

export interface SilverCalculationResult {
  purityDecimal: number;
  purityLabel: string;
  weightGrams: number;
  spotPricePerGram: number;
  pureSilverContent: number;
  spotValue: number;
  targetValue: number;
}

export function calculateSilverValue(
  weightGrams: number,
  purityCode: SilverPurityCode,
  spotPriceEurPerGram: number
): SilverCalculationResult | null {
  if (weightGrams <= 0 || spotPriceEurPerGram <= 0) return null;

  const purity = SILVER_PURITIES[purityCode];
  if (!purity) return null;

  const pureSilverContent = weightGrams * purity.decimal;
  const spotValue = pureSilverContent * spotPriceEurPerGram;

  return {
    purityDecimal: purity.decimal,
    purityLabel: purity.label,
    weightGrams,
    spotPricePerGram: spotPriceEurPerGram * purity.decimal,
    pureSilverContent,
    spotValue: Number(spotValue.toFixed(2)),
    targetValue: Number((spotValue * purity.targetPercent).toFixed(2)),
  };
}
