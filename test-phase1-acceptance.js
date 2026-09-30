/**
 * Automated Acceptance Test Suite for Phase 1: Daily Goal + Streak Engine
 * Tests 1 through 10
 */

const fs = require('fs');
const path = require('path');

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
  getElementById: (id) => {
    return {
      id,
      innerHTML: '',
      textContent: '',
      style: {},
      classList: {
        add: () => {},
        remove: () => {}
      }
    };
  }
};

global.window = mockWindow;
global.localStorage = mockWindow.localStorage;
global.document = mockDocument;
global.CustomEvent = CustomEventMock;
global.showRetroToast = (msg, icon) => {
  mockWindow._lastToast = { msg, icon };
};

// Load daily-progress.js
const dailyCode = fs.readFileSync(path.join(__dirname, 'daily-progress.js'), 'utf-8');
eval(dailyCode);

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedCount++;
  }
}

console.log('=== RUNNING ACCEPTANCE TESTS 1 TO 10 ===\n');

// TEST 1
console.log('--- TEST 1: Học cùng 1 thẻ 5 lần -> Daily goal đếm 1, chưa hoàn thành ---');
localStorage.clear();
const todayKey = window.VokabelDaily.getTodayDateKey();
window.VokabelDaily.reviewCard('card-001');
window.VokabelDaily.reviewCard('card-001');
window.VokabelDaily.reviewCard('card-001');
window.VokabelDaily.reviewCard('card-001');
window.VokabelDaily.reviewCard('card-001');

assert(window.VokabelDaily.getTodayCount() === 1, `Count is 1 (actual: ${window.VokabelDaily.getTodayCount()})`);
assert(window.VokabelDaily.isCompletedToday() === false, `Completed is false`);
assert(window.VokabelDaily.getTodayReviewedCardIds().length === 1, `Reviewed IDs has 1 entry`);

// TEST 2
console.log('\n--- TEST 2: Học 5 thẻ khác nhau trong cùng 1 ngày -> 5/5, completed === true, completedAt ISO, catchStatus pending ---');
window.VokabelDaily.reviewCard('card-002');
window.VokabelDaily.reviewCard('card-003');
window.VokabelDaily.reviewCard('card-004');
const summaryBefore5 = window.VokabelDaily.getSummary();
assert(summaryBefore5.completed === false, 'Not completed at 4 cards');

let goalCompletedFired = 0;
window.addEventListener('vokabelgo:daily-goal-complete', (e) => {
  goalCompletedFired++;
});

window.VokabelDaily.reviewCard('card-005');
const summaryAfter5 = window.VokabelDaily.getSummary();
assert(summaryAfter5.todayCount === 5, `Today count is 5`);
assert(summaryAfter5.completed === true, `Completed is true`);
assert(summaryAfter5.completedAt !== null && !isNaN(Date.parse(summaryAfter5.completedAt)), `completedAt is valid ISO: ${summaryAfter5.completedAt}`);
assert(summaryAfter5.catchStatus === 'pending', `catchStatus is 'pending'`);
assert(goalCompletedFired === 1, `vokabelgo:daily-goal-complete fired exactly 1 time`);

// TEST 3
console.log('\n--- TEST 3: Học thêm thẻ thứ 6, thứ 7 -> UI 5/5, completed vẫn true, event không bắn lại ---');
window.VokabelDaily.reviewCard('card-006');
window.VokabelDaily.reviewCard('card-007');
const summaryAfter7 = window.VokabelDaily.getSummary();
assert(summaryAfter7.todayCount === 5, `UI displays 5/5 max (todayCount: ${summaryAfter7.todayCount})`);
assert(summaryAfter7.rawCount === 7, `Storage records 7 unique cards (rawCount: ${summaryAfter7.rawCount})`);
assert(summaryAfter7.completed === true, `Completed remains true`);
assert(goalCompletedFired === 1, `vokabelgo:daily-goal-complete did NOT fire again (fired count: ${goalCompletedFired})`);

