// test-all.js
// Runs all acceptance test suites sequentially and exits non-zero if any fails
const { spawnSync } = require('child_process');
const path = require('path');

const suites = [
  'test-security-auth-acceptance.js',
  'test-pedagogical-ux-acceptance.js',
  'test-phase1-acceptance.js',
  'test-core-learning-loop-acceptance.js',
  'test-fsrs-srs-acceptance.js',
  'test-phase3-typing-acceptance.js',
  'test-phase4a-schema-acceptance.js'
];

let failedSuites = [];

console.log('====================================================');
console.log('RUNNING ALL ACCEPTANCE TEST SUITES SEQUENTIALLY');
console.log('====================================================\n');

for (const suite of suites) {
  console.log(`\n====================================================`);
  console.log(`>>> EXECUTING: ${suite}`);
  console.log(`====================================================`);
  const res = spawnSync(process.execPath, [path.join(__dirname, suite)], {
    stdio: 'inherit',
    cwd: __dirname
  });

  if (res.status !== 0) {
    console.error(`\n❌ FAILED SUITE: ${suite} (exit code ${res.status})\n`);
    failedSuites.push(suite);
  } else {
    console.log(`\n✅ COMPLETED SUITE: ${suite} (PASS)\n`);
  }
}

console.log('====================================================');
console.log('ALL SUITES EXECUTION SUMMARY');
console.log('====================================================');
if (failedSuites.length === 0) {
  console.log(`🎉 ALL ${suites.length} SUITES PASSED CLEANLY! ZERO REGRESSIONS.`);
  console.log('====================================================\n');
  process.exit(0);
} else {
  console.error(`⚠️ ${failedSuites.length} / ${suites.length} SUITES FAILED: ${failedSuites.join(', ')}`);
  console.log('====================================================\n');
  process.exit(1);
}
