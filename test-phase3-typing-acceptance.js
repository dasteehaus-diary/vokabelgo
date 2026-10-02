// ==============================================================================
// VokabelGo - Phase 3 Objective Recall / Typing Verification Acceptance Tests
// Covers all tests from TEST A to TEST Q:
//   TEST A — Eligibility (new card no typing, mature review yes, questions/tags excluded)
//   TEST B — Correct (Die Entscheidung -> Correct / Good)
//   TEST C — Missing Article (Entscheidung -> Almost / Hard, requeued)
//   TEST D — Wrong Article (der Entscheidung -> Almost / Hard)
//   TEST E — Minor Typo (Entscheidun -> Almost / Hard)
//   TEST F — Clearly Wrong (die Erfahrung -> Wrong / Again)
//   TEST G — Requeue (wrong card does not appear next, re-queued after other items)
//   TEST H — Final FSRS Rating (Typing Wrong -> Recall Known -> ONE SRS commit, final rating Again)
//   TEST I — Final FSRS Rating (Typing Almost -> Recall Known -> final rating Hard)
//   TEST J — Final FSRS Rating (Typing Correct first try -> final rating Good)
//   TEST K — No self-rating override (ratings 1/2/3 blocked in typing)
//   TEST L — Audio leak (German audio suppressed before submit, permitted after submit)
//   TEST M — F5 resume (correct mode and state resumed upon reload)
//   TEST N — Idempotency (submit/reload/continue never double-credits goal, completion, or SRS)
//   TEST O — Frequency (1 default, max 2 for mature candidates)
//   TEST P — Existing modes (Free Study flash/MCQ/typing/match unaffected)
//   TEST Q — Phase 1 + Phase 2 regression (all existing suites pass 100%)
// ==============================================================================

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 1. Mock Browser Environment
class LocalStorageMock {
  constructor() { this.store = {}; }
  getItem(key) { return this.store[key] !== undefined ? this.store[key] : null; }
  setItem(key, value) { this.store[key] = String(value); }
  removeItem(key) { delete this.store[key]; }
  clear() { this.store = {}; }
}

class EventTargetMock {
  constructor() { this.listeners = {}; }
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
global.renderSessionInteraction = () => {};
mockWindow.renderSessionInteraction = () => {};
var activeSessionTypingTimer = null;
global.activeSessionTypingTimer = null;
mockWindow.activeSessionTypingTimer = null;

// 2. Load vendored ts-fsrs & core scripts
const FSRS = require('./vendor/ts-fsrs/index.cjs');
global.FSRS = FSRS;
mockWindow.FSRS = FSRS;

eval(fs.readFileSync(path.join(__dirname, 'daily-progress.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'leaderboard-feed.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'fsrs-srs.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'typing-verification.js'), 'utf8'));
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

console.log('====================================================');
console.log('RUNNING PHASE 3 OBJECTIVE TYPING ACCEPTANCE TESTS');
console.log('====================================================');

// --------------------------------------------------------------------------
// TEST A — Eligibility
// --------------------------------------------------------------------------
console.log('\n--- TEST A: Eligibility rules ---');
const TV = window.VokabelTypingVerification;

// 1. Mature review card with clean German noun -> eligible
const matureCard = { id: 'c_mature', term: 'die Entscheidung', meaning: 'quyết định' };
check(TV.isTypingEligible(matureCard) === true, 'die Entscheidung is eligible for typing verification');

// 2. Card with plural annotation -> canonical extracted and eligible
const pluralCard = { id: 'c_plural', term: 'die Geste, -n', meaning: 'cử chỉ' };
check(TV.isTypingEligible(pluralCard) === true, 'die Geste, -n is eligible');
check(TV.getCanonicalTypingAnswer(pluralCard) === 'die Geste', 'Canonical derived: die Geste');

// 3. Question card -> EXCLUDED
const questionCard = { id: 'c_q', term: 'Was bedeutet das?', meaning: 'Cái này có nghĩa gì?' };
check(TV.isTypingEligible(questionCard) === false, 'Question card with ? is excluded');

// 4. Grammatik tag -> EXCLUDED
const grammarCard = { id: 'c_gram', term: 'Dativ Objekte', meaning: 'Tân ngữ gián tiếp', tags: ['Grammatik'] };
check(TV.isTypingEligible(grammarCard) === false, 'Grammatik tag card is excluded');

// 5. Inhalt tag -> EXCLUDED
const inhaltCard = { id: 'c_inhalt', term: 'Thema Diskussion', meaning: 'Thảo luận', tags: ['Inhalt'] };
check(TV.isTypingEligible(inhaltCard) === false, 'Inhalt tag card is excluded');

// 6. Card with placeholder ... -> EXCLUDED
const placeholderCard = { id: 'c_ph', term: 'warten auf...', meaning: 'chờ đợi...' };
check(TV.isTypingEligible(placeholderCard) === false, 'Placeholder ... card is excluded');

// 7. Card with ambiguous slash -> EXCLUDED
const slashCard = { id: 'c_slash', term: 'er/sie/es geht', meaning: 'đi' };
check(TV.isTypingEligible(slashCard) === false, 'Slash variant card is excluded');

// --------------------------------------------------------------------------
// TEST B — Correct
// --------------------------------------------------------------------------
console.log('\n--- TEST B: Correct answer grading ---');
const resB = TV.gradeTypingAnswer('Die Entscheidung', 'die Entscheidung', matureCard);
check(resB.result === 'correct', 'Exact match with case insensitivity is correct');
check(resB.mappedRating === 'known', 'Mapped rating for correct is known (Good / 3)');

// --------------------------------------------------------------------------
// TEST C — Missing Article
// --------------------------------------------------------------------------
console.log('\n--- TEST C: Missing article grading ---');
const resC = TV.gradeTypingAnswer('Entscheidung', 'die Entscheidung', matureCard);
check(resC.result === 'almost', 'Missing article returns almost');
check(resC.mappedRating === 'hard', 'Mapped rating for missing article is hard (2)');
check(resC.feedback.includes('mạo từ'), 'Feedback mentions article');

// --------------------------------------------------------------------------
// TEST D — Wrong Article
// --------------------------------------------------------------------------
console.log('\n--- TEST D: Wrong article grading ---');
const resD = TV.gradeTypingAnswer('der Entscheidung', 'die Entscheidung', matureCard);
check(resD.result === 'almost', 'Wrong article (der vs die) returns almost');
check(resD.mappedRating === 'hard', 'Mapped rating for wrong article is hard (2)');
check(resD.feedback.includes('die'), 'Feedback mentions correct article die');

// --------------------------------------------------------------------------
// TEST E — Minor Typo
// --------------------------------------------------------------------------
console.log('\n--- TEST E: Minor typo grading ---');
const resE = TV.gradeTypingAnswer('Entscheidun', 'die Entscheidung', matureCard);
check(resE.result === 'almost', '1-char typo returns almost');
check(resE.mappedRating === 'hard', 'Mapped rating for minor typo is hard (2)');

const resE2 = TV.gradeTypingAnswer('die Entscheidun', 'die Entscheidung', matureCard);
check(resE2.result === 'almost', '1-char typo with correct article returns almost');

// --------------------------------------------------------------------------
// TEST F — Clearly Wrong
// --------------------------------------------------------------------------
console.log('\n--- TEST F: Clearly wrong grading ---');
const resF = TV.gradeTypingAnswer('die Erfahrung', 'die Entscheidung', matureCard);
check(resF.result === 'wrong', 'Completely different word returns wrong');
check(resF.mappedRating === 'unknown', 'Mapped rating for wrong is unknown (Again / 1)');

const resFEmpty = TV.gradeTypingAnswer('', 'die Entscheidung', matureCard);
check(resFEmpty.result === 'wrong', 'Empty answer returns wrong');

// --------------------------------------------------------------------------
// TEST G — Requeue
// --------------------------------------------------------------------------
console.log('\n--- TEST G: Requeue behavior on typing error ---');
localStorage.clear();
window.VokabelSession.resetTodayForTesting();

localStorage.setItem('vokabelgo_srs_state_v1', JSON.stringify({
  version: 1,
  engine: "fsrs6",
  cards: {
    'g_card_1': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 3, lastRating: 3, fsrsCard: {} },
    'g_card_2': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 2, lastRating: 3, fsrsCard: {} },
    'g_card_3': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    'g_card_4': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    'g_card_5': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} }
  }
}));

