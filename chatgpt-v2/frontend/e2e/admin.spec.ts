import { test, expect } from '@playwright/test';

test('admin: superadmin can open providers admin page', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.goto('/admin/providers');
  await expect(page.getByRole('heading', { name: /Admin: Providers/i })).toBeVisible();
});
