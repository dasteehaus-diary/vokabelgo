const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('Wortregen V0.1 Gameplay Prototype', () => {

  test('full gameplay fidelity loop: direct on-card typing, slots, auto-space, backspace, error shake, no enter, and ground reveal', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/wortregen.html');

    // 1. Initial Start Screen verification
    await expect(page.locator('#start-screen')).toBeVisible();
    await expect(page.locator('#start-screen .overlay-title')).toHaveText('Wortregen');
    await expect(page.locator('#start-screen .overlay-instruction')).toContainText('Gõ trực tiếp các chữ cái vào thẻ trước khi chạm đất!');
    await expect(page.locator('#btn-start')).toBeVisible();

    // Verify input dock and submit button are completely removed
    await expect(page.locator('#input-dock')).toHaveCount(0);
    await expect(page.locator('#word-input')).toHaveCount(0);
    await expect(page.locator('#btn-submit')).toHaveCount(0);

    // Check Initial HUD
    await expect(page.locator('#hud-score-val')).toHaveText('0');
    await expect(page.locator('#hud-combo')).toHaveText('Combo x0');
    const hearts = page.locator('#hud-lives .hud-heart');
    await expect(hearts).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await expect(hearts.nth(i)).toHaveText('❤️');
    }

    // Screenshot Start Screen
    await page.screenshot({ path: 'screenshot_wortregen_start.png', fullPage: false });

    // 2. Click "Bắt đầu"
    await page.waitForFunction(() => window.wortregenGame !== undefined);
    await page.click('#btn-start');
    await expect(page.locator('#start-screen')).toBeHidden();

    // 3. Wait for the first word to spawn
    const wordCard = page.locator('.word-card').first();
    await wordCard.waitFor({ state: 'visible', timeout: 5000 });

    // 4. Inspect active word object and slot rendering
    const firstWordInfo = await page.evaluate(() => {
      const g = window.wortregenGame;
      if (g && g.activeWords && g.activeWords.length > 0) {
        const w = g.activeWords[0];
        return {
          id: w.id,
          vi: w.vi,
          de: w.de,
          letterCount: w.letters.length,
          letters: w.letters.map(l => l.char)
        };
      }
      return null;
    });

    expect(firstWordInfo).not.toBeNull();
    const cleanLetters = firstWordInfo.de.replace(/\s+/g, '');
    expect(firstWordInfo.letterCount).toBe(cleanLetters.length);

    // Verify slot elements in DOM
    const cardSlots = wordCard.locator('.char-slot');
    await expect(cardSlots).toHaveCount(cleanLetters.length);
    for (let i = 0; i < cleanLetters.length; i++) {
      await expect(cardSlots.nth(i)).toHaveText('_');
    }

    // 5. Test Direct Typing & Target Locking:
    // Type first character directly via keyboard
    const firstChar = cleanLetters[0];
    await page.keyboard.type(firstChar);

    // Word should become locked target with .card-focused
    await expect(wordCard).toHaveClass(/card-focused/);
    // Slot 0 should be filled with firstChar and have class .typed
    await expect(cardSlots.nth(0)).toHaveClass(/typed/);
    await expect(cardSlots.nth(0)).toHaveText(firstChar);

    // 6. Test Mistake Feedback on locked card:
    // Type an incorrect character
    const wrongChar = firstChar.toLowerCase() === 'z' ? 'x' : 'z';
    await page.keyboard.type(wrongChar);

    // Card inner should shake, lives should NOT be lost, combo should NOT decrease
    const inner = wordCard.locator('.word-card-inner');
    await expect(inner).toHaveClass(/shake-error/);
    const currentLives = await page.evaluate(() => window.wortregenGame.lives);
    expect(currentLives).toBe(3);

    // 7. Test Backspace:
    // Press backspace to erase slot 0
    await page.keyboard.press('Backspace');
    await expect(cardSlots.nth(0)).toHaveText('_');
    await expect(cardSlots.nth(0)).not.toHaveClass(/typed/);
    // Card should now be unlocked since typedCount === 0
    await expect(wordCard).not.toHaveClass(/card-focused/);

    // 8. Test Auto-Space Skip and Immediate Pop without Enter:
    // Type all letters of the word directly without typing any spaces!
    for (const char of cleanLetters) {
      await page.keyboard.type(char);
      await page.waitForTimeout(40);
    }

    // Word must POP immediately, score becomes 100, combo becomes x1
    await expect(page.locator('#hud-score-val')).toHaveText('100');
    await expect(page.locator('#hud-combo')).toHaveText('Combo x1');

    // 9. Test Combo Progression: wait for next active word and solve it
    await page.waitForFunction(() => {
      return window.wortregenGame.activeWords.some(w => !w.isDying && !w.isGrounded);
    }, { timeout: 6000 });

    const secondWordClean = await page.evaluate(() => {
      const w = window.wortregenGame.activeWords.find(w => !w.isDying && !w.isGrounded);
      return w ? w.de.replace(/\s+/g, '') : null;
    });

    if (secondWordClean) {
      for (const char of secondWordClean) {
        await page.keyboard.type(char);
        await page.waitForTimeout(30);
      }
      await expect(page.locator('#hud-score-val')).toHaveText('200');
      await expect(page.locator('#hud-combo')).toHaveText('Combo x2');
    }

    // 10. Test Ground Collision with 1.2s Full German Answer Reveal:
    // Wait for an active falling word
    await page.waitForFunction(() => {
      return window.wortregenGame && window.wortregenGame.activeWords.some(w => !w.isDying && !w.isGrounded);
    }, { timeout: 6000 });

    // Miss 1: Move word to ground
    const miss1WordInfo = await page.evaluate(() => {
      const g = window.wortregenGame;
      const w = g.activeWords.find(item => !item.isDying && !item.isGrounded);
      if (w) {
        w.y = g.fallingArea.clientHeight - w.height + 10;
        return { id: w.id, de: w.de };
      }
      return null;
    });

    // Check lives becomes 2 immediately
    await page.waitForFunction(() => {
      const g = window.wortregenGame;
      return g && g.lives === 2 && g.missedCount === 1;
    }, { timeout: 3000 });

    // Verify card enters ground reveal mode showing full German text
    const groundedCard1 = page.locator(`#word-${miss1WordInfo.id}`);
    await expect(groundedCard1).toHaveClass(/word-grounded-reveal/);
    await expect(groundedCard1.locator('.word-card-reveal-de')).toHaveText(miss1WordInfo.de);
    await page.screenshot({ path: 'screenshot_wortregen_ground_reveal.png', fullPage: false });

    // Wait for the 1.2s reveal duration to elapse and card to be removed
    await page.waitForTimeout(1400);

    // Miss 2: Second word touches ground -> lives = 1, missedCount = 2
    await page.evaluate(() => {
      const g = window.wortregenGame;
      if (!g.activeWords.some(w => !w.isDying && !w.isGrounded)) {
        g.maybeSpawnWord();
      }
    });

    await page.waitForFunction(() => {
      return window.wortregenGame && window.wortregenGame.activeWords.some(w => !w.isDying && !w.isGrounded);
    }, { timeout: 6000 });

    await page.evaluate(() => {
      const g = window.wortregenGame;
      const w = g.activeWords.find(item => !item.isDying && !item.isGrounded);
      if (w) w.y = g.fallingArea.clientHeight - w.height + 10;
    });

    await page.waitForFunction(() => {
      const g = window.wortregenGame;
      return g && g.lives === 1 && g.missedCount === 2;
    }, { timeout: 3000 });

    await page.waitForTimeout(1400);

    // Miss 3 (FATAL): Third word touches ground -> lives = 0, reveals answer, then triggers Game Over
    await page.evaluate(() => {
      const g = window.wortregenGame;
      if (!g.activeWords.some(w => !w.isDying && !w.isGrounded)) {
        g.maybeSpawnWord();
      }
    });

    await page.waitForFunction(() => {
      return window.wortregenGame && window.wortregenGame.activeWords.some(w => !w.isDying && !w.isGrounded);
    }, { timeout: 6000 });

    const fatalWordInfo = await page.evaluate(() => {
      const g = window.wortregenGame;
      const w = g.activeWords.find(item => !item.isDying && !item.isGrounded);
      if (w) {
        w.y = g.fallingArea.clientHeight - w.height + 10;
        return { id: w.id, de: w.de };
      }
      return null;
    });

    // Lives is 0 immediately upon contact
    await page.waitForFunction(() => {
      const g = window.wortregenGame;
      return g && g.lives === 0 && g.missedCount === 3;
    }, { timeout: 3000 });

    // Fatal card displays reveal
    const fatalCard = page.locator(`#word-${fatalWordInfo.id}`);
    await expect(fatalCard).toHaveClass(/word-grounded-reveal/);
    await expect(fatalCard.locator('.word-card-reveal-de')).toHaveText(fatalWordInfo.de);

    // Wait for the 1.2s reveal to complete and transition to GAME_OVER
    await page.waitForFunction(() => {
      const g = window.wortregenGame;
      return g && g.state === 'GAME_OVER';
    }, { timeout: 4000 });

    // Verify all 3 hearts lost in UI
    expect(await page.locator('#hud-lives .hud-heart.lost').count()).toBe(3);
    const heartTexts = await page.locator('#hud-lives .hud-heart').allInnerTexts();
    expect(heartTexts).toEqual(['🤍', '🤍', '🤍']);

    // Verify Game Over screen
    await expect(page.locator('#game-over-screen')).toBeVisible();
    await expect(page.locator('#game-over-screen .overlay-title')).toHaveText('Wortregen beendet!');
    await expect(page.locator('#summary-missed')).toHaveText('3');
    await expect(page.locator('#summary-score')).not.toHaveText('0');
    await expect(page.locator('#btn-replay')).toBeVisible();

    // Screenshot Game Over Screen
    await page.screenshot({ path: 'screenshot_wortregen_gameover.png', fullPage: false });

    // 11. Test Replay button
    await page.click('#btn-replay');
    await expect(page.locator('#game-over-screen')).toBeHidden();

    // Reset state verification
    await expect(page.locator('#hud-score-val')).toHaveText('0');
    await expect(page.locator('#hud-combo')).toHaveText('Combo x0');
    const resetLives = await page.evaluate(() => window.wortregenGame.lives);
    expect(resetLives).toBe(3);

    // Check no console errors
    expect(consoleErrors).toEqual([]);
  });

  test('responsive viewport test and screenshots', async ({ page }) => {
    // Desktop Viewport (1440 x 900)
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/wortregen.html');
    await page.waitForFunction(() => window.wortregenGame !== undefined);
    await page.click('#btn-start');
    await page.waitForSelector('.word-card');
    await page.waitForTimeout(2000); // let words spawn and fall
    await page.screenshot({ path: 'screenshot_wortregen_desktop.png', fullPage: false });

    // Laptop Viewport (1024 x 768)
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(400);
    await expect(page.locator('.game-board')).toBeVisible();

    // Mobile Viewport (390 x 844 - iPhone 12/13/14)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/wortregen.html');
    await page.waitForFunction(() => window.wortregenGame !== undefined);

    // Verify no horizontal overflow in header on 390px
    const isHeaderWithinBounds = await page.locator('.wortregen-header').evaluate(el => el.scrollWidth <= el.clientWidth + 1);
    expect(isHeaderWithinBounds).toBe(true);

    await page.click('#btn-start');
    await page.waitForSelector('.word-card');
    await page.waitForTimeout(2000);
    await expect(page.locator('.game-board')).toBeVisible();
    await page.screenshot({ path: 'screenshot_wortregen_mobile.png', fullPage: false });
  });

  test('regression: 2 words touching ground simultaneously when lives === 1 yields lives === 0 and clean single game over', async ({ page }) => {
    await page.goto('/wortregen.html');
    await page.waitForFunction(() => window.wortregenGame !== undefined);
    await page.click('#btn-start');
    await expect(page.locator('#start-screen')).toBeHidden();

    // Setup state: 1 life remaining, 2 active words spawned
    await page.evaluate(() => {
      const g = window.wortregenGame;
      g.lives = 1;
      g.missedCount = 2; // already lost 2 lives prior
      while (g.activeWords.filter(w => !w.isDying && !w.isGrounded).length < 2) {
        g.maybeSpawnWord();
      }
    });

    await page.waitForFunction(() => {
      const g = window.wortregenGame;
      return g && g.activeWords.filter(w => !w.isDying && !w.isGrounded).length >= 2;
    });

    // Position BOTH words simultaneously at/below ground limit in same frame
    await page.evaluate(() => {
      const g = window.wortregenGame;
      const words = g.activeWords.filter(w => !w.isDying && !w.isGrounded);
      words[0].y = g.fallingArea.clientHeight;
      words[1].y = g.fallingArea.clientHeight;
    });

    // Wait for the ground reveal (1.2s) and transition to GAME_OVER
    await page.waitForFunction(() => {
      const g = window.wortregenGame;
      return g && g.state === 'GAME_OVER';
    }, { timeout: 4000 });

    // Verify strict invariants:
    // 1. lives must be exactly 0 (NEVER -1 or negative)
    const finalLives = await page.evaluate(() => window.wortregenGame.lives);
    expect(finalLives).toBe(0);

    // 2. missedCount must be exactly 3 (first fatal miss counted, second halted)
    const finalMissed = await page.evaluate(() => window.wortregenGame.missedCount);
    expect(finalMissed).toBe(3);

    // 3. UI shows exactly 3 lost hearts
    expect(await page.locator('#hud-lives .hud-heart.lost').count()).toBe(3);
    const heartTexts = await page.locator('#hud-lives .hud-heart').allInnerTexts();
    expect(heartTexts).toEqual(['🤍', '🤍', '🤍']);

    // 4. Game Over screen visible with correct stats
    await expect(page.locator('#game-over-screen')).toBeVisible();
    await expect(page.locator('#summary-missed')).toHaveText('3');
  });

  test('record 15-20s authentic gameplay video demonstrating direct on-card typing and tempo', async ({ browser }) => {
    const videoDir = path.resolve(__dirname, '../artifacts_video');
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }

    const context = await browser.newContext({
      recordVideo: {
        dir: videoDir,
        size: { width: 520, height: 780 }
      },
      viewport: { width: 520, height: 780 }
    });

    const page = await context.newPage();
    await page.goto('/wortregen.html');
    await page.waitForFunction(() => window.wortregenGame !== undefined);

    // Start game
    await page.click('#btn-start');
    await expect(page.locator('#start-screen')).toBeHidden();

    // Play continuously for ~16 seconds
    const startTime = Date.now();
    while (Date.now() - startTime < 16000) {
      // Find active falling card to type
      const target = await page.evaluate(() => {
        const g = window.wortregenGame;
        if (!g || g.state !== 'PLAYING') return null;
        const w = g.activeWords.find(item => !item.isDying && !item.isGrounded);
        return w ? { id: w.id, clean: w.de.replace(/\s+/g, '') } : null;
      });

      if (target) {
        // Type characters smoothly with natural cadence
        for (const char of target.clean) {
          await page.keyboard.type(char);
          await page.waitForTimeout(70 + Math.random() * 40);
        }
        await page.waitForTimeout(400);
      } else {
        await page.waitForTimeout(200);
      }
    }

    // Capture in-action screenshot of typing directly on card
    await page.screenshot({ path: 'screenshot_wortregen_typing.png', fullPage: false });

    // Close page and context to finish video encoding
    await page.close();
    await context.close();

    // Locate the generated video and rename to gameplay_wortregen.webm
    const files = fs.readdirSync(videoDir).filter(f => f.endsWith('.webm'));
    if (files.length > 0) {
      const generatedVideoPath = path.join(videoDir, files[files.length - 1]);
      const targetVideoPath = path.resolve(__dirname, '../gameplay_wortregen.webm');
      fs.copyFileSync(generatedVideoPath, targetVideoPath);
    }
  });

});
