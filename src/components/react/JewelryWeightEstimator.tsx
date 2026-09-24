import React, { useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { calculateGoldValue, type PurityCode } from '../../lib/calculations/goldCalculator';

// Painoarvio ilman vaakaa: korutyyppi → koko → pitoisuus → arvio, joka siirretään
// päälaskuriin (kl:use-weight). Redesign 9/2026: omat viivaikonit, kokoa kuvaava
// piirros, pyöristetty "noin"-hinta (keskipainosta laskettu arvio ei ole senttitarkka)
// ja ohut tulosrivi — pääinstrumentti on laskuri, ei tämä apuväline.

type JewelryType = 'sormus' | 'kaulakoru' | 'rannekoru' | 'korvakorut';

// FAKTATIEDOT: Keskimääräiset painot (g). Pidä synkassa index.astro:n jewelryWeights-taulukon kanssa.
const JEWELRY_DATA: Record<JewelryType, { label: string; sizes: { label: string; desc: string; weight: number }[] }> = {
  sormus: {
    label: 'Sormus',
    sizes: [
      { label: 'Kevyt', desc: 'Siro naisten sormus', weight: 2.0 },
      { label: 'Keskikoko', desc: 'Vihkisormus / Normaali', weight: 4.0 },
      { label: 'Raskas', desc: 'Miesten sormus / Leveä', weight: 8.0 },
    ],
  },
  kaulakoru: {
    label: 'Kaulakoru',
    sizes: [
      { label: 'Ohut', desc: 'Siro riipusketju', weight: 3.0 },
      { label: 'Keskivahva', desc: 'Selkeästi erottuva', weight: 8.0 },
      { label: 'Paksu', desc: 'Panssariketju tms.', weight: 20.0 },
    ],
  },
  rannekoru: {
    label: 'Rannekoru',
    sizes: [
      { label: 'Ohut', desc: 'Siro ketju', weight: 3.0 },
      { label: 'Keskivahva', desc: 'Bismark / Laatta', weight: 7.0 },
      { label: 'Paksu', desc: 'Tukeva panssari', weight: 15.0 },
    ],
  },
  korvakorut: {
    label: 'Korvakorut',
    sizes: [
      { label: 'Pienet', desc: 'Napit (pari)', weight: 1.0 },
      { label: 'Keskikoko', desc: 'Renkaat (pari)', weight: 3.0 },
      { label: 'Isot', desc: 'Näyttävät / Riippuvat', weight: 6.0 },
    ],
  },
};

const TYPES = Object.keys(JEWELRY_DATA) as JewelryType[];
const COMMON_PURITIES: PurityCode[] = ['9K', '14K', '18K', '22K'];

interface Props {
  spotPrice: number;
}

const track = (event: string, data?: Record<string, string | number>) => {
  try { (window as any).umami?.track(event, data); } catch {}
};

// ── Korutyyppien viivaikonit (24×24, stroke 1.75, lucide-tyyliin) ──
function TypeIcon({ type, className = '' }: { type: JewelryType; className?: string }) {
  const common = { width: 26, height: 26, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, className, 'aria-hidden': true };
  switch (type) {
    case 'sormus':
      return <svg {...common}><ellipse cx="12" cy="14.5" rx="7" ry="6.5" /><ellipse cx="12" cy="14.5" rx="4.6" ry="4.1" /><path d="m9.5 7.8 1.2-2.3h2.6l1.2 2.3" /><path d="M10.7 5.5 12 3.5l1.3 2" /></svg>;
    case 'kaulakoru':
      return <svg {...common}><path d="M4 3.5c.6 6.5 4 10 8 10s7.4-3.5 8-10" strokeDasharray="1.6 2.2" /><path d="M12 13.5v1.5" /><path d="M12 15l2.4 2.8L12 21l-2.4-3.2Z" /></svg>;
    case 'rannekoru':
      return <svg {...common}><ellipse cx="12" cy="12" rx="9" ry="5.5" /><ellipse cx="12" cy="12" rx="6.6" ry="3.4" /><path d="M5.5 9.5 7 10.6M9 7.2l.6 1.6M15 7.2l-.6 1.6M18.5 9.5 17 10.6" /></svg>;
    case 'korvakorut':
      return <svg {...common}><circle cx="7.5" cy="6" r="1.4" /><path d="M7.5 7.4v1.8" /><circle cx="7.5" cy="14" r="4.6" /><circle cx="16.5" cy="6" r="1.4" /><path d="M16.5 7.4v1.8" /><circle cx="16.5" cy="14" r="4.6" /></svg>;
  }
}

// ── Kokoa kuvaava piirros: paksuus/koko kasvaa valinnan mukaan (0 = kevyin) ──
function SizeArt({ type, level }: { type: JewelryType; level: number }) {
  const w = [1.6, 3.2, 5.6][level]; // viivan paksuus
  const props = { viewBox: '0 0 64 40', className: 'w-20 h-[50px] md:w-24 md:h-[60px]', fill: 'none', 'aria-hidden': true } as const;
  const stroke = 'currentColor';
  switch (type) {
    case 'sormus': {
      const band = [2.2, 4.2, 7][level];
      return <svg {...props}><ellipse cx="32" cy="22" rx="18" ry="13" stroke={stroke} strokeWidth={band} /><ellipse cx="32" cy="22" rx="18" ry="13" stroke="#0B0F19" strokeOpacity="0.12" strokeWidth="0.75" transform={`translate(0 ${band / 2})`} /></svg>;
    }
    case 'kaulakoru': {
      const pend = [3, 4.5, 0][level];
      return <svg {...props}>
        <path d="M6 3c2 13 12 19 26 19S56 16 58 3" stroke={stroke} strokeWidth={w} strokeLinecap="round" strokeDasharray={level === 2 ? '3.5 2.5' : undefined} />
        {/* Riipus mahtuu viewBoxiin: alin piste 24 + 2 × pend ≤ 33 */}
        {pend > 0 && <path d={`M32 22v2m0 0 ${pend} ${pend} -${pend} ${pend} -${pend} -${pend}Z`} stroke={stroke} strokeWidth="1.4" strokeLinejoin="round" />}
      </svg>;
    }
    case 'rannekoru':
      return <svg {...props}><ellipse cx="32" cy="20" rx="24" ry="12" stroke={stroke} strokeWidth={w} strokeDasharray={level === 2 ? '4 2.5' : undefined} /></svg>;
    case 'korvakorut': {
      const r = [3.6, 7, 9][level];
      return <svg {...props}>
        {[20, 44].map(cx => level === 0
          ? <g key={cx}><circle cx={cx} cy="18" r={r} fill={stroke} /><circle cx={cx} cy="18" r={r + 2.2} stroke={stroke} strokeWidth="1" strokeOpacity="0.5" /></g>
          : level === 1
            ? <circle key={cx} cx={cx} cy="20" r={r} stroke={stroke} strokeWidth="2.4" />
            : <path key={cx} d={`M${cx} 4v6m0 0 ${(r * 0.7).toFixed(1)} ${(r * 1.2).toFixed(1)} -${(r * 0.7).toFixed(1)} ${(r * 1.2).toFixed(1)} -${(r * 0.7).toFixed(1)} -${(r * 1.2).toFixed(1)}Z`} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />)}
      </svg>;
    }
  }
}

// Keskipainoon perustuva arvio ei ole senttitarkka → pyöristys: alle 50 € euroon, muuten 5 euroon
const roundEstimate = (v: number) => (v < 50 ? Math.round(v) : Math.round(v / 5) * 5);
const fmtNoin = (v: number) =>
  `noin ${new Intl.NumberFormat('fi-FI', { maximumFractionDigits: 0 }).format(roundEstimate(v))} €`;

const StepLabel = ({ n, children }: { n: number; children: React.ReactNode }) => (
  <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-600 mb-3">
    <span className="num w-5 h-5 rounded-full bg-ink-950 text-gold-400 text-[10px] font-bold flex items-center justify-center" aria-hidden="true">{n}</span>
    {children}
  </span>
);

export default function JewelryWeightEstimator({ spotPrice }: Props) {
  const [activeType, setActiveType] = useState<JewelryType>('sormus');
  const [selectedSize, setSelectedSize] = useState<number>(1); // Oletus: keskikoko
  const [selectedPurity, setSelectedPurity] = useState<PurityCode>('14K');

  // Kaikki hintalaskenta kulkee calculateGoldValue()-funktion kautta,
  // jotta pitoisuuskohtaiset tavoitehintakertoimet osuvat aina oikein
  const estimateValue = (weight: number) =>
    calculateGoldValue(weight, selectedPurity, spotPrice)?.targetValue ?? 0;

  const currentData = JEWELRY_DATA[activeType];
  const size = currentData.sizes[selectedSize];

  // Siirrä valittu paino ja pitoisuus päälaskuriin (CustomEvent, islandit ovat erillisiä)
  const useInCalculator = (e: React.MouseEvent) => {
    e.preventDefault();
    track('koruarvio-laske-tarkka');
    window.dispatchEvent(new CustomEvent('kl:use-weight', {
      detail: { weight: size.weight, purity: selectedPurity },
    }));
    const target = document.getElementById('laskuri');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (target) target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    else window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-5 md:p-10">
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-2 md:mb-3">Ei vaakaa? Arvioi korun paino</h2>
          <p className="text-sm md:text-base text-gray-500 max-w-xl mx-auto">
            Valitse korutyyppi ja koko, niin saat suuntaa-antavan arvion arvosta.
          </p>
        </div>

        {/* 1. Korutyyppi */}
        <fieldset className="mb-7">
          <legend><StepLabel n={1}>Korutyyppi</StepLabel></legend>
          <div className="grid grid-cols-4 gap-2">
            {TYPES.map(key => {
              const active = activeType === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => { setActiveType(key); setSelectedSize(1); track('koruarvio-tyyppi', { type: key }); }}
                  className={`flex flex-col items-center justify-center gap-1.5 min-h-[76px] px-1 py-3 rounded-lg border text-xs md:text-sm font-semibold transition-colors duration-150 ${
                    active
                      ? 'bg-ink-950 border-ink-950 text-white'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-ink-400'
                  }`}
                >
                  <TypeIcon type={key} className={active ? 'text-gold-400' : 'text-gray-500'} />
                  {JEWELRY_DATA[key].label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* 2. Koko — piirros havainnollistaa paksuuden */}
        <fieldset className="mb-7">
          <legend><StepLabel n={2}>Koko</StepLabel></legend>
          <div className="grid grid-cols-3 gap-2 md:gap-3">
            {currentData.sizes.map((s, index) => {
              const active = selectedSize === index;
              return (
                <button
                  key={s.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => { setSelectedSize(index); track('koruarvio-koko', { type: activeType, size: s.label }); }}
                  className={`relative flex flex-col items-center text-center px-2 pt-3 pb-3.5 md:px-4 md:pt-5 md:pb-5 rounded-lg border transition-colors duration-150 ${
                    active ? 'border-ink-950 ring-1 ring-ink-950 bg-white shadow-md' : 'border-gray-200 bg-white hover:border-ink-400'
                  }`}
                >
                  <span className={active ? 'text-gold-500' : 'text-gray-400'}>
                    <SizeArt type={activeType} level={index} />
                  </span>
                  <span className={`mt-2 font-semibold text-sm md:text-base ${active ? 'text-gray-900' : 'text-gray-700'}`}>{s.label}</span>
                  <span className="hidden md:block text-xs text-gray-500 mt-0.5 min-h-[32px]">{s.desc}</span>
                  <span className="num mt-1.5 text-xl md:text-2xl font-semibold text-gray-900 tracking-[-0.02em]">
                    ~{String(s.weight).replace('.', ',')}<span className="text-sm font-medium text-gray-500 ml-0.5">g</span>
                  </span>
                  {spotPrice > 0 && (
                    <span className={`num text-xs md:text-sm font-semibold mt-0.5 ${active ? 'text-gold-700' : 'text-gray-500'}`}>
                      {fmtNoin(estimateValue(s.weight))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* 3. Pitoisuus */}
        <fieldset className="mb-8">
          <legend><StepLabel n={3}>Pitoisuus</StepLabel></legend>
          <div className="grid grid-cols-4 gap-2 max-w-md">
            {COMMON_PURITIES.map(code => (
              <button
                key={code}
                type="button"
                aria-pressed={selectedPurity === code}
                onClick={() => { setSelectedPurity(code); track('koruarvio-karaatti', { purity: code }); }}
                className={`num min-h-11 rounded-md border text-sm font-semibold transition-colors duration-150 ${
                  selectedPurity === code ? 'bg-ink-950 border-ink-950 text-white' : 'bg-white border-gray-300 text-gray-700 hover:border-ink-400'
                }`}
              >
                {code}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Tulosrivi — ohut yhteenveto, varsinainen instrumentti on laskuri */}
        {spotPrice > 0 && (
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between" aria-live="polite">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-700 mb-1">Arvioitu myyntihinta</p>
              <p className="num text-3xl font-semibold text-gray-900 tracking-[-0.02em] leading-none">{fmtNoin(estimateValue(size.weight))}</p>
              <p className="num text-sm text-gray-600 mt-1.5">
                {currentData.label} · {size.label.toLowerCase()} · ~{String(size.weight).replace('.', ',')} g · {selectedPurity}
              </p>
            </div>
            <button
              type="button"
              onClick={useInCalculator}
              className="shrink-0 inline-flex items-center justify-center gap-2 min-h-11 bg-gold-400 text-ink-950 px-5 py-3 rounded-lg font-semibold border border-gold-300/60 hover:bg-gold-300 transition-colors"
            >
              <ArrowUp size={17} aria-hidden="true" />
              Siirrä laskuriin
            </button>
          </div>
        )}
        <p className="text-gray-500 text-xs mt-3 text-center sm:text-left">
          Suuntaa-antava arvio keskipainolla — tarkka arvo selviää punnitsemalla.
        </p>
      </div>
    </div>
  );
}
