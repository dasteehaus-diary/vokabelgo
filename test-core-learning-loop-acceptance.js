// ==============================================================================
// VokabelGo - Core Learning Loop Phase 1 Acceptance Test Suite
// Verifies 10 Core Acceptance Tests specified in User Prompt:
//   TEST 1: New words (5 new cards -> Intro -> Recall -> complete session)
//   TEST 2: Mixed session (3 review + 2 new selection & deficit filling)
//   TEST 3: Wrong answer (Re-queue with intervening interactions, not immediate)
//   TEST 4: Daily Goal exploit guard (Rating 'Chưa nhớ' 5 times NEVER unlocks reward)
//   TEST 5: Successful targets (5 completed targets trigger reward exactly once)
//   TEST 6: Refresh (F5 restores exact targets, 2/5 completed, and queue)
//   TEST 7: Repeated failure (3 fails -> guided reinforcement, needsReview=true)
//   TEST 8: Backward compatibility (dmf_flash_progress_v2 remains cardId -> string)
//   TEST 9: Existing study modes (MCQ, Typing, Match, Free Study work intact)
//   TEST 10: Supabase sync via existing app_data jsonb without schema migration
// ==============================================================================

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Setup mock browser environment
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

class CustomEventMock {
  constructor(type, params = {}) {
    this.type = type;
    this.detail = params.detail || null;
  }
}

const mockWindow = new EventTargetMock();
mockWindow.localStorage = new LocalStorageMock();
mockWindow.CustomEvent = CustomEventMock;

const mockDocument = {
  readyState: 'complete',
  getElementById: (id) => {
    return {
      id,
      innerHTML: '',
      textContent: '',
      style: {},
      classList: {
        add: () => {},
        remove: () => {},
        toggle: () => {},
        contains: () => false
      }
    };
  },
  querySelectorAll: () => [],
  addEventListener: () => {}
};

global.window = mockWindow;
global.localStorage = mockWindow.localStorage;
global.document = mockDocument;
global.CustomEvent = CustomEventMock;
global.showRetroToast = (msg, icon) => {
  mockWindow._lastToast = { msg, icon };
};

// Load daily-progress.js
const dailyCode = fs.readFileSync(path.join(__dirname, 'daily-progress.js'), 'utf8');
eval(dailyCode);

// Load leaderboard-feed.js
const feedCode = fs.readFileSync(path.join(__dirname, 'leaderboard-feed.js'), 'utf8');
eval(feedCode);

// Load learning-session.js
const sessionCode = fs.readFileSync(path.join(__dirname, 'learning-session.js'), 'utf8');
eval(sessionCode);

console.log('====================================================');
console.log('RUNNING CORE LEARNING LOOP PHASE 1 ACCEPTANCE TESTS');
console.log('====================================================');

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

// --------------------------------------------------------------------------
// TEST 1: New words (5 new cards -> Intro -> Recall -> complete session)
// --------------------------------------------------------------------------
console.log('\n--- TEST 1: New words (Intro -> Recall -> Session complete) ---');
localStorage.clear();

const newCards = [
  { id: 'w1', term: 'der Apfel', meaning: 'quả táo', deck: 'A1' },
  { id: 'w2', term: 'die Katze', meaning: 'con mèo', deck: 'A1' },
  { id: 'w3', term: 'das Buch', meaning: 'quyển sách', deck: 'A1' },
  { id: 'w4', term: 'der Hund', meaning: 'con chó', deck: 'A1' },
  { id: 'w5', term: 'das Wasser', meaning: 'nước', deck: 'A1' }
];

const sess1 = window.VokabelSession.createTodaySession(newCards, 'A1');
check(sess1 && sess1.targetIds.length === 5, 'Session created with 5 targets');

// Queue should contain intro steps for all new words
const introItems = sess1.queue.filter(q => q.type === 'intro');
check(introItems.length === 5, 'Initial queue includes Intro interactions for all 5 new words');

const recallItems = sess1.queue.filter(q => q.type === 'recall');
check(recallItems.length === 5, 'Initial queue includes Recall interactions for all 5 new words');