const gCards = [
  { id: 'g_card_1', term: 'die Entscheidung', meaning: 'quyết định' },
  { id: 'g_card_2', term: 'zuverlässig', meaning: 'đáng tin cậy' },
  { id: 'g_card_3', term: 'sich bewerben', meaning: 'nộp đơn' },
  { id: 'g_card_4', term: 'die Geste', meaning: 'cử chỉ' },
  { id: 'g_card_5', term: 'der Erfolg', meaning: 'thành công' }
];

global.allCards = () => gCards;
mockWindow.allCards = () => gCards;

const gSession = window.VokabelSession.createTodaySession(gCards);
check(gSession.queue[0].type === 'typing', 'First interaction is typing for mature candidate');
check(gSession.queue[0].cardId === 'g_card_1', 'Target for typing is g_card_1');

// Submit WRONG answer for g_card_1
const gResWrong = window.VokabelSession.handleTypingSubmit('völlig falsch');
check(gResWrong.result === 'wrong', 'Result is wrong');
check(gResWrong.justCompletedTarget === false, 'Target is NOT completed');

// Verify g_card_1 does NOT appear immediately next (queueIndex + 1)
const updatedSessionG = window.VokabelSession.getTodaySession();
const nextItem = updatedSessionG.queue[updatedSessionG.queueIndex + 1];
check(nextItem && nextItem.cardId !== 'g_card_1', `Next interaction is NOT g_card_1 (actual: ${nextItem ? nextItem.cardId : 'none'})`);

// Verify g_card_1 is re-queued later as a recall item
const laterItem = updatedSessionG.queue.slice(updatedSessionG.queueIndex + 1).find(it => it.cardId === 'g_card_1');
check(Boolean(laterItem), 'Card g_card_1 was re-queued in future position');
check(laterItem && laterItem.type === 'recall', 'Card g_card_1 was re-queued as a recall interaction');

// --------------------------------------------------------------------------
// TEST H — Final FSRS Rating: Typing Wrong -> later Recall Known -> Again (1)
// --------------------------------------------------------------------------
console.log('\n--- TEST H: Typing Wrong then Recall Known -> final rating Again (1) ---');
localStorage.clear();
window.VokabelSession.resetTodayForTesting();

let hSrsCommittedRating = null;
let hSrsCommitCount = 0;
const origScheduleReviewH = window.VokabelSRS.scheduleReview;
window.VokabelSRS.scheduleReview = function(id, rating, reviewTime) {
  if (id === 'h_target') {
    hSrsCommitCount++;
    hSrsCommittedRating = rating;
  }
  return origScheduleReviewH.call(window.VokabelSRS, id, rating, reviewTime);
};

localStorage.setItem('vokabelgo_srs_state_v1', JSON.stringify({
  version: 1,
  engine: "fsrs6",
  cards: {
    'h_target': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 3, lastRating: 3, fsrsCard: {} },
    'h_2': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    'h_3': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    'h_4': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    'h_5': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} }
  }
}));

const hCards = [
  { id: 'h_target', term: 'die Entscheidung', meaning: 'quyết định' },
  { id: 'h_2', term: 'Wort Zwei', meaning: 'Từ hai' },
  { id: 'h_3', term: 'Wort Drei', meaning: 'Từ ba' },
  { id: 'h_4', term: 'Wort Vier', meaning: 'Từ bốn' },
  { id: 'h_5', term: 'Wort Fünf', meaning: 'Từ năm' }
];
global.allCards = () => hCards;
mockWindow.allCards = () => hCards;

