/**
 * Session fixture helpers for deterministic Daily Session E2E testing
 */

function getLocalDateKey(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createDeterministicDailySessionFixture(now = Date.now()) {
  const oneDay = 86400000;

  // 3 Due Reviews:
  // - b_1: die Geste, -n (mature review, historyCount 4, lastRating Good) -> eligible for typing
  // - b_3: der Gesichtsausdruck, die Gesichtsausdrücke (mature review, historyCount 3, lastRating Good) -> eligible for typing
  // - b_4: der Tonfall, die Tonfälle (historyCount 1, not eligible for typing verification) -> recall
  // 2 Unseen Cards:
  // - b_0: die Körpersprache -> intro + recall
  // - b_2: der Blickkontakt -> intro + recall
  const srsState = {
    version: 1,
    cards: {
      b_1: {
        cardId: 'b_1',
        dueAt: now - 3 * oneDay,
        lastRating: 3,
        historyCount: 4,
        stability: 8.5,
        difficulty: 3.2
      },
      b_3: {
        cardId: 'b_3',
        dueAt: now - 2 * oneDay,
        lastRating: 3,
        historyCount: 3,
        stability: 6.0,
        difficulty: 3.5
      },
      b_4: {
        cardId: 'b_4',
        dueAt: now - 1 * oneDay,
        lastRating: 3,
        historyCount: 1,
        stability: 2.2,
        difficulty: 4.0
      }
    }
  };

  const learningState = {
    version: 1,
    cards: {
      b_1: {
        cardId: 'b_1',
        firstSeenAt: new Date(now - 14 * oneDay).toISOString(),
        lastReviewedAt: new Date(now - 3 * oneDay).toISOString(),
        successCount: 4,
        failureCount: 0,
        consecutiveSuccess: 4,
        needsReview: false,
        status: 'learning'
      },
      b_3: {
        cardId: 'b_3',
        firstSeenAt: new Date(now - 10 * oneDay).toISOString(),
        lastReviewedAt: new Date(now - 2 * oneDay).toISOString(),
        successCount: 3,
        failureCount: 0,
        consecutiveSuccess: 3,
        needsReview: false,
        status: 'learning'
      },
      b_4: {
        cardId: 'b_4',
        firstSeenAt: new Date(now - 2 * oneDay).toISOString(),
        lastReviewedAt: new Date(now - 1 * oneDay).toISOString(),
        successCount: 1,
        failureCount: 0,
        consecutiveSuccess: 1,
        needsReview: false,
        status: 'learning'
      }
    }
  };

  const legacyProgress = {};

  const dailyProgress = {
    version: 1,
    days: {
      [getLocalDateKey(1)]: {
        reviewedCardIds: ['b_10', 'b_11', 'b_12', 'b_13', 'b_14'],
        completed: true,
        completedAt: new Date(now - 1 * oneDay).toISOString(),
        catchStatus: 'claimed'
      },
      [getLocalDateKey(2)]: {
        reviewedCardIds: ['b_20', 'b_21', 'b_22', 'b_23', 'b_24'],
        completed: true,
        completedAt: new Date(now - 2 * oneDay).toISOString(),
        catchStatus: 'claimed'
      },
      [getLocalDateKey(3)]: {
        reviewedCardIds: ['b_30', 'b_31', 'b_32', 'b_33', 'b_34'],
        completed: true,
        completedAt: new Date(now - 3 * oneDay).toISOString(),
        catchStatus: 'claimed'
      }
    }
  };

  const fishCollection = [
    {
      id: 'fish_seed_1',
      fishId: 'fish_forelle',
      german: 'die Forelle',
      article: 'die',
      vietnamese: 'Cá hồi chấm',
      rarity: 'common',
      rarityLabel: 'Phổ thông',
      caughtAt: new Date(now - 2 * oneDay).toISOString()
    }
  ];

  const userProfile = {
    nickname: 'Chị',
    avatarType: 'v2',
    catId: 12
  };

  return {
    vokabelgo_srs_state_v1: srsState,
    vokabelgo_learning_state_v1: learningState,
    dmf_flash_progress_v2: legacyProgress,
    vokabelgo_daily_progress_v1: dailyProgress,
    vokabelgo_fish_collection_v1: fishCollection,
    vokabelgo_user_profile: userProfile
  };
}

module.exports = {
  createDeterministicDailySessionFixture,
  getLocalDateKey
};
