// ops/umami-collect.browser.js — Umamin datan keruu selaimesta (ajetaan Umami Cloudin välilehdellä)
//
// Umamin Hobby-tilauksessa ei ole API:a, joten data luetaan hallintapaneelin
// omista näkymistä samassa selaimessa, jossa omistaja on kirjautuneena.
// Kirjautumistunnisteeseen EI kosketa: näkymät ladataan saman sivuston
// iframeen, ja luvut luetaan renderöidystä DOMista.
//
// Käyttö (Claude in Chrome, välilehti osoitteessa cloud.umami.is/analytics/eu/websites/<id>):
//   1. Suorita tämä tiedosto javascript_toolilla → määrittelee window.__klUmami.
//   2. __klUmami.run(__klUmami.lastWeek())   tai   __klUmami.run(__klUmami.months(2026, 3, 2026, 10))
//   3. Seuraa: __klUmami.status   (keruu pyörii taustalla, työkalun 45 s raja ei riitä)
//   4. __klUmami.download('umami-....json') → tiedosto Latauksiin → scp Hetznerille
//      /opt/kultalaskuri/data/umami/
//
// Huomiot (selvitetty 7.10.2026):
// - Näkymien `view=`-taulukot näyttävät 20 riviä/sivu → sivutetaan napeilla.
// - Animoidut laskurit jäävät nollaan, kun välilehti on taustalla (rAF pysähtyy).
//   Tapahtumaominaisuuksien todellinen arvo on `div[title]`-attribuutissa.
//   Yläreunan korttien title-arvot EIVÄT täsmää → kokonaisluvut lasketaan taulukoista.
// - Kyselyparametrit (?paino=…) poistetaan riveiltä. Googlen tekstikatkelmalinkit
//   (#:~:text=…) jäsennetään omaksi `snippet`-kentäkseen: ne kertovat, mitä
//   kohtaa sivusta Google korostaa hakutuloksessa.