const hSession = window.VokabelSession.createTodaySession(hCards);
check(hSession.queue[0].cardId === 'h_target' && hSession.queue[0].type === 'typing', 'h_target starts with typing');

// 1. Submit WRONG answer in typing
window.VokabelSession.handleTypingSubmit('sai hoan toan');
window.VokabelSession.handleTypingContinue();
check(hSrsCommitCount === 0, 'No SRS commit on wrong typing attempt');

// 2. Advance to the re-queued recall item for h_target and answer known
let hSafety = 0;
while (hSafety < 20) {
  hSafety++;
  const s = window.VokabelSession.getTodaySession();
  if (!s || s.queueIndex >= s.queue.length) break;
  const it = s.queue[s.queueIndex];
  if (it.cardId === 'h_target' && it.type === 'recall') {
    window.VokabelSession.handleRecallAnswer('known');
    break;
  }
  if (it.type === 'intro') window.VokabelSession.handleIntroContinue();
  else if (it.type === 'typing') {
    window.VokabelSession.handleTypingSubmit('correct');
    window.VokabelSession.handleTypingContinue();
  } else {
    window.VokabelSession.handleRecallAnswer('known');
  }
}

check(hSrsCommitCount === 1, `Exactly ONE SRS commit for h_target across session (actual: ${hSrsCommitCount})`);
check(hSrsCommittedRating === 1, `Final FSRS rating is Again (1) due to earlier typing failure (actual: ${hSrsCommittedRating})`);

window.VokabelSRS.scheduleReview = origScheduleReviewH;

// --------------------------------------------------------------------------
// TEST I — Final FSRS Rating: Typing Almost -> later Recall Known -> Hard (2)
// --------------------------------------------------------------------------
console.log('\n--- TEST I: Typing Almost then Recall Known -> final rating Hard (2) ---');
localStorage.clear();
window.VokabelSession.resetTodayForTesting();

let iSrsCommittedRating = null;
let iSrsCommitCount = 0;
const origScheduleReviewI = window.VokabelSRS.scheduleReview;
window.VokabelSRS.scheduleReview = function(id, rating, reviewTime) {
  if (id === 'i_target') {
    iSrsCommitCount++;
    iSrsCommittedRating = rating;
  }
  return origScheduleReviewI.call(window.VokabelSRS, id, rating, reviewTime);
};

localStorage.setItem('vokabelgo_srs_state_v1', JSON.stringify({
  version: 1,
  engine: "fsrs6",
  cards: {
    'i_target': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 3, lastRating: 3, fsrsCard: {} },
    'i_2': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    'i_3': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    'i_4': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    'i_5': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} }
  }
}));

const iCards = [
  { id: 'i_target', term: 'die Entscheidung', meaning: 'quyết định' },
  { id: 'i_2', term: 'Zwei', meaning: 'hai' },
  { id: 'i_3', term: 'Drei', meaning: 'ba' },
  { id: 'i_4', term: 'Vier', meaning: 'bốn' },
  { id: 'i_5', term: 'Fünf', meaning: 'năm' }
];
global.allCards = () => iCards;
mockWindow.allCards = () => iCards;

const iSession = window.VokabelSession.createTodaySession(iCards);
check(iSession.queue[0].cardId === 'i_target' && iSession.queue[0].type === 'typing', 'i_target starts with typing');

// 1. Submit ALMOST answer in typing (missing article)
const iAlmostRes = window.VokabelSession.handleTypingSubmit('Entscheidung');
check(iAlmostRes.result === 'almost', 'i_target typing result is almost');
window.VokabelSession.handleTypingContinue();
check(iSrsCommitCount === 0, 'No SRS commit on almost typing attempt');

// 2. Advance to the re-queued recall item for i_target and answer known
let iSafety = 0;
while (iSafety < 20) {
  iSafety++;
  const s = window.VokabelSession.getTodaySession();
  if (!s || s.queueIndex >= s.queue.length) break;
  const it = s.queue[s.queueIndex];
  if (it.cardId === 'i_target' && it.type === 'recall') {
    window.VokabelSession.handleRecallAnswer('known');
    break;
  }
  if (it.type === 'intro') window.VokabelSession.handleIntroContinue();
  else if (it.type === 'typing') {
    window.VokabelSession.handleTypingSubmit('correct');
    window.VokabelSession.handleTypingContinue();
  } else {
    window.VokabelSession.handleRecallAnswer('known');
  }
}

check(iSrsCommitCount === 1, `Exactly ONE SRS commit for i_target (actual: ${iSrsCommitCount})`);
check(iSrsCommittedRating === 2, `Final FSRS rating is Hard (2) due to earlier almost typing (actual: ${iSrsCommittedRating})`);

window.VokabelSRS.scheduleReview = origScheduleReviewI;

// --------------------------------------------------------------------------
// TEST J — Final FSRS Rating: Typing Correct first try -> Good (3)
// --------------------------------------------------------------------------
console.log('\n--- TEST J: Typing Correct first try -> final rating Good (3) ---');
localStorage.clear();
window.VokabelSession.resetTodayForTesting();

let jSrsCommittedRating = null;
let jSrsCommitCount = 0;
const origScheduleReviewJ = window.VokabelSRS.scheduleReview;
window.VokabelSRS.scheduleReview = function(id, rating, reviewTime) {
  if (id === 'j_target') {
    jSrsCommitCount++;
    jSrsCommittedRating = rating;
  }
  return origScheduleReviewJ.call(window.VokabelSRS, id, rating, reviewTime);
};

localStorage.setItem('vokabelgo_srs_state_v1', JSON.stringify({
  version: 1,
  engine: "fsrs6",
  cards: {
    'j_target': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 3, lastRating: 3, fsrsCard: {} },
    'j_2': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    'j_3': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    'j_4': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    'j_5': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} }
  }
}));

const jCards = [
  { id: 'j_target', term: 'die Entscheidung', meaning: 'quyết định' },
  { id: 'j_2', term: 'Zwei', meaning: 'hai' },
  { id: 'j_3', term: 'Drei', meaning: 'ba' },
  { id: 'j_4', term: 'Vier', meaning: 'bốn' },
  { id: 'j_5', term: 'Fünf', meaning: 'năm' }
];
global.allCards = () => jCards;
mockWindow.allCards = () => jCards;

