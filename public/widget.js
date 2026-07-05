/*!
 * Kultalaskuri.fi -hintawidget
 * Käyttö:
 *   <div id="kultalaskuri-widget"></div>
 *   <script async src="https://kultalaskuri.fi/widget.js"></script>
 * Vapaasti upotettavissa, kunhan lähdelinkki säilyy näkyvissä.
 */
(function () {
  'use strict';

  var DATA_URL = 'https://kultalaskuri.fi/hinta.json';
  var SITE_URL = 'https://kultalaskuri.fi/?utm_source=widget';

  function fmt(n) {
    return n.toFixed(2).replace('.', ',');
  }

  function row(label, value, highlight) {
    return (
      '<div style="display:flex;justify-content:space-between;align-items:baseline;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.08);">' +
        '<span style="font-size:12px;color:#9ca3af;">' + label + '</span>' +
        '<span style="font-size:14px;font-weight:700;color:' + (highlight ? '#D4AF37' : '#fff') + ';font-variant-numeric:tabular-nums;">' + value + ' €/g</span>' +
      '</div>'
    );
  }

  function render(el, data) {
    var date = '';
    if (data.updatedAt) {
      try {
        var d = new Date(data.updatedAt);
        date = d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear();
      } catch (e) {}
    }

    el.innerHTML =
      '<div style="box-sizing:border-box;max-width:320px;background:#0B0F19;border:1px solid rgba(212,175,55,0.3);border-radius:14px;padding:16px 18px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
          '<span style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9ca3af;">Kullan hinta</span>' +
          (date ? '<span style="font-size:10px;color:#6b7280;">' + date + '</span>' : '') +
        '</div>' +
        (data.spotEurPerGram
          ? '<div style="font-size:28px;font-weight:800;color:#fff;line-height:1;margin-bottom:2px;font-variant-numeric:tabular-nums;">' + fmt(data.spotEurPerGram) + ' <span style="font-size:14px;color:#D4AF37;">€/g</span></div>' +
            '<div style="font-size:10px;color:#6b7280;margin-bottom:12px;">24K spot-hinta</div>' +
            '<div style="margin-bottom:12px;">' +
              (data.target14k ? row('585 (14K) myyntihinta', fmt(data.target14k), true) : '') +
              (data.target18k ? row('750 (18K) myyntihinta', fmt(data.target18k), false) : '') +
            '</div>'
          : '<div style="font-size:13px;color:#9ca3af;margin-bottom:12px;">Hinta ei juuri nyt saatavilla.</div>') +
        '<a href="' + SITE_URL + '" target="_blank" rel="noopener" style="display:block;text-align:center;font-size:12px;font-weight:700;color:#0B0F19;background:#D4AF37;border-radius:8px;padding:8px 10px;text-decoration:none;">Laske kultasi arvo &rarr;</a>' +
        '<div style="text-align:center;margin-top:8px;"><a href="' + SITE_URL + '" target="_blank" rel="noopener" style="font-size:10px;color:#6b7280;text-decoration:none;">Lähde: Kultalaskuri.fi</a></div>' +
      '</div>';
  }

  function init() {
    var containers = document.querySelectorAll('#kultalaskuri-widget, [data-kultalaskuri-widget]');
    if (!containers.length) return;

    fetch(DATA_URL)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        for (var i = 0; i < containers.length; i++) render(containers[i], data);
      })
      .catch(function () { /* hiljainen epäonnistuminen — ei riko isäntäsivua */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
