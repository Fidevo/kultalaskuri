import React from 'react';

// Hintagraafien (GoldPriceChart, GoldHistoryChart) yhteiset apufunktiot.

export const track = (event: string, data?: Record<string, string | number>) => {
  try { (window as any).umami?.track(event, data); } catch {}
};

export const SVG_FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// Suorat viivasegmentit päätöskurssien välillä (ei Bézier-pehmennystä) —
// finanssikuvaajan tapaan jokainen piste on todellinen havainto.
export function linePath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return pts.length === 1 ? `M${pts[0].x},${pts[0].y}` : '';
  let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)}`;
  }
  return d;
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function fmtDateShort(s: string): string {
  const d = parseDate(s);
  return `${d.getDate()}.${d.getMonth() + 1}.`;
}

export function fmtDateFull(s: string): string {
  return parseDate(s).toLocaleDateString('fi-FI', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const fmt2 = (n: number) => n.toFixed(2).replace('.', ',');

export function daysBetween(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000);
}

export interface Change { pct: number; eur: number; dir: 'up' | 'down' | 'flat' }

export function changeBetween(from: number, to: number): Change {
  const pct = from > 0 ? ((to - from) / from) * 100 : 0;
  // Alle 0,05 %:n liike näytetään "ennallaan" (sama kohinaraja kuin etusivun heroissa)
  const dir = Math.abs(pct) < 0.05 ? 'flat' : pct > 0 ? 'up' : 'down';
  return { pct, eur: to - from, dir };
}

export function ChangeText({ c }: { c: Change }) {
  const color = c.dir === 'up' ? 'text-emerald-400' : c.dir === 'down' ? 'text-red-400' : 'text-gray-300';
  const arrow = c.dir === 'up' ? '▲' : c.dir === 'down' ? '▼' : '';
  const sign = c.eur > 0 ? '+' : c.eur < 0 ? '−' : '±';
  return (
    <>
      <span className={`font-semibold ${color}`}>
        {arrow && `${arrow} `}{Math.abs(c.pct).toFixed(1).replace('.', ',')} %
      </span>
      <span className="text-gray-300"> ({sign}{fmt2(Math.abs(c.eur))} €/g)</span>
    </>
  );
}