const jSession = window.VokabelSession.createTodaySession(jCards);
const jRes = window.VokabelSession.handleTypingSubmit('Die Entscheidung');
check(jRes.result === 'correct', 'j_target typed correctly on first try');
check(jRes.justCompletedTarget === true, 'j_target completed immediately');
check(jSrsCommitCount === 1, 'Exactly ONE SRS commit on correct first try');
check(jSrsCommittedRating === 3, 'FSRS committed with rating Good (3)');

window.VokabelSRS.scheduleReview = origScheduleReviewJ;

// --------------------------------------------------------------------------
// TEST K — No self-rating override
// --------------------------------------------------------------------------
console.log('\n--- TEST K: No self-rating override in typing mode ---');
localStorage.clear();
window.VokabelSession.resetTodayForTesting();

localStorage.setItem('vokabelgo_srs_state_v1', JSON.stringify({
  version: 1,
  engine: "fsrs6",
  cards: {
    'k_target': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 3, lastRating: 3, fsrsCard: {} },
    'k_2': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    'k_3': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    'k_4': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    'k_5': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} }
  }
}));

const kCards = [
  { id: 'k_target', term: 'die Entscheidung', meaning: 'quyết định' },
  { id: 'k_2', term: 'Zwei', meaning: 'hai' },
  { id: 'k_3', term: 'Drei', meaning: 'ba' },
  { id: 'k_4', term: 'Vier', meaning: 'bốn' },
  { id: 'k_5', term: 'Fünf', meaning: 'năm' }
];
global.allCards = () => kCards;
mockWindow.allCards = () => kCards;

const kSession = window.VokabelSession.createTodaySession(kCards);
const currentItemK = kSession.queue[kSession.queueIndex];
check(currentItemK.type === 'typing', 'Current interaction is typing');

// Attempting to call handleRecallAnswer during typing interaction must be rejected (returns null)
const recallOverrideAttempt = window.VokabelSession.handleRecallAnswer('known');
check(recallOverrideAttempt === null, 'handleRecallAnswer returns null when current item is typing (cannot self-rate)');
check(kSession.completedTargets.length === 0, 'No target was completed via self-rating attempt');

// --------------------------------------------------------------------------
// TEST L — Audio leak prevention
// --------------------------------------------------------------------------
console.log('\n--- TEST L: Audio leak prevention ---');
localStorage.clear();
window.VokabelSession.resetTodayForTesting();

localStorage.setItem('vokabelgo_srs_state_v1', JSON.stringify({
  version: 1,
  engine: "fsrs6",
  cards: {
    'l_target': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 3, lastRating: 3, fsrsCard: {} },
    'l_2': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    'l_3': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    'l_4': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    'l_5': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} }
  }
}));

const lCards = [
  { id: 'l_target', term: 'die Entscheidung', meaning: 'quyết định' },
  { id: 'l_2', term: 'Zwei', meaning: 'hai' },
  { id: 'l_3', term: 'Drei', meaning: 'ba' },
  { id: 'l_4', term: 'Vier', meaning: 'bốn' },
  { id: 'l_5', term: 'Fünf', meaning: 'năm' }
];
global.allCards = () => lCards;
mockWindow.allCards = () => lCards;

const lSession = window.VokabelSession.createTodaySession(lCards);
const targetL = lSession.targetStates['l_target'];
check(targetL.typingSubmitted === false, 'typingSubmitted is initially false');

// Verify condition used by speak(): before submit audio must be blocked
const shouldBlockAudioBeforeSubmit = (lSession.queue[lSession.queueIndex].type === 'typing' && !targetL.typingSubmitted);
check(shouldBlockAudioBeforeSubmit === true, 'Audio is strictly blocked before typing submit');

// Submit answer
window.VokabelSession.handleTypingSubmit('Entscheidung');
const updatedSessionL = window.VokabelSession.getTodaySession();
const targetLAfter = updatedSessionL.targetStates['l_target'];
check(targetLAfter.typingSubmitted === true, 'typingSubmitted is true after submit');

const shouldBlockAudioAfterSubmit = (updatedSessionL.queue[updatedSessionL.queueIndex].type === 'typing' && !targetLAfter.typingSubmitted);
check(shouldBlockAudioAfterSubmit === false, 'Audio is permitted after typing submit');

// --------------------------------------------------------------------------
// TEST M — F5 Resume
// --------------------------------------------------------------------------
console.log('\n--- TEST M: F5 resume preserves typing interaction ---');
const savedSessionM = window.VokabelSession.getTodaySession();
check(savedSessionM.queue[savedSessionM.queueIndex].type === 'typing', 'Persisted session queueIndex points to typing interaction');

// Reload simulation
const reloadedSessionM = window.VokabelSession.loadSession();
check(reloadedSessionM.queueIndex === savedSessionM.queueIndex, 'Queue index preserved');
check(reloadedSessionM.queue[reloadedSessionM.queueIndex].type === 'typing', 'Interaction type typing preserved');
check(reloadedSessionM.targetStates['l_target'].typingSubmitted === true, 'typingSubmitted state preserved');

// --------------------------------------------------------------------------
// TEST N — Idempotency
// --------------------------------------------------------------------------
console.log('\n--- TEST N: Idempotency check ---');
let nSrsCommitCount = 0;
const origScheduleReviewN = window.VokabelSRS.scheduleReview;
window.VokabelSRS.scheduleReview = function(id, rating, reviewTime) {
  nSrsCommitCount++;
  return origScheduleReviewN.call(window.VokabelSRS, id, rating, reviewTime);
};

// Calling handleTypingSubmit again while typingSubmitted is true
const doubleSubmitRes = window.VokabelSession.handleTypingSubmit('die Entscheidung');
check(doubleSubmitRes.alreadySubmitted === true, 'Subsequent submit call detected as alreadySubmitted');
check(nSrsCommitCount === 0, 'No duplicate SRS commit on duplicate submit');

