import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { YEAR_LETTERS, cycleStart, cycleEnd, type YearMark } from '../../lib/yearMarks';
import { EXAMPLES, lookupYearMark, yearsAgo } from '../../lib/yearMarkLookup';

// Vuosileimahaku: kirjain + numero (K9) → valmistusvuosi, tai vuosi (2011) → leima.
// Pelkkä kirjain (K) listaa kaikki mahdolliset vuodet — kuluneesta leimasta näkyy
// usein vain kirjain. Algoritmi on yhteinen kullan-leimat-sivun taulukoiden kanssa.

interface Props {
  /** Build-hetken vuosi — korvataan clientillä kävijän vuodella (ei hydration mismatchia). */
  buildYear: number;
}

const track = (event: string, data?: Record<string, string | number>) => {
  try { (window as any).umami?.track(event, data); } catch {}
};

export default function YearMarkLookup({ buildYear }: Props) {
  const inputId = useId();
  const [query, setQuery] = useState('');
  // Kävijän vuosi Helsingin ajassa vasta clientillä (SSG + hydraatio)
  const [currentYear, setCurrentYear] = useState(buildYear);
  useEffect(() => {
    const y = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Helsinki', year: 'numeric' }).format(new Date()));
    if (Number.isFinite(y) && y >= buildYear) setCurrentYear(y);
    // Syvälinkki: /kullan-leimat/?leima=K9 esitäyttää haun
    const q = new URLSearchParams(window.location.search).get('leima');
    if (q && /^[0-9A-Za-zÅÄÖåäö -]{1,8}$/.test(q)) setQuery(q);
  }, [buildYear]);

  const result = useMemo(() => lookupYearMark(query, currentYear), [query, currentYear]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Seuranta: yksi tapahtuma per onnistunut tulos (ei jokaisesta näppäilystä)
  const lastTracked = useRef('');
  useEffect(() => {
    if (!result || result.kind === 'error') return;
    const key = result.kind === 'mark' ? result.mark.mark : result.letter;
    if (key === lastTracked.current) return;
    const t = setTimeout(() => {
      lastTracked.current = key;
      track('vuosileimahaku', { tulos: key, tapa: result.kind === 'mark' ? result.via : 'kirjain' });
    }, 800);
    return () => clearTimeout(t);
  }, [result]);

  const pick = (value: string) => {
    setQuery(value);
    inputRef.current?.focus();
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden mb-8">
      <div className="p-5 md:p-7">
        <div className="kicker-light !mb-2">Vuosileimahaku</div>
        <label htmlFor={inputId} className="block font-serif text-xl md:text-2xl font-semibold text-gray-900 mb-1">
          Ajoita koru vuosileimasta
        </label>
        <p className="text-sm text-gray-600 mb-4">
          Kirjoita leima (esim. K9) tai vuosi. Jos leimasta erottuu vain kirjain, kirjoita pelkkä kirjain.
        </p>

        <div className="relative">
          <Search size={20} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={8}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Esim. K9 tai 2011"
            aria-describedby={`${inputId}-tulos`}
            className="num w-full bg-white border border-gray-300 rounded-lg pl-12 pr-12 py-3.5 text-2xl font-semibold uppercase tracking-[0.04em] text-gray-900 placeholder:normal-case placeholder:tracking-normal placeholder:text-lg placeholder:font-medium placeholder:text-gray-400 shadow-sm outline-none transition-colors focus:border-ink-600 focus:ring-4 focus:ring-ink-600/10"
          />
          {query && (
            <button
              type="button"
              onClick={() => pick('')}
              aria-label="Tyhjennä haku"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-xs text-gray-500 mr-1">Kokeile:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => pick(ex)}
              aria-pressed={query.toUpperCase() === ex}
              className={`num min-h-9 px-3 rounded-md border text-sm font-semibold transition-colors ${
                query.toUpperCase() === ex
                  ? 'bg-ink-950 border-ink-950 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-ink-400'
              }`}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Tulosalue — aria-live kertoo ruudunlukijalle tuloksen kirjoittaessa */}
      <div id={`${inputId}-tulos`} aria-live="polite" aria-atomic="true">
        {result?.kind === 'mark' && (
          <MarkResult mark={result.mark} via={result.via} currentYear={currentYear} />
        )}

        {result?.kind === 'letter' && (
          <div className="border-t border-gray-200 bg-gray-50 px-5 py-5 md:px-7">
            <p className="text-sm text-gray-700 mb-3">
              Kirjain <strong className="font-semibold text-gray-900">{result.letter}</strong> voi tarkoittaa jotakin näistä vuosista.
              Kierrosnumero (kirjaimen perässä) ratkaisee:
            </p>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {result.options.map((o) => (
                <li key={o.mark}>
                  <button
                    type="button"
                    onClick={() => pick(o.mark)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-md border border-gray-200 bg-white hover:border-ink-400 transition-colors text-left"
                  >
                    <span className="font-serif font-semibold text-gray-900">{o.mark}</span>
                    <span className="num text-sm text-gray-600">{o.year}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {result?.kind === 'error' && (
          <div className="border-t border-gray-200 bg-amber-50 border-l-[3px] border-l-amber-600 px-5 py-4 md:px-7">
            <p className="text-sm text-amber-900 leading-relaxed">{result.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MarkResult({ mark, via, currentYear }: { mark: YearMark; via: 'mark' | 'year'; currentYear: number }) {
  const start = cycleStart(mark.cycle);

  return (
    <div className="relative bg-ink-950 text-white px-5 py-6 md:px-7 md:py-7">
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/60 to-transparent" aria-hidden="true"></span>

      <div className="flex items-center gap-4 md:gap-6">
        {/* Leima "meistettynä" kehykseen */}
        <div className="shrink-0 min-w-[4.5rem] h-16 md:h-20 px-3 rounded-md border-2 border-gold-400/70 flex items-center justify-center">
          <span className="font-serif text-3xl md:text-4xl font-semibold text-gold-400 leading-none">{mark.mark}</span>
        </div>
        <ArrowRight size={22} className="text-gray-400 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 mb-1">
            {via === 'year' ? `Vuoden ${mark.year} leima` : 'Valmistusvuosi'}
          </p>
          <p className="num text-5xl md:text-6xl font-semibold tracking-[-0.03em] leading-none">{mark.year}</p>
          <p className="text-sm text-gray-300 mt-2">{yearsAgo(mark.year, currentYear)}</p>
        </div>
      </div>

      {/* Kierroksen aikajana: 24 kirjainta, valittu korostettuna */}
      <div className="mt-6 pt-5 border-t border-white/10">
        <div className="flex items-baseline justify-between gap-3 mb-2 text-xs text-gray-400">
          <span>Kierros {mark.cycle}</span>
          <span className="num">{start}–{cycleEnd(mark.cycle)}</span>
        </div>
        <ol className="grid grid-cols-12 sm:grid-cols-[repeat(24,minmax(0,1fr))] gap-1" aria-label={`Kierroksen ${mark.cycle} kirjaimet`}>
          {YEAR_LETTERS.map((l, i) => {
            const y = start + i;
            const active = i === mark.index;
            const future = y > currentYear;
            return (
              <li
                key={l}
                title={`${l}${mark.cycle} = ${y}`}
                className={`h-8 rounded-sm flex items-center justify-center text-[11px] font-semibold ${
                  active
                    ? 'bg-gold-400 text-ink-950'
                    : future
                      ? 'border border-dashed border-white/10 text-gray-500'
                      : 'bg-white/[0.06] text-gray-300'
                }`}
                aria-current={active ? 'true' : undefined}
              >
                {l}
              </li>
            );
          })}
        </ol>
        <p className="text-xs text-gray-400 mt-3 leading-relaxed">
          Vuosileima kertoo valmistusvuoden — kullan arvon määräävät pitoisuusleima ja paino.
        </p>
      </div>
    </div>
  );
}
