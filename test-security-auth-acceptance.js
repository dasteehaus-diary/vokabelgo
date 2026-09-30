// ==============================================================================
// VokabelGo - Security & Auth Test Suite (SEC-01, SEC-02, SEC-03, AUTH-01)
// ==============================================================================

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passedTests = 0;
let failedTests = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
  }
}

console.log('=== RUNNING SECURITY & AUTH ACCEPTANCE TESTS ===\n');

// ------------------------------------------------------------------------------
// GROUP 1: SEC-02 - HTML Escaping & XSS Protection
// ------------------------------------------------------------------------------
console.log('--- TEST GROUP 1: SEC-02 - HTML Escaping & XSS Protection ---');

// Trích xuất hàm esc từ index.html
const indexHtmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const escMatch = indexHtmlContent.match(/function\s+esc\s*\([\s\S]*?^}/m);
if (!escMatch) {
  throw new Error('Could not find esc function in index.html');
}
const escFn = new Function(`${escMatch[0]}; return esc;`)();

it('esc(s) mã hóa ký tự <, >, &, ", \' thành các HTML entities an toàn', () => {
  const payload = '<script>alert("XSS & attack\'s")</script>';
  const escaped = escFn(payload);
  assert.strictEqual(escaped, '&lt;script&gt;alert(&quot;XSS &amp; attack&#39;s&quot;)&lt;/script&gt;');
  assert.ok(!escaped.includes('<script>'));
  assert.ok(!escaped.includes('"'));
  assert.ok(!escaped.includes("'"));
});

it('esc(s) xử lý an toàn các giá trị null, undefined, số và chuỗi rỗng', () => {
  assert.strictEqual(escFn(null), '');
  assert.strictEqual(escFn(undefined), '');
  assert.strictEqual(escFn(''), '');
  assert.strictEqual(escFn(123), '123');
  assert.strictEqual(escFn(0), '0');
  assert.strictEqual(escFn(false), 'false');
});

it('renderManageList trong index.html đã mã hóa esc(t) cho các nhãn thẻ (tags)', () => {
  assert.ok(indexHtmlContent.includes('const tags=(c.tags||[]).map(t=>`<span class="badge">${esc(t)}</span>`).join(\'\');'));
});

it('deleteTrackById trong playlist modal không còn nối esc(t.title) vào chuỗi onclick', () => {
  assert.ok(indexHtmlContent.includes("deleteTrackById('${chan}', '${t.id}')"));
  assert.ok(!indexHtmlContent.includes("deleteTrackById('${chan}', '${t.id}', '${esc(t.title)}')"));
});

// Trích xuất hàm escapeHtml từ leaderboard-feed.js
const lbFeedContent = fs.readFileSync(path.join(__dirname, 'leaderboard-feed.js'), 'utf8');
const lbEscMatch = lbFeedContent.match(/function\s+escapeHtml\s*\([\s\S]*?\n\s*\}/);
if (!lbEscMatch) {
  throw new Error('Could not find escapeHtml function in leaderboard-feed.js');
}
const escapeHtmlFn = new Function(`${lbEscMatch[0]}; return escapeHtml;`)();

it('leaderboard-feed.js: escapeHtml mã hóa tên học viên độc hại', () => {
  const maliciousName = '<img src=x onerror=alert(1)> Hacker "Pro"';
  const safeName = escapeHtmlFn(maliciousName);
  assert.strictEqual(safeName, '&lt;img src=x onerror=alert(1)&gt; Hacker &quot;Pro&quot;');
});

it('leaderboard-feed.js: renderLeaderboard bọc escapeHtml cho tất cả tên người học (top1, top2, top3, list)', () => {
  assert.ok(lbFeedContent.includes('${escapeHtml(top1.name)}'));
  assert.ok(lbFeedContent.includes('${escapeHtml(top2.name)}'));
  assert.ok(lbFeedContent.includes('${escapeHtml(top3.name)}'));
  assert.ok(lbFeedContent.includes('${escapeHtml(u.name)}'));
  assert.ok(lbFeedContent.includes('alt="${escapeHtml(top1.name)}"'));
  assert.ok(lbFeedContent.includes('alt="${escapeHtml(u.name)}"'));
});

// ------------------------------------------------------------------------------
// GROUP 2: AUTH-01 & SEC-03 - Firebase / Supabase Decoupling & Config Parsing
// ------------------------------------------------------------------------------
console.log('\n--- TEST GROUP 2: AUTH-01 & SEC-03 - Firebase / Supabase Integration ---');

it('index.html thiết lập tường minh window.VokabelCloudProvider = "supabase"', () => {
  assert.ok(indexHtmlContent.includes("window.VokabelCloudProvider = 'supabase'"));
});

it('index.html không còn tải đồng thời 4 gói SDK Firebase compat gây lãng phí & xung đột', () => {
  assert.ok(!indexHtmlContent.includes('<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>'));
  assert.ok(!indexHtmlContent.includes('<script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js"></script>'));
});

const firebaseAuthContent = fs.readFileSync(path.join(__dirname, 'firebase-auth.js'), 'utf8');

