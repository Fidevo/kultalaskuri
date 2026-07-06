interface PricePoint {
  date: string;
  price: number;
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * Täyttää hintahistorian puuttuvat kalenteripäivät (viikonloput, pyhät) edellisen
 * tunnetun hinnan toistolla, jotta graafi ja kuukausikooste eivät hyppää suoraan
 * perjantaista maanantaihin — pörssi on kiinni, joten hinta ei muutu, mutta päivä
 * on silti osa aikajanaa.
 */
export function fillMissingDays(history: PricePoint[]): PricePoint[] {
  if (history.length === 0) return history;
  const filled: PricePoint[] = [history[0]];
  for (let i = 1; i < history.length; i++) {
    let cursor = addDays(filled[filled.length - 1].date, 1);
    while (cursor < history[i].date) {
      filled.push({ date: cursor, price: filled[filled.length - 1].price });
      cursor = addDays(cursor, 1);
    }
    filled.push(history[i]);
  }
  return filled;
}
