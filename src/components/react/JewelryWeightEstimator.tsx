import React, { useState } from 'react';
import { Circle, User, Gem, Link as LinkIcon } from 'lucide-react';
import { GOLD_PURITIES, type PurityCode } from '../../lib/calculations/goldCalculator';

// FAKTATIEDOT: Keskimääräiset painot (g)
const JEWELRY_DATA = {
  sormus: {
    label: 'Sormus',
    icon: <Circle size={20} />, // Pienennetty ikonia hieman
    sizes: [
      { label: 'Kevyt', desc: 'Siro naisten sormus', weight: 2.0 },
      { label: 'Keskikoko', desc: 'Vihkisormus / Normaali', weight: 4.0 },
      { label: 'Raskas', desc: 'Miesten sormus / Leveä', weight: 8.0 },
    ]
  },
  kaulakoru: {
    label: 'Kaulakoru',
    icon: <User size={20} />,
    sizes: [
      { label: 'Ohut', desc: 'Siro riipusketju', weight: 3.0 },
      { label: 'Keskivahva', desc: 'Selkeästi erottuva', weight: 8.0 },
      { label: 'Paksu', desc: 'Panssariketju tms.', weight: 20.0 },
    ]
  },
  rannekoru: {
    label: 'Rannekoru',
    icon: <LinkIcon size={20} />,
    sizes: [
      { label: 'Ohut', desc: 'Siro ketju', weight: 3.0 },
      { label: 'Keskivahva', desc: 'Bismark / Laatta', weight: 7.0 },
      { label: 'Paksu', desc: 'Tukeva panssari', weight: 15.0 },
    ]
  },
  korvakorut: {
    label: 'Korvakorut',
    icon: <Gem size={20} />,
    sizes: [
      { label: 'Pienet', desc: 'Napit (pari)', weight: 1.0 },
      { label: 'Keskikoko', desc: 'Renkaat (pari)', weight: 3.0 },
      { label: 'Isot', desc: 'Näyttävät / Riippuvat', weight: 6.0 },
    ]
  }
};

type JewelryType = keyof typeof JEWELRY_DATA;

const COMMON_PURITIES: PurityCode[] = ['9K', '14K', '18K', '22K'];

interface Props {
  spotPrice: number;
}

const track = (event: string, data?: Record<string, string | number>) => {
  try { (window as any).umami?.track(event, data); } catch {}
};

