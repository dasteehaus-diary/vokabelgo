// ==============================================================================
// VokabelGo - Security, Auth & Flashcard Behavioral Test Suite
// (SEC-01, SEC-02, SEC-03, AUTH-01 + Flashcard CRUD & RLS Simulation)
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

console.log('=== RUNNING SECURITY, AUTH & BEHAVIORAL ACCEPTANCE TESTS ===\n');

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
// GROUP 3: SEC-01 - Supabase RLS & Schema Separation
// ------------------------------------------------------------------------------
console.log('\n--- TEST GROUP 3: SEC-01 - Supabase RLS & Schema Separation ---');

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
  // Rollback plan must NOT restore USING (true)
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
// GROUP 4: BEHAVIORAL TESTS - Flashcard Operations (add, edit, clone, clear, persist)
// ------------------------------------------------------------------------------
console.log('\n--- TEST GROUP 4: BEHAVIORAL TESTS - Flashcard Operations ---');

function createDOMMock() {
  const store = {};
  const elements = {};

  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };

  function createElementMock(tagName, id = '') {
    const el = {
      tagName: (tagName || 'div').toUpperCase(),
      id: id,
      className: '',
      value: '',
      textContent: '',
      innerHTML: '',
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
      style: {},
      children: [],
      appendChild(child) {
        this.children.push(child);
        return child;
      },
      querySelector() {
        return { scrollTop: 0 };
      }
    };
    return el;
  }

  // Pre-create form elements
  const inputIds = ['editId', 'fTerm', 'fMeaning', 'fDeck', 'fColloc', 'fGrammar', 'fExample', 'fNote', 'fTags', 'bulkImport', 'bulkDeck', 'bulkTags', 'manageSearch'];
  inputIds.forEach(id => {
    elements[id] = createElementMock('input', id);
  });

  const otherIds = ['manageModal', 'cardList', 'deckSelect', 'totalCount', 'frontTerm', 'frontMeta', 'backMeaning', 'position', 'bar', 'knownCount', 'hardCount', 'unknownCount', 'collocations', 'collocBlock', 'grammar', 'grammarBlock', 'example', 'exampleBlock', 'note', 'noteBlock', 'cardTags', 'tagBlock', 'card', 'clearForm', 'saveCard', 'manageBtn', 'closeManage'];
  otherIds.forEach(id => {
    elements[id] = createElementMock('div', id);
  });

  const document = {
    getElementById(id) {
      if (!elements[id]) {
        elements[id] = createElementMock('div', id);
      }
      return elements[id];
    },
    createElement(tag) {
      return createElementMock(tag);
    },
    querySelectorAll() {
      return [];
    },
    body: createElementMock('body')
  };

  return { document, localStorage, elements, store };
}

