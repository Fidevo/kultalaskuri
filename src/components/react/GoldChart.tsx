import React, { useEffect, useRef, useState } from 'react';

export default function GoldChart() {
  const container = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Varmistetaan, että skripti lisätään vain kerran ja vain selaimessa
    if (!container.current || typeof window === 'undefined') return;
    
    // Tyhjennetään kontti mahdollisista aiemmista renderöinneistä (React Strict Mode -turva)
    container.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = `
      {
        "symbols": [
          [
            "Kulta (EUR)",
            "OANDA:XAUEUR|1M"
          ]
        ],
        "chartOnly": false,
        "width": "100%",
        "height": "100%", 
        "locale": "fi",
        "colorTheme": "light",
        "autosize": true,
        "showVolume": false,
        "showMA": false,
        "hideDateRanges": false,
        "hideMarketStatus": false,
        "hideSymbolLogo": false,
        "scalePosition": "right",
        "scaleMode": "Normal",
        "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
        "fontSize": "10",
        "noTimeScale": false,
        "valuesTracking": "1",
        "changeMode": "price-and-percent",
        "chartType": "area",
        "maLineColor": "#2962FF",
        "maLineWidth": 1,
        "maLength": 9,
        "lineWidth": 2,
        "lineType": 0,
        "dateRanges": [
          "1d|1",
          "1m|30",
          "3m|60",
          "12m|1D",
          "60m|1W",
          "all|1M"
        ],
        "lineColor": "rgba(212, 175, 55, 1)",
        "topColor": "rgba(212, 175, 55, 0.3)",
        "bottomColor": "rgba(212, 175, 55, 0.05)"
      }
    `;

    script.onload = () => {
      const widgetDiv = container.current?.querySelector('.tradingview-widget-container__widget');
      if (!widgetDiv) { setIsLoaded(true); return; }

      const observer = new MutationObserver(() => {
        if (widgetDiv.childElementCount > 0) {
          setIsLoaded(true);
          observer.disconnect();
        }
      });
      observer.observe(widgetDiv, { childList: true });
    };
    container.current.appendChild(script);

  }, []);

  return (
    // TÄSSÄ AINOA MUUTOS: min-h-[400px] muutettu min-h-[450px] ja h-[450px] lisätty mobiiliskaalautuvuuden turvaamiseksi
    <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-4 md:p-6 relative min-h-[450px] h-[450px] md:h-[500px]">
      {!isLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500 mb-4"></div>
          <p className="text-gray-500 text-sm font-medium animate-pulse">Ladataan pörssikurssia...</p>
        </div>
      )}
      <div 
        className="tradingview-widget-container w-full h-full" 
        ref={container}
      >
        <div className="tradingview-widget-container__widget w-full h-full"></div>
      </div>
    </div>
  );
}