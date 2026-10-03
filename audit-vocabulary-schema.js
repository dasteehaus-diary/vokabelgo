// ==============================================================================
// VokabelGo - Vocabulary Data Model Audit Script (Phase 4A & 4A.1)
// Audits BASE and VIDEO_FLASHCARDS against VokabelCardSchema normalization
// and validates permanent card identity integrity.
// ==============================================================================

const fs = require('fs');
const path = require('path');

const VokabelCardSchema = require('./vocabulary-schema.js');

function loadCards() {
  const htmlPath = path.join(__dirname, 'index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  const baseMatch = htmlContent.match(/const BASE = (\[[\s\S]*?\r?\n\]);/);
  const videoMatch = htmlContent.match(/const VIDEO_FLASHCARDS = (\[[\s\S]*?\r?\n\]);/);

  if (!baseMatch || !videoMatch) {
    throw new Error('Unable to extract BASE or VIDEO_FLASHCARDS from index.html');
  }

  // Safely parse
  const base = eval(baseMatch[1]);
  const video = eval(videoMatch[1]);

  let missingIdCount = 0;
  base.forEach((c, i) => {
    if (!c.id) {
      missingIdCount++;
    }
    c.source = 'base';
  });

  video.forEach((c, i) => {
    if (!c.id) {
      missingIdCount++;
    }
    c.source = 'video';
  });

  const all = [...base, ...video];
  const seenIds = new Set();
  let duplicateIdCount = 0;
  const duplicateIds = [];

  all.forEach(c => {
    if (c.id) {
      if (seenIds.has(c.id)) {
        duplicateIdCount++;
        duplicateIds.push(c.id);
      }
      seenIds.add(c.id);
    }
  });

  return { base, video, all, missingIdCount, duplicateIdCount, duplicateIds };
}

function runAudit() {
  console.log('====================================================');
  console.log('VOKABELGO VOCABULARY DATA MODEL AUDIT (PHASE 4A.1)');
  console.log('====================================================\n');

  const { base, video, all, missingIdCount, duplicateIdCount, duplicateIds } = loadCards();

  if (missingIdCount > 0) {
    throw new Error(`Data integrity violation: ${missingIdCount} built-in cards are missing explicit id!`);
  }
  if (duplicateIdCount > 0) {
    throw new Error(`Data integrity violation: ${duplicateIdCount} duplicate IDs detected: ${duplicateIds.join(', ')}`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    totalCards: all.length,
    sources: {
      baseCards: base.length,
      videoCards: video.length
    },
    missingIdCount,
    duplicateIdCount,
    byCardType: {
      noun: 0,
      verb: 0,
      phrase: 0,
      expression: 0,
      grammar: 0,
      question: 0,
      content: 0,
      other: 0
    },
    questionOrContentCombined: 0,
    objectiveTypingEligible: 0,
    objectiveTypingIneligible: 0,
    needsManualReviewCount: 0,
    ambiguousCards: []
  };

  all.forEach((card, index) => {
    // Ensure card is not mutated
    const originalCardCopy = JSON.stringify(card);
    const profile = VokabelCardSchema.normalizeCard(card);

    if (JSON.stringify(card) !== originalCardCopy) {
      throw new Error(`Data mutation detected on card index ${index}: ${card.term}`);
    }

    if (report.byCardType[profile.cardType] !== undefined) {
      report.byCardType[profile.cardType]++;
    } else {
      report.byCardType.other++;
    }

    if (profile.cardType === 'question' || profile.cardType === 'content') {
      report.questionOrContentCombined++;
    }

    if (profile.objectiveTypingEligible) {
      report.objectiveTypingEligible++;
    } else {
      report.objectiveTypingIneligible++;
    }

    if (profile.needsManualReview) {
      report.needsManualReviewCount++;
      report.ambiguousCards.push({
        id: card.id,
        source: card.source,
        term: card.term,
        meaning: card.meaning,
        cardType: profile.cardType,
        objectiveTypingEligible: profile.objectiveTypingEligible,
        reasons: profile.ambiguityReasons
      });
    }
  });

  // Display formatted console report
  console.log('--- 1. DATASET TOTALS & IDENTITY INTEGRITY ---');
  console.log(`  Total Cards:                    ${report.totalCards}`);
  console.log(`    - BASE:                       ${report.sources.baseCards}`);
  console.log(`    - VIDEO_FLASHCARDS:           ${report.sources.videoCards}`);
  console.log(`  Missing ID Count:               ${report.missingIdCount}`);
  console.log(`  Duplicate ID Count:             ${report.duplicateIdCount}\n`);

  console.log('--- 2. DISTRIBUTION BY CARD TYPE ---');
  console.log(`  • Noun:                         ${report.byCardType.noun}`);
  console.log(`  • Verb:                         ${report.byCardType.verb}`);
  console.log(`  • Phrase:                       ${report.byCardType.phrase}`);
  console.log(`  • Expression:                   ${report.byCardType.expression}`);
  console.log(`  • Grammar:                      ${report.byCardType.grammar}`);
  console.log(`  • Question:                     ${report.byCardType.question}`);
  console.log(`  • Content:                      ${report.byCardType.content}`);
  console.log(`  • [Question/Content combined]:  ${report.questionOrContentCombined}`);
  console.log(`  • Other:                        ${report.byCardType.other}\n`);

  console.log('--- 3. OBJECTIVE TYPING ELIGIBILITY ---');
  console.log(`  • Eligible for Typing:          ${report.objectiveTypingEligible} (${((report.objectiveTypingEligible / report.totalCards) * 100).toFixed(1)}%)`);
  console.log(`  • Excluded from Typing:         ${report.objectiveTypingIneligible} (${((report.objectiveTypingIneligible / report.totalCards) * 100).toFixed(1)}%)\n`);

  console.log('--- 4. AMBIGUITY & SAFETY AUDIT ---');
  console.log(`  • Cards Needing Manual Review:  ${report.needsManualReviewCount} (${((report.needsManualReviewCount / report.totalCards) * 100).toFixed(1)}%)`);

  if (report.ambiguousCards.length > 0) {
    console.log('\n  Sample cards needing manual review:');
    report.ambiguousCards.slice(0, 8).forEach(item => {
      console.log(`    [${item.id}] "${item.term}" (${item.reasons.join(', ')})`);
    });
  }

  // Save report JSON
  const outputPath = path.join(__dirname, 'audit-vocabulary-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n✅ Detailed JSON audit report written to: ${outputPath}\n`);

  return report;
}

if (require.main === module) {
  runAudit();
}

module.exports = { runAudit, loadCards };
