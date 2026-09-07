/*!
 * Kultalaskuri.fi – kullan kurssi -widget
 * Käyttö:
 *   <div id="kultalaskuri-widget"></div>
 *   <script async src="https://kultalaskuri.fi/widget.js"></script>
 *
 * Valinnaiset data-attribuutit div-elementissä:
 *   data-theme="light" | "dark"     (oletus: light)
 *   data-layout="card" | "inline"   (oletus: card)
 *   data-cta="true"                 näyttää "Laske kultasi arvo" -linkin (oletus: pois)
 *   data-src="..."                  vaihtoehtoinen datalähde (vain testaukseen)
 *
 * Skripti julkaisee window.KultalaskuriWidget.refresh(), jolla upotukset voi
 * renderöidä uudelleen attribuuttien muututtua (käytössä /widget/-konfiguraattorissa).
 *
 * Näyttää vain markkinadataa: 24K-spot-kurssin, päivän muutoksen, 14K/18K-pörssiarvon
 * ja unssihinnan. Vapaasti upotettavissa, kunhan lähdelinkki säilyy näkyvissä.
 */
(function () {
  'use strict';

  var DATA_URL = 'https://kultalaskuri.fi/hinta.json';
  var SITE_URL = 'https://kultalaskuri.fi/kullan-hinta/?utm_source=widget';
  var CALC_URL = 'https://kultalaskuri.fi/?utm_source=widget#laskuri';

  var THEMES = {
    light: { bg: '#ffffff', border: '#e5e7eb', text: '#111827', muted: '#6b7280', accent: '#B8860B', line: '#f3f4f6', up: '#047857', down: '#b91c1c' },
    dark:  { bg: '#0B0F19', border: 'rgba(212,175,55,0.3)', text: '#ffffff', muted: '#9ca3af', accent: '#D4AF37', line: 'rgba(255,255,255,0.08)', up: '#34d399', down: '#f87171' }
  };

  function fmt(n) { return n.toFixed(2).replace('.', ','); }
  function fmtBig(n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

  function fmtDate(iso) {
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      var s = d.toLocaleDateString('fi-FI', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'Europe/Helsinki' });
      var t = d.toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Helsinki' });
      return t === '00.00' ? s : s + ' klo ' + t;
    } catch (e) { return ''; }
  }

  function changeHtml(pct, c) {
    if (typeof pct !== 'number' || Math.abs(pct) < 0.05) return '';
    var up = pct >= 0;
    return '<span style="font-size:12px;font-weight:700;color:' + (up ? c.up : c.down) + ';font-variant-numeric:tabular-nums;">' +
      (up ? '▲' : '▼') + ' ' + fmt(Math.abs(pct)).replace(/,00$/, ',0') + ' %</span>';
  }

  function row(label, value, c, unit) {
    return '<div style="display:flex;justify-content:space-between;align-items:baseline;padding:5px 0;border-top:1px solid ' + c.line + ';">' +
      '<span style="font-size:12px;color:' + c.muted + ';">' + label + '</span>' +
      '<span style="font-size:13px;font-weight:700;color:' + c.text + ';font-variant-numeric:tabular-nums;">' + value + ' ' + unit + '</span>' +
      '</div>';
  }

  function source(c, cta) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:10px;">' +
      '<a href="' + SITE_URL + '" target="_blank" rel="noopener" style="color:' + c.muted + ';text-decoration:none;">Lähde: Kultalaskuri.fi</a>' +
      (cta ? '<a href="' + CALC_URL + '" target="_blank" rel="noopener" style="color:' + c.accent + ';font-weight:700;text-decoration:none;">Laske kultasi arvo →</a>' : '') +
      '</div>';
  }

  function renderCard(el, d, c, cta) {
    var k14 = d.perKarat && d.perKarat['14K'];
    var k18 = d.perKarat && d.perKarat['18K'];
    var date = d.updatedAt ? fmtDate(d.updatedAt) : '';
    el.innerHTML =
      '<div style="box-sizing:border-box;max-width:320px;background:' + c.bg + ';border:1px solid ' + c.border + ';border-radius:14px;padding:14px 16px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;line-height:1.3;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">' +
          '<span style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:' + c.muted + ';">Kullan kurssi</span>' +
          changeHtml(d.changePct, c) +
        '</div>' +
        (d.spotEurPerGram
          ? '<div style="font-size:28px;font-weight:800;color:' + c.text + ';line-height:1;font-variant-numeric:tabular-nums;">' + fmt(d.spotEurPerGram) + ' <span style="font-size:14px;color:' + c.accent + ';">€/g</span></div>' +
            '<div style="font-size:10px;color:' + c.muted + ';margin:4px 0 10px;">24K puhdas kulta' + (date ? ' · ' + date : '') + '</div>' +
            (k14 ? row('14K (585) pörssiarvo', fmt(k14), c, '€/g') : '') +
            (k18 ? row('18K (750) pörssiarvo', fmt(k18), c, '€/g') : '') +
            (d.spotEurPerOunce ? row('Troy-unssi', fmtBig(d.spotEurPerOunce), c, '€') : '')
          : '<div style="font-size:13px;color:' + c.muted + ';">Kurssi ei juuri nyt saatavilla.</div>') +
        source(c, cta) +
      '</div>';
  }

  function renderInline(el, d, c, cta) {
    var date = d.updatedAt ? fmtDate(d.updatedAt) : '';
    el.innerHTML =
      '<div style="box-sizing:border-box;display:inline-flex;flex-wrap:wrap;align-items:baseline;gap:6px 10px;background:' + c.bg + ';border:1px solid ' + c.border + ';border-radius:10px;padding:8px 12px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;font-size:13px;color:' + c.text + ';line-height:1.3;">' +
        '<span style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:' + c.muted + ';">Kullan kurssi</span>' +
        (d.spotEurPerGram
          ? '<span style="font-weight:800;font-variant-numeric:tabular-nums;">' + fmt(d.spotEurPerGram) + ' €/g</span>' + changeHtml(d.changePct, c) +
            (date ? '<span style="font-size:10px;color:' + c.muted + ';">' + date + '</span>' : '')
          : '<span style="color:' + c.muted + ';">ei saatavilla</span>') +
        '<a href="' + SITE_URL + '" target="_blank" rel="noopener" style="font-size:10px;color:' + c.muted + ';text-decoration:none;">Lähde: Kultalaskuri.fi</a>' +
        (cta ? '<a href="' + CALC_URL + '" target="_blank" rel="noopener" style="font-size:11px;color:' + c.accent + ';font-weight:700;text-decoration:none;">Laske kultasi arvo →</a>' : '') +
      '</div>';
  }

  function render(el, data) {
    var theme = THEMES[el.getAttribute('data-theme')] || THEMES.light;
    var cta = el.getAttribute('data-cta') === 'true';
    if (el.getAttribute('data-layout') === 'inline') renderInline(el, data, theme, cta);
    else renderCard(el, data, theme, cta);
  }

  var cache = {};

  function load(url) {
    if (!cache[url]) {
      cache[url] = fetch(url).then(function (r) { return r.json(); });
    }
    return cache[url];
  }

  function init() {
    var containers = document.querySelectorAll('#kultalaskuri-widget, [data-kultalaskuri-widget]');
    if (!containers.length) return;

    Array.prototype.forEach.call(containers, function (el) {
      load(el.getAttribute('data-src') || DATA_URL)
        .then(function (data) { render(el, data); })
        .catch(function () { /* hiljainen epäonnistuminen — ei riko isäntäsivua */ });
    });
  }

  window.KultalaskuriWidget = { refresh: init };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
