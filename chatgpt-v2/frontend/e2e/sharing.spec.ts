import { test, expect } from '@playwright/test';

test('sharing: owner adds collaborator and sets shared visibility', async ({ page }) => {
  // Assumptions:
  // - backend seeded with users:
  //   owner@example.com / password
  //   user2@example.com / password
  // - owner already has a project "Demo"
  //
  // If you do not seed users, adapt to your environment.

  await page.goto('/login');

  await page.getByLabel('Email').fill('owner@example.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.goto('/projects');
  await page.getByRole('link', { name: /Demo/i }).click();

  await page.getByRole('button', { name: 'Share…' }).click();

  // Add collaborator
  await page.getByPlaceholder('Add user by email').fill('user2@example.com');
  await page.locator('select').last().selectOption('read');
  await page.getByRole('button', { name: 'Add' }).click();

  // Now set visibility to shared
  await page.getByLabel(/Shared/i).check();

  // Expect no error message
  await expect(page.locator('text=Cannot set shared visibility')).toHaveCount(0);
});

test('sharing: collaborator leaves project', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('user2@example.com');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Login' }).click();

  await page.goto('/projects');
  // It should be visible if shared or public
  await page.getByRole('link', { name: /Demo/i }).click();

  await page.getByRole('button', { name: 'Share…' }).click();
  await page.getByRole('button', { name: 'Leave' }).click();

  await expect(page).toHaveURL(/\/projects$/);
});
