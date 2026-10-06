const { test, expect } = require('@playwright/test');

test.describe('Wortregen V0.1 Gameplay Prototype', () => {

  test('full gameplay loop, answer checking, collision, lives, gameover, and replay', async ({ page }) => {
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
    await expect(page.locator('#start-screen .overlay-instruction')).toContainText('Gõ từ tiếng Đức trước khi từ rơi xuống!');
    await expect(page.locator('#btn-start')).toBeVisible();

    // Check Initial HUD
    await expect(page.locator('#hud-score-val')).toHaveText('0');
    await expect(page.locator('#hud-combo')).toHaveText('Combo x0');
    const hearts = page.locator('#hud-lives .hud-heart');
    await expect(hearts).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await expect(hearts.nth(i)).toHaveText('❤️');
    }

    // 1b. Screenshot Start Screen
    await page.screenshot({ path: 'screenshot_wortregen_start.png', fullPage: false });

    // 2. Click "Bắt đầu"
    await page.waitForFunction(() => window.wortregenGame !== undefined);
    await page.click('#btn-start');
    await expect(page.locator('#start-screen')).toBeHidden();

    // Verify input is auto-focused
    await expect(page.locator('#word-input')).toBeFocused();

    // 3. Wait for the first word to spawn
    const wordCard = page.locator('.word-card').first();
    await wordCard.waitFor({ state: 'visible', timeout: 5000 });

    // 4. Inspect active word object from window.wortregenGame
    const firstWordInfo = await page.evaluate(() => {
      const g = window.wortregenGame;
      if (g && g.activeWords && g.activeWords.length > 0) {
        return {
          id: g.activeWords[0].id,
          vi: g.activeWords[0].vi,
          de: g.activeWords[0].de,
          y: g.activeWords[0].y,
          speed: g.activeWords[0].speed
        };
      }
      return null;
    });

    expect(firstWordInfo).not.toBeNull();
    expect(firstWordInfo.de).toBeTruthy();
    expect(firstWordInfo.vi).toBeTruthy();

    // 5. Test Incorrect Answer: Type something wrong and submit
    await page.fill('#word-input', 'sai-hoan-toan-xyz');
    await page.keyboard.press('Enter');

    // Input should shake, combo should be 0, word should still exist
    await expect(page.locator('#hud-combo')).toHaveText('Combo x0');
    await expect(page.locator('#hud-score-val')).toHaveText('0');
    await expect(page.locator('#word-input')).toHaveValue('');
    await expect(page.locator('#word-input')).toBeFocused();

    // Ensure the word did NOT disappear
    const wordStillThere = await page.evaluate((id) => {
      return window.wortregenGame.activeWords.some(w => w.id === id && !w.isDying);
    }, firstWordInfo.id);
    expect(wordStillThere).toBe(true);

    // 6. Test Correct Answer: Type correct German answer (case-insensitive test)
    // E.g., if target is "die Entscheidung", typing "Die Entscheidung" should work!
    const targetGerman = firstWordInfo.de;
    await page.fill('#word-input', targetGerman.toUpperCase());
    await page.keyboard.press('Enter');

    // Score should become 100, combo should be x1
    await expect(page.locator('#hud-score-val')).toHaveText('100');
    await expect(page.locator('#hud-combo')).toHaveText('Combo x1');
    await expect(page.locator('#word-input')).toHaveValue('');
    await expect(page.locator('#word-input')).toBeFocused();

    // 7. Test Combo Progression: wait for next word and solve correctly
    await page.waitForFunction(() => {
      return window.wortregenGame.activeWords.some(w => !w.isDying);
    }, { timeout: 6000 });

    const secondWordInfo = await page.evaluate(() => {
      const w = window.wortregenGame.activeWords.find(w => !w.isDying);
      return w ? { id: w.id, de: w.de } : null;
    });

    if (secondWordInfo) {
      await page.fill('#word-input', secondWordInfo.de.toLowerCase());
      await page.keyboard.press('Enter');
      await expect(page.locator('#hud-score-val')).toHaveText('200');
      await expect(page.locator('#hud-combo')).toHaveText('Combo x2');
    }

    // 8. Test Ground Collision & 3 Natural Life Losses (NO gameOver() mocking!):
    // Miss 1: Word 1 touches ground -> lives = 2, missedCount = 1
    await page.waitForFunction(() => {
      return window.wortregenGame && window.wortregenGame.activeWords.some(w => !w.isDying);
    }, { timeout: 6000 });

    await page.evaluate(() => {
      const g = window.wortregenGame;
      const w = g.activeWords.find(item => !item.isDying);
      if (w) w.y = g.fallingArea.clientHeight - w.height + 10;
    });

    await page.waitForFunction(() => {
      const g = window.wortregenGame;
      return g && g.lives === 2 && g.missedCount === 1;
    }, { timeout: 3000 });

    await expect(page.locator('#hud-combo')).toHaveText('Combo x0');
    expect(await page.locator('#hud-lives .hud-heart.lost').count()).toBe(1);

    // Miss 2: Word 2 touches ground -> lives = 1, missedCount = 2
    await page.evaluate(() => {
      const g = window.wortregenGame;
      if (!g.activeWords.some(w => !w.isDying)) {
        g.maybeSpawnWord();
      }
    });

    await page.waitForFunction(() => {
      return window.wortregenGame && window.wortregenGame.activeWords.some(w => !w.isDying);
    }, { timeout: 6000 });

    await page.evaluate(() => {
      const g = window.wortregenGame;
      const w = g.activeWords.find(item => !item.isDying);
      if (w) w.y = g.fallingArea.clientHeight - w.height + 10;
    });

    await page.waitForFunction(() => {
      const g = window.wortregenGame;
      return g && g.lives === 1 && g.missedCount === 2;
    }, { timeout: 3000 });

    expect(await page.locator('#hud-lives .hud-heart.lost').count()).toBe(2);

    // Miss 3: Word 3 touches ground -> lives = 0, missedCount = 3 -> Game Over triggers naturally
    await page.evaluate(() => {
      const g = window.wortregenGame;
      if (!g.activeWords.some(w => !w.isDying)) {
        g.maybeSpawnWord();
      }
    });

    await page.waitForFunction(() => {
      return window.wortregenGame && window.wortregenGame.activeWords.some(w => !w.isDying);
    }, { timeout: 6000 });

    await page.evaluate(() => {
      const g = window.wortregenGame;
      const w = g.activeWords.find(item => !item.isDying);
      if (w) w.y = g.fallingArea.clientHeight - w.height + 10;
    });

    // Wait for game engine to transition to GAME_OVER naturally via gameLoop
    await page.waitForFunction(() => {
      const g = window.wortregenGame;
      return g && g.lives === 0 && g.missedCount === 3 && g.state === 'GAME_OVER';
    }, { timeout: 4000 });

    // Verify all 3 hearts are lost in UI
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

    // 10. Test Replay button
    await page.click('#btn-replay');
    await expect(page.locator('#game-over-screen')).toBeHidden();

    // Reset state verification
    await expect(page.locator('#hud-score-val')).toHaveText('0');
    await expect(page.locator('#hud-combo')).toHaveText('Combo x0');
    const resetLives = await page.evaluate(() => window.wortregenGame.lives);
    expect(resetLives).toBe(3);
    await expect(page.locator('#word-input')).toBeFocused();

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
    await page.waitForTimeout(2200); // let words spawn and fall
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
    await page.waitForTimeout(2200);
    await expect(page.locator('.game-board')).toBeVisible();
    await expect(page.locator('#word-input')).toBeVisible();
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
      while (g.activeWords.filter(w => !w.isDying).length < 2) {
        g.maybeSpawnWord();
      }
    });

    // Ensure 2 active words are present
    await page.waitForFunction(() => {
      const g = window.wortregenGame;
      return g && g.activeWords.filter(w => !w.isDying).length >= 2;
    });

    // Position BOTH words simultaneously at/below ground limit in same frame
    await page.evaluate(() => {
      const g = window.wortregenGame;
      const words = g.activeWords.filter(w => !w.isDying);
      words[0].y = g.fallingArea.clientHeight;
      words[1].y = g.fallingArea.clientHeight;
    });

    // Wait for the animation frame loop to process the collision
    await page.waitForFunction(() => {
      const g = window.wortregenGame;
      return g && g.state === 'GAME_OVER';
    }, { timeout: 4000 });

    // Verify strict invariants:
    // 1. lives must be exactly 0 (NEVER -1 or negative)
    const finalLives = await page.evaluate(() => window.wortregenGame.lives);
    expect(finalLives).toBe(0);

    // 2. missedCount must be exactly 3 (incremented once by the game-ending word, second word stopped)
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

});
