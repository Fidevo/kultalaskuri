import React, { useId, useMemo, useState } from 'react';
import { calculateGoldValue, formatEur, GOLD_PURITIES, type PurityCode } from '../../lib/calculations/goldCalculator';
import { track } from './chartUtils';

// "Kultasi arvo ajassa": saman kultaesineen PÖRSSIARVO valittuna vuonna (vuoden
// keskimääräinen spot) ja nyt. Vain pörssiarvo — tavoitehintaa ei näytetä tällä
// sivulla, koska spot ja tavoitehinta rinnakkain tekisivät kertoimen johdettavaksi
// (sääntö 4, sama linja kuin /kullan-hinta/). Laskenta calculateGoldValue()-funktiolla.

interface Props {
  years: { year: number; avg: number; partial: boolean }[]; // vanhin → uusin, ei kuluvaa vuotta
  nowSpot: number; // €/g
  nowLabel: string; // esim. "22.9.2026"
}

const PURITIES: PurityCode[] = ['14K', '18K', '24K', '9K'];

export default function GoldValueOverTime({ years, nowSpot, nowLabel }: Props) {
  const weightId = useId();
  const yearId = useId();
  const defaultYear = years.find(y => y.year === years.at(-1)!.year - 9)?.year ?? years[0].year;
  const [weight, setWeight] = useState('10');
  const [purity, setPurity] = useState<PurityCode>('14K');
  const [year, setYear] = useState<number>(defaultYear);
  const [tracked, setTracked] = useState(false);

  const grams = parseFloat(weight.replace(',', '.'));
  const yearRow = years.find(y => y.year === year)!;

  const result = useMemo(() => {
    if (!(grams > 0) || !yearRow) return null;
    const then = calculateGoldValue(grams, purity, yearRow.avg);
    const now = calculateGoldValue(grams, purity, nowSpot);
    if (!then || !now) return null;
    const pct = ((now.spotValue - then.spotValue) / then.spotValue) * 100;
    return { then: then.spotValue, now: now.spotValue, pct, pure: now.pureGoldContent };
  }, [grams, purity, yearRow, nowSpot]);

  const touch = () => {
    if (tracked) return;
    setTracked(true);
    track('hintahistoria-arvo-ajassa');
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="grid md:grid-cols-5">
        {/* Syötteet */}
        <div className="md:col-span-2 p-5 md:p-7 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col gap-5">
          <div>
            <label htmlFor={weightId} className="block text-[11px] font-semibold text-gray-600 uppercase tracking-[0.14em] mb-2">Paino (grammaa)</label>
            <div className="relative">
              <input
                id={weightId}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={weight}
                onChange={(e) => { const v = e.target.value; if (/^[0-9]*[.,]?[0-9]*$/.test(v)) { setWeight(v); touch(); } }}
                className="num w-full bg-white border border-gray-300 rounded-lg pl-4 pr-10 py-3 text-2xl font-semibold text-gray-900 shadow-sm outline-none transition-colors focus:border-ink-600 focus:ring-4 focus:ring-ink-600/10"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold pointer-events-none">g</span>
            </div>
          </div>

          <fieldset>
            <legend className="block text-[11px] font-semibold text-gray-600 uppercase tracking-[0.14em] mb-2">Pitoisuus</legend>
            <div className="grid grid-cols-4 gap-1.5">
              {PURITIES.map(code => (
                <button key={code} type="button" aria-pressed={purity === code}
                  onClick={() => { setPurity(code); touch(); }}
                  className={`num min-h-11 rounded-md border text-sm font-semibold transition-colors ${
                    purity === code ? 'bg-ink-950 border-ink-950 text-white' : 'bg-white border-gray-300 text-gray-700 hover:border-ink-400'}`}>
                  {code}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">{GOLD_PURITIES[purity].label} · {GOLD_PURITIES[purity].description}</p>
          </fieldset>

          <div>
            <label htmlFor={yearId} className="block text-[11px] font-semibold text-gray-600 uppercase tracking-[0.14em] mb-2">Vertailuvuosi</label>
            <select
              id={yearId}
              value={year}
              onChange={(e) => { setYear(Number(e.target.value)); touch(); }}
              className="num w-full min-h-11 bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-base font-semibold text-gray-900 shadow-sm outline-none focus:border-ink-600 focus:ring-4 focus:ring-ink-600/10"
            >
              {[...years].reverse().map(y => (
                <option key={y.year} value={y.year}>{y.year}{y.partial ? ' (kesäkuusta)' : ''}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tulos */}
        <div className="md:col-span-3 p-5 md:p-7 flex flex-col justify-center" aria-live="polite">
          {result ? (
            <>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 mb-1">Vuonna {year}</p>
                  <p className="num text-2xl md:text-3xl font-semibold text-gray-900 tracking-[-0.02em]">{formatEur(result.then)}</p>
                  <p className="num text-xs text-gray-500 mt-1">keskihinnalla {yearRow.avg.toFixed(2).replace('.', ',')} €/g</p>
                </div>
                <div className="rounded-lg bg-ink-950 p-4 ring-1 ring-ink-800">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-400 mb-1">Nyt</p>
                  <p className="num text-2xl md:text-3xl font-semibold text-white tracking-[-0.02em]">{formatEur(result.now)}</p>
                  <p className="num text-xs text-gray-400 mt-1">{nowLabel} · {nowSpot.toFixed(2).replace('.', ',')} €/g</p>
                </div>
              </div>
              <p className="num mt-4 text-lg">
                <span className={`font-semibold ${result.pct >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {result.pct >= 0 ? '▲' : '▼'} {Math.abs(result.pct).toFixed(0)} %
                </span>
                <span className="text-gray-600"> — {weight.replace('.', ',')} g {purity}, puhdasta kultaa {result.pure.toFixed(2).replace('.', ',')} g</span>
              </p>
              <p className="text-xs text-gray-500 leading-relaxed mt-3 pl-3 border-l-2 border-gold-400/60">
                Luvut ovat pörssiarvoja eli puhtaan kullan arvo maailmanmarkkinahinnalla. Kullanostajan
                maksama hinta on aina tätä matalampi — oman esineesi tavoitehinnan näet{' '}
                <a href="/#laskuri" className="text-gold-700 font-semibold underline underline-offset-2">laskurista</a>.
                Historiallinen kehitys ei ennusta tulevaa hintaa.
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500">Syötä paino grammoina, niin näet arvon kehityksen.</p>
          )}
        </div>
      </div>
    </div>
  );
}
