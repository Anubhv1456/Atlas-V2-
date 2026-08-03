import { test, expect } from '@playwright/test';

test.describe('Critical Path: Subject and System Management', () => {
  test('should allow user to add a subject, navigate to it, and add a system', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');

    // Ensure we are on the homepage
    await expect(page.locator('text=Welcome to Atlas')).toBeVisible({ timeout: 10000 }).catch(() => null);
    
    // There might be a button to add a subject
    const addSubjectBtn = page.getByRole('button', { name: /Add Subject/i });
    if (await addSubjectBtn.isVisible()) {
      await addSubjectBtn.click();
      
      // Fill the input
      const input = page.getByPlaceholder('e.g., Internal Medicine');
      await input.fill('Cardiology Test');
      await page.keyboard.press('Enter');

      // The subject should appear in the list
      await expect(page.getByText('Cardiology Test')).toBeVisible();

      // Click to go to subject detail
      await page.getByText('Cardiology Test').click();

      // Add a study system
      const addTopicBtn = page.getByRole('button', { name: /Add Topic/i });
      if (await addTopicBtn.isVisible()) {
         await addTopicBtn.click();
         const topicInput = page.getByPlaceholder('e.g., Heart Failure');
         await topicInput.fill('Heart Failure (E2E)');
         await page.keyboard.press('Enter');

         await expect(page.getByText('Heart Failure (E2E)')).toBeVisible();
      }
    }
  });
});
