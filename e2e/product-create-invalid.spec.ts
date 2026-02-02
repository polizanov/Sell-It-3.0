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

test('shows validation errors on empty submit', async ({ page, request }) => {
  const token = await getVerifiedToken(request);
  await page.addInitScript((t) => localStorage.setItem('sellit_token', t), token);

  await page.goto('/products/create');
  
  // Leave fields empty and click submit
  await page.getByTestId('create-submit').click();

  // Wait for validation to run and errors to appear
  await page.waitForSelector('[data-testid="create-errors"]', { timeout: 2000 });

  await expect(page).toHaveURL(/\/products\/create$/);
  await expect(page.getByTestId('create-errors')).toContainText('Title is required');
  await expect(page.getByTestId('create-errors')).toContainText('Description is required');
  await expect(page.getByTestId('create-errors')).toContainText('Price must be a positive number');
});

test('shows validation errors on invalid price and stays on page', async ({ page, request }) => {
  const token = await getVerifiedToken(request);
  await page.addInitScript((t) => localStorage.setItem('sellit_token', t), token);

  await page.goto('/products/create');
  await page.getByTestId('create-title').fill('Bad price product');
  await page.getByTestId('create-description').fill('This should fail.');
  await page.getByTestId('create-price').fill('0');
  await page.getByTestId('create-submit').click();

  await expect(page).toHaveURL(/\/products\/create$/);
  await expect(page.getByTestId('create-errors')).toContainText('Price must be a positive number');
});

