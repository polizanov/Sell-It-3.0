import { expect, test, type APIRequestContext } from '@playwright/test';

async function getVerifiedToken(request: APIRequestContext) {
  const res = await request.post('http://localhost:5050/api/test-utils/create-verified-user');
  expect(res.ok()).toBeTruthy();
  const data = (await res.json()) as { token: string };
  expect(typeof data.token).toBe('string');
  return data.token;
}

test.beforeEach(async ({ request }) => {
  const res = await request.post('http://localhost:5050/api/test-utils/reset');
  expect(res.ok()).toBeTruthy();
});

test('verified user can create product (no images) and see it in list', async ({ page, request }) => {
  const token = await getVerifiedToken(request);

  await page.addInitScript((t) => localStorage.setItem('sellit_token', t), token);

  const title = `E2E product ${Date.now()}`;
  await page.goto('/products/create');

  await expect(page.getByTestId('create-category-select')).toBeVisible();
  await expect(page.getByTestId('create-category-select')).not.toHaveValue('');

  await page.getByTestId('create-title').fill(title);
  await page.getByTestId('create-description').fill('A great product created by Playwright.');
  await page.getByTestId('create-price').fill('12.34');
  await page.getByTestId('create-submit').click();

  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByTestId('products-list')).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('link', { name: `Product ${title}` })).toBeVisible({ timeout: 10000 });
});

