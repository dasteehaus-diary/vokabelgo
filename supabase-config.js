// ==============================================================================
// VokabelGo - Supabase Configuration
// ==============================================================================

window.DEFAULT_SUPABASE_CONFIG = {
  url: "",       // Project URL (ví dụ: https://xyzcompany.supabase.co)
  anonKey: ""    // anon public key (chuỗi dài bắt đầu bằng eyJhbGciOi...)
};

// Hàm lấy cấu hình Supabase (ưu tiên từ cài đặt người dùng lưu trong localStorage)
window.getSupabaseConfig = function() {
  try {
    const saved = localStorage.getItem('vokabelgo_custom_supabase_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.url && parsed.anonKey) {
        return parsed;
      }
    }
  } catch (e) {}

  return window.DEFAULT_SUPABASE_CONFIG;
};

// Kiểm tra xem Supabase đã được cấu hình hay chưa
window.isSupabaseConfigured = function() {
  const cfg = window.getSupabaseConfig();
  return Boolean(
    cfg &&
    cfg.url &&
    cfg.url.startsWith('https://') &&
    cfg.anonKey &&
    cfg.anonKey.trim().length > 20
  );
};