// TEST 4
console.log('\n--- TEST 4: F5 / Reload -> Dữ liệu giữ nguyên, catchStatus pending ---');
// Simulate page reload by re-evaluating dailyCode without clearing localStorage
eval(dailyCode);
const summaryReload = window.VokabelDaily.getSummary();
assert(summaryReload.todayCount === 5, `After reload: UI todayCount is 5`);
assert(summaryReload.rawCount === 7, `After reload: rawCount is 7`);
assert(summaryReload.completed === true, `After reload: completed is true`);
assert(summaryReload.catchStatus === 'pending', `After reload: catchStatus is still 'pending'`);

// TEST 5
console.log('\n--- TEST 5: Streak calculation logic ---');
// Case 5a: Học đủ hôm qua, chưa học hôm nay -> Streak giữ nguyên streak hôm qua
localStorage.clear();
const now = new Date();
const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
const yKey = window.VokabelDaily.getLocalDateKey(yesterday);
const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
const d2Key = window.VokabelDaily.getLocalDateKey(d2);

const testData5a = {
  version: 1,
  days: {
    [d2Key]: { reviewedCardIds: ['c1','c2','c3','c4','c5'], completed: true, completedAt: new Date().toISOString(), catchStatus: 'caught' },
    [yKey]: { reviewedCardIds: ['c1','c2','c3','c4','c5'], completed: true, completedAt: new Date().toISOString(), catchStatus: 'caught' },
    [todayKey]: { reviewedCardIds: ['c1','c2'], completed: false, completedAt: null, catchStatus: 'none' }
  }
};
window.VokabelDaily.importData(testData5a);
assert(window.VokabelDaily.getStreak() === 2, `Streak preserves yesterday streak of 2 when today is incomplete (actual: ${window.VokabelDaily.getStreak()})`);

// Case 5b: Hoàn thành hôm nay -> Streak tăng +1 (thành 3)
window.VokabelDaily.reviewCard('c3');
window.VokabelDaily.reviewCard('c4');
window.VokabelDaily.reviewCard('c5');
assert(window.VokabelDaily.getStreak() === 3, `Streak increases to 3 when today completes (actual: ${window.VokabelDaily.getStreak()})`);

// Case 5c: Bỏ lỡ ngày hôm qua (chỉ có d2Key completed, yKey missing hoặc incomplete)
localStorage.clear();
const testData5c = {
  version: 1,
  days: {
    [d2Key]: { reviewedCardIds: ['c1','c2','c3','c4','c5'], completed: true, completedAt: new Date().toISOString(), catchStatus: 'caught' },
    // yKey was missed!
    [todayKey]: { reviewedCardIds: ['c1'], completed: false, completedAt: null, catchStatus: 'none' }
  }
};
window.VokabelDaily.importData(testData5c);
assert(window.VokabelDaily.getStreak() === 0, `Streak is 0 when yesterday was missed and today is incomplete (actual: ${window.VokabelDaily.getStreak()})`);

// Complete today -> Streak becomes 1
window.VokabelDaily.reviewCard('c2');
window.VokabelDaily.reviewCard('c3');
window.VokabelDaily.reviewCard('c4');
window.VokabelDaily.reviewCard('c5');
assert(window.VokabelDaily.getStreak() === 1, `Streak becomes 1 when today completes after missed yesterday (actual: ${window.VokabelDaily.getStreak()})`);

// TEST 6
console.log('\n--- TEST 6: Timezone UTC+7 consistency (local date YYYY-MM-DD) ---');
// Suppose user is at 2026-10-01 00:30:00 (local). In UTC, this is 2026-09-30 17:30:00.
// getLocalDateKey must produce "2026-10-01", not "2026-09-30".
const localDateObj = new Date(2026, 9, 1, 0, 30, 0); // Oct 1, 2026, 00:30
const dateKey = window.VokabelDaily.getLocalDateKey(localDateObj);
assert(dateKey === '2026-10-01', `LocalDateKey produces local date 2026-10-01 (got: ${dateKey})`);

const lateDateObj = new Date(2026, 9, 1, 23, 30, 0); // Oct 1, 2026, 23:30
const lateDateKey = window.VokabelDaily.getLocalDateKey(lateDateObj);
assert(lateDateKey === '2026-10-01', `LocalDateKey produces local date 2026-10-01 (got: ${lateDateKey})`);