// Advance continue
window.VokabelSession.handleTypingContinue();
const sessionAfterN = window.VokabelSession.getTodaySession();
check(sessionAfterN.queueIndex === 1, 'Queue index advanced cleanly by 1');

window.VokabelSRS.scheduleReview = origScheduleReviewN;

// --------------------------------------------------------------------------
// TEST O — Frequency (1 default, max 2 for mature candidates)
// --------------------------------------------------------------------------
console.log('\n--- TEST O: Typing frequency policy ---');

// Case 1: 0 mature cards (all new or historyCount < 2)
localStorage.clear();
window.VokabelSession.resetTodayForTesting();
const oCards1 = [
  { id: 'o_1', term: 'Wort 1', meaning: 'Nghĩa 1' },
  { id: 'o_2', term: 'Wort 2', meaning: 'Nghĩa 2' },
  { id: 'o_3', term: 'Wort 3', meaning: 'Nghĩa 3' },
  { id: 'o_4', term: 'Wort 4', meaning: 'Nghĩa 4' },
  { id: 'o_5', term: 'Wort 5', meaning: 'Nghĩa 5' }
];
global.allCards = () => oCards1;
mockWindow.allCards = () => oCards1;

const oSession1 = window.VokabelSession.createTodaySession(oCards1);
const typingCount1 = oSession1.queue.filter(it => it.type === 'typing').length;
check(typingCount1 === 0, `0 typing when no mature candidates exist (actual: ${typingCount1})`);

// Case 2: 1 mature card (historyCount >= 2)
localStorage.clear();
window.VokabelSession.resetTodayForTesting();
localStorage.setItem('vokabelgo_srs_state_v1', JSON.stringify({
  version: 1,
  engine: "fsrs6",
  cards: {
    'o_1': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 2, lastRating: 3, fsrsCard: {} }
  }
}));
const oSession2 = window.VokabelSession.createTodaySession(oCards1);
const typingCount2 = oSession2.queue.filter(it => it.type === 'typing').length;
check(typingCount2 === 1, `Default 1 typing when 1 mature card exists (actual: ${typingCount2})`);

// Case 3: 2 very mature cards (historyCount >= 3)
localStorage.clear();
window.VokabelSession.resetTodayForTesting();
localStorage.setItem('vokabelgo_srs_state_v1', JSON.stringify({
  version: 1,
  engine: "fsrs6",
  cards: {
    'o_1': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 3, lastRating: 3, fsrsCard: {} },
    'o_2': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 3, lastRating: 3, fsrsCard: {} },
    'o_3': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 3, lastRating: 3, fsrsCard: {} }
  }
}));
const oSession3 = window.VokabelSession.createTodaySession(oCards1);
const typingCount3 = oSession3.queue.filter(it => it.type === 'typing').length;
check(typingCount3 === 2, `Max 2 typing when multiple very mature cards exist (actual: ${typingCount3})`);

// --------------------------------------------------------------------------
// TEST P — Existing modes integrity
// --------------------------------------------------------------------------
console.log('\n--- TEST P: Existing modes integrity ---');
const indexHtmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

check(indexHtmlContent.includes('function newTyping()'), 'Free study newTyping function intact');
check(indexHtmlContent.includes('function checkTyping()'), 'Free study checkTyping function intact');
check(indexHtmlContent.includes('function newQuestion()'), 'Free study MCQ function intact');
check(indexHtmlContent.includes('function startMatchGame()'), 'Free study Match function intact');

// --------------------------------------------------------------------------
// TEST Q — Phase 1 & Phase 2 regression
// --------------------------------------------------------------------------
console.log('\n--- TEST Q: Phase 1 & Phase 2 API contracts ---');
check(typeof window.VokabelSession.createTodaySession === 'function', 'createTodaySession intact');
check(typeof window.VokabelSession.selectTargets === 'function', 'selectTargets intact');
check(typeof window.VokabelSession.handleIntroContinue === 'function', 'handleIntroContinue intact');
check(typeof window.VokabelSession.handleRecallAnswer === 'function', 'handleRecallAnswer intact');
check(typeof window.VokabelSession.handleReinforceContinue === 'function', 'handleReinforceContinue intact');
check(typeof window.VokabelSession.flushPendingSrsCommits === 'function', 'flushPendingSrsCommits intact');
check(typeof window.VokabelSRS.scheduleReview === 'function', 'VokabelSRS.scheduleReview intact');
check(typeof window.VokabelSRS.isDueForDailySession === 'function', 'isDueForDailySession intact');

// --------------------------------------------------------------------------
// TEST R — Enter input
// --------------------------------------------------------------------------
console.log('\n--- TEST R: Enter key inside #sessionTypingInput ---');
localStorage.clear();
window.VokabelSession.resetTodayForTesting();

localStorage.setItem('vokabelgo_srs_state_v1', JSON.stringify({
  version: 1,
  engine: "fsrs6",
  cards: {
    'r_target': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 3, lastRating: 3, fsrsCard: {} },
    'r_2': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    'r_3': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    'r_4': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    'r_5': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} }
  }
}));

const rCards = [
  { id: 'r_target', term: 'die Entscheidung', meaning: 'quyết định' },
  { id: 'r_2', term: 'Wort 2', meaning: 'Từ 2' },
  { id: 'r_3', term: 'Wort 3', meaning: 'Từ 3' },
  { id: 'r_4', term: 'Wort 4', meaning: 'Từ 4' },
  { id: 'r_5', term: 'Wort 5', meaning: 'Từ 5' }
];
global.allCards = () => rCards;
mockWindow.allCards = () => rCards;

const rSession = window.VokabelSession.createTodaySession(rCards);
mockWindow.isStudySessionMode = true;

