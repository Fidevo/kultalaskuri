// src/lib/yearMarkLookup.ts
// Vuosileimahaun jäsennys ja tulkinta (puhdas funktio, ei Reactia) — YearMarkLookup.tsx
// käyttää tätä. Algoritmi: ./yearMarks.ts (sama kuin kullan-leimat-sivun taulukoissa).
import {
  EXCLUDED_LETTERS, FIRST_SHOWN_CYCLE, cycleStart, markToYear, yearToMark, type YearMark,
} from './yearMarks';

export const EXAMPLES = ['A9', 'K9', 'Z9', 'A10', '1978'];
export const MIN_YEAR = cycleStart(FIRST_SHOWN_CYCLE); // 1906

export type YearMarkResult =
  | { kind: 'mark'; mark: YearMark; via: 'mark' | 'year' }
  | { kind: 'letter'; letter: string; options: YearMark[] }
  | { kind: 'error'; message: string }
  | null;

export function yearsAgo(year: number, current: number): string {
  const diff = current - year;
  if (diff === 0) return 'kuluva vuosi';
  if (diff === 1) return 'vuosi sitten';
  return `${diff} vuotta sitten`;
}

export function lookupYearMark(raw: string, currentYear: number): YearMarkResult {
  const q = raw.toUpperCase().replace(/[\s\-–.]/g, '');
  if (!q) return null;
  const currentCycle = yearToMark(currentYear)?.cycle ?? 10;

  // Vuosi → leima
  if (/^\d{4}$/.test(q)) {
    const year = Number(q);
    if (year > currentYear) {
      return { kind: 'error', message: `Vuotta ${year} ei ole vielä leimattu.` };
    }
    if (year < MIN_YEAR) {
      return { kind: 'error', message: `Haku kattaa vuosileimat vuodesta ${MIN_YEAR} alkaen. Vanhempien esineiden ajoitukseen kannattaa käyttää Tukesin tai leimat.fi:n aineistoja.` };
    }
    const mark = yearToMark(year);
    return mark ? { kind: 'mark', mark, via: 'year' } : null;
  }

  const letter = q.charAt(0);
  if ((EXCLUDED_LETTERS as readonly string[]).includes(letter)) {
    return { kind: 'error', message: `Kirjainta ${letter} ei käytetä vuosileimoissa (sarjasta puuttuvat J, W, Å, Ä ja Ö). Tarkista, onko kyseessä nimileima tai muu merkintä.` };
  }

  // Pelkkä kirjain → kaikki mahdolliset vuodet
  if (/^[A-Z]$/.test(q)) {
    const options: YearMark[] = [];
    for (let c = FIRST_SHOWN_CYCLE; c <= currentCycle; c++) {
      const m = markToYear(letter, c);
      if (m && m.year <= currentYear) options.push(m);
    }
    if (!options.length) return { kind: 'error', message: 'Kirjoita vuosileima muodossa kirjain + numero (esim. K9) tai nelinumeroinen vuosi.' };
    return { kind: 'letter', letter, options: options.reverse() };
  }

  // Kirjain + kierros
  const m = q.match(/^([A-Z])(\d{1,2})$/);
  if (m) {
    const mark = markToYear(m[1], Number(m[2]));
    if (!mark) return { kind: 'error', message: 'Kirjoita vuosileima muodossa kirjain + numero (esim. K9) tai nelinumeroinen vuosi.' };
    if (mark.cycle < FIRST_SHOWN_CYCLE) {
      return { kind: 'error', message: `Haku kattaa vuosileimat vuodesta ${MIN_YEAR} alkaen. Vanhempien esineiden ajoitukseen kannattaa käyttää Tukesin tai leimat.fi:n aineistoja.` };
    }
    if (mark.year > currentYear) {
      return { kind: 'error', message: `${mark.mark} vastaisi vuotta ${mark.year}, jota ei ole vielä leimattu. Tarkista numero — se kertoo kierroksen.` };
    }
    return { kind: 'mark', mark, via: 'mark' };
  }

  return { kind: 'error', message: 'Kirjoita vuosileima muodossa kirjain + numero (esim. K9) tai nelinumeroinen vuosi.' };
}

