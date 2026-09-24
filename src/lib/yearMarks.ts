// src/lib/yearMarks.ts
// Suomalaiset vuosileimat — YKSI lähde sekä kullan-leimat-sivun taulukoille että
// vuosileimahaulle (YearMarkLookup.tsx).
//
// Järjestelmä: kirjain + kierrosnumero. Sarja alkoi 1810 kirjaimella A.
// Kierroksessa 24 kirjainta (ei J, W, Å, Ä, Ö), eli kierros = 24 vuotta. Lähde: Tukes / leimat.fi
// Ankkurit varmistettu: A8 = 1978, Z8 = 2001, A9 = 2002, K9 = 2011, Z9 = 2025, A10 = 2026.
// Älä muuta ilman lähdettä (ks. CLAUDE.md sääntö 8).

export const YEAR_LETTERS = ['A','B','C','D','E','F','G','H','I','K','L','M','N','O','P','Q','R','S','T','U','V','X','Y','Z'] as const;
export type YearLetter = typeof YEAR_LETTERS[number];

/** Kirjaimet, joita sarjassa ei käytetä. */
export const EXCLUDED_LETTERS = ['J', 'W', 'Å', 'Ä', 'Ö'] as const;

export const SERIES_START_YEAR = 1810;
export const CYCLE_LENGTH = YEAR_LETTERS.length; // 24

/** Vanhin kierros, jonka sivusto näyttää (5 = 1906–1929). Vanhemmat jätetään pois,
 *  koska sivuston taulukot ja varmistetut ankkurit kattavat 1900-luvun alusta eteenpäin. */
export const FIRST_SHOWN_CYCLE = 5;

export const cycleStart = (cycle: number) => SERIES_START_YEAR + (cycle - 1) * CYCLE_LENGTH;
export const cycleEnd = (cycle: number) => cycleStart(cycle) + CYCLE_LENGTH - 1;

export const yearMarkRows = (cycle: number) =>
  YEAR_LETTERS.map((letter, i) => ({ mark: `${letter}${cycle}`, year: cycleStart(cycle) + i }));

export interface YearMark {
  letter: YearLetter;
  cycle: number;
  mark: string;
  year: number;
  /** Kirjaimen järjestysnumero kierroksen sisällä (0–23). */
  index: number;
}

/** Vuosi → vuosileima. Palauttaa null ennen sarjan alkua. */
export function yearToMark(year: number): YearMark | null {
  if (!Number.isInteger(year) || year < SERIES_START_YEAR) return null;
  const offset = year - SERIES_START_YEAR;
  const cycle = Math.floor(offset / CYCLE_LENGTH) + 1;
  const index = offset % CYCLE_LENGTH;
  const letter = YEAR_LETTERS[index];
  return { letter, cycle, mark: `${letter}${cycle}`, year, index };
}

/** Kirjain + kierros → vuosileima. Palauttaa null, jos kirjain ei kuulu sarjaan. */
export function markToYear(letter: string, cycle: number): YearMark | null {
  const index = YEAR_LETTERS.indexOf(letter as YearLetter);
  if (index < 0 || !Number.isInteger(cycle) || cycle < 1) return null;
  const year = cycleStart(cycle) + index;
  return { letter: YEAR_LETTERS[index], cycle, mark: `${YEAR_LETTERS[index]}${cycle}`, year, index };
}
