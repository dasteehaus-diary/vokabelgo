// ==============================================================================
// VokabelGo - Pedagogical Learning UX Acceptance Test Suite
// Verifies Section W (Acceptance Criteria) & Section X (Flows 1 to 10)
// ==============================================================================

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== RUNNING PEDAGOGICAL LEARNING UX ACCEPTANCE TESTS ===\n');

// 1. Read index.html, learning-ux.css, reward-prototype.js
const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const learningCss = fs.readFileSync(path.join(__dirname, 'learning-ux.css'), 'utf8');
const rewardJs = fs.readFileSync(path.join(__dirname, 'reward-prototype.js'), 'utf8');

let passedTests = 0;
let failedTests = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
  }
}

// ------------------------------------------------------------------------------
// TEST SUITE 1: 4 MAIN HUBS & INFORMATION ARCHITECTURE (SECTION B)
// ------------------------------------------------------------------------------
console.log('--- TEST GROUP 1: 4 Main Navigation Hubs & Clean Header (Section B) ---');

it('Header contains the 4 primary learner hubs: Hôm Nay, Học Từ, Kino, Thư Viện', () => {
  assert.ok(indexHtml.includes('data-nav="today"'), 'Must have today hub');
  assert.ok(indexHtml.includes('data-nav="study"'), 'Must have study hub');
  assert.ok(indexHtml.includes('data-nav="kino"'), 'Must have kino hub');
  assert.ok(indexHtml.includes('data-nav="library"'), 'Must have library hub');
});

it('Account, settings, and tour are tucked into Profile Dropdown menu and do NOT clutter top nav', () => {
  assert.ok(indexHtml.includes('id="profileDropdownMenu"'), 'Must have profileDropdownMenu');
  assert.ok(indexHtml.includes('id="openAvatarBtn"'), 'Must have openAvatarBtn');
  assert.ok(indexHtml.includes('id="openAuthBtn"'), 'openAuthBtn must be preserved');
  assert.ok(indexHtml.includes('id="openLeaderboardBtn"'), 'openLeaderboardBtn must be preserved');
  assert.ok(indexHtml.includes('id="manageBtn"'), 'manageBtn must be preserved');
  assert.ok(indexHtml.includes('id="catTourNavBtn"'), 'catTourNavBtn must be preserved');
});

it('Kino Studio is creator/admin functionality and not displayed as peer in learner navigation', () => {
  // Main nav must not contain Studio
  const navMatch = indexHtml.match(/<nav class="main-nav-hubs"[^>]*>([\s\S]*?)<\/nav>/);
  assert.ok(navMatch, 'Must find main-nav-hubs');
  assert.ok(!navMatch[1].toLowerCase().includes('studio'), 'Nav must not contain studio');
});

// ------------------------------------------------------------------------------
// TEST SUITE 2: TRANG HÔM NAY (TODAY HUB) & RESUME FLOW (SECTION C, D)
// ------------------------------------------------------------------------------
console.log('\n--- TEST GROUP 2: Trang Hôm Nay & Resume Flow (Section C, D) ---');

it('Hôm Nay section exists with single primary CTA and session target', () => {
  assert.ok(indexHtml.includes('id="todayMode"'), 'Must have todayMode section');
  assert.ok(indexHtml.includes('id="todayPrimaryCta"'), 'Must have single primary CTA button');
  assert.ok(indexHtml.includes('id="todayHeroTitle"'), 'Must have hero title');
  assert.ok(indexHtml.includes('id="todayHeroProgressRatio"'), 'Must have progress ratio');
  assert.ok(indexHtml.includes('id="todayResumeHint"'), 'Must have resume hint');
});

it('setMode and setPrimaryHub support seamless switching between all 4 hubs', () => {
  assert.ok(indexHtml.includes('function setPrimaryHub('), 'Must define setPrimaryHub');
  assert.ok(indexHtml.includes('function setStudySubMode('), 'Must define setStudySubMode');
  assert.ok(indexHtml.includes('function setLibraryTab('), 'Must define setLibraryTab');
  assert.ok(indexHtml.includes('function resumeLastLearningSession('), 'Must define resumeLastLearningSession');
});