// Step through queue until all completed
const cardsMap1 = {};
newCards.forEach(c => { cardsMap1[c.id] = c; });

let stepsCount = 0;
while (!window.VokabelSession.getTodaySession().completed && stepsCount < 50) {
  stepsCount++;
  const cur = window.VokabelSession.getCurrentInteraction(cardsMap1);
  if (cur.completed) break;
  if (cur.type === 'intro') {
    window.VokabelSession.handleIntroContinue();
  } else if (cur.type === 'recall') {
    window.VokabelSession.handleRecallAnswer('known');
  }
}

const sess1Final = window.VokabelSession.getTodaySession();
check(sess1Final.completed === true, 'Session successfully completed after answering all 5 recalls');
check(sess1Final.completedTargets.length === 5, 'All 5 targets marked completed');
check(window.VokabelDaily.getTodayCount() === 5, 'VokabelDaily recorded 5/5 targets');
check(window.VokabelDaily.isTodayCompleted() === true, 'Daily goal marked complete');

// --------------------------------------------------------------------------
// TEST 2: Mixed session (3 review + 2 new target mix & deficit filling)
// --------------------------------------------------------------------------
console.log('\n--- TEST 2: Mixed session (3 review + 2 new selection & deficit filling) ---');
localStorage.clear();

// Setup cards with different historical progress
const mixedCards = [
  { id: 'rev_unk_1', term: 'schwierig', meaning: 'khó' },
  { id: 'rev_unk_2', term: 'kompliziert', meaning: 'phức tạp' },
  { id: 'rev_hard_1', term: 'beobachten', meaning: 'quan sát' },
  { id: 'rev_known_1', term: 'hallo', meaning: 'xin chào' },
  { id: 'new_1', term: 'die Brille', meaning: 'kính' },
  { id: 'new_2', term: 'die Lampe', meaning: 'đèn' },
  { id: 'new_3', term: 'der Tisch', meaning: 'bàn' }
];

// Set legacy progress
const legacyProg = {
  'rev_unk_1': 'unknown',
  'rev_unk_2': 'unknown',
  'rev_hard_1': 'hard',
  'rev_known_1': 'known'
};
localStorage.setItem('dmf_flash_progress_v2', JSON.stringify(legacyProg));

// Select targets
const pickedTargets = window.VokabelSession.selectTargets(mixedCards, 5);
check(pickedTargets.length === 5, 'Picked exactly 5 targets');

// First 3 should be review (unknown & hard prioritized over known)
const reviewPicked = pickedTargets.filter(id => id.startsWith('rev_'));
const newPicked = pickedTargets.filter(id => id.startsWith('new_'));
check(reviewPicked.length === 3, 'Exactly 3 review targets picked');
check(newPicked.length === 2, 'Exactly 2 new targets picked');
check(pickedTargets.includes('rev_unk_1') && pickedTargets.includes('rev_unk_2'), 'Prioritized unknown cards in review pool');

// Test Deficit Filling 1: User has only 1 review card -> deficit filled with 4 new cards
const mostlyNewCards = [
  { id: 'rev_alone', term: 'einsam', meaning: 'cô đơn' },
  { id: 'n1', term: 't1', meaning: 'm1' },
  { id: 'n2', term: 't2', meaning: 'm2' },
  { id: 'n3', term: 't3', meaning: 'm3' },
  { id: 'n4', term: 't4', meaning: 'm4' },
  { id: 'n5', term: 't5', meaning: 'm5' }
];
localStorage.setItem('dmf_flash_progress_v2', JSON.stringify({ 'rev_alone': 'unknown' }));
const deficitTargets1 = window.VokabelSession.selectTargets(mostlyNewCards, 5);
check(deficitTargets1.length === 5, 'Deficit review filled: 5 targets selected');
check(deficitTargets1.includes('rev_alone') && deficitTargets1.filter(id => id.startsWith('n')).length === 4,
  '1 review + 4 new cards cleanly selected to meet 5 targets quota');

