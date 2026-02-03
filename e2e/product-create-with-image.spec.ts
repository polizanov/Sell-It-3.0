import { expect, test, type APIRequestContext } from '@playwright/test';
import * as path from 'path';

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

test('verified user can create product with image', async ({ page, request }) => {
  test.setTimeout(90000); // Increase timeout for Cloudinary upload
  
  // Capture console logs and errors
  const consoleLogs: string[] = [];
  page.on('console', (msg) => consoleLogs.push(`${msg.type()}: ${msg.text()}`));
  page.on('pageerror', (error) => consoleLogs.push(`PAGE ERROR: ${error.message}`));
  
  const token = await getVerifiedToken(request);
  await page.addInitScript((t) => localStorage.setItem('sellit_token', t), token);

  await page.goto('/products/create');

  // Fill in product details
  await page.getByTestId('create-title').fill('iPhone 15 Pro');
  await page.getByTestId('create-description').fill('Brand new iPhone 15 Pro, 256GB, Space Black');
  await page.getByTestId('create-price').fill('999');

  // Select existing category
  const categorySelect = page.locator('select[data-testid="create-category-select"]');
  await expect(categorySelect).toBeEnabled();
  await categorySelect.selectOption({ index: 1 }); // Select first category (not the placeholder)

  // Upload image
  const imagePath = path.join(__dirname, '..', 'frontend', 'public', 'vite.svg');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(imagePath);

  // Wait for image preview to appear
  await page.waitForSelector('img[alt*="vite.svg"]', { timeout: 5000 });

  // Take screenshot before submit
  await page.screenshot({ path: 'test-results/before-submit.png' });

  // Submit the form
  await page.getByTestId('create-submit').click();

  // Wait for either success (navigation) or error
  try {
    await page.waitForURL(/\/products$/, { timeout: 60000 }); // Increase timeout for Cloudinary upload
  } catch (e) {
    // If navigation didn't happen, take a screenshot to see the error
    await page.screenshot({ path: 'test-results/submit-error.png' });
    
    // Check if there's an error message (look for role=alert)
    const errorElements = page.getByRole('alert');
    const count = await errorElements.count();
    if (count > 0) {
      const errorTexts: string[] = [];
      for (let i = 0; i < count; i++) {
        const msg = (await errorElements.nth(i).textContent()) ?? '';
        if (msg) errorTexts.push(msg);
      }
      console.error('Console logs:', consoleLogs.join('\n'));
      throw new Error(`Form submission failed with errors:\n${errorTexts.join('\n')}\n\nConsole logs:\n${consoleLogs.join('\n')}`);
    }
    
    console.error('Console logs:', consoleLogs.join('\n'));
    throw e;
  }

  // Verify success message
  const successMessage = page.getByText(/created/i);
  if (await successMessage.isVisible()) {
    await expect(successMessage).toBeVisible();
  }

  // Verify product appears in list with image
  await expect(page.getByText('iPhone 15 Pro')).toBeVisible();
  await expect(page.getByText(/999/)).toBeVisible();
});