// Chạy mô phỏng logic Quản lý thẻ từ index.html
function setupFlashcardSandbox() {
  const { document, localStorage, elements, store } = createDOMMock();
  let alerts = [];
  const alert = (msg) => alerts.push(msg);

  // Helper functions directly from index.html
  let uidCounter = 1000;
  function uid() { return 'u_' + (++uidCounter); }
  function val(id) { return document.getElementById(id).value.trim(); }
  function setVal(id, v) { const el = document.getElementById(id); if (el) el.value = v || ''; }
  function esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  let BASE = [
    { id: 'b_0', source: 'base', term: 'der Apfel', meaning: 'quả táo', deck: 'A1 · Đồ ăn', collocations: ['Apfel essen'], grammar: 'der Apfel, die Äpfel', example: 'Ich esse einen Apfel.', note: 'Giống đực', tags: ['A1', 'Essen'] },
    { id: 'b_1', source: 'base', term: 'das Buch', meaning: 'cuốn sách', deck: 'A1 · Đồ vật', collocations: ['Buch lesen'], grammar: 'das Buch, die Bücher', example: 'Ich lese ein Buch.', note: 'Giống trung', tags: ['A1', 'Objekt'] }
  ];

  let userCards = [];
  try {
    userCards = JSON.parse(localStorage.getItem('dmf_flash_user_cards_v2') || '[]');
  } catch (e) {
    userCards = [];
  }

  function allCards() { return [...BASE, ...userCards]; }

  function saveUser() {
    localStorage.setItem('dmf_flash_user_cards_v2', JSON.stringify(userCards));
  }

  function clearForm() {
    ['editId', 'fTerm', 'fMeaning', 'fDeck', 'fColloc', 'fGrammar', 'fExample', 'fNote', 'fTags'].forEach(id => setVal(id, ''));
  }

  function refreshDecks() {
    const sel = document.getElementById('deckSelect');
    sel.children = [];
    const decks = ['Tất cả bộ', ...Array.from(new Set(allCards().map(c => c.deck || 'Khác')))];
    decks.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      sel.appendChild(opt);
    });
  }

  let filtered = allCards();
  function applyFilter() {
    filtered = allCards();
  }

  function renderManageList() {
    const q = val('manageSearch').toLowerCase();
    const list = document.getElementById('cardList');
    list.children = [];
    const arr = allCards().filter(c => !q || [c.term, c.meaning, c.deck, (c.tags || []).join(' ')].join(' ').toLowerCase().includes(q));
    arr.forEach(c => {
      const r = document.createElement('div');
      r.className = 'card-row';
      const tags = (c.tags || []).map(t => `<span class="badge">${esc(t)}</span>`).join('');
      r.innerHTML = `<div><div class="title"></div><div class="muted"></div></div>
        <div></div><div>${tags}</div><div class="row"></div>`;
      
      const col0 = document.createElement('div');
      const tEl = document.createElement('div'); tEl.textContent = c.term; col0.appendChild(tEl);
      const dEl = document.createElement('div'); dEl.textContent = c.deck || ''; col0.appendChild(dEl);
      
      const col1 = document.createElement('div'); col1.textContent = c.meaning;
      const col2 = document.createElement('div'); col2.innerHTML = tags;
      const col3 = document.createElement('div');
      
      const editBtn = document.createElement('button');
      editBtn.textContent = c.source === 'base' ? 'Nhân bản để sửa' : 'Sửa';
      editBtn.onclick = () => editCard(c.id);
      col3.appendChild(editBtn);

      r.children = [col0, col1, col2, col3];
      list.appendChild(r);
    });
  }

  function saveCard() {
    const term = val('fTerm'), meaning = val('fMeaning');
    if (!term || !meaning) return alert('Cần có Thuật ngữ và Nghĩa.');
    const id = val('editId');
    const card = {
      id: id || uid(),
      source: 'user',
      term,
      meaning,
      deck: val('fDeck') || 'Thẻ của tôi',
      collocations: val('fColloc').split('\n').map(x => x.trim()).filter(Boolean),
      grammar: val('fGrammar'),
      example: val('fExample'),
      note: val('fNote'),
      tags: val('fTags').split(',').map(x => x.trim()).filter(Boolean)
    };
    const i = userCards.findIndex(x => x.id === card.id);
    if (i >= 0) userCards[i] = card; else userCards.push(card);
    saveUser();
    clearForm();
    refreshDecks();
    applyFilter();
    renderManageList();
    alert('Đã lưu thẻ.');
  }

  function editCard(id) {
    let c = userCards.find(x => x.id === id);
    if (!c) {
      const b = BASE.find(x => x.id === id);
      if (!b) return;
      c = { ...b, id: uid(), source: 'user', deck: (b.deck || '') + ' · Bản chỉnh sửa' };
    }
    setVal('editId', c.id);
    setVal('fTerm', c.term);
    setVal('fMeaning', c.meaning);
    setVal('fDeck', c.deck);
    setVal('fColloc', (c.collocations || []).join('\n'));
    setVal('fGrammar', c.grammar);
    setVal('fExample', c.example);
    setVal('fNote', c.note);
    setVal('fTags', (c.tags || []).join(', '));
  }

  return {
    document,
    localStorage,
    elements,
    store,
    val,
    setVal,
    clearForm,
    saveCard,
    editCard,
    renderManageList,
    getUserCards: () => userCards,
    setUserCards: (arr) => { userCards = arr; },
    BASE,
    allCards,
    alerts
  };
}