// ------------------------------------------------------------------------------
// TEST SUITE 3: ACTIVE RECALL & PROGRESSIVE DISCLOSURE (SECTION F, G)
// ------------------------------------------------------------------------------
console.log('\n--- TEST GROUP 3: Active Recall & Progressive Disclosure (Section F, G) ---');

it('Flashcard front has Active Recall reveal button (Attempt recall FIRST)', () => {
  assert.ok(indexHtml.includes('revealFlashcardAnswer'), 'Must have revealFlashcardAnswer action');
  assert.ok(indexHtml.includes('btn-reveal-answer'), 'Must have reveal button class');
  assert.ok(indexHtml.includes('Xem đáp án'), 'Must show Xem đáp án button text');
});

it('Flashcard ratings use pedagogical human labels: Chưa nhớ, Còn khó, Nhớ được', () => {
  assert.ok(indexHtml.includes('1 · Chưa nhớ'), 'Must have Chưa nhớ');
  assert.ok(indexHtml.includes('2 · Còn khó'), 'Must have Còn khó');
  assert.ok(indexHtml.includes('3 · Nhớ được'), 'Must have Nhớ được');
});

it('Progressive disclosure: deep details (collocations, grammar, example, note) are collapsed by default', () => {
  assert.ok(indexHtml.includes('id="cardDeepDetails"'), 'Must have cardDeepDetails container');
  assert.ok(indexHtml.includes('btnToggleCardDetails'), 'Must have toggle button for card details');
  assert.ok(indexHtml.includes('function toggleFlashcardDetails('), 'Must define toggleFlashcardDetails');
  assert.ok(learningCss.includes('.card-deep-details.collapsed'), 'CSS must define collapsed rule');
});

// ------------------------------------------------------------------------------
// TEST SUITE 4: CLEAN STUDENT REWARD EXPERIENCE (SECTION J, K, M, N)
// ------------------------------------------------------------------------------
console.log('\n--- TEST GROUP 4: Cat Fishing Reward Modal & Student View (Section J, K, M, N) ---');

it('Student reward modal removes clutter (No MÈO CÂU CÁ TRÚNG THƯỞNG title, no subtitle, minimal header)', () => {
  assert.ok(!indexHtml.includes('MÈO CÂU CÁ TRÚNG THƯỞNG'), 'Student title MÈO CÂU CÁ TRÚNG THƯỞNG removed for pure minimalism');
  assert.ok(!indexHtml.includes('Prototype trải nghiệm hình ảnh & âm thanh · Không lưu tiến độ'), 'Prototype test subtitle removed');
  assert.ok(!indexHtml.includes('Hoàn thành mục tiêu 5 từ · Nhận cá tươi ngon'), 'Milestone explanation subtitle removed');
  assert.ok(indexHtml.includes('class="reward-modal-header reward-minimal-header"'), 'Header must be minimal floating header');
});

it('Student reward UI has simple audio toggle (🔊 / 🔇) and close button', () => {
  assert.ok(indexHtml.includes('id="rewardSoundToggleBtn"'), 'Must have rewardSoundToggleBtn');
  assert.ok(rewardJs.includes('toggleRewardSound'), 'Must define toggleRewardSound');
  assert.ok(indexHtml.includes('reward-close-btn'), 'Must have close button');
});

it('Dev controls are NOT rendered in static student DOM and only generated when dev flag enabled', () => {
  assert.ok(!indexHtml.includes('id="rewardDevTestingPanel"'), 'Static student HTML must not contain rewardDevTestingPanel');
  assert.ok(rewardJs.includes('renderDevTestingPanel'), 'Dev panel rendered dynamically');
  assert.ok(rewardJs.includes('isDevEnvironment'), 'isDevEnvironment check exists');
});

