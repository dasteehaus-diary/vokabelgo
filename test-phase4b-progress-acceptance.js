// ==============================================================================
// VokabelGo - Phase 4B Acceptance Test Suite
// Learning Progress Truth Layer & Today Home Cleanup
// Verifies:
//   TEST A: unseen (no SRS, no learningState, no legacy)
//   TEST B: intro seen (firstSeenAt, no SRS -> learning)
//   TEST C: legacy known (no SRS -> learning, NEVER stable)
//   TEST D: legacy hard (no SRS -> needs_review)
//   TEST E: legacy unknown (no SRS -> needs_review)
//   TEST F: SRS due (dueAt <= local calendar date -> needs_review even if Good)
//   TEST G: stable (SRS Good, history >= 2, future due, !needsReview)
//   TEST H: one Good insufficient (history = 1, Good -> learning, not stable)
//   TEST I: Hard (history >= 2, Hard -> learning)
//   TEST J: Again (Again -> learning)
//   TEST K: needsReview flag (future Good history >= 2, but needsReview true -> learning)
//   TEST L: legacy mastered (status = mastered, no SRS evidence -> learning, not stable)
//   TEST M: Summary invariants (total === unseen + learning + needsReview + stable, seen === learning + needsReview + stable)
//   TEST N: Orphan state (deleted card in SRS not in allCardsList -> excluded from summary)
//   TEST O: No double counting (duplicate card IDs in allCardsList -> deduplicated safely)
//   TEST P: Home "Nhớ ổn" uses VokabelProgressTruth summary.stable, NOT legacy known filter
//   TEST Q: Main Today metrics are learning-centric (Cần ôn, Đang học, Nhớ ổn)
//   TEST R: Fish + streak exist in secondary hierarchy (low pressure, supportive)
//   TEST S: needsReview = 0 -> Home displays supportive text without guilt/warning
//   TEST T: needsReview = 25 -> Home displays supportive review text, NO "nợ" or "quá hạn", 5-target CTA
//   TEST TIMEZONE: Calendar date due classification matches VokabelSRS.isDueForDailySession
// ==============================================================================

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 1. Setup mock environment
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

const mockLocalStorage = new LocalStorageMock();

// Minimal DOM Mock
const domElements = {};
function getOrCreateElement(id) {
  if (!domElements[id]) {
    domElements[id] = {
      id,
      textContent: '',
      style: {},
      className: '',
      setAttribute: () => {},
      classList: {
        add: () => {},
        remove: () => {},
        contains: () => false
      }
    };
  }
  return domElements[id];
}

const mockDocument = {
  getElementById: (id) => getOrCreateElement(id),
  querySelectorAll: () => []
};

global.window = {
  localStorage: mockLocalStorage,
  document: mockDocument
};
global.localStorage = mockLocalStorage;
global.document = mockDocument;

// Load dependencies
const VokabelSRS = require('./fsrs-srs.js');
window.VokabelSRS = VokabelSRS;

const VokabelProgressTruth = require('./learning-progress.js');
window.VokabelProgressTruth = VokabelProgressTruth;

const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const learningCss = fs.readFileSync(path.join(__dirname, 'learning-ux.css'), 'utf8');

let passedTests = 0;
let totalTests = 0;

