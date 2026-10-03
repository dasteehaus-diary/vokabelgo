const { test, expect } = require('@playwright/test');
const { seedStorage, getStorageJson } = require('./helpers/storage');

test.describe('E2E Test 3: Typing Race Condition Regression', () => {
  test('Typing A correct -> immediate manual continue before 450ms timer -> Typing B is NOT skipped', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Seed session with two consecutive typing verification items
    const fixture = {
      vokabelgo_user_profile: {
        username: 'Chị',
        hasSelectedCat: true,
        currentCat: 'mimi'
      },
      vokabelgo_srs_state_v1: {
        version: 1,
        cards: {
          b_1: {
            state: 2,
            dueAt: new Date(Date.now() - 3600000).toISOString(),
            stability: 2.5,
            difficulty: 5.0,
            elapsedDays: 2,
            scheduledDays: 1,
            reps: 2,
            lapses: 0,
            lastRating: 3,
            history: []
          },
          b_3: {
            state: 2,
            dueAt: new Date(Date.now() - 3600000).toISOString(),
            stability: 2.5,
            difficulty: 5.0,
            elapsedDays: 2,
            scheduledDays: 1,
            reps: 2,
            lapses: 0,
            lastRating: 3,
            history: []
          }
        }
      },
      vokabelgo_learning_session_v1: {
        sessionId: 'test_race_session_' + Date.now(),
        date: todayKey,
        deck: 'All',
        targetIds: ['b_1', 'b_3'],
        completedTargets: [],
        completed: false,
        queueIndex: 0,
        queue: [
          { type: 'typing', cardId: 'b_1' },
          { type: 'typing', cardId: 'b_3' }
        ],
        targetStates: {
          b_1: { attempts: 0, failures: 0, completed: false, recallRatings: [], typingSubmitted: false },
          b_3: { attempts: 0, failures: 0, completed: false, recallRatings: [], typingSubmitted: false }
        }
      }
    };

    await seedStorage(page, fixture);
    await page.goto('/');

    const todayHub = page.locator('#todayMode');
    await expect(todayHub).toBeVisible();

    const primaryCta = page.locator('#todayPrimaryCta');
    await expect(primaryCta).toBeVisible();
    await primaryCta.click();

    // Session opens in study area
    const studyArea = page.locator('#studyAreaContainer');
    await expect(studyArea).toBeVisible();

    const typingBox = page.locator('#sessionTypingBox');
    await expect(typingBox).toBeVisible();

    const typingInput = page.locator('#sessionTypingInput');
    const typingSubmitBtn = page.locator('#btnSessionTypingSubmit');
    const typingContinueBtn = page.locator('#btnSessionTypingContinue');

    // --------------------------------------------------------------------------
    // STEP 1: Submit Typing A (die Geste) correctly
    // --------------------------------------------------------------------------
    await typingInput.fill('die Geste');
    await typingSubmitBtn.click();

    // Feedback appears immediately
    const feedbackBadge = page.locator('#sessionTypingFeedbackBadge');
    await expect(feedbackBadge).toBeVisible();
    await expect(feedbackBadge).toContainText('CHÍNH XÁC');

    // --------------------------------------------------------------------------
    // STEP 2: Immediately click Continue manually before the 450ms auto-timer!
    // --------------------------------------------------------------------------
    await expect(typingContinueBtn).toBeVisible();
    await typingContinueBtn.click();

    // --------------------------------------------------------------------------
    // STEP 3: Verify we are at Typing B (der Gesichtsausdruck)
    // --------------------------------------------------------------------------
    await expect(typingBox).toBeVisible();
    // Input is reset and ready for Typing B
    await expect(typingInput).toBeVisible();
    await expect(typingInput).toBeEnabled();
    expect(await typingInput.inputValue()).toBe('');

    // Prompt is for b_3 (vẻ mặt)
    const typingPrompt = page.locator('#sessionTypingPrompt');
    await expect(typingPrompt).toBeVisible();
    await expect(typingPrompt).toContainText('vẻ mặt');

    // --------------------------------------------------------------------------
    // STEP 4: Wait 750ms to let Typing A's 450ms auto-timer fire in the background
    // --------------------------------------------------------------------------
    await page.waitForTimeout(750);

    // --------------------------------------------------------------------------
    // STEP 5: Assert Typing B was NOT skipped!
    // --------------------------------------------------------------------------
    // Queue must STILL be at Typing B
    await expect(typingBox).toBeVisible();
    await expect(typingPrompt).toContainText('vẻ mặt');
    expect(await typingInput.inputValue()).toBe('');
    await expect(typingInput).toBeEnabled();

    // Session state in localStorage must show queueIndex === 1 and completedTargets has only b_1
    const sessionState = await getStorageJson(page, 'vokabelgo_learning_session_v1');
    expect(sessionState).not.toBeNull();
    expect(sessionState.queueIndex).toBe(1);
    expect(sessionState.completedTargets).toEqual(['b_1']);
    expect(sessionState.completed).toBe(false);

    // --------------------------------------------------------------------------
    // STEP 6: Complete Typing B cleanly to verify normal continuation
    // --------------------------------------------------------------------------
    await typingInput.fill('der Gesichtsausdruck');
    await typingSubmitBtn.click();

    await expect(feedbackBadge).toBeVisible();
    await expect(feedbackBadge).toContainText('CHÍNH XÁC');

    // Auto-continue or manual continue finishes the session
    const finalSession = await getStorageJson(page, 'vokabelgo_learning_session_v1');
    expect(finalSession.completedTargets).toContain('b_3');

    // Ensure no uncaught errors
    expect(pageErrors).toHaveLength(0);
  });
});