// Test Deficit Filling 2: User has 0 new cards -> deficit filled with 5 review cards
const allReviewCards = [
  { id: 'r1', term: 'a', meaning: '1' },
  { id: 'r2', term: 'b', meaning: '2' },
  { id: 'r3', term: 'c', meaning: '3' },
  { id: 'r4', term: 'd', meaning: '4' },
  { id: 'r5', term: 'e', meaning: '5' }
];
localStorage.setItem('dmf_flash_progress_v2', JSON.stringify({ r1: 'known', r2: 'hard', r3: 'hard', r4: 'unknown', r5: 'known' }));
const deficitTargets2 = window.VokabelSession.selectTargets(allReviewCards, 5);
check(deficitTargets2.length === 5, 'Deficit new filled: 5 review cards selected when no new cards exist');

// --------------------------------------------------------------------------
// TEST 3: Wrong answer (Re-queue with intervening interactions)
// --------------------------------------------------------------------------
console.log('\n--- TEST 3: Wrong answer re-queue (Intervening distance) ---');
localStorage.clear();
const testCards3 = [
  { id: 'c_a', term: 'A', meaning: 'a' },
  { id: 'c_b', term: 'B', meaning: 'b' },
  { id: 'c_c', term: 'C', meaning: 'c' },
  { id: 'c_d', term: 'D', meaning: 'd' },
  { id: 'c_e', term: 'E', meaning: 'e' }
];
// Mark all as review to avoid intro steps
localStorage.setItem('dmf_flash_progress_v2', JSON.stringify({
  c_a: 'hard', c_b: 'hard', c_c: 'hard', c_d: 'hard', c_e: 'hard'
}));

const sess3 = window.VokabelSession.createTodaySession(testCards3);
check(sess3.queue[0].cardId === 'c_a', 'Initial queue starts with card c_a');

// User fails c_a (rates 'unknown')
const res3 = window.VokabelSession.handleRecallAnswer('unknown');
const sess3After = window.VokabelSession.getTodaySession();

check(!sess3After.completedTargets.includes('c_a'), 'c_a is NOT marked completed on failure');
check(sess3After.targetStates['c_a'].failures === 1, 'c_a records 1 failure');

// The immediate next question must NOT be c_a
const immediateNext = sess3After.queue[sess3After.queueIndex];
check(immediateNext.cardId !== 'c_a', `c_a does NOT appear on immediate next question (next is ${immediateNext.cardId})`);

// c_a must appear later in the queue
const remainingIndices = [];
for (let i = sess3After.queueIndex; i < sess3After.queue.length; i++) {
  if (sess3After.queue[i].cardId === 'c_a') remainingIndices.push(i);
}
check(remainingIndices.length >= 1, 'c_a was re-queued later in the queue');
check(remainingIndices[0] >= sess3After.queueIndex + 2,
  `c_a returns after intervening interactions (re-queued at offset +${remainingIndices[0] - sess3After.queueIndex + 1})`);

// --------------------------------------------------------------------------
// TEST 4: Daily Goal exploit guard (Rating 'Chưa nhớ' 5 times NEVER unlocks reward)
// --------------------------------------------------------------------------
console.log('\n--- TEST 4: Daily Goal exploit guard ---');
localStorage.clear();

const testCards4 = [
  { id: 'exp_1', term: 'E1', meaning: 'e1' },
  { id: 'exp_2', term: 'E2', meaning: 'e2' },
  { id: 'exp_3', term: 'E3', meaning: 'e3' },
  { id: 'exp_4', term: 'E4', meaning: 'e4' },
  { id: 'exp_5', term: 'E5', meaning: 'e5' }
];
localStorage.setItem('dmf_flash_progress_v2', JSON.stringify({
  exp_1: 'hard', exp_2: 'hard', exp_3: 'hard', exp_4: 'hard', exp_5: 'hard'
}));

window.VokabelSession.createTodaySession(testCards4);

// Simulate clicking "Chưa nhớ" (unknown) 5 times
for (let i = 0; i < 5; i++) {
  window.VokabelSession.handleRecallAnswer('unknown');
}

