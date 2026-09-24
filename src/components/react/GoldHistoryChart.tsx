import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Crosshair } from 'lucide-react';
import { GOLD_PURITIES } from '../../lib/calculations/goldCalculator';
import {
  track, SVG_FONT, linePath, fmtDateFull, fmt2, daysBetween, changeBetween, ChangeText, parseDate,
} from './chartUtils';

// Pitkä hintahistoria (/kullan-hintahistoria/): aikavälit 1 v – kaikki, pitoisuusvalinta,
// mittaa muutos -tila sekä käännekohdat (numeroidut merkit kuvaajassa + aikajana alla).
// Yli vuoden aikavälit piirretään viikkodatasta (kevyempi HTML), 1 v päivädatasta.

interface PricePoint { date: string; price: number }

export interface HistoryEvent {
  id: string;
  kind: 'shock' | 'peak' | 'trough' | 'trend';
  anchorDate: string; // pörssipäivä, johon merkki kohdistuu
  dateLabel: string; // tapahtumapäivä suomeksi
  title: string;
  text: string;
  metricLabel: string;
  metricValue: string;
  dir: 'up' | 'down' | 'flat';
  price: number; // €/g kohdistuspäivänä (spot)
  sourceName: string;
  sourceUrl: string;
}

interface Props {
  daily: PricePoint[]; // viimeiset ~13 kk päivittäin
  weekly: PricePoint[]; // koko historia viikoittain
  events: HistoryEvent[];
  eventsHeading: string;
  eventsIntro: string;
}

type Range = '1Y' | '3Y' | '5Y' | '10Y' | 'Max';
type Series = 'spot' | '18K' | '14K';
type Mode = 'explore' | 'measure';

const RANGES: { key: Range; label: string; years: number }[] = [
  { key: '1Y', label: '1 v', years: 1 },
  { key: '3Y', label: '3 v', years: 3 },
  { key: '5Y', label: '5 v', years: 5 },
  { key: '10Y', label: '10 v', years: 10 },
  { key: 'Max', label: 'Kaikki', years: Infinity },
];

// Vain pörssiarvo pitoisuuksittain — ei tavoitehintaa (sääntö 4)
const SERIES: { key: Series; label: string; title: string; factor: number }[] = [
  { key: 'spot', label: 'Spot', title: 'Kullan spot-hinta €/g', factor: 1 },
  { key: '18K', label: '18K', title: '18K (750) pörssiarvo €/g', factor: GOLD_PURITIES['18K'].decimal },
  { key: '14K', label: '14K', title: '14K (585) pörssiarvo €/g', factor: GOLD_PURITIES['14K'].decimal },
];

const P = { t: 18, r: 18, b: 36, l: 50 } as const;

// "Pyöreä" asteikon väli (1, 2, 2,5, 5 × 10^n) — finanssikuvaajan tapaan tasaluvut akselilla
function niceStep(span: number, targetTicks: number): number {
  const raw = span / targetTicks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
}

// Mittausvälin kesto: alle vuoden päivinä, muuten vuosina yhdellä desimaalilla
const spanLabel = (days: number) =>
  days >= 365 ? `${(days / 365.25).toFixed(1).replace('.', ',')} v` : `${days} pv`;

const segBtn = (active: boolean) =>
  `min-h-11 px-3 py-1 rounded text-[11px] font-semibold num transition-colors duration-150 ${
    active ? 'bg-white/10 text-gold-400 ring-1 ring-gold-400/40' : 'text-gray-400 hover:text-gray-200'
  }`;

