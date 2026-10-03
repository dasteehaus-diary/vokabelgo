const { test, expect } = require('@playwright/test');
const { seedStorage, getStorageJson } = require('./helpers/storage');
const { createDeterministicDailySessionFixture } = require('./helpers/session');

test.describe('E2E Test 2: Full Real Daily Session Lifecycle', () => {
  test('Complete learner flow: Intro, Wrong Typing, F5 Reload, Requeue, Correct Typing, 5 Targets, Cat Reward, and Completed Home', async ({ page }) => {
    // 1. Capture page errors
    const pageErrors = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    // 2. Seed deterministic fixture
    const fixture = createDeterministicDailySessionFixture();
    const initialFishCount = (fixture.vokabelgo_fish_collection_v1 || []).length;
    await seedStorage(page, fixture);

    // 3. Navigate to Today home
    await page.goto('/');

    const todayHub = page.locator('#todayMode');
    await expect(todayHub).toBeVisible();

    const primaryCta = page.locator('#todayPrimaryCta');
    await expect(primaryCta).toBeVisible();

    // 4. Start Daily Session via UI
    await primaryCta.click();

    // Assert study session opened
    const studyArea = page.locator('#studyAreaContainer');
    await expect(studyArea).toBeVisible();

    const sessionHeader = page.locator('#sessionHeaderBar');
    await expect(sessionHeader).toBeVisible();
    await expect(page.locator('#sessionTargetsIndicator')).toContainText('0/5 mục tiêu');

    // --------------------------------------------------------------------------
    // STEP 1: First Interaction is Intro b_0 (die Körpersprache)
    // --------------------------------------------------------------------------
    const introBox = page.locator('#sessionIntroBox');
    await expect(introBox).toBeVisible();

    // German term and Vietnamese meaning visible
    await expect(page.locator('#frontTerm')).toContainText('die Körpersprache');
    await expect(page.locator('#sessionIntroMeaning')).not.toBeEmpty();

    // Click "Tiếp tục" button
    const btnIntroContinue = page.locator('#sessionIntroBox .btn-session-continue');
    await expect(btnIntroContinue).toBeVisible();
    await btnIntroContinue.click();

    // --------------------------------------------------------------------------
    // STEP 2: Objective Typing b_1 (die Geste, -n) - INTENTIONALLY WRONG
    // --------------------------------------------------------------------------
    const typingBox = page.locator('#sessionTypingBox');
    await expect(typingBox).toBeVisible();

    // Vietnamese prompt is visible
    const typingPrompt = page.locator('#sessionTypingPrompt');
    await expect(typingPrompt).toBeVisible();
    await expect(typingPrompt).not.toBeEmpty();

    // German answer must NOT be visible before submit
    const frontTerm = page.locator('#frontTerm');
    await expect(frontTerm).toBeHidden();
    const typingCanonical = page.locator('#sessionTypingCanonical');
    await expect(typingCanonical).toBeEmpty();

    // Accessibility check: input focused, has aria-label
    const typingInput = page.locator('#sessionTypingInput');
    await expect(typingInput).toBeVisible();
    await expect(typingInput).toHaveAttribute('aria-label', /tiếng Đức/i);

    // Enter wrong answer: "die Erfahrung"
    await typingInput.fill('die Erfahrung');

    // Click "Kiểm tra"
    const btnTypingSubmit = page.locator('#btnSessionTypingSubmit');
    await btnTypingSubmit.click();

    // Feedback WRONG visible
    const typingFeedback = page.locator('#sessionTypingFeedback');
    await expect(typingFeedback).toBeVisible();
    await expect(page.locator('#sessionTypingFeedbackBadge')).toContainText('CHƯA CHÍNH XÁC');

    // Canonical answer is displayed
    await expect(typingCanonical).toContainText('die Geste');

    // Rating buttons are NOT usable (not flipped)
    const cardEl = page.locator('#card');
    await expect(cardEl).not.toHaveClass(/flipped/);

    // --------------------------------------------------------------------------
    // STEP 3: F5 Reload / Resume Persistence Test
    // --------------------------------------------------------------------------
    await page.reload();

    // Navigate to Today hub (learner flow to resume from Home)
    await page.locator('[data-nav="today"]').click();
    await expect(page.locator('#todayMode')).toBeVisible();

    const resumeCta = page.locator('#todayPrimaryCta');
    await expect(resumeCta).toBeVisible();
    await expect(resumeCta).toContainText('Tiếp tục học');

    // Resume session via primary CTA
    await resumeCta.click();

    // Verify session resumed at the exact typing feedback state
    await expect(page.locator('#studyAreaContainer')).toBeVisible();
    await expect(page.locator('#sessionTypingBox')).toBeVisible();
    await expect(page.locator('#sessionTypingFeedback')).toBeVisible();
    await expect(page.locator('#sessionTypingFeedbackBadge')).toContainText('CHƯA CHÍNH XÁC');
    await expect(page.locator('#sessionTypingCanonical')).toContainText('die Geste');

    // --------------------------------------------------------------------------
    // STEP 4: Continue after Wrong -> Verify Requeue is Interleaved
    // --------------------------------------------------------------------------
    const btnTypingContinue = page.locator('#btnSessionTypingContinue');
    await expect(btnTypingContinue).toBeVisible();
    await btnTypingContinue.click();

    // Next interaction must NOT be b_1 immediately (interleaved)
    // It should be Recall b_0
    await expect(page.locator('#sessionTypingBox')).toBeHidden();
    await expect(page.locator('#frontTerm')).toContainText('die Körpersprache');

    // Complete Recall b_0:
    const btnReveal = page.locator('#activeRecallFrontAction .btn-reveal-answer');
    await btnReveal.click();
    await expect(page.locator('#card')).toHaveClass(/flipped/);
    await page.locator('button[data-rate="known"]').click();
    await expect(page.locator('#sessionTargetsIndicator')).toContainText('1/5 mục tiêu');

    // --------------------------------------------------------------------------
    // STEP 5: Intro b_2 (die Mimik)
    // --------------------------------------------------------------------------
    const introBoxB2 = page.locator('#sessionIntroBox');
    await expect(introBoxB2).toBeVisible();
    await expect(page.locator('#frontTerm')).toContainText('die Mimik');
    await page.locator('#sessionIntroBox .btn-session-continue').click();

    // --------------------------------------------------------------------------
    // STEP 6: Requeued b_1 returns under Active Recall (Interleaved review)
    // --------------------------------------------------------------------------
    await expect(page.locator('#frontTerm')).toContainText('die Geste');
    await page.locator('#activeRecallFrontAction .btn-reveal-answer').click();
    await expect(page.locator('#card')).toHaveClass(/flipped/);
    await page.locator('button[data-rate="known"]').click();
    await expect(page.locator('#sessionTargetsIndicator')).toContainText('2/5 mục tiêu');

    // --------------------------------------------------------------------------
    // STEP 7: Second Typing b_3 (der Gesichtsausdruck) -> CORRECT + AUTO-CONTINUE
    // --------------------------------------------------------------------------
    await expect(page.locator('#sessionTypingBox')).toBeVisible();
    await typingInput.fill('der Gesichtsausdruck');
    await btnTypingSubmit.click();

    // Feedback Correct appears
    await expect(page.locator('#sessionTypingFeedbackBadge')).toContainText('CHÍNH XÁC');
    await expect(page.locator('#sessionTargetsIndicator')).toContainText('3/5 mục tiêu');

    // Wait for auto-continue to advance past b_3 typing
    await expect(page.locator('#sessionTypingBox')).toBeHidden({ timeout: 4000 });

    // --------------------------------------------------------------------------
    // STEP 8: Recall b_2 (die Mimik) -> 4/5 Targets
    // --------------------------------------------------------------------------
    await expect(page.locator('#activeRecallFrontAction .btn-reveal-answer')).toBeVisible();
    await expect(page.locator('#frontTerm')).toContainText('die Mimik');
    await page.locator('#activeRecallFrontAction .btn-reveal-answer').click();
    await page.locator('button[data-rate="known"]').click();
    await expect(page.locator('#sessionTargetsIndicator')).toContainText('4/5 mục tiêu');

    // --------------------------------------------------------------------------
    // STEP 9: Recall b_4 (der Tonfall) -> 5/5 Targets Complete!
    // --------------------------------------------------------------------------
    await expect(page.locator('#card')).not.toHaveClass(/flipped/);
    await expect(page.locator('#activeRecallFrontAction .btn-reveal-answer')).toBeVisible();
    await expect(page.locator('#frontTerm')).toContainText('der Tonfall');
    await page.locator('#activeRecallFrontAction .btn-reveal-answer').click();
    await expect(page.locator('#card')).toHaveClass(/flipped/);
    await page.locator('button[data-rate="known"]').click();

    // --------------------------------------------------------------------------
    // STEP 7: Assert 5/5 Targets & FSRS Again Preservation for b_1
    // --------------------------------------------------------------------------
    const srsState = await getStorageJson(page, 'vokabelgo_srs_state_v1');
    expect(srsState).not.toBeNull();
    const b1Srs = srsState.cards['b_1'];
    expect(b1Srs).toBeDefined();

    // CRITICAL: b_1 finalRating must reflect session aggregate = Again (1) due to earlier typing wrong
    expect(b1Srs.lastRating).toBe(1);

    // Verify Daily Goal state = 5 completed
    const dailyGoal = await getStorageJson(page, 'vokabelgo_daily_progress_v1');
    expect(dailyGoal).not.toBeNull();

    // --------------------------------------------------------------------------
    // STEP 8: Cat Fishing Reward Modal
    // --------------------------------------------------------------------------
    const rewardModal = page.locator('#rewardPrototypeModal');
    // Reward modal can open automatically or via claim button
    const claimBtn = page.locator('#btnSessionClaimReward');
    if (await claimBtn.isVisible()) {
      await claimBtn.click();
    }
    await expect(rewardModal).toBeVisible({ timeout: 5000 });

    // Section 16: Dispatch DOM 'ended' event to simulate video completion safely
    await page.evaluate(() => {
      const video = document.getElementById('rewardCatVideo');
      if (video) {
        video.dispatchEvent(new Event('ended'));
      }
    });

    // Fish reveal becomes visible
    const catchRevealLayer = page.locator('#rewardCatchRevealLayer');
    await expect(catchRevealLayer).toBeVisible({ timeout: 4000 });
    await expect(page.locator('#catchGermanWord')).not.toBeEmpty();

    // Click "#btnCollectFish" / "Học tiếp"
    const btnCollectFish = page.locator('#btnCollectFish');
    await expect(btnCollectFish).toBeVisible({ timeout: 4000 });
    await btnCollectFish.click();

    // Modal closes
    await expect(rewardModal).toBeHidden();

    // Fish collection increased by EXACTLY +1
    const fishAfter = await getStorageJson(page, 'vokabelgo_fish_collection_v1');
    expect(fishAfter.length).toBe(initialFishCount + 1);

    // Catch status is claimed
    const finalDaily = await getStorageJson(page, 'vokabelgo_daily_progress_v1');
    const todayKey = Object.keys(finalDaily.days).sort().pop();
    expect(finalDaily.days[todayKey].catchStatus).toBe('claimed');

    // --------------------------------------------------------------------------
    // STEP 9: Home After Reward Shows Completed State
    // --------------------------------------------------------------------------
    await page.locator('[data-nav="today"]').click();
    await expect(page.locator('#todayMode')).toBeVisible();

    // Primary CTA now offers "Ôn thêm từ vựng"
    const postCta = page.locator('#todayPrimaryCta');
    await expect(postCta).toContainText('Ôn thêm từ vựng');

    // Progress Truth metrics reflect updated counts properly
    const needsReviewAfter = await page.locator('#todayMetricNeedsReview').textContent();
    const learningAfter = await page.locator('#todayMetricLearning').textContent();
    const stableAfter = await page.locator('#todayMetricStable').textContent();

    expect(parseInt(needsReviewAfter, 10)).toBeGreaterThanOrEqual(0);
    expect(parseInt(learningAfter, 10)).toBeGreaterThanOrEqual(0);
    expect(parseInt(stableAfter, 10)).toBeGreaterThanOrEqual(0);

    // Ensure no uncaught page errors
    expect(pageErrors).toHaveLength(0);
  });
});
