/**
 * Storage helpers for deterministic E2E test setup
 */

/**
 * Seeds localStorage before the document loads using page.addInitScript.
 * Sets vokabelgo_clean_slate_fresh_v2026 = 'true' to prevent legacy bootstrap wipe.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Record<string, any>} data
 */
async function seedStorage(page, data = {}) {
  const seedPayload = {
    vokabelgo_clean_slate_fresh_v2026: 'true',
    ...data
  };

  await page.addInitScript((items) => {
    try {
      // Do NOT overwrite or clear localStorage if already seeded (e.g. during F5 page.reload)
      if (localStorage.getItem('vokabelgo_clean_slate_fresh_v2026')) {
        return;
      }
      localStorage.clear();
      for (const [key, value] of Object.entries(items)) {
        if (value !== null && value !== undefined) {
          localStorage.setItem(
            key,
            typeof value === 'object' ? JSON.stringify(value) : String(value)
          );
        }
      }
    } catch (e) {
      console.error('[E2E Seed Error]', e);
    }
  }, seedPayload);
}

/**
 * Retrieves a parsed JSON object from localStorage in the browser context.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} key
 */
async function getStorageJson(page, key) {
  return await page.evaluate((k) => {
    try {
      const raw = localStorage.getItem(k);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }, key);
}

/**
 * Retrieves raw string from localStorage in the browser context.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} key
 */
async function getStorageRaw(page, key) {
  return await page.evaluate((k) => localStorage.getItem(k), key);
}

module.exports = {
  seedStorage,
  getStorageJson,
  getStorageRaw
};