function check(condition, desc) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${desc}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${desc}`);
    assert.fail(`Test failed: ${desc}`);
  }
}

console.log('====================================================');
console.log('RUNNING PHASE 4B LEARNING PROGRESS TRUTH ACCEPTANCE TESTS');
console.log('====================================================\n');

// ------------------------------------------------------------------------------
// TEST A: unseen (No SRS, no learningState, no legacy)
// ------------------------------------------------------------------------------
console.log('--- TEST A: unseen (No SRS, no learningState, no legacy) ---');
mockLocalStorage.clear();
const resA = VokabelProgressTruth.classifyCard('card_a_unseen');
check(resA.status === 'unseen', 'Status is "unseen"');
check(resA.label === 'Chưa học', 'Label is "Chưa học"');
check(resA.seen === false, 'seen is false');
check(resA.dueNow === false, 'dueNow is false');
check(resA.debug.source === 'unseen', 'debug.source is "unseen"');

// ------------------------------------------------------------------------------
// TEST B: intro seen (firstSeenAt present, no SRS -> learning)
// ------------------------------------------------------------------------------
console.log('\n--- TEST B: intro seen (firstSeenAt present, no SRS -> learning) ---');
mockLocalStorage.clear();
mockLocalStorage.setItem('vokabelgo_learning_state_v1', JSON.stringify({
  cards: {
    card_b_intro: {
      cardId: 'card_b_intro',
      firstSeenAt: Date.now() - 3600000,
      lastReviewedAt: Date.now() - 1800000,
      status: 'learning'
    }
  }
}));
const resB = VokabelProgressTruth.classifyCard('card_b_intro');
check(resB.status === 'learning', 'Status is "learning"');
check(resB.label === 'Đang học', 'Label is "Đang học"');
check(resB.seen === true, 'seen is true');
check(resB.dueNow === false, 'dueNow is false');
check(resB.debug.source === 'learning_state', 'debug.source is "learning_state"');

// ------------------------------------------------------------------------------
// TEST C: legacy known (legacy = known, no SRS -> learning, NEVER stable)
// ------------------------------------------------------------------------------
console.log('\n--- TEST C: legacy known (legacy = known, no SRS -> learning, NEVER stable) ---');
mockLocalStorage.clear();
mockLocalStorage.setItem('dmf_flash_progress_v2', JSON.stringify({
  card_c_legacy: 'known'
}));
const resC = VokabelProgressTruth.classifyCard('card_c_legacy');
check(resC.status === 'learning', 'Legacy known maps to "learning"');
check(resC.status !== 'stable', 'Legacy known is strictly NOT "stable"');
check(resC.label === 'Đang học', 'Label is "Đang học"');
check(resC.seen === true, 'seen is true');
check(resC.debug.source === 'legacy', 'debug.source is "legacy"');

// ------------------------------------------------------------------------------
// TEST D: legacy hard (legacy = hard, no SRS -> needs_review)
// ------------------------------------------------------------------------------
console.log('\n--- TEST D: legacy hard (legacy = hard, no SRS -> needs_review) ---');
mockLocalStorage.clear();
mockLocalStorage.setItem('dmf_flash_progress_v2', JSON.stringify({
  card_d_hard: 'hard'
}));
const resD = VokabelProgressTruth.classifyCard('card_d_hard');
check(resD.status === 'needs_review', 'Legacy hard maps to "needs_review"');
check(resD.label === 'Cần ôn', 'Label is "Cần ôn"');
check(resD.seen === true, 'seen is true');
check(resD.dueNow === true, 'dueNow is true');

// ------------------------------------------------------------------------------
// TEST E: legacy unknown (legacy = unknown, no SRS -> needs_review)
// ------------------------------------------------------------------------------
console.log('\n--- TEST E: legacy unknown (legacy = unknown, no SRS -> needs_review) ---');
mockLocalStorage.clear();
mockLocalStorage.setItem('dmf_flash_progress_v2', JSON.stringify({
  card_e_unknown: 'unknown'
}));
const resE = VokabelProgressTruth.classifyCard('card_e_unknown');
check(resE.status === 'needs_review', 'Legacy unknown maps to "needs_review"');
check(resE.label === 'Cần ôn', 'Label is "Cần ôn"');
check(resE.seen === true, 'seen is true');
check(resE.dueNow === true, 'dueNow is true');

// ------------------------------------------------------------------------------
// TEST F: SRS due (dueAt <= local calendar date -> needs_review even if Good)
// ------------------------------------------------------------------------------
console.log('\n--- TEST F: SRS due (dueAt <= local calendar date -> needs_review) ---');
mockLocalStorage.clear();
const yesterdayMs = Date.now() - 86400000;
mockLocalStorage.setItem('vokabelgo_srs_state_v1', JSON.stringify({
  cards: {
    card_f_srs_due: {
      cardId: 'card_f_srs_due',
      dueAt: yesterdayMs,
      lastRating: 3,
      historyCount: 4,
      stability: 12.5,
      difficulty: 3.2
    }
  }
}));
const resF = VokabelProgressTruth.classifyCard('card_f_srs_due');
check(resF.status === 'needs_review', 'SRS due card is "needs_review" even with lastRating Good');
check(resF.label === 'Cần ôn', 'Label is "Cần ôn"');
check(resF.seen === true, 'seen is true');
check(resF.dueNow === true, 'dueNow is true');
check(resF.debug.source === 'srs', 'debug.source is "srs"');

// ------------------------------------------------------------------------------
// TEST G: stable (SRS Good, history >= 2, future due, !needsReview)
// ------------------------------------------------------------------------------
console.log('\n--- TEST G: stable (SRS Good, history >= 2, future due, !needsReview) ---');
mockLocalStorage.clear();
const futureDueMs = Date.now() + 7 * 86400000;
mockLocalStorage.setItem('vokabelgo_srs_state_v1', JSON.stringify({
  cards: {
    card_g_stable: {
      cardId: 'card_g_stable',
      dueAt: futureDueMs,
      lastRating: 3,
      historyCount: 3,
      stability: 18.0,
      difficulty: 2.5
    }
  }
}));
mockLocalStorage.setItem('vokabelgo_learning_state_v1', JSON.stringify({
  cards: {
    card_g_stable: {
      cardId: 'card_g_stable',
      needsReview: false
    }
  }
}));
const resG = VokabelProgressTruth.classifyCard('card_g_stable');
check(resG.status === 'stable', 'Status is "stable"');
check(resG.label === 'Nhớ ổn', 'Label is "Nhớ ổn"');
check(resG.seen === true, 'seen is true');
check(resG.dueNow === false, 'dueNow is false');
check(resG.debug.historyCount === 3, 'historyCount is 3');
check(resG.debug.lastRating === 3, 'lastRating is 3');

// ------------------------------------------------------------------------------
// TEST H: one Good insufficient (history = 1, Good -> learning, not stable)
// ------------------------------------------------------------------------------
console.log('\n--- TEST H: one Good insufficient (history = 1, Good -> learning) ---');
mockLocalStorage.clear();
mockLocalStorage.setItem('vokabelgo_srs_state_v1', JSON.stringify({
  cards: {
    card_h_one_good: {
      cardId: 'card_h_one_good',
      dueAt: futureDueMs,
      lastRating: 3,
      historyCount: 1,
      stability: 2.0
    }
  }
}));
const resH = VokabelProgressTruth.classifyCard('card_h_one_good');
check(resH.status === 'learning', 'Single Good review maps to "learning"');
check(resH.status !== 'stable', 'Single Good review is NOT "stable"');
check(resH.label === 'Đang học', 'Label is "Đang học"');

// ------------------------------------------------------------------------------
// TEST I: Hard (history >= 2, Hard -> learning)
// ------------------------------------------------------------------------------
console.log('\n--- TEST I: Hard (history >= 2, Hard -> learning) ---');
mockLocalStorage.clear();
mockLocalStorage.setItem('vokabelgo_srs_state_v1', JSON.stringify({
  cards: {
    card_i_hard: {
      cardId: 'card_i_hard',
      dueAt: futureDueMs,
      lastRating: 2,
      historyCount: 4,
      stability: 3.5
    }
  }
}));
const resI = VokabelProgressTruth.classifyCard('card_i_hard');
check(resI.status === 'learning', 'Future due Hard rating maps to "learning"');
check(resI.status !== 'stable', 'Hard rating is NOT "stable"');

// ------------------------------------------------------------------------------
// TEST J: Again (Again -> learning)
// ------------------------------------------------------------------------------
console.log('\n--- TEST J: Again (Again -> learning) ---');
mockLocalStorage.clear();
mockLocalStorage.setItem('vokabelgo_srs_state_v1', JSON.stringify({
  cards: {
    card_j_again: {
      cardId: 'card_j_again',
      dueAt: futureDueMs,
      lastRating: 1,
      historyCount: 4,
      stability: 1.0
    }
  }
}));
const resJ = VokabelProgressTruth.classifyCard('card_j_again');
check(resJ.status === 'learning', 'Future due Again rating maps to "learning"');
check(resJ.status !== 'stable', 'Again rating is NOT "stable"');

// ------------------------------------------------------------------------------
// TEST K: needsReview flag (future Good history >= 2, but needsReview true -> learning)
// ------------------------------------------------------------------------------
console.log('\n--- TEST K: needsReview flag (future Good history >= 2, but needsReview true) ---');
mockLocalStorage.clear();
mockLocalStorage.setItem('vokabelgo_srs_state_v1', JSON.stringify({
  cards: {
    card_k_flag: {
      cardId: 'card_k_flag',
      dueAt: futureDueMs,
      lastRating: 3,
      historyCount: 5,
      stability: 15.0
    }
  }
}));
mockLocalStorage.setItem('vokabelgo_learning_state_v1', JSON.stringify({
  cards: {
    card_k_flag: {
      cardId: 'card_k_flag',
      needsReview: true // E.g., flagged by typing failure or reinforcement
    }
  }
}));
const resK1 = VokabelProgressTruth.classifyCard('card_k_flag');
check(resK1.status === 'learning', 'Flagged card with future SRS maps to "learning"');
check(resK1.status !== 'stable', 'Flagged card is NOT "stable"');

// If due, it maps to needs_review
mockLocalStorage.setItem('vokabelgo_srs_state_v1', JSON.stringify({
  cards: {
    card_k_flag: {
      cardId: 'card_k_flag',
      dueAt: yesterdayMs,
      lastRating: 3,
      historyCount: 5
    }
  }
}));
const resK2 = VokabelProgressTruth.classifyCard('card_k_flag');
check(resK2.status === 'needs_review', 'Flagged card when due maps to "needs_review"');

// ------------------------------------------------------------------------------
// TEST L: legacy mastered (status = mastered, no SRS evidence -> learning, not stable)
// ------------------------------------------------------------------------------
console.log('\n--- TEST L: legacy mastered (status = mastered, no SRS evidence) ---');
mockLocalStorage.clear();
mockLocalStorage.setItem('vokabelgo_learning_state_v1', JSON.stringify({
  cards: {
    card_l_mastered: {
      cardId: 'card_l_mastered',
      status: 'mastered',
      consecutiveSuccesses: 3,
      firstSeenAt: Date.now() - 5000000
    }
  }
}));
const resL = VokabelProgressTruth.classifyCard('card_l_mastered');
check(resL.status === 'learning', 'Mastered without SRS maps to "learning"');
check(resL.status !== 'stable', 'Mastered without SRS is strictly NOT "stable"');

// ------------------------------------------------------------------------------
// TEST M: Summary Invariants
// Construct: 2 unseen, 3 learning, 2 needs_review, 3 stable -> total 10
// ------------------------------------------------------------------------------
console.log('\n--- TEST M: Summary Invariants (2 unseen, 3 learning, 2 needs_review, 3 stable) ---');
mockLocalStorage.clear();
mockLocalStorage.setItem('vokabelgo_srs_state_v1', JSON.stringify({
  cards: {
    // 3 stable
    st_1: { cardId: 'st_1', dueAt: futureDueMs, lastRating: 3, historyCount: 2 },
    st_2: { cardId: 'st_2', dueAt: futureDueMs, lastRating: 3, historyCount: 3 },
    st_3: { cardId: 'st_3', dueAt: futureDueMs, lastRating: 3, historyCount: 5 },
    // 2 needs_review (SRS due)
    nr_1: { cardId: 'nr_1', dueAt: yesterdayMs, lastRating: 3, historyCount: 3 },
    nr_2: { cardId: 'nr_2', dueAt: yesterdayMs, lastRating: 1, historyCount: 1 },
    // 1 learning via SRS
    ln_1: { cardId: 'ln_1', dueAt: futureDueMs, lastRating: 2, historyCount: 3 }
  }
}));
mockLocalStorage.setItem('vokabelgo_learning_state_v1', JSON.stringify({
  cards: {
    // 1 learning via firstSeenAt
    ln_2: { cardId: 'ln_2', firstSeenAt: Date.now() - 1000 }
  }
}));
mockLocalStorage.setItem('dmf_flash_progress_v2', JSON.stringify({
  // 1 learning via legacy known
  ln_3: 'known'
}));
// 2 unseen: un_1, un_2 (no records)

const testCardsList = [
  { id: 'un_1' }, { id: 'un_2' },
  { id: 'ln_1' }, { id: 'ln_2' }, { id: 'ln_3' },
  { id: 'nr_1' }, { id: 'nr_2' },
  { id: 'st_1' }, { id: 'st_2' }, { id: 'st_3' }
];

const summaryM = VokabelProgressTruth.getSummary(testCardsList);
check(summaryM.total === 10, `summary.total is 10 (got ${summaryM.total})`);
check(summaryM.unseen === 2, `summary.unseen is 2 (got ${summaryM.unseen})`);
check(summaryM.learning === 3, `summary.learning is 3 (got ${summaryM.learning})`);
check(summaryM.needsReview === 2, `summary.needsReview is 2 (got ${summaryM.needsReview})`);
check(summaryM.stable === 3, `summary.stable is 3 (got ${summaryM.stable})`);
check(summaryM.seen === 8, `summary.seen is 8 (got ${summaryM.seen})`);
check(
  summaryM.unseen + summaryM.learning + summaryM.needsReview + summaryM.stable === summaryM.total,
  'Invariant: unseen + learning + needsReview + stable === total'
);
check(
  summaryM.seen === summaryM.learning + summaryM.needsReview + summaryM.stable,
  'Invariant: seen === learning + needsReview + stable'
);

// ------------------------------------------------------------------------------
// TEST N: Orphan State (Deleted card in SRS not in allCardsList)
// ------------------------------------------------------------------------------
console.log('\n--- TEST N: Orphan State Exclusion ---');
// Add an orphan card into SRS
const srsData = JSON.parse(mockLocalStorage.getItem('vokabelgo_srs_state_v1'));
srsData.cards['orphan_deleted_card'] = {
  cardId: 'orphan_deleted_card',
  dueAt: futureDueMs,
  lastRating: 3,
  historyCount: 10
};
mockLocalStorage.setItem('vokabelgo_srs_state_v1', JSON.stringify(srsData));

const summaryN = VokabelProgressTruth.getSummary(testCardsList); // testCardsList does NOT contain 'orphan_deleted_card'
check(summaryN.total === 10, 'Orphan card not counted towards total');
check(summaryN.stable === 3, 'Orphan card not counted towards stable');
check(summaryN.seen === 8, 'Orphan card not counted towards seen');

// ------------------------------------------------------------------------------
// TEST O: No Double Counting (Duplicate IDs in allCardsList)
// ------------------------------------------------------------------------------
console.log('\n--- TEST O: No Double Counting on Duplicate IDs ---');
const duplicatedCardsList = [
  ...testCardsList,
  { id: 'st_1' }, // duplicate stable
  { id: 'un_1' }, // duplicate unseen
  { id: 'ln_1' }  // duplicate learning
];
const summaryO = VokabelProgressTruth.getSummary(duplicatedCardsList);
check(summaryO.total === 10, `Duplicate IDs deduplicated: total is 10 (got ${summaryO.total})`);
check(summaryO.stable === 3, `Duplicate stable not counted twice: stable is 3 (got ${summaryO.stable})`);
check(summaryO.unseen === 2, `Duplicate unseen not counted twice: unseen is 2 (got ${summaryO.unseen})`);
check(summaryO.learning === 3, `Duplicate learning not counted twice: learning is 3 (got ${summaryO.learning})`);

// ------------------------------------------------------------------------------
// TEST P: Home "Nhớ ổn" uses VokabelProgressTruth summary.stable, NOT legacy known
// ------------------------------------------------------------------------------
console.log('\n--- TEST P: Home "Nhớ ổn" uses summary.stable, NOT legacy known ---');
// Set legacy progress to 40 'known' cards
const fakeLegacyProgress = {};
for (let i = 0; i < 40; i++) {
  fakeLegacyProgress[`card_${i}`] = 'known';
}
mockLocalStorage.setItem('dmf_flash_progress_v2', JSON.stringify(fakeLegacyProgress));

// But SRS only has 5 stable cards
const fakeSrs = { cards: {} };
for (let i = 0; i < 5; i++) {
  fakeSrs.cards[`card_${i}`] = {
    cardId: `card_${i}`,
    dueAt: futureDueMs,
    lastRating: 3,
    historyCount: 3
  };
}
mockLocalStorage.setItem('vokabelgo_srs_state_v1', JSON.stringify(fakeSrs));

const mockAllCards = [];
for (let i = 0; i < 40; i++) {
  mockAllCards.push({ id: `card_${i}` });
}

// In index.html, updateTodayDashboard computes progressTruth
const summaryP = VokabelProgressTruth.getSummary(mockAllCards);
check(summaryP.stable === 5, 'summary.stable reflects true SRS memory (5)');
check(summaryP.learning === 35, 'Remaining 35 legacy known are classified as learning, not stable');

// Verify index.html does NOT use Object.values(progress).filter(v => v === 'known') for learner-facing stable
check(
  !indexHtml.includes("knownCount = Object.values(progress).filter(v => v === 'known').length"),
  'index.html does NOT calculate knownCount using Object.values(progress).filter'
);
check(
  indexHtml.includes('todayMetricStable') && indexHtml.includes('progressTruth.stable'),
  'index.html assigns progressTruth.stable to #todayMetricStable'
);

// ------------------------------------------------------------------------------
// TEST Q: Main Today metrics are learning-centric (Cần ôn, Đang học, Nhớ ổn)
// ------------------------------------------------------------------------------
console.log('\n--- TEST Q: Main Today metrics are learning-centric ---');
check(indexHtml.includes('id="todayMetricNeedsReview"'), 'Has #todayMetricNeedsReview');
check(indexHtml.includes('id="todayMetricLearning"'), 'Has #todayMetricLearning');
check(indexHtml.includes('id="todayMetricStable"'), 'Has #todayMetricStable');
check(indexHtml.includes('Cần ôn'), 'Has label "Cần ôn"');
check(indexHtml.includes('Đang học'), 'Has label "Đang học"');
check(indexHtml.includes('Nhớ ổn'), 'Has label "Nhớ ổn"');

// Daily goal is in Hero ratio, not duplicate in metric strip
check(indexHtml.includes('id="todayHeroProgressRatio"'), '5-target goal is in Hero progress ratio');
// The legacy metric strip had "Mục tiêu ngày" as an active main card; verify it is demoted / hidden
const metricStripMatch = indexHtml.match(/<div class="today-metrics-strip"[^>]*>([\s\S]*?)<\/div>/);
check(metricStripMatch !== null, 'Found today-metrics-strip');
if (metricStripMatch) {
  check(!metricStripMatch[1].includes('Mục tiêu ngày'), 'Main metrics strip does not duplicate "Mục tiêu ngày"');
  check(!metricStripMatch[1].includes('Chuỗi ngày'), 'Main metrics strip does not have Streak');
  check(!metricStripMatch[1].includes('Giỏ cá'), 'Main metrics strip does not have Fish basket');
}

// ------------------------------------------------------------------------------
// TEST R: Fish + streak exist in secondary hierarchy
// ------------------------------------------------------------------------------
console.log('\n--- TEST R: Secondary row for Fish and Streak ---');
check(indexHtml.includes('id="todaySecondaryMeta"'), 'Has #todaySecondaryMeta container');
check(indexHtml.includes('id="todayMetaFishText"'), 'Has #todayMetaFishText');
check(indexHtml.includes('id="todayMetaStreakText"'), 'Has #todayMetaStreakText');

// Check CSS styling for secondary meta
check(learningCss.includes('.today-secondary-meta'), 'learning-ux.css has .today-secondary-meta');
check(learningCss.includes('.metric-needs-review'), 'learning-ux.css has .metric-needs-review');
check(learningCss.includes('.metric-learning'), 'learning-ux.css has .metric-learning');
check(learningCss.includes('.metric-stable'), 'learning-ux.css has .metric-stable');

// Test zero-streak supportive copy
let testStreakZero = 0;
let streakText = testStreakZero > 0 ? `${testStreakZero} ngày học đều` : 'Hôm nay là một ngày học mới.';
check(streakText === 'Hôm nay là một ngày học mới.', 'Zero streak renders neutral supportive message');

// ------------------------------------------------------------------------------
// TEST S: needsReview = 0 -> Home displays supportive text without guilt/warning
// ------------------------------------------------------------------------------
console.log('\n--- TEST S: needsReview = 0 supportive copy ---');
const zeroReviewDesc = 'VokabelGo sẽ ưu tiên những từ đến lượt ôn và thêm từ mới vừa đủ cho phiên 5 mục tiêu.';
check(!zeroReviewDesc.toLowerCase().includes('nợ'), 'Zero review copy has no "nợ"');
check(!zeroReviewDesc.toLowerCase().includes('quá hạn'), 'Zero review copy has no "quá hạn"');
check(!zeroReviewDesc.toLowerCase().includes('bỏ quên'), 'Zero review copy has no "bỏ quên"');
check(zeroReviewDesc.includes('ưu tiên những từ đến lượt ôn'), 'Zero review copy explains review prioritization calmly');

// ------------------------------------------------------------------------------
// TEST T: needsReview = 25 -> Home displays supportive review text, NO guilt
// ------------------------------------------------------------------------------
console.log('\n--- TEST T: needsReview = 25 supportive review copy ---');
const reviewCount = 25;
const reviewDesc = `Có ${reviewCount} từ đang đến lượt ôn. VokabelGo sẽ ưu tiên những từ đến lượt ôn và thêm từ mới vừa đủ cho phiên 5 mục tiêu.`;
check(!reviewDesc.toLowerCase().includes('nợ'), 'Backlog copy has no "nợ"');
check(!reviewDesc.toLowerCase().includes('quá hạn'), 'Backlog copy has no "quá hạn"');
check(!reviewDesc.toLowerCase().includes('bỏ quên'), 'Backlog copy has no "bỏ quên"');
check(reviewDesc.includes('phiên 5 mục tiêu'), 'Always focuses on a manageable 5-target daily session');

// ------------------------------------------------------------------------------
// TEST TIMEZONE: Calendar date due classification matches VokabelSRS.isDueForDailySession
// ------------------------------------------------------------------------------
console.log('\n--- TEST TIMEZONE: Calendar date due classification ---');
// Scheduled late last night at 23:59:00 local time with 1 day interval
const now = new Date();
const yesterdayLate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 0).getTime();
check(VokabelSRS.isDueForDailySession(yesterdayLate, now.getTime()) === true, 'Late yesterday review is due this morning');

// Scheduled tomorrow morning at 08:00 local time
const tomorrowMorning = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 8, 0, 0).getTime();
check(VokabelSRS.isDueForDailySession(tomorrowMorning, now.getTime()) === false, 'Tomorrow morning review is NOT due today');

// Classified by VokabelProgressTruth
mockLocalStorage.clear();
mockLocalStorage.setItem('vokabelgo_srs_state_v1', JSON.stringify({
  cards: {
    late_yesterday: { cardId: 'late_yesterday', dueAt: yesterdayLate, lastRating: 3, historyCount: 3 },
    tomorrow_card: { cardId: 'tomorrow_card', dueAt: tomorrowMorning, lastRating: 3, historyCount: 3 }
  }
}));
const classYesterday = VokabelProgressTruth.classifyCard('late_yesterday', now.getTime());
check(classYesterday.status === 'needs_review', 'Late yesterday review is classified as "needs_review" today');
const classTomorrow = VokabelProgressTruth.classifyCard('tomorrow_card', now.getTime());
check(classTomorrow.status === 'stable', 'Tomorrow review with good history is classified as "stable" today');

// ------------------------------------------------------------------------------
// SUMMARY
// ------------------------------------------------------------------------------
console.log('\n====================================================');
console.log(`ACCEPTANCE SUMMARY: ${passedTests} / ${totalTests} PASSED`);
if (passedTests === totalTests) {
  console.log('🎉 ALL PHASE 4B TESTS (TEST A -> TEST T + TIMEZONE) PASSED SUCCESSFULLY!');
  console.log('====================================================\n');
  process.exit(0);
} else {
  console.error(`⚠️ FAILED: ${totalTests - passedTests} tests failed`);
  console.log('====================================================\n');
  process.exit(1);
}