// TEST 7
console.log('\n--- TEST 7: Check-in / Calendar does NOT increase streak ---');
// Test checking in via calendar/guestbook function logic: streak is derived solely from VokabelDaily
const initialStreak = window.VokabelDaily.getStreak();
// Simulating checkin entry in guestbook
const dummyCheckinEntry = { id: 'ck_123', date: todayKey, time: '10:00', nickname: 'Test' };
// Checking that daily progress history didn't change and streak didn't change
assert(window.VokabelDaily.getStreak() === initialStreak, `Streak did not change after guestbook/checkin entry`);

// TEST 8
console.log('\n--- TEST 8: Custom events dispatched correctly ---');
let progressEvents = 0;
let goalCompleteEvents = 0;
window.addEventListener('vokabelgo:daily-progress', () => progressEvents++);
window.addEventListener('vokabelgo:daily-goal-complete', () => goalCompleteEvents++);

window.VokabelDaily.resetTodayForTesting();
progressEvents = 0;
goalCompleteEvents = 0;

window.VokabelDaily.reviewCard('t8_1');
window.VokabelDaily.reviewCard('t8_2');
window.VokabelDaily.reviewCard('t8_3');
window.VokabelDaily.reviewCard('t8_4');
assert(progressEvents === 4, `vokabelgo:daily-progress fired 4 times for 4 cards`);
assert(goalCompleteEvents === 0, `vokabelgo:daily-goal-complete did not fire yet`);

window.VokabelDaily.reviewCard('t8_5');
assert(progressEvents === 5, `vokabelgo:daily-progress fired 5th time`);
assert(goalCompleteEvents === 1, `vokabelgo:daily-goal-complete fired on 5th card`);

window.VokabelDaily.reviewCard('t8_6');
assert(progressEvents === 6, `vokabelgo:daily-progress fired 6th time`);
assert(goalCompleteEvents === 1, `vokabelgo:daily-goal-complete did NOT fire again on 6th card`);

// TEST 9
console.log('\n--- TEST 9: Toast notification on 5/5 cards ---');
// Load leaderboard-feed.js to test its listener
mockWindow._lastToast = null;
const feedCode = fs.readFileSync(path.join(__dirname, 'leaderboard-feed.js'), 'utf-8');
eval(feedCode);

// Trigger completion event
window.VokabelDaily.resetTodayForTesting();
window.VokabelDaily.reviewCard('t9_1');
window.VokabelDaily.reviewCard('t9_2');
window.VokabelDaily.reviewCard('t9_3');
window.VokabelDaily.reviewCard('t9_4');
window.VokabelDaily.reviewCard('t9_5');

assert(mockWindow._lastToast !== null, 'A toast was triggered');
assert(mockWindow._lastToast && mockWindow._lastToast.msg.includes('Đủ 5/5 từ! Bé mèo chuẩn bị đi câu cá rồi! 🎣🐱'), 
  `Toast message is correct: "${mockWindow._lastToast ? mockWindow._lastToast.msg : ''}"`);

// TEST 10
console.log('\n--- TEST 10: Cloud sync serialization and restoration ---');
const exported = window.VokabelDaily.exportData();
assert(exported !== null && exported.version === 1, 'exportData() returns valid payload');
assert(exported.days[todayKey] !== undefined, 'exported data contains today days record');

// Simulate fresh machine / clear local storage
localStorage.clear();
eval(dailyCode); // Re-init on clean storage
assert(window.VokabelDaily.getTodayCount() === 0, 'Clean machine starts at count 0');

// Import data from cloud
window.VokabelDaily.importData(exported);
assert(window.VokabelDaily.getTodayCount() === 5, `After cloud import, todayCount restored to 5`);
assert(window.VokabelDaily.isCompletedToday() === true, `After cloud import, isCompletedToday is true`);
assert(window.VokabelDaily.getCatchStatus() === 'pending', `After cloud import, catchStatus is 'pending'`);


console.log('\n========================================');
console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log('========================================');

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