export default function JewelryWeightEstimator({ spotPrice }: Props) {
  const [activeType, setActiveType] = useState<JewelryType>('sormus');
  const [selectedSize, setSelectedSize] = useState<number | null>(1); // Oletus: Keskikoko
  const [selectedPurity, setSelectedPurity] = useState<PurityCode>('14K');

  const calculateEstimate = (weight: number) => {
    const purity = GOLD_PURITIES[selectedPurity];
    const estimate = weight * spotPrice * purity.decimal * purity.targetPercent;
    return new Intl.NumberFormat('fi-FI', { style: 'currency', currency: 'EUR' }).format(estimate);
  };

  const currentData = JEWELRY_DATA[activeType];

  const scrollToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
      <div className="p-6 md:p-12">
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-2 md:mb-3">Ei vaakaa? Arvioi korun paino</h2>
          <p className="text-sm md:text-base text-gray-500 max-w-xl mx-auto">
            Valitse korutyyppi ja koko, niin saat suuntaa-antavan arvion arvosta.
          </p>
        </div>

        {/* 1. TABS - Korutyyppi (Mobiilioptimoitu: scrollattava jos ei mahdu) */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-8 md:mb-10">
          {(Object.entries(JEWELRY_DATA) as [JewelryType, typeof JEWELRY_DATA[JewelryType]][]).map(([key, data]) => (
            <button
              key={key}
              onClick={() => { setActiveType(key); setSelectedSize(1); track('koruarvio-tyyppi', { type: key }); }}
              className={`
                flex items-center gap-1.5 md:gap-2 px-3 py-2 md:px-5 md:py-3 rounded-xl font-bold text-xs md:text-sm transition-all duration-200
                ${activeType === key 
                  ? 'bg-gold-400 text-[#0B0F19] shadow-lg shadow-gold-400/20 transform scale-105' 
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }
              `}
            >
              {data.icon}
              {data.label}
            </button>
          ))}
        </div>

        {/* 2. Karaattivalinta */}
        <div className="flex justify-center gap-2 mb-8 md:mb-10">
          {COMMON_PURITIES.map((code) => (
            <button
              key={code}
              onClick={() => { setSelectedPurity(code); track('koruarvio-karaatti', { purity: code }); }}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all duration-200
                ${selectedPurity === code
                  ? 'bg-gold-400 text-[#0B0F19] shadow-lg shadow-gold-400/20 scale-105'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
            >
              {code}
            </button>
          ))}
        </div>

        {/* 3. CARDS - Koko (Mobiili: 3 saraketta, tiivistetty) */}
        <div className="grid grid-cols-3 gap-3 md:gap-6 mb-8 md:mb-10">
          {currentData.sizes.map((size, index) => {
            const isSelected = selectedSize === index;
            return (
              <button
                key={index}
                onClick={() => { setSelectedSize(index); track('koruarvio-koko', { type: activeType, size: size.label }); }}
                className={`
                  relative p-3 md:p-6 rounded-2xl border-2 text-center md:text-left transition-all duration-200 group flex flex-col items-center md:block
                  ${isSelected 
                    ? 'border-gold-400 bg-gold-50/30 ring-1 ring-gold-400/50' 
                    : 'border-gray-100 bg-white hover:border-gold-200 hover:shadow-md'
                  }
                `}
              >
                <div className="flex justify-center md:justify-between items-start w-full mb-1 md:mb-3">
                  <span className={`font-bold text-sm md:text-lg ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                    {size.label}
                  </span>
                  {isSelected && (
                    <span className="hidden md:flex h-3 w-3 rounded-full bg-gold-400 shadow-sm"></span>
                  )}
                </div>
                {/* Kuvaus näkyy vain desktopilla */}
                <p className="text-sm text-gray-500 mb-6 min-h-[40px] hidden md:block">{size.desc}</p>
                
                <div className="text-xl md:text-3xl font-black text-gray-900 tracking-tight mt-1 md:mt-0">
                  ~{size.weight}<span className="text-sm md:text-lg font-bold text-gray-400 ml-0.5">g</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* 3. RESULT - Arvio (Mobiili: pystysuuntainen) */}
        {selectedSize !== null && (
          <div className="bg-[#0B0F19] rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gold-400/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            
            <div className="relative z-10 text-center md:text-left w-full">
              <span className="inline-block px-3 py-1 rounded-full bg-white/10 border border-white/10 text-gold-300 text-[10px] md:text-xs font-bold uppercase tracking-wider mb-2 md:mb-3">
                Arvioitu myyntihinta
              </span>
              <div className="text-4xl md:text-6xl font-black tracking-tight mb-2">
                {calculateEstimate(currentData.sizes[selectedSize].weight)}
              </div>
              <p className="text-gray-400 text-xs md:text-sm">
                Laskelma: {currentData.sizes[selectedSize].weight}g × {selectedPurity} × tavoitehinta
              </p>
            </div>

            <div className="relative z-10 shrink-0 w-full md:w-auto">
              <button 
                onClick={(e) => { track('koruarvio-laske-tarkka'); scrollToTop(e); }}
                className="w-full md:w-auto bg-white text-[#0B0F19] px-6 py-4 rounded-xl font-bold hover:bg-gold-400 transition-colors shadow-lg flex items-center justify-center gap-2"
              >
                <Circle size={18} className="text-gold-600 fill-current" />
                Laske tarkka hinta
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}