export default function GoldHistoryChart({ daily, weekly, events, eventsHeading, eventsIntro }: Props) {
  const [range, setRange] = useState<Range>('Max');
  const [series, setSeries] = useState<Series>('spot');
  const [mode, setMode] = useState<Mode>('explore');
  const [hovIdx, setHovIdx] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [measure, setMeasure] = useState<{ a: number; b: number } | null>(null);
  const [isNarrow, setIsNarrow] = useState(false);
  const draggingRef = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const tracked = useRef<Record<string, boolean>>({});
  const aId = useId();
  const bId = useId();
  const once = (key: string, data?: Record<string, string | number>) => {
    if (tracked.current[key]) return;
    tracked.current[key] = true;
    track(key, data);
  };

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 640px)');
    setIsNarrow(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const VW = isNarrow ? 400 : 800;
  const VH = isNarrow ? 300 : 300;
  const CW = VW - P.l - P.r;
  const CH = VH - P.t - P.b;

  const seriesCfg = SERIES.find(s => s.key === series)!;
  const rangeCfg = RANGES.find(r => r.key === range)!;

  // Aikaväli: 1 v päivädatasta, pidemmät viikkodatasta
  const filtered = useMemo(() => {
    const src = range === '1Y' ? daily : weekly;
    const lastDate = src.at(-1)?.date ?? '';
    let sliced = src;
    if (rangeCfg.years !== Infinity && lastDate) {
      const d = parseDate(lastDate);
      d.setFullYear(d.getFullYear() - rangeCfg.years);
      const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      sliced = src.filter(p => p.date >= from);
    }
    return seriesCfg.factor === 1 ? sliced : sliced.map(p => ({ date: p.date, price: p.price * seriesCfg.factor }));
  }, [daily, weekly, range, rangeCfg, seriesCfg]);

  const { pts, minP, maxP, step } = useMemo(() => {
    if (!filtered.length) return { pts: [] as { x: number; y: number; date: string; price: number }[], minP: 0, maxP: 0, step: 1 };
    const prices = filtered.map(d => d.price);
    const lo = Math.min(...prices), hi = Math.max(...prices);
    const step = niceStep(Math.max(hi - lo, 1), 5);
    const minP = Math.max(0, Math.floor(lo / step) * step);
    const maxP = Math.ceil(hi / step) * step + (hi % step === 0 ? step : 0);
    const n = filtered.length;
    const pts = filtered.map((d, i) => ({
      x: P.l + (n < 2 ? CW / 2 : (i / (n - 1)) * CW),
      y: P.t + (1 - (d.price - minP) / (maxP - minP)) * CH,
      date: d.date,
      price: d.price,
    }));
    return { pts, minP, maxP, step };
  }, [filtered, CW, CH]);

  const path = useMemo(() => linePath(pts), [pts]);
  const area = useMemo(() => {
    if (!pts.length || !path) return '';
    const bot = (P.t + CH).toFixed(1);
    return `${path} L${pts.at(-1)!.x.toFixed(1)},${bot} L${pts[0].x.toFixed(1)},${bot}Z`;
  }, [path, pts, CH]);

  const yTicks = useMemo(() => {
    const out: { price: number; y: number }[] = [];
    for (let v = minP; v <= maxP + 1e-9; v += step) {
      out.push({ price: v, y: P.t + CH - ((v - minP) / (maxP - minP)) * CH });
    }
    return out;
  }, [minP, maxP, step, CH]);

  // X-akseli: vuodet (≥3 v) tai kuukaudet (1 v)
  const xTicks = useMemo(() => {
    if (pts.length < 2) return [] as { x: number; label: string }[];
    const out: { x: number; label: string }[] = [];
    if (range === '1Y') {
      let prevM = '';
      pts.forEach(p => {
        const m = p.date.slice(0, 7);
        if (m !== prevM) { prevM = m; out.push({ x: p.x, label: `${Number(p.date.slice(5, 7))}/${p.date.slice(2, 4)}` }); }
      });
      const step = isNarrow ? 3 : 2;
      return out.filter((_, i) => i % step === 1);
    }
    let prevY = '';
    pts.forEach(p => {
      const y = p.date.slice(0, 4);
      if (y !== prevY) { prevY = y; out.push({ x: p.x, label: y }); }
    });
    const first = out[0];
    const rest = out.slice(1); // ensimmäinen vuosi on usein vajaa → ei nimeä reunaan
    const step = Math.ceil(rest.length / (isNarrow ? 4 : 8));
    return (first && rest.length === 0 ? [first] : rest).filter((_, i) => i % step === 0);
  }, [pts, range, isNarrow]);

  // Tapahtumamerkit: numero = järjestys koko aikajanalla (1 = vanhin)
  const markers = useMemo(() => events
    .map((e, n) => {
      if (!pts.length || e.anchorDate < pts[0].date || e.anchorDate > pts.at(-1)!.date) return null;
      // Lähin piste päivämäärältään (viikkodatassa tapahtuma voi osua viikon keskelle)
      const t = parseDate(e.anchorDate).getTime();
      let k = 0, best = Infinity;
      pts.forEach((p, i) => { const d = Math.abs(parseDate(p.date).getTime() - t); if (d < best) { best = d; k = i; } });
      return { id: e.id, n: n + 1, x: pts[k].x, y: pts[k].y };
    })
    .filter(Boolean) as { id: string; n: number; x: number; y: number }[], [events, pts]);

  const indexAt = useCallback((clientX: number): number | null => {
    if (!pts.length || !svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    if (!rect.width) return null;
    const svgX = ((clientX - rect.left) / rect.width) * VW;
    let best = 0, bestDist = Infinity;
    pts.forEach((p, i) => { const d = Math.abs(p.x - svgX); if (d < bestDist) { bestDist = d; best = i; } });
    return best;
  }, [pts, VW]);

  const onExploreMove = (clientX: number) => {
    if (mode !== 'explore') return;
    const i = indexAt(clientX);
    if (i === null) return;
    once('hintahistoria-pitka-interaktio', { range });
    setHovIdx(i);
  };

  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (mode !== 'measure') return;
    const i = indexAt(e.clientX);
    if (i === null) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    draggingRef.current = true;
    setMeasure({ a: i, b: i });
    once('hintahistoria-pitka-mittaus', { range });
  };
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (mode !== 'measure' || !draggingRef.current) return;
    const i = indexAt(e.clientX);
    if (i !== null) setMeasure(m => (m ? { a: m.a, b: i } : { a: i, b: i }));
  };
  const onUp = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setMeasure(m => (m && m.a === m.b ? null : m));
  };

  const resetForRange = (r: Range) => {
    setRange(r);
    setHovIdx(null);
    setMeasure(null);
    track('hintahistoria-pitka-range', { range: r });
  };

  // Tapahtuman valinta listasta: varmistetaan että se näkyy kuvaajassa, vieritetään kuvaajaan
  const showEvent = (id: string) => {
    const e = events.find(x => x.id === id);
    if (!e) return;
    setSelected(id);
    setMode('explore');
    setHovIdx(null);
    const inRange = pts.length && e.anchorDate >= pts[0].date && e.anchorDate <= pts.at(-1)!.date;
    if (!inRange) { setRange('Max'); setMeasure(null); }
    once('hintahistoria-kaannekohta', { id });
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    chartRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  };

  if (!pts.length) return null;

  const periodChange = filtered.length > 1 ? changeBetween(filtered[0].price, filtered.at(-1)!.price) : null;
  const periodLabel = range === 'Max'
    ? `${fmtDateFull(filtered[0].date)} alkaen`
    : `${rangeCfg.years} vuodessa`;

  const mA = measure ? Math.min(measure.a, measure.b) : 0;
  const mB = measure ? Math.max(measure.a, measure.b) : pts.length - 1;
  const measureChange = changeBetween(filtered[mA].price, filtered[mB].price);

  const hov = mode === 'explore' && hovIdx !== null ? pts[hovIdx] : null;
  const selEvent = selected ? events.find(e => e.id === selected) : null;
  const selMarker = selected ? markers.find(m => m.id === selected) : null;

  const tooltip = hov ? (() => {
    const w = 132, h = 50, gap = 10;
    const x = Math.max(P.l + 2, Math.min(VW - P.r - w - 2, hov.x - w / 2));
    const yAbove = hov.y - h - gap;
    return { x, y: yAbove < P.t ? hov.y + gap : yAbove, w, h };
  })() : null;

  return (
    <div>
      {/* ── Kuvaajakortti ── */}
      <div ref={chartRef} className="rounded-xl border border-white/10 bg-ink-900/70 overflow-hidden scroll-mt-24">
        <div className="flex flex-col gap-3 px-4 md:px-5 py-3 border-b border-white/10">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-300">{seriesCfg.title}</span>
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
                <button key={r.key} type="button" aria-pressed={range === r.key} onClick={() => resetForRange(r.key)} className={segBtn(range === r.key)}>
                  {r.label}
                </button>
              ))}
            </fieldset>
            <fieldset className="flex gap-0.5 bg-black/20 border border-white/10 rounded-md p-0.5">
              <legend className="sr-only">Pitoisuus</legend>
              {SERIES.map(s => (
                <button key={s.key} type="button" aria-pressed={series === s.key}
                  onClick={() => { setSeries(s.key); track('hintahistoria-pitka-pitoisuus', { series: s.key }); }}
                  className={segBtn(series === s.key)}>
                  {s.label}
                </button>
              ))}
            </fieldset>
          </div>
        </div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${VW} ${VH}`}
          className={`w-full select-none ${mode === 'measure' ? 'cursor-ew-resize' : 'cursor-crosshair'}`}
          style={{ height: 'auto', display: 'block', touchAction: mode === 'measure' ? 'none' : 'pan-y' }}
          onPointerDown={onDown}
          onPointerMove={(e) => { if (mode === 'measure') onMove(e); else if (e.pointerType === 'mouse') onExploreMove(e.clientX); }}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={() => { if (mode === 'explore') setHovIdx(null); }}
          onTouchStart={(e) => { if (mode === 'explore' && e.touches[0]) onExploreMove(e.touches[0].clientX); }}
          onTouchMove={(e) => { if (mode === 'explore' && e.touches[0]) onExploreMove(e.touches[0].clientX); }}
          onTouchEnd={() => { if (mode === 'explore') setHovIdx(null); }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="ghc-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.18" />
              <stop offset="70%" stopColor="#D4AF37" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g style={{ pointerEvents: 'none' }}>
            {yTicks.map((t, i) => (
              <g key={i}>
                <line x1={P.l} y1={t.y} x2={VW - P.r} y2={t.y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="2 4" />
                <text x={P.l - 8} y={t.y} textAnchor="end" dominantBaseline="middle" fill="rgba(255,255,255,0.55)" fontSize="11" fontFamily={SVG_FONT}>
                  {t.price.toFixed(0)}€
                </text>
              </g>
            ))}
            {xTicks.map((t, i) => (
              <text key={i} x={t.x} y={VH - 10} textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="11" fontFamily={SVG_FONT}>{t.label}</text>
            ))}

            {area && <path d={area} fill="url(#ghc-fill)" />}
            {path && <path d={path} fill="none" stroke="#D4AF37" strokeWidth={range === '1Y' ? 1.75 : 1.5} strokeLinejoin="round" />}

            {/* Valittu käännekohta: pystyviiva + otsikkolaatikko */}
            {selMarker && selEvent && mode === 'explore' && (() => {
              const w = Math.min(isNarrow ? 220 : 300, 12 + selEvent.title.length * 6.4);
              const x = Math.max(P.l, Math.min(VW - P.r - w, selMarker.x - w / 2));
              return (
                <g>
                  <line x1={selMarker.x} y1={P.t} x2={selMarker.x} y2={P.t + CH} stroke="rgba(212,175,55,0.55)" strokeWidth="1" strokeDasharray="3 3" />
                  <rect x={x} y={P.t + 2} width={w} height={22} rx="4" fill="#0B0F19" stroke="rgba(212,175,55,0.5)" />
                  <text x={x + w / 2} y={P.t + 13} textAnchor="middle" dominantBaseline="central" fill="#ECD895" fontSize="11" fontWeight="600" fontFamily={SVG_FONT}>
                    {selEvent.title.length > (isNarrow ? 32 : 46) ? selEvent.title.slice(0, isNarrow ? 31 : 45) + '…' : selEvent.title}
                  </text>
                </g>
              );
            })()}

            {/* Mittausväli */}
            {mode === 'measure' && pts[mA] && pts[mB] && (() => {
              const lo = pts[mA], hi = pts[mB];
              const color = measureChange.dir === 'up' ? '#34D399' : measureChange.dir === 'down' ? '#F87171' : '#D4AF37';
              const label = `${measureChange.dir === 'up' ? '▲ ' : measureChange.dir === 'down' ? '▼ ' : ''}${Math.abs(measureChange.pct).toFixed(1).replace('.', ',')} %`;
              const cw = 76, cx = Math.max(P.l, Math.min(VW - P.r - cw, (lo.x + hi.x) / 2 - cw / 2));
              return (
                <g>
                  <rect x={lo.x} y={P.t} width={Math.max(hi.x - lo.x, 1)} height={CH} fill="#D4AF37" fillOpacity="0.07" />
                  {[lo, hi].map((p, i) => <line key={i} x1={p.x} y1={P.t} x2={p.x} y2={P.t + CH} stroke="rgba(212,175,55,0.6)" strokeDasharray="3 3" />)}
                  {[lo, hi].map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="5" fill="#0B0F19" stroke="#D4AF37" strokeWidth="2" />)}
                  <rect x={cx} y={P.t + 4} width={cw} height={24} rx="4" fill="#0B0F19" stroke={color} strokeOpacity="0.6" />
                  <text x={cx + cw / 2} y={P.t + 16} textAnchor="middle" dominantBaseline="central" fill={color} fontSize="12" fontWeight="600" fontFamily={SVG_FONT}>{label}</text>
                </g>
              );
            })()}

            {/* Käännekohtien merkit */}
            {mode === 'explore' && markers.map(m => {
              const active = m.id === selected;
              const r = isNarrow ? 7 : 8;
              return (
                <g key={m.id}>
                  <circle cx={m.x} cy={m.y} r={r + 3} fill="#D4AF37" fillOpacity={active ? 0.25 : 0} />
                  <circle cx={m.x} cy={m.y} r={r} fill={active ? '#D4AF37' : '#0B0F19'} stroke="#D4AF37" strokeWidth="1.5" />
                  <text x={m.x} y={m.y} textAnchor="middle" dominantBaseline="central" fontSize={isNarrow ? 8 : 9} fontWeight="700"
                    fill={active ? '#0B0F19' : '#ECD895'} fontFamily={SVG_FONT}>{m.n}</text>
                </g>
              );
            })}

            {hov && tooltip && (
              <g>
                <line x1={hov.x} y1={P.t} x2={hov.x} y2={P.t + CH} stroke="rgba(212,175,55,0.45)" strokeDasharray="3 3" />
                <circle cx={hov.x} cy={hov.y} r="5" fill="#0B0F19" stroke="#D4AF37" strokeWidth="2" />
                <rect x={tooltip.x} y={tooltip.y} width={tooltip.w} height={tooltip.h} rx="4" fill="#0B0F19" stroke="rgba(212,175,55,0.45)" />
                <text x={tooltip.x + tooltip.w / 2} y={tooltip.y + 17} textAnchor="middle" fill="rgba(255,255,255,0.65)" fontSize="11" fontFamily={SVG_FONT}>
                  {range === '1Y' ? fmtDateFull(hov.date) : `viikko ${fmtDateFull(hov.date)}`}
                </text>
                <text x={tooltip.x + tooltip.w / 2} y={tooltip.y + 37} textAnchor="middle" fill="#D4AF37" fontSize="16" fontWeight="600" fontFamily={SVG_FONT}>
                  {fmt2(hov.price)} €
                </text>
              </g>
            )}
          </g>
        </svg>

        {/* Merkkien napautusalueet kuvaajan alla (saavutettavat napit, eivät SVG:n sisällä) */}
        <div className="border-t border-white/10 px-4 py-4">
          <div role="group" aria-label="Kuvaajan tila" className="inline-flex gap-0.5 bg-black/20 border border-white/10 rounded-md p-0.5 mb-3">
            {([['explore', 'Käännekohdat'], ['measure', 'Mittaa muutos']] as [Mode, string][]).map(([k, label]) => (
              <button key={k} type="button" aria-pressed={mode === k}
                onClick={() => { setMode(k); setHovIdx(null); draggingRef.current = false; if (k === 'measure') once('hintahistoria-pitka-mittaus', { range }); }}
                className={`min-h-11 px-3.5 py-1 rounded text-xs font-semibold transition-colors ${mode === k ? 'bg-white/10 text-gold-400 ring-1 ring-gold-400/40' : 'text-gray-400 hover:text-gray-200'}`}>
                {label}
              </button>
            ))}
          </div>

          {mode === 'explore' ? (
            markers.length > 0 ? (
              <div>
                <p className="text-xs text-gray-400 mb-2">Valitse käännekohta nähdäksesi sen kuvaajassa:</p>
                <div className="flex flex-wrap gap-1.5">
                  {markers.map(m => {
                    const e = events.find(x => x.id === m.id)!;
                    const active = selected === m.id;
                    return (
                      <button key={m.id} type="button" aria-pressed={active}
                        onClick={() => { setSelected(active ? null : m.id); once('hintahistoria-kaannekohta', { id: m.id }); }}
                        title={e.title}
                        className={`num min-w-11 min-h-11 px-2 rounded-md border text-xs font-semibold transition-colors ${
                          active ? 'bg-gold-400 border-gold-400 text-ink-950' : 'border-white/15 text-gray-300 hover:border-gold-400/60'}`}>
                        {m.n}
                        <span className="sr-only">. {e.title}</span>
                      </button>
                    );
                  })}
                </div>
                {selEvent && (
                  <p className="mt-3 text-sm text-gray-200" aria-live="polite">
                    <span className="text-gold-400 font-semibold">{selEvent.dateLabel}:</span> {selEvent.title} ·{' '}
                    <a href={`#kaannekohta-${selEvent.id}`} className="text-gold-400 underline underline-offset-2 decoration-gold-400/40 hover:decoration-gold-400">lue lisää</a>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Tällä aikavälillä ei ole merkittyjä käännekohtia — valitse pidempi aikaväli.</p>
            )
          ) : (
            <>
              <p className="text-sm text-gray-300 mb-3">Vedä kuvaajassa alkupäivästä loppupäivään — tai säädä päivät alla.</p>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                {([['a', 'Alkupäivä', aId, mA], ['b', 'Loppupäivä', bId, mB]] as const).map(([which, label, id, idx]) => (
                  <div key={which}>
                    <label htmlFor={id} className="flex justify-between gap-2 text-sm text-gray-300 font-semibold">
                      <span>{label}</span>
                      <span className="num font-medium text-gray-400">{fmtDateFull(filtered[idx].date)}</span>
                    </label>
                    <input id={id} type="range" min={0} max={filtered.length - 1} value={idx}
                      aria-valuetext={`${fmtDateFull(filtered[idx].date)}: ${fmt2(filtered[idx].price)} euroa grammalta`}
                      onChange={(e) => {
                        const i = Number(e.target.value);
                        setMeasure(which === 'a' ? { a: Math.min(i, mB), b: mB } : { a: mA, b: Math.max(i, mA) });
                        once('hintahistoria-pitka-mittaus', { range });
                      }}
                      className="w-full h-11 accent-gold-400" />
                  </div>
                ))}
              </div>
              <output htmlFor={`${aId} ${bId}`} aria-live="polite"
                className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-md border border-white/10 bg-black/20 px-3 py-2.5 text-sm num">
                <span className="text-gray-200">{fmt2(filtered[mA].price)} → {fmt2(filtered[mB].price)} €/g</span>
                <span aria-hidden="true" className="text-gray-500">·</span>
                <ChangeText c={measureChange} />
                <span aria-hidden="true" className="text-gray-500">·</span>
                <span className="text-gray-400">{spanLabel(daysBetween(filtered[mA].date, filtered[mB].date))}</span>
              </output>
            </>
          )}
        </div>
      </div>

      {/* ── Käännekohdat: aikajana ── */}
      <div className="mt-14">
        <h2 id="kaannekohdat" className="text-2xl md:text-3xl font-black text-white mb-3 tracking-tight scroll-mt-24">{eventsHeading}</h2>
        <p className="text-sm md:text-base text-gray-400 max-w-2xl leading-relaxed mb-8">{eventsIntro}</p>

        <ol className="relative border-l border-white/10 ml-3 md:ml-4 space-y-6">
          {events.map((e, i) => {
            const active = selected === e.id;
            const color = e.dir === 'up' ? 'text-emerald-400' : e.dir === 'down' ? 'text-red-400' : 'text-gray-300';
            return (
              <li key={e.id} id={`kaannekohta-${e.id}`} className="relative pl-7 md:pl-9 scroll-mt-28">
                <span aria-hidden="true"
                  className={`num absolute -left-[13px] top-1 w-[26px] h-[26px] rounded-full border text-[11px] font-bold flex items-center justify-center ${
                    active ? 'bg-gold-400 border-gold-400 text-ink-950' : 'bg-ink-950 border-gold-400/70 text-gold-300'}`}>
                  {i + 1}
                </span>
                <article className={`rounded-lg border p-4 md:p-5 transition-colors ${active ? 'border-gold-400/60 bg-white/[0.05]' : 'border-white/10 bg-white/[0.02]'}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-1.5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-400 num">{e.dateLabel}</p>
                    <p className="text-sm num">
                      <span className="text-gray-400">{e.metricLabel} </span>
                      <span className={`font-semibold ${e.kind === 'peak' || e.kind === 'trough' ? 'text-gray-100' : color}`}>{e.metricValue}</span>
                    </p>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-white mb-2">{e.title}</h3>
                  <p className="text-sm md:text-[15px] text-gray-300 leading-relaxed">{e.text}</p>
                  <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-white/10">
                    <a href={e.sourceUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 underline underline-offset-2 decoration-white/20">
                      Lähde: {e.sourceName}<ArrowUpRight size={13} aria-hidden="true" />
                      <span className="sr-only">(avautuu uuteen välilehteen)</span>
                    </a>
                    <button type="button" onClick={() => showEvent(e.id)}
                      className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-md border border-white/15 text-xs font-semibold text-gray-200 hover:border-gold-400/60 hover:text-white transition-colors">
                      <Crosshair size={14} aria-hidden="true" className="text-gold-400" />
                      Näytä kuvaajassa
                    </button>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
