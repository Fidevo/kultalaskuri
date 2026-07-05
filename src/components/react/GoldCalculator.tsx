import React, { useState, useEffect, useRef } from 'react';
import { Scale, Calculator, Info, AlertTriangle, Printer, BookOpen, Stamp, Camera, ArrowRight } from 'lucide-react';
import { calculateGoldValue, formatEur, GOLD_PURITIES, type PurityCode, type CalculationResult } from '../../lib/calculations/goldCalculator';

interface Props {
  spotPriceEurPerGram: number;
}

// Umami-tracking helper — ei kaadu jos Umami ei ole ladattu
const track = (event: string, data?: Record<string, string | number>) => {
  try { (window as any).umami?.track(event, data); } catch {}
};

interface SavedCalculation {
  weight: string;
  purity: PurityCode;
  value: number;
  date: string;
}

interface ListItem {
  weight: number;
  purity: PurityCode;
  value: number;
}

const STORAGE_KEY = 'kl-viimeisin';

export default function GoldCalculator({ spotPriceEurPerGram }: Props) {
  const [weight, setWeight] = useState<string>('');
  const [purity, setPurity] = useState<PurityCode>('14K');
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [items, setItems] = useState<ListItem[]>([]);
  const [lastVisit, setLastVisit] = useState<SavedCalculation | null>(null);
  // Päivämäärä lasketaan vasta clientissä (useState-initializer) — ei hydration mismatchia
  const [today] = useState(() => new Date().toLocaleDateString('fi-FI'));
  const resultPanelRef = useRef<HTMLDivElement>(null);
  const prevResultWasNull = useRef(true);
  const hasTracked = useRef(false);

  // Mount: lue jaettu laskelma URL-parametreista (?paino=4&karaatti=14K),
  // muuten tarjoa viime käynnin laskelmaa localStoragesta.
  // Kuuntele myös painoarvio-komponentin lähettämää tapahtumaa.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const w = params.get('paino');
    const k = params.get('karaatti') as PurityCode | null;
    if (k && GOLD_PURITIES[k]) setPurity(k);
    if (w && /^[0-9]+([.,][0-9]+)?$/.test(w)) {
      setWeight(w.replace('.', ','));
    } else {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed: SavedCalculation = JSON.parse(saved);
          if (parsed?.weight && GOLD_PURITIES[parsed.purity]) setLastVisit(parsed);
        }
      } catch {}
    }

    const onUseWeight = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      if (typeof detail.weight === 'number' && detail.weight > 0) {
        setWeight(String(detail.weight).replace('.', ','));
      }
      if (detail.purity && GOLD_PURITIES[detail.purity as PurityCode]) {
        setPurity(detail.purity);
      }
    };
    window.addEventListener('kl:use-weight', onUseWeight);
    return () => window.removeEventListener('kl:use-weight', onUseWeight);
  }, []);

  useEffect(() => {
    if (!weight) {
      setResult(null);
      hasTracked.current = false;
      prevResultWasNull.current = true;
      return;
    }
    const cleanWeight = weight.replace(',', '.').replace(/[^0-9.]/g, '');
    const numWeight = parseFloat(cleanWeight);

    if (!isNaN(numWeight) && numWeight > 0) {
      const res = calculateGoldValue(numWeight, purity, spotPriceEurPerGram);
      setResult(res);
      if (res) {
        if (!hasTracked.current) {
          track('laskuri-tulos', { purity, weight: numWeight });
          hasTracked.current = true;
        }
        // Muista laskelma paluukäyntiä varten
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            weight, purity, value: res.targetValue,
            date: new Date().toLocaleDateString('fi-FI'),
          } satisfies SavedCalculation));
        } catch {}
      }
      // Auto-scroll mobiilissa kun tulos ilmestyy ensimmäistä kertaa
      if (res && prevResultWasNull.current && window.innerWidth < 1024) {
        prevResultWasNull.current = false;
        setTimeout(() => {
          resultPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
      }
    } else {
      setResult(null);
      prevResultWasNull.current = true;
    }
  }, [weight, purity, spotPriceEurPerGram]);

  // Usean esineen summalaskuri
  const itemsTotal = items.reduce((sum, item) => sum + item.value, 0);
  const grandTotal = itemsTotal + (result?.targetValue ?? 0);

  const addItemToList = () => {
    if (!result) return;
    setItems(prev => [...prev, { weight: result.weightGrams, purity, value: result.targetValue }]);
    setWeight('');
    track('laskuri-lisaa-listaan', { purity });
    document.getElementById('gold-weight')?.focus();
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Jaettava linkki sisältää laskelman — vastaanottaja näkee saman tuloksen heti
  const shareUrl = result
    ? `https://kultalaskuri.fi/?paino=${encodeURIComponent(weight.replace(',', '.'))}&karaatti=${purity}`
    : 'https://kultalaskuri.fi';

  // Asiallinen ja luottamusta herättävä WhatsApp-viesti
  const handleWhatsAppShare = () => {
    if (!result) return;

    const totalLine = items.length > 0
      ? `\nKaikki esineet yhteensä (${items.length + 1} kpl): vähintään ${formatEur(grandTotal)}\n`
      : '';
    const text = `Kulta-arvio (Kultalaskuri.fi):\nPaino: ${result.weightGrams}g\nPitoisuus: ${purity}\nReilu myyntihinta: vähintään ${formatEur(result.targetValue)}\n${totalLine}\nLuotettavat kullanostajat maksavat vähintään tämän verran.\nKatso sama laskelma: ${shareUrl}`;

    track('laskuri-whatsapp', { purity, value: result.targetValue });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Tulosta arvio -toiminto
  const handlePrint = () => {
    track('laskuri-tulosta', { purity, value: result?.targetValue ?? 0 });
    window.print();
  };

  // Kopioi linkki -toiminto — linkki sisältää nykyisen laskelman
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      track('laskuri-kopioi-linkki');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Palauttaa tekstin 2 sekunnin kuluttua
    } catch {
      // Hiljainen epäonnistuminen vanhemmilla selaimilla
    }
  };

  return (
    <div className="grid lg:grid-cols-12 gap-0 bg-white overflow-hidden">
      
      {/* --- VASEN PUOLI: SYÖTTÖ --- */}
      <div className="lg:col-span-5 bg-gray-50/80 p-6 md:p-10 border-b lg:border-b-0 lg:border-r border-gray-100 flex flex-col gap-6 md:gap-8">
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm text-gold-400">
            <Scale size={20} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Syötä esineen tiedot</h2>
        </div>

        {/* Paino */}
        <div>
          <label htmlFor="gold-weight" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Paino (grammaa)
          </label>
          <div className="relative group">
            <input
              id="gold-weight"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              aria-label="Kullan paino grammoina"
              value={weight}
              onChange={(e) => {
                // Salli vain numerot ja yksi desimaalierotin (pilkku tai piste).
                // type="number" hylkäisi suomalaisen pilkun kokonaan.
                const v = e.target.value;
                if (/^[0-9]*[.,]?[0-9]*$/.test(v)) setWeight(v);
              }}
              placeholder="0,00"
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-4 text-gray-900 font-bold text-2xl placeholder-gray-300 outline-none transition-all duration-300 focus:border-gold-400 focus:ring-4 focus:ring-gold-400/10"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold group-focus-within:text-gold-500 transition-colors pointer-events-none select-none">
              g
            </span>
          </div>
        </div>

        {/* Pitoisuus */}
        <fieldset>
          <legend className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Pitoisuus
          </legend>

          {/* Päänapit: yleisimmät Suomessa */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            {(['14K', '18K', '24K', '9K'] as PurityCode[]).map((code) => {
              const isActive = purity === code;
              const isCommon = code === '14K' || code === '18K';
              return (
                <button
                  key={code}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => { setPurity(code); track('laskuri-karaatti', { purity: code }); }}
                  className={`
                    relative flex flex-col items-start justify-center px-4 py-3 w-full rounded-xl border transition-all duration-200
                    ${isActive
                      ? 'bg-white border-gold-500 ring-2 ring-gold-500/20 shadow-md'
                      : 'bg-white border-gray-200 hover:border-gold-300 hover:shadow-sm'
                    }
                  `}
                >
                  {isCommon && (
                    <span className="absolute top-2 right-2 text-[9px] font-bold text-gold-600 uppercase tracking-wide">yleisin</span>
                  )}
                  <span className={`text-lg font-black ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                    {code}
                  </span>
                  <span className="text-xs text-gray-500">
                    {GOLD_PURITIES[code].label.split(' ')[1]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Pienet chipit: harvinaisemmat */}
          <div className="grid grid-cols-4 gap-1.5">
            {(['22K', '21K', '10K', '8K'] as PurityCode[]).map((code) => {
              const isActive = purity === code;
              return (
                <button
                  key={code}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => { setPurity(code); track('laskuri-karaatti', { purity: code }); }}
                  className={`
                    flex flex-col items-center justify-center py-2 w-full rounded-lg border text-xs transition-all duration-200
                    ${isActive
                      ? 'bg-white border-gold-500 ring-2 ring-gold-500/20 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-gold-300 text-gray-500'
                    }
                  `}
                >
                  <span className={`font-bold ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>{code}</span>
                  <span className="text-[11px] text-gray-500">{GOLD_PURITIES[code].label.split(' ')[1]}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex gap-2 text-sm text-gray-500 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
            <Info size={18} className="text-gold-500 shrink-0" />
            <p className="text-xs leading-relaxed">{GOLD_PURITIES[purity].description}</p>
          </div>
        </fieldset>
      </div>

      {/* --- OIKEA PUOLI: TULOS --- */}
      <div ref={resultPanelRef} className="lg:col-span-7 p-6 md:p-10 bg-white relative min-h-[300px] lg:min-h-auto flex flex-col">

        {/* ESINELISTA — usean esineen summa */}
        {items.length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-100 rounded-2xl">
            <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-3">
              Esineesi ({items.length} kpl)
            </h4>
            <ul className="space-y-1.5 mb-3">
              {items.map((item, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-gray-600">
                    {String(item.weight).replace('.', ',')} g · {item.purity}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 tabular-nums">{formatEur(item.value)}</span>
                    <button
                      type="button"
                      onClick={() => removeItem(i)}
                      aria-label={`Poista esine ${String(item.weight).replace('.', ',')} g ${item.purity}`}
                      className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors no-print"
                    >
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
              <span className="text-sm font-bold text-gray-700">
                Yhteensä{result ? ' (sis. nykyinen)' : ''}
              </span>
              <span className="text-lg font-black text-gray-900 tabular-nums">{formatEur(grandTotal)}</span>
            </div>
          </div>
        )}

        {result ? (
          <div className="h-full flex flex-col justify-center animate-in fade-in duration-300">
            
            {/* TAGI */}
            <div className="mb-2">
               <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-[10px] md:text-xs font-bold border border-green-100 uppercase tracking-wide">
                 <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                 Arvioitu myyntihinta
               </span>
            </div>

            {/* ISO HINTA */}
            <div className="mb-6">
              <span className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight tabular-nums leading-none">
                {formatEur(result.targetValue)}
              </span>
              
              <p className="text-gray-500 mt-4 md:text-lg leading-relaxed max-w-md">
                Tämä on hinta, jota sinun kannattaa tavoitella. Luotettavat kullanostajat maksavat yleensä vähintään tämän verran.
              </p>

              {/* VAROITUSLAATIKKO */}
              <div className="mt-4 inline-flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl max-w-md w-full md:w-auto">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <span className="font-bold text-xs md:text-sm">
                   Vinkki: Älä myy kultaasi alle tämän tason.
                </span>
              </div>
            </div>

            {/* LISÄTIEDOT & NAPIT YHDESSÄ GRIDISSÄ */}
            <div className="mt-auto pt-6 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Puhdas kulta</p>
                    <p className="text-base md:text-lg font-bold text-gray-900 font-mono tabular-nums">{result.pureGoldContent.toFixed(2)}g</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Pörssiarvo (100%)</p>
                    <p className="text-base md:text-lg font-bold text-blue-600 font-mono tabular-nums">{formatEur(result.spotValue)}</p>
                </div>
              </div>

              {/* Selittävä mikroteksti — asettaa odotukset oikein */}
              <p className="text-xs text-gray-500 leading-relaxed mb-3 -mt-1">
                Pörssiarvo on raaka-aineen markkinahinta. Liikkeiden ostohinta on tätä matalampi, koska siitä vähennetään sulatus-, jalostus- ja katekulut. <strong className="font-semibold text-gray-600">Arvioitu myyntihinta on taso, jota sinun kannattaa vähintään tavoitella.</strong>
              </p>

              {/* LISÄÄ LISTAAN — usean esineen summa */}
              <button
                type="button"
                onClick={addItemToList}
                className="w-full mb-3 flex items-center justify-center gap-2 border border-dashed border-gray-300 hover:border-gold-400 hover:bg-gold-50/50 text-gray-600 hover:text-gray-900 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors no-print"
              >
                <span className="text-gold-600 font-black" aria-hidden="true">＋</span>
                Lisää listaan ja laske seuraava esine
              </button>

              {/* TOIMINTONAPIT: WhatsApp & Kopioi linkki */}
              <div className="flex flex-col sm:flex-row gap-3 no-print">
                <button
                  onClick={handleWhatsAppShare}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebd5a] text-white px-4 py-3 rounded-xl font-bold transition-colors shadow-sm"
                  aria-label="Jaa tulos WhatsAppissa"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Jaa WhatsAppissa
                </button>
                
                <button 
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 px-4 py-3 rounded-xl font-bold transition-colors"
                  aria-label="Kopioi linkki"
                >
                  {copied ? (
                    <>
                      <span className="text-green-600 font-black">✓</span>
                      <span className="text-green-600 text-sm">Kopioitu!</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                      </svg>
                      <span className="text-sm">Kopioi linkki</span>
                    </>
                  )}
                </button>
              </div>

              {/* MITÄ SEURAAVAKSI? -OHJEKORTTI */}
              <div className="mt-6 p-5 bg-gradient-to-br from-gold-50/50 to-amber-50/20 border border-gold-100 rounded-2xl no-print">
                <h4 className="text-[11px] font-bold text-gold-700 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
                  <span className="w-1 h-3 bg-gold-400 rounded-full"></span>
                  Mitä seuraavaksi?
                </h4>
                <ol className="space-y-2.5">
                  {/* KOHTA 1 — DESKTOP: Tulosta-nappi, MOBIILI: Kuva-ohje */}
                  <li className="group/step flex items-start gap-3 p-2 -m-2 rounded-lg">
                    <span className="flex-shrink-0 w-7 h-7 mt-0.5 rounded-full bg-white border border-gold-200 text-gold-700 text-xs font-black flex items-center justify-center shadow-sm tabular-nums">1</span>
                    <div className="flex-1 min-w-0 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Desktop: tulostin-ikoni */}
                        <Printer size={15} className="hidden md:inline-block text-gray-400 shrink-0" />
                        {/* Mobiili: kamera-ikoni */}
                        <Camera size={15} className="md:hidden text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-700 leading-snug">
                          <strong className="font-bold text-gray-900 hidden md:inline">Tulosta arvio</strong>
                          <strong className="font-bold text-gray-900 md:hidden">Ota kuva näytöstä</strong>
                          <span> mukaan liikkeeseen</span>
                        </span>
                      </div>
                      {/* Tulosta-nappi vain desktopissa */}
                      <button
                        onClick={handlePrint}
                        className="hidden md:inline-flex text-xs font-bold text-gold-700 bg-white border border-gold-200 hover:border-gold-400 hover:bg-gold-50 px-3 py-1.5 rounded-lg transition-colors shadow-sm whitespace-nowrap items-center gap-1"
                        aria-label="Tulosta hinta-arvio"
                      >
                        Tulosta <ArrowRight size={13} />
                      </button>
                    </div>
                  </li>

                  {/* KOHTA 2 — Linkki /kullan-myynti/ */}
                  <li>
                    <a
                      href="/kullan-myynti/"
                      onClick={() => track('seuraavaksi-myyntivinkit')}
                      className="group/step flex items-start gap-3 p-2 -m-2 rounded-lg hover:bg-white/70 transition-colors"
                    >
                      <span className="flex-shrink-0 w-7 h-7 mt-0.5 rounded-full bg-white border border-gold-200 text-gold-700 text-xs font-black flex items-center justify-center shadow-sm tabular-nums">2</span>
                      <div className="flex-1 flex items-center gap-2 pt-0.5">
                        <BookOpen size={15} className="text-gray-400 shrink-0 group-hover/step:text-gold-500 transition-colors" />
                        <span className="text-sm text-gray-700 leading-snug">
                          <strong className="font-bold text-gray-900">Lue myyntivinkit</strong> reilumman tarjouksen saamiseksi
                        </span>
                        <ArrowRight size={14} className="ml-auto text-gold-500 shrink-0 group-hover/step:translate-x-1 transition-transform" />
                      </div>
                    </a>
                  </li>

                  {/* KOHTA 3 — Linkki /kullan-leimat/ */}
                  <li>
                    <a
                      href="/kullan-leimat/"
                      onClick={() => track('seuraavaksi-leimat')}
                      className="group/step flex items-start gap-3 p-2 -m-2 rounded-lg hover:bg-white/70 transition-colors"
                    >
                      <span className="flex-shrink-0 w-7 h-7 mt-0.5 rounded-full bg-white border border-gold-200 text-gold-700 text-xs font-black flex items-center justify-center shadow-sm tabular-nums">3</span>
                      <div className="flex-1 flex items-center gap-2 pt-0.5">
                        <Stamp size={15} className="text-gray-400 shrink-0 group-hover/step:text-gold-500 transition-colors" />
                        <span className="text-sm text-gray-700 leading-snug">
                          <strong className="font-bold text-gray-900">Tarkista korun aitous</strong> — leimat 585, 750
                        </span>
                        <ArrowRight size={14} className="ml-auto text-gold-500 shrink-0 group-hover/step:translate-x-1 transition-transform" />
                      </div>
                    </a>
                  </li>
                </ol>
              </div>

              {/* PRINT-ONLY ALATUNNISTE — näkyy vain tulostaessa */}
              <div className="print-only mt-6 pt-4 border-t border-gray-300 text-[11px] text-gray-600 leading-relaxed">
                <p className="mb-2">
                  <strong>Laskelma:</strong> {String(result.weightGrams).replace('.', ',')} g
                  × {(result.purityDecimal * 100).toFixed(1).replace('.', ',')} % kultaa
                  × {spotPriceEurPerGram.toFixed(2).replace('.', ',')} €/g
                  = pörssiarvo {formatEur(result.spotValue)} · arvioitu myyntihinta
                  = <strong>{formatEur(result.targetValue)}</strong>
                  {items.length > 0 && <> · Kaikki esineet yhteensä ({items.length + 1} kpl): <strong>{formatEur(grandTotal)}</strong></>}
                </p>
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                  <span><strong>Päivämäärä:</strong> {today}</span>
                  <span><strong>Pörssikurssi:</strong> {spotPriceEurPerGram.toFixed(2).replace('.', ',')} €/g (24K)</span>
                  <span><strong>Lähde:</strong> kultalaskuri.fi</span>
                </div>
                <p className="mt-2 text-gray-500">
                  Suuntaa-antava arvio. Lopullinen ostohinta riippuu kullanostajan käytännöistä, esineen kunnosta ja päivän pörssikurssista.
                </p>
              </div>
            </div>

          </div>
        ) : (
          /* EMPTY STATE — C-hybridi (desktop = ohjeet+vaaka+esim, mobiili = vaaka+esim) */
          <div className="h-full flex flex-col justify-center py-2 md:py-4 gap-5">

            {/* PALUUKÄYNTI: viime kerran laskelma ja sen arvo tänään */}
            {lastVisit && spotPriceEurPerGram > 0 && (() => {
              const num = parseFloat(lastVisit.weight.replace(',', '.'));
              const nowRes = !isNaN(num) && num > 0
                ? calculateGoldValue(num, lastVisit.purity, spotPriceEurPerGram)
                : null;
              if (!nowRes) return null;
              const diff = nowRes.targetValue - lastVisit.value;
              const diffPct = lastVisit.value > 0 ? (diff / lastVisit.value) * 100 : 0;
              return (
                <button
                  type="button"
                  onClick={() => {
                    setWeight(lastVisit.weight);
                    setPurity(lastVisit.purity);
                    track('laskuri-palaava', { purity: lastVisit.purity });
                  }}
                  className="text-left p-4 rounded-2xl bg-[#0B0F19] text-white hover:ring-2 hover:ring-gold-400/50 transition-all"
                >
                  <span className="text-[10px] text-gold-300 uppercase tracking-wider font-bold block mb-1">
                    Viime käynnilläsi {lastVisit.date}
                  </span>
                  <span className="text-sm text-gray-300 block">
                    {lastVisit.purity}, {lastVisit.weight} g → {formatEur(lastVisit.value)}
                  </span>
                  <span className="text-sm font-bold block mt-1">
                    Tänään sama kulta:{' '}
                    <span className="text-gold-400">{formatEur(nowRes.targetValue)}</span>
                    {Math.abs(diffPct) >= 0.05 && (
                      <span className={diff >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {' '}({diff >= 0 ? '+' : '−'}{Math.abs(diffPct).toFixed(1).replace('.', ',')} %)
                      </span>
                    )}
                  </span>
                </button>
              );
            })()}

            {/* DESKTOP-VERSIO: Näin laskuri toimii (3 askelta) */}
            <div className="hidden lg:block">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1 h-3 bg-gold-400 rounded-full"></span>
                <h3 className="text-[11px] font-bold text-gold-700 uppercase tracking-[0.15em]">Näin laskuri toimii</h3>
              </div>
              <p className="text-base font-bold text-gray-900 mb-4">Kolme yksinkertaista askelta</p>

              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 mt-0.5 rounded-full bg-gold-50 border border-gold-200 text-gold-700 text-xs font-black flex items-center justify-center shadow-sm tabular-nums">1</span>
                  <div>
                    <strong className="text-sm font-bold text-gray-900">Punnitse esineesi</strong>
                    <p className="text-xs text-gray-500 mt-0.5">Vaaka, mielellään 0,1 g tarkkuudella</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 mt-0.5 rounded-full bg-gold-50 border border-gold-200 text-gold-700 text-xs font-black flex items-center justify-center shadow-sm tabular-nums">2</span>
                  <div>
                    <strong className="text-sm font-bold text-gray-900">Valitse pitoisuus</strong>
                    <p className="text-xs text-gray-500 mt-0.5">Etsi leima — yleisin Suomessa on 585 (14K)</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 mt-0.5 rounded-full bg-gold-50 border border-gold-200 text-gold-700 text-xs font-black flex items-center justify-center shadow-sm tabular-nums">3</span>
                  <div>
                    <strong className="text-sm font-bold text-gray-900">Saat reilun tavoitehinnan</strong>
                    <p className="text-xs text-gray-500 mt-0.5">Numero, jota kannattaa tavoitella liikkeessä</p>
                  </div>
                </li>
              </ol>
            </div>

            {/* SEKÄ MOBILE ETTÄ DESKTOP: Ei vaakaa? -kortti */}
            <a
              href="#vaaka"
              onClick={() => track('empty-vaaka-click')}
              className="group/vaaka flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-gold-50/50 to-amber-50/20 border border-gold-100 hover:border-gold-300 hover:shadow-sm transition-all"
            >
              <div className="w-11 h-11 rounded-full bg-white border border-gold-100 flex items-center justify-center shrink-0 shadow-sm">
                <Scale size={20} className="text-gold-500" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-bold text-gray-900 leading-tight">Ei vaakaa kotona?</div>
                <div className="text-xs text-gray-500 mt-0.5">Arvioi paino tästä</div>
              </div>
              <ArrowRight size={18} className="text-gold-500 shrink-0 group-hover/vaaka:translate-x-1 transition-transform" />
            </a>

            {/* Esimerkki-laatikko (klikattava → täyttää arvot ja näyttää tuloksen heti) */}
            {spotPriceEurPerGram > 0 && (
              <button
                type="button"
                onClick={() => {
                  setWeight('4');
                  setPurity('14K');
                  track('laskuri-esimerkki');
                }}
                className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-500 hover:bg-gray-100 hover:border-gray-200 transition-all text-left w-full"
                aria-label="Kokeile esimerkkiä — laske 14 karaatin 4 gramman sormuksen arvo"
              >
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block mb-1">Kokeile esimerkkiä</span>
                <span className="text-sm">
                  <span className="font-bold text-gray-700">14K sormus 4 g</span>
                  {' '}≈{' '}
                  <span className="font-black text-gray-900">
                    {(calculateGoldValue(4, '14K', spotPriceEurPerGram)?.targetValue ?? 0).toLocaleString('fi-FI', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
                  </span>
                </span>
              </button>
            )}

            {/* Mobile-only: vihje vasemmalle ylhäälle (mobiilissa "vasen" on oikeasti yläpuolella) */}
            <p className="lg:hidden text-xs text-gray-400 text-center -mt-1">
              <Calculator size={12} className="inline -mt-0.5 mr-1" />
              Syötä paino ja valitse pitoisuus yltä
            </p>
          </div>
        )}
      </div>
    </div>
  );
}