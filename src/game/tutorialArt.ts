// فلشِ راهنمای آموزش روز اول — تیرِ کِرِتیِ کهربایی با نشانِ شمارهٔ گامِ فعلی، بالای کرت هدف
import { type Ctx } from './art';
import { isReducedMotion } from './settings';
import { tutStep } from './tutorial';
import { fa } from '../strings/fa';

/** رسمِ فلشِ آموزش در مختصاتِ دنیا (ctx از قبل به فضای دوربین translate شده است) */
export function drawTutGuide(c: Ctx, cx: number, cy: number, plotDY: number, t: number): void {
  const calm = isReducedMotion();
  const bob = calm ? 0 : Math.sin(t * 4.2) * 5;
  const swing = calm ? 0 : Math.sin(t * 2.1) * 0.09;
  c.save();
  c.translate(cx + 44, cy - plotDY / 2 - 46 + bob);
  c.rotate(swing);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  // سایهٔ نرم
  c.save(); c.translate(2.5, 3);
  c.beginPath(); c.moveTo(0, -26); c.lineTo(0, 4); c.moveTo(-13, -2); c.lineTo(0, 19); c.lineTo(13, -2);
  c.strokeStyle = 'rgba(40,24,8,.35)'; c.lineWidth = 13; c.stroke(); c.restore();
  // بدنهٔ تیر با خطِ تیره + درونِ کهربایی
  c.beginPath(); c.moveTo(0, -26); c.lineTo(0, 4);
  c.strokeStyle = '#5b3a1e'; c.lineWidth = 13; c.stroke();
  c.beginPath(); c.moveTo(-13, -2); c.lineTo(0, 19); c.lineTo(13, -2); c.stroke();
  c.beginPath(); c.moveTo(0, -26); c.lineTo(0, 4);
  c.strokeStyle = '#ffd93b'; c.lineWidth = 6.5; c.stroke();
  c.beginPath(); c.moveTo(-13, -2); c.lineTo(0, 19); c.lineTo(13, -2); c.closePath();
  c.fillStyle = '#ffd93b'; c.fill();
  // نشانِ شمارهٔ گامِ فعلی روی دُمِ تیر
  c.beginPath(); c.arc(0, -44, 12.5, 0, 6.3);
  c.fillStyle = '#fffdf4'; c.fill(); c.strokeStyle = '#5b3a1e'; c.lineWidth = 3.5; c.stroke();
  c.fillStyle = '#5b3a1e'; c.font = '800 15px Vazirmatn, sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(fa(Math.min(4, tutStep() + 1)), 0, -43.5);
  c.restore();
}
