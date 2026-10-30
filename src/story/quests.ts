// ===== کوئست‌های اصلی هر فصل — نیازمند ارتقا، گسترش زمین، تأسیسات و ماشین‌آلات واقعی (دوزبانه FA/EN) =====
import { S, farmLevel } from '../game/state';
import { CFG } from '../game/settings';
import { triggerCutscene } from './engine';
import type { QuestDef } from './types';

const harv = () => S.stats['cropHarv:farm'] ?? 0;
const pens = () => Object.values(S.pens).filter((v) => (v ?? 0) > 0).length;
const lv = () => farmLevel();
const toolUps = () => (S.lv.hoe ?? 0) + (S.lv.can ?? 0) + (S.lv.bag ?? 0) + (S.lv.stam ?? 0);
const machCount = () => Object.values(S.machines).filter((m) => (m ?? 0) >= 1).length;
const machMk2Count = () => Object.values(S.machines).filter((m) => (m ?? 0) >= 2).length;
const en = () => CFG.locale === 'en';

export type ChapterAction = 'farm' | 'carp' | 'estate' | 'work';
export interface ChecklistItem {
  label: string;
  ok: boolean;
  action: ChapterAction;
}

/** چک‌لیست شفاف و مرحله‌به‌مرحلهٔ پیش‌نیازهای توسعهٔ مزرعه برای هر فصل */
export function chapterChecklist(chapter: number): ChecklistItem[] {
  const e = en();
  switch (chapter) {
    case 1:
      return [
        { label: e ? 'Harvest 20 crops on your farm' : 'برداشت ۲۰ محصول از زمین مزرعه', ok: harv() >= 20, action: 'farm' },
      ];
    case 2:
      return [
        { label: e ? 'Build 2 animal pens at Town Carpentry' : 'ساخت ۲ حصار دام در نجاری شهر', ok: pens() >= 2, action: 'carp' },
        { label: e ? 'Claim Northern Meadow deed (54 plots) at Estate Office' : 'ثبت سند مزرعهٔ «دشت شمالی» (۵۴ کرت) در دفتر املاک', ok: S.lv.land >= 1, action: 'estate' },
        { label: e ? 'Upgrade at least 1 tool at Carpentry' : 'ارتقای حداقل ۱ ابزار در نجاری شهر', ok: toolUps() >= 1, action: 'carp' },
        { label: e ? 'Reach Farm Level 6' : 'رسیدن به سطح ۶ مزرعه', ok: lv() >= 6, action: 'farm' },
      ];
    case 3:
      return [
        { label: e ? 'Build 2 fish ponds at Carpentry' : 'ساخت ۲ استخر پرورش ماهی در نجاری', ok: S.ponds.length >= 2, action: 'carp' },
        { label: e ? 'Build 2 beehives at Carpentry' : 'ساخت ۲ کندوی عسل در نجاری', ok: S.hives >= 2, action: 'carp' },
        { label: e ? 'Buy at least 2 machines at Town Workshop' : 'خرید حداقل ۲ ماشین در کارگاه شهر', ok: machCount() >= 2, action: 'work' },
        { label: e ? 'Reach Farm Level 10' : 'رسیدن به سطح ۱۰ مزرعه', ok: lv() >= 10, action: 'farm' },
      ];
    case 4:
      return [
        { label: e ? 'Build a Glass Greenhouse at Carpentry' : 'ساخت گلخانه در نجاری شهر', ok: S.gh >= 1, action: 'carp' },
        { label: e ? 'Upgrade Deep Drip Well at Carpentry' : 'ارتقای چاه قطره‌ای در نجاری شهر', ok: S.wellLv >= 1, action: 'carp' },
        { label: e ? 'Restore Northern Qanat deed (Estate Tier 2)' : 'احیای قنات دشت شمالی (پلهٔ ۲ دفتر املاک)', ok: S.lv.land >= 2, action: 'estate' },
        { label: e ? 'Own at least 4 machines at Town Workshop' : 'داشتن حداقل ۴ ماشین خودکار از کارگاه', ok: machCount() >= 4, action: 'work' },
        { label: e ? 'Reach Farm Level 14' : 'رسیدن به سطح ۱۴ مزرعه', ok: lv() >= 14, action: 'farm' },
      ];
    case 5:
      return [
        { label: e ? 'Hire 3 farmhand workers at Estate Office' : 'استخدام ۳ کارگر از دفتر املاک', ok: S.workers >= 3, action: 'estate' },
        { label: e ? 'Build a Feed Silo at Carpentry' : 'ساخت سیلو در نجاری شهر', ok: S.silo >= 1, action: 'carp' },
        { label: e ? 'Claim Sunlit Valley deed (60 plots — Tier 3)' : 'ثبت سند «باغ‌درهٔ آفتاب» (۶۰ کرت — پلهٔ ۳ املاکی)', ok: S.lv.land >= 3, action: 'estate' },
        { label: e ? 'Own 5 machines (at least one Model 2)' : 'داشتن ۵ ماشین از کارگاه (حداقل یکی مدل ۲)', ok: machCount() >= 5 && machMk2Count() >= 1, action: 'work' },
        { label: e ? 'Reach Farm Level 18' : 'رسیدن به سطح ۱۸ مزرعه', ok: lv() >= 18, action: 'farm' },
      ];
    case 6:
      return [
        { label: e ? 'Complete All 3 Estates Charter (154 plots — Tier 4)' : 'ثبت منشور یکپارچهٔ هر ۳ مزرعه (۱۵۴ کرت — پلهٔ ۴)', ok: S.lv.land >= 4, action: 'estate' },
        { label: e ? 'Upgrade Golden Soil at Carpentry' : 'ارتقای «خاک طلایی» در نجاری شهر', ok: S.lv.soil >= 1, action: 'carp' },
        { label: e ? 'Own at least 6 automated machines' : 'داشتن حداقل ۶ ماشین فعال مزرعه', ok: machCount() >= 6, action: 'work' },
        { label: e ? 'Upgrade tools at least 3 times' : 'حداقل ۳ پله ارتقای ابزارها', ok: toolUps() >= 3, action: 'carp' },
        { label: e ? 'Reach Farm Level 18' : 'رسیدن به سطح ۱۸ مزرعه', ok: lv() >= 18, action: 'farm' },
      ];
    default:
      return [];
  }
}

