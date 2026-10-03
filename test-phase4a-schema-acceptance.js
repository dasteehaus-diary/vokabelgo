// ==============================================================================
// VokabelGo - Phase 4A Acceptance Test Suite
// Acceptance tests for Vocabulary Data Model Normalization Layer
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
console.log('RUNNING PHASE 4A VOCABULARY SCHEMA ACCEPTANCE TESTS');
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
// TEST B: Noun with full plural: "der Gesichtsausdruck, die Gesichtsausdrücke"
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
// TEST H: Card IDs Unchanged (BASE b_0..b_233, VIDEO vk_0..vk_59)
// ------------------------------------------------------------------------------
console.log('\n--- TEST H: Card IDs Unchanged ---');
const { base, video, all } = loadCards();
check(base.length === 234, 'BASE has exactly 234 cards');
check(video.length === 60, 'VIDEO_FLASHCARDS has exactly 60 cards');
check(all.length === 294, 'Total dataset has exactly 294 cards');
check(base[0].id === 'b_0', 'BASE[0] id is b_0');
check(base[233].id === 'b_233', 'BASE[233] id is b_233');
check(video[0].id === 'vk_0', 'VIDEO[0] id is vk_0');
check(video[59].id === 'vk_59', 'VIDEO[59] id is vk_59');

let idCollisions = 0;
const idSet = new Set();
all.forEach(c => {
  if (idSet.has(c.id)) idCollisions++;
  idSet.add(c.id);
});
check(idCollisions === 0, 'Zero ID collisions across all 294 cards');

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
console.log('\n--- TEST J: Audit Script Execution ---');
let auditThrown = false;
let auditResult = null;
try {
  auditResult = runAudit();
} catch (e) {
  auditThrown = true;
  console.error('Audit script threw error:', e);
}
check(auditThrown === false, 'Audit script runs across entire dataset without throwing');
check(auditResult !== null && auditResult.totalCards === 294, 'Audit report contains 294 cards');
check(auditResult.objectiveTypingEligible === 177, 'Audit report has exactly 177 typing-eligible cards');
check(auditResult.objectiveTypingIneligible === 117, 'Audit report has exactly 117 typing-ineligible cards');
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
  console.log('🎉 ALL PHASE 4A TESTS (TEST A -> TEST K) PASSED SUCCESSFULLY!');
} else {
  console.log('⚠️ SOME TESTS FAILED. PLEASE REVIEW OUTPUT ABOVE.');
  process.exit(1);
}