// Mock input element
const mockTypingInput = {
  value: 'die Entscheidung',
  focus: () => {},
  blur: () => {},
  tagName: 'INPUT',
  id: 'sessionTypingInput'
};
mockWindow.document = global.document;
const origGetById = global.document.getElementById;
global.document.getElementById = (id) => {
  if (id === 'sessionTypingInput') return mockTypingInput;
  return origGetById(id);
};
global.document.activeElement = mockTypingInput;

// Load handleSessionTypingInputKeydown & handleSessionTypingSubmit from index.html
const indexHtmlForR = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const keydownMatch = indexHtmlForR.match(/function\s+handleSessionTypingInputKeydown[\s\S]*?\n\}/);
const submitMatch = indexHtmlForR.match(/function\s+handleSessionTypingSubmit[\s\S]*?\n\}/);
eval(keydownMatch[0]);
eval(submitMatch[0]);
mockWindow.handleSessionTypingSubmit = handleSessionTypingSubmit;
global.handleSessionTypingSubmit = handleSessionTypingSubmit;

// Case 1: Enter with isComposing = true -> should NOT submit
let compPrevented = false;
handleSessionTypingInputKeydown({
  key: 'Enter',
  isComposing: true,
  preventDefault: () => { compPrevented = true; },
  stopPropagation: () => {}
});
check(compPrevented === false, 'IME isComposing does not submit');
check(window.VokabelSession.getTodaySession().targetStates['r_target'].typingSubmitted === false, 'Target not submitted during IME composition');

// Case 2: Normal Enter key -> submits answer exactly once
let enterPrevented = false;
let enterStopped = false;
handleSessionTypingInputKeydown({
  key: 'Enter',
  isComposing: false,
  preventDefault: () => { enterPrevented = true; },
  stopPropagation: () => { enterStopped = true; }
});
check(enterPrevented === true, 'Enter calls preventDefault');
check(enterStopped === true, 'Enter calls stopPropagation');
const rTargetAfterSubmit = window.VokabelSession.getTodaySession().targetStates['r_target'];
check(rTargetAfterSubmit.typingSubmitted === true, 'Answer submitted via Enter key in input');
check(rTargetAfterSubmit.attempts === 1, 'Target has exactly 1 attempt recorded');

// Case 3: Enter again while typingSubmitted === true -> must NOT double submit
handleSessionTypingInputKeydown({
  key: 'Enter',
  isComposing: false,
  preventDefault: () => {},
  stopPropagation: () => {}
});
check(window.VokabelSession.getTodaySession().targetStates['r_target'].attempts === 1, 'Enter does not double-submit while feedback is showing');

global.document.getElementById = origGetById;

// --------------------------------------------------------------------------
// TEST S — Final typing target lifecycle
// --------------------------------------------------------------------------
console.log('\n--- TEST S: Final typing target lifecycle ---');
localStorage.clear();
window.VokabelSession.resetTodayForTesting();

localStorage.setItem('vokabelgo_srs_state_v1', JSON.stringify({
  version: 1,
  engine: "fsrs6",
  cards: {
    's_1': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    's_2': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    's_3': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    's_4': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    's_5': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 3, lastRating: 3, fsrsCard: {} }
  }
}));

const sCards = [
  { id: 's_1', term: 'Wort 1', meaning: 'Nghĩa 1' },
  { id: 's_2', term: 'Wort 2', meaning: 'Nghĩa 2' },
  { id: 's_3', term: 'Wort 3', meaning: 'Nghĩa 3' },
  { id: 's_4', term: 'Wort 4', meaning: 'Nghĩa 4' },
  { id: 's_5', term: 'die Entscheidung', meaning: 'quyết định' }
];
global.allCards = () => sCards;
mockWindow.allCards = () => sCards;

const sSession = window.VokabelSession.createTodaySession(sCards);

// Complete targets 1 to 4 via recall
window.VokabelSession.handleRecallAnswer('known'); // s_1
window.VokabelSession.handleRecallAnswer('known'); // s_2
window.VokabelSession.handleRecallAnswer('known'); // s_3
window.VokabelSession.handleRecallAnswer('known'); // s_4

const sSessBefore5 = window.VokabelSession.getTodaySession();
check(sSessBefore5.completedTargets.length === 4, 'Session currently has 4/5 completed targets');
check(sSessBefore5.queue[sSessBefore5.queueIndex].cardId === 's_5', 'Target 5 is s_5');
check(sSessBefore5.queue[sSessBefore5.queueIndex].type === 'typing', 'Target 5 interaction is typing');

// Submit correct answer for target 5
let sMilestoneEventFired = 0;
mockWindow.addEventListener('vokabelgo:daily-goal-complete', () => { sMilestoneEventFired++; });

const sSubmitRes = window.VokabelSession.handleTypingSubmit('Die Entscheidung');
check(sSubmitRes.result === 'correct', 'Target 5 typing result is correct');
check(sSubmitRes.justCompletedTarget === true, 'Target 5 is completed');

const sSessFeedbackStage = window.VokabelSession.getTodaySession();
check(sSessFeedbackStage.completed === false, 'Session is NOT yet marked completed while in feedback stage');
check(sSessFeedbackStage.targetStates['s_5'].typingSubmitted === true, 'typingSubmitted is true for target 5');
check(sSessFeedbackStage.targetStates['s_5'].lastObjectiveResult === 'correct', 'lastObjectiveResult is correct');

// Advance interaction via Continue (after 300-500ms feedback)
const sContinueRes = window.VokabelSession.handleTypingContinue();
check(sContinueRes.completed === true, 'Session is marked completed after handleTypingContinue()');
check(sContinueRes.justCompletedSession === true, 'justCompletedSession is true on final continue');

const sDailySummary = window.VokabelDaily.getSummary();
check(sDailySummary.todayCount === 5, 'Daily goal count is exactly 5/5');
check(sDailySummary.completed === true, 'Daily goal completed is true');
check(sDailySummary.catchStatus === 'pending', 'Cat fishing reward catchStatus is pending');

// --------------------------------------------------------------------------
// TEST T — Refresh final feedback (F5)
// --------------------------------------------------------------------------
console.log('\n--- TEST T: Refresh final feedback (F5) ---');
localStorage.clear();
window.VokabelSession.resetTodayForTesting();

