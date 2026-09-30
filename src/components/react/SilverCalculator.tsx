import React, { useState, useEffect, useRef } from 'react';
import { Scale, Calculator, Info, AlertTriangle, Camera, ArrowRight, Stamp, Search } from 'lucide-react';
import { formatEur } from '../../lib/calculations/goldCalculator';
import {
  calculateSilverValue, isSilverPurity, SILVER_PURITIES,
  type SilverPurityCode, type SilverCalculationResult,
} from '../../lib/calculations/silverCalculator';
import { assessOffers, parseOfferAmount } from '../../lib/calculations/offerComparison';

// Hopealaskuri — GoldCalculatorin kevennetty sisar /hopean-hinta/-sivulle.
// Sama rakenne ja tyyli (syöttöpaneeli + tumma näyttöpaneeli), mutta oma
// localStorage-avain ja URL-parametri (?paino=250&pitoisuus=830), jotta kulta-
// ja hopealaskurin tilat eivät sekoitu.

interface Props {
  spotPriceEurPerGram: number;
}

// Umami-tracking helper — ei kaadu jos Umami ei ole ladattu
const track = (event: string, data?: Record<string, string | number>) => {
  try { (window as any).umami?.track(event, data); } catch {}
};

interface SavedCalculation {
  weight: string;
  purity: SilverPurityCode;
  value: number;
  date: string;
}

interface ListItem {
  weight: number;
  purity: SilverPurityCode;
  value: number;
}

const STORAGE_KEY = 'kl-hopea-viimeisin';
// 925 oletuksena (omistajan päätös 30.9.2026: yleisin; myös hakuvolyymi suurin).
const DEFAULT_PURITY: SilverPurityCode = '925';
const MAIN_PURITIES: SilverPurityCode[] = ['925', '830', '813', '999'];
const MORE_PURITIES: SilverPurityCode[] = ['900', '800', '500', '350'];
const COMMON = new Set<SilverPurityCode>(['830', '925']);

const fmtGrams = (n: number) =>
  new Intl.NumberFormat('fi-FI', { maximumFractionDigits: 2 }).format(n);

