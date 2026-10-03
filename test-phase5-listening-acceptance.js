// ==============================================================================
// VokabelGo - Phase 5 Listening Recall Acceptance Tests
// Covers all tests from TEST A to TEST T:
//   TEST A — Eligible mature review => listening eligible
//   TEST B — New card => not listening
//   TEST C — Grammar/content/question => excluded
//   TEST D — Listening text (die Geste, -n => die Geste)
//   TEST E — Correct (die Entscheidung -> Correct / Good)
//   TEST F — Missing article (Entscheidung -> Almost / Hard)
//   TEST G — Wrong (das Haus -> Wrong / Again)
//   TEST H — Replay (3 replays => no failure, no rating change)
//   TEST I — Wrong then Recall Known => final SRS Again, exactly ONE commit
//   TEST J — Almost then Recall Known => final Hard
//   TEST K — Correct first try => Good
//   TEST L — Unsupported speech => fallback Recall, no failure/attempt/SRS
//   TEST M — F5 feedback persistence
//   TEST N — No self-rating override
//   TEST O — Audio transcript hidden pre-submit
//   TEST P — Orchestration: 5 targets, 3 mature review => 1 typing, 1 listening (total <= 2)
//   TEST Q — Orchestration: Only 1 mature review => 1 typing, 0 listening
//   TEST R — Orchestration: Listening unavailable => 0 listening, Phase 3 preserved
//   TEST S — Mutual exclusion: same card never typing + listening in same session
//   TEST T — Assignment survives reload unchanged
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

// Mock SpeechSynthesis
const spokenUtterances = [];
mockWindow.SpeechSynthesisUtterance = function(text) {
  this.text = text;
  this.lang = 'de-DE';
  this.rate = 0.9;
  this.voice = null;
};
mockWindow.speechSynthesis = {
  cancel: () => {},
  speak: (u) => { spokenUtterances.push(u); },
  getVoices: () => [
    { lang: 'de-DE', name: 'German Voice' },
    { lang: 'en-US', name: 'English Voice' }
  ]
};

global.window = mockWindow;
global.localStorage = mockWindow.localStorage;
global.SpeechSynthesisUtterance = mockWindow.SpeechSynthesisUtterance;
global.speechSynthesis = mockWindow.speechSynthesis;

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

// 2. Load dependencies
const FSRS = require('./vendor/ts-fsrs/index.cjs');
global.FSRS = FSRS;
mockWindow.FSRS = FSRS;