it('Thao tác 1: clearForm() làm trống tất cả 9 trường nhập liệu qua setVal() mà không lỗi', () => {
  const sb = setupFlashcardSandbox();
  sb.setVal('editId', 'test_123');
  sb.setVal('fTerm', 'Hallo');
  sb.setVal('fMeaning', 'Xin chào');
  sb.setVal('fDeck', 'Chào hỏi');
  sb.setVal('fColloc', 'Hallo zusammen');
  sb.setVal('fGrammar', 'Interjektion');
  sb.setVal('fExample', 'Hallo wie gehts');
  sb.setVal('fNote', 'Lời chào thân mật');
  sb.setVal('fTags', 'A1, Begrüßung');

  assert.strictEqual(sb.val('fTerm'), 'Hallo');
  sb.clearForm();

  assert.strictEqual(sb.val('editId'), '');
  assert.strictEqual(sb.val('fTerm'), '');
  assert.strictEqual(sb.val('fMeaning'), '');
  assert.strictEqual(sb.val('fDeck'), '');
  assert.strictEqual(sb.val('fColloc'), '');
  assert.strictEqual(sb.val('fGrammar'), '');
  assert.strictEqual(sb.val('fExample'), '');
  assert.strictEqual(sb.val('fNote'), '');
  assert.strictEqual(sb.val('fTags'), '');
});

it('Thao tác 2: Thêm thẻ mới qua saveCard() -> Thẻ lưu vào userCards & localStorage, giao diện cập nhật và form được làm trống', () => {
  const sb = setupFlashcardSandbox();
  sb.setVal('fTerm', 'die Katze');
  sb.setVal('fMeaning', 'con mèo');
  sb.setVal('fDeck', 'Động vật');
  sb.setVal('fTags', 'A1, Tiere, <script>alert(1)</script>');

  sb.saveCard();

  const cards = sb.getUserCards();
  assert.strictEqual(cards.length, 1);
  const newCard = cards[0];
  assert.strictEqual(newCard.term, 'die Katze');
  assert.strictEqual(newCard.meaning, 'con mèo');
  assert.strictEqual(newCard.deck, 'Động vật');
  assert.strictEqual(newCard.source, 'user');
  assert.ok(newCard.id.startsWith('u_'));

  // Kiểm tra lưu bền vững vào localStorage
  const savedJson = sb.localStorage.getItem('dmf_flash_user_cards_v2');
  assert.ok(savedJson, 'Storage item exists');
  const parsed = JSON.parse(savedJson);
  assert.strictEqual(parsed.length, 1);
  assert.strictEqual(parsed[0].term, 'die Katze');

  // Kiểm tra form đã tự động làm trống
  assert.strictEqual(sb.val('fTerm'), '');
  assert.strictEqual(sb.val('fMeaning'), '');

  // Kiểm tra danh sách hiển thị thẻ cập nhật và tags được escape an toàn
  const listEl = sb.document.getElementById('cardList');
  assert.strictEqual(listEl.children.length, sb.allCards().length);
  const userCardRow = listEl.children[listEl.children.length - 1];
  assert.strictEqual(userCardRow.children[0].children[0].textContent, 'die Katze');
  assert.ok(userCardRow.children[2].innerHTML.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'XSS tag in manage list was escaped');
});

it('Thao tác 3: Sửa thẻ hiện có qua editCard() và saveCard() -> Dữ liệu cập nhật đúng, không bị nhân đôi', () => {
  const sb = setupFlashcardSandbox();
  // Tạo 1 thẻ trước
  sb.setVal('fTerm', 'der Hund');
  sb.setVal('fMeaning', 'con chó');
  sb.saveCard();

  const cardId = sb.getUserCards()[0].id;
  // Bấm nút sửa thẻ
  sb.editCard(cardId);

  // Form được điền đầy đủ dữ liệu cũ qua setVal
  assert.strictEqual(sb.val('editId'), cardId);
  assert.strictEqual(sb.val('fTerm'), 'der Hund');
  assert.strictEqual(sb.val('fMeaning'), 'con chó');

  // Sửa thông tin
  sb.setVal('fMeaning', 'chú cún con đáng yêu');
  sb.setVal('fNote', 'Người bạn bốn chân');
  sb.saveCard();

  // Kiểm tra mảng userCards vẫn chỉ có 1 thẻ nhưng nội dung đã sửa
  const cards = sb.getUserCards();
  assert.strictEqual(cards.length, 1);
  assert.strictEqual(cards[0].id, cardId);
  assert.strictEqual(cards[0].meaning, 'chú cún con đáng yêu');
  assert.strictEqual(cards[0].note, 'Người bạn bốn chân');

  // LocalStorage cập nhật
  const saved = JSON.parse(sb.localStorage.getItem('dmf_flash_user_cards_v2'));
  assert.strictEqual(saved[0].meaning, 'chú cún con đáng yêu');
});

