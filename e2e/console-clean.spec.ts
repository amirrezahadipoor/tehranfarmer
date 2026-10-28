import { test, expect } from '@playwright/test';

test('باز کردن منو، انبار، کوئست‌ها، دفتر کل و دیالوگ جهانگیر بدون هیچ خطا یا اخطار کنسول در مرورگر (P7-07)', async ({ page }) => {
  const issues: string[] = [];
  page.on('pageerror', (e) => issues.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') issues.push(`${m.type()}: ${m.text()}`);
  });

  await page.addInitScript(() => {
    localStorage.setItem('mazrae-rangi-save-v1', JSON.stringify({
      v: 5, coins: 2000, day: 4, hour: 10, stamina: 100,
      story: { chapter: 1, seen: { p1: true, p7: true }, prologueSeen: true, postgame: false, pending: null, questDone: {} },
      debt: { noteIdx: 0, remaining: 12000, paidTotal: 3000, extorted: 0, dueDay: 29, paidThisCycle: 0, nextRaidDay: 48, immuneUntilDay: 7, standing: 70, stash: 0, scarecrow: 0, beatings: 0, pendingVisit: null, chapter: 1, flags: {}, history: [], lastVisit: null, chapterStartDay: 1 },
    }));
  });

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.getByRole('button', { name: /ادامه/ }).click();

  for (const label of ['انبار', 'کوئست‌ها', 'اتوماسیون', 'منو']) {
    await page.getByRole('button', { name: label }).click();
    await page.getByRole('button', { name: 'بستن پنجره' }).click();
  }

  // باز کردن دفتر کل و اجرای دیالوگ واکنشی جهانگیر
  await page.getByRole('button', { name: /بدهی/ }).click();
  await page.getByRole('button', { name: /گفت‌وگو با جهانگیر/ }).click();
  await expect(page.getByRole('button', { name: /ادامه|پایان/ })).toBeVisible();

  expect(issues).toEqual([]);
});
