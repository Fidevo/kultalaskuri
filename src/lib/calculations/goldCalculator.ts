// src/lib/calculations/goldCalculator.ts

// targetPercent-kertoimet kalibroitu 4.7.2026 suurimpien julkisesti hintansa
// ilmoittavien suomalaisten kullanostajien ostohintoihin: kerroin on asetettu
// 2–3 %-yksikköä havaitun markkinaminimin ALLE (turvamarginaali kattaa myös
// hintaviiveen buildien välillä). Matalilla pitoisuuksilla (8–10K) ostajien
// tasot ovat selvästi heikommat kuin keskipitoisuuksilla — siksi porrastus.
// Älä muuta ilman tuoretta vertailudataa.
export const GOLD_PURITIES = {
  '24K': { label: '24K (99.9%)', decimal: 0.999, description: 'Puhdas kulta', targetPercent: 0.91 },
  '22K': { label: '22K (91.7%)', decimal: 0.917, description: 'Aasian ja Lähi-idän korut', targetPercent: 0.79 },
  '21K': { label: '21K (87.5%)', decimal: 0.875, description: 'Lähi-idän korut', targetPercent: 0.79 },
  '18K': { label: '18K (75.0%)', decimal: 0.750, description: 'Laadukkaat korut', targetPercent: 0.83 },
  '14K': { label: '14K (58.5%)', decimal: 0.585, description: 'Yleisin Suomessa', targetPercent: 0.83 },
  '10K': { label: '10K (41.7%)', decimal: 0.417, description: 'USA:n standardi', targetPercent: 0.71 },
  '9K':  { label: '9K (37.5%)',  decimal: 0.375, description: 'Arkikorut', targetPercent: 0.69 },
  '8K':  { label: '8K (33.3%)',  decimal: 0.333, description: 'Minimi EU:ssa', targetPercent: 0.69 },
} as const;

export type PurityCode = keyof typeof GOLD_PURITIES;

// Jätetään tämä ennalleen "hämäykseksi" Reactille, jotta se ei kaadu, 
// jos se yrittää lukea percent-arvoa jostain taustalla.
export const PRICE_TIERS = {
  spot: { 
    percent: 1.00, 
    label: 'Pörssihinta', 
    description: 'Teoreettinen maksimi (100%)' 
  },
  target: { 
    percent: 0.80, 
    label: 'Tavoitehinta', 
    description: 'Reilu markkinahinta' 
  }
} as const;

export interface CalculationResult {
  purityDecimal: number;
  purityLabel: string;
  weightGrams: number;
  spotPricePerGram: number;
  pureGoldContent: number;
  
  spotValue: number;
  targetValue: number;
}

export function calculateGoldValue(
  weightGrams: number,
  purityCode: PurityCode,
  spotPriceEurPerGram: number
): CalculationResult | null {
  if (weightGrams <= 0 || spotPriceEurPerGram <= 0) {
    return null;
  }

  const purity = GOLD_PURITIES[purityCode];
  if (!purity) {
    return null;
  }

  const pureGoldContent = weightGrams * purity.decimal;
  const spotValue = pureGoldContent * spotPriceEurPerGram;

  return {
    purityDecimal: purity.decimal,
    purityLabel: purity.label,
    weightGrams,
    spotPricePerGram: spotPriceEurPerGram * purity.decimal,
    pureGoldContent,
    
    // Pyöristetään luvut kahteen desimaaliin
    spotValue: Number(spotValue.toFixed(2)),
    // LASKENTA KORJATTU: Laskuri käyttää nyt kunkin karaatin omaa targetPercent-arvoa!
    targetValue: Number((spotValue * purity.targetPercent).toFixed(2)),
  };
}

export function formatEur(value: number): string {
  if (isNaN(value)) return '0,00 €';
  return new Intl.NumberFormat('fi-FI', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}