// ==========================================================================
// VokabelGo - Firebase Cloud Configuration
// ==========================================================================

window.DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyB4bqPOHIzq_xlMW_XKTiOPD3UDQd5ho94",
  authDomain: "vokabelgo.firebaseapp.com",
  databaseURL: "https://vokabelgo-default-rtdb.firebaseio.com",
  projectId: "vokabelgo",
  storageBucket: "vokabelgo.firebasestorage.app",
  messagingSenderId: "87014134764",
  appId: "1:87014134764:web:85e61010f0afed904126c9",
  measurementId: "G-N9MXC41JNE"
};

// Hàm lấy cấu hình hợp lệ (ưu tiên từ localStorage do người dùng cài đặt, nếu không thì dùng mặc định)
window.getFirebaseConfig = function() {
  try {
    const saved = localStorage.getItem('vokabelgo_custom_firebase_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {}

  return window.DEFAULT_FIREBASE_CONFIG;
};

// Kiểm tra xem cấu hình có sẵn sàng hay chưa
window.isFirebaseConfigured = function() {
  const cfg = window.getFirebaseConfig();
  return Boolean(cfg && cfg.apiKey && cfg.apiKey.trim().length > 10 && cfg.projectId && cfg.projectId.trim().length > 2);
};