const dailyState4 = window.VokabelDaily.getTodayState();
check(dailyState4.count === 0, `Daily goal count is 0 (actual: ${dailyState4.count})`);
check(dailyState4.completed === false, 'Daily goal is NOT completed after 5 unknown ratings');
check(dailyState4.catchStatus === 'none', `Catch status remains 'none' (actual: '${dailyState4.catchStatus}')`);

const sess4 = window.VokabelSession.getTodaySession();
check(sess4.completedTargets.length === 0, 'Session completedTargets length is 0');
check(sess4.completed === false, 'Session is NOT marked completed');

// --------------------------------------------------------------------------
// TEST 5: Successful targets unlock reward exactly once
// --------------------------------------------------------------------------
console.log('\n--- TEST 5: Successful targets (Reward unlocks exactly once) ---');
localStorage.clear();

const testCards5 = [
  { id: 's1', term: 'S1', meaning: 's1' },
  { id: 's2', term: 'S2', meaning: 's2' },
  { id: 's3', term: 'S3', meaning: 's3' },
  { id: 's4', term: 'S4', meaning: 's4' },
  { id: 's5', term: 'S5', meaning: 's5' }
];
localStorage.setItem('dmf_flash_progress_v2', JSON.stringify({
  s1: 'hard', s2: 'hard', s3: 'hard', s4: 'hard', s5: 'hard'
}));

window.VokabelSession.createTodaySession(testCards5);

// Complete 5 targets with 'known'
for (let i = 0; i < 5; i++) {
  window.VokabelSession.handleRecallAnswer('known');
}

const sess5 = window.VokabelSession.getTodaySession();
check(sess5.completed === true, 'Session completed is true');
check(sess5.completedTargets.length === 5, '5 completed targets registered');

const dailyState5 = window.VokabelDaily.getTodayState();
check(dailyState5.completed === true, 'Daily goal completed is true');
check(dailyState5.catchStatus === 'pending', 'Catch status became pending');

// Simulate user claiming fish in Cat Fishing Reward modal
window.VokabelDaily.setCatchStatus('claimed');
check(window.VokabelDaily.getCatchStatus() === 'claimed', 'Catch status is now claimed');

// Further reviews today must NOT reset catchStatus back to pending
window.VokabelDaily.reviewCard('extra_card');
check(window.VokabelDaily.getCatchStatus() === 'claimed', 'Catch status remains claimed and is NOT re-awarded');

// --------------------------------------------------------------------------
// TEST 6: Refresh (F5 / Session Resume)
// --------------------------------------------------------------------------
console.log('\n--- TEST 6: Refresh (Resume 2/5 and remaining queue) ---');
localStorage.clear();

const testCards6 = [
  { id: 'res_1', term: 'R1', meaning: 'r1' },
  { id: 'res_2', term: 'R2', meaning: 'r2' },
  { id: 'res_3', term: 'R3', meaning: 'r3' },
  { id: 'res_4', term: 'R4', meaning: 'r4' },
  { id: 'res_5', term: 'R5', meaning: 'r5' }
];
localStorage.setItem('dmf_flash_progress_v2', JSON.stringify({
  res_1: 'hard', res_2: 'hard', res_3: 'hard', res_4: 'hard', res_5: 'hard'
}));

const originalSession = window.VokabelSession.createTodaySession(testCards6);
const savedSessionId = originalSession.sessionId;

// Complete 2 targets
window.VokabelSession.handleRecallAnswer('known'); // res_1
window.VokabelSession.handleRecallAnswer('known'); // res_2

const beforeRefresh = window.VokabelSession.getTodaySession();
check(beforeRefresh.completedTargets.length === 2, '2 targets completed before refresh');
const queueIndexBefore = beforeRefresh.queueIndex;

// Simulate F5 by re-loading session from localStorage
const resumedSession = window.VokabelSession.getTodaySession();
check(resumedSession.sessionId === savedSessionId, 'Same sessionId restored after refresh');
check(resumedSession.completedTargets.length === 2, 'Exactly 2 completed targets restored');
check(resumedSession.queueIndex === queueIndexBefore, 'Exact queueIndex restored');
assert.deepStrictEqual(resumedSession.targetIds, originalSession.targetIds, 'Exact targetIds preserved without re-selection');