const gated = (chapter: number, target: number) => () => {
  const list = chapterChecklist(chapter);
  const allOk = list.every((it) => it.ok);
  return allOk ? Math.max(lv(), target) : Math.min(lv(), target - 1);
};

const mkQ = (id: string, chapter: number, tFa: string, tEn: string, dFa: string, dEn: string, target: number, metric: () => number, reward: number): QuestDef => ({
  id,
  chapter,
  get title() { return en() ? tEn : tFa; },
  get desc() { return en() ? dEn : dFa; },
  target,
  metric,
  reward,
});

export const QUESTS: QuestDef[] = [
  mkQ('q1', 1, 'اولین برداشت مزرعه', 'First Farm Harvest', '۲۰ بار محصول از مزرعهٔ ۴۰ کرتی برداشت کن تا مزرعه دوباره جان بگیرد.', 'Plant and harvest 20 crops across your 40-plot Main Farm.', 20, harv, 1200),
  mkQ('q2', 2, 'دشت شمالی، ابزار و دامداری', 'Northern Meadow, Tools & Ranch', '۲ حصار دام در نجاری بساز، ۱ ابزار ارتقا بده، سند «دشت شمالی» (۵۴ کرت) را باز کن و به سطح ۶ برس.', 'Build 2 pens, upgrade 1 tool, claim the 54-plot Northern Meadow deed, and reach Level 6.', 6, gated(2, 6), 6000),
  mkQ('q3', 3, 'شیلات، زنبورستان و کارگاه', 'Ponds, Bees & Workshop', '۲ استخر ماهی، ۲ کندوی عسل و ۲ ماشین از کارگاه شهر تهیه کن و به سطح ۱۰ برس.', 'Build 2 fish ponds, 2 beehives, buy 2 Workshop machines, and reach Level 10.', 10, gated(3, 10), 26000),
  mkQ('q4', 4, 'گلخانه، قنات دشت شمالی و مکانیزاسیون', 'Greenhouse, Qanat & Automation', 'گلخانه و چاه قطره‌ای بساز، قنات دشت شمالی (پلهٔ ۲) را احیا کن، ۴ ماشین بگیر و به سطح ۱۴ برس.', 'Build Greenhouse & Drip Well, restore Northern Qanat (Tier 2), own 4 machines, and reach Level 14.', 14, gated(4, 14), 90000),
  mkQ('q5', 5, 'باغ‌درهٔ آفتاب، کارگران و ماشین مدل ۲', 'Sunlit Valley, Crew & Model 2', '۳ کارگر در املاکی، سیلو در نجاری، سند باغ‌درهٔ آفتاب (۶۰ کرت) و ۵ ماشین (یکی مدل ۲) بگیر و به سطح ۱۸ برس.', 'Hire 3 farmhands, build a Silo, claim 60-plot Sunlit Valley, own 5 machines (1 Model 2), and hit Level 18.', 18, gated(5, 18), 300000),
  mkQ('q6', 6, 'منشور ۱۵۴ کرت، خاک طلایی و ۶ ماشین', 'All 154 Plots Mastery', 'منشور هر ۳ مزرعه (۱۵۴ کرت) را کامل کن، خاک طلایی و ۶ ماشین بخر و در سطح ۱۸ مزرعه را آزاد کن.', 'Complete All 3 Estates Charter (154 plots), buy Golden Soil & 6 machines, and reach Level 18.', 18, gated(6, 18), 1500000),
];

export const questOf = (chapter: number): QuestDef | null => QUESTS.find((q) => q.chapter === chapter) ?? null;

export function questProgress(chapter: number): number {
  const q = questOf(chapter);
  if (!q) return 1;
  if (q.chapter >= 2) {
    const items = chapterChecklist(q.chapter);
    const doneCount = items.filter((it) => it.ok).length;
    return items.length ? doneCount / items.length : 1;
  }
  return Math.max(0, Math.min(1, q.metric() / q.target));
}

export function isQuestDone(chapter: number): boolean {
  const q = questOf(chapter);
  if (!q) return true;
  if (S.story?.questDone?.[chapter]) return true;
  return q.metric() >= q.target;
}

export function checkStoryQuests(silentScene = false): number {
  if (!S.story) return 0;
  let gained = 0;
  for (const q of QUESTS) {
    if (q.chapter > S.story.chapter) continue;
    if (S.story.questDone[q.chapter]) continue;
    if (q.metric() >= q.target) {
      S.story.questDone[q.chapter] = true;
      S.coins += q.reward;
      gained += q.reward;
      if (silentScene) S.story.seen[`quest-done-${q.id}`] = true;
      else triggerCutscene(`quest-done-${q.id}`);
    }
  }
  return gained;
}
