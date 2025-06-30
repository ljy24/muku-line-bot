// ✅ index.js - 무쿠 LINE 서버 메인 로직 (개선 버전)

const fs = require('fs');
const path = require('path');
const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
const moment = require('moment-timezone');
const cron = require('node-cron');

const {
  getReplyByMessage,
  getRandomMessage,
  callOpenAI,
  cleanReply,
  saveLog,
  getRecentLog,
  extractAndSaveMemory,
  setForcedModel,
  getCurrentModelName,
  getSelfieReplyFromYeji,
  getFixedMemory,
  startMessageAndPhotoScheduler,
  getFullMemoryPrompt
} = require('./src/autoReply');

// ✅ 설정 및 초기화
const app = express();
const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

// ✅ 환경변수 검증
if (!config.channelAccessToken || !config.channelSecret) {
  console.error('❌ LINE 설정이 누락되었습니다. 환경변수를 확인해주세요.');
  process.exit(1);
}

const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

if (!userId) {
  console.error('❌ TARGET_USER_ID가 설정되지 않았습니다.');
  process.exit(1);
}

// ✅ 상태 관리
const serverState = {
  lastSentMessages: new Map(),
  isInitialized: false,
  messageCount: 0
};

// ✅ 유틸리티 함수들
const utils = {
  // 안전한 메시지 전송
  async safeSendMessage(target, message) {
    try {
      await client.pushMessage(target, { type: 'text', text: message });
      saveLog('예진이', message);
      serverState.messageCount++;
      console.log(`[메시지 전송] ${message}`);
      return true;
    } catch (error) {
      console.error('❌ 메시지 전송 실패:', error.message);
      return false;
    }
  },

  // 안전한 응답 전송
  async safeReplyMessage(replyToken, messages) {
    try {
      const messageArray = Array.isArray(messages) ? messages : [messages];
      await client.replyMessage(replyToken, messageArray);
      
      // 텍스트 메시지만 로그에 저장
      messageArray.forEach(msg => {
        if (msg.type === 'text') {
          saveLog('예진이', msg.text);
        }
      });
      return true;
    } catch (error) {
      console.error('❌ 응답 전송 실패:', error.message);
      return false;
    }
  },

  // GPT 버전 변경
  async changeGPTVersion(version, replyToken) {
    const responses = {
      '3.5': '응! 이제부터 ChatGPT-3.5 버전으로 대화할게.',
      '4.0': '응응! 이제부터 ChatGPT-4.0으로 얘기해줄게, 아저씨.',
      'auto': '응! 이제 상황에 맞게 자동으로 버전 선택해서 말할게.'
    };

    if (version === 'auto') {
      delete process.env.GPT_VERSION;
    } else {
      process.env.GPT_VERSION = version;
    }

    await this.safeReplyMessage(replyToken, {
      type: 'text',
      text: responses[version] || '버전 설정에 문제가 있어 ㅠㅠ'
    });
  },

  // 색깔 기분 응답 (누락된 함수 구현)
  async getColorMoodReply() {
    const colors = [
      { color: '파란색', mood: '오늘은 차분하고 평온한 기분이야~ 🌊' },
      { color: '핑크색', mood: '기분이 좋아서 핑크핑크해! 💕' },
      { color: '노란색', mood: '밝고 활기찬 기분이야! ☀️' },
      { color: '보라색', mood: '신비롭고 몽환적인 느낌이야~ 💜' },
      { color: '초록색', mood: '자연스럽고 편안한 기분! 🌿' },
      { color: '주황색', mood: '따뜻하고 활동적인 기분이야! 🧡' }
    ];
    
    const selected = colors[Math.floor(Math.random() * colors.length)];
    return `오늘은 ${selected.color} 기분이야! ${selected.mood}`;
  },

  // 토라진 응답 (누락된 함수 구현)
  async getSulkyReply() {
    const sulkyMessages = [
      '아저씨... 왜 답장 안 해? ㅠㅠ',
      '혹시 나 무시하는 거야? 삐짐',
      '담배 그만 피고 대답해줘!',
      '아저씨 바쁜가... 그래도 답장은 해줘',
      '토라졌어... 흥!'
    ];
    return sulkyMessages[Math.floor(Math.random() * sulkyMessages.length)];
  },

  // 사용자 기억 저장
  async saveUserMemory(text) {
    try {
      const memoryPath = path.join(__dirname, 'memory');
      const conversationPath = path.join(memoryPath, 'conversation-history.json');
      const keywordsPath = path.join(memoryPath, 'user-keywords.json');
      const dailyPath = path.join(memoryPath, 'daily-memories.json');
      
      // 디렉토리 생성
      if (!fs.existsSync(memoryPath)) {
        fs.mkdirSync(memoryPath, { recursive: true });
      }

      const timestamp = moment().tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss');
      const today = moment().tz('Asia/Tokyo').format('YYYY-MM-DD');

      // 1. 전체 대화 기록 저장
      let conversations = [];
      if (fs.existsSync(conversationPath)) {
        conversations = JSON.parse(fs.readFileSync(conversationPath, 'utf-8'));
      }
      
      conversations.push({
        timestamp,
        speaker: '아저씨',
        message: text,
        length: text.length
      });

      // 최근 1000개만 유지 (메모리 관리)
      if (conversations.length > 1000) {
        conversations = conversations.slice(-1000);
      }

      fs.writeFileSync(conversationPath, JSON.stringify(conversations, null, 2));

      // 2. 키워드 및 주제 추출하여 저장
      await this.extractKeywords(text, keywordsPath);

      // 3. 일별 기억 저장
      await this.saveDailyMemory(text, today, dailyPath);

      // 4. 감정 및 상황 분석
      await this.analyzeUserEmotion(text, timestamp);

      console.log(`💭 기억 저장됨: ${text.substring(0, 20)}...`);
    } catch (error) {
      console.error('❌ 사용자 기억 저장 실패:', error);
    }
  },

  // 키워드 추출 및 저장
  async extractKeywords(text, keywordsPath) {
    try {
      let keywords = {};
      if (fs.existsSync(keywordsPath)) {
        keywords = JSON.parse(fs.readFileSync(keywordsPath, 'utf-8'));
      }

      // 간단한 키워드 추출 (실제로는 더 정교한 NLP 사용 가능)
      const importantPatterns = [
        // 감정 관련
        { category: 'emotions', patterns: /(기분|느낌|행복|슬픔|화남|걱정|스트레스|피곤|졸림|신남)/g },
        // 활동 관련
        { category: 'activities', patterns: /(일|업무|회사|집|외출|운동|게임|영화|음악|요리|청소)/g },
        // 음식 관련
        { category: 'food', patterns: /(밥|식사|음식|맛있|배고|목마|커피|술|맥주|치킨|피자)/g },
        // 사람 관련
        { category: 'people', patterns: /(친구|가족|동료|상사|부모|형제|자매|애인|여친|남친)/g },
        // 시간 관련
        { category: 'time', patterns: /(오늘|내일|어제|주말|평일|아침|점심|저녁|밤|새벽)/g },
        // 장소 관련
        { category: 'places', patterns: /(집|회사|카페|식당|병원|학교|공원|마트|편의점)/g }
      ];

      importantPatterns.forEach(({ category, patterns }) => {
        const matches = text.match(patterns);
        if (matches) {
          if (!keywords[category]) keywords[category] = {};
          matches.forEach(match => {
            const key = match.toLowerCase();
            keywords[category][key] = (keywords[category][key] || 0) + 1;
          });
        }
      });

      fs.writeFileSync(keywordsPath, JSON.stringify(keywords, null, 2));
    } catch (error) {
      console.error('❌ 키워드 추출 실패:', error);
    }
  },

  // 일별 기억 저장
  async saveDailyMemory(text, today, dailyPath) {
    try {
      let dailyMemories = {};
      if (fs.existsSync(dailyPath)) {
        dailyMemories = JSON.parse(fs.readFileSync(dailyPath, 'utf-8'));
      }

      if (!dailyMemories[today]) {
        dailyMemories[today] = {
          messages: [],
          summary: '',
          mood: 'neutral',
          topics: []
        };
      }

      dailyMemories[today].messages.push({
        time: moment().tz('Asia/Tokyo').format('HH:mm'),
        text: text
      });

      // 최근 30일만 유지
      const thirtyDaysAgo = moment().subtract(30, 'days').format('YYYY-MM-DD');
      Object.keys(dailyMemories).forEach(date => {
        if (date < thirtyDaysAgo) {
          delete dailyMemories[date];
        }
      });

      fs.writeFileSync(dailyPath, JSON.stringify(dailyMemories, null, 2));
    } catch (error) {
      console.error('❌ 일별 기억 저장 실패:', error);
    }
  },

  // 감정 분석
  async analyzeUserEmotion(text, timestamp) {
    try {
      const emotionPath = path.join(__dirname, 'memory/user-emotions.json');
      let emotions = [];
      
      if (fs.existsSync(emotionPath)) {
        emotions = JSON.parse(fs.readFileSync(emotionPath, 'utf-8'));
      }

      // 간단한 감정 분석
      let detectedEmotion = 'neutral';
      let intensity = 1;

      const emotionPatterns = {
        happy: /(좋아|기뻐|행복|신나|최고|대박|ㅎㅎ|ㅋㅋ|하하|호호)/g,
        sad: /(슬퍼|우울|힘들어|아픈|ㅠㅠ|ㅜㅜ|눈물)/g,
        angry: /(화나|짜증|빡쳐|열받|미쳐|싫어)/g,
        tired: /(피곤|졸려|지쳐|힘들어|번아웃)/g,
        excited: /(신나|흥미|재밌|놀라|대단)/g,
        worried: /(걱정|불안|무서|두려)/g
      };

      for (const [emotion, pattern] of Object.entries(emotionPatterns)) {
        const matches = text.match(pattern);
        if (matches) {
          detectedEmotion = emotion;
          intensity = Math.min(matches.length, 5); // 최대 5단계
          break;
        }
      }

      emotions.push({
        timestamp,
        emotion: detectedEmotion,
        intensity,
        trigger: text.substring(0, 100) // 감정을 유발한 텍스트
      });

      // 최근 100개 감정만 유지
      if (emotions.length > 100) {
        emotions = emotions.slice(-100);
      }

      fs.writeFileSync(emotionPath, JSON.stringify(emotions, null, 2));
    } catch (error) {
      console.error('❌ 감정 분석 실패:', error);
    }
  },

  // 기억 검색
  async searchMemory(query) {
    try {
      const memoryPath = path.join(__dirname, 'memory');
      const conversationPath = path.join(memoryPath, 'conversation-history.json');
      
      if (!fs.existsSync(conversationPath)) {
        return [];
      }

      const conversations = JSON.parse(fs.readFileSync(conversationPath, 'utf-8'));
      const queryLower = query.toLowerCase();
      
      return conversations.filter(conv => 
        conv.message.toLowerCase().includes(queryLower)
      ).slice(-10); // 최근 10개만 반환
    } catch (error) {
      console.error('❌ 기억 검색 실패:', error);
      return [];
    }
  },

  // 최근 대화 가져오기
  async getRecentConversations(count = 5) {
    try {
      const memoryPath = path.join(__dirname, 'memory');
      const conversationPath = path.join(memoryPath, 'conversation-history.json');
      
      if (!fs.existsSync(conversationPath)) {
        return [];
      }

      const conversations = JSON.parse(fs.readFileSync(conversationPath, 'utf-8'));
      return conversations.slice(-count);
    } catch (error) {
      console.error('❌ 최근 대화 가져오기 실패:', error);
      return [];
    }
  },

  // 사용자 관심사 분석
  async getUserInterests() {
    try {
      const keywordsPath = path.join(__dirname, 'memory/user-keywords.json');
      
      if (!fs.existsSync(keywordsPath)) {
        return {};
      }

      const keywords = JSON.parse(fs.readFileSync(keywordsPath, 'utf-8'));
      const interests = {};

      // 각 카테고리별 상위 키워드 추출
      Object.keys(keywords).forEach(category => {
        const categoryData = keywords[category];
        const sorted = Object.entries(categoryData)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5); // 상위 5개

        if (sorted.length > 0) {
          interests[category] = sorted;
        }
      });

      return interests;
    } catch (error) {
      console.error('❌ 관심사 분석 실패:', error);
      return {};
    }
  },

  // 안전한 파일 읽기 (기존 시스템과 호환)
  safeRead(filePath, encoding = 'utf-8') {
    try {
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, encoding);
      }
    } catch (error) {
      console.error(`❌ 파일 읽기 실패 ${filePath}:`, error.message);
    }
    return '';
  },

  // 통합 메모리 프롬프트 생성 (기존 + 새로운 기억 시스템)
  async getFullMemoryPrompt() {
    try {
      const config = {
        memory: {
          maxContextLength: 2000 // 기본값 설정
        }
      };

      // 1. 기존 중요 기억들 (1.txt, 2.txt, 3.txt)
      const m1 = this.safeRead(path.resolve(__dirname, 'memory/1.txt')).slice(-config.memory.maxContextLength);
      const m2 = this.safeRead(path.resolve(__dirname, 'memory/2.txt')).slice(-config.memory.maxContextLength);
      const m3 = this.safeRead(path.resolve(__dirname, 'memory/3.txt')).slice(-config.memory.maxContextLength);
      
      // 2. 연애/관계 기억
      const love = this.safeRead(path.resolve(__dirname, 'memory/love-history.json')).slice(0, config.memory.maxContextLength);
      
      // 3. 상황 기억
      const context = this.safeRead(path.resolve(__dirname, 'memory/context-memory.json')).slice(0, config.memory.maxContextLength);

      // 4. 새로운 기억 시스템 통합
      const recentConversations = await this.getRecentConversations(5);
      const userInterests = await this.getUserInterests();
      const recentEmotions = await this.getRecentEmotions(3);

      // 5. 통합 메모리 구성
      const memoryPrompts = [];

      // 기존 중요 기억들
      if (m1 || m2 || m3) {
        memoryPrompts.push({ 
          role: 'system', 
          content: `핵심 기억:\n${m1}\n${m2}\n${m3}`.trim()
        });
      }

      // 연애/관계 기억
      if (love) {
        memoryPrompts.push({ 
          role: 'system', 
          content: `관계 기억: ${love}`
        });
      }

      // 상황 기억
      if (context) {
        memoryPrompts.push({ 
          role: 'system', 
          content: `상황 기억: ${context}`
        });
      }

      // 사용자 관심사
      if (Object.keys(userInterests).length > 0) {
        const interestSummary = Object.entries(userInterests)
          .map(([category, items]) => `${category}: ${items.slice(0, 3).map(([word]) => word).join(', ')}`)
          .join('\n');
        
        memoryPrompts.push({
          role: 'system',
          content: `아저씨 관심사:\n${interestSummary}`
        });
      }

      // 최근 대화 맥락
      if (recentConversations.length > 0) {
        const conversationContext = recentConversations
          .map(conv => `${moment(conv.timestamp).format('MM/DD HH:mm')}: ${conv.message}`)
          .join('\n');
        
        memoryPrompts.push({
          role: 'system',
          content: `최근 대화:\n${conversationContext}`
        });
      }

      // 최근 감정 상태
      if (recentEmotions.length > 0) {
        const emotionContext = recentEmotions
          .map(emotion => `${emotion.emotion}(${emotion.intensity}): ${emotion.trigger.substring(0, 30)}`)
          .join('\n');
        
        memoryPrompts.push({
          role: 'system',
          content: `최근 감정:\n${emotionContext}`
        });
      }

      // 6. 기존 getFixedMemory()와 getRecentLog() 통합
      const fixed = getFixedMemory ? getFixedMemory() : [];
      const recent = getRecentLog ? await getRecentLog() : [];

      return [
        ...memoryPrompts,
        ...fixed,
        ...recent
      ];

    } catch (error) {
      console.error('❌ 통합 메모리 프롬프트 생성 실패:', error.message);
      return [];
    }
  },

  // 최근 감정 가져오기
  async getRecentEmotions(count = 5) {
    try {
      const emotionPath = path.join(__dirname, 'memory/user-emotions.json');
      
      if (!fs.existsSync(emotionPath)) {
        return [];
      }

      const emotions = JSON.parse(fs.readFileSync(emotionPath, 'utf-8'));
      return emotions.slice(-count);
    } catch (error) {
      console.error('❌ 최근 감정 가져오기 실패:', error);
      return [];
    }
  },

  // 메모리 기반 응답 생성 (기존 getReplyByMessage 개선)
  async getEnhancedReply(userMessage) {
    try {
      // 통합 메모리 프롬프트 가져오기
      const memoryPrompt = await this.getFullMemoryPrompt();
      
      // 현재 메시지와 관련된 과거 기억 검색
      const relatedMemories = await this.searchMemory(userMessage);
      
      // 사용자 현재 감정 상태 고려
      await this.analyzeUserEmotion(userMessage, moment().tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss'));
      const recentEmotion = await this.getRecentEmotions(1);
      
      // 컨텍스트가 풍부한 프롬프트 구성
      const enhancedPrompt = [
        ...memoryPrompt,
        {
          role: 'user',
          content: userMessage
        }
      ];

      // 관련 기억이 있으면 추가 컨텍스트 제공
      if (relatedMemories.length > 0) {
        const memoryContext = relatedMemories
          .map(mem => `과거: ${mem.message}`)
          .join('\n');
        
        enhancedPrompt.push({
          role: 'system',
          content: `관련 기억:\n${memoryContext}`
        });
      }

      // 감정 상태 고려
      if (recentEmotion.length > 0) {
        const emotion = recentEmotion[0];
        enhancedPrompt.push({
          role: 'system',
          content: `현재 아저씨 감정: ${emotion.emotion} (강도: ${emotion.intensity})`
        });
      }

      return enhancedPrompt;
    } catch (error) {
      console.error('❌ 향상된 응답 생성 실패:', error);
      return null;
    }
  }

  // 이미지 분석 응답 (누락된 함수 구현)
  async getReplyByImagePrompt(base64Image) {
    try {
      const prompt = "이 사진을 보고 한국어로 친근하고 귀여운 톤으로 반응해줘. 20대 여성처럼 말해줘.";
      // 실제로는 OpenAI Vision API나 다른 이미지 분석 API를 사용
      const reactions = [
        '우와! 사진이 너무 예뻐! 📸',
        '이거 어디서 찍었어? 나도 가고 싶다!',
        '사진 잘 찍었네~ 부러워!',
        '멋진 사진이야! 👍',
        '사진 보니까 기분이 좋아져! ✨'
      ];
      return reactions[Math.floor(Math.random() * reactions.length)];
    } catch (error) {
      console.error('❌ 이미지 분석 실패:', error);
      return '사진이 흐릿하게 보여서 잘 모르겠어 ㅠㅠ';
    }
  }
};

