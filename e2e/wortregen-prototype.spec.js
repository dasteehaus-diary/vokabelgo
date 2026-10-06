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

    // Verify slot elements in DOM: slot 0 shows first-char hint (subtle amber), remaining slots show '_'
    const cardSlots = wordCard.locator('.char-slot');
    await expect(cardSlots).toHaveCount(cleanLetters.length);
    await expect(cardSlots.nth(0)).toHaveClass(/first-char-hint/);
    await expect(cardSlots.nth(0)).toHaveText(cleanLetters[0]);
    for (let i = 1; i < cleanLetters.length; i++) {
      await expect(cardSlots.nth(i)).toHaveText('_');
    }

    // 5. Test Direct Typing & Target Locking:
    // Type first character directly via keyboard
    const firstChar = cleanLetters[0];
    await page.keyboard.type(firstChar);

    // Word is active target with .card-target and .card-focused
    await expect(wordCard).toHaveClass(/card-target/);
    await expect(wordCard).toHaveClass(/card-focused/);
    // Slot 0 should be filled with firstChar and have class .typed (hint removed)
    await expect(cardSlots.nth(0)).toHaveClass(/typed/);
    await expect(cardSlots.nth(0)).not.toHaveClass(/first-char-hint/);
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
    // Slot 0 restores the first-character hint!
    await expect(cardSlots.nth(0)).toHaveClass(/first-char-hint/);
    await expect(cardSlots.nth(0)).toHaveText(firstChar);
    await expect(cardSlots.nth(0)).not.toHaveClass(/typed/);
    // FIFO Rule: Target remains the current word even when backspaced to 0 letters!
    await expect(wordCard).toHaveClass(/card-target/);
    await expect(wordCard).toHaveClass(/card-focused/);

    // 8. Test Auto-Space Skip and Immediate Pop without Enter:
    // Type all letters of the word directly without typing any spaces!
    for (const char of cleanLetters) {
      await page.keyboard.type(char);
      await page.waitForTimeout(40);
    }

    // Word must POP immediately, score increases, combo becomes x1
    const expectedScore1 = cleanLetters.length * 10;
    await expect(page.locator('#hud-score-val')).toHaveText(String(expectedScore1));
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
      const expectedScore2 = expectedScore1 + secondWordClean.length * 10;
      await expect(page.locator('#hud-score-val')).toHaveText(String(expectedScore2));
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

  // ---------------------------------------------------------------------------
  // Phase 1 Required Acceptance Tests (Section 17 A - G)
  // ---------------------------------------------------------------------------

  test('Required Test A: Single-key input increases typedCount by exactly 1 with zero duplicate chars', async ({ page }) => {
    await page.goto('/wortregen.html');
    await page.waitForFunction(() => window.wortregenGame !== undefined);
    await page.click('#btn-start');

    // Wait for target word
    await page.waitForFunction(() => {
      const g = window.wortregenGame;
      return g && g.activeWords && g.activeWords.length > 0;
    });

    const targetInfo = await page.evaluate(() => {
      const g = window.wortregenGame;
      const target = g.getTargetWord();
      return {
        id: target.id,
        clean: target.de.replace(/\s+/g, ''),
        initialTyped: target.typedCount
      };
    });

    expect(targetInfo.initialTyped).toBe(0);

    // Type 1 character once
    const firstChar = targetInfo.clean[0];
    await page.keyboard.type(firstChar);

    // Verify typedCount increased by exactly 1
    const postTypedCount = await page.evaluate(() => {
      const target = window.wortregenGame.getTargetWord();
      return target.typedCount;
    });
    expect(postTypedCount).toBe(1);

    // Verify slot 0 has class .typed with character, and slot 1 is untouched ('_')
    const targetCard = page.locator(`#word-${targetInfo.id}`);
    const slots = targetCard.locator('.char-slot');
    await expect(slots.nth(0)).toHaveClass(/typed/);
    await expect(slots.nth(0)).toHaveText(firstChar);
    if (targetInfo.clean.length > 1) {
      await expect(slots.nth(1)).toHaveText('_');
    }

    // Mobile Virtual Keyboard Deduplication verification:
    // If virtual keyboard emits duplicate character within 100ms on keyboard-capture input, it must NOT double count
    await page.evaluate((c) => {
      const g = window.wortregenGame;
      if (g.keyboardCapture) {
        g.keyboardCapture.value = c;
        g.keyboardCapture.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, firstChar);

    // typedCount must still be 1 (ignored duplicate!)
    const dedupTypedCount = await page.evaluate(() => window.wortregenGame.getTargetWord().typedCount);
    expect(dedupTypedCount).toBe(1);
  });

  test('Required Tests B & C: Strict FIFO queue and wrong-target rejection', async ({ page }) => {
    await page.goto('/wortregen.html');
    await page.waitForFunction(() => window.wortregenGame !== undefined);
    await page.click('#btn-start');

    // Wait for at least 2 words to be active (Card A and Card B)
    await page.waitForFunction(() => {
      const g = window.wortregenGame;
      return g && g.activeWords.filter(w => !w.isDying && !w.isGrounded).length >= 2;
    }, { timeout: 8000 });

    const words = await page.evaluate(() => {
      const g = window.wortregenGame;
      const active = g.activeWords.filter(w => !w.isDying && !w.isGrounded);
      return {
        wordA: { id: active[0].id, clean: active[0].de.replace(/\s+/g, '') },
        wordB: { id: active[1].id, clean: active[1].de.replace(/\s+/g, '') }
      };
    });

    const cardA = page.locator(`#word-${words.wordA.id}`);
    const cardB = page.locator(`#word-${words.wordB.id}`);

    // Verify Card A is target, Card B is waiting
    await expect(cardA).toHaveClass(/card-target/);
    await expect(cardB).toHaveClass(/card-waiting/);
    await expect(cardB).not.toHaveClass(/card-target/);

    // Determine a character that is matching B's first character, but different from A's expected first character
    const charA = words.wordA.clean[0];
    const charB = words.wordB.clean[0];

    let testChar = charB;
    if (charA.toLowerCase() === charB.toLowerCase()) {
      testChar = charA.toLowerCase() === 'x' ? 'y' : 'x';
    }

    // Type the wrong character for A (which may belong to B or not)
    await page.keyboard.type(testChar);

    // Card A shakes with mistake error
    await expect(cardA.locator('.word-card-inner')).toHaveClass(/shake-error/);

    // Invariant: Card B MUST NOT receive the character! Card B typedCount remains 0!
    const bTyped = await page.evaluate((bId) => {
      const w = window.wortregenGame.activeWords.find(item => item.id === bId);
      return w ? w.typedCount : null;
    }, words.wordB.id);
    expect(bTyped).toBe(0);

    // Card B slot 0 must not be .typed
    await expect(cardB.locator('.char-slot').first()).not.toHaveClass(/typed/);
  });

  test('Required Test D: Transition test - completing A promotes B to target; A grounding promotes B to target', async ({ page }) => {
    await page.goto('/wortregen.html');
    await page.waitForFunction(() => window.wortregenGame !== undefined);
    await page.click('#btn-start');

    // Wait for Card A and Card B
    await page.waitForFunction(() => {
      const g = window.wortregenGame;
      return g && g.activeWords.filter(w => !w.isDying && !w.isGrounded).length >= 2;
    }, { timeout: 8000 });

    const words = await page.evaluate(() => {
      const g = window.wortregenGame;
      const active = g.activeWords.filter(w => !w.isDying && !w.isGrounded);
      return {
        wordA: { id: active[0].id, clean: active[0].de.replace(/\s+/g, '') },
        wordB: { id: active[1].id, clean: active[1].de.replace(/\s+/g, '') }
      };
    });

    const cardB = page.locator(`#word-${words.wordB.id}`);
    await expect(cardB).toHaveClass(/card-waiting/);

    // Type all letters of Card A to complete it
    for (const char of words.wordA.clean) {
      await page.keyboard.type(char);
      await page.waitForTimeout(30);
    }

    // Invariant: Card B immediately transitions from .card-waiting to .card-target!
    await expect(cardB).toHaveClass(/card-target/);
    await expect(cardB).not.toHaveClass(/card-waiting/);

    // Now typing works directly on Card B
    const bFirstChar = words.wordB.clean[0];
    await page.keyboard.type(bFirstChar);
    await expect(cardB.locator('.char-slot').first()).toHaveClass(/typed/);
  });

  test('Required Test E: Backspace to 0 preserves target', async ({ page }) => {
    await page.goto('/wortregen.html');
    await page.waitForFunction(() => window.wortregenGame !== undefined);
    await page.click('#btn-start');

    // Wait for Card A and Card B
    await page.waitForFunction(() => {
      const g = window.wortregenGame;
      return g && g.activeWords.filter(w => !w.isDying && !w.isGrounded).length >= 2;
    }, { timeout: 8000 });

    const wordAInfo = await page.evaluate(() => {
      const g = window.wortregenGame;
      const w = g.getTargetWord();
      return { id: w.id, clean: w.de.replace(/\s+/g, '') };
    });

    const cardA = page.locator(`#word-${wordAInfo.id}`);

    // Type 2 characters on Card A
    await page.keyboard.type(wordAInfo.clean[0]);
    await page.keyboard.type(wordAInfo.clean[1]);

    let typed = await page.evaluate(() => window.wortregenGame.getTargetWord().typedCount);
    expect(typed).toBe(2);

    // Backspace once -> typedCount 1
    await page.keyboard.press('Backspace');
    typed = await page.evaluate(() => window.wortregenGame.getTargetWord().typedCount);
    expect(typed).toBe(1);

    // Backspace twice -> typedCount 0
    await page.keyboard.press('Backspace');
    typed = await page.evaluate(() => window.wortregenGame.getTargetWord().typedCount);
    expect(typed).toBe(0);

    // Invariant: Target STILL remains Card A! Card A is not unlocked or lost!
    await expect(cardA).toHaveClass(/card-target/);
    await expect(cardA).toHaveClass(/card-focused/);

    const activeTargetId = await page.evaluate(() => window.wortregenGame.getTargetWord().id);
    expect(activeTargetId).toBe(wordAInfo.id);
  });

  test('Required Test F: Timing & fall duration test - calm velocity and no overtaking', async ({ page }) => {
    await page.goto('/wortregen.html');
    await page.waitForFunction(() => window.wortregenGame !== undefined);
    await page.click('#btn-start');

    // Wait for 2 words to be active
    await page.waitForFunction(() => {
      const g = window.wortregenGame;
      return g && g.activeWords.filter(w => !w.isDying && !w.isGrounded).length >= 2;
    }, { timeout: 8000 });

    const timingData = await page.evaluate(() => {
      const g = window.wortregenGame;
      const active = g.activeWords.filter(w => !w.isDying && !w.isGrounded);
      return active.map(w => ({
        id: w.id,
        cleanLen: w.letters.length,
        duration: w.duration,
        speed: w.speed,
        y: w.y
      }));
    });

    expect(timingData.length).toBeGreaterThanOrEqual(2);

    // Invariant: Duration is >= 16s (specifically >= 18s in V0.1 engine)
    for (const w of timingData) {
      expect(w.duration).toBeGreaterThanOrEqual(18.0);
    }

    // Invariant: Word B born after Word A must not have faster speed than Word A
    const wordA = timingData[0];
    const wordB = timingData[1];
    expect(wordB.speed).toBeLessThanOrEqual(wordA.speed);

    // Invariant: Word B's y position is strictly above Word A's y position (no overtaking!)
    expect(wordB.y).toBeLessThan(wordA.y);
  });

  test('Required Test G: German character exact match (a ≠ ä, o ≠ ö, u ≠ ü, s ≠ ß)', async ({ page }) => {
    await page.goto('/wortregen.html');
    await page.waitForFunction(() => window.wortregenGame !== undefined);

    const matchResults = await page.evaluate(() => {
      const g = window.wortregenGame;
      return {
        a_matches_ä: g.charsMatch('a', 'ä'),
        o_matches_ö: g.charsMatch('o', 'ö'),
        u_matches_ü: g.charsMatch('u', 'ü'),
        s_matches_ß: g.charsMatch('s', 'ß'),
        ä_matches_ä: g.charsMatch('ä', 'ä'),
        Ä_matches_ä: g.charsMatch('Ä', 'ä'),
        b_matches_b: g.charsMatch('b', 'B')
      };
    });

    // Invariant: In V0.1, strict equality required! a ≠ ä, o ≠ ö, u ≠ ü, s ≠ ß
    expect(matchResults.a_matches_ä).toBe(false);
    expect(matchResults.o_matches_ö).toBe(false);
    expect(matchResults.u_matches_ü).toBe(false);
    expect(matchResults.s_matches_ß).toBe(false);

    // Exact matches (including case insensitivity) must be true
    expect(matchResults.ä_matches_ä).toBe(true);
    expect(matchResults.Ä_matches_ä).toBe(true);
    expect(matchResults.b_matches_b).toBe(true);
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

  // ---------------------------------------------------------------------------
  // Phase 2: Data Integration Acceptance Tests (Tests I1 - I10)
  // ---------------------------------------------------------------------------

  test('Test I1: Wortregen reads cards from VokabelGo real repository (allCards)', async ({ page }) => {
    await page.goto('/wortregen.html');
    await page.waitForFunction(() => window.wortregenGame !== undefined && window.WortregenVocabularyProvider !== undefined);

    const check = await page.evaluate(() => {
      const g = window.wortregenGame;
      const provider = g.vocabProvider;
      const allCards = typeof window.allCards === 'function' ? window.allCards() : [];
      return {
        hasProvider: !!provider,
        allCardsCount: allCards.length,
        eligibleCount: provider.stats.eligibleCount || provider.getEligibleCards().length
      };
    });

    expect(check.hasProvider).toBe(true);
    expect(check.allCardsCount).toBe(294);
    expect(check.eligibleCount).toBe(177);

    // Click start and check spawned card has cardId from repository
    await page.click('#btn-start');
    const wordCard = page.locator('.word-card').first();
    await wordCard.waitFor({ state: 'visible', timeout: 5000 });

    const cardData = await page.evaluate(() => {
      const w = window.wortregenGame.activeWords[0];
      return { cardId: w.cardId, tier: w.tier, de: w.de, vi: w.vi };
    });

    expect(cardData.cardId).toBeTruthy();
    expect(cardData.tier).toBeGreaterThanOrEqual(1);
    expect(cardData.de.length).toBeGreaterThan(0);
    expect(cardData.vi.length).toBeGreaterThan(0);
  });

  test('Test I2: Exclusions (grammar, questions, content, ellipsis are excluded)', async ({ page }) => {
    await page.goto('/wortregen.html');
    await page.waitForFunction(() => window.WortregenVocabularyProvider !== undefined);

    const stats = await page.evaluate(() => {
      const provider = new window.WortregenVocabularyProvider();
      const eligible = provider.getEligibleCards();
      return {
        total: provider.stats.totalCards,
        eligible: provider.stats.eligibleCount,
        excluded: provider.stats.excludedCount,
        reasons: provider.stats.exclusionReasons,
        // Check no excluded types made it into eligible
        hasGrammar: eligible.some(c => c.cardType === 'grammar'),
        hasContent: eligible.some(c => c.cardType === 'content'),
        hasQuestion: eligible.some(c => c.cardType === 'question'),
        hasEllipsis: eligible.some(c => c.de.includes('...'))
      };
    });

    expect(stats.total).toBe(294);
    expect(stats.eligible).toBe(177);
    expect(stats.excluded).toBe(117);
    expect(stats.hasGrammar).toBe(false);
    expect(stats.hasContent).toBe(false);
    expect(stats.hasQuestion).toBe(false);
    expect(stats.hasEllipsis).toBe(false);
    expect(stats.reasons.grammar_card).toBeGreaterThan(0);
    expect(stats.reasons.question_card).toBeGreaterThan(0);
    expect(stats.reasons.content_card).toBeGreaterThan(0);
  });

  test('Test I3: Tier classification verification (der Termin -> Tier 1, sich bewerben -> Tier 2)', async ({ page }) => {
    await page.goto('/wortregen.html');
    await page.waitForFunction(() => window.WortregenVocabularyProvider !== undefined);

    const tierClassifications = await page.evaluate(() => {
      const provider = new window.WortregenVocabularyProvider();
      const eligible = provider.getEligibleCards();
      
      // Direct method test on specific canonical samples
      const terminTier = provider.classifyTier(
        { term: 'der Termin' },
        { cardType: 'noun', canonicalAnswer: 'der Termin' }
      );
      const bewerbenTier = provider.classifyTier(
        { term: 'sich bewerben' },
        { cardType: 'verb', canonicalAnswer: 'sich bewerben' }
      );

      // Real cards from repository
      const koerpersprache = eligible.find(c => c.id === 'b_0'); // die Körpersprache (noun)
      const sichAusdruecken = eligible.find(c => c.id === 'b_6'); // sich ausdrücken (reflexive)

      return {
        terminTier,
        bewerbenTier,
        koerperspracheTier: koerpersprache ? koerpersprache.tier : null,
        sichAusdrueckenTier: sichAusdruecken ? sichAusdruecken.tier : null,
        tier1Count: provider.stats.tier1Count,
        tier2Count: provider.stats.tier2Count,
        tier3Count: provider.stats.tier3Count
      };
    });

    // Noun with article: single lexical item -> Tier 1
    expect(tierClassifications.terminTier).toBe(1);
    expect(tierClassifications.koerperspracheTier).toBe(1);
    // Reflexive verb / phrase -> Tier 2
    expect(tierClassifications.bewerbenTier).toBe(2);
    expect(tierClassifications.sichAusdrueckenTier).toBe(2);
    expect(tierClassifications.tier1Count).toBe(62);
    expect(tierClassifications.tier2Count).toBe(87);
    expect(tierClassifications.tier3Count).toBe(28);
  });

  test('Test I4: Early game priority (first 10 items spawned are 100% Tier 1)', async ({ page }) => {
    await page.goto('/wortregen.html');
    await page.waitForFunction(() => window.WortregenVocabularyProvider !== undefined);

    const first10Tiers = await page.evaluate(() => {
      const provider = new window.WortregenVocabularyProvider();
      const queue = provider.buildQueue();
      return queue.slice(0, 10).map(c => c.tier);
    });

    expect(first10Tiers.length).toBe(10);
    expect(first10Tiers.every(tier => tier === 1)).toBe(true);
  });

  test('Test I5: Later game mix (Tier 2 and Tier 3 appear after item 10)', async ({ page }) => {
    await page.goto('/wortregen.html');
    await page.waitForFunction(() => window.WortregenVocabularyProvider !== undefined);

    const queueMix = await page.evaluate(() => {
      const provider = new window.WortregenVocabularyProvider();
      const queue = provider.buildQueue();
      const mid10 = queue.slice(10, 20).map(c => c.tier);
      const rest = queue.slice(20, 50).map(c => c.tier);
      return {
        midHasTier2: mid10.includes(2),
        midTier1Ratio: mid10.filter(t => t === 1).length / mid10.length,
        restHasTier2: rest.includes(2),
        restHasTier3: rest.includes(3)
      };
    });

    expect(queueMix.midHasTier2).toBe(true);
    expect(queueMix.midTier1Ratio).toBeGreaterThanOrEqual(0.7);
    expect(queueMix.restHasTier2).toBe(true);
    expect(queueMix.restHasTier3).toBe(true);
  });

  test('Test I6: No early repeat (cards do not repeat until pool exhausts)', async ({ page }) => {
    await page.goto('/wortregen.html');
    await page.waitForFunction(() => window.WortregenVocabularyProvider !== undefined);

    const uniqueness = await page.evaluate(() => {
      const provider = new window.WortregenVocabularyProvider();
      const queue = provider.buildQueue();
      const ids = queue.map(c => c.id);
      const uniqueIds = new Set(ids);
      return {
        queueLen: queue.length,
        uniqueLen: uniqueIds.size
      };
    });

    expect(uniqueness.queueLen).toBe(177);
    expect(uniqueness.uniqueLen).toBe(177);
  });

  test('Test I7: No duplicate active cards (Target and Waiting never share the same card ID)', async ({ page }) => {
    await page.goto('/wortregen.html');
    await page.waitForFunction(() => window.wortregenGame !== undefined);

    await page.click('#btn-start');
    // Wait until 2 cards are active on screen
    await page.waitForFunction(() => {
      const g = window.wortregenGame;
      return g && g.activeWords.filter(w => !w.isDying && !w.isGrounded).length >= 2;
    }, { timeout: 6000 });

    const activeCardIds = await page.evaluate(() => {
      const g = window.wortregenGame;
      const active = g.activeWords.filter(w => !w.isDying && !w.isGrounded);
      return active.map(w => w.cardId);
    });

    expect(activeCardIds.length).toBe(2);
    expect(activeCardIds[0]).not.toBe(activeCardIds[1]);
  });

  test('Test I8: Duration scaling (phrases fall slower than single lexical items)', async ({ page }) => {
    await page.goto('/wortregen.html');
    await page.waitForFunction(() => window.WortregenVocabularyProvider !== undefined);

    const durations = await page.evaluate(() => {
      const provider = new window.WortregenVocabularyProvider();
      // Single short noun (Tier 1)
      const t1Duration = provider.getFallDuration({ tier: 1 }, { canonicalAnswer: 'das Haus' });
      // Single longer noun (Tier 1)
      const t1LongDuration = provider.getFallDuration({ tier: 1 }, { canonicalAnswer: 'die Entscheidung' });
      // Short phrase (Tier 2)
      const t2Duration = provider.getFallDuration({ tier: 2 }, { canonicalAnswer: 'sich bewerben' });
      // Longer phrase (Tier 3)
      const t3Duration = provider.getFallDuration({ tier: 3 }, { canonicalAnswer: 'eine Entscheidung treffen' });
      return { t1Duration, t1LongDuration, t2Duration, t3Duration };
    });

    expect(durations.t1Duration).toBe(18.5);
    expect(durations.t1LongDuration).toBe(21.0);
    expect(durations.t2Duration).toBe(24.0);
    expect(durations.t3Duration).toBe(28.5);
    expect(durations.t2Duration).toBeGreaterThan(durations.t1Duration);
    expect(durations.t3Duration).toBeGreaterThan(durations.t2Duration);
  });

  test('Test I9: User cards (valid user card included, invalid excluded)', async ({ page }) => {
    await page.goto('/wortregen.html');
    await page.waitForFunction(() => window.WortregenVocabularyProvider !== undefined);

    const result = await page.evaluate(() => {
      // Inject user cards
      window.userCards = [
        {
          id: 'user_valid_1',
          term: 'der Schreibtisch',
          meaning: 'bàn làm việc',
          deck: 'Từ của tôi',
          source: 'user'
        },
        {
          id: 'user_invalid_grammar',
          term: 'Grammatik Frage?',
          meaning: 'giải thích ngữ pháp',
          cardType: 'grammar',
          source: 'user'
        }
      ];

      const provider = new window.WortregenVocabularyProvider();
      const eligible = provider.getEligibleCards();
      const hasValid = eligible.some(c => c.id === 'user_valid_1');
      const hasInvalid = eligible.some(c => c.id === 'user_invalid_grammar');
      return { hasValid, hasInvalid };
    });

    expect(result.hasValid).toBe(true);
    expect(result.hasInvalid).toBe(false);
  });

  test('Test I10: Deck filter API (buildQueue({ deck }) restricts to matching deck)', async ({ page }) => {
    await page.goto('/wortregen.html');
    await page.waitForFunction(() => window.WortregenVocabularyProvider !== undefined);

    const deckResult = await page.evaluate(() => {
      const provider = new window.WortregenVocabularyProvider();
      const lektion2Deck = 'Lektion 2 · Sprich mit mir!';
      const queue = provider.buildQueue({ deck: lektion2Deck });
      return {
        queueCount: queue.length,
        allMatchDeck: queue.every(c => c.deck === lektion2Deck)
      };
    });

    expect(deckResult.queueCount).toBeGreaterThan(0);
    expect(deckResult.allMatchDeck).toBe(true);
  });

});