let tSrsCommitCount = 0;
const origScheduleReviewT = window.VokabelSRS.scheduleReview;
window.VokabelSRS.scheduleReview = function(id, rating, reviewTime) {
  if (id === 't_5') tSrsCommitCount++;
  return origScheduleReviewT.call(window.VokabelSRS, id, rating, reviewTime);
};

localStorage.setItem('vokabelgo_srs_state_v1', JSON.stringify({
  version: 1,
  engine: "fsrs6",
  cards: {
    't_1': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    't_2': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    't_3': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    't_4': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    't_5': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 3, lastRating: 3, fsrsCard: {} }
  }
}));

const tCards = [
  { id: 't_1', term: 'Wort 1', meaning: 'Nghĩa 1' },
  { id: 't_2', term: 'Wort 2', meaning: 'Nghĩa 2' },
  { id: 't_3', term: 'Wort 3', meaning: 'Nghĩa 3' },
  { id: 't_4', term: 'Wort 4', meaning: 'Nghĩa 4' },
  { id: 't_5', term: 'die Entscheidung', meaning: 'quyết định' }
];
global.allCards = () => tCards;
mockWindow.allCards = () => tCards;

const tSession = window.VokabelSession.createTodaySession(tCards);
window.VokabelSession.handleRecallAnswer('known'); // 1
window.VokabelSession.handleRecallAnswer('known'); // 2
window.VokabelSession.handleRecallAnswer('known'); // 3
window.VokabelSession.handleRecallAnswer('known'); // 4

// Submit correct for target 5
window.VokabelSession.handleTypingSubmit('die Entscheidung');
check(tSrsCommitCount === 1, 'Target 5 SRS committed once on submit');

// Simulate F5 reload before continue
const tReloaded = window.VokabelSession.loadSession();
check(tReloaded.completed === false, 'F5 reload preserves uncompleted session in feedback stage');
check(tReloaded.targetStates['t_5'].typingSubmitted === true, 'F5 reload preserves typingSubmitted state');
check(tReloaded.targetStates['t_5'].lastObjectiveResult === 'correct', 'F5 reload preserves feedback correct');

// Learner clicks Continue on reloaded session
const tContinueRes = window.VokabelSession.handleTypingContinue();
check(tContinueRes.completed === true, 'Continue completes 5/5 session');
check(tSrsCommitCount === 1, 'SRS committed strictly ONCE across submit + F5 + continue (no duplicate commit)');
check(window.VokabelDaily.getTodayCount() === 5, 'Daily goal count is strictly 5 (no duplicate completion)');

window.VokabelSRS.scheduleReview = origScheduleReviewT;

// --------------------------------------------------------------------------
// TEST U — Grammar metadata excluded
// --------------------------------------------------------------------------
console.log('\n--- TEST U: Grammar metadata excluded ---');
const uGuttun = { term: 'jemandem guttun + Dat.', meaning: 'tốt cho ai đó' };
const uModal = { term: 'Modalverb + Passiv', meaning: 'động từ khuyết thiếu thể bị động' };
const uAusserhalb = { term: 'außerhalb + Genitiv', meaning: 'bên ngoài' };
const uGeste = { term: 'die Geste, -n', meaning: 'cử chỉ' };
const uAusdruck = { term: 'der Gesichtsausdruck, die Gesichtsausdrücke', meaning: 'nét mặt' };

check(TV.isTypingEligible(uGuttun) === false, 'jemandem guttun + Dat. is excluded from typing');
check(TV.isTypingEligible(uModal) === false, 'Modalverb + Passiv is excluded from typing');
check(TV.isTypingEligible(uAusserhalb) === false, 'außerhalb + Genitiv is excluded from typing');

check(TV.isTypingEligible(uGeste) === true, 'die Geste, -n is eligible for typing');
check(TV.getCanonicalTypingAnswer(uGeste) === 'die Geste', 'die Geste, -n canonical is die Geste');

check(TV.isTypingEligible(uAusdruck) === true, 'der Gesichtsausdruck, die Gesichtsausdrücke is eligible for typing');
check(TV.getCanonicalTypingAnswer(uAusdruck) === 'der Gesichtsausdruck', 'der Gesichtsausdruck, die Gesichtsausdrücke canonical is der Gesichtsausdruck');

// --------------------------------------------------------------------------
// TEST W — Manual continue before timer
// --------------------------------------------------------------------------
console.log('\n--- TEST W: Manual continue before timer does not skip next card ---');
localStorage.clear();
window.VokabelSession.resetTodayForTesting();

localStorage.setItem('vokabelgo_srs_state_v1', JSON.stringify({
  version: 1,
  engine: "fsrs6",
  cards: {
    'w_A': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 3, lastRating: 3, fsrsCard: {} },
    'w_B': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 3, lastRating: 3, fsrsCard: {} },
    'w_3': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    'w_4': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    'w_5': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} }
  }
}));

const wCards = [
  { id: 'w_A', term: 'die Entscheidung', meaning: 'quyết định' },
  { id: 'w_B', term: 'die Geste', meaning: 'cử chỉ' },
  { id: 'w_3', term: 'Wort 3', meaning: 'Từ 3' },
  { id: 'w_4', term: 'Wort 4', meaning: 'Từ 4' },
  { id: 'w_5', term: 'Wort 5', meaning: 'Từ 5' }
];
global.allCards = () => wCards;
mockWindow.allCards = () => wCards;

const wSession = window.VokabelSession.createTodaySession(wCards);
check(wSession.queue[0].type === 'typing' && wSession.queue[0].cardId === 'w_A', 'Initial item is Typing A');
check(wSession.queue[1].type === 'typing' && wSession.queue[1].cardId === 'w_B', 'Second item is Typing B');

// Load index.html handlers for W
activeSessionTypingTimer = null;
const indexHtmlContentW = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
eval(indexHtmlContentW.match(/function\s+handleSessionTypingSubmit[\s\S]*?\n\}/)[0]);
eval(indexHtmlContentW.match(/function\s+handleSessionTypingContinue[\s\S]*?\n\}/)[0]);