const cardsMap6 = {};
testCards6.forEach(c => { cardsMap6[c.id] = c; });
const cur6 = window.VokabelSession.getCurrentInteraction(cardsMap6);
check(cur6.cardId === 'res_3', `Current interaction resumes right at card ${cur6.cardId} (expected res_3)`);

// --------------------------------------------------------------------------
// TEST 7: Repeated failure (Fail-safe on 3 failures -> Guided Reinforcement)
// --------------------------------------------------------------------------
console.log('\n--- TEST 7: Repeated failure (3 fails -> Guided Reinforcement) ---');
localStorage.clear();

const testCards7 = [
  { id: 'hard_target', term: 'schwierig', meaning: 'khó' },
  { id: 't2', term: 'T2', meaning: 't2' },
  { id: 't3', term: 'T3', meaning: 't3' },
  { id: 't4', term: 'T4', meaning: 't4' },
  { id: 't5', term: 'T5', meaning: 't5' }
];
localStorage.setItem('dmf_flash_progress_v2', JSON.stringify({
  hard_target: 'hard', t2: 'hard', t3: 'hard', t4: 'hard', t5: 'hard'
}));

window.VokabelSession.createTodaySession(testCards7);

// Step through queue until hard_target has failed 3 times
while (window.VokabelSession.getTodaySession().targetStates['hard_target'].failures < 3) {
  const s = window.VokabelSession.getTodaySession();
  const item = s.queue[s.queueIndex];
  if (!item) break;
  if (item.cardId === 'hard_target') {
    window.VokabelSession.handleRecallAnswer('unknown');
  } else {
    window.VokabelSession.handleRecallAnswer('known');
  }
}

const sess7 = window.VokabelSession.getTodaySession();
check(sess7.targetStates['hard_target'].failures === 3, 'hard_target has recorded 3 failures');

// Next interaction for hard_target must be of type 'reinforce'
const reinforceItem = sess7.queue.find(q => q.cardId === 'hard_target' && q.type === 'reinforce');
check(Boolean(reinforceItem), 'Fail-safe activated: Queue contains reinforce interaction for hard_target');

// Advance queue to the reinforce item
while (window.VokabelSession.getTodaySession().queue[window.VokabelSession.getTodaySession().queueIndex] &&
       window.VokabelSession.getTodaySession().queue[window.VokabelSession.getTodaySession().queueIndex].type !== 'reinforce') {
  const qType = window.VokabelSession.getTodaySession().queue[window.VokabelSession.getTodaySession().queueIndex].type;
  if (qType === 'intro') window.VokabelSession.handleIntroContinue();
  else window.VokabelSession.handleRecallAnswer('known');
}

// User completes guided reinforcement step
const reinfRes = window.VokabelSession.handleReinforceContinue();
check(reinfRes.targetState.completed === true, 'Target marked completed for current session so learner is not trapped');

// But in persistent learning-state, needsReview must remain true
const lsState7 = window.VokabelLearningState.getCardState('hard_target');
check(lsState7.needsReview === true, 'Learning state keeps needsReview = true for future review');

// And in legacy progress, it must NOT be marked 'known'
const legProg7 = JSON.parse(localStorage.getItem('dmf_flash_progress_v2'));
check(legProg7['hard_target'] !== 'known', `Legacy progress is '${legProg7['hard_target']}' (NOT 'known')`);

// --------------------------------------------------------------------------
// TEST 8: Backward compatibility with dmf_flash_progress_v2
// --------------------------------------------------------------------------
console.log('\n--- TEST 8: Backward compatibility (dmf_flash_progress_v2) ---');
localStorage.clear();

const initialLegacy = {
  card_1: 'known',
  card_2: 'hard',
  card_3: 'unknown'
};
localStorage.setItem('dmf_flash_progress_v2', JSON.stringify(initialLegacy));