it('Catch reveal displays German word, article, Vietnamese meaning, rarity badge, +1 vào Hồ cá, and Học tiếp CTA', () => {
  assert.ok(indexHtml.includes('id="catchGermanWord"'), 'Must display German word');
  assert.ok(indexHtml.includes('id="catchArticlePill"'), 'Must display article');
  assert.ok(indexHtml.includes('id="catchVietnameseText"'), 'Must display Vietnamese translation');
  assert.ok(indexHtml.includes('id="catchRarityBadge"'), 'Must display rarity badge');
  assert.ok(indexHtml.includes('id="btnCollectFish"'), 'Must have primary collect / continue CTA');
  assert.ok(indexHtml.includes('Học tiếp'), 'CTA button is Học tiếp');
  assert.ok(indexHtml.includes('+1 vào Hồ cá'), 'Must show +1 vào Hồ cá hint');
  assert.ok(!indexHtml.includes('id="catchStatLength"'), 'Length removed from reward card');
  assert.ok(!indexHtml.includes('id="catchStatWeight"'), 'Weight removed from reward card');
  assert.ok(!indexHtml.includes('id="catchStatExp"'), 'EXP removed from reward card');
  assert.ok(!indexHtml.includes('id="catchMascotQuote"'), 'Mascot quote removed from reward card');
});

// ------------------------------------------------------------------------------
// TEST SUITE 5: HỒ CÁ / PERSISTENT FISH COLLECTION (SECTION L)
// ------------------------------------------------------------------------------
console.log('\n--- TEST GROUP 5: Hồ Cá / Persistent Fish Collection (Section L) ---');

it('Caught fish is persisted to localStorage key vokabelgo_fish_collection_v1 on pending reward claim', () => {
  assert.ok(rewardJs.includes('vokabelgo_fish_collection_v1'), 'Must use vokabelgo_fish_collection_v1 storage key');
  assert.ok(rewardJs.includes('window.VokabelDaily.setCatchStatus(\'claimed\')'), 'Must set catchStatus to claimed');
});

it('Replaying video or clicking replay button does NOT re-award fish (Transaction independent of playback)', () => {
  // In triggerCatchReveal: only pending catchStatus will write to collection
  assert.ok(rewardJs.includes('isPendingReward'), 'Must guard reward transaction with isPendingReward check');
});

it('Library Hồ cá view renders collected fish from storage with German vocabulary and SVG art', () => {
  assert.ok(indexHtml.includes('id="libraryFishGrid"'), 'Must have libraryFishGrid');
  assert.ok(indexHtml.includes('function renderLibraryFishCollection('), 'Must define renderLibraryFishCollection');
  assert.ok(indexHtml.includes('function renderLibraryDecks('), 'Must define renderLibraryDecks');
});

// ------------------------------------------------------------------------------
// TEST SUITE 6: ACCESSIBILITY, RESPONSIVENESS & PERFORMANCE (SECTION R, S)
// ------------------------------------------------------------------------------
console.log('\n--- TEST GROUP 6: Accessibility, Responsiveness & Performance (Section R, S) ---');

it('learning-ux.css includes prefers-reduced-motion media query', () => {
  assert.ok(learningCss.includes('@media (prefers-reduced-motion: reduce)'), 'Must support reduced motion');
});

it('learning-ux.css includes mobile responsive breakpoints (<= 768px)', () => {
  assert.ok(learningCss.includes('@media (max-width: 768px)'), 'Must have mobile media query');
});

// ------------------------------------------------------------------------------
// TEST SUITE 7: SEMANTIC CALLOUT CLEANUP (ROUND 2.1 ACCEPTANCE)
// ------------------------------------------------------------------------------
console.log('\n--- TEST GROUP 7: Semantic Callout Classification & Styling (Round 2.1) ---');

const classifyCardNoteMatch = indexHtml.match(/function classifyCardNote\([\s\S]*?\n\}/);
const classifyCardNote = classifyCardNoteMatch ? new Function(`${classifyCardNoteMatch[0]}; return classifyCardNote;`)() : null;