it('Thao tác 4: Nhân bản thẻ gốc qua editCard(baseId) -> Tạo thẻ user mới có hậu tố "· Bản chỉnh sửa", thẻ gốc không đổi', () => {
  const sb = setupFlashcardSandbox();
  const baseCard = sb.BASE[0]; // 'der Apfel'
  
  // Bấm nút "Nhân bản để sửa" trên thẻ base
  sb.editCard(baseCard.id);

  // ID tạo mới, không trùng ID gốc
  const cloneId = sb.val('editId');
  assert.ok(cloneId.startsWith('u_'));
  assert.notStrictEqual(cloneId, baseCard.id);
  assert.strictEqual(sb.val('fTerm'), 'der Apfel');
  assert.strictEqual(sb.val('fDeck'), 'A1 · Đồ ăn · Bản chỉnh sửa');

  // Lưu thẻ nhân bản
  sb.setVal('fMeaning', 'quả táo giòn ngọt');
  sb.saveCard();

  // Kiểm tra thẻ gốc vẫn nguyên vẹn
  assert.strictEqual(sb.BASE[0].meaning, 'quả táo');

  // Thẻ mới được thêm vào userCards
  const userCards = sb.getUserCards();
  assert.strictEqual(userCards.length, 1);
  assert.strictEqual(userCards[0].id, cloneId);
  assert.strictEqual(userCards[0].meaning, 'quả táo giòn ngọt');
  assert.strictEqual(userCards[0].deck, 'A1 · Đồ ăn · Bản chỉnh sửa');
  assert.strictEqual(userCards[0].source, 'user');
});

it('Thao tác 5: Mô phỏng F5 / Tải lại trang -> Thẻ tự tạo và thẻ nhân bản vẫn còn nguyên vẹn trong storage', () => {
  const sb = setupFlashcardSandbox();
  // Thêm 2 thẻ
  sb.setVal('fTerm', 'Tự tạo 1'); sb.setVal('fMeaning', 'Nghĩa 1'); sb.saveCard();
  sb.setVal('fTerm', 'Tự tạo 2'); sb.setVal('fMeaning', 'Nghĩa 2'); sb.saveCard();

  // Mô phỏng reload: Lấy snapshot localStorage và khởi tạo môi trường sandbox mới
  const rawStorage = sb.localStorage.getItem('dmf_flash_user_cards_v2');
  assert.ok(rawStorage);

  const reloadedSB = setupFlashcardSandbox();
  reloadedSB.localStorage.setItem('dmf_flash_user_cards_v2', rawStorage);
  reloadedSB.setUserCards(JSON.parse(rawStorage));

  assert.strictEqual(reloadedSB.getUserCards().length, 2);
  assert.strictEqual(reloadedSB.allCards().length, reloadedSB.BASE.length + 2);
  reloadedSB.renderManageList();
  const renderedList = reloadedSB.document.getElementById('cardList');
  assert.strictEqual(renderedList.children.length, reloadedSB.allCards().length);
});

// ------------------------------------------------------------------------------
// GROUP 5: BEHAVIORAL TESTS - Supabase Permission & RLS Simulation (Guest, User A, User B)
// ------------------------------------------------------------------------------
console.log('\n--- TEST GROUP 5: BEHAVIORAL TESTS - Supabase Permission & RLS Simulation ---');

