const { test, expect } = require('@playwright/test');
const { seedStorage } = require('./helpers/storage');
const { createDeterministicDailySessionFixture } = require('./helpers/session');

test.describe('E2E Test 1: App Boot & Smoke', () => {
  test('App boots in Chromium cleanly with Today hub, navigation, and Progress Truth metrics', async ({ page }) => {
    // Collect page errors
    const pageErrors = [];
    page.on('pageerror', (err) => {
      // Ignore non-fatal external resource warnings if any, but capture core JS errors
      pageErrors.push(err.message);
    });

    // Seed deterministic fixture
    const fixture = createDeterministicDailySessionFixture();
    await seedStorage(page, fixture);

    // Open Home
    await page.goto('/');

    // 1. Verify Today hub container is visible
    const todayHub = page.locator('#todayMode');
    await expect(todayHub).toBeVisible();

    // 2. Primary CTA visible
    const primaryCta = page.locator('#todayPrimaryCta');
    await expect(primaryCta).toBeVisible();

    // 3. 3 Learning Metrics visible
    const needsReviewVal = page.locator('#todayMetricNeedsReview');
    const learningVal = page.locator('#todayMetricLearning');
    const stableVal = page.locator('#todayMetricStable');

    await expect(needsReviewVal).toBeVisible();
    await expect(learningVal).toBeVisible();
    await expect(stableVal).toBeVisible();

    // Assert labels
    await expect(page.locator('.metric-card-modern.metric-needs-review .metric-card-label')).toHaveText('Cần ôn');
    await expect(page.locator('.metric-card-modern.metric-learning .metric-card-label')).toHaveText('Đang học');
    await expect(page.locator('.metric-card-modern.metric-stable .metric-card-label')).toHaveText('Nhớ ổn');

    // 4. Secondary meta visible (Fish + Streak)
    const secondaryMeta = page.locator('#todaySecondaryMeta');
    await expect(secondaryMeta).toBeVisible();
    await expect(page.locator('#todayMetaFishText')).toContainText('chú trong Hồ cá');
    await expect(page.locator('#todayMetaStreakText')).toContainText('ngày học đều');

    // 5. Main 4 Navigation Hubs render
    const navToday = page.locator('[data-nav="today"]');
    const navStudy = page.locator('[data-nav="study"]');
    const navKino = page.locator('[data-nav="kino"]');
    const navLibrary = page.locator('[data-nav="library"]');

    await expect(navToday).toBeVisible();
    await expect(navStudy).toBeVisible();
    await expect(navKino).toBeVisible();
    await expect(navLibrary).toBeVisible();

    // 6. Section 29 Smoke: Auth modal opens without crashing guest mode
    await page.evaluate(() => {
      if (typeof openAuthModal === 'function') openAuthModal();
    });
    const configModal = page.locator('#supabaseConfigModal');
    const authModal = page.locator('#authModal');
    const isEitherVisible = (await configModal.isVisible()) || (await authModal.isVisible());
    expect(isEitherVisible, 'Either authModal or supabaseConfigModal should be opened in guest mode').toBeTruthy();

    await page.evaluate(() => {
      if (typeof closeSupabaseConfigModal === 'function') closeSupabaseConfigModal();
      if (typeof closeAuthModal === 'function') closeAuthModal();
    });
    await expect(configModal).toBeHidden();
    await expect(authModal).toBeHidden();

    // 7. Section 30 Smoke: Kino hub renders without pageerror
    await navKino.click();
    await expect(page.locator('#diktatMode')).toBeVisible();

    // Return to Today hub
    await navToday.click();
    await expect(todayHub).toBeVisible();

    // 8. Assert NO uncaught JS page errors occurred
    expect(pageErrors, `Uncaught page errors found: ${pageErrors.join(', ')}`).toHaveLength(0);
  });

  test('Kino hub transition: Study submode does not leak into Kino and restores upon return', async ({ page }) => {
    const fixture = createDeterministicDailySessionFixture();
    await seedStorage(page, fixture);
    await page.goto('/');

    const navStudy = page.locator('[data-nav="study"]');
    const navKino = page.locator('[data-nav="kino"]');

    // 1. Open Study -> Flashcard
    await navStudy.click();
    const flashMode = page.locator('#flashMode');
    const mcqMode = page.locator('#mcqMode');
    const typingMode = page.locator('#typingMode');
    const matchMode = page.locator('#matchMode');
    const diktatMode = page.locator('#diktatMode');

    // 2. Verify #flashMode visible
    await expect(flashMode).toBeVisible();
    await expect(mcqMode).toBeHidden();
    await expect(typingMode).toBeHidden();
    await expect(matchMode).toBeHidden();
    await expect(diktatMode).toBeHidden();

    // 3. Click Kino
    await navKino.click();

    // 4. Verify:
    //    - #diktatMode visible
    //    - #flashMode hidden
    //    - #mcqMode hidden
    //    - #typingMode hidden
    //    - #matchMode hidden
    await expect(diktatMode).toBeVisible();
    await expect(flashMode).toBeHidden();
    await expect(mcqMode).toBeHidden();
    await expect(typingMode).toBeHidden();
    await expect(matchMode).toBeHidden();

    // Verify no flashcard text or controls appear above Kino
    await expect(page.locator('#flashActionsBar')).toBeHidden();
    await expect(page.locator('#activeRecallFrontAction')).toBeHidden();

    // Verify Kino starts immediately after header/navigation (no blank Study space)
    const diktatBox = await diktatMode.boundingBox();
    const headerBox = await page.locator('.app-header-modern').boundingBox();
    expect(diktatBox).not.toBeNull();
    expect(headerBox).not.toBeNull();
    expect(diktatBox.y - (headerBox.y + headerBox.height)).toBeLessThan(120);

    // 5. Return to Study
    await navStudy.click();

    // 6. Verify previous Study submode (#flashMode) is visible again
    await expect(flashMode).toBeVisible();
    await expect(diktatMode).toBeHidden();
    await expect(mcqMode).toBeHidden();
    await expect(typingMode).toBeHidden();
    await expect(matchMode).toBeHidden();
  });
});