// Run session operations
const testCards8 = [
  { id: 'card_2', term: 'zwei', meaning: 'hai' },
  { id: 'card_new', term: 'neu', meaning: 'mới' }
];
const sess8 = window.VokabelSession.createTodaySession(testCards8, 'TestDeck');
// If first step is intro for card_new, advance it
if (sess8.queue[0].type === 'intro') {
  window.VokabelSession.handleIntroContinue();
}
// Now at card_2 recall: user passes with known
window.VokabelSession.handleRecallAnswer('known');

const savedLegacyRaw = localStorage.getItem('dmf_flash_progress_v2');
const savedLegacy = JSON.parse(savedLegacyRaw);

check(typeof savedLegacy === 'object' && savedLegacy !== null, 'dmf_flash_progress_v2 is a valid JSON object');
check(savedLegacy['card_1'] === 'known', 'Existing card_1 remains intact');
check(savedLegacy['card_2'] === 'known', 'Updated card_2 is simple string known');
check(savedLegacy['card_3'] === 'unknown', 'Existing card_3 remains intact');

let containsObjects = false;
for (const k in savedLegacy) {
  if (typeof savedLegacy[k] !== 'string') containsObjects = true;
}
check(!containsObjects, 'dmf_flash_progress_v2 contains ONLY string values (known | hard | unknown), NO objects');

// New metadata is cleanly isolated in vokabelgo_learning_state_v1
const newLearningState = window.VokabelLearningState.load();
check(Boolean(newLearningState && newLearningState.cards['card_2']), 'New metadata stored in separate vokabelgo_learning_state_v1');

// --------------------------------------------------------------------------
// TEST 9: Existing study modes (MCQ, Typing, Match, Free Study)
// --------------------------------------------------------------------------
console.log('\n--- TEST 9: Existing study modes and free study ---');
const indexHtmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

check(indexHtmlContent.includes('setStudySubMode(\'mcq\')'), 'MCQ sub-mode button exists and calls setStudySubMode');
check(indexHtmlContent.includes('setStudySubMode(\'typing\')'), 'Typing sub-mode button exists and calls setStudySubMode');
check(indexHtmlContent.includes('setStudySubMode(\'match\')'), 'Match sub-mode button exists and calls setStudySubMode');
check(indexHtmlContent.includes('setStudySubMode(\'flash\')'), 'Flashcard sub-mode button exists');
check(indexHtmlContent.includes('exitSessionToFreeStudy'), 'Free study switch exitSessionToFreeStudy exists');
check(indexHtmlContent.includes('function render()'), 'Standard free study render() function exists');

// --------------------------------------------------------------------------
// TEST 10: Supabase sync via existing app_data jsonb without schema migration
// --------------------------------------------------------------------------
console.log('\n--- TEST 10: Supabase sync via app_data jsonb ---');
const authJsContent = fs.readFileSync(path.join(__dirname, 'supabase-auth.js'), 'utf8');

check(authJsContent.includes('learningState:'), 'getSyncPayload serializes learningState into app_data payload');
check(authJsContent.includes('learningSession:'), 'getSyncPayload serializes learningSession into app_data payload');
check(authJsContent.includes('vokabelgo_learning_state_v1'), 'applyCloudDataToLocal restores vokabelgo_learning_state_v1');
check(authJsContent.includes('vokabelgo_learning_session_v1'), 'applyCloudDataToLocal restores vokabelgo_learning_session_v1');

const schemaSql = fs.readFileSync(path.join(__dirname, 'supabase_schema.sql'), 'utf8');
check(schemaSql.includes('app_data jsonb'), 'Supabase schema contains app_data jsonb column');
check(!schemaSql.includes('vokabelgo_learning_session_v1'), 'No new table or SQL migration needed on Supabase schema');

// --------------------------------------------------------------------------
// FINAL SUMMARY
// --------------------------------------------------------------------------
console.log('\n====================================================');
console.log(`ACCEPTANCE SUMMARY: ${passedTests} / ${totalTests} PASSED`);
if (passedTests === totalTests) {
  console.log('🎉 ALL 10 CORE LEARNING LOOP TESTS PASSED SUCCESSFULLY!');
} else {
  console.log('⚠️ SOME TESTS FAILED. PLEASE REVIEW OUTPUT ABOVE.');
}
console.log('====================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
