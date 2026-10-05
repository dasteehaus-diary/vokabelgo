const { test, expect } = require('@playwright/test');
const { seedStorage, getStorageJson } = require('./helpers/storage');
const { createDeterministicDailySessionFixture } = require('./helpers/session');

test.describe('E2E Reward Auto-Open Race Condition Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Stub browser SpeechSynthesis before page loads for headless CI compatibility
    await page.addInitScript(() => {
      window.__e2eSpokenTexts = [];
      if (window.speechSynthesis) {
        window.speechSynthesis.speak = function(u) {
          const txt = typeof u === 'string' ? u : (u && u.text ? u.text : String(u));
          window.__e2eSpokenTexts.push(txt);
          if (u && typeof u.onend === 'function') {
            setTimeout(u.onend, 10);
          }
        };
      }
    });
  });

  test('Learner completes session and manually claims reward before 700ms timer fires: modal closes, stays hidden after 900ms, exactly 1 fish awarded', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    // 1. Seed deterministic fixture
    const fixture = createDeterministicDailySessionFixture();
    const initialFishCount = (fixture.vokabelgo_fish_collection_v1 || []).length;
    await seedStorage(page, fixture);

    // 2. Open Today home and start session
    await page.goto('/');
    const todayHub = page.locator('#todayMode');
    await expect(todayHub).toBeVisible();

    const primaryCta = page.locator('#todayPrimaryCta');
    await expect(primaryCta).toBeVisible();
    await primaryCta.click();

    await expect(page.locator('#studyAreaContainer')).toBeVisible();

    // 3. Complete 5 Targets:
    // Target 1: Intro b_0
    const introContinueBtn = page.locator('#sessionIntroBox .btn-session-continue');
    await expect(introContinueBtn).toBeVisible();
    await introContinueBtn.click();

    // Target 2: Typing b_1 (die Geste)
    const typingBox = page.locator('#sessionTypingBox');
    await expect(typingBox).toBeVisible();
    await page.locator('#sessionTypingInput').fill('die Geste');
    await page.locator('#btnSessionTypingSubmit').click();
    await expect(page.locator('#sessionTypingFeedbackBadge')).toContainText('CHÍNH XÁC');
    // Click continue immediately to advance
    const btnTypingContinue = page.locator('#btnSessionTypingContinue');
    if (await btnTypingContinue.isVisible()) {
      await btnTypingContinue.click();
    } else {
      await expect(typingBox).toBeHidden({ timeout: 4000 });
    }

    // Target 1 completes: Recall b_0 (die Körpersprache)
    await expect(page.locator('#frontTerm')).toContainText('die Körpersprache');
    await page.locator('#activeRecallFrontAction .btn-reveal-answer').click();
    await expect(page.locator('#card')).toHaveClass(/flipped/);
    await page.locator('button[data-rate="known"]').click();
    await expect(page.locator('#sessionTargetsIndicator')).toContainText('2/5 mục tiêu');

    // Intro b_2 (die Mimik)
    await expect(page.locator('#sessionIntroBox')).toBeVisible();
    await expect(page.locator('#frontTerm')).toContainText('die Mimik');
    await page.locator('#sessionIntroBox .btn-session-continue').click();

    // Target 3: Listening b_3 (der Gesichtsausdruck)
    const listeningBox = page.locator('#sessionListeningBox');
    await expect(listeningBox).toBeVisible();
    await page.locator('#btnSessionListeningPlay').click();
    await page.locator('#sessionListeningInput').fill('der Gesichtsausdruck');
    await page.locator('#btnSessionListeningSubmit').click();
    await expect(page.locator('#sessionListeningFeedbackBadge')).toContainText('CHÍNH XÁC');
    const btnListeningContinue = page.locator('#btnSessionListeningContinue');
    if (await btnListeningContinue.isVisible()) {
      await btnListeningContinue.click();
    } else {
      await expect(listeningBox).toBeHidden({ timeout: 4000 });
    }
    await expect(page.locator('#sessionTargetsIndicator')).toContainText('3/5 mục tiêu');

    // Target 4: Recall b_2 (die Mimik)
    await expect(page.locator('#frontTerm')).toContainText('die Mimik');
    await page.locator('#activeRecallFrontAction .btn-reveal-answer').click();
    await expect(page.locator('#card')).toHaveClass(/flipped/);
    await page.locator('button[data-rate="known"]').click();
    await expect(page.locator('#sessionTargetsIndicator')).toContainText('4/5 mục tiêu');

    // Target 5: Recall b_4 (der Tonfall) -> completes session!
    await expect(page.locator('#card')).not.toHaveClass(/flipped/);
    await expect(page.locator('#frontTerm')).toContainText('der Tonfall');
    await page.locator('#activeRecallFrontAction .btn-reveal-answer').click();
    await expect(page.locator('#card')).toHaveClass(/flipped/);
    await page.locator('button[data-rate="known"]').click();

    // 4. Session is completed. #sessionCompleteBox is displayed with #btnSessionClaimReward
    const claimRewardBtn = page.locator('#btnSessionClaimReward');
    await expect(claimRewardBtn).toBeVisible({ timeout: 3000 });

    // Click claim button immediately (< 700ms before auto-open timer would fire)
    await claimRewardBtn.click();

    // 5. Reward modal is open
    const rewardModal = page.locator('#rewardPrototypeModal');
    await expect(rewardModal).toBeVisible();

    // Dispatch 'ended' event on video to reveal catch
    await page.evaluate(() => {
      const video = document.getElementById('rewardCatVideo');
      if (video) {
        video.dispatchEvent(new Event('ended'));
      }
    });

    // Catch reveal layer appears
    const catchRevealLayer = page.locator('#rewardCatchRevealLayer');
    await expect(catchRevealLayer).toBeVisible({ timeout: 4000 });
    await expect(page.locator('#catchGermanWord')).not.toBeEmpty();

    // Click "#btnCollectFish" to collect fish and close modal
    const btnCollectFish = page.locator('#btnCollectFish');
    await expect(btnCollectFish).toBeVisible({ timeout: 4000 });
    await btnCollectFish.click();

    // Modal closes
    await expect(rewardModal).toBeHidden();

    // Wait > 700ms (900ms) to ensure old auto-open timer does NOT reopen the modal
    await page.waitForTimeout(900);

    // Modal MUST STILL BE HIDDEN
    await expect(rewardModal).toBeHidden();

    // Fish collection increased by EXACTLY +1
    const fishAfter = await getStorageJson(page, 'vokabelgo_fish_collection_v1');
    expect(fishAfter.length).toBe(initialFishCount + 1);

    // Catch status is 'claimed'
    const dailyProgress = await getStorageJson(page, 'vokabelgo_daily_progress_v1');
    const todayKey = Object.keys(dailyProgress.days).sort().pop();
    expect(dailyProgress.days[todayKey].catchStatus).toBe('claimed');

    // 6. Return to Today hub
    await page.locator('[data-nav="today"]').click();
    await expect(page.locator('#todayMode')).toBeVisible();

    // Primary CTA displays "Ôn thêm từ vựng"
    const todayCta = page.locator('#todayPrimaryCta');
    await expect(todayCta).toBeVisible();
    await expect(todayCta).toContainText('Ôn thêm từ vựng');

    // No uncaught errors
    expect(pageErrors).toHaveLength(0);
  });
});
