import React, { useState, useEffect } from 'react';
import { Scale, Calculator, Info, AlertTriangle } from 'lucide-react';
import { calculateGoldValue, formatEur, GOLD_PURITIES, type PurityCode, type CalculationResult } from '../../lib/calculations/goldCalculator';

interface Props {
  spotPriceEurPerGram: number;
}

// Umami-tracking helper — ei kaadu jos Umami ei ole ladattu
const track = (event: string, data?: Record<string, string | number>) => {
  try { (window as any).umami?.track(event, data); } catch {}
};

export default function GoldCalculator({ spotPriceEurPerGram }: Props) {
  const [weight, setWeight] = useState<string>('');
  const [purity, setPurity] = useState<PurityCode>('14K');
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [hasTrackedResult, setHasTrackedResult] = useState(false);

  useEffect(() => {
    if (!weight) {
      setResult(null);
      setHasTrackedResult(false);
      return;
    }
    const cleanWeight = weight.replace(',', '.').replace(/[^0-9.]/g, '');
    const numWeight = parseFloat(cleanWeight);

    if (!isNaN(numWeight) && numWeight > 0) {
      const res = calculateGoldValue(numWeight, purity, spotPriceEurPerGram);
      setResult(res);
      if (res && !hasTrackedResult) {
        track('laskuri-tulos', { purity, weight: numWeight });
        setHasTrackedResult(true);
      }
    } else {
      setResult(null);
    }
  }, [weight, purity, spotPriceEurPerGram]);

  // Asiallinen ja luottamusta herättävä WhatsApp-viesti
  const handleWhatsAppShare = () => {
    if (!result) return;
    
    const text = `Kulta-arvio (Kultalaskuri.fi):\nPaino: ${result.weightGrams}g\nPitoisuus: ${purity}\nReilu myyntihinta: vähintään ${formatEur(result.targetValue)}\n\nLuotettavat kullanostajat maksavat vähintään tämän verran.\nTarkista kullan ajantasainen hinta: https://kultalaskuri.fi`;
    
    track('laskuri-whatsapp', { purity, value: result.targetValue });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Kopioi linkki -toiminto
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText('https://kultalaskuri.fi');
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
              type="number"
              inputMode="decimal"
              aria-label="Kullan paino grammoina"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0.00"
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-4 text-gray-900 font-bold text-2xl placeholder-gray-300 outline-none transition-all duration-300 focus:border-gold-400 focus:ring-4 focus:ring-gold-400/10"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold group-focus-within:text-gold-500 transition-colors">
              g
            </span>
          </div>
        </div>

        {/* Pitoisuus */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Pitoisuus
          </label>
          <div className="grid grid-cols-4 lg:grid-cols-2 gap-2">
            {(Object.keys(GOLD_PURITIES) as PurityCode[]).map((code) => {
              const isActive = purity === code;
              return (
                <button
                  key={code}
                  onClick={() => { setPurity(code); track('laskuri-karaatti', { purity: code }); }}
                  className={`
                    flex flex-col items-center lg:items-start justify-center p-2 lg:p-3 rounded-xl border transition-all duration-200
                    ${isActive 
                      ? 'bg-white border-gold-500 ring-2 ring-gold-500/20 shadow-md transform scale-[1.02] z-10' 
                      : 'bg-white border-gray-200 hover:border-gold-300 hover:shadow-sm text-gray-600'
                    }
                  `}
                >
                  <span className={`text-base lg:text-lg font-black ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                    {code}
                  </span>
                  <span className="text-xs font-medium text-gray-500 hidden lg:block">
                    {GOLD_PURITIES[code].label.split(' ')[1]}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex gap-2 text-sm text-gray-500 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
            <Info size={18} className="text-gold-500 shrink-0" />
            <p className="text-xs leading-relaxed">{GOLD_PURITIES[purity].description}</p>
          </div>
        </div>
      </div>

      {/* --- OIKEA PUOLI: TULOS --- */}
      <div className="lg:col-span-7 p-6 md:p-10 bg-white relative min-h-[300px] lg:min-h-auto flex flex-col">
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
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Puhdas kulta</p>
                    <p className="text-base md:text-lg font-bold text-gray-900 font-mono tabular-nums">{result.pureGoldContent.toFixed(2)}g</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Pörssiarvo (100%)</p>
                    <p className="text-base md:text-lg font-bold text-blue-600 font-mono tabular-nums">{formatEur(result.spotValue)}</p>
                </div>
              </div>

              {/* TOIMINTONAPIT: WhatsApp & Kopioi linkki */}
              <div className="flex flex-col sm:flex-row gap-3">
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
            </div>

          </div>
        ) : (
          /* EMPTY STATE */
          <div className="h-full flex flex-col items-center justify-center text-center py-8">
            <div className="w-16 h-16 md:w-24 md:h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4 md:mb-6 border border-gray-100">
               <Calculator className="text-gray-300 w-8 h-8 md:w-12 md:h-12" />
            </div>
            <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Syötä paino ←</h3>
            <p className="text-sm md:text-base text-gray-500 max-w-xs mx-auto mb-5">
              Valitse karaatit ja syötä paino niin näet arvon heti.
            </p>
            {spotPriceEurPerGram > 0 && (
              <div className="bg-gray-50 border border-gray-100 rounded-xl px-5 py-3 text-sm text-gray-500">
                Esim. <span className="font-bold text-gray-700">14K sormus 4 g</span>
                {' '}≈{' '}
                <span className="font-black text-gray-900">
                  {(4 * spotPriceEurPerGram * 0.585 * 0.81).toLocaleString('fi-FI', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}