export default function SilverCalculator({ spotPriceEurPerGram }: Props) {
  const [weight, setWeight] = useState<string>('');
  const [purity, setPurity] = useState<SilverPurityCode>(DEFAULT_PURITY);
  const [result, setResult] = useState<SilverCalculationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [items, setItems] = useState<ListItem[]>([]);
  const [showOffers, setShowOffers] = useState(false);
  const [offers, setOffers] = useState<{ id: string; label: string; amount: string }[]>([]);
  const [lastVisit, setLastVisit] = useState<SavedCalculation | null>(null);
  // Päivämäärä lasketaan vasta clientissä — ei hydration mismatchia
  const [today] = useState(() => new Date().toLocaleDateString('fi-FI'));
  const resultPanelRef = useRef<HTMLDivElement>(null);
  const prevResultWasNull = useRef(true);
  const hasTracked = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hasScrolledToResult, setHasScrolledToResult] = useState(false);

  const scrollToResult = () => {
    if (!resultPanelRef.current) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    prevResultWasNull.current = false;
    setHasScrolledToResult(true);
    resultPanelRef.current.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  };

  // Vieritys mobiilissa vain kertatäytöille (esimerkki, jaettu linkki,
  // paluukäynti) — ei käsin kirjoitettaessa (ks. GoldCalculatorin perustelu).
  const scheduleInstantScroll = (weightStr: string, purityCode: SilverPurityCode) => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
    if (window.innerWidth >= 1024 || !prevResultWasNull.current) return;
    const numWeight = parseFloat(weightStr.replace(',', '.').replace(/[^0-9.]/g, ''));
    if (isNaN(numWeight) || numWeight <= 0) return;
    if (!calculateSilverValue(numWeight, purityCode, spotPriceEurPerGram)) return;
    scrollTimeoutRef.current = setTimeout(() => {
      scrollTimeoutRef.current = null;
      scrollToResult();
    }, 80);
  };

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  // TÄRKEÄ JÄRJESTYS: ennen mount-efektiä (ks. GoldCalculatorin kommentti) —
  // muuten ensimmäinen kierros peruisi jaetun linkin vierityksen.
  useEffect(() => {
    const resetScroll = () => {
      prevResultWasNull.current = true;
      setHasScrolledToResult(false);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
    if (!weight) {
      setResult(null);
      hasTracked.current = false;
      resetScroll();
      return;
    }
    const numWeight = parseFloat(weight.replace(',', '.').replace(/[^0-9.]/g, ''));
    if (!isNaN(numWeight) && numWeight > 0) {
      const res = calculateSilverValue(numWeight, purity, spotPriceEurPerGram);
      setResult(res);
      if (res) {
        if (!hasTracked.current) {
          track('hopea-laskuri-tulos', { purity, weight: numWeight });
          hasTracked.current = true;
        }
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            weight, purity, value: res.targetValue,
            date: new Date().toLocaleDateString('fi-FI'),
          } satisfies SavedCalculation));
        } catch {}
      }
    } else {
      setResult(null);
      resetScroll();
    }
  }, [weight, purity, spotPriceEurPerGram]);

  // Mount: jaettu laskelma URL-parametreista (?paino=250&pitoisuus=830),
  // muuten tarjotaan viime käynnin laskelmaa localStoragesta.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const w = params.get('paino');
    const p = params.get('pitoisuus');
    const urlPurity = isSilverPurity(p) ? p : null;
    if (urlPurity) setPurity(urlPurity);
    if (w && /^[0-9]+([.,][0-9]+)?$/.test(w)) {
      const w2 = w.replace('.', ',');
      setWeight(w2);
      scheduleInstantScroll(w2, urlPurity ?? DEFAULT_PURITY);
    } else {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed: SavedCalculation = JSON.parse(saved);
          if (parsed?.weight && isSilverPurity(parsed.purity)) setLastVisit(parsed);
        }
      } catch {}
    }
  }, []);

  // Usean esineen summa — hopeaesineitä myydään usein erinä (aterimet)
  const itemsTotal = items.reduce((sum, item) => sum + item.value, 0);
  const grandTotal = itemsTotal + (result?.targetValue ?? 0);

  // Tarjousvertailu: aina tavoitehintaan, ei pörssiarvoon (sääntö 4 ja 14)
  const comparison = assessOffers(grandTotal, offers.map((o) => o.amount));

  const addOffer = () => {
    setOffers((prev) => {
      if (prev.length >= 4) return prev;
      const n = prev.length + 1;
      track('hopea-tarjousvertailu-lisatty', { count: n });
      return [...prev, { id: `o${Date.now()}-${n}`, label: `Tarjous ${n}`, amount: '' }];
    });
  };
  const updateOffer = (id: string, patch: Partial<{ label: string; amount: string }>) => {
    setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  };
  const removeOffer = (id: string) => setOffers((prev) => prev.filter((o) => o.id !== id));
  const openOffers = () => {
    setShowOffers(true);
    track('hopea-tarjousvertailu-avattu');
    if (offers.length === 0) addOffer();
  };

  useEffect(() => {
    if (comparison.bestBand) track('hopea-tarjousvertailu-tulos', { band: comparison.bestBand });
  }, [comparison.bestBand]);

  const addItemToList = () => {
    if (!result) return;
    setItems(prev => [...prev, { weight: result.weightGrams, purity, value: result.targetValue }]);
    setWeight('');
    track('hopea-laskuri-lisaa-listaan', { purity });
    document.getElementById('silver-weight')?.focus();
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const shareUrl = result
    ? `https://kultalaskuri.fi/hopean-hinta/?paino=${encodeURIComponent(weight.replace(',', '.'))}&pitoisuus=${purity}`
    : 'https://kultalaskuri.fi/hopean-hinta/';

  const handleWhatsAppShare = () => {
    if (!result) return;
    const totalLine = items.length > 0
      ? `\nKaikki esineet yhteensä (${items.length + 1} kpl): vähintään ${formatEur(grandTotal)}\n`
      : '';
    const text = `Hopea-arvio (Kultalaskuri.fi):\nPaino: ${fmtGrams(result.weightGrams)} g\nPitoisuus: ${purity}\nArvioitu tavoitehinta: vähintään ${formatEur(result.targetValue)}\n${totalLine}\nTämä on taso, jota myynnissä kannattaa vähintään tavoitella.\nKatso sama laskelma: ${shareUrl}`;
    track('hopea-laskuri-whatsapp', { purity, value: result.targetValue });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      track('hopea-laskuri-kopioi-linkki');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Hiljainen epäonnistuminen vanhemmilla selaimilla
    }
  };

  const selectPurity = (code: SilverPurityCode) => {
    setPurity(code);
    track('hopea-laskuri-pitoisuus', { purity: code });
  };

  const exampleValue = calculateSilverValue(250, '830', spotPriceEurPerGram)?.targetValue ?? 0;

  return (
    <div className="grid lg:grid-cols-12 gap-0 bg-white overflow-hidden">

      {/* --- VASEN PUOLI: SYÖTTÖ --- */}
      <div className="lg:col-span-5 min-w-0 bg-gray-50 p-6 md:p-9 border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col gap-6 md:gap-7">

        <div className="flex items-center gap-3 pb-5 border-b border-gray-200">
          <div className="w-10 h-10 rounded-lg bg-ink-950 flex items-center justify-center text-gold-400">
            <Scale size={19} strokeWidth={1.75} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Syötä hopean tiedot</h2>
        </div>

        {/* Paino — type="text" + inputMode="decimal" tarkoituksella (desimaalipilkku) */}
        <div>
          <label htmlFor="silver-weight" className="block text-[11px] font-semibold text-gray-600 uppercase tracking-[0.14em] mb-2">
            Paino (grammaa)
          </label>
          <div className="relative group">
            <input
              id="silver-weight"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              aria-label="Hopean paino grammoina"
              aria-describedby="silver-weight-hint"
              value={weight}
              onChange={(e) => {
                const v = e.target.value;
                if (!/^[0-9]*[.,]?[0-9]*$/.test(v)) return;
                setWeight(v);
              }}
              placeholder="Esim. 250"
              className="num w-full bg-white border border-gray-300 rounded-lg pl-4 pr-10 py-4 text-gray-900 font-semibold text-3xl tracking-[-0.02em] placeholder:text-gray-300 placeholder:font-medium shadow-sm outline-none transition-colors duration-200 focus:border-ink-600 focus:ring-4 focus:ring-ink-600/10"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-lg group-focus-within:text-ink-600 transition-colors pointer-events-none select-none">
              g
            </span>
          </div>
          <p id="silver-weight-hint" className="mt-2 text-xs text-gray-500">
            1 kg = 1000 g. Jätä veitset pois: niissä terä on yleensä terästä ja kahva täytetty, joten hopean osuutta ei saa punnitsemalla.
          </p>
        </div>

        {result && !hasScrolledToResult && (
          <button
            type="button"
            onClick={scrollToResult}
            className="lg:hidden w-full flex items-center justify-center gap-2 min-h-11 px-4 py-3 rounded-lg bg-gold-400 hover:bg-gold-300 text-ink-950 font-semibold text-sm border border-gold-300/60 transition-colors no-print"
          >
            Näytä tulos
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        )}

        {/* Pitoisuus */}
        <fieldset>
          <legend className="block text-[11px] font-semibold text-gray-600 uppercase tracking-[0.14em] mb-2">
            Pitoisuus (leima)
          </legend>

          <div className="grid grid-cols-2 gap-2 mb-2">
            {MAIN_PURITIES.map((code) => {
              const isActive = purity === code;
              return (
                <button
                  key={code}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => selectPurity(code)}
                  className={`
                    relative flex flex-col items-start justify-center px-4 py-3 w-full rounded-lg border transition-colors duration-150
                    ${isActive ? 'bg-ink-950 border-ink-950 shadow-md' : 'bg-white border-gray-300 hover:border-ink-400 shadow-sm'}
                  `}
                >
                  {COMMON.has(code) && (
                    <span className={`absolute top-2 right-2.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${isActive ? 'text-gold-400' : 'text-gold-700'}`}>yleinen</span>
                  )}
                  <span className={`text-lg font-semibold num ${isActive ? 'text-white' : 'text-gray-900'}`}>{code}</span>
                  <span className={`text-xs num ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>
                    {SILVER_PURITIES[code].label.slice(SILVER_PURITIES[code].label.indexOf(' ') + 1)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {MORE_PURITIES.map((code) => {
              const isActive = purity === code;
              return (
                <button
                  key={code}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => selectPurity(code)}
                  className={`
                    flex flex-col items-center justify-center py-2 w-full rounded-md border text-xs transition-colors duration-150
                    ${isActive ? 'bg-ink-950 border-ink-950' : 'bg-white border-gray-300 hover:border-ink-400 text-gray-600'}
                  `}
                >
                  <span className={`font-semibold num ${isActive ? 'text-white' : 'text-gray-700'}`}>{code}</span>
                  <span className={`text-[11px] num ${isActive ? 'text-gray-300' : 'text-gray-500'}`}>{SILVER_PURITIES[code].label.slice(SILVER_PURITIES[code].label.indexOf(' ') + 1)}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex gap-2.5 text-sm text-gray-600 bg-white p-3 rounded-md border border-gray-200">
            <Info size={17} strokeWidth={1.75} className="text-gold-600 shrink-0 mt-px" />
            <p className="text-xs leading-relaxed">{SILVER_PURITIES[purity].description}</p>
          </div>
        </fieldset>
      </div>

      {/* --- OIKEA PUOLI: TULOS --- */}
      <div ref={resultPanelRef} className="lg:col-span-7 min-w-0 p-5 md:p-8 bg-white relative min-h-[300px] lg:min-h-auto flex flex-col">

        {items.length > 0 && (
          <div className="mb-5 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="text-[11px] font-semibold text-gray-600 uppercase tracking-[0.14em] mb-3">
              Esineesi ({items.length} kpl)
            </h4>
            <ul className="divide-y divide-dashed divide-gray-200 mb-3">
              {items.map((item, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-sm py-1.5">
                  <span className="text-gray-600 num">{fmtGrams(item.weight)} g · {item.purity}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 num">{formatEur(item.value)}</span>
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      aria-label={`Poista esine ${fmtGrams(item.weight)} g ${item.purity}`}
                      className="w-6 h-6 flex items-center justify-center rounded-md text-gray-500 hover:text-red-700 hover:bg-red-50 transition-colors no-print"
                    >
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between pt-3 border-t border-gray-300">
              <span className="text-sm font-semibold text-gray-700">Yhteensä{result ? ' (sis. nykyinen)' : ''}</span>
              <span className="text-lg font-semibold text-gray-900 num">{formatEur(grandTotal)}</span>
            </div>
          </div>
        )}

        {result ? (
          <div className="h-full flex flex-col justify-center animate-in fade-in duration-300">

            {/* NÄYTTÖPANEELI — sama calc-display kuin kultalaskurissa (tulostetyylit) */}
            <div className="calc-display relative overflow-hidden rounded-xl bg-ink-950 text-white p-5 md:p-7 mb-6 ring-1 ring-ink-800">
              <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/60 to-transparent" aria-hidden="true"></span>

              <div className="mb-3">
                <span className="inline-flex items-center gap-2 text-gold-400 text-[11px] font-semibold uppercase tracking-[0.18em]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Arvioitu myyntihinta
                </span>
              </div>

              <div>
                <span className="text-5xl md:text-7xl font-semibold text-white tracking-[-0.035em] num leading-none">
                  {formatEur(result.targetValue)}
                </span>
                <p className="text-gray-300 mt-4 text-[15px] md:text-base leading-relaxed max-w-md">
                  Tämä on arvioitu taso, jota sinun kannattaa myynnissä vähintään tavoitella. Vertaa saamiasi tarjouksia siihen.
                </p>
                <div className="mt-4 inline-flex items-start gap-2.5 bg-gold-400/10 border border-gold-400/30 text-gold-200 px-3.5 py-2.5 rounded-md max-w-md w-full md:w-auto">
                  <AlertTriangle size={17} strokeWidth={1.75} className="shrink-0 mt-0.5 text-gold-400" />
                  <span className="font-semibold text-xs md:text-sm">Vinkki: Älä myy hopeaasi alle tämän tason.</span>
                </div>
              </div>

              <div className="grid grid-cols-2 mt-6 pt-4 border-t border-white/10 divide-x divide-white/10">
                <div className="pr-4">
                  <p className="text-[11px] text-gray-400 uppercase tracking-[0.12em] font-semibold mb-1">Puhdas hopea</p>
                  <p className="text-base md:text-lg font-semibold text-white num">{fmtGrams(result.pureSilverContent)} g</p>
                </div>
                <div className="pl-4">
                  <p className="text-[11px] text-gray-400 uppercase tracking-[0.12em] font-semibold mb-1">Pörssiarvo (100 %)</p>
                  <p className="text-base md:text-lg font-semibold text-gold-400 num">{formatEur(result.spotValue)}</p>
                </div>
              </div>
            </div>

            <div className="mt-auto">
              <p className="text-xs text-gray-500 leading-relaxed mb-4 pl-3 border-l-2 border-gold-400/60">
                Pörssiarvo on raaka-aineen markkinahinta. Kun hopeaa myydään raaka-aineena, hopean ostajien maksama hinta on tätä matalampi, koska siitä vähennetään sulatus-, jalostus- ja katekulut. <strong className="font-semibold text-gray-700">Arvioitu myyntihinta on taso, jota sinun kannattaa vähintään tavoitella.</strong>
              </p>

              <button
                type="button"
                onClick={addItemToList}
                className="w-full mb-3 flex items-center justify-center gap-2 border border-dashed border-gray-300 hover:border-ink-400 hover:bg-gray-50 text-gray-700 hover:text-gray-900 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors no-print"
              >
                <span className="text-gold-700 font-semibold" aria-hidden="true">＋</span>
                Lisää listaan ja laske seuraava esine
              </button>

              <div className="flex flex-col sm:flex-row gap-3 no-print">
                <button
                  onClick={handleWhatsAppShare}
                  className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 hover:border-[#1DA851] px-4 py-3 rounded-lg font-semibold transition-colors shadow-sm"
                  aria-label="Jaa tulos WhatsAppissa"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#1DA851" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Jaa WhatsAppissa
                </button>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 hover:border-ink-400 px-4 py-3 rounded-lg font-semibold transition-colors shadow-sm"
                  aria-label="Kopioi linkki"
                >
                  {copied ? (
                    <>
                      <span className="text-green-600 font-black">✓</span>
                      <span className="text-green-600 text-sm">Kopioitu!</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                      </svg>
                      <span className="text-sm">Kopioi linkki</span>
                    </>
                  )}
                </button>
              </div>

              {/* VERTAA SAAMIASI TARJOUKSIA — kaksitilainen (sääntö 14) */}
              <div className="mt-6 p-5 bg-white border border-gray-200 rounded-lg no-print">
                {!showOffers ? (
                  <button type="button" onClick={openOffers} className="w-full flex items-center justify-between gap-3 text-left group/offers">
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-px bg-gold-500" aria-hidden="true"></span>
                      <span className="text-[11px] font-semibold text-gold-700 uppercase tracking-[0.16em]">Vertaa saamiasi tarjouksia</span>
                    </span>
                    <span className="text-sm font-bold text-gold-700 flex items-center gap-1 shrink-0">
                      Avaa <ArrowRight size={14} className="group-hover/offers:translate-x-1 transition-transform" />
                    </span>
                  </button>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-4 h-px bg-gold-500" aria-hidden="true"></span>
                      <h4 className="text-[11px] font-semibold text-gold-700 uppercase tracking-[0.16em]">Vertaa saamiasi tarjouksia</h4>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed mb-4">
                      Syötä ostajilta saamasi tarjoukset, niin näet miten ne suhtautuvat tavoitehintaan{' '}
                      <strong className="font-bold text-gray-900">{formatEur(grandTotal)}</strong>{' '}
                      {items.length > 0 ? 'kaikille esineillesi yhteensä' : 'esineellesi'}.
                    </p>

                    <div className="space-y-3 mb-3">
                      {offers.map((offer, i) => {
                        const a = comparison.assessments[i];
                        const isBest = comparison.bestAmount !== null && a?.amount === comparison.bestAmount && offers.length > 1;
                        return (
                          <div key={offer.id} className="flex flex-col gap-2 p-3 rounded-md border border-gray-200 bg-gray-50">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                aria-label={`Tarjouksen ${i + 1} nimi`}
                                value={offer.label}
                                onChange={(e) => updateOffer(offer.id, { label: e.target.value })}
                                className="flex-1 min-w-0 bg-white border border-gray-300 rounded-md px-3 py-2 text-sm font-semibold text-gray-900 outline-none transition-colors focus:border-ink-600 focus:ring-2 focus:ring-ink-600/10"
                              />
                              <div className="relative w-24 shrink-0">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  autoComplete="off"
                                  aria-label={`Tarjouksen ${i + 1} summa euroina`}
                                  value={offer.amount}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    if (/^[0-9]*[.,]?[0-9]*$/.test(v)) updateOffer(offer.id, { amount: v });
                                  }}
                                  placeholder="0"
                                  className="w-full bg-white border border-gray-300 rounded-md pl-3 pr-7 py-2 text-sm font-semibold text-gray-900 text-right num outline-none transition-colors focus:border-ink-600 focus:ring-2 focus:ring-ink-600/10"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm pointer-events-none select-none">€</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeOffer(offer.id)}
                                aria-label={`Poista tarjous ${i + 1}`}
                                className="w-7 h-7 shrink-0 flex items-center justify-center rounded-md text-gray-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                              >
                                ×
                              </button>
                            </div>
                            {a?.band && a.diff !== null && (
                              <p className="text-xs font-bold flex items-center gap-1.5 pl-1">
                                {a.band === 'meets' ? (
                                  <span className="text-green-700">Tavoitteessa{a.diff > 0 ? ` — ${formatEur(a.diff)} yli` : ''}</span>
                                ) : (
                                  <span className="text-amber-700">{formatEur(Math.abs(a.diff))} tavoitteen alle</span>
                                )}
                                {isBest && <span className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">· paras</span>}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {offers.length < 4 && (
                      <button
                        type="button"
                        onClick={addOffer}
                        className="w-full mb-3 flex items-center justify-center gap-2 border border-dashed border-gray-300 hover:border-ink-400 hover:bg-gray-50 text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                      >
                        <span className="text-gold-700 font-semibold" aria-hidden="true">＋</span>
                        Lisää tarjous
                      </button>
                    )}

                    {comparison.bestBand && (
                      <div className={`p-4 rounded-md border-l-[3px] border text-sm leading-relaxed ${
                        comparison.bestBand === 'meets'
                          ? 'bg-green-50 border-green-200 border-l-green-600 text-green-900'
                          : 'bg-amber-50 border-amber-200 border-l-amber-600 text-amber-900'
                      }`}>
                        {comparison.bestBand === 'meets' ? (
                          <p><strong className="font-bold">Paras tarjouksesi on tavoitteessa.</strong> Se yltää tasoon, jota hopeasta kannattaa raaka-aineena vähintään tavoitella.</p>
                        ) : (
                          <p>
                            <strong className="font-bold">Paras tarjouksesi jää tavoitteesta {formatEur(Math.abs(comparison.bestDiff as number))}.</strong>{' '}
                            Tavoitehinta on taso, joka kannattaa vähintään saada — pyydä tarjous vielä toiselta ostajalta ennen päätöstä.
                          </p>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-gray-500 leading-relaxed mt-3">
                      Tavoitehinta lasketaan päivän kurssilla. Se on taso, jota kannattaa vähintään tavoitella — ei tae toteutuvasta hinnasta.
                    </p>

                    <details className="mt-3 group/how">
                      <summary className="text-xs font-bold text-gold-700 cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center gap-1">
                        <ArrowRight size={12} className="group-open/how:rotate-90 transition-transform" />
                        Näin vertaat tarjouksia oikein
                      </summary>
                      <ul className="mt-2 space-y-1.5 text-xs text-gray-600 leading-relaxed pl-4 list-disc">
                        <li>Pyydä jokaiselta ostajalta hinta samasta erästä — samat esineet kaikille.</li>
                        <li>Jos tarjous on annettu grammahintana, kerro se painolla: esim. 0,90 €/g × 250 g = 225 €.</li>
                        <li>Jos hinta on ilmoitettu kilohintana, jaa se tuhannella saadaksesi grammahinnan.</li>
                      </ul>
                    </details>
                  </>
                )}
              </div>

              {/* MITÄ SEURAAVAKSI? */}
              <div className="mt-6 p-5 bg-gray-50 border border-gray-200 rounded-lg no-print">
                <h4 className="text-[11px] font-semibold text-gold-700 uppercase tracking-[0.16em] mb-4 flex items-center gap-2">
                  <span className="w-4 h-px bg-gold-500" aria-hidden="true"></span>
                  Mitä seuraavaksi?
                </h4>
                <ol className="space-y-2.5">
                  <li className="flex items-start gap-3 p-2 -m-2">
                    <span className="flex-shrink-0 w-7 h-7 mt-0.5 rounded-md bg-white border border-gold-400/60 text-gold-700 text-xs font-semibold flex items-center justify-center num">1</span>
                    <div className="flex-1 flex items-center gap-2 pt-0.5">
                      <Camera size={15} className="text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-700 leading-snug">
                        <strong className="font-bold text-gray-900">Ota kuva näytöstä</strong> mukaan liikkeeseen
                      </span>
                    </div>
                  </li>
                  <li>
                    <a href="#leimat" onClick={() => track('hopea-seuraavaksi-leimat')} className="group/step flex items-start gap-3 p-2 -m-2 rounded-lg hover:bg-white transition-colors">
                      <span className="flex-shrink-0 w-7 h-7 mt-0.5 rounded-md bg-white border border-gold-400/60 text-gold-700 text-xs font-semibold flex items-center justify-center num">2</span>
                      <div className="flex-1 flex items-center gap-2 pt-0.5">
                        <Stamp size={15} className="text-gray-400 shrink-0 group-hover/step:text-gold-600 transition-colors" />
                        <span className="text-sm text-gray-700 leading-snug">
                          <strong className="font-bold text-gray-900">Tarkista leima</strong> — 830, 813 vai 925
                        </span>
                        <ArrowRight size={14} className="ml-auto text-gold-600 shrink-0 group-hover/step:translate-x-1 transition-transform" />
                      </div>
                    </a>
                  </li>
                  <li>
                    <a href="#alpakka" onClick={() => track('hopea-seuraavaksi-alpakka')} className="group/step flex items-start gap-3 p-2 -m-2 rounded-lg hover:bg-white transition-colors">
                      <span className="flex-shrink-0 w-7 h-7 mt-0.5 rounded-md bg-white border border-gold-400/60 text-gold-700 text-xs font-semibold flex items-center justify-center num">3</span>
                      <div className="flex-1 flex items-center gap-2 pt-0.5">
                        <Search size={15} className="text-gray-400 shrink-0 group-hover/step:text-gold-600 transition-colors" />
                        <span className="text-sm text-gray-700 leading-snug">
                          <strong className="font-bold text-gray-900">Varmista, ettei esine ole alpakkaa</strong>
                        </span>
                        <ArrowRight size={14} className="ml-auto text-gold-600 shrink-0 group-hover/step:translate-x-1 transition-transform" />
                      </div>
                    </a>
                  </li>
                </ol>
              </div>

              {/* PRINT-ONLY ALATUNNISTE */}
              <div className="print-only mt-6 pt-4 border-t border-gray-300 text-[11px] text-gray-600 leading-relaxed">
                <p className="mb-2">
                  <strong>Laskelma:</strong> {fmtGrams(result.weightGrams)} g
                  × {(result.purityDecimal * 100).toFixed(1).replace('.', ',')} % hopeaa
                  × {spotPriceEurPerGram.toFixed(4).replace('.', ',')} €/g
                  = pörssiarvo {formatEur(result.spotValue)} · arvioitu myyntihinta
                  = <strong>{formatEur(result.targetValue)}</strong>
                  {items.length > 0 && <> · Kaikki esineet yhteensä ({items.length + 1} kpl): <strong>{formatEur(grandTotal)}</strong></>}
                </p>
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  <span><strong>Päivämäärä:</strong> {today}</span>
                  <span><strong>Pörssikurssi:</strong> {spotPriceEurPerGram.toFixed(4).replace('.', ',')} €/g</span>
                  <span><strong>Lähde:</strong> kultalaskuri.fi</span>
                </div>
                {offers.some((o) => parseOfferAmount(o.amount) !== null) && (
                  <p className="mt-2">
                    <strong>Saadut tarjoukset:</strong>{' '}
                    {offers
                      .filter((o) => parseOfferAmount(o.amount) !== null)
                      .map((o) => `${o.label?.trim() || 'Tarjous'} ${formatEur(parseOfferAmount(o.amount) as number)}`)
                      .join(' · ')}
                    {' — '}tavoitehinta {formatEur(grandTotal)}
                  </p>
                )}
                <p className="mt-2 text-gray-500">
                  Suuntaa-antava arvio. Lopullinen hinta riippuu hopean ostajan käytännöistä ja päivän pörssikurssista.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* EMPTY STATE */
          <div className="h-full flex flex-col justify-center py-2 md:py-4 gap-5">

            {lastVisit && spotPriceEurPerGram > 0 && (() => {
              const num = parseFloat(lastVisit.weight.replace(',', '.'));
              const nowRes = !isNaN(num) && num > 0 ? calculateSilverValue(num, lastVisit.purity, spotPriceEurPerGram) : null;
              if (!nowRes) return null;
              const diff = nowRes.targetValue - lastVisit.value;
              const diffPct = lastVisit.value > 0 ? (diff / lastVisit.value) * 100 : 0;
              return (
                <button
                  type="button"
                  onClick={() => {
                    setWeight(lastVisit.weight);
                    setPurity(lastVisit.purity);
                    scheduleInstantScroll(lastVisit.weight, lastVisit.purity);
                    track('hopea-laskuri-palaava', { purity: lastVisit.purity });
                  }}
                  className="text-left p-4 rounded-lg bg-ink-950 text-white ring-1 ring-ink-800 hover:ring-2 hover:ring-gold-400/50 transition-all"
                >
                  <span className="text-[10px] text-gold-400 uppercase tracking-wider font-bold block mb-1">Viime käynnilläsi {lastVisit.date}</span>
                  <span className="text-sm text-gray-300 block">{lastVisit.purity}, {lastVisit.weight} g → {formatEur(lastVisit.value)}</span>
                  <span className="text-sm font-bold block mt-1">
                    Tänään sama hopea: <span className="text-gold-400">{formatEur(nowRes.targetValue)}</span>
                    {Math.abs(diffPct) >= 0.05 && (
                      <span className={diff >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {' '}({diff >= 0 ? '+' : '−'}{Math.abs(diffPct).toFixed(1).replace('.', ',')} %)
                      </span>
                    )}
                  </span>
                </button>
              );
            })()}

            <div className="hidden lg:block">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-4 h-px bg-gold-500" aria-hidden="true"></span>
                <h3 className="text-[11px] font-semibold text-gold-700 uppercase tracking-[0.16em]">Näin laskuri toimii</h3>
              </div>
              <p className="text-base font-bold text-gray-900 mb-4">Kolme yksinkertaista askelta</p>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 mt-0.5 rounded-md bg-ink-950 text-gold-400 text-xs font-semibold flex items-center justify-center num">1</span>
                  <div>
                    <strong className="text-sm font-bold text-gray-900">Punnitse hopeasi</strong>
                    <p className="text-xs text-gray-500 mt-0.5">Keittiövaaka riittää isommille erille</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 mt-0.5 rounded-md bg-ink-950 text-gold-400 text-xs font-semibold flex items-center justify-center num">2</span>
                  <div>
                    <strong className="text-sm font-bold text-gray-900">Valitse pitoisuus</strong>
                    <p className="text-xs text-gray-500 mt-0.5">Etsi leima — suomalaisissa esineissä yleensä 830 tai 813</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 mt-0.5 rounded-md bg-ink-950 text-gold-400 text-xs font-semibold flex items-center justify-center num">3</span>
                  <div>
                    <strong className="text-sm font-bold text-gray-900">Saat reilun tavoitehinnan</strong>
                    <p className="text-xs text-gray-500 mt-0.5">Summa, jota kannattaa vähintään tavoitella</p>
                  </div>
                </li>
              </ol>
            </div>

            {spotPriceEurPerGram > 0 && (
              <button
                type="button"
                onClick={() => {
                  setWeight('250');
                  setPurity('830');
                  scheduleInstantScroll('250', '830');
                  track('hopea-laskuri-esimerkki');
                }}
                className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-600 hover:border-ink-400 transition-colors text-left w-full"
                aria-label="Kokeile esimerkkiä — laske 250 gramman 830-hopean arvo"
              >
                <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold block mb-1">Kokeile esimerkkiä</span>
                <span className="text-sm">
                  <span className="font-bold text-gray-700">830-hopeaa 250 g</span>
                  {' '}≈{' '}
                  <span className="font-semibold text-gray-900 num">
                    {exampleValue.toLocaleString('fi-FI', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
                  </span>
                </span>
              </button>
            )}

            <p className="lg:hidden text-xs text-gray-500 text-center -mt-1">
              <Calculator size={12} className="inline -mt-0.5 mr-1" />
              Syötä paino ja valitse pitoisuus yltä
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
