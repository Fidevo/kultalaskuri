import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';

interface PricePoint {
  date: string;
  price: number;
}

type Range = '7D' | '30D' | '90D' | 'Max';

interface Props {
  data: PricePoint[];
}

const track = (event: string, data?: Record<string, string | number>) => {
  try { (window as any).umami?.track(event, data); } catch {}
};

// SVG canvas -reunukset. Leveys/korkeus lasketaan komponentissa
// responsiivisesti: kapealla näytöllä käytetään pienempää viewBoxia,
// jolloin kuvaaja renderöityy korkeampana ja tekstit luettavina.
const P = { t: 16, r: 20, b: 40, l: 58 } as const;

const RANGES: { label: string; key: Range; days: number }[] = [
  { label: '7 pv',    key: '7D',  days: 7 },
  { label: '30 pv',   key: '30D', days: 30 },
  { label: '90 pv',   key: '90D', days: 90 },
  { label: 'Kaikki',  key: 'Max', days: Infinity },
];

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return pts.length === 1 ? `M${pts[0].x},${pts[0].y}` : '';
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1], curr = pts[i];
    const cpx = ((prev.x + curr.x) / 2).toFixed(1);
    d += ` C${cpx},${prev.y.toFixed(1)} ${cpx},${curr.y.toFixed(1)} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
  }
  return d;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function fmtDateShort(s: string): string {
  const d = parseDate(s);
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

function fmtDateFull(s: string): string {
  return parseDate(s).toLocaleDateString('fi-FI', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function GoldPriceChart({ data }: Props) {
  const [range, setRange] = useState<Range>('90D');
  const [hovIdx, setHovIdx] = useState<number | null>(null);
  const [isNarrow, setIsNarrow] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const hasTrackedInteraction = useRef(false);

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

  const filtered = useMemo(() => {
    const cfg = RANGES.find(r => r.key === range)!;
    return cfg.days === Infinity ? data : data.slice(-cfg.days);
  }, [data, range]);

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

  // Yhteinen osoitinlogiikka hiirelle ja kosketukselle
  const handlePointer = useCallback((clientX: number) => {
    if (!pts.length || !svgRef.current) return;
    if (!hasTrackedInteraction.current) {
      hasTrackedInteraction.current = true;
      track('hintahistoria-interaktio', { range });
    }
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((clientX - rect.left) / rect.width) * VW;
    let best = 0, bestDist = Infinity;
    pts.forEach((p, i) => {
      const d = Math.abs(p.x - svgX);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    setHovIdx(best);
  }, [pts, VW, range]);

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

  const isUp = stats.chg >= 0;
  const SVG_FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  return (
    <div className="space-y-4">

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Viimeisin</p>
          <p className="text-[22px] font-black leading-none text-white">
            {stats.last.price.toFixed(2).replace('.', ',')} <span className="text-sm font-semibold text-gray-400">€/g</span>
          </p>
          <p className="text-[10px] text-gray-400 mt-1">{fmtDateFull(stats.last.date)}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">30 pv muutos</p>
          <p className={`text-[22px] font-black leading-none ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
            {isUp ? '▲' : '▼'} {Math.abs(stats.chg).toFixed(1)} %
          </p>
          <p className="text-[10px] text-gray-400 mt-1">{isUp ? 'Nouseva trendi' : 'Laskeva trendi'}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">30 pv korkein</p>
          <p className="text-[22px] font-black leading-none text-[#D4AF37]">
            {stats.high30.toFixed(2).replace('.', ',')} <span className="text-sm font-semibold text-[#B59428]">€/g</span>
          </p>
          <p className="text-[10px] text-gray-400 mt-1">Kuukauden huippu</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">30 pv matalin</p>
          <p className="text-[22px] font-black leading-none text-gray-300">
            {stats.low30.toFixed(2).replace('.', ',')} <span className="text-sm font-semibold text-gray-400">€/g</span>
          </p>
          <p className="text-[10px] text-gray-400 mt-1">Kuukauden pohja</p>
        </div>
      </div>

      {/* ── Chart card ── */}
      <div className="rounded-2xl border border-white/10 bg-[#0d1424] overflow-hidden">

        {/* Header / range selector */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
            Kullan spot-hinta €/g · 24K
          </span>
          <div className="flex gap-0.5 bg-white/5 rounded-lg p-0.5">
            {RANGES.map(r => (
              <button
                key={r.key}
                aria-pressed={range === r.key}
                onClick={() => {
                  setRange(r.key);
                  track('hintahistoria-range', { range: r.key });
                }}
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all duration-150 ${
                  range === r.key
                    ? 'bg-[#D4AF37] text-[#0B0F19] shadow-sm'
                    : 'text-gray-500 hover:text-gray-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ruudunlukijayhteenveto — SVG:n sisältö ei ole saavutettavissa */}
        <p className="sr-only">
          Kullan viimeisin spot-hinta on {stats.last.price.toFixed(2).replace('.', ',')} euroa grammalta
          ({fmtDateFull(stats.last.date)}). Muutos 30 päivässä: {isUp ? 'nousua' : 'laskua'}{' '}
          {Math.abs(stats.chg).toFixed(1).replace('.', ',')} prosenttia.
          30 päivän korkein hinta {stats.high30.toFixed(2).replace('.', ',')} €/g,
          matalin {stats.low30.toFixed(2).replace('.', ',')} €/g.
        </p>

        {/* SVG */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VW} ${VH}`}
          className="w-full cursor-crosshair select-none"
          style={{ height: 'auto', display: 'block', touchAction: 'pan-y' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHovIdx(null)}
          onTouchStart={handleTouch}
          onTouchMove={handleTouch}
          onTouchEnd={() => setHovIdx(null)}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="gpc-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#D4AF37" stopOpacity="0.30" />
              <stop offset="60%"  stopColor="#D4AF37" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#D4AF37" stopOpacity="0"    />
            </linearGradient>
            <filter id="gpc-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Kaikki visuaaliset SVG-lapset: pointer-events:none jotta klikit
              menevät SVG-elementille eivätkä jää lapsielementteihin (dead clicks) */}
          <g style={{ pointerEvents: 'none' }}>

          {/* Grid + Y labels */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line
                x1={P.l} y1={t.y} x2={VW - P.r} y2={t.y}
                stroke="rgba(255,255,255,0.05)" strokeWidth="1"
              />
              <text
                x={P.l - 8} y={t.y}
                textAnchor="end" dominantBaseline="middle"
                fill="rgba(255,255,255,0.22)" fontSize="11"
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
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Hover */}
          {hovPt && tooltipPos && (
            <g>
              <line
                x1={hovPt.x} y1={P.t} x2={hovPt.x} y2={P.t + CH}
                stroke="rgba(255,255,255,0.18)" strokeWidth="1"
                strokeDasharray="4 3"
              />
              <circle cx={hovPt.x} cy={hovPt.y} r="14" fill="#D4AF37" fillOpacity="0.10" />
              <circle cx={hovPt.x} cy={hovPt.y} r="6"  fill="#D4AF37" filter="url(#gpc-glow)" />
              <circle cx={hovPt.x} cy={hovPt.y} r="3"  fill="#fff" />

              {/* Tooltip */}
              <rect
                x={tooltipPos.x} y={tooltipPos.y}
                width={tooltipPos.w} height={tooltipPos.h}
                rx="8" ry="8"
                fill="#131b2e"
                stroke="rgba(212,175,55,0.35)" strokeWidth="1"
              />
              <text
                x={tooltipPos.x + tooltipPos.w / 2}
                y={tooltipPos.y + 18}
                textAnchor="middle"
                fill="rgba(255,255,255,0.40)"
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
                fontWeight="700"
                fontFamily={SVG_FONT}
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
              fill="rgba(255,255,255,0.22)"
              fontSize="11"
              fontFamily={SVG_FONT}
            >
              {fmtDateShort(t.date)}
            </text>
          ))}

          </g>
        </svg>
      </div>
    </div>
  );
}