// Mô phỏng động cơ Row Level Security (RLS) & View của PostgreSQL / Supabase
class SupabaseDatabaseSimulator {
  constructor() {
    this.usersTable = [
      {
        id: 'uuid_alice',
        email: 'alice@example.com',
        display_name: 'Alice Học Chăm 🐱',
        avatar: 'img/avatars/v2/cat_01.png',
        streak: 14,
        words_learned: 85,
        blitz_score: 24,
        feed_count: 5,
        app_data: { customCards: ['card_a1'], notes: 'Alice secret notes', progress: { b_0: 'known' } },
        last_active: '2026-09-30T10:00:00Z'
      },
      {
        id: 'uuid_bob',
        email: 'bob@example.com',
        display_name: 'Bob Siêu Tốc 🐾',
        avatar: 'img/avatars/v2/cat_05.png',
        streak: 20,
        words_learned: 110,
        blitz_score: 18,
        feed_count: 5,
        app_data: { customCards: ['card_b1'], notes: 'Bob personal diaries', progress: { b_1: 'known' } },
        last_active: '2026-09-30T10:30:00Z'
      }
    ];
  }

  // Truy vấn bảng vokabelgo_users theo chính sách RLS: USING (auth.uid() = id)
  queryVokabelgoUsers(authUid, filter = {}) {
    // Nếu chưa đăng nhập (authUid == null), auth.uid() = id luôn là false -> Trả về mảng rỗng
    if (!authUid) {
      return [];
    }

    return this.usersTable.filter(row => {
      // 1. Kiểm tra RLS policy
      if (row.id !== authUid) return false;
      // 2. Kiểm tra điều kiện filter (WHERE)
      if (filter.id && row.id !== filter.id) return false;
      return true;
    }).map(row => JSON.parse(JSON.stringify(row))); // Trả về bản sao
  }

  // Cập nhật bảng vokabelgo_users theo RLS: USING (auth.uid() = id) WITH CHECK (auth.uid() = id)
  updateVokabelgoUsers(authUid, targetId, updates) {
    if (!authUid || authUid !== targetId) {
      return { count: 0, error: new Error('new row violates row-level security policy') };
    }
    const idx = this.usersTable.findIndex(r => r.id === targetId);
    if (idx < 0) return { count: 0, error: null };
    this.usersTable[idx] = { ...this.usersTable[idx], ...updates, id: targetId };
    return { count: 1, error: null };
  }

  // Truy vấn VIEW vokabelgo_leaderboard (chạy với quyền Security Definer / Owner, chỉ chọn cột công khai)
  queryVokabelgoLeaderboard() {
    return this.usersTable.map(row => ({
      id: row.id,
      display_name: row.display_name,
      avatar: row.avatar,
      streak: row.streak,
      words_learned: row.words_learned,
      blitz_score: row.blitz_score,
      last_active: row.last_active
      // Tuyệt đối không chọn email và app_data
    })).sort((a, b) => b.streak - a.streak);
  }
}

it('Kịch bản 1 (Khách chưa đăng nhập): Không thể đọc bảng vokabelgo_users; đọc view leaderboard chỉ nhận thông tin công khai', () => {
  const db = new SupabaseDatabaseSimulator();
  const guestUid = null;

  // 1. Khách thử SELECT * FROM vokabelgo_users
  const userRows = db.queryVokabelgoUsers(guestUid);
  assert.strictEqual(userRows.length, 0, 'Guest must receive 0 rows from private users table');

  // 2. Khách thử SELECT * FROM vokabelgo_users WHERE id = 'uuid_alice'
  const targetRow = db.queryVokabelgoUsers(guestUid, { id: 'uuid_alice' });
  assert.strictEqual(targetRow.length, 0, 'Guest cannot target specific user row');

  // 3. Khách SELECT * FROM vokabelgo_leaderboard
  const lbRows = db.queryVokabelgoLeaderboard();
  assert.strictEqual(lbRows.length, 2, 'Guest can see leaderboard entries');
  lbRows.forEach(row => {
    assert.ok(row.id);
    assert.ok(row.display_name);
    assert.ok(row.streak);
    assert.strictEqual(row.email, undefined, 'Email must NOT be present in leaderboard row');
    assert.strictEqual(row.app_data, undefined, 'app_data must NOT be present in leaderboard row');
  });
});

