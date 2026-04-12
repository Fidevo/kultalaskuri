// social/scripts/generate-image.mjs
// Generoi brändätyn kuvan some-postaukseen (1080x1080 IG-standardi)

import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync } from 'fs';

const W = 1080;
const H = 1080;

// Brändivärit
const COLORS = {
  bg: '#0B0F19',
  gold: '#D4AF37',
  goldLight: '#F5ECCD',
  goldDark: '#8E731C',
  white: '#FFFFFF',
  gray: '#9CA3AF',
  grayDark: '#4B5563',
  green: '#22C55E',
  red: '#EF4444',
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawBackground(ctx) {
  // Tumma tausta
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  // Kultainen glow ylhäällä
  const glow = ctx.createRadialGradient(W / 2, 200, 50, W / 2, 200, 500);
  glow.addColorStop(0, 'rgba(212, 175, 55, 0.15)');
  glow.addColorStop(1, 'rgba(212, 175, 55, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Sininen glow alhaalla
  const glow2 = ctx.createRadialGradient(W * 0.7, H * 0.8, 50, W * 0.7, H * 0.8, 400);
  glow2.addColorStop(0, 'rgba(59, 130, 246, 0.08)');
  glow2.addColorStop(1, 'rgba(59, 130, 246, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);
}

function drawLogo(ctx) {
  ctx.font = 'bold 28px sans-serif';
  ctx.fillStyle = COLORS.gold;
  ctx.fillText('Kulta', 60, 75);
  const w1 = ctx.measureText('Kulta').width;
  ctx.fillStyle = COLORS.white;
  ctx.fillText('laskuri', 60 + w1, 75);
  const w2 = ctx.measureText('laskuri').width;
  ctx.fillStyle = COLORS.gold;
  ctx.fillText('.fi', 60 + w1 + w2, 75);
}

function drawFooter(ctx) {
  // Viiva
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, H - 120);
  ctx.lineTo(W - 60, H - 120);
  ctx.stroke();

  ctx.font = 'bold 22px sans-serif';
  ctx.fillStyle = COLORS.gold;
  ctx.fillText('💰 Tarkista kultakorujesi arvo: kultalaskuri.fi', 60, H - 75);
}

/**
 * Viikkoraportin kuva
 */
export function generateWeeklyImage(currentPrice, weekAgoPrice, outputPath) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  drawBackground(ctx);
  drawLogo(ctx);

  const changePercent = ((currentPrice - weekAgoPrice) / weekAgoPrice) * 100;
  const isUp = changePercent >= 0;

  // Badge
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = COLORS.gray;
  ctx.fillText('VIIKKOKATSAUS', 88, 145);

  // Iso muutosprosentti
  ctx.font = 'bold 140px sans-serif';
  ctx.fillStyle = isUp ? COLORS.green : COLORS.red;
  const sign = isUp ? '+' : '';
  ctx.fillText(`${sign}${changePercent.toFixed(1)}%`, 60, 370);

  // Otsikko
  ctx.font = 'bold 44px sans-serif';
  ctx.fillStyle = COLORS.white;
  ctx.fillText('Kullan viikkomuutos', 60, 460);

  // Hinnat
  const boxY = 520;

  // Viikon alku
  roundRect(ctx, 60, boxY, (W - 140) / 2, 120, 16);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fill();
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = COLORS.gray;
  ctx.fillText('VIIKKO SITTEN', 90, boxY + 40);
  ctx.font = 'bold 36px sans-serif';
  ctx.fillStyle = COLORS.white;
  ctx.fillText(`${weekAgoPrice.toFixed(2)} €`, 90, boxY + 85);

  // Nyt
  const boxX2 = 60 + (W - 140) / 2 + 20;
  roundRect(ctx, boxX2, boxY, (W - 140) / 2, 120, 16);
  ctx.fillStyle = 'rgba(212,175,55,0.1)';
  ctx.fill();
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = COLORS.gray;
  ctx.fillText('NYT (24K)', boxX2 + 30, boxY + 40);
  ctx.font = 'bold 36px sans-serif';
  ctx.fillStyle = COLORS.gold;
  ctx.fillText(`${currentPrice.toFixed(2)} €`, boxX2 + 30, boxY + 85);

  // Trendi-teksti
  ctx.font = '24px sans-serif';
  ctx.fillStyle = COLORS.gray;
  const trendText = isUp
    ? 'Kullan hinta nousi viikon aikana.'
    : 'Kullan hinta laski viikon aikana.';
  ctx.fillText(trendText, 60, boxY + 180);

  drawFooter(ctx);

  const buffer = canvas.toBuffer('image/png');
  writeFileSync(outputPath, buffer);
  return outputPath;
}

/**
 * Opettava postaus (info-kuva)
 */
export function generateEducationalImage(title, bullets, outputPath) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  drawBackground(ctx);
  drawLogo(ctx);

  // Tagi
  roundRect(ctx, 60, 120, 150, 36, 18);
  ctx.fillStyle = 'rgba(212,175,55,0.15)';
  ctx.fill();
  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = COLORS.gold;
  ctx.fillText('💡 TIESITKÖ?', 82, 144);

  // Otsikko (rivitetty)
  ctx.font = 'bold 48px sans-serif';
  ctx.fillStyle = COLORS.white;
  const words = title.split(' ');
  let line = '';
  let lineY = 240;
  for (const word of words) {
    const test = line + (line ? ' ' : '') + word;
    if (ctx.measureText(test).width > W - 140) {
      ctx.fillText(line, 60, lineY);
      line = word;
      lineY += 60;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, 60, lineY);

  // Bullets
  const bulletStartY = lineY + 80;
  ctx.font = '24px sans-serif';
  bullets.forEach((text, i) => {
    const y = bulletStartY + i * 80;

    // Kulta-pallo
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.arc(80, y - 6, 6, 0, Math.PI * 2);
    ctx.fill();

    // Teksti (rivitetty)
    ctx.fillStyle = COLORS.goldLight;
    const bWords = text.split(' ');
    let bLine = '';
    let bY = y;
    for (const w of bWords) {
      const t = bLine + (bLine ? ' ' : '') + w;
      if (ctx.measureText(t).width > W - 180) {
        ctx.fillText(bLine, 105, bY);
        bLine = w;
        bY += 32;
      } else {
        bLine = t;
      }
    }
    ctx.fillText(bLine, 105, bY);
  });

  drawFooter(ctx);

  const buffer = canvas.toBuffer('image/png');
  writeFileSync(outputPath, buffer);
  return outputPath;
}
