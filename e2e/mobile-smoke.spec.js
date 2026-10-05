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

    // Check no horizontal scroll overflow on Today Hub (Requirement E)
    const todayOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(todayOverflow).toBe(false);

    // Round 1.1 Mobile Visual Regression Assertions
    // Requirement A & B: Welcome title width reasonable (>= 150px) and not word-by-word wrapping into tall column
    const welcomeBar = page.locator('.today-welcome-bar');
    await expect(welcomeBar).toBeVisible();

    const greetingTitle = page.locator('#todayGreetingText');
    await expect(greetingTitle).toBeVisible();
    const titleBox = await greetingTitle.boundingBox();
    expect(titleBox).not.toBeNull();
    expect(titleBox.width).toBeGreaterThanOrEqual(150);
    // At normal 2-line wrapping, height is ~40-55px; if squeezed into a 1-word column, height would be > 120px
    expect(titleBox.height).toBeLessThan(80);

    // Requirement C: Date badge remains visible
    const dateBadge = page.locator('#todayDateStr');
    await expect(dateBadge).toBeVisible();

    // Requirement D: Today nav remains usable
    const mainNav = page.locator('.main-nav-hubs');
    await expect(mainNav).toBeVisible();
    await expect(page.locator('.nav-hub-btn[data-nav="today"]')).toBeVisible();

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

  test('Mobile viewport (390x844): Listening Recall box responsiveness, touch controls, zero horizontal scroll', async ({ page }) => {
    const fixture = createDeterministicDailySessionFixture();
    await seedStorage(page, fixture);

    await page.goto('/');
    await page.locator('#todayPrimaryCta').click();

    // Advance past b_0 intro, b_1 typing, b_0 recall, b_2 intro to reach b_3 listening
    await page.locator('#sessionIntroBox .btn-session-continue').click();
    await page.locator('#sessionTypingInput').fill('die Geste');
    await page.locator('#btnSessionTypingSubmit').click();
    await expect(page.locator('#sessionTypingBox')).toBeHidden({ timeout: 4000 });
    await page.locator('#activeRecallFrontAction .btn-reveal-answer').click();
    await page.locator('button[data-rate="known"]').click();
    await page.locator('#sessionIntroBox .btn-session-continue').click();

    // Now in Listening Recall interaction
    const listeningBox = page.locator('#sessionListeningBox');
    await expect(listeningBox).toBeVisible();

    // Verify Listen button is reachable and visible
    const btnPlay = page.locator('#btnSessionListeningPlay');
    await expect(btnPlay).toBeVisible();
    await expect(btnPlay).toBeEnabled();

    // Verify input is reachable
    const listeningInput = page.locator('#sessionListeningInput');
    await expect(listeningInput).toBeVisible();

    // Verify umlaut toolbar is reachable
    const umlautBar = page.locator('#sessionListeningUmlautBar');
    await expect(umlautBar).toBeVisible();

    // Test mobile tap on umlaut button
    const btnUmlautA = page.locator('#sessionListeningUmlautBar button[data-char="ä"]');
    await expect(btnUmlautA).toBeVisible();
    await btnUmlautA.click();
    expect(await listeningInput.inputValue()).toBe('ä');

    // Verify zero horizontal scroll overflow on mobile viewport
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });

  test('Mobile viewport (390x844): Kino hub transition has no leaked study mode and zero horizontal overflow', async ({ page }) => {
    const fixture = createDeterministicDailySessionFixture();
    await seedStorage(page, fixture);
    await page.goto('/');

    const navStudy = page.locator('[data-nav="study"]');
    const navKino = page.locator('[data-nav="kino"]');

    // 1. Open Study
    await navStudy.click();
    await expect(page.locator('#flashMode')).toBeVisible();

    // 2. Switch to Kino
    await navKino.click();
    await expect(page.locator('#diktatMode')).toBeVisible();
    await expect(page.locator('#flashMode')).toBeHidden();
    await expect(page.locator('#mcqMode')).toBeHidden();
    await expect(page.locator('#typingMode')).toBeHidden();
    await expect(page.locator('#matchMode')).toBeHidden();

    // Check zero horizontal overflow on mobile Kino
    const kinoOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(kinoOverflow).toBe(false);

    // 3. Return to Study
    await navStudy.click();
    await expect(page.locator('#flashMode')).toBeVisible();
    await expect(page.locator('#diktatMode')).toBeHidden();
  });
});
