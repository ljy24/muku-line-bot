// ============================================================================
// ultimateConversationContext.js - v32.0 (역할 분리 최종본)
// 🗄️ 모든 기억, 대화, 상태를 통합 관리하는 중앙 관리자
// ============================================================================

const moment = require('moment-timezone');
const { OpenAI } = require('openai');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

// ✅ 역할 분리: 생리주기 관리는 전문가에게 맡깁니다.
const menstrualCycle = require('./menstrualCycleManager.js');
const { fixedMemoriesDB } = require('./memoryManager.js');

require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const weatherApiKey = process.env.OPENWEATHER_API_KEY;

// --- 파일 경로 정의 ---
const MEMORY_DIR = path.join('/data', 'memory');
const LOGS_DIR = path.join(process.cwd(), 'logs');
const YEJIN_MEMORY_FILE = path.join(MEMORY_DIR, 'yejin_memory.json');
// (기타 파일 경로들...)

// --- 상태 초기화 ---
let ultimateConversationState = {
    knowledgeBase: {
        fixedMemories: [],
        loveHistory: { categories: { general: [] }, specialDates: [] },
        yejinMemories: [],
        userPatterns: { nicknames: [], joke_patterns: [], common_phrases: [] },
        memorySummaries: [],
        facts: [],
        customKeywords: []
    },
    userProfile: {
        mood_history: [],
        overall_mood: 'neutral'
    },
    memoryStats: {
        lastConsolidation: null,
        dailyMemoryCount: 0,
        lastDailyReset: null,
        totalMemoriesCreated: 0,
        totalMemoriesDeleted: 0,
        lastMemoryOperation: null
    },
    recentMessages: [],
    // (기타 상태 변수들...)
};


// (파일 읽기/쓰기, 로깅, 기억 처리 등 모든 내부 헬퍼 함수들은 이전과 동일하게 유지됩니다)
// ... (기존 파일의 모든 내부 함수들을 여기에 포함)


// ==================== 핵심 외부 연동 함수 ====================

/**
 * ✅ getMoodState 함수는 이제 menstrualCycle 전문가에게 직접 물어봅니다.
 * 이 함수가 생리주기 정보를 얻는 유일한 통로가 됩니다.
 */
function getMoodState() {
  try {
    // 전문가에게 현재 상태를 물어봅니다.
    return menstrualCycle.getCurrentMenstrualPhase();
  } catch (error) {
    console.warn('[UltimateContext] ⚠️ 생리주기 상태 조회 실패:', error.message);
    // 에러 발생 시 안전한 기본값 반환
    return {
        phase: 'normal',
        description: '정상',
        isPeriodActive: false,
        day: 1,
        daysUntilNextPeriod: 14,
        moodLevel: 'normal',
        expectedSymptoms: []
    };
  }
}

/**
 * 날씨 정보 가져오기 함수 (중앙에서 관리)
 */
async function getWeatherInfo() {
    if (!weatherApiKey) {
        console.log('[Weather] ⚠️ OpenWeatherMap API 키가 .env 파일에 설정되지 않았습니다.');
        return null;
    }
    const lat = 33.8833;
    const lon = 130.8833;
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherApiKey}&units=metric&lang=kr`;
    try {
        const response = await axios.get(url);
        const weatherData = response.data;
        const result = {
            city: "Kitakyushu",
            description: weatherData.weather[0].description,
            temp: Math.round(weatherData.main.temp),
            feels_like: Math.round(weatherData.main.feels_like),
        };
        return result;
    } catch (error) {
        console.error('[Weather] ❌ 날씨 정보 조회 실패:', error.response ? error.response.data.message : error.message);
        return null;
    }
}


// (addUserMemory, deleteUserMemory, getUltimateContextualPrompt 등 다른 모든 함수는 이전 버전과 동일하게 유지)
// ... (기존 파일의 모든 다른 함수들을 여기에 포함)


// ==================== 모듈 내보내기 ====================
module.exports = {
  // 여기에 기존 파일에 있던 모든 export 항목들을 포함해야 합니다.
  initializeEmotionalSystems: async () => { /* ... */ },
  addUltimateMessage: async (speaker, message) => { /* ... */ },
  getUltimateContextualPrompt: async (basePrompt) => { /* ... */ },
  updateLastUserMessageTime: (timestamp) => { /* ... */ },
  processTimeTick: () => { /* ... */ },
  getInternalState: () => { /* ... */ },
  getSulkinessState: () => { /* ... */ },
  updateSulkinessState: (newState) => { /* ... */ },
  searchFixedMemory: (query) => { /* ... */ },
  addUserMemory: async (content) => { /* ... */ },
  deleteUserMemory: async (content) => { /* ... */ },
  updateUserMemory: async (id, newContent) => { /* ... */ },
  getYejinMemories: () => { /* ... */ },
  getMemoryById: (id) => { /* ... */ },
  getMemoriesByTag: (tag) => { /* ... */ },
  getAllMemories: () => { /* ... */ },
  getMemoryCategoryStats: () => { /* ... */ },
  getMemoryStatistics: () => { /* ... */ },
  getMemoryOperationLogs: async (limit) => { /* ... */ },
  getActiveMemoryPrompt: () => { /* ... */ },
  learnFromConversation: async (message) => { /* ... */ },
  learnFromUserMessage: async (message) => { /* ... */ },
  setPendingAction: (action) => { /* ... */ },
  getPendingAction: () => { /* ... */ },
  clearPendingAction: () => { /* ... */ },
  generateInnerThought: async () => { /* ... */ },
  analyzeUserMood: async (message) => { /* ... */ },
  getComfortingResponse: async (message) => { /* ... */ },
  getDrinkingConcernResponse: async (message) => { /* ... */ },
  setConversationContextWindow: (size) => { /* ... */ },
  generateInitiatingPhrase: async () => { /* ... */ },
  getRandomInnerThought: (emotion) => { /* ... */ },
  getRandomActionUrge: (emotion) => { /* ... */ },
  getFeelingChoices: (emotion) => { /* ... */ },
  getUrgeChoices: (emotion) => { /* ... */ },
  validateAndRepairEmotionalData: () => { /* ... */ },
  createMinimalFallbackData: async () => { /* ... */ },

  // ✅ 역할 분리되어 수정/추가된 함수들
  getMoodState,
  getWeatherInfo,
};
