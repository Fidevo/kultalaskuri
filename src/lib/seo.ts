// src/lib/seo.ts

interface FaqEntry {
  question: string;
  answer: string;
}

// JSON-LD:n Answer.text-kenttään ei pidä laittaa HTML-merkkausta (Google-ohjeistus) —
// näkyvässä UI:ssa <strong>/<a> säilyvät, schema saa vain puhtaan tekstin.
const stripHtml = (html: string) => html.replace(/<[^>]+>/g, '').trim();

export function generateIndexSchema(
  faqItems: FaqEntry[],
  dateModified: string = new Date().toISOString()
) {
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

      // 6. FAQPage — sama sisältö kuin sivulla näkyvä UKK-osio (Google vaatii,
      // että structured data vastaa näkyvää sisältöä; ei enää oma, ajan myötä
      // eriytynyt kysymyssarja).
      {
        '@type': 'FAQPage',
        '@id': 'https://kultalaskuri.fi/#faq',
        'isPartOf': { '@id': 'https://kultalaskuri.fi/#webpage' },
        'mainEntity': faqItems.map(item => ({
          '@type': 'Question',
          'name': item.question,
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': stripHtml(item.answer)
          }
        }))
      }
    ]
  });
}