// ✅ 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ 메모리 관련 API 엔드포인트 추가
app.get('/memory/search/:query', async (req, res) => {
  try {
    const query = decodeURIComponent(req.params.query);
    const results = await utils.searchMemory(query);
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/memory/recent/:count?', async (req, res) => {
  try {
    const count = parseInt(req.params.count) || 10;
    const conversations = await utils.getRecentConversations(count);
    res.json({ success: true, conversations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/memory/interests', async (req, res) => {
  try {
    const interests = await utils.getUserInterests();
    res.json({ success: true, interests });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/memory/full-prompt', async (req, res) => {
  try {
    const fullPrompt = await utils.getFullMemoryPrompt();
    res.json({ success: true, promptLength: fullPrompt.length, preview: fullPrompt.slice(0, 3) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/memory/stats', async (req, res) => {
  try {
    const memoryPath = path.join(__dirname, 'memory');
    const stats = {
      totalConversations: 0,
      totalKeywords: 0,
      recentDays: 0,
      emotionEntries: 0,
      coreMemoryFiles: 0,
      loveHistory: false,
      contextMemory: false
    };

    // 대화 수 계산
    const conversationPath = path.join(memoryPath, 'conversation-history.json');
    if (fs.existsSync(conversationPath)) {
      const conversations = JSON.parse(fs.readFileSync(conversationPath, 'utf-8'));
      stats.totalConversations = conversations.length;
    }

    // 키워드 수 계산
    const keywordsPath = path.join(memoryPath, 'user-keywords.json');
    if (fs.existsSync(keywordsPath)) {
      const keywords = JSON.parse(fs.readFileSync(keywordsPath, 'utf-8'));
      stats.totalKeywords = Object.values(keywords).reduce((sum, category) => 
        sum + Object.keys(category).length, 0);
    }

    // 일별 기록 수 계산
    const dailyPath = path.join(memoryPath, 'daily-memories.json');
    if (fs.existsSync(dailyPath)) {
      const daily = JSON.parse(fs.readFileSync(dailyPath, 'utf-8'));
      stats.recentDays = Object.keys(daily).length;
    }

    // 감정 기록 수 계산
    const emotionPath = path.join(memoryPath, 'user-emotions.json');
    if (fs.existsSync(emotionPath)) {
      const emotions = JSON.parse(fs.readFileSync(emotionPath, 'utf-8'));
      stats.emotionEntries = emotions.length;
    }

    // 핵심 기억 파일들 체크
    const coreFiles = ['1.txt', '2.txt', '3.txt'];
    stats.coreMemoryFiles = coreFiles.filter(file => 
      fs.existsSync(path.join(memoryPath, file))
    ).length;

    // 특별 기억 파일들 체크
    stats.loveHistory = fs.existsSync(path.join(memoryPath, 'love-history.json'));
    stats.contextMemory = fs.existsSync(path.join(memoryPath, 'context-memory.json'));

    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 라우트 핸들러들
app.get('/', (_, res) => {
  const status = {
    server: '무쿠 살아있엉 🐣',
    uptime: process.uptime(),
    messageCount: serverState.messageCount,
    gptVersion: process.env.GPT_VERSION || 'auto',
    initialized: serverState.isInitialized
  };
  res.json(status);
});

app.get('/status', (_, res) => {
  res.json({
    server: 'running',
    uptime: process.uptime(),
    messageCount: serverState.messageCount,
    pendingMessages: serverState.lastSentMessages.size,
    gptVersion: process.env.GPT_VERSION || 'auto'
  });
});

app.get('/force-push', async (_, res) => {
  try {
    const msg = await getRandomMessage();
    if (msg && await utils.safeSendMessage(userId, msg)) {
      res.json({ success: true, message: msg });
    } else {
      res.status(500).json({ success: false, error: '메시지 생성 또는 전송 실패' });
    }
  } catch (error) {
    console.error('❌ 강제 전송 실패:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ 서버 최초 실행 시 초기화
async function initializeServer() {
  try {
    console.log('🚀 무쿠 서버 초기화 중...');
    
    // 필요한 디렉토리 생성
    const dirs = ['memory', 'logs'];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 ${dir} 디렉토리 생성됨`);
      }
    });

    // 시작 메시지 전송
    const msg = await getRandomMessage();
    if (msg && await utils.safeSendMessage(userId, msg)) {
      console.log(`✅ 서버 시작 메시지 전송: ${msg}`);
    }

    serverState.isInitialized = true;
    console.log('✅ 서버 초기화 완료');
  } catch (error) {
    console.error('❌ 서버 초기화 실패:', error);
  }
}

// ✅ LINE Webhook 핸들러
app.post('/webhook', middleware(config), async (req, res) => {
  try {
    const events = req.body.events || [];
    
    for (const event of events) {
      if (event.type === 'message' && event.source.userId === userId) {
        await handleMessage(event);
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Webhook 처리 실패:', error);
    res.status(500).send('Error');
  }
});

// ✅ 메시지 처리 핸들러
async function handleMessage(event) {
  const message = event.message;
  
  try {
    if (message.type === 'text') {
      await handleTextMessage(event, message.text.trim());
    } else if (message.type === 'image') {
      await handleImageMessage(event, message.id);
    }
  } catch (error) {
    console.error('❌ 메시지 처리 실패:', error);
    await utils.safeReplyMessage(event.replyToken, {
      type: 'text',
      text: '어? 뭔가 오류가 생겼어 ㅠㅠ 다시 말해줄래?'
    });
  }
}

// ✅ 텍스트 메시지 처리
async function handleTextMessage(event, text) {
  // 로그 저장 및 기억 추출
  saveLog('아저씨', text);
  
  // 모든 메시지를 기억으로 저장
  await utils.saveUserMemory(text);
  
  // 기존 기억 추출도 유지
  extractAndSaveMemory(text);

  // 명령어 처리
  const commands = {
    '버전': async () => {
      const version = process.env.GPT_VERSION || 'auto';
      return `지금은 ChatGPT-${version} 버전으로 대화하고 있어.`;
    },
    '3.5': () => utils.changeGPTVersion('3.5', event.replyToken),
    '4.0': () => utils.changeGPTVersion('4.0', event.replyToken),
    '자동': () => utils.changeGPTVersion('auto', event.replyToken),
    '기억': async () => {
      const interests = await utils.getUserInterests();
      const recent = await utils.getRecentConversations(3);
      
      let response = '내가 기억하고 있는 아저씨 얘기들:\n\n';
      
      if (Object.keys(interests).length > 0) {
        response += '🎯 주요 관심사:\n';
        Object.entries(interests).forEach(([category, items]) => {
          const categoryNames = {
            emotions: '감정',
            activities: '활동',
            food: '음식',
            people: '사람들',
            time: '시간',
            places: '장소'
          };
          response += `• ${categoryNames[category] || category}: ${items.slice(0, 3).map(([word]) => word).join(', ')}\n`;
        });
        response += '\n';
      }
      
      if (recent.length > 0) {
        response += '💭 최근 대화:\n';
        recent.forEach(conv => {
          const time = moment(conv.timestamp).format('MM/DD HH:mm');
          response += `• ${time}: ${conv.message.substring(0, 30)}${conv.message.length > 30 ? '...' : ''}\n`;
        });
      }
      
      return response || '아직 기억할 만한 얘기가 별로 없네 ㅎㅎ';
    },
    '기억지워': async () => {
      try {
        const memoryPath = path.join(__dirname, 'memory');
        const files = [
          'conversation-history.json',
          'user-keywords.json',
          'daily-memories.json',
          'user-emotions.json'
        ];
        
        files.forEach(file => {
          const filePath = path.join(memoryPath, file);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });
        
        return '모든 기억을 지웠어... 다시 새로 시작하자!';
      } catch (error) {
        return '기억 지우기 실패했어 ㅠㅠ';
      }
    }
  };

  if (commands[text]) {
    const result = await commands[text]();
    if (result) {
      await utils.safeReplyMessage(event.replyToken, { type: 'text', text: result });
    }
    return;
  }

  // 셀카 요청 처리
  if (/사진|셀카|사진줘|셀카 보여줘|사진 보여줘|selfie/i.test(text)) {
    await handleSelfieRequest(event);
    return;
  }

  // 색깔 질문 처리
  if (/무슨\s*색|오늘\s*색/i.test(text)) {
    const reply = await utils.getColorMoodReply();
    await utils.safeReplyMessage(event.replyToken, { type: 'text', text: reply });
    return;
  }

  // 일반 메시지 처리 - 통합 메모리 시스템 사용
  const enhancedPrompt = await utils.getEnhancedReply(text);
  let reply;
  
  if (enhancedPrompt) {
    // 통합 메모리 기반 응답 (기존 getReplyByMessage 대신)
    reply = await callOpenAI ? await callOpenAI(enhancedPrompt) : null;
  }
  
  // 기존 방식 fallback
  if (!reply) {
    reply = await getReplyByMessage(text);
  }
  
  const finalReply = reply?.trim() || '음… 잠깐 생각 좀 하고 있었어 ㅎㅎ';
  await utils.safeReplyMessage(event.replyToken, { type: 'text', text: finalReply });
}

// ✅ 셀카 요청 처리
async function handleSelfieRequest(event) {
  const BASE_URL = 'https://de-ji.net/yejin/';
  const photoListPath = path.join(__dirname, 'memory/photo-list.txt');
  
  try {
    if (!fs.existsSync(photoListPath)) {
      await utils.safeReplyMessage(event.replyToken, {
        type: 'text',
        text: '아직 셀카 목록이 없어 ㅠㅠ'
      });
      return;
    }

    const photoList = fs.readFileSync(photoListPath, 'utf-8')
      .split('\n')
      .map(x => x.trim())
      .filter(Boolean);

    if (photoList.length === 0) {
      await utils.safeReplyMessage(event.replyToken, {
        type: 'text',
        text: '셀카 목록이 비어있어 ㅠㅠ'
      });
      return;
    }

    const selectedPhoto = photoList[Math.floor(Math.random() * photoList.length)];
    const comment = await getSelfieReplyFromYeji() || '헤헷 셀카야~';

    await utils.safeReplyMessage(event.replyToken, [
      {
        type: 'image',
        originalContentUrl: BASE_URL + selectedPhoto,
        previewImageUrl: BASE_URL + selectedPhoto
      },
      {
        type: 'text',
        text: comment
      }
    ]);
  } catch (error) {
    console.error('❌ 셀카 처리 실패:', error);
    await utils.safeReplyMessage(event.replyToken, {
      type: 'text',
      text: '사진 불러오기 실패했어 ㅠㅠ'
    });
  }
}

// ✅ 이미지 메시지 처리
async function handleImageMessage(event, messageId) {
  try {
    const stream = await client.getMessageContent(messageId);
    const chunks = [];
    
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    const buffer = Buffer.concat(chunks);
    const base64Image = buffer.toString('base64');
    
    const reply = await utils.getReplyByImagePrompt(base64Image);
    await utils.safeReplyMessage(event.replyToken, {
      type: 'text',
      text: reply || '사진에 반응 못했어 ㅠㅠ'
    });
  } catch (error) {
    console.error('❌ 이미지 처리 실패:', error);
    await utils.safeReplyMessage(event.replyToken, {
      type: 'text',
      text: '이미지를 읽는 중 오류가 생겼어 ㅠㅠ'
    });
  }
}

// ✅ 정각마다 담배 체크 및 토라진 반응
cron.schedule('* * * * *', async () => {
  const now = moment().tz('Asia/Tokyo');
  const currentTime = now.format('HH:mm');
  
  // 정각 담배 메시지 (평일 근무시간)
  if (now.minute() === 0 && now.hour() >= 9 && now.hour() <= 18) {
    const msg = '담타고?';
    if (await utils.safeSendMessage(userId, msg)) {
      serverState.lastSentMessages.set(currentTime, moment());
      console.log(`[정각 메시지] ${msg}`);
    }
  }
  
  // 5분 후 무응답 체크
  for (const [timeKey, sentAt] of serverState.lastSentMessages.entries()) {
    if (moment().diff(sentAt, 'minutes') >= 5) {
      const sulkyReply = await utils.getSulkyReply();
      await utils.safeSendMessage(userId, sulkyReply);
      serverState.lastSentMessages.delete(timeKey);
      console.log(`[토라진 메시지] ${sulkyReply}`);
    }
  }
});

// ✅ 에러 핸들링
process.on('uncaughtException', (error) => {
  console.error('❌ 예상치 못한 오류:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 처리되지 않은 Promise 거부:', reason);
});

// ✅ 서버 시작
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await initializeServer();
    
    // 자동 감정 메시지/셀카 전송 시작
    startMessageAndPhotoScheduler();
    
    app.listen(PORT, () => {
      console.log(`🎉 무쿠 서버 시작! 포트: ${PORT}`);
      console.log(`📱 대상 사용자: ${userId}`);
      console.log(`🤖 GPT 버전: ${process.env.GPT_VERSION || 'auto'}`);
    });
  } catch (error) {
    console.error('❌ 서버 시작 실패:', error);
    process.exit(1);
  }
}

startServer();