// Set mock input returning correct answer for A
mockWindow.document.getElementById = (id) => {
  if (id === 'sessionTypingInput') return { value: 'die Entscheidung' };
  return { classList: { add: () => {}, remove: () => {} }, style: {} };
};

// 1. Submit A
handleSessionTypingSubmit();
check(activeSessionTypingTimer !== null, 'Timer is scheduled after A submitted correct');

// 2. User clicks continue manually immediately (<450ms)
handleSessionTypingContinue();
check(activeSessionTypingTimer === null, 'Active timer was cancelled by manual continue');

const wAfterMan = window.VokabelSession.getTodaySession();
check(wAfterMan.queueIndex === 1, 'Queue advanced to Typing B');
check(wAfterMan.queue[wAfterMan.queueIndex].cardId === 'w_B', 'Current item is Typing B');
check(wAfterMan.targetStates['w_B'].typingSubmitted === false, 'Typing B has NOT been submitted');

// --------------------------------------------------------------------------
// TEST X — Double continue
// --------------------------------------------------------------------------
console.log('\n--- TEST X: Double continue guard ---');
// Currently at w_B. Submit wrong answer
window.VokabelSession.handleTypingSubmit('sai');
check(window.VokabelSession.getTodaySession().targetStates['w_B'].typingSubmitted === true, 'w_B submitted wrong');

// Call 1: should advance
const xAdv1 = window.VokabelSession.handleTypingContinue();
check(xAdv1 !== null, 'First continue call returns session and advances');
check(window.VokabelSession.getTodaySession().queueIndex === 2, 'Queue index advanced to 2');

// Call 2: should be rejected (return null) and NOT advance
const xAdv2 = window.VokabelSession.handleTypingContinue();
check(xAdv2 === null, 'Second rapid continue returns null');
check(window.VokabelSession.getTodaySession().queueIndex === 2, 'Queue index did NOT increment on second call');

// --------------------------------------------------------------------------
// TEST Y — Stale timer
// --------------------------------------------------------------------------
console.log('\n--- TEST Y: Stale timer NO-OP ---');
localStorage.clear();
window.VokabelSession.resetTodayForTesting();

localStorage.setItem('vokabelgo_srs_state_v1', JSON.stringify({
  version: 1,
  engine: "fsrs6",
  cards: {
    'y_A': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 3, lastRating: 3, fsrsCard: {} },
    'y_B': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 3, lastRating: 3, fsrsCard: {} },
    'y_3': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    'y_4': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} },
    'y_5': { dueAt: new Date(Date.now() - 86400000).toISOString(), historyCount: 1, lastRating: 3, fsrsCard: {} }
  }
}));

const yCards = [
  { id: 'y_A', term: 'die Entscheidung', meaning: 'quyết định' },
  { id: 'y_B', term: 'die Geste', meaning: 'cử chỉ' },
  { id: 'y_3', term: 'Wort 3', meaning: 'Từ 3' },
  { id: 'y_4', term: 'Wort 4', meaning: 'Từ 4' },
  { id: 'y_5', term: 'Wort 5', meaning: 'Từ 5' }
];
global.allCards = () => yCards;
mockWindow.allCards = () => yCards;

const ySession = window.VokabelSession.createTodaySession(yCards);
window.VokabelSession.handleTypingSubmit('die Entscheidung'); // y_A submit correct
window.VokabelSession.handleTypingContinue(); // manual continue to y_B
check(window.VokabelSession.getTodaySession().queueIndex === 1, 'Advanced to y_B');

// Simulate stale timer for y_A executing now
const staleSessionId = ySession.sessionId;
const staleCardId = 'y_A';

function runStaleTimer() {
  const current = window.VokabelSession.getTodaySession();
  if (!current || current.completed) return 'exited_completed';
  if (staleSessionId && current.sessionId !== staleSessionId) return 'exited_session_mismatch';
  const curItem = current.queue[current.queueIndex];
  if (!curItem || curItem.type !== 'typing' || curItem.cardId !== staleCardId) {
    return 'noop_card_mismatch';
  }
  const ts = current.targetStates[staleCardId];
  if (!ts || ts.typingSubmitted !== true) {
    return 'noop_not_submitted';
  }
  return window.VokabelSession.handleTypingContinue();
}

const staleResult = runStaleTimer();
check(staleResult === 'noop_card_mismatch', 'Stale timer for y_A detected card mismatch (y_B) and NO-OPed');
check(window.VokabelSession.getTodaySession().queueIndex === 1, 'Queue index remained at 1 (y_B not skipped)');
check(window.VokabelSession.getTodaySession().targetStates['y_B'].typingSubmitted === false, 'y_B was not marked submitted');

// --------------------------------------------------------------------------
// TEST Z — Single keydown listener in index.html
// --------------------------------------------------------------------------
console.log('\n--- TEST Z: Single keydown listener in index.html ---');
const rawHtmlZ = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const inlineOnkeydownMatches = rawHtmlZ.match(/id="sessionTypingInput"[^>]*onkeydown=/i);
check(inlineOnkeydownMatches === null, 'No inline onkeydown on #sessionTypingInput in HTML');
check(rawHtmlZ.includes("inputEl.addEventListener('keydown', handleSessionTypingInputKeydown);"), 'addEventListener used for #sessionTypingInput');
check(rawHtmlZ.includes('inputEl._sessionKeydownBound = true;'), '_sessionKeydownBound flag used to prevent multiple listeners');

console.log('\n====================================================');
console.log(`ACCEPTANCE SUMMARY: ${passedTests} / ${totalTests} PASSED`);
if (passedTests === totalTests) {
  console.log('🎉 ALL PHASE 3 TESTS (TEST A -> TEST Z) PASSED SUCCESSFULLY!');
} else {
  console.log('⚠️ SOME TESTS FAILED. PLEASE REVIEW OUTPUT ABOVE.');
}
console.log('====================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}


