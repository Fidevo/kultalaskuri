// src/lib/seo.ts

export function generateIndexSchema(
  spotPrice: number,
  price14k: string,
  dateModified: string = new Date().toISOString()
) {
  const isValidPrice = spotPrice && spotPrice > 0;

  const priceText24k = isValidPrice
    ? `Juuri nyt puhtaan kullan (24K) markkinahinta on noin ${spotPrice.toFixed(2).replace('.', ',')} €/g.`
    : 'Tarkista ajantasainen kullan hinta sivustomme laskurista.';

  const priceText14k = isValidPrice
    ? `14K (leima 585) on Suomen yleisin korukulta. Tänään sen laskennallinen markkinahinta on n. ${price14k} €/g.`
    : '14K (leima 585) on Suomen yleisin korukulta. Sen arvo määräytyy päivän pörssikurssin mukaan.';

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [

      // 1. Organisaatio
      {
        '@type': 'Organization',
        '@id': 'https://kultalaskuri.fi/#organization',
        'name': 'Kultalaskuri.fi',
        'url': 'https://kultalaskuri.fi/',
        'logo': {
          '@type': 'ImageObject',
          'url': 'https://kultalaskuri.fi/kultalaskuri-logo.png'
        },
        'description': 'Suomen kattavin ilmainen kultalaskuri — laske kultakorujen, harkkojen ja romukullan arvo päivittäin päivittyvällä pörssikurssilla.',
        'areaServed': { '@type': 'Country', 'name': 'Finland' },
        'knowsLanguage': 'fi',
        'foundingDate': '2024',
        // Lisää omat some-profiilit tähän kun olet luonut ne:
        // 'sameAs': [
        //   'https://www.facebook.com/kultalaskuri',
        //   'https://g.co/kgs/...',  // Google Business Profile
        // ]
      },

      // 2. WebSite
      {
        '@type': 'WebSite',
        '@id': 'https://kultalaskuri.fi/#website',
        'name': 'Kultalaskuri.fi',
        'url': 'https://kultalaskuri.fi/',
        'description': 'Laske kullan arvo päivän kurssilla. Ilmainen ja puolueeton suomalainen palvelu.',
        'publisher': { '@id': 'https://kultalaskuri.fi/#organization' },
        'inLanguage': 'fi-FI'
      },

      // 3. WebPage
      {
        '@type': 'WebPage',
        '@id': 'https://kultalaskuri.fi/#webpage',
        'url': 'https://kultalaskuri.fi/',
        'name': 'Kullan hinta tänään – Laske kultasi arvo',
        'description': 'Tarkista kullan hinta tänään päivän kurssilla. Laske kultakorujen, romukullan tai kultaharkkojen arvo ilmaisella kultalaskurilla.',
        'isPartOf': { '@id': 'https://kultalaskuri.fi/#website' },
        'publisher': { '@id': 'https://kultalaskuri.fi/#organization' },
        'inLanguage': 'fi-FI',
        'dateModified': dateModified,
        'mainEntity': { '@id': 'https://kultalaskuri.fi/#app' }
      },

      // 4. WebApplication
      {
        '@type': 'WebApplication',
        '@id': 'https://kultalaskuri.fi/#app',
        'name': 'Kultalaskuri',
        'url': 'https://kultalaskuri.fi/',
        'applicationCategory': 'FinanceApplication',
        'description': 'Ilmainen kultalaskuri, joka laskee kultakorujen, kultaharkkojen ja romukullan arvon päivittäin päivittyvällä pörssikurssilla.',
        'operatingSystem': 'Web',
        'browserRequirements': 'Requires JavaScript',
        'inLanguage': 'fi-FI',
        'offers': {
          '@type': 'Offer',
          'price': '0',
          'priceCurrency': 'EUR',
          'availability': 'https://schema.org/InStock'
        },
        'featureList': [
          'Kullan hinnan laskeminen grammoittain',
          'Karaattipitoisuuksien vertailu (9K, 14K, 18K, 24K)',
          'Päivittäin päivittyvä pörssikurssi',
          'Korujen painoarvio'
        ]
      },

      // 5. HowTo — vastaa AI-promptiin "Miten lasken kultakorujen arvon?"
      {
        '@type': 'HowTo',
        '@id': 'https://kultalaskuri.fi/#howto',
        'name': 'Miten lasken kultakorujen arvon?',
        'description': 'Laske kultakorujen tai romukullan laskennallinen arvo kolmessa helpossa vaiheessa päivän pörssikurssilla.',
        'totalTime': 'PT1M',
        'estimatedCost': {
          '@type': 'MonetaryAmount',
          'currency': 'EUR',
          'value': '0'
        },
        'tool': {
          '@type': 'HowToTool',
          'name': 'Kultalaskuri.fi – ilmainen kultalaskuri'
        },
        'step': [
          {
            '@type': 'HowToStep',
            'position': 1,
            'name': 'Punnitse kulta',
            'text': 'Punnitse myytävä kultaesine tarkalla vaa\'alla. Kirjoita paino grammoina laskurin painokenttään. Keittiövaaka sopii hyvin, jos tarkkuus on 0,1 g.'
          },
          {
            '@type': 'HowToStep',
            'position': 2,
            'name': 'Valitse kultapitoisuus',
            'text': 'Etsi korusta pitoisuusleima: 375 (9K), 585 (14K), 750 (18K) tai 999 (24K). Valitse vastaava pitoisuus laskurista. Leima löytyy yleensä lukon läheltä tai korun sisäpinnalta.'
          },
          {
            '@type': 'HowToStep',
            'position': 3,
            'name': 'Lue laskennallinen arvo',
            'text': 'Kultalaskuri näyttää välittömästi kultaesineen laskennallisen arvion euroissa päivän pörssikurssilla. Tämä on suuntaa-antava tavoitehintataso – vertaa sitä saamiisi tarjouksiin.'
          }
        ]
      },

      // 6. FAQPage — kaikki 8 kysymystä (AI-näkyvyyden kannalta kriittinen)
      {
        '@type': 'FAQPage',
        '@id': 'https://kultalaskuri.fi/#faq',
        'isPartOf': { '@id': 'https://kultalaskuri.fi/#webpage' },
        'mainEntity': [
          {
            '@type': 'Question',
            'name': 'Paljonko on kullan hinta grammalta?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': priceText24k + ' Hinta muuttuu pörssikurssin mukaan päivittäin.'
            }
          },
          {
            '@type': 'Question',
            'name': 'Mikä on kullan hinta tänään?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': isValidPrice
                ? `${priceText24k} 14 karaatin (585) kullan hinta on tänään noin ${price14k} €/g. Seuraa päivittyvää hintaa kultalaskuri.fi:ssä.`
                : priceText24k + ' Seuraa päivittyvää hintaa kultalaskuri.fi:ssä.'
            }
          },
          {
            '@type': 'Question',
            'name': 'Mitä eroa on 14K ja 18K kullalla?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Ero on kultapitoisuudessa. ' + priceText14k + ' 18K (leima 750) sisältää 75 % kultaa ja on arvokkaampaa, mutta myös pehmeämpää ja herkempää naarmuille.'
            }
          },
          {
            '@type': 'Question',
            'name': 'Mitä tarkoittaa leima 585?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Leima 585 tarkoittaa 14 karaatin kultaa. Luku kertoo, että seoksesta 585 tuhannesosaa eli 58,5 % on puhdasta kultaa. Loput ovat seosmetalleja, kuten kuparia ja hopeaa, jotka tekevät korusta kestävämmän. 585 on Suomen yleisin kultaleima.'
            }
          },
          {
            '@type': 'Question',
            'name': 'Paljonko kultasormus tai ketju painaa?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Korujen paino vaihtelee suuresti. Kevyt naisten sormus painaa tyypillisesti 2–4 grammaa, miesten sormus 5–10 grammaa. Ohut kaulaketju voi olla alle 3 grammaa, paksut panssariketjut kymmeniä grammoja.'
            }
          },
          {
            '@type': 'Question',
            'name': 'Onko kultakoruissa aina leima?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Suomessa myytävissä, yli 1 gramman painoisissa kultatuotteissa tulee lain mukaan olla pitoisuusleima. Hyvin vanhoissa koruissa, ulkomailta tuoduissa esineissä tai itse tehdyissä töissä leima voi kuitenkin puuttua tai se on voinut kulua näkymättömiin.'
            }
          },
          {
            '@type': 'Question',
            'name': 'Mistä tietää onko esine kultaa vai kullattu?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Varmin keino on etsiä pitoisuusleima (esim. 585 tai 750). Toinen kotikonsti on magneetti: aito kulta ei ole magneettista. Jos koru tarttuu magneettiin, se on todennäköisesti kullattua rautaa. Kuluneet kohdat, joista paistaa läpi eri väri, paljastavat esineen olevan vain kullattu pintakerrokseltaan.'
            }
          },
          {
            '@type': 'Question',
            'name': 'Kannattaako kulta myydä juuri nyt?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Kullan hinta on historiallisesti erittäin korkealla tasolla. Jos sinulla on tarpeettomia koruja, rikkinäistä kultaa tai parittomia korvakoruja, nykyinen markkinatilanne on myyjän kannalta erinomainen. Tarkista ensin kullan arvo ilmaisella laskurilla, jotta tiedät reilun hinnan.'
            }
          },
          {
            '@type': 'Question',
            'name': 'Miten kullan maailmanmarkkinahinta määräytyy?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Kullan hinta (spot-hinta) määräytyy kansainvälisissä pörsseissä kysynnän ja tarjonnan mukaan. Siihen vaikuttavat maailmantalouden tilanne, dollarin kurssi, inflaatio ja geopoliittinen epävarmuus. Kultalaskuri.fi seuraa tätä hintaa päivittäin.'
            }
          }
        ]
      }
    ]
  });
}
