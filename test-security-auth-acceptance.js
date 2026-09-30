// ==============================================================================
// VokabelGo - Security, Auth & Flashcard Behavioral Acceptance Test Suite
// (SEC-01, SEC-02, SEC-03, AUTH-01 + Real Code Flashcard CRUD & Runner Verification)
// ==============================================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { spawnSync } = require('child_process');

// ------------------------------------------------------------------------------
// TEST RUNNER INFRASTRUCTURE (ASYNC/AWAIT SUPPORT)
// ------------------------------------------------------------------------------
const testQueue = [];
const isVerificationMode = process.argv.includes('--verify-runner-failure');

function it(desc, fn) {
  testQueue.push({ desc, fn });
}

async function runTests() {
  console.log('=== RUNNING SECURITY, AUTH & BEHAVIORAL ACCEPTANCE TESTS ===\n');

  if (isVerificationMode) {
    console.log('>>> CHẾ ĐỘ KIỂM TRA BỘ CHẠY BẤT ĐỒNG BỘ (--verify-runner-failure) <<<\n');
  }

  let passedTests = 0;
  let failedTests = 0;

  for (const { desc, fn } of testQueue) {
    try {
      const res = fn();
      if (res && typeof res.then === 'function') {
        await res;
      }
      console.log(`  ✅ PASS: ${desc}`);
      passedTests++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${desc}`);
      console.error(`     Error: ${err && err.message ? err.message : String(err)}`);
      failedTests++;
    }
  }

  console.log('\n========================================');
  console.log(`ACCEPTANCE TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('========================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Nếu đang ở chế độ xác minh thất bại bất đồng bộ:
// Chạy 1 test cố tình thất bại bằng Promise để xác minh runner bắt lỗi và thoát mã 1.
if (isVerificationMode) {
  it('Cố tình thất bại bài kiểm tra bất đồng bộ để kiểm tra test runner', async () => {
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.strictEqual(1, 2, 'Cố tình thất bại bất đồng bộ để xác minh runner bắt lỗi Promise và trả mã thoát khác 0');
  });
  runTests();
  return;
}

// ------------------------------------------------------------------------------
// GROUP 1: SEC-02 - HTML Escaping & XSS Protection
// ------------------------------------------------------------------------------
console.log('--- TEST GROUP 1: SEC-02 - HTML Escaping & XSS Protection ---');

const indexHtmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const escMatch = indexHtmlContent.match(/function\s+esc\s*\([\s\S]*?\n\s*\}/);
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
// GROUP 2: AUTH-01 & SEC-03 - Firebase / Supabase Integration
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
  assert.ok(!/new\s+Function\s*\(/.test(firebaseAuthContent));
  assert.ok(!/\beval\s*\(/.test(firebaseAuthContent));
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
// GROUP 3: SEC-01 - Supabase RLS & Schema Separation (Tập tin SQL)
// ------------------------------------------------------------------------------
console.log('\n--- TEST GROUP 3: SEC-01 - Supabase RLS & Schema Separation (Tập tin SQL) ---');

const schemaContent = fs.readFileSync(path.join(__dirname, 'supabase_schema.sql'), 'utf8');
const patchContent = fs.readFileSync(path.join(__dirname, 'supabase_security_patch.sql'), 'utf8');

it('supabase_schema.sql: Đã loại bỏ chính sách SELECT using (true) trên vokabelgo_users', () => {
  assert.ok(!/create\s+policy[\s\S]*?using\s*\(\s*true\s*\)/i.test(schemaContent));
});

it('supabase_schema.sql: Chính sách SELECT trên vokabelgo_users bảo vệ dữ liệu riêng tư bằng auth.uid() = id', () => {
  assert.ok(schemaContent.includes('using (auth.uid() = id)'));
});

it('supabase_schema.sql: Tạo view public.vokabelgo_leaderboard cách ly các cột công khai', () => {
  assert.ok(schemaContent.includes('create or replace view public.vokabelgo_leaderboard'));
  assert.ok(schemaContent.includes('grant select on public.vokabelgo_leaderboard to anon, authenticated;'));
  
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

it('supabase_security_patch.sql: Phương án hoàn tác (Rollback) KHÔNG khôi phục USING (true) và bỏ từ ngữ tuyệt đối', () => {
  assert.ok(!patchContent.includes('USING (true)'));
  assert.ok(!patchContent.includes('using (true)'));
  assert.ok(!patchContent.includes('bảo vệ tuyệt đối'));
  assert.ok(!patchContent.includes('không gây gián đoạn'));
  assert.ok(patchContent.includes('DROP VIEW IF EXISTS public.vokabelgo_leaderboard;'));
  assert.ok(patchContent.includes('Nguoi dung chi xem du lieu cua minh'));
});

it('supabase-auth.js: loadLeaderboardFromSupabase ưu tiên đọc từ view vokabelgo_leaderboard và có fallback', () => {
  assert.ok(supabaseAuthContent.includes(".from('vokabelgo_leaderboard')"));
  assert.ok(supabaseAuthContent.includes(".from('vokabelgo_users')"));
});

// ------------------------------------------------------------------------------
// GROUP 4: BEHAVIORAL TESTS - Thực thi trực tiếp mã ứng dụng từ index.html
// ------------------------------------------------------------------------------
console.log('\n--- TEST GROUP 4: BEHAVIORAL TESTS - Chạy trực tiếp mã thật từ index.html ---');

// Trích xuất mã kịch bản thật từ index.html (từ `const BASE =` đến hết thẻ `<script>`)
const appScriptMatch = indexHtmlContent.match(/<script>\s*(const BASE =[\s\S]*?)<\/script>/);
if (!appScriptMatch) {
  throw new Error('Không thể trích xuất đoạn script chính (const BASE = ...) từ index.html');
}
const appScriptCode = appScriptMatch[1];

// Bộ giả lập môi trường trình duyệt tối thiểu để mã index.html thực thi nguyên bản
function createAppRuntimeEnvironment(initialStorage = {}) {
  const store = { ...initialStorage };
  const elements = {};

  function parseHTML(html, createEl) {
    if (!html || typeof html !== 'string') return [];
    const root = createEl('div');
    const stack = [root];
    const tagRegex = /<(\/)?([a-zA-Z0-9\-]+)([^>]*)>|([^<]+)/g;
    let match;
    while ((match = tagRegex.exec(html)) !== null) {
      const [full, isClose, tagName, attrStr, text] = match;
      if (text) {
        if (stack.length > 0 && text.trim()) {
          const top = stack[stack.length - 1];
          top.textContent = (top.textContent || '') + text;
        }
        continue;
      }
      if (isClose) {
        if (stack.length > 1 && stack[stack.length - 1].tagName.toLowerCase() === tagName.toLowerCase()) {
          stack.pop();
        }
      } else {
        const el = createEl(tagName);
        if (attrStr) {
          const classMatch = attrStr.match(/class=["']([^"']*)["']/);
          if (classMatch) {
            el.className = classMatch[1];
            classMatch[1].split(/\s+/).forEach(c => c && el.classList.add(c));
          }
          const idMatch = attrStr.match(/id=["']([^"']*)["']/);
          if (idMatch) el.id = idMatch[1];
        }
        stack[stack.length - 1].appendChild(el);
        const isVoid = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i.test(tagName);
        if (!isVoid && !full.endsWith('/>')) {
          stack.push(el);
        }
      }
    }
    return root.children;
  }

  function createElement(tagName = 'div', id = '') {
    let _innerHTML = '';
    const el = {
      tagName: tagName.toUpperCase(),
      id: id,
      className: '',
      value: '',
      textContent: '',
      get innerHTML() {
        return _innerHTML;
      },
      set innerHTML(val) {
        _innerHTML = String(val || '');
        this.children = parseHTML(_innerHTML, createElement);
      },
      style: {},
      children: [],
      classList: {
        _classes: new Set(),
        add(c) { this._classes.add(c); },
        remove(c) { this._classes.delete(c); },
        contains(c) { return this._classes.has(c); },
        toggle(c, force) {
          if (force !== undefined) {
            if (force) this._classes.add(c); else this._classes.delete(c);
          } else {
            if (this._classes.has(c)) this._classes.delete(c); else this._classes.add(c);
          }
        }
      },
      appendChild(child) {
        this.children.push(child);
        return child;
      },
      addEventListener() {},
      removeEventListener() {},
      setAttribute(k, v) { this[k] = v; },
      getAttribute(k) { return this[k] || null; },
      removeAttribute(k) { delete this[k]; },
      querySelector(sel) {
        return createElement('div', sel);
      },
      querySelectorAll() {
        return [];
      },
      focus() {},
      blur() {},
      setSelectionRange() {}
    };
    return el;
  }

  const document = {
    getElementById(id) {
      if (!elements[id]) {
        elements[id] = createElement('div', id);
      }
      return elements[id];
    },
    createElement(tag) {
      return createElement(tag);
    },
    querySelector(sel) {
      return createElement('div', sel);
    },
    querySelectorAll() {
      return [];
    },
    addEventListener() {},
    removeEventListener() {},
    body: createElement('body'),
    documentElement: createElement('html'),
    head: createElement('head')
  };

  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };

  const alerts = [];
  const windowObj = {
    localStorage,
    document,
    location: { href: 'http://localhost/', search: '', hash: '' },
    navigator: { userAgent: 'NodeTest' },
    addEventListener() {},
    removeEventListener() {},
    setTimeout: (fn) => setTimeout(fn, 0),
    clearTimeout: clearTimeout,
    setInterval: () => {},
    clearInterval: () => {},
    alert: (msg) => alerts.push(msg),
    confirm: () => true,
    prompt: () => '',
    Audio: class { play() {} pause() {} addEventListener() {} },
    AudioContext: class { createGain() { return { gain: { value: 1 }, connect() {} }; } destination() {} decodeAudioData() {} },
    webkitAudioContext: class { createGain() { return { gain: { value: 1 }, connect() {} }; } destination() {} decodeAudioData() {} },
    VokabelCloudProvider: 'supabase'
  };
  windowObj.window = windowObj;

  const sandbox = vm.createContext({
    ...windowObj,
    console,
    JSON,
    Math,
    Date,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    parseInt,
    parseFloat,
    isNaN,
    isFinite
  });

  // Chạy trực tiếp mã nguồn trích từ index.html
  vm.runInContext(appScriptCode, sandbox);

  return {
    sandbox,
    store,
    elements,
    alerts,
    localStorage,
    document
  };
}

it('Thao tác 1: clearForm() làm trống tất cả 9 trường nhập liệu qua hàm setVal() khôi phục (chạy trực tiếp mã index.html)', () => {
  const env = createAppRuntimeEnvironment();

  // Điền dữ liệu vào form qua hàm setVal() thật
  vm.runInContext(`
    setVal('editId', 'test_id_999');
    setVal('fTerm', 'die Sonne');
    setVal('fMeaning', 'mặt trời');
    setVal('fDeck', 'Thiên nhiên');
    setVal('fColloc', 'die Sonne scheint');
    setVal('fGrammar', 'die Sonne, -');
    setVal('fExample', 'Die Sonne scheint heute.');
    setVal('fNote', 'Giống cái');
    setVal('fTags', 'A1, Natur');
  `, env.sandbox);

  assert.strictEqual(env.elements['fTerm'].value, 'die Sonne');
  assert.strictEqual(env.elements['fMeaning'].value, 'mặt trời');

  // Gọi trực tiếp hàm clearForm() thật của index.html
  vm.runInContext('clearForm()', env.sandbox);

  // Xác minh cả 9 trường đã được setVal(id, '') làm trống sạch sẽ
  ['editId', 'fTerm', 'fMeaning', 'fDeck', 'fColloc', 'fGrammar', 'fExample', 'fNote', 'fTags'].forEach(id => {
    assert.strictEqual(env.elements[id].value, '', `Trường ${id} phải được làm trống qua setVal`);
  });
});

it('Thao tác 2: Thêm thẻ mới qua saveCard() -> Lưu vào userCards & localStorage, giao diện cập nhật, form làm trống (chạy trực tiếp mã index.html)', () => {
  const env = createAppRuntimeEnvironment();

  // Nhập dữ liệu thẻ mới kèm payload XSS để kiểm tra đồng thời
  vm.runInContext(`
    setVal('fTerm', 'die Katze');
    setVal('fMeaning', 'con mèo');
    setVal('fDeck', 'Động vật');
    setVal('fTags', 'A1, Tiere, <script>alert(1)</script>');
    saveCard();
  `, env.sandbox);

  // 1. Kiểm tra mảng userCards trong mã ứng dụng
  const userCards = vm.runInContext('userCards', env.sandbox);
  assert.strictEqual(userCards.length, 1);
  const newCard = userCards[0];
  assert.strictEqual(newCard.term, 'die Katze');
  assert.strictEqual(newCard.meaning, 'con mèo');
  assert.strictEqual(newCard.deck, 'Động vật');
  assert.strictEqual(newCard.source, 'user');
  assert.ok(newCard.id.startsWith('u_'), 'ID thẻ người dùng tạo phải bắt đầu bằng u_');

  // 2. Kiểm tra localStorage được lưu bền vững qua saveUser()
  const storedJson = env.store['dmf_flash_user_cards_v2'];
  assert.ok(storedJson, 'Phải tồn tại key dmf_flash_user_cards_v2 trong localStorage');
  const storedArr = JSON.parse(storedJson);
  assert.strictEqual(storedArr.length, 1);
  assert.strictEqual(storedArr[0].term, 'die Katze');

  // 3. Form đã được tự động làm trống qua clearForm()
  assert.strictEqual(env.elements['fTerm'].value, '');
  assert.strictEqual(env.elements['fMeaning'].value, '');

  // 4. Danh sách quản lý thẻ (cardList) đã được render và XSS tag được escape an toàn
  const cardListEl = env.elements['cardList'];
  assert.ok(cardListEl.children.length > 0, 'cardList phải có phần tử con được render');
  const renderedHTML = cardListEl.children.map(c => c.innerHTML).join(' ');
  assert.ok(renderedHTML.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'Thẻ HTML phải được esc() mã hóa an toàn');
  assert.ok(!renderedHTML.includes('<script>alert(1)</script>'), 'Không được để lọt thẻ script thô vào DOM');
});

it('Thao tác 3: Sửa thẻ hiện có qua editCard() và saveCard() -> Dữ liệu cập nhật đúng, không bị nhân đôi (chạy trực tiếp mã index.html)', () => {
  const env = createAppRuntimeEnvironment();

  // Tạo thẻ ban đầu
  vm.runInContext(`
    setVal('fTerm', 'der Hund');
    setVal('fMeaning', 'con chó');
    saveCard();
  `, env.sandbox);

  const initialCards = vm.runInContext('userCards', env.sandbox);
  assert.strictEqual(initialCards.length, 1);
  const cardId = initialCards[0].id;

  // Gọi editCard(cardId) thật từ ứng dụng
  vm.runInContext(`editCard('${cardId}')`, env.sandbox);

  // Form được điền đầy đủ dữ liệu qua setVal
  assert.strictEqual(env.elements['editId'].value, cardId);
  assert.strictEqual(env.elements['fTerm'].value, 'der Hund');
  assert.strictEqual(env.elements['fMeaning'].value, 'con chó');

  // Sửa nghĩa và ghi chú rồi bấm lưu
  vm.runInContext(`
    setVal('fMeaning', 'chú cún con đáng yêu');
    setVal('fNote', 'Người bạn bốn chân trung thành');
    saveCard();
  `, env.sandbox);

  // Mảng userCards vẫn chỉ có 1 thẻ duy nhất (không bị trùng lặp) và mang giá trị mới
  const updatedCards = vm.runInContext('userCards', env.sandbox);
  assert.strictEqual(updatedCards.length, 1);
  assert.strictEqual(updatedCards[0].id, cardId);
  assert.strictEqual(updatedCards[0].meaning, 'chú cún con đáng yêu');
  assert.strictEqual(updatedCards[0].note, 'Người bạn bốn chân trung thành');

  // LocalStorage cập nhật đồng bộ
  const savedInStorage = JSON.parse(env.store['dmf_flash_user_cards_v2']);
  assert.strictEqual(savedInStorage.length, 1);
  assert.strictEqual(savedInStorage[0].meaning, 'chú cún con đáng yêu');
});

it('Thao tác 4: Nhân bản thẻ gốc qua editCard(baseId) -> Tạo thẻ user mới có hậu tố "· Bản chỉnh sửa", thẻ gốc không đổi (chạy trực tiếp mã index.html)', () => {
  const env = createAppRuntimeEnvironment();

  const baseCardId = vm.runInContext('BASE[0].id', env.sandbox);
  const baseCardTerm = vm.runInContext('BASE[0].term', env.sandbox);
  const baseCardMeaning = vm.runInContext('BASE[0].meaning', env.sandbox);
  const baseCardDeck = vm.runInContext('BASE[0].deck', env.sandbox);

  // Nhấp "Nhân bản để sửa" trên thẻ gốc
  vm.runInContext(`editCard('${baseCardId}')`, env.sandbox);

  const cloneId = env.elements['editId'].value;
  assert.ok(cloneId.startsWith('u_'), 'ID nhân bản phải mang tiền tố u_');
  assert.notStrictEqual(cloneId, baseCardId, 'ID nhân bản không được trùng ID gốc');
  assert.strictEqual(env.elements['fTerm'].value, baseCardTerm);
  assert.strictEqual(env.elements['fDeck'].value, `${baseCardDeck} · Bản chỉnh sửa`);

  // Lưu thẻ nhân bản với nghĩa tùy chỉnh
  vm.runInContext(`
    setVal('fMeaning', '${baseCardMeaning} (nghĩa tự định nghĩa)');
    saveCard();
  `, env.sandbox);

  // Thẻ gốc BASE[0] vẫn giữ nguyên giá trị ban đầu
  assert.strictEqual(vm.runInContext('BASE[0].meaning', env.sandbox), baseCardMeaning);

  // Thẻ mới được thêm vào danh sách userCards
  const userCards = vm.runInContext('userCards', env.sandbox);
  assert.strictEqual(userCards.length, 1);
  assert.strictEqual(userCards[0].id, cloneId);
  assert.strictEqual(userCards[0].source, 'user');
  assert.strictEqual(userCards[0].meaning, `${baseCardMeaning} (nghĩa tự định nghĩa)`);
  assert.strictEqual(userCards[0].deck, `${baseCardDeck} · Bản chỉnh sửa`);
});

it('Thao tác 5: Tải lại trang (F5) -> Khởi tạo lại môi trường, thẻ tự tạo và thẻ nhân bản còn nguyên vẹn trong storage và hiển thị đúng (chạy trực tiếp mã index.html)', () => {
  const env = createAppRuntimeEnvironment();

  // Thêm 2 thẻ trong phiên làm việc đầu tiên
  vm.runInContext(`
    setVal('fTerm', 'der Apfel'); setVal('fMeaning', 'quả táo'); saveCard();
    setVal('fTerm', 'die Banane'); setVal('fMeaning', 'quả chuối'); saveCard();
  `, env.sandbox);

  assert.strictEqual(vm.runInContext('userCards.length', env.sandbox), 2);
  const persistedStorage = { ...env.store };

  // Mô phỏng F5 / Tải lại trang hoàn toàn:
  // Khởi tạo một phiên thực thi mới tinh từ appScriptCode của index.html với localStorage được nạp lại
  const reloadedEnv = createAppRuntimeEnvironment(persistedStorage);

  // Kiểm tra mã index.html khi khởi động đã tự động phân tích và nạp userCards từ localStorage
  const reloadedUserCards = vm.runInContext('userCards', reloadedEnv.sandbox);
  assert.strictEqual(reloadedUserCards.length, 2, 'userCards phải nạp đủ 2 thẻ sau khi reload');
  assert.strictEqual(reloadedUserCards[0].term, 'der Apfel');
  assert.strictEqual(reloadedUserCards[1].term, 'die Banane');

  // Kiểm tra allCards() bao gồm BASE + VIDEO_FLASHCARDS + userCards
  const totalCards = vm.runInContext('allCards().length', reloadedEnv.sandbox);
  const expectedTotal = vm.runInContext('BASE.length + VIDEO_FLASHCARDS.length + userCards.length', reloadedEnv.sandbox);
  assert.strictEqual(totalCards, expectedTotal);

  // Kiểm tra render danh sách quản lý
  vm.runInContext('renderManageList()', reloadedEnv.sandbox);
  const listEl = reloadedEnv.elements['cardList'];
  assert.ok(listEl.children.length > 0, 'Danh sách quản lý phải hiển thị thẻ sau khi reload');
});

// ------------------------------------------------------------------------------
// GROUP 5: CLIENT INTEGRATION & DB STATUS NOTICE & ASYNC RUNNER VERIFICATION
// ------------------------------------------------------------------------------
console.log('\n--- TEST GROUP 5: CLIENT INTEGRATION, TRẠNG THÁI DB & BỘ CHẠY BẤT ĐỒNG BỘ ---');
console.log('📌 THÔNG BÁO VỀ TRẠNG THÁI CƠ SỞ DỮ LIỆU SUPABASE:');
console.log('   - Chưa kiểm chứng quyền trên cơ sở dữ liệu thật do không có môi trường PostgreSQL/Supabase thật.');
console.log('   - Đã loại bỏ hoàn toàn mã mô phỏng để không ngộ nhận về kết quả RLS.');
console.log('   - Cần kiểm chứng quyền RLS thực tế trên Supabase SQL Editor / Dashboard khi triển khai.\n');

it('Client Integration: loadLeaderboardFromSupabase ưu tiên truy vấn view vokabelgo_leaderboard, phân biệt isMe, không lộ thông tin cá nhân', async () => {
  // Mock Supabase Client phía trình duyệt
  const mockRows = [
    { id: 'uid_1', display_name: 'Học viên A', avatar: 'cat_01.png', streak: 15, words_learned: 90, blitz_score: 20 },
    { id: 'uid_2', display_name: 'Học viên B', avatar: 'cat_02.png', streak: 10, words_learned: 60, blitz_score: 15 }
  ];

  let queriedTable = '';
  const mockSbClient = {
    from: (table) => {
      queriedTable = table;
      return {
        select: () => ({
          order: () => ({
            limit: async () => ({
              data: mockRows,
              error: null
            })
          })
        })
      };
    }
  };

  const loadLbMatch = supabaseAuthContent.match(/window\.loadLeaderboardFromSupabase\s*=\s*async\s*function\s*\(\)\s*\{[\s\S]*?\n\s*\};/);
  assert.ok(loadLbMatch, 'Tìm thấy hàm loadLeaderboardFromSupabase trong supabase-auth.js');

  const currentUser = { id: 'uid_1' };
  const loadFn = new Function('sbClient', 'currentUser', `
    let fn = ${loadLbMatch[0].replace('window.loadLeaderboardFromSupabase = ', '')};
    return fn();
  `);

  const results = await loadFn(mockSbClient, currentUser);
  assert.strictEqual(queriedTable, 'vokabelgo_leaderboard', 'Phải ưu tiên đọc từ view bảo mật vokabelgo_leaderboard');
  assert.strictEqual(results.length, 2);
  assert.strictEqual(results[0].uid, 'uid_1');
  assert.strictEqual(results[0].isMe, true, 'Xác định đúng isMe cho tài khoản hiện tại');
  assert.strictEqual(results[1].uid, 'uid_2');
  assert.strictEqual(results[1].isMe, false);
  assert.strictEqual(results[0].email, undefined, 'Không để lộ email trong bảng xếp hạng');
  assert.strictEqual(results[0].app_data, undefined, 'Không để lộ dữ liệu học tập riêng tư trong bảng xếp hạng');
});

it('Client Integration: loadLeaderboardFromSupabase kích hoạt fallback khi view chưa sẵn sàng', async () => {
  const fallbackRows = [
    { id: 'uid_fb', display_name: 'Fallback Học Viên', avatar: 'cat_03.png', streak: 5, words_learned: 30, blitz_score: 10 }
  ];

  let queryAttempts = [];
  const mockSbClientFallback = {
    from: (table) => {
      queryAttempts.push(table);
      if (table === 'vokabelgo_leaderboard') {
        return {
          select: () => ({
            order: () => ({
              limit: async () => ({
                data: null,
                error: { message: 'relation "public.vokabelgo_leaderboard" does not exist' }
              })
            })
          })
        };
      }
      return {
        select: () => ({
          order: () => ({
            limit: async () => ({
              data: fallbackRows,
              error: null
            })
          })
        })
      };
    }
  };

  const loadLbMatch = supabaseAuthContent.match(/window\.loadLeaderboardFromSupabase\s*=\s*async\s*function\s*\(\)\s*\{[\s\S]*?\n\s*\};/);
  const loadFn = new Function('sbClient', 'currentUser', `
    let fn = ${loadLbMatch[0].replace('window.loadLeaderboardFromSupabase = ', '')};
    return fn();
  `);

  const results = await loadFn(mockSbClientFallback, null);
  assert.deepStrictEqual(queryAttempts, ['vokabelgo_leaderboard', 'vokabelgo_users']);
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].uid, 'uid_fb');
});

it('Async Test Runner: Bộ chạy kiểm thử chờ Promise bất đồng bộ và trả mã thoát 1 khi bài bất đồng bộ thất bại', async () => {
  // Chạy file kiểm thử hiện tại với cờ --verify-runner-failure ở tiến trình con
  const result = spawnSync(process.execPath, [__filename, '--verify-runner-failure'], { encoding: 'utf8' });
  const combinedOutput = (result.stdout || '') + (result.stderr || '');

  assert.strictEqual(result.status, 1, `Bộ chạy phải thoát với mã 1 khi có bài kiểm tra bất đồng bộ thất bại (thực tế: ${result.status})`);
  assert.ok(combinedOutput.includes('❌ FAIL: Cố tình thất bại bài kiểm tra bất đồng bộ'), 'Phải log thất bại rõ ràng');
  assert.ok(combinedOutput.includes('0 PASSED, 1 FAILED'), 'Bảng tổng kết phải ghi nhận 1 thất bại');
});

// ------------------------------------------------------------------------------
// THỰC THI TOÀN BỘ CÁC BÀI KIỂM TRA ĐÃ ĐĂNG KÝ
// ------------------------------------------------------------------------------
runTests();