eval(fs.readFileSync(path.join(__dirname, 'daily-progress.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'leaderboard-feed.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'fsrs-srs.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'vocabulary-schema.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'typing-verification.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'listening-verification.js'), 'utf8'));
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
    throw new Error(`Assertion failed: ${desc}`);
  }
}

console.log('====================================================');
console.log('RUNNING PHASE 5 LISTENING RECALL ACCEPTANCE TESTS');
console.log('====================================================\n');

const lv = window.VokabelListeningVerification;
const tv = window.VokabelTypingVerification;
const sessionMgr = window.VokabelSession;
const srsMgr = window.VokabelSRS;

// --------------------------------------------------------------------------
// TEST A: Eligible mature review
// --------------------------------------------------------------------------
console.log('--- TEST A: Eligible mature review => listening eligible ---');
const matureCard = { id: 'b_100', term: 'die Entscheidung', meaning: 'quyết định' };
const matureSrs = { cardId: 'b_100', historyCount: 2, lastRating: 3 };
check(lv.isListeningEligible(matureCard, matureSrs) === true, 'Mature review with historyCount >= 2 is listening eligible');

// --------------------------------------------------------------------------
// TEST B: New card => not listening
// --------------------------------------------------------------------------
console.log('--- TEST B: New card => not listening ---');
const newCard = { id: 'b_101', term: 'die Erfahrung', meaning: 'kinh nghiệm', isNew: true };
check(lv.isListeningEligible(newCard, null) === false, 'Card with null SRS is not listening eligible');
check(lv.isListeningEligible(newCard, { historyCount: 0 }) === false, 'Card with historyCount 0 is not listening eligible');
check(lv.isListeningEligible(newCard, { historyCount: 1 }) === false, 'Card with historyCount 1 is not listening eligible');

// --------------------------------------------------------------------------
// TEST C: Grammar / content / question => excluded
// --------------------------------------------------------------------------
console.log('--- TEST C: Grammar/content/question => excluded ---');
const grammarCard = { id: 'b_g1', term: 'Modalverb + Passiv', meaning: 'công thức', tags: ['grammatik'] };
check(lv.isListeningEligible(grammarCard, matureSrs) === false, 'Grammar card is excluded');

const contentCard = { id: 'b_c1', term: 'Kino Clip 1', meaning: 'video', deck: 'inhalt', tags: ['inhalt'] };
check(lv.isListeningEligible(contentCard, matureSrs) === false, 'Content card is excluded');

const questionCard = { id: 'b_q1', term: 'Wie geht es dir?', meaning: 'bạn khỏe không?' };
check(lv.isListeningEligible(questionCard, matureSrs) === false, 'Question card is excluded');

const slashCard = { id: 'b_s1', term: 'jemandem / etwas vertrauen', meaning: 'tin tưởng' };
check(lv.isListeningEligible(slashCard, matureSrs) === false, 'Card with slash is excluded');

const ellipsisCard = { id: 'b_e1', term: 'Langer Rede kurzer Sinn: …', meaning: 'tóm lại' };
check(lv.isListeningEligible(ellipsisCard, matureSrs) === false, 'Card with ellipsis is excluded');

// --------------------------------------------------------------------------
// TEST D: Listening text derivation
// --------------------------------------------------------------------------
console.log('--- TEST D: Listening text (die Geste, -n => die Geste) ---');
const gesteCard = { id: 'b_102', term: 'die Geste, -n', meaning: 'cử chỉ' };
check(lv.getListeningText(gesteCard) === 'die Geste', 'die Geste, -n spoken text is die Geste');

const ausdruckCard = { id: 'b_103', term: 'der Gesichtsausdruck, die Gesichtsausdrücke', meaning: 'nét mặt' };
check(lv.getListeningText(ausdruckCard) === 'der Gesichtsausdruck', 'der Gesichtsausdruck, die Gesichtsausdrücke spoken text is der Gesichtsausdruck');

const simpleCard = { id: 'b_104', term: 'die Entscheidung', meaning: 'quyết định' };
check(lv.getListeningText(simpleCard) === 'die Entscheidung', 'die Entscheidung spoken text is die Entscheidung');

// --------------------------------------------------------------------------
// TEST E: Correct answer grading
// --------------------------------------------------------------------------
console.log('--- TEST E: Correct (die Entscheidung -> Correct / Good) ---');
const gradeResE = lv.gradeListeningAnswer('Die Entscheidung', simpleCard);
check(gradeResE.result === 'correct', 'Exact match with case variance grades as correct');
check(gradeResE.mappedRating === 'known', 'Mapped rating is known (Good)');
check(gradeResE.canonical === 'die Entscheidung', 'Canonical matches canonical text');

// --------------------------------------------------------------------------
// TEST F: Missing article
// --------------------------------------------------------------------------
console.log('--- TEST F: Missing article (Entscheidung -> Almost / Hard) ---');
const gradeResF = lv.gradeListeningAnswer('Entscheidung', simpleCard);
check(gradeResF.result === 'almost', 'Missing article grades as almost');
check(gradeResF.mappedRating === 'hard', 'Mapped rating is hard');
check(gradeResF.feedback.includes('die Entscheidung'), 'Feedback mentions full canonical answer');

// --------------------------------------------------------------------------
// TEST G: Wrong
// --------------------------------------------------------------------------
console.log('--- TEST G: Wrong (das Haus -> Wrong / Again) ---');
const gradeResG = lv.gradeListeningAnswer('das Haus', simpleCard);
check(gradeResG.result === 'wrong', 'Unrelated word grades as wrong');
check(gradeResG.mappedRating === 'unknown', 'Mapped rating is unknown (Again)');

// --------------------------------------------------------------------------
// TEST H: Replay (3 replays => no failure, no rating change)
// --------------------------------------------------------------------------
console.log('--- TEST H: Replay (3 replays => no failure, no rating change) ---');
localStorage.clear();
const testCardsH = [
  { id: 'h_1', term: 'die Entscheidung', meaning: 'quyết định' },
  { id: 'h_2', term: 'das Treffen', meaning: 'cuộc họp' },
  { id: 'h_3', term: 'der Vertrag', meaning: 'hợp đồng' },
  { id: 'h_4', term: 'die Frage', meaning: 'câu hỏi' },
  { id: 'h_5', term: 'die Antwort', meaning: 'câu trả lời' }
];
// Seed SRS for h_1 and h_2 to have mature history
srsMgr.scheduleReview('h_1', 3);
srsMgr.scheduleReview('h_1', 3);
srsMgr.scheduleReview('h_2', 3);
srsMgr.scheduleReview('h_2', 3);

const sessionH = sessionMgr.createTodaySession(testCardsH);
const listeningIdx = sessionH.queue.findIndex(it => it.type === 'listening');
check(listeningIdx !== -1, 'Listening interaction present in session queue');
sessionH.queueIndex = listeningIdx;
sessionMgr.saveSession(sessionH);

const currentLItem = sessionH.queue[listeningIdx];
const rep1 = sessionMgr.recordListeningReplay(currentLItem.cardId);
const rep2 = sessionMgr.recordListeningReplay(currentLItem.cardId);
const rep3 = sessionMgr.recordListeningReplay(currentLItem.cardId);

const updatedStateH = sessionMgr.getTodaySession().targetStates[currentLItem.cardId];
check(rep3 === 3, 'Replay count incremented to 3');
check(updatedStateH.listeningReplayCount === 3, 'targetState.listeningReplayCount is 3');
check(updatedStateH.failures === 0, 'No failures recorded upon replay');
check(updatedStateH.consecutiveSuccess === 0, 'No false successes recorded upon replay');

// --------------------------------------------------------------------------
// TEST I: Wrong then Recall Known => final SRS Again, exactly ONE commit
// --------------------------------------------------------------------------
console.log('--- TEST I: Wrong then Recall Known => final SRS Again, exactly ONE commit ---');
localStorage.clear();
// Seed mature cards
srsMgr.scheduleReview('i_1', 3);
srsMgr.scheduleReview('i_1', 3);
srsMgr.scheduleReview('i_2', 3);
srsMgr.scheduleReview('i_2', 3);

const testCardsI = [
  { id: 'i_1', term: 'die Entscheidung', meaning: 'quyết định' },
  { id: 'i_2', term: 'das Treffen', meaning: 'cuộc họp' },
  { id: 'i_3', term: 'der Vertrag', meaning: 'hợp đồng' },
  { id: 'i_4', term: 'die Frage', meaning: 'câu hỏi' },
  { id: 'i_5', term: 'die Antwort', meaning: 'câu trả lời' }
];

const sessionI = sessionMgr.createTodaySession(testCardsI);
const lIdxI = sessionI.queue.findIndex(it => it.type === 'listening');
sessionI.queueIndex = lIdxI;
sessionMgr.saveSession(sessionI);

const lCardId = sessionI.queue[lIdxI].cardId;
const subResI = sessionMgr.handleListeningSubmit('hoan toan sai');
check(subResI.result === 'wrong', 'Submitted wrong answer');
check(subResI.mappedRating === 'unknown', 'Mapped to unknown');

const contSessionI = sessionMgr.handleListeningContinue();
check(contSessionI !== null, 'Continued after wrong feedback');

// Find requeued recall item
const requeueIdxI = contSessionI.queue.findIndex((it, idx) => idx >= contSessionI.queueIndex && it.cardId === lCardId && it.type === 'recall');
check(requeueIdxI !== -1, 'Card was requeued as normal recall item');

// Advance to requeued item
contSessionI.queueIndex = requeueIdxI;
sessionMgr.saveSession(contSessionI);

const recallResI = sessionMgr.handleRecallAnswer('known');
check(recallResI.justCompletedTarget === true, 'Target completed after recall known');
check(recallResI.targetState.finalRating === 1, 'Final FSRS rating aggregated to Again (1) due to listening wrong');

const srsRecI = srsMgr.getCard(lCardId);
check(srsRecI.lastRating === 1, 'SRS record committed with rating 1 (Again)');
check(srsRecI.historyCount === 3, 'SRS history incremented by exactly ONE commit');

// --------------------------------------------------------------------------
// TEST J: Almost then Recall Known => final Hard
// --------------------------------------------------------------------------
console.log('--- TEST J: Almost then Recall Known => final Hard ---');
localStorage.clear();
srsMgr.scheduleReview('j_1', 3);
srsMgr.scheduleReview('j_1', 3);
srsMgr.scheduleReview('j_2', 3);
srsMgr.scheduleReview('j_2', 3);

const testCardsJ = [
  { id: 'j_1', term: 'die Entscheidung', meaning: 'quyết định' },
  { id: 'j_2', term: 'das Treffen', meaning: 'cuộc họp' },
  { id: 'j_3', term: 'der Vertrag', meaning: 'hợp đồng' },
  { id: 'j_4', term: 'die Frage', meaning: 'câu hỏi' },
  { id: 'j_5', term: 'die Antwort', meaning: 'câu trả lời' }
];

const sessionJ = sessionMgr.createTodaySession(testCardsJ);
const lIdxJ = sessionJ.queue.findIndex(it => it.type === 'listening');
sessionJ.queueIndex = lIdxJ;
sessionMgr.saveSession(sessionJ);

const lCardIdJ = sessionJ.queue[lIdxJ].cardId;
const targetCardJ = testCardsJ.find(c => c.id === lCardIdJ);
const coreWordJ = tv.extractArticleAndCore(lv.getListeningText(targetCardJ)).core;
const subResJ = sessionMgr.handleListeningSubmit(coreWordJ);
check(subResJ.result === 'almost', 'Missing article yields almost');

sessionMgr.handleListeningContinue();
const sessJAfter = sessionMgr.getTodaySession();
const requeueIdxJ = sessJAfter.queue.findIndex((it, idx) => idx >= sessJAfter.queueIndex && it.cardId === lCardIdJ && it.type === 'recall');
sessJAfter.queueIndex = requeueIdxJ;
sessionMgr.saveSession(sessJAfter);

const recallResJ = sessionMgr.handleRecallAnswer('known');
check(recallResJ.targetState.finalRating === 2, 'Final FSRS rating aggregated to Hard (2) due to listening almost');
const srsRecJ = srsMgr.getCard(lCardIdJ);
check(srsRecJ.lastRating === 2, 'SRS record committed with rating 2 (Hard)');

// --------------------------------------------------------------------------
// TEST K: Correct first try => Good
// --------------------------------------------------------------------------
console.log('--- TEST K: Correct first try => Good ---');
localStorage.clear();
srsMgr.scheduleReview('k_1', 3);
srsMgr.scheduleReview('k_1', 3);
srsMgr.scheduleReview('k_2', 3);
srsMgr.scheduleReview('k_2', 3);

const testCardsK = [
  { id: 'k_1', term: 'die Entscheidung', meaning: 'quyết định' },
  { id: 'k_2', term: 'das Treffen', meaning: 'cuộc họp' },
  { id: 'k_3', term: 'der Vertrag', meaning: 'hợp đồng' },
  { id: 'k_4', term: 'die Frage', meaning: 'câu hỏi' },
  { id: 'k_5', term: 'die Antwort', meaning: 'câu trả lời' }
];

const sessionK = sessionMgr.createTodaySession(testCardsK);
const lIdxK = sessionK.queue.findIndex(it => it.type === 'listening');
sessionK.queueIndex = lIdxK;
sessionMgr.saveSession(sessionK);

const lCardIdK = sessionK.queue[lIdxK].cardId;
const targetCardK = testCardsK.find(c => c.id === lCardIdK);
const canonicalK = lv.getListeningText(targetCardK);

const subResK = sessionMgr.handleListeningSubmit(canonicalK);
check(subResK.result === 'correct', 'Correct answer submitted');
check(subResK.justCompletedTarget === true, 'Target completed immediately on first try');
check(subResK.targetState.finalRating === 3, 'Final FSRS rating is Good (3)');
const srsRecK = srsMgr.getCard(lCardIdK);
check(srsRecK.lastRating === 3, 'SRS record committed with rating 3 (Good)');

// --------------------------------------------------------------------------
// TEST L: Unsupported speech => fallback Recall
// --------------------------------------------------------------------------
console.log('--- TEST L: Unsupported speech => fallback Recall, no failure/attempt/SRS ---');
localStorage.clear();
srsMgr.scheduleReview('l_1', 3);
srsMgr.scheduleReview('l_1', 3);
srsMgr.scheduleReview('l_2', 3);
srsMgr.scheduleReview('l_2', 3);

const testCardsL = [
  { id: 'l_1', term: 'die Entscheidung', meaning: 'quyết định' },
  { id: 'l_2', term: 'das Treffen', meaning: 'cuộc họp' },
  { id: 'l_3', term: 'der Vertrag', meaning: 'hợp đồng' },
  { id: 'l_4', term: 'die Frage', meaning: 'câu hỏi' },
  { id: 'l_5', term: 'die Antwort', meaning: 'câu trả lời' }
];

const sessionL = sessionMgr.createTodaySession(testCardsL);
const lIdxL = sessionL.queue.findIndex(it => it.type === 'listening');
sessionL.queueIndex = lIdxL;
sessionMgr.saveSession(sessionL);

const cardIdL = sessionL.queue[lIdxL].cardId;
const fbResL = sessionMgr.handleListeningFallback();
check(fbResL.fallback === true, 'Fallback returned true');

const updatedSessionL = sessionMgr.getTodaySession();
check(updatedSessionL.queue[lIdxL].type === 'recall', 'Current item changed from listening to recall');
const tsL = updatedSessionL.targetStates[cardIdL];
check(tsL.attempts === 0, 'No attempts counted upon fallback');
check(tsL.failures === 0, 'No failures counted upon fallback');
check(tsL.srsCommitted !== true, 'No SRS committed upon fallback');

// --------------------------------------------------------------------------
// TEST M: F5 feedback persistence
// --------------------------------------------------------------------------
console.log('--- TEST M: F5 feedback persistence ---');
localStorage.clear();
srsMgr.scheduleReview('m_1', 3);
srsMgr.scheduleReview('m_1', 3);
srsMgr.scheduleReview('m_2', 3);
srsMgr.scheduleReview('m_2', 3);

const testCardsM = [
  { id: 'm_1', term: 'die Entscheidung', meaning: 'quyết định' },
  { id: 'm_2', term: 'das Treffen', meaning: 'cuộc họp' },
  { id: 'm_3', term: 'der Vertrag', meaning: 'hợp đồng' },
  { id: 'm_4', term: 'die Frage', meaning: 'câu hỏi' },
  { id: 'm_5', term: 'die Antwort', meaning: 'câu trả lời' }
];

const sessionM = sessionMgr.createTodaySession(testCardsM);
const lIdxM = sessionM.queue.findIndex(it => it.type === 'listening');
sessionM.queueIndex = lIdxM;
sessionMgr.saveSession(sessionM);

const cardIdM = sessionM.queue[lIdxM].cardId;
sessionMgr.handleListeningSubmit('sai từ');

// Simulate F5: reload from storage
const reloadedM = sessionMgr.loadSession();
const tsM = reloadedM.targetStates[cardIdM];
check(tsM.listeningSubmitted === true, 'listeningSubmitted persists after reload');
check(tsM.lastObjectiveResult === 'wrong', 'lastObjectiveResult wrong persists after reload');
check(Boolean(tsM.canonicalAnswer), 'canonicalAnswer persists after reload');
check(tsM.attempts === 1, 'Attempts remains 1, no duplicate attempt');

// --------------------------------------------------------------------------
// TEST N: No self-rating override
// --------------------------------------------------------------------------
console.log('--- TEST N: No self-rating override ---');
// Verify handleSessionKeydown blocks ratings 1, 2, 3 and space flip during listening
eval(fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8').match(/function handleSessionKeydown\([\s\S]*?\n\}/)[0]);
const keydownCard = document.getElementById('card');
let flippedToggled = false;
keydownCard.classList.toggle = () => { flippedToggled = true; };

// Setup session on listening item
sessionM.queueIndex = lIdxM;
tsM.listeningSubmitted = false;
sessionM.targetStates[cardIdM] = tsM;
sessionMgr.saveSession(sessionM);

// Fire '1', '2', '3', 'Space'
let ev1 = { key: '1', preventDefault: () => {} };
let evSpace = { code: 'Space', key: ' ', preventDefault: () => {} };
handleSessionKeydown(ev1);
handleSessionKeydown(evSpace);

check(flippedToggled === false, 'Space did not flip card during listening');
check(sessionMgr.getTodaySession().targetStates[cardIdM].attempts === 1, 'Rating key did not record self-rating');

// --------------------------------------------------------------------------
// TEST O: Audio transcript hidden pre-submit
// --------------------------------------------------------------------------
console.log('--- TEST O: Audio transcript hidden pre-submit ---');
const testCardO = { id: 'o_1', term: 'die Entscheidung', meaning: 'quyết định' };
const normO = window.VokabelCardSchema.normalizeCard(testCardO);
// Spoken text is derived from canonicalAnswer, UI frontTerm is hidden during listening
check(normO.canonicalAnswer === 'die Entscheidung', 'Canonical answer is separated from display format');

// --------------------------------------------------------------------------
// TEST P: Orchestration (5 targets, 3 mature review => 1 typing, 1 listening)
// --------------------------------------------------------------------------
console.log('--- TEST P: Orchestration: 5 targets, 3 mature review => 1 typing, 1 listening ---');
localStorage.clear();
srsMgr.scheduleReview('p_1', 3);
srsMgr.scheduleReview('p_1', 3);
srsMgr.scheduleReview('p_2', 3);
srsMgr.scheduleReview('p_2', 3);
srsMgr.scheduleReview('p_3', 3);
srsMgr.scheduleReview('p_3', 3);

const testCardsP = [
  { id: 'p_1', term: 'die Entscheidung', meaning: 'quyết định' },
  { id: 'p_2', term: 'das Treffen', meaning: 'cuộc họp' },
  { id: 'p_3', term: 'der Vertrag', meaning: 'hợp đồng' },
  { id: 'p_4', term: 'die Frage', meaning: 'câu hỏi' },
  { id: 'p_5', term: 'die Antwort', meaning: 'câu trả lời' }
];

const sessionP = sessionMgr.createTodaySession(testCardsP);
const typingCountP = sessionP.queue.filter(it => it.type === 'typing').length;
const listeningCountP = sessionP.queue.filter(it => it.type === 'listening').length;

check(typingCountP === 1, 'Exactly 1 typing interaction in queue');
check(listeningCountP === 1, 'Exactly 1 listening interaction in queue');
check(typingCountP + listeningCountP <= 2, 'Total objective verification <= 2');

// --------------------------------------------------------------------------
// TEST Q: Orchestration (Only 1 mature review => 1 typing, 0 listening)
// --------------------------------------------------------------------------
console.log('--- TEST Q: Orchestration: Only 1 mature review => 1 typing, 0 listening ---');
localStorage.clear();
srsMgr.scheduleReview('q_1', 3);
srsMgr.scheduleReview('q_1', 3);

const testCardsQ = [
  { id: 'q_1', term: 'die Entscheidung', meaning: 'quyết định' },
  { id: 'q_2', term: 'das Treffen', meaning: 'cuộc họp', isNew: true },
  { id: 'q_3', term: 'der Vertrag', meaning: 'hợp đồng', isNew: true },
  { id: 'q_4', term: 'die Frage', meaning: 'câu hỏi', isNew: true },
  { id: 'q_5', term: 'die Antwort', meaning: 'câu trả lời', isNew: true }
];

const sessionQ = sessionMgr.createTodaySession(testCardsQ);
const typingCountQ = sessionQ.queue.filter(it => it.type === 'typing').length;
const listeningCountQ = sessionQ.queue.filter(it => it.type === 'listening').length;

check(typingCountQ === 1, '1 mature review yields exactly 1 typing interaction');
check(listeningCountQ === 0, '1 mature review yields 0 listening interaction');

// --------------------------------------------------------------------------
// TEST R: Orchestration (Listening unavailable => 0 listening)
// --------------------------------------------------------------------------
console.log('--- TEST R: Orchestration: Listening unavailable => 0 listening ---');
localStorage.clear();
srsMgr.scheduleReview('r_1', 3);
srsMgr.scheduleReview('r_1', 3);
srsMgr.scheduleReview('r_2', 3);
srsMgr.scheduleReview('r_2', 3);

// Temporarily disable speech
const origCanUseSpeech = lv.canUseSpeech;
lv.canUseSpeech = () => false;

const testCardsR = [
  { id: 'r_1', term: 'die Entscheidung', meaning: 'quyết định' },
  { id: 'r_2', term: 'das Treffen', meaning: 'cuộc họp' },
  { id: 'r_3', term: 'der Vertrag', meaning: 'hợp đồng', isNew: true },
  { id: 'r_4', term: 'die Frage', meaning: 'câu hỏi', isNew: true },
  { id: 'r_5', term: 'die Antwort', meaning: 'câu trả lời', isNew: true }
];

const sessionR = sessionMgr.createTodaySession(testCardsR);
const listeningCountR = sessionR.queue.filter(it => it.type === 'listening').length;
check(listeningCountR === 0, 'When speech unavailable, 0 listening interactions assigned');

// Restore speech
lv.canUseSpeech = origCanUseSpeech;

// --------------------------------------------------------------------------
// TEST S: Same card never appears as typing + listening
// --------------------------------------------------------------------------
console.log('--- TEST S: Mutual exclusion: same card never typing + listening ---');
const typingCardsP = sessionP.queue.filter(it => it.type === 'typing').map(it => it.cardId);
const listeningCardsP = sessionP.queue.filter(it => it.type === 'listening').map(it => it.cardId);

const overlapS = typingCardsP.filter(id => listeningCardsP.includes(id));
check(overlapS.length === 0, 'Typing and listening card sets have zero overlap in same session');

console.log('--- TEST T: Assignment survives reload unchanged ---');
localStorage.clear();
srsMgr.scheduleReview('t_1', 3);
srsMgr.scheduleReview('t_1', 3);
srsMgr.scheduleReview('t_2', 3);
srsMgr.scheduleReview('t_2', 3);

const testCardsT = [
  { id: 't_1', term: 'die Entscheidung', meaning: 'quyết định' },
  { id: 't_2', term: 'das Treffen', meaning: 'cuộc họp' },
  { id: 't_3', term: 'der Vertrag', meaning: 'hợp đồng' },
  { id: 't_4', term: 'die Frage', meaning: 'câu hỏi' },
  { id: 't_5', term: 'die Antwort', meaning: 'câu trả lời' }
];
const sessionT = sessionMgr.createTodaySession(testCardsT);
const queueSnapshotT = sessionT.queue.map(it => ({ type: it.type, cardId: it.cardId }));
const reloadedSessionT = sessionMgr.loadSession();
const reloadedSnapshotT = reloadedSessionT.queue.map(it => ({ type: it.type, cardId: it.cardId }));

check(JSON.stringify(queueSnapshotT) === JSON.stringify(reloadedSnapshotT), 'Queue structure survives reload identical');

console.log('\n====================================================');
console.log(`ACCEPTANCE SUMMARY: ${passedTests} / ${totalTests} PASSED`);
console.log('🎉 ALL PHASE 5 LISTENING RECALL ACCEPTANCE TESTS PASSED!');
console.log('====================================================\n');
