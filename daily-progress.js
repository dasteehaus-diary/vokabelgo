// ==============================================================================
// VokabelGo - Daily Goal & Streak Engine (Phase 1)
// LocalStorage Key: vokabelgo_daily_progress_v1
// ==============================================================================

(function() {
  const STORAGE_KEY = 'vokabelgo_daily_progress_v1';

  // Helper tính ngày theo giờ LOCAL của trình duyệt (YYYY-MM-DD)
  // Tuyệt đối không dùng new Date().toISOString().slice(0,10) vì sẽ bị lệch UTC
  function getLocalDateKey(date) {
    let d;
    if (!date) {
      d = new Date();
    } else if (date instanceof Date) {
      d = date;
    } else if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    } else {
      d = new Date(date);
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Lấy ngày hôm trước theo giờ local
  function getPreviousDayKey(dateKey) {
    const parts = dateKey.split('-').map(Number);
    // Lưu ý: parts[1] - 1 vì tháng trong JS bắt đầu từ 0
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() - 1);
    return getLocalDateKey(d);
  }

  // Tải dữ liệu từ LocalStorage
  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (!parsed.days || typeof parsed.days !== 'object') {
            parsed.days = {};
          }
          parsed.version = 1;
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[VokabelDaily] Lỗi đọc dữ liệu LocalStorage:', e);
    }
    return { version: 1, days: {} };
  }

  // Lưu dữ liệu vào LocalStorage và báo hook cho các cloud engine
  function saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[VokabelDaily] Lỗi ghi LocalStorage:', e);
    }
    if (typeof window.onLocalDataChanged === 'function') {
      try {
        window.onLocalDataChanged('daily-progress');
      } catch (err) {}
    }
  }

  // Đảm bảo dữ liệu của một ngày đã tồn tại cấu trúc chuẩn
  function ensureDayRecord(data, dayKey) {
    if (!data.days[dayKey]) {
      data.days[dayKey] = {
        reviewedCardIds: [],
        completed: false,
        completedAt: null,
        catchStatus: 'none'
      };
    } else {
      const rec = data.days[dayKey];
      if (!Array.isArray(rec.reviewedCardIds)) rec.reviewedCardIds = [];
      if (typeof rec.completed !== 'boolean') rec.completed = false;
      if (typeof rec.completedAt === 'undefined') rec.completedAt = null;
      if (!rec.catchStatus) rec.catchStatus = 'none';
    }
    return data.days[dayKey];
  }

  // Tính streak dựa trên daily goal (completed === true)
  function calculateDailyStreak(data) {
    if (!data || !data.days) return 0;

    const todayKey = getLocalDateKey();
    const todayRec = data.days[todayKey];
    const todayCompleted = Boolean(todayRec && todayRec.completed);

    let streak = 0;
    let checkKey = todayKey;

    if (todayCompleted) {
      // Nếu hôm nay đã hoàn thành, đếm từ hôm nay ngược về quá khứ
      streak = 1;
      checkKey = getPreviousDayKey(todayKey);
    } else {
      // Nếu hôm nay chưa hoàn thành, kiểm tra hôm qua
      const yesterdayKey = getPreviousDayKey(todayKey);
      const yesterdayRec = data.days[yesterdayKey];
      if (!yesterdayRec || !yesterdayRec.completed) {
        return 0; // Hôm nay chưa xong và hôm qua cũng không xong -> streak = 0
      }
      // Hôm qua xong -> giữ streak tới hôm qua
      streak = 1;
      checkKey = getPreviousDayKey(yesterdayKey);
    }

    // Lùi dần từng ngày về quá khứ
    while (true) {
      const rec = data.days[checkKey];
      if (rec && rec.completed) {
        streak++;
        checkKey = getPreviousDayKey(checkKey);
      } else {
        break;
      }
    }

    return streak;
  }

  // Public API
  const VokabelDaily = {
    // Helper lấy ngày local
    getLocalDateKey: getLocalDateKey,

    // Ghi nhận một lượt ôn tập cardId
    reviewCard: function(cardId) {
      if (typeof cardId === 'undefined' || cardId === null || cardId === '') {
        return {
          count: this.getTodayCount(),
          completed: this.isTodayCompleted(),
          updated: false
        };
      }

      const safeId = String(cardId);
      const data = loadData();
      const todayKey = getLocalDateKey();
      const dayRec = ensureDayRecord(data, todayKey);

      // Nếu đã ôn thẻ này hôm nay rồi thì bỏ qua (chấm lại Chưa nhớ -> Khó -> Đã nhớ vẫn chỉ tính 1)
      if (dayRec.reviewedCardIds.includes(safeId)) {
        return {
          count: Math.min(dayRec.reviewedCardIds.length, 5),
          rawCount: dayRec.reviewedCardIds.length,
          completed: dayRec.completed,
          updated: false
        };
      }

      // Thêm cardId mới vào danh sách
      dayRec.reviewedCardIds.push(safeId);

      const wasCompleted = Boolean(dayRec.completed);
      let justCompleted = false;

      // Khi đủ 5 thẻ khác nhau
      if (!wasCompleted && dayRec.reviewedCardIds.length >= 5) {
        dayRec.completed = true;
        dayRec.completedAt = new Date().toISOString();
        if (!dayRec.catchStatus || dayRec.catchStatus === 'none') {
          dayRec.catchStatus = 'pending';
        }
        justCompleted = true;
      }

      saveData(data);

      const count = Math.min(dayRec.reviewedCardIds.length, 5);
      const streak = calculateDailyStreak(data);

      // Phát event tiến độ chung mỗi khi số thẻ thay đổi
      window.dispatchEvent(new CustomEvent('vokabelgo:daily-progress', {
        detail: {
          date: todayKey,
          count: count,
          rawCount: dayRec.reviewedCardIds.length,
          completed: dayRec.completed,
          streak: streak
        }
      }));

      // Khi vừa đủ 5 thẻ lần đầu tiên trong ngày, phát event hoàn thành
      if (justCompleted) {
        window.dispatchEvent(new CustomEvent('vokabelgo:daily-goal-complete', {
          detail: {
            date: todayKey,
            streak: streak,
            count: 5
          }
        }));
      }

      return {
        count: count,
        rawCount: dayRec.reviewedCardIds.length,
        completed: dayRec.completed,
        updated: true,
        justCompleted: justCompleted
      };
    },

    // Lấy trạng thái của ngày hôm nay
    getTodayState: function() {
      const data = loadData();
      const todayKey = getLocalDateKey();
      const dayRec = ensureDayRecord(data, todayKey);
      return {
        date: todayKey,
        reviewedCardIds: [...dayRec.reviewedCardIds],
        completed: Boolean(dayRec.completed),
        completedAt: dayRec.completedAt,
        catchStatus: dayRec.catchStatus,
        count: Math.min(dayRec.reviewedCardIds.length, 5),
        rawCount: dayRec.reviewedCardIds.length
      };
    },

    // Lấy số thẻ đã học hôm nay (tối đa hiển thị 5)
    getTodayCount: function() {
      const data = loadData();
      const todayKey = getLocalDateKey();
      const dayRec = data.days[todayKey];
      if (!dayRec || !Array.isArray(dayRec.reviewedCardIds)) return 0;
      return Math.min(dayRec.reviewedCardIds.length, 5);
    },

    // Kiểm tra xem hôm nay đã hoàn thành mục tiêu 5 từ chưa
    isTodayCompleted: function() {
      const data = loadData();
      const todayKey = getLocalDateKey();
      const dayRec = data.days[todayKey];
      return Boolean(dayRec && dayRec.completed);
    },

    isCompletedToday: function() {
      return this.isTodayCompleted();
    },

    getLocalDateKey: function(date) {
      return getLocalDateKey(date);
    },

    getTodayDateKey: function() {
      return getLocalDateKey();
    },

    getCatchStatus: function(date) {
      const data = loadData();
      const key = date ? getLocalDateKey(date) : getLocalDateKey();
      const dayRec = data.days[key];
      return dayRec && dayRec.catchStatus ? dayRec.catchStatus : 'none';
    },

    setCatchStatus: function(status, date) {
      const data = loadData();
      const key = date ? getLocalDateKey(date) : getLocalDateKey();
      const dayRec = ensureDayRecord(data, key);
      dayRec.catchStatus = status;
      saveData(data);
      return dayRec.catchStatus;
    },

    getTodayReviewedCardIds: function() {
      const state = this.getTodayState();
      return [...state.reviewedCardIds];
    },

    getSummary: function() {
      const state = this.getTodayState();
      return {
        todayCount: state.count,
        rawCount: state.rawCount,
        completed: state.completed,
        completedAt: state.completedAt,
        catchStatus: state.catchStatus,
        streak: this.getStreak()
      };
    },

    resetTodayForTesting: function() {
      const data = loadData();
      const todayKey = getLocalDateKey();
      data.days[todayKey] = {
        reviewedCardIds: [],
        completed: false,
        completedAt: null,
        catchStatus: 'none'
      };
      saveData(data);
    },

    // Lấy chuỗi streak ngày học hiện tại
    getStreak: function() {
      const data = loadData();
      return calculateDailyStreak(data);
    },

    // Xuất dữ liệu để đồng bộ Cloud
    exportData: function() {
      const data = loadData();
      return JSON.parse(JSON.stringify(data));
    },

    // Nạp dữ liệu từ Cloud về máy
    importData: function(incomingData) {
      if (!incomingData || typeof incomingData !== 'object') return false;

      const current = loadData();
      const mergedDays = { ...current.days };
      const sourceDays = incomingData.days || incomingData.history || {};

      if (sourceDays && typeof sourceDays === 'object') {
        Object.keys(sourceDays).forEach(dayKey => {
          const incDay = sourceDays[dayKey];
          if (!incDay || typeof incDay !== 'object') return;

          const localDay = mergedDays[dayKey];
          if (!localDay) {
            mergedDays[dayKey] = {
              reviewedCardIds: Array.isArray(incDay.reviewedCardIds) ? [...incDay.reviewedCardIds] : [],
              completed: Boolean(incDay.completed),
              completedAt: incDay.completedAt || null,
              catchStatus: incDay.catchStatus || (incDay.completed ? 'pending' : 'none')
            };
          } else {
            // Hợp nhất danh sách ID độc nhất
            const idSet = new Set([
              ...(Array.isArray(localDay.reviewedCardIds) ? localDay.reviewedCardIds.map(String) : []),
              ...(Array.isArray(incDay.reviewedCardIds) ? incDay.reviewedCardIds.map(String) : [])
            ]);
            const isCompleted = Boolean(localDay.completed || incDay.completed || idSet.size >= 5);
            mergedDays[dayKey] = {
              reviewedCardIds: Array.from(idSet),
              completed: isCompleted,
              completedAt: localDay.completedAt || incDay.completedAt || (isCompleted ? new Date().toISOString() : null),
              catchStatus: localDay.catchStatus || incDay.catchStatus || (isCompleted ? 'pending' : 'none')
            };
          }
        });
      }

      current.days = mergedDays;
      saveData(current);

      // Cập nhật sự kiện toàn hệ thống
      const todayKey = getLocalDateKey();
      const todayRec = current.days[todayKey] || { reviewedCardIds: [], completed: false };
      window.dispatchEvent(new CustomEvent('vokabelgo:daily-progress', {
        detail: {
          date: todayKey,
          count: Math.min(todayRec.reviewedCardIds.length, 5),
          rawCount: todayRec.reviewedCardIds.length,
          completed: Boolean(todayRec.completed),
          streak: calculateDailyStreak(current)
        }
      }));

      return true;
    }
  };

  // Gắn vào window
  window.VokabelDaily = VokabelDaily;
})();
