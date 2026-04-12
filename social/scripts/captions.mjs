// social/scripts/captions.mjs
// Vakiotekstit ja hashtagit some-postauksiin

const BASE_TAGS = '#kulta #kullanhinta #kultalaskuri #kultakorut #romukulta #gold #goldprice #jalometalli';

export function weeklyCaption(currentPrice, weekAgoPrice) {
  const change = ((currentPrice - weekAgoPrice) / weekAgoPrice) * 100;
  const arrow = change >= 0 ? '📈' : '📉';
  const sign = change >= 0 ? '+' : '';
  const direction = change >= 0 ? 'nousi' : 'laski';

  return `${arrow} Viikkokatsaus: kullan hinta ${direction} ${sign}${change.toFixed(1)} %

Viikko sitten: ${weekAgoPrice.toFixed(2)} €/g
Nyt: ${currentPrice.toFixed(2)} €/g (24K)

💰 Tarkista kultakorujesi arvo: kultalaskuri.fi

${BASE_TAGS} #viikkoraportti #kultatrendi #sijoittaminen #sijoituskulta`;
}

export function educationalCaption(text, extraTags = '') {
  return `${text}

💰 Tarkista kultakorujesi arvo: kultalaskuri.fi

${BASE_TAGS} ${extraTags}`.trim();
}
