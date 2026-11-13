import { test, expect } from './fixtures';

test.describe('navigating the Command Center', () => {
  test('the global page renders as the app home', async ({ gotoPage, page }) => {
    await gotoPage('');
    await expect(page.getByText('Global').first()).toBeVisible();
  });

  test('a store opens from the page address', async ({ gotoPage, page }) => {
    await gotoPage('?store=844');
    await expect(page.getByText('Store view')).toBeVisible();
    await expect(page.getByText('Drive-thru').first()).toBeVisible();
  });
});