(() => {
  const U = {
    base: location.origin + location.pathname.replace(/\/(events|sessions|realtime)\/?$/, ''),
    VIEWS: ['path', 'entry', 'exit', 'title', 'referrer', 'channel', 'domain', 'country',
      'device', 'browser', 'os', 'language', 'utmSource', 'utmMedium', 'utmCampaign', 'event', 'hostname'],
    HDR: ['Visitors', 'Visits', 'Views', 'Bounce rate', 'Visit duration', 'Count', 'Events', 'Total'],
    status: null,
    out: null,

    // Helsingin keskiyö (ms) — kesäaika huomioiden
    hki(y, m, d) {
      const guess = Date.UTC(y, m - 1, d, 0, 0, 0);
      const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Helsinki', hour: '2-digit', hourCycle: 'h23' }).format(guess));
      return guess - h * 3600000;
    },
    months(y1, m1, y2, m2) {
      const res = [];
      for (let y = y1, m = m1; y < y2 || (y === y2 && m <= m2); m === 12 ? (y++, m = 1) : m++) {
        const start = this.hki(y, m, 1);
        const end = Math.min(m === 12 ? this.hki(y + 1, 1, 1) : this.hki(y, m + 1, 1), this.hki(...this.todayYMD())) - 1;
        res.push({ label: `${y}-${String(m).padStart(2, '0')}`, start, end });
      }
      return res;
    },
    todayYMD() {
      const [y, m, d] = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Helsinki' }).split('-').map(Number);
      return [y, m, d];
    },
    // Edellinen täysi viikko ma–su (Helsinki)
    lastWeek() {
      const [y, m, d] = this.todayYMD();
      const today = new Date(Date.UTC(y, m - 1, d));
      const dow = (today.getUTCDay() + 6) % 7; // ma = 0
      const mon = new Date(today - (dow + 7) * 86400000);
      const nextMon = new Date(mon.getTime() + 7 * 86400000);
      const ymd = (dt) => [dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()];
      const label = `vk-${mon.toISOString().slice(0, 10)}`;
      return [{ label, start: this.hki(...ymd(mon)), end: this.hki(...ymd(nextMon)) - 1 }];
    },

    url(view, start, end, sub = '') {
      const u = new URL(this.base + sub);
      u.searchParams.set('date', `range:${start}:${end}:custom`);
      if (view) u.searchParams.set('view', view);
      return u.toString();
    },
    frame(url) {
      const f = document.createElement('iframe');
      f.style.cssText = 'width:1300px;height:850px;position:fixed;left:0;top:0;z-index:99999;opacity:0.02;pointer-events:none';
      f.src = url;
      document.body.appendChild(f);
      return new Promise((r) => (f.onload = () => r(f)));
    },
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    val(s) {
      if (/^\d+%$/.test(s)) return Number(s.slice(0, -1));
      if (/^(\d+h\s*)?(\d+m\s*)?(\d+s)?$/.test(s) && /[hms]$/.test(s)) {
        const g = s.match(/(?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?/);
        return (+(g[1] || 0)) * 3600 + (+(g[2] || 0)) * 60 + (+(g[3] || 0));
      }
      const n = Number(s.replace(/\s/g, ''));
      return Number.isFinite(n) ? n : s;
    },
    cleanLabel(l) {
      const frag = l.match(/#:~:text=(.*)$/);
      const base = l.replace(/#:~:.*$/, '').replace(/\?.*$/, '');
      return frag ? { path: base, snippet: decodeURIComponent(frag[1]).replace(/[,&].*$/, '') } : base;
    },
    parseTable(txt) {
      const L = txt.split('\n').map((s) => s.trim()).filter(Boolean);
      const end = L.findIndex((l) => /^[\d\s]+ records?$/.test(l));
      if (end < 0) return null;
      let h = -1;
      for (let i = end; i >= 0; i--) if (L[i] === 'Visitors' || L[i] === 'Count') { h = i; break; }
      if (h < 0) return null;
      const cols = [];
      let j = h;
      while (this.HDR.includes(L[j])) cols.push(L[j++]);
      const body = L.slice(j, end), w = cols.length + 1, rows = [];
      for (let k = 0; k + w <= body.length; k += w) rows.push([this.cleanLabel(body[k]), ...body.slice(k + 1, k + w).map((s) => this.val(s))]);
      return { cols, total: Number(L[end].replace(/\D/g, '')), rows };
    },
    async waitTable(f, prevFirst, maxWait = 15000) {
      const t0 = Date.now();
      let last = '';
      while (Date.now() - t0 < maxWait) {
        await this.sleep(600);
        const txt = f.contentDocument?.body?.innerText || '';
        const p = /\d[\d\s]* records?/.test(txt) ? this.parseTable(txt) : null;
        if (p && txt === last && JSON.stringify(p.rows[0]) !== prevFirst) return p;
        last = txt;
      }
      return this.parseTable(f.contentDocument?.body?.innerText || '');
    },
    async table(view, start, end) {
      const f = await this.frame(this.url(view, start, end));
      try {
        let p = await this.waitTable(f, null);
        if (!p) return null;
        const all = { cols: p.cols, total: p.total, rows: [...p.rows] };
        for (let guard = 0; all.rows.length < p.total && guard < 60; guard++) {
          const d = f.contentDocument;
          const rec = [...d.querySelectorAll('*')].find((e) => /^\d[\d\s]* records?$/.test(e.textContent.trim()) && e.children.length === 0);
          const btn = [...(rec?.closest('div')?.parentElement?.querySelectorAll('button') || [])].filter((b) => !b.disabled).pop();
          if (!btn) break;
          const prev = JSON.stringify(p.rows[0]);
          btn.click();
          const np = await this.waitTable(f, prev);
          if (!np || !np.rows.length || JSON.stringify(np.rows[0]) === prev) break;
          all.rows.push(...np.rows);
          p = np;
        }
        return all;
      } finally {
        f.remove();
      }
    },

    // Tapahtumaominaisuudet: Events → Properties → (tapahtuma, ominaisuus) → arvot
    async eventProps(start, end) {
      const f = await this.frame(this.url(null, start, end, '/events'));
      const d = f.contentDocument;
      const res = {};
      try {
        for (let i = 0; i < 30 && ![...d.querySelectorAll('[role=tab],button')].some((b) => b.textContent.trim() === 'Properties'); i++) await this.sleep(500);
        [...d.querySelectorAll('[role=tab],button')].find((b) => b.textContent.trim() === 'Properties')?.click();
        await this.sleep(1500);
        // Valikot haetaan nimiöiden mukaan: sivulla on myös sivusto- ja aikavälivalitsin
        // (role=combobox). Tapahtuma = painike, ominaisuus = hakukenttä + avausnappi.
        const near = (label) => {
          const l = [...d.querySelectorAll('label, span, div')].find((e) => e.children.length === 0 && e.textContent.trim() === label);
          let p = l;
          for (let k = 0; k < 4 && p; k++) { p = p.parentElement; const c = p.querySelector('[role=combobox]'); if (c) return c; }
          return null;
        };
        const evBtn = () => near('Event');
        const propBtn = () => { const i = near('Property'); return i?.parentElement.querySelector('button') || i; };
        const openOpts = async (btn) => {
          btn.click();
          await this.sleep(700);
          const lb = [...d.querySelectorAll('[role=listbox]')].pop();
          return lb ? [...lb.querySelectorAll('[role=option]')] : [];
        };
        const close = () => d.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        const readRows = async () => {
          let last = '';
          for (let i = 0; i < 20; i++) {
            await this.sleep(500);
            const cnt = [...d.querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent.trim() === 'Count');
            if (!cnt) continue;
            let box = cnt;
            for (let k = 0; k < 6 && box; k++) { box = box.parentElement; if (box.querySelectorAll('div[title]').length > 0) break; }
            const rows = [...box.querySelectorAll('div[title]')].map((v) => {
              let r = v;
              for (let k = 0; k < 8 && r; k++) { r = r.parentElement; if (String(r.className).includes('grid')) break; }
              const lab = [...r.querySelectorAll('span')].map((s) => s.textContent.trim()).find((t) => t && !/^\d+%?$/.test(t));
              return [this.cleanLabel(lab ?? ''), Number(v.getAttribute('title'))];
            });
            const key = JSON.stringify(rows);
            if (rows.length && key === last) return rows;
            last = key;
          }
          return [];
        };
        const evNames = (await openOpts(evBtn())).map((o) => o.textContent.trim());
        close();
        await this.sleep(400);
        for (const ev of evNames) {
          (await openOpts(evBtn())).find((o) => o.textContent.trim() === ev)?.click();
          await this.sleep(1200);
          const props = (await openOpts(propBtn())).map((o) => o.textContent.trim()).filter((p) => !evNames.includes(p));
          close();
          await this.sleep(300);
          if (!props.length) continue;
          res[ev] = {};
          for (const pr of props) {
            (await openOpts(propBtn())).find((o) => o.textContent.trim() === pr)?.click();
            await this.sleep(1500); // ettei edellisen ominaisuuden rivejä lueta vakaina
            res[ev][pr] = await readRows();
          }
          this.status.step = `props ${ev}`;
        }
      } finally {
        f.remove();
      }
      return res;
    },

    async run(periods, { views = this.VIEWS, props = true, conc = 3 } = {}) {
      this.out = { collectedAt: new Date().toISOString(), source: 'Umami Cloud -hallintapaneeli (Hobby, ei API:a)', periods: {} };
      const jobs = [];
      for (const p of periods) {
        this.out.periods[p.label] = { start: new Date(p.start).toISOString(), end: new Date(p.end).toISOString(), views: {}, eventProps: null };
        for (const v of views) jobs.push({ p, v });
      }
      this.status = { done: 0, total: jobs.length + (props ? periods.length : 0), running: true, errors: [] };
      let idx = 0;
      const worker = async () => {
        while (idx < jobs.length) {
          const { p, v } = jobs[idx++];
          try { this.out.periods[p.label].views[v] = await this.table(v, p.start, p.end); }
          catch (e) { this.status.errors.push(`${p.label}/${v}: ${e}`); }
          this.status.done++;
        }
      };
      await Promise.all(Array.from({ length: conc }, worker));
      if (props) {
        // Jaksot rinnakkain omissa kehyksissään (yksi jakso ≈ 3–4 min)
        let pi = 0;
        const pworker = async () => {
          while (pi < periods.length) {
            const p = periods[pi++];
            try { this.out.periods[p.label].eventProps = await this.eventProps(p.start, p.end); }
            catch (e) { this.status.errors.push(`${p.label}/props: ${e}`); }
            this.status.done++;
          }
        };
        await Promise.all(Array.from({ length: conc }, pworker));
      }
      // Kokonaisluvut taulukoista (korttien title-arvot eivät ole luotettavia)
      for (const per of Object.values(this.out.periods)) {
        const sum = (v, col) => { const t = per.views[v]; if (!t) return null; const i = t.cols.indexOf(col); return i < 0 ? null : t.rows.reduce((s, r) => s + (Number(r[i + 1]) || 0), 0); };
        per.totals = { visits: sum('channel', 'Visits'), views: sum('channel', 'Views'), visitorsApprox: sum('country', 'Visitors') };
      }
      this.status.running = false;
      return this.status;
    },

    summary() {
      return Object.entries(this.out?.periods || {}).map(([k, p]) =>
        // ':' eikä '=' — Chrome-työkalu estää avain=arvo-muotoisen tulosteen kyselyparametreina
        `${k}: ${Object.entries(p.views).map(([v, t]) => `${v}:${t ? t.rows.length + '/' + t.total : 'X'}`).join(' ')} | props:${p.eventProps ? Object.keys(p.eventProps).length : '-'} | totals ${JSON.stringify(p.totals)}`).join('\n');
    },

    download(name) {
      const blob = new Blob([JSON.stringify(this.out)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      return `${name}: ${(blob.size / 1024).toFixed(0)} kt`;
    },
  };
  window.__klUmami = U;
  return 'valmis: ' + U.base.split('/').pop();
})();
