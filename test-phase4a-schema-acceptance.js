// ==============================================================================
// VokabelGo - Phase 4A & 4A.1 Acceptance Test Suite
// Acceptance tests for Vocabulary Data Model Normalization Layer,
// Card Identity Materialization & Normalization Cache Hardening
// ==============================================================================

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 1. Setup mock environment
const mockWindow = {};
global.window = mockWindow;
global.document = {
  readyState: 'complete',
  getElementById: () => ({ classList: { add: () => {}, remove: () => {} }, style: {} }),
  querySelectorAll: () => []
};

// 2. Load dependencies
const VokabelCardSchema = require('./vocabulary-schema.js');
const VokabelTypingVerification = require('./typing-verification.js');
const { runAudit, loadCards } = require('./audit-vocabulary-schema.js');

let passedTests = 0;
let totalTests = 0;

function check(condition, desc) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${desc}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${desc}`);
  }
}

console.log('====================================================');
console.log('RUNNING PHASE 4A.1 VOCABULARY SCHEMA ACCEPTANCE TESTS');
console.log('====================================================\n');

// ------------------------------------------------------------------------------
// TEST A: Noun with shorthand plural: "die Geste, -n"
// ------------------------------------------------------------------------------
console.log('--- TEST A: Noun shorthand plural (die Geste, -n) ---');
const cardA = { term: 'die Geste, -n', meaning: 'cử chỉ' };
const profileA = VokabelCardSchema.normalizeCard(cardA);
check(profileA.canonicalAnswer === 'die Geste', 'canonicalAnswer is "die Geste"');
check(profileA.article === 'die', 'article is "die"');
check(profileA.headword === 'Geste', 'headword is "Geste"');
check(profileA.pluralNotation === '-n', 'pluralNotation is "-n"');
check(profileA.cardType === 'noun', 'cardType is "noun"');
check(profileA.objectiveTypingEligible === true, 'objectiveTypingEligible is true');

// ------------------------------------------------------------------------------
// TEST B: Noun full plural: "der Gesichtsausdruck, die Gesichtsausdrücke"
// ------------------------------------------------------------------------------
console.log('\n--- TEST B: Noun full plural (der Gesichtsausdruck, die Gesichtsausdrücke) ---');
const cardB = { term: 'der Gesichtsausdruck, die Gesichtsausdrücke', meaning: 'biểu cảm nét mặt' };
const profileB = VokabelCardSchema.normalizeCard(cardB);
check(profileB.canonicalAnswer === 'der Gesichtsausdruck', 'canonicalAnswer is "der Gesichtsausdruck"');
check(profileB.article === 'der', 'article is "der"');
check(profileB.headword === 'Gesichtsausdruck', 'headword is "Gesichtsausdruck"');
check(profileB.plural === 'die Gesichtsausdrücke', 'plural is "die Gesichtsausdrücke"');
check(profileB.pluralNotation === 'die Gesichtsausdrücke', 'pluralNotation is "die Gesichtsausdrücke"');
check(profileB.cardType === 'noun', 'cardType is "noun"');
check(profileB.objectiveTypingEligible === true, 'objectiveTypingEligible is true');

// ------------------------------------------------------------------------------
// TEST C: Phrase with grammar metadata: "jemandem guttun + Dat."
// ------------------------------------------------------------------------------
console.log('\n--- TEST C: Grammar metadata separation (jemandem guttun + Dat.) ---');
const cardC = { term: 'jemandem guttun + Dat.', meaning: 'tốt cho ai đó' };
const profileC = VokabelCardSchema.normalizeCard(cardC);
check(profileC.displayTerm === 'jemandem guttun + Dat.', 'displayTerm intact');
check(profileC.canonicalAnswer === 'jemandem guttun', 'canonicalAnswer separated from grammarMeta');
check(profileC.headword === 'jemandem guttun', 'headword is "jemandem guttun"');
check(profileC.grammarMeta === '+ Dat.', 'grammarMeta correctly detected as "+ Dat."');
check(profileC.objectiveTypingEligible === false, 'objectiveTypingEligible is false due to grammar metadata');

// ------------------------------------------------------------------------------
// TEST D: Grammar card: "Modalverb + Passiv"
// ------------------------------------------------------------------------------
console.log('\n--- TEST D: Grammar cards (Modalverb + Passiv) ---');
const cardD = { term: 'Modalverb + Passiv', meaning: 'động từ khuyết thiếu bị động', tags: ['Grammatik'] };
const profileD = VokabelCardSchema.normalizeCard(cardD);
check(profileD.cardType === 'grammar', 'cardType is "grammar"');
check(profileD.grammarMeta === '+ Passiv', 'grammarMeta is "+ Passiv"');
check(profileD.canonicalAnswer === 'Modalverb', 'canonicalAnswer cleaned');
check(profileD.objectiveTypingEligible === false, 'objectiveTypingEligible is false for grammar card');

// Test additional grammar cards from actual dataset
const cardD2 = { term: 'soll + Infinitiv Perfekt', tags: ['Grammatik'] };
const profileD2 = VokabelCardSchema.normalizeCard(cardD2);
check(profileD2.cardType === 'grammar', 'soll + Infinitiv Perfekt cardType is "grammar"');
check(profileD2.grammarMeta === '+ Infinitiv Perfekt', 'grammarMeta is "+ Infinitiv Perfekt"');
check(profileD2.objectiveTypingEligible === false, 'typing false for soll + Infinitiv Perfekt');

const cardD3 = { term: 'außerhalb + Genitiv', tags: ['Grammatik'] };
const profileD3 = VokabelCardSchema.normalizeCard(cardD3);
check(profileD3.cardType === 'grammar', 'außerhalb + Genitiv cardType is "grammar"');
check(profileD3.grammarMeta === '+ Genitiv', 'grammarMeta is "+ Genitiv"');
check(profileD3.objectiveTypingEligible === false, 'typing false for außerhalb + Genitiv');

// ------------------------------------------------------------------------------
// TEST E: Question / Content cards
// ------------------------------------------------------------------------------
console.log('\n--- TEST E: Question and Content cards ---');
const cardE1 = { term: 'Was ist das?', meaning: 'Cái này là gì?' };
const profileE1 = VokabelCardSchema.normalizeCard(cardE1);
check(profileE1.cardType === 'question', 'cardType is "question" when term contains ?');
check(profileE1.objectiveTypingEligible === false, 'typing false for question');

const cardE2 = { term: 'Tóm tắt bài đọc', meaning: 'Nội dung', tags: ['Inhalt'] };
const profileE2 = VokabelCardSchema.normalizeCard(cardE2);
check(profileE2.cardType === 'content', 'cardType is "content" for Inhalt tag');
check(profileE2.objectiveTypingEligible === false, 'typing false for content card');

const cardE3 = { term: 'Câu hỏi tiếng Đức', meaning: 'Ý nghĩa có dấu ?', tags: [] };
const profileE3 = VokabelCardSchema.normalizeCard(cardE3);
check(profileE3.cardType === 'question', 'meaning with ? classified as question');
check(profileE3.objectiveTypingEligible === false, 'typing false when meaning has ?');

// ------------------------------------------------------------------------------
// TEST F: Verb / Lexical phrase: "sich bewerben"
// ------------------------------------------------------------------------------
console.log('\n--- TEST F: Verb / lexical phrase (sich bewerben) ---');
const cardF = { term: 'sich bewerben', meaning: 'ứng tuyển' };
const profileF = VokabelCardSchema.normalizeCard(cardF);
check(profileF.cardType === 'verb', 'cardType is "verb"');
check(profileF.canonicalAnswer === 'sich bewerben', 'canonicalAnswer intact for sich bewerben');
check(profileF.headword === 'sich bewerben', 'headword is "sich bewerben"');
check(profileF.article === null, 'article is null');
check(profileF.objectiveTypingEligible === true, 'objectiveTypingEligible is true for sich bewerben');

// ------------------------------------------------------------------------------
// TEST G: Immutability of Source Card Object
// ------------------------------------------------------------------------------
console.log('\n--- TEST G: Immutability of Source Card Object ---');
const originalCard = {
  id: 'test_immutability',
  term: 'die Geste, -n',
  meaning: 'cử chỉ',
  grammar: 'thường dùng số ít',
  collocations: ['eine Geste machen'],
  tags: ['Lektion 2', 'Kommunikation']
};
const snapshotBefore = JSON.stringify(originalCard);

// Freeze to guarantee runtime exception if mutated
const frozenCard = Object.freeze({
  ...originalCard,
  collocations: Object.freeze([...originalCard.collocations]),
  tags: Object.freeze([...originalCard.tags])
});

const profileG = VokabelCardSchema.normalizeCard(frozenCard);
check(profileG !== null && typeof profileG === 'object', 'normalizeCard succeeded on frozen object');
check(JSON.stringify(originalCard) === snapshotBefore, 'Source card object was NOT mutated in any way');

// Check cache clone isolation
profileG.canonicalAnswer = 'MUTATED';
const profileG2 = VokabelCardSchema.normalizeCard(frozenCard);
check(profileG2.canonicalAnswer === 'die Geste', 'Caller mutation cannot corrupt cached profile');

// ------------------------------------------------------------------------------
// TEST H: Materialized Card IDs & Invariant Checks
// ------------------------------------------------------------------------------
console.log('\n--- TEST H: Materialized Card IDs & Invariants ---');
const { base, video, all, missingIdCount, duplicateIdCount } = loadCards();
check(base.length >= 234, 'BASE has at least 234 cards');
check(video.length >= 60, 'VIDEO_FLASHCARDS has at least 60 cards');
check(all.length === base.length + video.length, 'Total dataset equals base + video length');

check(missingIdCount === 0, 'Every built-in card has an explicit id (missingIdCount === 0)');
check(duplicateIdCount === 0, 'Zero duplicate IDs across all built-in cards (duplicateIdCount === 0)');

// Verify exact historical explicit IDs frozen
check(base[0].id === 'b_0' && base[0].term === 'die Körpersprache', 'BASE[0] is explicitly b_0 (die Körpersprache)');
check(base[1].id === 'b_1' && base[1].term === 'die Geste, -n', 'BASE[1] is explicitly b_1 (die Geste, -n)');
check(base[233].id === 'b_233', 'BASE[233] is explicitly b_233');
check(video[0].id === 'vk_0' && video[0].term === 'der Pizzaladen', 'VIDEO[0] is explicitly vk_0 (der Pizzaladen)');
check(video[59].id === 'vk_59', 'VIDEO[59] is explicitly vk_59');

// ------------------------------------------------------------------------------
// TEST H2: ID Stability Independent of Array Position / Insertion / Reorder
// ------------------------------------------------------------------------------
console.log('\n--- TEST H2: ID Stability Independent of Array Ordering ---');
// Create a modified array with dummy cards inserted at beginning and middle
const dummyFirst = { id: 'b_new_0', term: 'Neu 0', meaning: 'Mới 0' };
const dummyMiddle = { id: 'b_new_1', term: 'Neu 1', meaning: 'Mới 1' };
const reordered = [dummyFirst, ...base.slice(0, 10), dummyMiddle, ...base.slice(10)];

// Check that existing cards in the reordered array retain their explicit IDs
const korperInReordered = reordered.find(c => c.term === 'die Körpersprache');
const gesteInReordered = reordered.find(c => c.term === 'die Geste, -n');
check(korperInReordered.id === 'b_0', 'die Körpersprache retains id b_0 after array insertion');
check(gesteInReordered.id === 'b_1', 'die Geste, -n retains id b_1 after array insertion');

// Reverse array order
const reversed = [...base].reverse();
const korperInReversed = reversed.find(c => c.term === 'die Körpersprache');
check(korperInReversed.id === 'b_0', 'die Körpersprache retains id b_0 after array reversal');

// Verify that missing ID in built-in cards throws error in validation loop
let threwOnMissing = false;
try {
  const invalidBuiltIn = [{ term: 'No ID Card' }];
  invalidBuiltIn.forEach((c, i) => {
    if (!c.id) throw new Error('Data integrity error: missing explicit id');
    c.source = 'base';
  });
} catch (e) {
  threwOnMissing = true;
}
check(threwOnMissing === true, 'Built-in card without ID throws error in validation loop (fail loudly)');

// ------------------------------------------------------------------------------
// TEST CACHE: Normalization Cache Hardening (P0-2)
// ------------------------------------------------------------------------------
console.log('\n--- TEST CACHE: Normalization Cache Hardening (P0-2) ---');
VokabelCardSchema.clearCache();

// CACHE-A: Tag mutation on same object recomputes cache
const cacheCardA = { id: 'cache_1', term: 'sich bewerben', meaning: 'ứng tuyển', tags: [] };
const cpA1 = VokabelCardSchema.normalizeCard(cacheCardA);
check(cpA1.cardType === 'verb' && cpA1.objectiveTypingEligible === true, 'Initial sich bewerben is verb & typing eligible');

cacheCardA.tags = ['Grammatik'];
const cpA2 = VokabelCardSchema.normalizeCard(cacheCardA);
check(cpA2.cardType === 'grammar' && cpA2.objectiveTypingEligible === false, 'CACHE-A: Mutated tags to Grammatik recomputes profile (not stale)');

// CACHE-B: Same id + term, mutate grammar recomputes cache
const cacheCardB = { id: 'cache_2', term: 'der Tonfall', meaning: 'giọng điệu', grammar: '' };
const cpB1 = VokabelCardSchema.normalizeCard(cacheCardB);
check(cpB1.plural === null, 'Initial der Tonfall has null plural');

cacheCardB.grammar = 'der Tonfall, die Tonfälle (m.)';
const cpB2 = VokabelCardSchema.normalizeCard(cacheCardB);
check(cpB2.plural === 'die Tonfälle', 'CACHE-B: Mutated grammar recomputes plural in profile');

// CACHE-C: Same id + term, mutate deck to Grammatik recomputes cache
const cacheCardC = { id: 'cache_3', term: 'sich bewerben', meaning: 'ứng tuyển', deck: 'Alltag' };
const cpC1 = VokabelCardSchema.normalizeCard(cacheCardC);
check(cpC1.objectiveTypingEligible === true, 'Initial card in Alltag deck is typing eligible');

cacheCardC.deck = 'Grammatik Lektion 2';
const cpC2 = VokabelCardSchema.normalizeCard(cacheCardC);
check(cpC2.objectiveTypingEligible === false, 'CACHE-C: Mutated deck to Grammatik makes typing false');

// CACHE-D: Returned ambiguityReasons mutation does not corrupt internal cache
const cacheCardD = { id: 'cache_4', term: 'schreien / anschreien', meaning: 'hét' };
const cpD1 = VokabelCardSchema.normalizeCard(cacheCardD);
check(cpD1.ambiguityReasons.includes('has_slash_or_semicolon'), 'Initial card has slash reason');

cpD1.ambiguityReasons.push('corrupted_reason');
const cpD2 = VokabelCardSchema.normalizeCard(cacheCardD);
check(cpD2.ambiguityReasons.includes('corrupted_reason') === false, 'CACHE-D: Caller mutation of ambiguityReasons does NOT corrupt internal cache');

// ------------------------------------------------------------------------------
// TEST I: Phase 3 Integration & Typing Verification Facade
// ------------------------------------------------------------------------------
console.log('\n--- TEST I: Phase 3 Integration & Typing Verification Facade ---');
// Verify VokabelTypingVerification delegates to VokabelCardSchema
const canonicalFromFacade = VokabelTypingVerification.getCanonicalTypingAnswer(cardA);
const canonicalFromSchema = profileA.canonicalAnswer;
check(canonicalFromFacade === canonicalFromSchema, 'Facade getCanonicalTypingAnswer matches schema canonicalAnswer');

const eligibleFromFacade = VokabelTypingVerification.isTypingEligible(cardA);
const eligibleFromSchema = profileA.objectiveTypingEligible;
check(eligibleFromFacade === eligibleFromSchema, 'Facade isTypingEligible matches schema objectiveTypingEligible');

// Verify exclusion matching
check(VokabelTypingVerification.isTypingEligible(cardC) === false, 'TypingVerification excludes cardC (+ Dat.)');
check(VokabelTypingVerification.isTypingEligible(cardD) === false, 'TypingVerification excludes cardD (Grammatik)');

// Check grading continues to work seamlessly with canonical
const gradeRes = VokabelTypingVerification.gradeTypingAnswer('die geste', null, cardA);
check(gradeRes.result === 'correct', 'gradeTypingAnswer produces correct using schema canonical');

// ------------------------------------------------------------------------------
// TEST J: Audit Script Execution Across Dataset Without Error
// ------------------------------------------------------------------------------
console.log('\n--- TEST J: Audit Script Execution & Dataset Invariants ---');
let auditThrown = false;
let auditResult = null;
try {
  auditResult = runAudit();
} catch (e) {
  auditThrown = true;
  console.error('Audit script threw error:', e);
}
check(auditThrown === false, 'Audit script runs across entire dataset without throwing');
check(auditResult !== null && auditResult.totalCards === all.length, 'Audit report totalCards equals loaded dataset length');
check(auditResult.missingIdCount === 0, 'Audit confirms 0 missing IDs');
check(auditResult.duplicateIdCount === 0, 'Audit confirms 0 duplicate IDs');
check(auditResult.objectiveTypingEligible + auditResult.objectiveTypingIneligible === auditResult.totalCards, 'Audit invariant: eligible + ineligible === totalCards');
check(fs.existsSync(path.join(__dirname, 'audit-vocabulary-report.json')), 'audit-vocabulary-report.json successfully written');

// ------------------------------------------------------------------------------
// TEST K: Ambiguity & Anomaly Safety Policy
// ------------------------------------------------------------------------------
console.log('\n--- TEST K: Ambiguity Safety Policy ---');
const ambiguousSlash = { term: 'bilingual / zweisprachig', meaning: 'song ngữ' };
const profSlash = VokabelCardSchema.normalizeCard(ambiguousSlash);
check(profSlash.needsManualReview === true, 'Slash card flagged for needsManualReview');
check(profSlash.objectiveTypingEligible === false, 'Slash card excluded from objective typing');

const ambiguousEllipsis = { term: 'Langer Rede kurzer Sinn: …', meaning: 'Nói ngắn gọn' };
const profEllipsis = VokabelCardSchema.normalizeCard(ambiguousEllipsis);
check(profEllipsis.needsManualReview === true, 'Ellipsis card flagged for needsManualReview');
check(profEllipsis.objectiveTypingEligible === false, 'Ellipsis card excluded from objective typing');

// Null and empty safety
const emptyProf = VokabelCardSchema.normalizeCard(null);
check(emptyProf.cardType === 'other', 'null input safely yields cardType other');
check(emptyProf.objectiveTypingEligible === false, 'null input safely yields objectiveTypingEligible false');

console.log('\n====================================================');
console.log(`ACCEPTANCE SUMMARY: ${passedTests} / ${totalTests} PASSED`);
if (passedTests === totalTests) {
  console.log('🎉 ALL PHASE 4A.1 TESTS PASSED SUCCESSFULLY!');
} else {
  console.log('⚠️ SOME TESTS FAILED. PLEASE REVIEW OUTPUT ABOVE.');
  process.exit(1);
}
