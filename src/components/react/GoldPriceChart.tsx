import React, { useState, useMemo, useRef, useCallback, useEffect, useId } from 'react';
import { GOLD_PURITIES } from '../../lib/calculations/goldCalculator';
import {
  track, SVG_FONT, linePath as smoothPath, fmtDateShort, fmtDateFull, fmt2,
  daysBetween, changeBetween, ChangeText,
} from './chartUtils';

interface PricePoint {
  date: string;
  price: number;
}

type Range = '7D' | '30D' | '90D' | '1Y';
type Series = 'spot' | '18K' | '14K';
type Mode = 'explore' | 'measure';

// Pitoisuusnäkymä: spot = puhdas kulta (100 %), muut = pörssiarvo grammalta
// kyseisellä pitoisuudella. Kertoimet GOLD_PURITIES-taulukosta (ei kovakoodausta).
// HUOM: vain pörssiarvo — tavoitehintaa ei piirretä, koska kahden viivan suhteesta
// voisi päätellä laskennan kertoimen (CLAUDE.md sääntö 4).
const SERIES: { key: Series; label: string; title: string; factor: number }[] = [
  { key: 'spot', label: 'Spot', title: 'Kullan spot-hinta €/g', factor: 1 },
  { key: '18K', label: '18K', title: '18K (750) pörssiarvo €/g', factor: GOLD_PURITIES['18K'].decimal },
  { key: '14K', label: '14K', title: '14K (585) pörssiarvo €/g', factor: GOLD_PURITIES['14K'].decimal },
];

interface Props {
  data: PricePoint[];
}

// SVG canvas -reunukset. Leveys/korkeus lasketaan komponentissa
// responsiivisesti: kapealla näytöllä käytetään pienempää viewBoxia,
// jolloin kuvaaja renderöityy korkeampana ja tekstit luettavina.
const P = { t: 16, r: 20, b: 40, l: 58 } as const;

const RANGES: { label: string; key: Range; days: number }[] = [
  { label: '7 pv',    key: '7D',  days: 7 },
  { label: '30 pv',   key: '30D', days: 30 },
  { label: '90 pv',   key: '90D', days: 90 },
  // 1 v = viimeiset 365 päivää. Kun dataa on alle vuoden, näytetään kaikki ja
  // muutosrivi kertoo aloituspäivän ("1.1.2026 alkaen"). Pidempi historia: /kullan-hintahistoria/.
  { label: '1 v',     key: '1Y',  days: 365 },
];