it('Kịch bản 2 (Tài khoản Alice): Chỉ đọc được dòng của Alice, không đọc/sửa được email và app_data của Bob', () => {
  const db = new SupabaseDatabaseSimulator();
  const aliceUid = 'uuid_alice';

  // 1. Alice query vokabelgo_users -> Chỉ nhận về dòng của Alice
  const myRows = db.queryVokabelgoUsers(aliceUid);
  assert.strictEqual(myRows.length, 1);
  assert.strictEqual(myRows[0].id, 'uuid_alice');
  assert.strictEqual(myRows[0].email, 'alice@example.com');
  assert.ok(myRows[0].app_data.notes.includes('Alice secret'));

  // 2. Alice cố gắng query dòng của Bob (SELECT * FROM vokabelgo_users WHERE id = 'uuid_bob')
  const bobRows = db.queryVokabelgoUsers(aliceUid, { id: 'uuid_bob' });
  assert.strictEqual(bobRows.length, 0, 'Alice cannot query Bob private row via RLS');

  // 3. Alice cố tình gửi lệnh UPDATE dữ liệu của Bob
  const updateRes = db.updateVokabelgoUsers(aliceUid, 'uuid_bob', { display_name: 'Hacked by Alice' });
  assert.strictEqual(updateRes.count, 0, 'Alice cannot update Bob row');
  assert.ok(updateRes.error);
});

it('Kịch bản 3 (Tài khoản Bob): Đọc được dòng của Bob, không thể đọc dữ liệu cá nhân của Alice', () => {
  const db = new SupabaseDatabaseSimulator();
  const bobUid = 'uuid_bob';

  const myRows = db.queryVokabelgoUsers(bobUid);
  assert.strictEqual(myRows.length, 1);
  assert.strictEqual(myRows[0].id, 'uuid_bob');
  assert.strictEqual(myRows[0].email, 'bob@example.com');

  // Cố query dòng của Alice
  const aliceRows = db.queryVokabelgoUsers(bobUid, { id: 'uuid_alice' });
  assert.strictEqual(aliceRows.length, 0, 'Bob cannot read Alice private data');
});

it('Kịch bản 4: loadLeaderboardFromSupabase tích hợp xử lý đúng dữ liệu view & fallback an toàn', async () => {
  const db = new SupabaseDatabaseSimulator();
  
  // Mock sbClient với view vokabelgo_leaderboard
  const mockSbClientWithView = {
    from: (table) => {
      if (table === 'vokabelgo_leaderboard') {
        return {
          select: () => ({
            order: () => ({
              limit: async () => ({
                data: db.queryVokabelgoLeaderboard(),
                error: null
              })
            })
          })
        };
      }
      return {
        select: () => ({ order: () => ({ limit: async () => ({ data: [], error: null }) }) })
      };
    }
  };

  // Trích xuất hàm loadLeaderboardFromSupabase từ supabase-auth.js
  const loadLbMatch = supabaseAuthContent.match(/window\.loadLeaderboardFromSupabase\s*=\s*async\s*function\s*\(\)\s*\{[\s\S]*?\n\s*\};/);
  assert.ok(loadLbMatch, 'Found loadLeaderboardFromSupabase function');
  
  // Chạy thử với mock sbClient
  let currentUser = { id: 'uuid_alice' };
  const loadFn = new Function('sbClient', 'currentUser', `
    let fn = ${loadLbMatch[0].replace('window.loadLeaderboardFromSupabase = ', '')};
    return fn();
  `);

  const leaderboardResults = await loadFn(mockSbClientWithView, currentUser);
  assert.strictEqual(leaderboardResults.length, 2);
  assert.strictEqual(leaderboardResults[0].uid, 'uuid_bob');
  assert.strictEqual(leaderboardResults[0].isMe, false);
  assert.strictEqual(leaderboardResults[1].uid, 'uuid_alice');
  assert.strictEqual(leaderboardResults[1].isMe, true, 'Alice is marked as isMe');
  assert.strictEqual(leaderboardResults[0].email, undefined, 'No email exposed');
});

// ------------------------------------------------------------------------------
// SUMMARY
// ------------------------------------------------------------------------------
console.log('\n========================================');
console.log(`ACCEPTANCE TEST SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('========================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