it('Deterministic note classification exists and is exported in index.html', () => {
  assert.ok(classifyCardNote, 'classifyCardNote function must exist in index.html');
  assert.ok(indexHtml.includes('window.classifyCardNote = classifyCardNote'), 'classifyCardNote must be attached to window');
});

it('Test A: Note with "≠" is classified as Dễ nhầm (callout-confusion, icon-easy-to-confuse)', () => {
  const res = classifyCardNote('≠ die Gestik: cách sử dụng cử chỉ nói chung.');
  assert.strictEqual(res.type, 'confusion');
  assert.strictEqual(res.label, 'Dễ nhầm');
  assert.strictEqual(res.calloutClass, 'callout-confusion');
  assert.strictEqual(res.iconId, 'icon-easy-to-confuse');
});

it('Test B: Note with confusion markers (phân biệt, dễ nhầm, khác với, đừng nhầm, so với, vs.) is classified as Dễ nhầm', () => {
  const res1 = classifyCardNote('Phân biệt với từ khác khi dùng trong văn cảnh trang trọng.');
  assert.strictEqual(res1.type, 'confusion');
  assert.strictEqual(res1.label, 'Dễ nhầm');
  assert.strictEqual(res1.calloutClass, 'callout-confusion');
  assert.strictEqual(res1.iconId, 'icon-easy-to-confuse');

  const res2 = classifyCardNote('Đừng nhầm với cấu trúc bị động.');
  assert.strictEqual(res2.type, 'confusion');
  assert.strictEqual(res2.label, 'Dễ nhầm');
});

it('Test C: Note with "mở rộng" is classified as Mở rộng (callout-note, icon-memory-tip)', () => {
  const res = classifyCardNote('Mở rộng: die Stirn runzeln; die Augenbrauen heben.');
  assert.strictEqual(res.type, 'extension');
  assert.strictEqual(res.label, 'Mở rộng');
  assert.strictEqual(res.calloutClass, 'callout-note');
  assert.strictEqual(res.iconId, 'icon-memory-tip');
});

it('Test D: Standard notes are classified as neutral Ghi chú (callout-note, icon-memory-tip)', () => {
  const res = classifyCardNote('wirken auf + Akk. giúp diễn đạt đây là ấn tượng của người nói.');
  assert.strictEqual(res.type, 'note');
  assert.strictEqual(res.label, 'Ghi chú');
  assert.strictEqual(res.calloutClass, 'callout-note');
  assert.strictEqual(res.iconId, 'icon-memory-tip');
});

it('Test E: Collocations block is titled "Cụm thường dùng" and NOT "Mẹo nhớ"', () => {
  const collocMatch = indexHtml.match(/<div[^>]*id="collocBlock"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/);
  assert.ok(collocMatch, 'collocBlock must exist in index.html');
  assert.ok(collocMatch[1].includes('Cụm thường dùng'), 'collocBlock header must be "Cụm thường dùng"');
  assert.ok(!collocMatch[1].includes('Mẹo nhớ'), 'collocBlock header must NOT be "Mẹo nhớ"');
});

it('Test F: learning-ux.css defines neutral soft paper style for .callout-note', () => {
  assert.ok(learningCss.includes('.learning-callout.callout-note'), 'CSS must define .learning-callout.callout-note');
  assert.ok(learningCss.includes('#FAF7EE'), 'callout-note background must be #FAF7EE');
  assert.ok(learningCss.includes('#E2DDD2'), 'callout-note border must be #E2DDD2');
  assert.ok(learningCss.includes('#5C5248'), 'callout-note header color must be #5C5248');
  assert.ok(learningCss.includes('#38312A'), 'callout-note content color must be #38312A');
});

// ------------------------------------------------------------------------------
// SUMMARY
// ------------------------------------------------------------------------------
console.log('\n========================================');
console.log(`PEDAGOGICAL ACCEPTANCE SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('========================================\n');

if (failedTests > 0) {
  process.exit(1);
}