export default function GoldPriceChart({ data }: Props) {
  const sliderId = useId();
  const [keyboardIndex, setKeyboardIndex] = useState<number | null>(null);
  const [range, setRange] = useState<Range>('90D');
  const [hovIdx, setHovIdx] = useState<number | null>(null);
  const [isNarrow, setIsNarrow] = useState(false);
  const [series, setSeries] = useState<Series>('spot');
  const [mode, setMode] = useState<Mode>('explore');
  // Mittausväli indekseinä filtered-taulukkoon; null = koko aikaväli (oletus)
  const [measure, setMeasure] = useState<{ a: number; b: number } | null>(null);
  // Ref eikä state: peräkkäiset osoitintapahtumat eivät saa lukea vanhentunutta arvoa
  const draggingRef = useRef(false);
  const measureAId = useId();
  const measureBId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const hasTrackedInteraction = useRef(false);
  const hasTrackedMeasure = useRef(false);

  // Mobiilissa (≤640 px) kapeampi viewBox → kuvaaja korkeampi ja tekstit isompia
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 640px)');
    setIsNarrow(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const VW = isNarrow ? 400 : 800;
  const VH = isNarrow ? 300 : 260;
  const CW = VW - P.l - P.r;
  const CH = VH - P.t - P.b;

  const seriesCfg = SERIES.find(s => s.key === series)!;

  // Valittu aikaväli valitulla pitoisuudella (spot → sellaisenaan)
  const filtered = useMemo(() => {
    const cfg = RANGES.find(r => r.key === range)!;
    const sliced = data.slice(-cfg.days);
    if (seriesCfg.factor === 1) return sliced;
    // Ei pyöristystä laskennassa — vain näytössä (muuten %-muutos poikkeaisi spotista)
    return sliced.map(d => ({ date: d.date, price: d.price * seriesCfg.factor }));
  }, [data, range, seriesCfg]);

  // Jakson muutos valitulla aikavälillä (ensimmäisestä viimeiseen pisteeseen)
  const periodChange = filtered.length > 1
    ? changeBetween(filtered[0].price, filtered[filtered.length - 1].price)
    : null;
  // Jos data kattaa valittua aikaväliä lyhyemmän jakson (esim. 1 v, mutta dataa vasta
  // tammikuusta), kerrotaan aloituspäivä eikä väitetä koko jaksoa.
  const rangeDays = RANGES.find(r => r.key === range)!.days;
  const coveredDays = filtered.length > 1 ? daysBetween(filtered[0].date, filtered[filtered.length - 1].date) : 0;
  const periodLabel = coveredDays < rangeDays - 7
    ? (filtered.length ? `${fmtDateFull(filtered[0].date)} alkaen` : '')
    : range === '1Y' ? 'vuodessa' : `${rangeDays} päivässä`;

  // Mittausväli: oletuksena koko aikaväli; järjestetään aina vanhempi → uudempi
  const mA = measure ? Math.min(measure.a, measure.b) : 0;
  const mB = measure ? Math.max(measure.a, measure.b) : Math.max(0, filtered.length - 1);
  const measureChange = filtered.length > 1 ? changeBetween(filtered[mA].price, filtered[mB].price) : null;

  const { pts, minP, maxP } = useMemo(() => {
    if (!filtered.length) return { pts: [], minP: 0, maxP: 0 };
    const prices = filtered.map(d => d.price);
    const rawMin = Math.min(...prices);
    const rawMax = Math.max(...prices);
    const pad = Math.max((rawMax - rawMin) * 0.15, 1);
    const minP = rawMin - pad;
    const maxP = rawMax + pad;
    const n = filtered.length;
    const pts = filtered.map((d, i) => ({
      x: P.l + (n < 2 ? CW / 2 : (i / (n - 1)) * CW),
      y: P.t + (1 - (d.price - minP) / (maxP - minP)) * CH,
      date: d.date,
      price: d.price,
    }));
    return { pts, minP, maxP };
  }, [filtered, CW, CH]);

  const linePath = useMemo(() => smoothPath(pts), [pts]);

  const areaPath = useMemo(() => {
    if (!pts.length || !linePath) return '';
    const bot = (P.t + CH).toFixed(1);
    return `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${bot} L${pts[0].x.toFixed(1)},${bot}Z`;
  }, [linePath, pts, CH]);

  const yTicks = useMemo(() => {
    const n = 4;
    return Array.from({ length: n + 1 }, (_, i) => ({
      price: minP + (i / n) * (maxP - minP),
      y: P.t + CH - (i / n) * CH,
    }));
  }, [minP, maxP, CH]);

  const xTicks = useMemo(() => {
    if (pts.length < 2) return pts;
    // Mobiilissa vähemmän x-akselin päivämääriä, etteivät ne mene päällekkäin
    const count = Math.min(isNarrow ? 3 : 5, pts.length - 1);
    const seen = new Set<string>();
    return Array.from({ length: count + 1 }, (_, i) => {
      const idx = Math.round((i / count) * (pts.length - 1));
      return pts[idx];
    }).filter(p => {
      if (seen.has(p.date)) return false;
      seen.add(p.date);
      return true;
    });
  }, [pts, isNarrow]);

  // Stats always computed from full dataset
  const stats = useMemo(() => {
    if (!data.length) return null;
    const last = data[data.length - 1];
    const slice30 = data.slice(-30);
    const ago30 = data[Math.max(0, data.length - 31)];
    const chg = ((last.price - ago30.price) / ago30.price) * 100;
    const prices30 = slice30.map(d => d.price);
    return {
      last,
      chg,
      high30: Math.max(...prices30),
      low30: Math.min(...prices30),
    };
  }, [data]);

  // Lähin datapiste osoittimen x-koordinaatista
  const indexAt = useCallback((clientX: number): number | null => {
    if (!pts.length || !svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((clientX - rect.left) / rect.width) * VW;
    let best = 0, bestDist = Infinity;
    pts.forEach((p, i) => {
      const d = Math.abs(p.x - svgX);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  }, [pts, VW]);

  // Yhteinen osoitinlogiikka hiirelle ja kosketukselle (tutki päivää -tila)
  const handlePointer = useCallback((clientX: number) => {
    if (mode !== 'explore') return;
    const best = indexAt(clientX);
    if (best === null) return;
    if (!hasTrackedInteraction.current) {
      hasTrackedInteraction.current = true;
      track('hintahistoria-interaktio', { range });
    }
    setHovIdx(best);
  }, [indexAt, mode, range]);

  const trackMeasure = () => {
    if (hasTrackedMeasure.current) return;
    hasTrackedMeasure.current = true;
    track('hintahistoria-mittaus', { range, series });
  };

  // Mittaa muutos -tila: painallus asettaa alkupisteen, veto loppupisteen
  const onMeasureDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (mode !== 'measure') return;
    const i = indexAt(e.clientX);
    if (i === null) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    draggingRef.current = true;
    setMeasure({ a: i, b: i });
    trackMeasure();
  };
  const onMeasureMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (mode !== 'measure' || !draggingRef.current) return;
    const i = indexAt(e.clientX);
    if (i !== null) setMeasure(m => (m ? { a: m.a, b: i } : { a: i, b: i }));
  };
  const onMeasureUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    // Pelkkä napautus (a === b) ei ole väli — palataan koko aikaväliin
    setMeasure(m => (m && m.a === m.b ? null : m));
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    handlePointer(e.clientX);
  }, [handlePointer]);

  const handleTouch = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length > 0) handlePointer(e.touches[0].clientX);
  }, [handlePointer]);

  const hovPt = hovIdx !== null ? pts[hovIdx] : null;

  const tooltipPos = useMemo(() => {
    if (!hovPt) return null;
    const w = 126, h = 54, gap = 10;
    let x = hovPt.x - w / 2;
    x = Math.max(P.l + 2, Math.min(VW - P.r - w - 2, x));
    const yAbove = hovPt.y - h - gap;
    const y = yAbove < P.t ? hovPt.y + gap : yAbove;
    return { x, y, w, h };
  }, [hovPt, VW]);

  if (!stats) return null;

  const selectedIndex = Math.min(keyboardIndex ?? filtered.length - 1, filtered.length - 1);
  const selectedPoint = filtered[selectedIndex];
  const isUp = stats.chg >= 0;

  return (
    <div className="space-y-4">

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 mb-2">Edellinen päätös</p>
          <p className="text-[22px] font-semibold tracking-[-0.02em] leading-none num text-white">
            {stats.last.price.toFixed(2).replace('.', ',')} <span className="text-sm font-semibold text-gray-400">€/g</span>
          </p>
          <p className="text-[10px] text-gray-400 mt-1">{fmtDateFull(stats.last.date)} klo 18</p>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 mb-2">30 pv muutos</p>
          <p className={`text-[22px] font-semibold tracking-[-0.02em] leading-none num ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
            {isUp ? '▲' : '▼'} {Math.abs(stats.chg).toFixed(1).replace('.', ',')} %
          </p>
          <p className="text-[10px] text-gray-400 mt-1">{isUp ? 'Nouseva trendi' : 'Laskeva trendi'}</p>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 mb-2">30 pv korkein</p>
          <p className="text-[22px] font-semibold tracking-[-0.02em] leading-none num text-gold-400">
            {stats.high30.toFixed(2).replace('.', ',')} <span className="text-sm font-semibold text-gold-500">€/g</span>
          </p>
          <p className="text-[10px] text-gray-400 mt-1">Kuukauden huippu</p>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400 mb-2">30 pv matalin</p>
          <p className="text-[22px] font-semibold tracking-[-0.02em] leading-none num text-gray-300">
            {stats.low30.toFixed(2).replace('.', ',')} <span className="text-sm font-semibold text-gray-400">€/g</span>
          </p>
          <p className="text-[10px] text-gray-400 mt-1">Kuukauden pohja</p>
        </div>
      </div>

      {/* ── Chart card ── */}
      <div className="rounded-xl border border-white/10 bg-ink-900/70 overflow-hidden">

        {/* Header: sarjan nimi + jakson muutos, alla aikaväli- ja pitoisuusvalinnat */}
        <div className="flex flex-col gap-3 px-4 md:px-5 py-3 border-b border-white/10">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-300">
              {seriesCfg.title}
            </span>
            {periodChange && (
              <p className="num text-sm" aria-live="polite">
                <ChangeText c={periodChange} />
                <span className="text-gray-400"> {periodLabel}</span>
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
          <fieldset className="flex gap-0.5 bg-black/20 border border-white/10 rounded-md p-0.5">
            <legend className="sr-only">Kuvaajan aikaväli</legend>
            {RANGES.map(r => (
              <button
                key={r.key}
                aria-pressed={range === r.key}
                onClick={() => {
                  setRange(r.key);
                  setKeyboardIndex(null);
                  // hovIdx ja mittausväli osoittavat indekseihin filtered-taulukossa —
                  // se on eri taulukko uudella aikavälillä, joten vanhat indeksit on
                  // nollattava ettei osoitin/tooltip jää osoittamaan väärää päivää
                  setHovIdx(null);
                  setMeasure(null);
                  track('hintahistoria-range', { range: r.key });
                }}
                className={`min-h-11 px-3 py-1 rounded text-[11px] font-semibold num transition-colors duration-150 ${
                  range === r.key
                    ? 'bg-white/10 text-gold-400 ring-1 ring-gold-400/40'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </fieldset>
          <fieldset className="flex gap-0.5 bg-black/20 border border-white/10 rounded-md p-0.5">
            <legend className="sr-only">Pitoisuus</legend>
            {SERIES.map(s => (
              <button
                key={s.key}
                aria-pressed={series === s.key}
                onClick={() => {
                  setSeries(s.key);
                  track('hintahistoria-pitoisuus', { series: s.key });
                }}
                className={`min-h-11 px-3 py-1 rounded text-[11px] font-semibold num transition-colors duration-150 ${
                  series === s.key
                    ? 'bg-white/10 text-gold-400 ring-1 ring-gold-400/40'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </fieldset>
          </div>
        </div>

        {/* Ruudunlukijayhteenveto — SVG:n sisältö ei ole saavutettavissa */}
        <p className="sr-only">
          Kullan edellisen pörssipäivän päätöskurssi on {stats.last.price.toFixed(2).replace('.', ',')} euroa grammalta
          ({fmtDateFull(stats.last.date)} klo 18). Sivun yläosassa näkyy tämän hetken kurssi.
          Muutos 30 päivässä: {isUp ? 'nousua' : 'laskua'}{' '}
          {Math.abs(stats.chg).toFixed(1).replace('.', ',')} prosenttia.
          30 päivän korkein hinta {stats.high30.toFixed(2).replace('.', ',')} €/g,
          matalin {stats.low30.toFixed(2).replace('.', ',')} €/g.
        </p>

        {/* SVG */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VW} ${VH}`}
          className={`w-full select-none ${mode === 'measure' ? 'cursor-ew-resize' : 'cursor-crosshair'}`}
          // Mittaustilassa veto ei saa vierittää sivua (touch-action: none)
          style={{ height: 'auto', display: 'block', touchAction: mode === 'measure' ? 'none' : 'pan-y' }}
          onPointerDown={onMeasureDown}
          onPointerMove={onMeasureMove}
          onPointerUp={onMeasureUp}
          onPointerCancel={onMeasureUp}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHovIdx(null)}
          onTouchStart={handleTouch}
          onTouchMove={handleTouch}
          onTouchEnd={() => setHovIdx(null)}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="gpc-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#D4AF37" stopOpacity="0.18" />
              <stop offset="60%"  stopColor="#D4AF37" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#D4AF37" stopOpacity="0"    />
            </linearGradient>
          </defs>

          {/* Kaikki visuaaliset SVG-lapset: pointer-events:none jotta klikit
              menevät SVG-elementille eivätkä jää lapsielementteihin (dead clicks) */}
          <g style={{ pointerEvents: 'none' }}>

          {/* Grid + Y labels */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line
                x1={P.l} y1={t.y} x2={VW - P.r} y2={t.y}
                stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="2 4"
              />
              <text
                x={P.l - 8} y={t.y}
                textAnchor="end" dominantBaseline="middle"
                fill="rgba(255,255,255,0.55)" fontSize="11"
                fontFamily={SVG_FONT}
              >
                {t.price.toFixed(0)}€
              </text>
            </g>
          ))}

          {/* Area */}
          {areaPath && <path d={areaPath} fill="url(#gpc-fill)" />}

          {/* Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#D4AF37"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Mittaa muutos: valittu väli varjostettuna, päätepisteet ja muutos-% */}
          {mode === 'measure' && measureChange && pts[mA] && pts[mB] && (() => {
            const lo = pts[mA], hi = pts[mB];
            const color = measureChange.dir === 'up' ? '#34D399' : measureChange.dir === 'down' ? '#F87171' : '#D4AF37';
            const label = `${measureChange.dir === 'up' ? '▲ ' : measureChange.dir === 'down' ? '▼ ' : ''}${Math.abs(measureChange.pct).toFixed(1).replace('.', ',')} %`;
            const chipW = 70, chipH = 24;
            const chipX = Math.max(P.l, Math.min(VW - P.r - chipW, (lo.x + hi.x) / 2 - chipW / 2));
            return (
              <g>
                <rect x={lo.x} y={P.t} width={Math.max(hi.x - lo.x, 1)} height={CH} fill="#D4AF37" fillOpacity="0.07" />
                {[lo, hi].map((p, i) => (
                  <line key={i} x1={p.x} y1={P.t} x2={p.x} y2={P.t + CH}
                    stroke="rgba(212,175,55,0.6)" strokeWidth="1" strokeDasharray="3 3" />
                ))}
                <line x1={lo.x} y1={lo.y} x2={hi.x} y2={hi.y} stroke={color} strokeWidth="1.25" strokeOpacity="0.7" strokeDasharray="1 3" />
                {[lo, hi].map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="5" fill="#0B0F19" stroke="#D4AF37" strokeWidth="2" />
                ))}
                <rect x={chipX} y={P.t + 4} width={chipW} height={chipH} rx="4" fill="#0B0F19" stroke={color} strokeOpacity="0.6" />
                <text x={chipX + chipW / 2} y={P.t + 4 + chipH / 2} textAnchor="middle" dominantBaseline="central"
                  fill={color} fontSize="12" fontWeight="600" fontFamily={SVG_FONT} style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {label}
                </text>
              </g>
            );
          })()}

          {/* Hover */}
          {mode === 'explore' && hovPt && tooltipPos && (
            <g>
              <line
                x1={hovPt.x} y1={P.t} x2={hovPt.x} y2={P.t + CH}
                stroke="rgba(212,175,55,0.45)" strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle cx={hovPt.x} cy={hovPt.y} r="5.5" fill="#0B0F19" stroke="#D4AF37" strokeWidth="2" />

              {/* Tooltip */}
              <rect
                x={tooltipPos.x} y={tooltipPos.y}
                width={tooltipPos.w} height={tooltipPos.h}
                rx="4" ry="4"
                fill="#0B0F19"
                stroke="rgba(212,175,55,0.45)" strokeWidth="1"
              />
              <text
                x={tooltipPos.x + tooltipPos.w / 2}
                y={tooltipPos.y + 18}
                textAnchor="middle"
                fill="rgba(255,255,255,0.65)"
                fontSize="11"
                fontFamily={SVG_FONT}
              >
                {fmtDateFull(hovPt.date)}
              </text>
              <text
                x={tooltipPos.x + tooltipPos.w / 2}
                y={tooltipPos.y + 39}
                textAnchor="middle"
                fill="#D4AF37"
                fontSize="16"
                fontWeight="600"
                fontFamily={SVG_FONT}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {hovPt.price.toFixed(2).replace('.', ',')} €
              </text>
            </g>
          )}

          {/* X-axis */}
          {xTicks.map((t, i) => (
            <text
              key={i}
              x={t.x} y={VH - 8}
              textAnchor="middle"
              fill="rgba(255,255,255,0.55)"
              fontSize="11"
              fontFamily={SVG_FONT}
            >
              {fmtDateShort(t.date)}
            </text>
          ))}

          </g>
        </svg>

        <div className="border-t border-white/10 px-4 py-4">
          {/* Tilanvaihto: yksittäinen päivä ↔ kahden päivän välinen muutos */}
          <div role="group" aria-label="Kuvaajan tila" className="inline-flex gap-0.5 bg-black/20 border border-white/10 rounded-md p-0.5 mb-4">
            {([['explore', 'Tutki päivää'], ['measure', 'Mittaa muutos']] as [Mode, string][]).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={mode === key}
                onClick={() => {
                  setMode(key);
                  setHovIdx(null);
                  draggingRef.current = false;
                  if (key === 'measure') trackMeasure();
                }}
                className={`min-h-11 px-3.5 py-1 rounded text-xs font-semibold transition-colors duration-150 ${
                  mode === key
                    ? 'bg-white/10 text-gold-400 ring-1 ring-gold-400/40'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'explore' ? (
            <>
              <label htmlFor={sliderId} className="block text-sm text-gray-300 font-semibold">Tutki yksittäistä päivää</label>
              <input
                id={sliderId}
                type="range"
                min={0}
                max={filtered.length - 1}
                value={selectedIndex}
                aria-valuetext={`${fmtDateFull(selectedPoint.date)}: ${selectedPoint.price.toFixed(2).replace('.', ',')} euroa grammalta`}
                onChange={(e) => {
                  const i = Number(e.target.value);
                  setKeyboardIndex(i);
                  setHovIdx(i);
                  if (!hasTrackedInteraction.current) {
                    hasTrackedInteraction.current = true;
                    track('hintahistoria-interaktio', { range });
                  }
                }}
                className="w-full h-11 accent-gold-400"
              />
              <output htmlFor={sliderId} className="block text-sm text-gray-200 num">
                {fmtDateFull(selectedPoint.date)} · <strong>{selectedPoint.price.toFixed(2).replace('.', ',')} €/g</strong>
              </output>
              <p className="text-xs text-gray-400 mt-2">Voit siirtää valintaa myös näppäimistön nuolinäppäimillä.</p>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-300 mb-3">
                Vedä kuvaajassa alkupäivästä loppupäivään — tai säädä päivät alla.
              </p>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                {([['a', 'Alkupäivä', measureAId, mA], ['b', 'Loppupäivä', measureBId, mB]] as const).map(([which, label, id, idx]) => (
                  <div key={which}>
                    <label htmlFor={id} className="flex justify-between gap-2 text-sm text-gray-300 font-semibold">
                      <span>{label}</span>
                      <span className="num font-medium text-gray-400">{fmtDateFull(filtered[idx].date)}</span>
                    </label>
                    <input
                      id={id}
                      type="range"
                      min={0}
                      max={filtered.length - 1}
                      value={idx}
                      aria-valuetext={`${fmtDateFull(filtered[idx].date)}: ${fmt2(filtered[idx].price)} euroa grammalta`}
                      onChange={(e) => {
                        const i = Number(e.target.value);
                        // Alku ei voi ohittaa loppua eikä päinvastoin (ei hyppiviä liukusäätimiä)
                        setMeasure(which === 'a' ? { a: Math.min(i, mB), b: mB } : { a: mA, b: Math.max(i, mA) });
                        trackMeasure();
                      }}
                      className="w-full h-11 accent-gold-400"
                    />
                  </div>
                ))}
              </div>
              {measureChange && (
                <output
                  htmlFor={`${measureAId} ${measureBId}`}
                  aria-live="polite"
                  className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-md border border-white/10 bg-black/20 px-3 py-2.5 text-sm num"
                >
                  <span className="text-gray-200">
                    {fmt2(filtered[mA].price)} → {fmt2(filtered[mB].price)} €/g
                  </span>
                  <span aria-hidden="true" className="text-gray-500">·</span>
                  <ChangeText c={measureChange} />
                  <span aria-hidden="true" className="text-gray-500">·</span>
                  <span className="text-gray-400">{daysBetween(filtered[mA].date, filtered[mB].date)} pv</span>
                </output>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