it('SEC-03: firebase-auth.js không còn chứa new Function hoặc eval', () => {
  assert.ok(!firebaseAuthContent.includes('new Function'));
  assert.ok(!firebaseAuthContent.includes('eval('));
});

it('AUTH-01: firebase-auth.js gom toàn bộ phương thức vào namespace window.VokabelFirebase', () => {
  assert.ok(firebaseAuthContent.includes('window.VokabelFirebase = firebaseAuthApi;'));
});

it('AUTH-01: firebase-auth.js chỉ gắn đè window khi window.VokabelCloudProvider === "firebase"', () => {
  assert.ok(firebaseAuthContent.includes("if (window.VokabelCloudProvider === 'firebase')"));
});

const supabaseAuthContent = fs.readFileSync(path.join(__dirname, 'supabase-auth.js'), 'utf8');

it('AUTH-01: supabase-auth.js updateAuthUI liên kết đúng các phần tử header openAuthBtn, authStatusText, authSyncIcon', () => {
  assert.ok(supabaseAuthContent.includes("document.getElementById('cloudAuthStatusBtn') || document.getElementById('openAuthBtn')"));
  assert.ok(supabaseAuthContent.includes("document.getElementById('cloudAuthStatusText') || document.getElementById('authStatusText')"));
  assert.ok(supabaseAuthContent.includes("document.getElementById('cloudSyncIcon') || document.getElementById('authSyncIcon')"));
});

it('AUTH-01: supabase-auth.js expose window.getSupabaseCurrentUser và window.VokabelSupabase', () => {
  assert.ok(supabaseAuthContent.includes('window.getSupabaseCurrentUser = function()'));
  assert.ok(supabaseAuthContent.includes('window.VokabelSupabase = {'));
});

it('AUTH-01: leaderboard-feed.js nhận diện đúng người dùng Supabase qua getSupabaseCurrentUser', () => {
  assert.ok(lbFeedContent.includes('window.getSupabaseCurrentUser()'));
});

// ------------------------------------------------------------------------------
// GROUP 3: SEC-01 - Supabase RLS & Schema Separation
// ------------------------------------------------------------------------------
console.log('\n--- TEST GROUP 3: SEC-01 - Supabase RLS & Schema Separation ---');

const schemaContent = fs.readFileSync(path.join(__dirname, 'supabase_schema.sql'), 'utf8');
const patchContent = fs.readFileSync(path.join(__dirname, 'supabase_security_patch.sql'), 'utf8');

it('supabase_schema.sql: Đã loại bỏ chính sách SELECT using (true) trên vokabelgo_users', () => {
  // Không được chứa using (true)
  assert.ok(!schemaContent.includes('using (true)'));
  assert.ok(!schemaContent.includes('USING (true)'));
});

it('supabase_schema.sql: Chính sách SELECT trên vokabelgo_users bảo vệ dữ liệu riêng tư bằng auth.uid() = id', () => {
  assert.ok(schemaContent.includes('using (auth.uid() = id)'));
});

it('supabase_schema.sql: Tạo view public.vokabelgo_leaderboard cách ly các cột công khai', () => {
  assert.ok(schemaContent.includes('create or replace view public.vokabelgo_leaderboard'));
  assert.ok(schemaContent.includes('grant select on public.vokabelgo_leaderboard to anon, authenticated;'));
  
  // View không chứa email và app_data
  const viewRegex = /create or replace view public\.vokabelgo_leaderboard[\s\S]*?from public\.vokabelgo_users;/i;
  const viewMatch = schemaContent.match(viewRegex);
  assert.ok(viewMatch, 'Found view definition');
  const viewDef = viewMatch[0];
  assert.ok(!viewDef.includes('email'), 'View must NOT contain email');
  assert.ok(!viewDef.includes('app_data'), 'View must NOT contain app_data');
  assert.ok(viewDef.includes('display_name'), 'View contains display_name');
  assert.ok(viewDef.includes('streak'), 'View contains streak');
  assert.ok(viewDef.includes('words_learned'), 'View contains words_learned');
});

it('supabase_security_patch.sql: Bản vá bảo mật độc lập đã chuẩn bị đầy đủ lệnh, kiểm tra & phương án rollback', () => {
  assert.ok(patchContent.includes('DROP POLICY IF EXISTS "Cho phep doc bang xep hang"'));
  assert.ok(patchContent.includes('CREATE POLICY "Nguoi dung chi xem du lieu cua minh"'));
  assert.ok(patchContent.includes('CREATE OR REPLACE VIEW public.vokabelgo_leaderboard'));
  assert.ok(patchContent.includes('GRANT SELECT ON public.vokabelgo_leaderboard TO anon, authenticated;'));
  assert.ok(patchContent.includes('ROLLBACK PLAN'));
});

it('supabase-auth.js: loadLeaderboardFromSupabase ưu tiên đọc từ view vokabelgo_leaderboard và có fallback', () => {
  assert.ok(supabaseAuthContent.includes(".from('vokabelgo_leaderboard')"));
  assert.ok(supabaseAuthContent.includes(".from('vokabelgo_users')"));
});

// ------------------------------------------------------------------------------
// SUMMARY
// ------------------------------------------------------------------------------
console.log('\n========================================');
console.log(`SECURITY & AUTH TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('========================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
