const { test, expect } = require('@playwright/test');
const { seedStorage } = require('./helpers/storage');
const { createDeterministicDailySessionFixture } = require('./helpers/session');

test.describe('Wortregen Phase 3: In-App Integration into "Học từ"', () => {

  test.beforeEach(async ({ page }) => {
    // Collect console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });

    const fixture = createDeterministicDailySessionFixture();
    await seedStorage(page, fixture);

    // Open main VokabelGo application
    await page.goto('index.html');
    await page.waitForLoadState('domcontentloaded');

    // Ensure any background modals or popovers do not block pointer events
    await page.evaluate(() => {
      ['catAvatarModal', 'authModal', 'feedNudgePopover'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
      });
    });
  });

  test('Requirement 7 & 8: No Wortregen on Homepage, Header, or "Luyện tập"', async ({ page }) => {
    // Verify no Wortregen button in Header
    const headerWortregen = page.locator('header button:has-text("Wortregen"), header a:has-text("Wortregen")');
    await expect(headerWortregen).toHaveCount(0);

    // Verify no Wortregen button on Homepage / Today dashboard
    const todayHub = page.locator('#todayMode');
    await expect(todayHub).toBeVisible();
    const todayWortregen = todayHub.locator('button:has-text("Wortregen"), a:has-text("Wortregen"), .pathway-card:has-text("Wortregen")');
    await expect(todayWortregen).toHaveCount(0);

    // Verify no "Luyện tập" section containing Wortregen
    const practiceSection = page.locator('#practiceMode, #practice-section, [data-nav="practice"]');
    await expect(practiceSection).toHaveCount(0);
  });

  test('Requirement 1 & 2: "Học từ" has Wortregen as equal peer mode alongside Flashcard, MCQ, Typing, Match', async ({ page }) => {
    // Navigate to "Học từ" hub
    const studyNavBtn = page.locator('.nav-hub-btn[data-nav="study"]');
    await studyNavBtn.click();

    // Verify study area container is visible
    const studyArea = page.locator('#studyAreaContainer');
    await expect(studyArea).toBeVisible();

    // Verify all 5 peer study mode pills exist
    const pills = page.locator('.study-mode-pill');
    await expect(pills).toHaveCount(5);

    const flashPill = page.locator('.study-mode-pill[data-studymode="flash"]');
    const mcqPill = page.locator('.study-mode-pill[data-studymode="mcq"]');
    const typingPill = page.locator('.study-mode-pill[data-studymode="typing"]');
    const matchPill = page.locator('.study-mode-pill[data-studymode="match"]');
    const wortregenPill = page.locator('.study-mode-pill[data-studymode="wortregen"]');

    await expect(flashPill).toBeVisible();
    await expect(mcqPill).toBeVisible();
    await expect(typingPill).toBeVisible();
    await expect(matchPill).toBeVisible();
    await expect(wortregenPill).toBeVisible();

    // Verify Wortregen pill text
    await expect(wortregenPill).toContainText('Wortregen – Mưa từ vựng');

    // Default active mode in study is flash
    await expect(flashPill).toHaveClass(/active/);
  });

  test('Requirement 3, 4, 5, 9: Complete flow: Học từ → Wortregen → play → return to Học từ', async ({ page }) => {
    // Step 1: Navigate to "Học từ"
    await page.locator('.nav-hub-btn[data-nav="study"]').click();
    await expect(page.locator('#studyAreaContainer')).toBeVisible();
    await expect(page.locator('#flashMode')).toBeVisible();

    // Step 2: Click Wortregen study mode pill
    const wortregenPill = page.locator('.study-mode-pill[data-studymode="wortregen"]');
    await wortregenPill.click();

    // Step 3: Transition to Wortregen in-app game view
    await expect(wortregenPill).toHaveClass(/active/);
    const wortregenSection = page.locator('#wortregenMode');
    await expect(wortregenSection).toBeVisible();
    await expect(page.locator('#flashMode')).toBeHidden();

    // Verify Wortregen App container is inside VokabelGo SPA
    const appEl = page.locator('#wortregenMode #wortregen-app');
    await expect(appEl).toBeVisible();

    // Verify "← Quay lại Học từ" button exists
    const backBtn = page.locator('#btn-back-to-study');
    await expect(backBtn).toBeVisible();
    await expect(backBtn).toContainText('Quay lại Học từ');

    // Verify Start Screen is visible
    const startScreen = page.locator('#start-screen');
    await expect(startScreen).toBeVisible();
    await expect(startScreen).toContainText('Wortregen');

    // Step 4: Verify Wortregen uses real VokabelGo vocabulary (allCards) via Phase 2 provider
    const vocabStats = await page.evaluate(() => {
      const g = window.wortregenGame;
      if (!g || !g.vocabProvider) return null;
      const cards = g.vocabProvider.getAllCards();
      const eligible = g.vocabProvider.getEligibleCards();
      return {
        hasRealRepo: typeof window.allCards === 'function',
        totalCards: cards.length,
        eligibleCount: eligible.length
      };
    });
    expect(vocabStats).not.toBeNull();
    expect(vocabStats.hasRealRepo).toBe(true);
    expect(vocabStats.totalCards).toBeGreaterThan(100);
    expect(vocabStats.eligibleCount).toBeGreaterThan(50);

    // Step 5: Start gameplay
    const btnStart = page.locator('#btn-start');
    await btnStart.click();

    // Verify game starts playing
    await page.waitForFunction(() => window.wortregenGame && window.wortregenGame.state === 'PLAYING');
    await expect(startScreen).toBeHidden();

    // Wait for target word card to spawn
    await page.waitForSelector('#falling-area .card-target', { timeout: 5000 });
    const targetCard = page.locator('#falling-area .card-target');
    await expect(targetCard).toBeVisible();

    // Verify strict FIFO: only 1 target card and at most 1 waiting card
    const targetCount = await page.locator('#falling-area .card-target').count();
    expect(targetCount).toBe(1);

    // Verify first-letter hint is displayed on target card
    const firstLetterHint = page.locator('#falling-area .card-target .char-slot.first-char-hint');
    await expect(firstLetterHint.first()).toBeVisible();

    // Step 6: Type answer directly on card
    const targetLetters = await page.evaluate(() => {
      const g = window.wortregenGame;
      const target = g.getTargetWord();
      return target ? target.letters.map(l => l.char) : [];
    });
    expect(targetLetters.length).toBeGreaterThan(0);

    // Type the first character
    await page.keyboard.press(targetLetters[0]);
    await page.waitForTimeout(150);

    // Verify typed count advanced
    const typedCount = await page.evaluate(() => {
      const target = window.wortregenGame.getTargetWord();
      return target ? target.typedCount : 0;
    });
    expect(typedCount).toBe(1);

    // Type the rest of the target word to complete it
    for (let i = 1; i < targetLetters.length; i++) {
      await page.keyboard.press(targetLetters[i]);
      await page.waitForTimeout(60);
    }

    // Verify score increases upon completing target
    await page.waitForFunction(() => window.wortregenGame && window.wortregenGame.score > 0, { timeout: 4000 });
    const scoreVal = await page.locator('#hud-score-val').textContent();
    expect(parseInt(scoreVal, 10)).toBeGreaterThan(0);

    // Step 7: Click "← Quay lại Học từ"
    await backBtn.click();

    // Verify Wortregen section is hidden and flashMode is visible
    await expect(wortregenSection).toBeHidden();
    await expect(page.locator('#flashMode')).toBeVisible();

    // Verify Flashcard pill is active again
    await expect(page.locator('.study-mode-pill[data-studymode="flash"]')).toHaveClass(/active/);
    await expect(wortregenPill).not.toHaveClass(/active/);

    // Verify Wortregen game was cleanly stopped and reset to IDLE
    const gameState = await page.evaluate(() => {
      const g = window.wortregenGame;
      return {
        state: g ? g.state : null,
        activeWordsCount: g ? g.activeWords.length : 0,
        animFrameId: g ? g.animFrameId : null,
        spawnTimer: g ? g.spawnTimer : null
      };
    });
    expect(gameState.state).toBe('IDLE');
    expect(gameState.activeWordsCount).toBe(0);
    expect(gameState.animFrameId).toBeNull();
    expect(gameState.spawnTimer).toBeNull();
  });

  test('Re-entering Wortregen after return to study works cleanly without duplicate listeners or state corruption', async ({ page }) => {
    // Navigate to Study -> Wortregen
    await page.locator('.nav-hub-btn[data-nav="study"]').click();
    await page.locator('.study-mode-pill[data-studymode="wortregen"]').click();

    // Click Start -> game plays
    await page.locator('#btn-start').click();
    await page.waitForFunction(() => window.wortregenGame && window.wortregenGame.state === 'PLAYING');

    // Click "← Quay lại Học từ"
    await page.locator('#btn-back-to-study').click();
    await expect(page.locator('#wortregenMode')).toBeHidden();

    // Re-enter Wortregen
    await page.locator('.study-mode-pill[data-studymode="wortregen"]').click();
    await expect(page.locator('#wortregenMode')).toBeVisible();

    // Verify Start Screen is clean and ready
    const startScreen = page.locator('#start-screen');
    await expect(startScreen).toBeVisible();
    await expect(page.locator('#game-over-screen')).toBeHidden();

    // Click Start again -> plays fresh game with 3 lives and 0 score
    await page.locator('#btn-start').click();
    await page.waitForFunction(() => window.wortregenGame && window.wortregenGame.state === 'PLAYING');

    const freshLives = await page.evaluate(() => window.wortregenGame.lives);
    const freshScore = await page.evaluate(() => window.wortregenGame.score);
    expect(freshLives).toBe(3);
    expect(freshScore).toBe(0);

    // Exit cleanly back to study
    await page.locator('#btn-back-to-study').click();
    await expect(page.locator('#wortregenMode')).toBeHidden();
    await expect(page.locator('#flashMode')).toBeVisible();
  });

  test('Game Over screen has secondary "← Quay lại Học từ" button that cleans up and returns to study', async ({ page }) => {
    // Navigate to Study -> Wortregen
    await page.locator('.nav-hub-btn[data-nav="study"]').click();
    await page.locator('.study-mode-pill[data-studymode="wortregen"]').click();
    await page.locator('#btn-start').click();
    await page.waitForFunction(() => window.wortregenGame && window.wortregenGame.state === 'PLAYING');

    // Trigger game over
    await page.evaluate(() => {
      window.wortregenGame.lives = 0;
      window.wortregenGame.gameOver();
    });

    const gameOverScreen = page.locator('#game-over-screen');
    await expect(gameOverScreen).toBeVisible();

    // Check secondary back button exists on game over screen
    const gameOverBackBtn = page.locator('#btn-gameover-back');
    await expect(gameOverBackBtn).toBeVisible();
    await expect(gameOverBackBtn).toContainText('Quay lại Học từ');

    // Click back to study
    await gameOverBackBtn.click();

    // Verify returned to Study hub and game state is reset
    await expect(page.locator('#wortregenMode')).toBeHidden();
    await expect(page.locator('#flashMode')).toBeVisible();
    const state = await page.evaluate(() => window.wortregenGame.state);
    expect(state).toBe('IDLE');
  });

  test('Visual Verification: Capture screenshots of in-app Wortregen integration', async ({ page }) => {
    // 1. In Học từ with study pills visible
    await page.locator('.nav-hub-btn[data-nav="study"]').click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshot_wortregen_in_study_pills.png', fullPage: false });

    // 2. Click Wortregen pill -> Start screen
    await page.locator('.study-mode-pill[data-studymode="wortregen"]').click();
    await expect(page.locator('#wortregenMode')).toBeVisible();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshot_wortregen_in_study_start.png', fullPage: false });

    // 3. Start game -> Playing screen with falling word
    await page.locator('#btn-start').click();
    await page.waitForSelector('#falling-area .card-target', { timeout: 5000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'screenshot_wortregen_in_study_playing.png', fullPage: false });

    // 4. Click ← Quay lại Học từ -> Return to Study
    await page.locator('#btn-back-to-study').click();
    await expect(page.locator('#wortregenMode')).toBeHidden();
    await expect(page.locator('#flashMode')).toBeVisible();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'screenshot_wortregen_in_study_returned.png', fullPage: false });
  });

});
