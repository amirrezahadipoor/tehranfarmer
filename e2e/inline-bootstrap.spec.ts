import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// The packed single-file bootstrap must not execute React before the parser creates #root.
test.use({ serviceWorkers: 'block' });

test('packed offline bootstrap waits for the root container before mounting React', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const builtHtml = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const blockingScript = '<script src="/slow-parser-block.js"></script>';
  const html = builtHtml.replace('</script>', `</script>${blockingScript}`);
  expect(html).not.toBe(builtHtml);

  await page.route('**/*', async (route) => {
    if (route.request().isNavigationRequest()) {
      await route.fulfill({ status: 200, contentType: 'text/html', body: html });
    } else if (route.request().url().endsWith('/slow-parser-block.js')) {
      await new Promise((resolve) => setTimeout(resolve, 750));
      await route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    } else {
      await route.continue();
    }
  });

  await page.goto('/');
  await expect(page.getByRole('button', { name: 'شروع' })).toBeVisible({ timeout: 10_000 });
  expect(errors).toEqual([]);
});
