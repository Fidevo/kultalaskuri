// src/lib/seo.ts

export function generateIndexSchema(spotPrice: number, price14k: string) {
  // Tarkistetaan onko hinta validi, mutta EI lopeteta toimintaa jos ei ole.
  // Jos hinta puuttuu, käytetään geneeristä tekstiä.
  const isValidPrice = spotPrice && spotPrice > 0;

  const priceText24k = isValidPrice 
    ? `Juuri nyt puhtaan kullan (24K) markkinahinta on noin ${spotPrice.toFixed(2)} €/g.` 
    : "Tarkista ajantasainen kullan hinta sivustomme laskurista.";

  const priceText14k = isValidPrice
    ? `14K (leima 585) on Suomen yleisin korukulta. Tänään sen laskennallinen markkinahinta on n. ${price14k} €/g.`
    : "14K (leima 585) on Suomen yleisin korukulta. Sen arvo määräytyy päivän pörssikurssin mukaan.";

  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      // 1. Organisaatio
      {
        "@type": "Organization",
        "@id": "https://kultalaskuri.fi/#organization",
        "name": "Kultalaskuri.fi",
        "url": "https://kultalaskuri.fi",
        "logo": "https://kultalaskuri.fi/kultalaskuri-logo.png",
        "description": "Suomen kattavin kultalaskuri reaaliaikaisella pörssikurssilla."
      },

      // 2. WebSite
      {
        "@type": "WebSite",
        "@id": "https://kultalaskuri.fi/#website",
        "name": "Kultalaskuri.fi",
        "url": "https://kultalaskuri.fi",
        "description": "Laske kullan arvo reaaliaikaisesti.",
        "publisher": { "@id": "https://kultalaskuri.fi/#organization" },
        "inLanguage": "fi-FI"
      },

      // 3. WebPage (Tämä sivu) - Linkittää kaiken yhteen
      {
        "@type": "WebPage",
        "@id": "https://kultalaskuri.fi/#webpage",
        "url": "https://kultalaskuri.fi",
        "name": "Kullan hinta tänään – Laske kultasi arvo",
        "isPartOf": { "@id": "https://kultalaskuri.fi/#website" },
        "mainEntity": { "@id": "https://kultalaskuri.fi/#app" }
      },

      // 4. WebApplication (Itse sovellus)
      {
        "@type": "WebApplication",
        "@id": "https://kultalaskuri.fi/#app",
        "name": "Kultalaskuri",
        "url": "https://kultalaskuri.fi",
        "applicationCategory": "FinanceApplication",
        "description": "Ilmainen kultalaskuri, joka laskee kultakorujen, kultaharkkojen ja romukullan arvon reaaliaikaisella pörssikurssilla.",
        "operatingSystem": "Web",
        "browserRequirements": "Requires JavaScript",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "EUR",
          "availability": "https://schema.org/InStock"
        },
        "featureList": [
          "Kullan hinnan laskeminen",
          "Karaattipitoisuuksien vertailu",
          "Reaaliaikainen markkinadata"
        ]
      },

      // 5. FAQPage
      {
        "@type": "FAQPage",
        "@id": "https://kultalaskuri.fi/#faq",
        "isPartOf": { "@id": "https://kultalaskuri.fi/#webpage" },
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Paljonko on kullan hinta grammalta?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": priceText24k
            }
          },
          {
            "@type": "Question",
            "name": "Mitä eroa on 14K ja 18K kullalla?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": `Ero on kultapitoisuudessa. ${priceText14k} 18K (leima 750) sisältää 75 % kultaa ja on arvokkaampaa.`
            }
          },
          {
            "@type": "Question",
            "name": "Paljonko kultasormus tai ketju painaa?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Korujen paino vaihtelee suuresti. Kevyt naisten sormus painaa tyypillisesti 2–4 grammaa, miesten sormus 5–10 grammaa."
            }
          },
          {
            "@type": "Question",
            "name": "Miten kullan maailmanmarkkinahinta määräytyy?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Kullan hinta (spot-hinta) määräytyy kansainvälisissä pörsseissä kysynnän ja tarjonnan mukaan. Kultalaskuri.fi seuraa tätä hintaa reaaliajassa."
            }
          }
        ]
      }
    ]
  });
}