import { expect, test, type APIRequestContext } from '@playwright/test'

async function getVerifiedToken(request: APIRequestContext) {
  const res = await request.post('http://localhost:5050/api/test-utils/create-verified-user')
  expect(res.ok()).toBeTruthy()
  const data = (await res.json()) as { token: string }
  expect(typeof data.token).toBe('string')
  return data.token
}

async function createProduct(request: APIRequestContext, token: string, title: string) {
  const res = await request.post('http://localhost:5050/api/products', {
    data: {
      title,
      description: 'E2E description',
      price: 12.5,
      categoryName: 'e2e-category'
    },
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  expect(res.ok()).toBeTruthy()
  const data = (await res.json()) as { product: { id: string } }
  return data.product.id
}

test.beforeEach(async ({ request }) => {
  const res = await request.post('http://localhost:5050/api/test-utils/reset')
  expect(res.ok()).toBeTruthy()
})

test('owner can edit product', async ({ page, request }) => {
  const token = await getVerifiedToken(request)
  const productTitle = `Edit product ${Date.now()}`
  const productId = await createProduct(request, token, productTitle)

  await page.addInitScript((t) => localStorage.setItem('sellit_token', t), token)

  await page.goto(`/products/${productId}`)
  await page.getByTestId('owner-edit').click()
  await expect(page).toHaveURL(`/products/${productId}/edit`)

  await expect(page.getByTestId('edit-title')).toHaveValue(productTitle)
  await expect(page.getByTestId('edit-description')).toHaveValue('E2E description')
  await expect(page.getByTestId('edit-price')).toHaveValue('12.5')

  const updatedTitle = `Updated ${Date.now()}`
  await page.getByTestId('edit-title').fill(updatedTitle)
  await page.getByTestId('edit-description').fill('Updated description')
  await page.getByTestId('edit-price').fill('18.75')
  await page.getByTestId('edit-submit').click()

  await expect(page).toHaveURL(`/products/${productId}`)
  await expect(page.getByRole('heading', { name: updatedTitle })).toBeVisible()
  await expect(page.getByText('Updated description')).toBeVisible()
})

test('owner can delete product with confirmation modal', async ({ page, request }) => {
  const token = await getVerifiedToken(request)
  const productTitle = `Delete product ${Date.now()}`
  const productId = await createProduct(request, token, productTitle)

  await page.addInitScript((t) => localStorage.setItem('sellit_token', t), token)

  await page.goto(`/products/${productId}`)
  await page.getByTestId('owner-delete').click()
  await expect(page.getByTestId('delete-modal')).toBeVisible()

  await page.getByTestId('delete-confirm').click()
  await expect(page).toHaveURL(/\/profile\?tab=products/)
  await expect(page.getByRole('status')).toContainText('deleted')
  await expect(page.getByText('No products yet.')).toBeVisible()
})

test('non-owner cannot see edit/delete actions', async ({ page, request }) => {
  const ownerToken = await getVerifiedToken(request)
  const productTitle = `View product ${Date.now()}`
  const productId = await createProduct(request, ownerToken, productTitle)

  const otherToken = await getVerifiedToken(request)
  await page.addInitScript((t) => localStorage.setItem('sellit_token', t), otherToken)

  await page.goto(`/products/${productId}`)
  await expect(page.getByTestId('owner-edit')).toHaveCount(0)
  await expect(page.getByTestId('owner-delete')).toHaveCount(0)
})

