// ===== مشاور نرم اقتصادی — پیشنهاد غیراجباری بذر، فروش بازار و محافظت قسط =====
import { CROPS, GOOD } from '../data';
import { S, farmLevel, invCount, season } from '../state';
import { daysToDue, debt, minPay, stashCap } from './debt';
import { ADVISOR_HOT_DEMAND, ADVISOR_STASH_FLOOR, ADVISOR_STASH_MULT } from '../../story/debtData';
import { GT } from '../../strings/gameText';

export interface EconomicTip {
  icon: string;
  text: string;
}

/** بهترین بذر بازشدهٔ فصل جاری بر پایهٔ سود خالص روزانهٔ هر قطعه */
export function bestSeasonCropFa(): string | null {
  const lv = farmLevel();
  const sn = season();
  let bestFa: string | null = null;
  let bestScore = -Infinity;
  for (const c of CROPS) {
    if (c.lv > lv || !c.seasons.includes(sn)) continue;
    const h = c.maxH ?? 1;
    const totalDays = c.days + (c.regrow ?? 0) * Math.max(0, h - 1);
    const avg = (c.yield[0] + c.yield[1]) * 0.5;
    const score = (c.price * avg * h * (S.dem[c.id] ?? 1) - c.seed) / Math.max(1, totalDays);
    if (score > bestScore) {
      bestScore = score;
      bestFa = c.fa;
    }
  }
  return bestFa;
}

/** تولید یک راهنمایی نرم اقتصادی بدون هیچ اجبار برای نمایش در HUD یا دفتر کل */
export function economicHint(): EconomicTip | null {
  const d = debt();
  const sellable = Object.entries(S.inv).filter(([k, v]) => k !== 'feed' && k !== 'fingerling' && v > 0);

  if (d && !S.story.postgame && d.remaining > 0) {
    if (daysToDue() <= 4 && d.paidThisCycle < minPay() && invCount() > 0 && sellable.length > 0) {
      return { icon: 'market', text: GT.advSellDue };
    }
    if (S.coins > Math.max(ADVISOR_STASH_FLOOR, minPay() * ADVISOR_STASH_MULT) && d.stash < stashCap()) {
      return { icon: 'stash', text: GT.advStash };
    }
  }

  const hot = sellable.find(([k]) => (S.dem[k] ?? 1) >= ADVISOR_HOT_DEMAND);
  if (hot && GOOD[hot[0]]) {
    return { icon: 'coin', text: GT.advHotMarket + GOOD[hot[0]].fa };
  }

  const bestCrop = bestSeasonCropFa();
  if (bestCrop) {
    return { icon: 'seedbag', text: GT.advBestSeed + bestCrop };
  }
  return null;
}
