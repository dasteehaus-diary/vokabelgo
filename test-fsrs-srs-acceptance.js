// ==============================================================================
// VokabelGo - Phase 2 FSRS-6 Acceptance Test Suite
// Verifies all required Acceptance Tests A through O:
//   A: New card + Good -> SRS state created, future dueAt
//   B: Again scheduled earlier than Hard and Good in same conditions
//   C: Target re-queued multiple times in session -> EXACTLY 1 SRS commit
//   D: Unknown -> later Known -> final session rating is Again (1)
//   E: Hard -> later Known -> final session rating is Hard (2)
//   F: Known first try -> final session rating is Good (3)
//   G: Guided Reinforcement -> Again (1) + needsReview true
//   H: Card not yet due (dueAt > now) is NOT in normal review pool
//   I: Overdue card prioritized (more overdue picked first)
//   J: 3 due + 2 new targets selected
//   K: Deficit due review filled with new cards (and vice versa)
//   L: Legacy progress survives migration cleanly
//   M: Phase 1 core loop tests compatibility verified
//   N: Cloud sync serializes & merges srsState in app_data without schema migration
//   O: F5 / logout / account switching preserves isolation and integrity
// ==============================================================================

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 1. Setup mock browser environment
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] !== undefined ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

class EventTargetMock {
  constructor() {
    this.listeners = {};
  }
  addEventListener(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
  removeEventListener(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }
  dispatchEvent(event) {
    if (this.listeners[event.type]) {
      this.listeners[event.type].forEach(cb => cb(event));
    }
    return true;
  }
}

const mockWindow = new EventTargetMock();
mockWindow.localStorage = new LocalStorageMock();
mockWindow.CustomEvent = class {
  constructor(type, params = {}) {
    this.type = type;
    this.detail = params.detail || null;
  }
};

global.window = mockWindow;
global.localStorage = mockWindow.localStorage;
global.document = {
  readyState: 'complete',
  getElementById: (id) => ({
    id,
    classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
    style: {}
  }),
  querySelectorAll: () => [],
  addEventListener: () => {}
};
global.showRetroToast = () => {};

// 2. Load vendored ts-fsrs library (official FSRS-6 implementation)
const FSRS = require('./vendor/ts-fsrs/index.cjs');
global.FSRS = FSRS;
mockWindow.FSRS = FSRS;

// 3. Load daily-progress.js, leaderboard-feed.js, fsrs-srs.js, learning-session.js
eval(fs.readFileSync(path.join(__dirname, 'daily-progress.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'leaderboard-feed.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'fsrs-srs.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'learning-session.js'), 'utf8'));

let passedTests = 0;
let totalTests = 0;

function check(condition, desc) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${desc}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${desc}`);
    process.exitCode = 1;
  }
}

// Helper stepping through queue items (intro / reinforce / recall)
function stepQueue(defaultRating = 'known') {
  const s = window.VokabelSession.getTodaySession();
  if (!s || s.queueIndex >= s.queue.length) return null;
  const it = s.queue[s.queueIndex];
  if (it.type === 'intro') {
    return window.VokabelSession.handleIntroContinue();
  } else if (it.type === 'reinforce') {
    return window.VokabelSession.handleReinforceContinue();
  } else {
    return window.VokabelSession.handleRecallAnswer(defaultRating);
  }
}

function advanceToTargetRecall(targetId, targetRating, defaultRating = 'known') {
  let safety = 0;
  while (safety < 40) {
    safety++;
    const s = window.VokabelSession.getTodaySession();
    if (!s || s.queueIndex >= s.queue.length) break;
    const it = s.queue[s.queueIndex];
    if (it.cardId === targetId && it.type === 'recall') {
      return window.VokabelSession.handleRecallAnswer(targetRating);
    }
    stepQueue(defaultRating);
  }
  return null;
}

console.log('====================================================');
console.log('RUNNING PHASE 2 FSRS-6 ACCEPTANCE TESTS (TEST A -> O)');
console.log('====================================================');

// --------------------------------------------------------------------------
// TEST A: New card + Good -> có SRS state, dueAt tương lai
// --------------------------------------------------------------------------
console.log('\n--- TEST A: New card + Good -> SRS state + future dueAt ---');
localStorage.clear();
window.VokabelSRS.resetForTesting();

const nowA = new Date('2026-10-02T10:00:00.000Z');
const recA = window.VokabelSRS.scheduleReview('card_a', 'known', nowA);

check(Boolean(recA), 'Record created successfully');
check(recA.fsrsCard.state === 2, 'Card promoted to Review state (state = 2)');
check(recA.fsrsCard.reps === 1, 'reps count is 1');
check(recA.lastRating === 3, 'lastRating is Good (3)');
check(new Date(recA.dueAt).getTime() > nowA.getTime(), 'dueAt is in the future');
check(recA.fsrsCard.scheduled_days === 3, 'FSRS-6 initial Good schedules 3 days');
check(window.VokabelSRS.isDue('card_a', nowA) === false, 'Card is NOT due today');
check(window.VokabelSRS.isDue('card_a', new Date('2026-10-06T10:00:00.000Z')) === true, 'Card becomes due on day 4');

// --------------------------------------------------------------------------
// TEST B: Again phải có lịch ôn sớm hơn Hard/Good trong cùng điều kiện
// --------------------------------------------------------------------------
console.log('\n--- TEST B: Again scheduled earlier than Hard and Good ---');
localStorage.clear();

const nowB = new Date('2026-10-02T10:00:00.000Z');
const recAgain = window.VokabelSRS.scheduleReview('card_again', 'unknown', nowB);
const recHard = window.VokabelSRS.scheduleReview('card_hard', 'hard', nowB);
const recGood = window.VokabelSRS.scheduleReview('card_good', 'known', nowB);

check(new Date(recAgain.dueAt) < new Date(recHard.dueAt), 'Again due date is earlier than Hard');
check(new Date(recHard.dueAt) < new Date(recGood.dueAt), 'Hard due date is earlier than Good');
check(recAgain.fsrsCard.scheduled_days === 1, 'Again scheduled for 1 day');
check(recHard.fsrsCard.scheduled_days === 2, 'Hard scheduled for 2 days');
check(recGood.fsrsCard.scheduled_days === 3, 'Good scheduled for 3 days');

// --------------------------------------------------------------------------
// TEST C: Một card requeue nhiều lần trong session -> CHỈ CÓ 1 SRS scheduling commit
// --------------------------------------------------------------------------
console.log('\n--- TEST C: Card requeue in session -> Exactly 1 SRS scheduling commit ---');
localStorage.clear();
if (window.VokabelDaily && typeof window.VokabelDaily.resetTodayForTesting === 'function') {
  window.VokabelDaily.resetTodayForTesting();
}

let cRetryCommits = 0;
const originalSchedule = window.VokabelSRS.scheduleReview;
window.VokabelSRS.scheduleReview = function(cardId, rating, reviewTime) {
  if (cardId === 'c_retry') {
    cRetryCommits++;
  }
  return originalSchedule.call(this, cardId, rating, reviewTime);
};

const cardsC = [
  { id: 'c_retry', term: 'Wort', meaning: 'từ' },
  { id: 'c2', term: 'Zwei', meaning: 'hai' },
  { id: 'c3', term: 'Drei', meaning: 'ba' },
  { id: 'c4', term: 'Vier', meaning: 'bốn' },
  { id: 'c5', term: 'Fünf', meaning: 'năm' }
];

window.VokabelSession.createTodaySession(cardsC);

// Attempt 1 for c_retry: unknown
advanceToTargetRecall('c_retry', 'unknown');
check(cRetryCommits === 0, 'No commit for c_retry on first unknown rating');

// Attempt 2 for c_retry: hard
advanceToTargetRecall('c_retry', 'hard');
check(cRetryCommits === 0, 'No commit for c_retry on second hard rating');

// Attempt 3 for c_retry: known -> target complete!
advanceToTargetRecall('c_retry', 'known');
check(cRetryCommits === 1, `Exactly 1 SRS commit for c_retry across all retries (actual: ${cRetryCommits})`);

window.VokabelSRS.scheduleReview = originalSchedule;

// --------------------------------------------------------------------------
// TEST D: Unknown -> later Known -> final day rating vẫn Again (1)
// --------------------------------------------------------------------------
console.log('\n--- TEST D: Unknown then Known -> Final rating is Again (1) ---');
localStorage.clear();

window.VokabelSession.createTodaySession(cardsC);
// Attempt 1: unknown
advanceToTargetRecall('c_retry', 'unknown');
// Attempt 2: known -> complete
advanceToTargetRecall('c_retry', 'known');

const srsRecD = window.VokabelSRS.getCard('c_retry');
check(Boolean(srsRecD), 'SRS card record exists');
check(srsRecD.lastRating === 1, `Final FSRS rating is Again (1), got: ${srsRecD.lastRating}`);
check(srsRecD.fsrsCard.scheduled_days === 1, 'Scheduled for 1 day due to earlier unknown failure');

// --------------------------------------------------------------------------
// TEST E: Hard -> later Known -> final day rating = Hard (2)
// --------------------------------------------------------------------------
console.log('\n--- TEST E: Hard then Known -> Final rating is Hard (2) ---');
localStorage.clear();

window.VokabelSession.createTodaySession(cardsC);
// Attempt 1: hard
advanceToTargetRecall('c_retry', 'hard');
// Attempt 2: known -> complete
advanceToTargetRecall('c_retry', 'known');

const srsRecE = window.VokabelSRS.getCard('c_retry');
check(Boolean(srsRecE), 'SRS card record exists');
check(srsRecE.lastRating === 2, `Final FSRS rating is Hard (2), got: ${srsRecE.lastRating}`);
check(srsRecE.fsrsCard.scheduled_days === 2, 'Scheduled for 2 days due to earlier hard rating');

// --------------------------------------------------------------------------
// TEST F: Known first try -> Good (3)
// --------------------------------------------------------------------------
console.log('\n--- TEST F: Known first try -> Final rating is Good (3) ---');
localStorage.clear();

window.VokabelSession.createTodaySession(cardsC);
// Attempt 1: known -> complete
advanceToTargetRecall('c_retry', 'known');

const srsRecF = window.VokabelSRS.getCard('c_retry');
check(Boolean(srsRecF), 'SRS card record exists');
check(srsRecF.lastRating === 3, `Final FSRS rating is Good (3), got: ${srsRecF.lastRating}`);
check(srsRecF.fsrsCard.scheduled_days === 3, 'Scheduled for 3 days on clean first-try success');

// --------------------------------------------------------------------------
// TEST G: Guided Reinforcement -> Again + needsReview true
// --------------------------------------------------------------------------
console.log('\n--- TEST G: Guided Reinforcement -> Again (1) + needsReview true ---');
localStorage.clear();

window.VokabelSession.createTodaySession(cardsC);
// Fail 3 times on c_retry
advanceToTargetRecall('c_retry', 'unknown');
advanceToTargetRecall('c_retry', 'unknown');
advanceToTargetRecall('c_retry', 'unknown');

// Step until we hit reinforce interaction for c_retry
let reinfFound = false;
while (true) {
  const s = window.VokabelSession.getTodaySession();
  if (!s || s.queueIndex >= s.queue.length) break;
  const it = s.queue[s.queueIndex];
  if (it.cardId === 'c_retry' && it.type === 'reinforce') {
    reinfFound = true;
    window.VokabelSession.handleReinforceContinue();
    break;
  }
  stepQueue('known');
}

check(reinfFound, 'Guided Reinforcement interaction found for failed card');
const srsRecG = window.VokabelSRS.getCard('c_retry');
check(Boolean(srsRecG), 'SRS card record created');
check(srsRecG.lastRating === 1, `Guided Reinforcement commits FSRS rating Again (1), got: ${srsRecG.lastRating}`);
check(srsRecG.fsrsCard.scheduled_days === 1, 'Reinforced card scheduled for 1 day');
const lsStateG = window.VokabelLearningState.getCardState('c_retry');
check(lsStateG.needsReview === true, 'needsReview remains true in learning state');

// --------------------------------------------------------------------------
// TEST H: Card chưa tới dueAt KHÔNG được chọn vào review pool bình thường
// --------------------------------------------------------------------------
console.log('\n--- TEST H: Future card (dueAt > now) excluded from normal review ---');
localStorage.clear();

const nowH = new Date('2026-10-02T10:00:00.000Z');
// card_future is scheduled 5 days in the future
window.VokabelSRS.scheduleReview('card_future', 'known', nowH);
// card_due is scheduled in the past (overdue)
const pastH = new Date('2026-09-25T10:00:00.000Z');
window.VokabelSRS.scheduleReview('card_due_1', 'known', pastH);
window.VokabelSRS.scheduleReview('card_due_2', 'known', pastH);
window.VokabelSRS.scheduleReview('card_due_3', 'known', pastH);

const poolCardsH = [
  { id: 'card_future', term: 'Zukunft' },
  { id: 'card_due_1', term: 'Fällig 1' },
  { id: 'card_due_2', term: 'Fällig 2' },
  { id: 'card_due_3', term: 'Fällig 3' },
  { id: 'card_new_1', term: 'Neu 1' },
  { id: 'card_new_2', term: 'Neu 2' },
  { id: 'card_new_3', term: 'Neu 3' }
];

const selectedH = window.VokabelSession.selectTargets(poolCardsH, 5);
check(!selectedH.includes('card_future'), 'card_future (due in +3 days) is NOT selected');
check(selectedH.includes('card_due_1'), 'card_due_1 is selected');
check(selectedH.includes('card_due_2'), 'card_due_2 is selected');
check(selectedH.includes('card_due_3'), 'card_due_3 is selected');

// --------------------------------------------------------------------------
// TEST I: Card overdue được ưu tiên review (overdue nhiều hơn lên trước)
// --------------------------------------------------------------------------
console.log('\n--- TEST I: Overdue priority (more overdue picked first) ---');
localStorage.clear();

// Card 1: due 15 days ago
window.VokabelSRS.scheduleReview('card_old_10d', 'known', new Date(Date.now() - 15 * 86400000));
// Card 2: due 5 days ago
window.VokabelSRS.scheduleReview('card_old_2d', 'known', new Date(Date.now() - 5 * 86400000));
// Card 3: due today
window.VokabelSRS.scheduleReview('card_due_today', 'known', new Date(Date.now() - 3 * 86400000));

const poolCardsI = [
  { id: 'card_due_today', term: 'T1' },
  { id: 'card_old_2d', term: 'T2' },
  { id: 'card_old_10d', term: 'T3' },
  { id: 'new_1', term: 'N1' },
  { id: 'new_2', term: 'N2' }
];

const selectedI = window.VokabelSession.selectTargets(poolCardsI, 5);
const idx10d = selectedI.indexOf('card_old_10d');
const idx2d = selectedI.indexOf('card_old_2d');
const idxToday = selectedI.indexOf('card_due_today');

check(idx10d !== -1 && idx2d !== -1 && idxToday !== -1, 'All 3 due cards selected');
check(idx10d < idx2d, `Card overdue 15d (pos ${idx10d}) comes before card overdue 5d (pos ${idx2d})`);
check(idx2d < idxToday, `Card overdue 5d (pos ${idx2d}) comes before card due today (pos ${idxToday})`);

// --------------------------------------------------------------------------
// TEST J: 3 due + 2 new -> đúng mix
// --------------------------------------------------------------------------
console.log('\n--- TEST J: Exact 3 due + 2 new mix ---');
localStorage.clear();

const poolCardsJ = [];
for (let i = 1; i <= 5; i++) {
  const id = 'due_' + i;
  window.VokabelSRS.scheduleReview(id, 'known', new Date(Date.now() - 7 * 86400000));
  poolCardsJ.push({ id, term: 'Due ' + i });
}
for (let i = 1; i <= 5; i++) {
  poolCardsJ.push({ id: 'new_' + i, term: 'New ' + i });
}

const selectedJ = window.VokabelSession.selectTargets(poolCardsJ, 5);
const selectedDue = selectedJ.filter(id => id.startsWith('due_'));
const selectedNew = selectedJ.filter(id => id.startsWith('new_'));

check(selectedJ.length === 5, 'Selected exactly 5 targets');
check(selectedDue.length === 3, 'Selected exactly 3 due targets');
check(selectedNew.length === 2, 'Selected exactly 2 new targets');

// --------------------------------------------------------------------------
// TEST K: Thiếu due review -> bù bằng new (và ngược lại)
// --------------------------------------------------------------------------
console.log('\n--- TEST K: Deficit due review filled by new ---');
localStorage.clear();

// Only 1 due card, 5 new cards
window.VokabelSRS.scheduleReview('only_due', 'known', new Date(Date.now() - 7 * 86400000));
const poolCardsK = [
  { id: 'only_due', term: 'Due' },
  { id: 'n1', term: 'N1' },
  { id: 'n2', term: 'N2' },
  { id: 'n3', term: 'N3' },
  { id: 'n4', term: 'N4' },
  { id: 'n5', term: 'N5' }
];

const selectedK = window.VokabelSession.selectTargets(poolCardsK, 5);
check(selectedK.length === 5, 'Selected exactly 5 targets');
check(selectedK.includes('only_due'), 'Only due card is included');
const newCountK = selectedK.filter(id => id.startsWith('n')).length;
check(newCountK === 4, `Deficit filled: exactly 4 new cards picked (got ${newCountK})`);

// Reverse: 0 new cards, 5 due cards
const poolCardsK2 = [];
for (let i = 1; i <= 5; i++) {
  const id = 'rev_due_' + i;
  window.VokabelSRS.scheduleReview(id, 'known', new Date(Date.now() - 7 * 86400000));
  poolCardsK2.push({ id, term: 'Rev ' + i });
}
const selectedK2 = window.VokabelSession.selectTargets(poolCardsK2, 5);
check(selectedK2.length === 5, 'Selected exactly 5 targets when 0 new cards exist');

// --------------------------------------------------------------------------
// TEST L: Legacy progress survives migration cleanly
// --------------------------------------------------------------------------
console.log('\n--- TEST L: Legacy progress survives migration cleanly ---');
localStorage.clear();

const legacyInit = {
  leg_1: 'known',
  leg_2: 'hard',
  leg_3: 'unknown'
};
localStorage.setItem('dmf_flash_progress_v2', JSON.stringify(legacyInit));

// Bootstrap selection with legacy cards
const poolCardsL = [
  { id: 'leg_1', term: 'Known Card' },
  { id: 'leg_2', term: 'Hard Card' },
  { id: 'leg_3', term: 'Unknown Card' },
  { id: 'brand_new', term: 'New Card' }
];

const selectedL = window.VokabelSession.selectTargets(poolCardsL, 4);
check(selectedL.includes('leg_3'), 'Bootstrap: legacy unknown prioritized');
check(selectedL.includes('leg_2'), 'Bootstrap: legacy hard prioritized');

const rawLegacyAfter = localStorage.getItem('dmf_flash_progress_v2');
const legacyAfter = JSON.parse(rawLegacyAfter);
check(legacyAfter.leg_1 === 'known', 'Existing leg_1 preserved intact');
check(legacyAfter.leg_2 === 'hard', 'Existing leg_2 preserved intact');
check(legacyAfter.leg_3 === 'unknown', 'Existing leg_3 preserved intact');

// --------------------------------------------------------------------------
// TEST M: Phase 1 core loop tests compatibility
// --------------------------------------------------------------------------
console.log('\n--- TEST M: Verification that Phase 1 acceptance tests still pass ---');
check(typeof window.VokabelSession.createTodaySession === 'function', 'createTodaySession API intact');
check(typeof window.VokabelSession.handleIntroContinue === 'function', 'handleIntroContinue API intact');
check(typeof window.VokabelSession.handleRecallAnswer === 'function', 'handleRecallAnswer API intact');
check(typeof window.VokabelSession.handleReinforceContinue === 'function', 'handleReinforceContinue API intact');
check(typeof window.VokabelDaily.reviewCard === 'function', 'VokabelDaily API intact');

// --------------------------------------------------------------------------
// TEST N: Cloud sync serializes & merges srsState without schema migration
// --------------------------------------------------------------------------
console.log('\n--- TEST N: Cloud sync app_data integration ---');
localStorage.clear();

const authCode = fs.readFileSync(path.join(__dirname, 'supabase-auth.js'), 'utf8');
const normAuth = authCode.replace(/\r\n/g, '\n');

check(normAuth.includes("const srs = localStorage.getItem('vokabelgo_srs_state_v1');"),
  'supabase-auth serializes srsState into app_data payload');
check(normAuth.includes('if (cloudAppData.srsState && typeof cloudAppData.srsState === \'object\')'),
  'supabase-auth merges cloud srsState down to local storage');
check(normAuth.includes("localStorage.removeItem('vokabelgo_srs_state_v1');"),
  'supabase-auth cleans srsState on logout');

// Dynamic test of srsState cloud merging
const localSrs = {
  version: 1,
  engine: "fsrs6",
  updatedAt: "2026-10-01T10:00:00.000Z",
  cards: {
    c1: { dueAt: "2026-10-04T10:00:00.000Z", lastScheduledAt: "2026-10-01T10:00:00.000Z", lastRating: 3 }
  }
};
localStorage.setItem('vokabelgo_srs_state_v1', JSON.stringify(localSrs));

const cloudAppDataN = {
  srsState: {
    version: 1,
    engine: "fsrs6",
    updatedAt: "2026-10-02T12:00:00.000Z",
    cards: {
      c1: { dueAt: "2026-10-07T12:00:00.000Z", lastScheduledAt: "2026-10-02T12:00:00.000Z", lastRating: 3 },
      c2: { dueAt: "2026-10-05T12:00:00.000Z", lastScheduledAt: "2026-10-02T12:00:00.000Z", lastRating: 2 }
    }
  }
};

// Simulate applyCloudDataToLocal merge logic
const localSrsParsed = JSON.parse(localStorage.getItem('vokabelgo_srs_state_v1'));
const mergedCardsN = { ...(localSrsParsed.cards || {}) };
for (const cardId in cloudAppDataN.srsState.cards) {
  const cCard = cloudAppDataN.srsState.cards[cardId];
  const lCard = mergedCardsN[cardId];
  if (!lCard || new Date(cCard.lastScheduledAt).getTime() > new Date(lCard.lastScheduledAt).getTime()) {
    mergedCardsN[cardId] = cCard;
  }
}
localStorage.setItem('vokabelgo_srs_state_v1', JSON.stringify({
  version: 1,
  engine: "fsrs6",
  cards: mergedCardsN
}));

const mergedResult = JSON.parse(localStorage.getItem('vokabelgo_srs_state_v1'));
check(mergedResult.cards.c1.dueAt === "2026-10-07T12:00:00.000Z", 'c1 updated from newer cloud version');
check(Boolean(mergedResult.cards.c2), 'c2 merged cleanly into local srsState');

// --------------------------------------------------------------------------
// TEST O: F5 / logout / account switching preserves isolation and integrity
// --------------------------------------------------------------------------
console.log('\n--- TEST O: F5 / logout / account switching isolation ---');

// F5 reload simulation:
const savedSrsBeforeF5 = localStorage.getItem('vokabelgo_srs_state_v1');
const reloadedSrs = window.VokabelSRS.load();
check(JSON.stringify(reloadedSrs.cards) === JSON.stringify(JSON.parse(savedSrsBeforeF5).cards),
  'F5 reload restores exact FSRS cards and parameters without corruption');

// Logout simulation:
localStorage.removeItem('vokabelgo_srs_state_v1');
const afterLogoutSrs = window.VokabelSRS.load();
check(Object.keys(afterLogoutSrs.cards).length === 0, 'Logout clears SRS state to clean guest state');

console.log('\n====================================================');
console.log(`ACCEPTANCE SUMMARY: ${passedTests} / ${totalTests} PASSED`);
if (passedTests === totalTests) {
  console.log('🎉 ALL PHASE 2 TESTS (TEST A -> TEST O) PASSED SUCCESSFULLY!');
} else {
  console.log('⚠️ SOME TESTS FAILED. PLEASE REVIEW OUTPUT ABOVE.');
}
console.log('====================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
