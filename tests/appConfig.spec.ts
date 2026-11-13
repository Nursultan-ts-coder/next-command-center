import { test, expect } from './fixtures';

// Both tests save the same plugin settings (and reload), so they run one after the other.
test.describe.configure({ mode: 'serial' });

test('should be possible to save app configuration', async ({ appConfigPage, page }) => {
  const saveButton = page.getByRole('button', { name: /Save API settings/i });

  // reset the configured secret
  await page.getByRole('button', { name: /reset/i }).click();

  // enter some valid values
  await page.locator('#api-key').fill('secret-api-key');
  await page.getByRole('textbox', { name: 'API Url' }).clear();
  await page.getByRole('textbox', { name: 'API Url' }).fill('http://www.my-awsome-grafana-app.com/api');

  // listen for the server response on the saved form
  const saveResponse = appConfigPage.waitForSettingsResponse();

  await saveButton.click();
  await expect(saveResponse).toBeOK();
});

test('should be possible to save the Google Maps key', async ({ appConfigPage, page }) => {
  await page.getByRole('textbox', { name: 'Google Maps API key' }).fill('test-maps-key');

  const saveResponse = appConfigPage.waitForSettingsResponse();

  await page.getByRole('button', { name: /Save map and agent settings/i }).click();
  await expect(saveResponse).toBeOK();
});
