const { test, expect } = require('@playwright/test');
const { seedStorage } = require('./helpers/storage');
const { createDeterministicDailySessionFixture } = require('./helpers/session');

test.describe('E2E Test 4: Mobile Responsive Usability & Touch Flow', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
  });

  test('Mobile viewport (390x844): Today hub, session intro, typing verification, umlaut bar, zero horizontal scroll', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    const fixture = createDeterministicDailySessionFixture();
    await seedStorage(page, fixture);

    // 1. Load Today Hub on mobile viewport
    await page.goto('/');

    const todayHub = page.locator('#todayMode');
    await expect(todayHub).toBeVisible();

    // Check no horizontal scroll overflow on Today Hub
    const todayOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(todayOverflow).toBe(false);

    // Assert key mobile elements are rendered and visible
    const primaryCta = page.locator('#todayPrimaryCta');
    await expect(primaryCta).toBeVisible();

    const metricsStrip = page.locator('.today-metrics-strip');
    await expect(metricsStrip).toBeVisible();
    await expect(page.locator('#todayMetricNeedsReview')).toBeVisible();
    await expect(page.locator('#todayMetricLearning')).toBeVisible();
    await expect(page.locator('#todayMetricStable')).toBeVisible();

    const secondaryMeta = page.locator('#todaySecondaryMeta');
    await expect(secondaryMeta).toBeVisible();

    // 2. Start Daily Session on Mobile
    await primaryCta.click();

    const studyArea = page.locator('#studyAreaContainer');
    await expect(studyArea).toBeVisible();

    // Check no horizontal scroll overflow in study session
    const studyOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(studyOverflow).toBe(false);

    // 3. Step 1: Intro Card on Mobile
    const introBox = page.locator('#sessionIntroBox');
    await expect(introBox).toBeVisible();
    await expect(page.locator('#frontTerm')).toBeVisible();

    const btnIntroContinue = page.locator('#sessionIntroBox .btn-session-continue');
    await expect(btnIntroContinue).toBeVisible();
    await btnIntroContinue.click();

    // 4. Step 2: Objective Typing verification on Mobile
    const typingBox = page.locator('#sessionTypingBox');
    await expect(typingBox).toBeVisible();

    const typingInput = page.locator('#sessionTypingInput');
    await expect(typingInput).toBeVisible();
    await expect(typingInput).toBeEnabled();

    // Umlaut bar is visible on mobile
    const umlautBar = page.locator('#sessionUmlautBar');
    await expect(umlautBar).toBeVisible();

    // Test inserting special characters via mobile tap
    const btnUmlautA = page.locator('#sessionUmlautBar button[data-char="ä"]');
    const btnUmlautO = page.locator('#sessionUmlautBar button[data-char="ö"]');
    const btnUmlautU = page.locator('#sessionUmlautBar button[data-char="ü"]');
    const btnUmlautEss = page.locator('#sessionUmlautBar button[data-char="ß"]');

    await expect(btnUmlautA).toBeVisible();
    await expect(btnUmlautO).toBeVisible();
    await expect(btnUmlautU).toBeVisible();
    await expect(btnUmlautEss).toBeVisible();

    // Tap 'ä'
    await btnUmlautA.click();
    expect(await typingInput.inputValue()).toBe('ä');

    // Tap 'ö'
    await btnUmlautO.click();
    expect(await typingInput.inputValue()).toBe('äö');

    // Fill valid answer
    await typingInput.fill('die Geste');

    // Click submit button
    const btnSubmit = page.locator('#btnSessionTypingSubmit');
    await expect(btnSubmit).toBeVisible();
    await btnSubmit.click();

    // Feedback appears and fits within mobile viewport
    const feedbackBadge = page.locator('#sessionTypingFeedbackBadge');
    await expect(feedbackBadge).toBeVisible();
    await expect(feedbackBadge).toContainText('CHÍNH XÁC');

    // Verify still no horizontal scroll overflow with feedback displayed
    const feedbackOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(feedbackOverflow).toBe(false);

    // Verify zero page errors
    expect(pageErrors).toHaveLength(0);
  });
});
