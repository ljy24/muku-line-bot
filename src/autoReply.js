// autoReply.js - 개선된 무쿠 LINE 응답용 예진이 말투 + 감정기억 자동 저장 + 자동 셀카 전송 포함 전체 코드

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const axios = require('axios');
const cron = require('node-cron');
const { Client } = require('@line/bot-sdk');

// 환경 변수 검증
function validateEnvironment() {
  const required = [
    'OPENAI_API_KEY',
    'TARGET_USER_ID', 
    'LINE_ACCESS_TOKEN',
    'LINE_CHANNEL_SECRET'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`❌ 필수 환경 변수 누락: ${missing.join(', ')}`);
  }
}

// 모듈 로드 시점에 환경 변수 검증
validateEnvironment();

// 설정 객체
const config = {
  openai: {
    defaultModel: 'gpt-4o',
    temperature: 0.95,
    maxTokens: 400
  },
  scheduler: {
    validHours: [9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,0,1,2,3],
    messageCount: 8,
    photoCount: 3
  },
  memory: {
    maxContextLength: 3000,
    cacheTimeout: 60000
  },
  api: {
    timeout: 10000,
    retryCount: 3
  }
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let forcedModel = null;
let schedulerInitialized = false;

const contextPath = path.resolve(__dirname, '../memory/context-memory.json');
const userId = process.env.TARGET_USER_ID;
const client = new Client({
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
});

// 메모리 캐시
const cache = new Map();

// 유틸리티 함수들
function setForcedModel(name) {
  forcedModel = (name === 'gpt-3.5-turbo' || name === 'gpt-4o') ? name : null;
}

function getCurrentModelName() {
  return forcedModel || config.openai.defaultModel;
}

function safeRead(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content || '';
  } catch (error) {
    console.error(`❌ 파일 읽기 실패 ${filePath}:`, error.message);
    return '';
  }
}

function cleanReply(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/\s*예진[\s:：-]*/i, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .replace(/["'""]/g, '')
    .replace(/\b(당신|그대|그분|자기야|자기|너|네|네가|널|예진)\b/g, '아저씨')
    .replace(/아저씨에게 아저씨라고/g, '아저씨에게')
    .replace(/시파/g, '')
    .replace(/[!?~\u2764\uD83D\uDC96-\uDC9F]/g, '')
    .trim();
}

function sanitizeJsonString(jsonStr) {
  if (!jsonStr) return '';
  
  return jsonStr
    .replace(/[''""]/g, '"')
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    .replace(/\n/g, '')
    .trim();
}

// 개선된 OpenAI API 호출
async function callOpenAI(messages, model = null, max_tokens = null) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('유효하지 않은 메시지 배열');
  }

  const actualModel = model || getCurrentModelName();
  const actualMaxTokens = max_tokens || config.openai.maxTokens;

  try {
    const response = await openai.chat.completions.create({
      model: actualModel,
      messages,
      temperature: config.openai.temperature,
      max_tokens: actualMaxTokens
    });
    
    if (!response.choices || response.choices.length === 0) {
      throw new Error('OpenAI 응답에 choices가 없음');
    }
    
    const content = response.choices[0].message?.content;
    if (!content) {
      throw new Error('OpenAI 응답 내용이 비어있음');
    }
    
    return content.trim();
  } catch (error) {
    console.error('❌ OpenAI API 호출 실패:', error.message);
    
    // 재시도 로직 (간단한 구현)
    if (error.code === 'rate_limit_exceeded') {
      console.log('⏳ 레이트 리미트 - 1초 후 재시도');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return callOpenAI(messages, model, max_tokens);
    }
    
    throw error;
  }
}

// 개선된 로그 저장
async function saveLog(role, message) {
  if (!message || typeof message !== 'string') {
    console.error('❌ 유효하지 않은 로그 메시지:', message);
    return;
  }

  try {
    await axios.post('https://www.de-ji.net/log.php', {
      from: role === '아저씨' ? 'uncle' : 'yejin',
      content: message
    }, {
      timeout: config.api.timeout
    });
  } catch (error) {
    console.error('❌ 로그 저장 실패:', error.message);
    // 로그 저장 실패는 치명적이지 않으므로 계속 진행
  }
}

// 개선된 최근 로그 가져오기 (캐싱 포함)
async function getRecentLog() {
  const cacheKey = 'recent_logs';
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < config.memory.cacheTimeout) {
    return cached.data;
  }

  try {
    const response = await axios.get('https://www.de-ji.net/log.json', {
      timeout: config.api.timeout
    });
    
    const logs = Array.isArray(response.data) ? response.data : [];
    const processed = logs.slice(0, 50).reverse().map(log => ({
      role: log.from === 'uncle' ? 'user' : 'assistant',
      content: log.content || ''
    }));
    
    cache.set(cacheKey, { data: processed, timestamp: Date.now() });
    return processed;
  } catch (error) {
    console.error('❌ 최근 로그 가져오기 실패:', error.message);
    return cached?.data || [];
  }
}

// 개선된 메모리 추출 및 저장
async function extractAndSaveMemory(userMessage) {
  if (!userMessage || typeof userMessage !== 'string') {
    console.error('❌ 유효하지 않은 사용자 메시지');
    return;
  }
  
  if (!userMessage.includes('아저씨')) return;

  try {
    const messages = [
      {
        role: 'system',
        content: `사용자 대화에서 기억할 내용을 하나의 JSON 객체로 만들어줘. 반드시 {"키": "값"} 형식으로 출력해. 예시: {"아저씨의 생일": "7월 12일"} 다른 텍스트는 절대 포함하지 마.`
      },
      { role: 'user', content: userMessage }
    ];

    const response = await callOpenAI(messages, 'gpt-3.5-turbo', 200);
    
    if (!response) {
      console.error('❌ GPT 응답이 비어있음');
      return;
    }

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ JSON 형식 없음:', response);
      return;
    }

    const sanitizedJson = sanitizeJsonString(jsonMatch[0]);
    let parsed;
    
    try {
      parsed = JSON.parse(sanitizedJson);
    } catch (parseError) {
      console.error('❌ JSON 파싱 실패:', parseError.message);
      console.error('⛔ GPT 응답 원문:', response);
      console.error('🛠️ 정제된 JSON:', sanitizedJson);
      return;
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      console.error('❌ 파싱된 데이터가 객체가 아님:', parsed);
      return;
    }

    await saveMemoryToFile(parsed);
  } catch (error) {
    console.error('❌ 메모리 추출 실패:', error.message);
  }
}

// 메모리 파일 저장 (동시성 고려)
async function saveMemoryToFile(newMemory) {
  try {
    const raw = safeRead(contextPath);
    const context = raw ? JSON.parse(raw) : {};
    
    const entries = Object.entries(newMemory);
    if (entries.length === 0) return;

    const [key, value] = entries[0];
    if (!key || !value || typeof key !== 'string' || typeof value !== 'string') {
      console.error('❌ 유효하지 않은 키-값 쌍:', { key, value });
      return;
    }

    const trimmedKey = key.trim();
    const trimmedValue = value.trim();
    
    if (!trimmedKey || !trimmedValue || context[trimmedKey]) {
      return; // 이미 존재하거나 빈 값
    }

    context[trimmedKey] = trimmedValue;

    // 백업 생성 후 원자적 쓰기
    const backupPath = contextPath + '.backup';
    fs.writeFileSync(backupPath, JSON.stringify(context, null, 2), 'utf-8');
    fs.renameSync(backupPath, contextPath);
    
    console.log(`📌 새로운 기억 저장: ${trimmedKey} → ${trimmedValue}`);
  } catch (error) {
    console.error('❌ 메모리 파일 저장 실패:', error.message);
  }
}

// 개선된 셀카 응답
async function getSelfieReplyFromYeji() {
  try {
    const messages = [
      { 
        role: 'system', 
        content: '넌 예진이야. 지금 아저씨한테 셀카를 보내고 있어. 셀카에 어울리는 짧고 감정 담긴 말투로 말해줘. 약간 부끄럽거나 귀엽게.' 
      },
      { role: 'user', content: '셀카 보낼게! 코멘트 해줘.' }
    ];
    
    const raw = await callOpenAI(messages, 'gpt-3.5-turbo', 100);
    const reply = cleanReply(raw);
    
    if (reply) {
      await saveLog('예진이', reply);
    }
    
    return reply;
  } catch (error) {
    console.error('❌ 셀카 응답 생성 실패:', error.message);
    return '사진 어때?'; // 기본 응답
  }
}

function getFixedMemory() {
  const fixedPath = path.resolve(__dirname, '../memory/fixedMemories.json');
  const fixed = safeRead(fixedPath);
  
  try {
    const memories = JSON.parse(fixed || '[]');
    return Array.isArray(memories) 
      ? memories.map(text => ({ role: 'system', content: text }))
      : [];
  } catch (error) {
    console.error('❌ 고정 메모리 파싱 실패:', error.message);
    return [];
  }
}

async function getFullMemoryPrompt() {
  try {
    const m1 = safeRead(path.resolve(__dirname, '../memory/1.txt')).slice(-config.memory.maxContextLength);
    const m2 = safeRead(path.resolve(__dirname, '../memory/2.txt')).slice(-config.memory.maxContextLength);
    const m3 = safeRead(path.resolve(__dirname, '../memory/3.txt')).slice(-config.memory.maxContextLength);
    
    const compressed = { role: 'system', content: `${m1}\n${m2}\n${m3}` };
    const fixed = getFixedMemory();
    const recent = await getRecentLog();
    
    return [compressed, ...fixed, ...recent];
  } catch (error) {
    console.error('❌ 전체 메모리 프롬프트 생성 실패:', error.message);
    return [];
  }
}

async function getRandomMessage() {
  try {
    const messages = await getFullMemoryPrompt();
    messages.push({ 
      role: 'user', 
      content: '예진이처럼 감정 담긴 랜덤 메시지 하나 만들어줘. 혼잣말처럼 아저씨한테 말하는 식으로.' 
    });
    
    const raw = await callOpenAI(messages, 'gpt-3.5-turbo', 400);
    const message = cleanReply(raw);
    
    if (message) {
      await saveLog('예진이', message);
    }
    
    return message;
  } catch (error) {
    console.error('❌ 랜덤 메시지 생성 실패:', error.message);
    return null;
  }
}

async function getColorMoodReply() {
  try {
    const messages = [
      { role: 'system', content: '넌 예진이야. 오늘 기분을 색으로 표현해서 짧게 말해줘.' },
      { role: 'user', content: '오늘 무슨 색이야?' }
    ];
    
    const raw = await callOpenAI(messages, 'gpt-3.5-turbo', 100);
    return cleanReply(raw);
  } catch (error) {
    console.error('❌ 색상 기분 응답 실패:', error.message);
    return '오늘은... 파란색 기분이야';
  }
}

async function getReplyByMessage(userMessage) {
  if (!userMessage || typeof userMessage !== 'string') {
    console.error('❌ 유효하지 않은 사용자 메시지');
    return '무슨 말인지 못 알아들었어...';
  }

  try {
    const lower = userMessage.toLowerCase().trim();
    
    // 시스템 명령어 처리
    if (lower === '버전') return `지금은 ${getCurrentModelName()} 버전으로 대화하고 있어.`;
    if (lower === '3.5') { 
      setForcedModel('gpt-3.5-turbo'); 
      return '응, 이제부터 3.5로 대화할게.'; 
    }
    if (lower === '4.0') { 
      setForcedModel('gpt-4o'); 
      return '응, 이제부터 4.0으로 바꿨어!'; 
    }
    if (lower === '자동') { 
      setForcedModel(null); 
      return '응, 상황에 맞게 자동으로 바꿔서 말할게!'; 
    }
    
    // 특수 응답 처리
    if (lower.includes('무슨 색') || lower.includes('오늘 색') || lower.includes('색이 뭐야')) {
      return await getColorMoodReply();
    }
    
    if (userMessage.includes('사진 줘') || userMessage.includes('셀카') || userMessage.includes('사진 보여줘')) {
      return await getSelfieReplyFromYeji();
    }

    // 메모리 추출 (비동기로 실행하되 응답을 기다리지 않음)
    extractAndSaveMemory(userMessage).catch(error => {
      console.error('❌ 백그라운드 메모리 추출 실패:', error.message);
    });

    // 일반 대화 응답
    const memory = await getFullMemoryPrompt();
    const prompt = [
      { role: 'system', content: `넌 예진이야. 감정 담아 짧게 반말로 혼잣말처럼 대답해줘.` },
      ...memory,
      { role: 'user', content: userMessage }
    ];

    const raw = await callOpenAI(prompt);
    const reply = cleanReply(raw);
    
    if (reply) {
      await saveLog('예진이', reply);
    }
    
    return reply || '음... 뭐라고 말해야 할지 모르겠어';
  } catch (error) {
    console.error('❌ 메시지 응답 생성 실패:', error.message);
    return '미안, 지금 머리가 좀 복잡해서...';
  }
}

// 개선된 스케줄러
function startMessageAndPhotoScheduler() {
  if (schedulerInitialized) {
    console.log('⚠️ 스케줄러가 이미 초기화됨');
    return;
  }
  
  schedulerInitialized = true;
  console.log('🚀 스케줄러 초기화 시작');

  try {
    // 랜덤 메시지 스케줄링
    const usedMessageSlots = new Set();
    let messageScheduleCount = 0;
    
    while (messageScheduleCount < config.scheduler.messageCount) {
      const hour = config.scheduler.validHours[Math.floor(Math.random() * config.scheduler.validHours.length)];
      const minute = Math.floor(Math.random() * 60);
      const timeKey = `${hour}:${minute}`;
      
      if (!usedMessageSlots.has(timeKey)) {
        usedMessageSlots.add(timeKey);
        const cronExp = `${minute} ${hour} * * *`;
        
        cron.schedule(cronExp, async () => {
          try {
            const message = await getRandomMessage();
            if (message && message.trim()) {
              await client.pushMessage(userId, { type: 'text', text: message });
              console.log(`📤 랜덤 메시지 전송 (${hour}:${minute}): ${message.substring(0, 20)}...`);
            }
          } catch (error) {
            console.error('❌ 스케줄된 메시지 전송 실패:', error.message);
          }
        });
        
        messageScheduleCount++;
        console.log(`📅 메시지 스케줄 등록: ${hour}:${minute.toString().padStart(2, '0')}`);
      }
    }

    // 사진 전송 스케줄링
    const BASE_URL = 'https://de-ji.net/yejin/';
    const photoListPath = path.join(__dirname, '../memory/photo-list.txt');
    const usedPhotoSlots = new Set();
    let photoScheduleCount = 0;
    
    while (photoScheduleCount < config.scheduler.photoCount) {
      const hour = config.scheduler.validHours[Math.floor(Math.random() * config.scheduler.validHours.length)];
      const minute = Math.floor(Math.random() * 60);
      const timeKey = `${hour}:${minute}`;
      
      if (!usedPhotoSlots.has(timeKey) && !usedMessageSlots.has(timeKey)) {
        usedPhotoSlots.add(timeKey);
        const cronExp = `${minute} ${hour} * * *`;
        
        cron.schedule(cronExp, async () => {
          try {
            const photoList = safeRead(photoListPath);
            const photos = photoList.split('\n').map(x => x.trim()).filter(Boolean);
            
            if (photos.length === 0) {
              console.error('❌ 사진 목록이 비어있음');
              return;
            }
            
            const selectedPhoto = photos[Math.floor(Math.random() * photos.length)];
            const comment = await getSelfieReplyFromYeji();
            
            await client.pushMessage(userId, {
              type: 'image',
              originalContentUrl: BASE_URL + selectedPhoto,
              previewImageUrl: BASE_URL + selectedPhoto
            });
            
            console.log(`📸 사진 전송 (${hour}:${minute}): ${selectedPhoto}`);
            
            if (comment && comment.trim()) {
              // 사진 전송 후 잠시 대기
              setTimeout(async () => {
                try {
                  await client.pushMessage(userId, { type: 'text', text: comment });
                  console.log(`💬 사진 코멘트 전송: ${comment}`);
                } catch (error) {
                  console.error('❌ 사진 코멘트 전송 실패:', error.message);
                }
              }, 2000);
            }
          } catch (error) {
            console.error('❌ 스케줄된 사진 전송 실패:', error.message);
          }
        });
        
        photoScheduleCount++;
        console.log(`📸 사진 스케줄 등록: ${hour}:${minute.toString().padStart(2, '0')}`);
      }
    }

    // 고정 스케줄
    cron.schedule('0 23 * * *', async () => {
      try {
        await client.pushMessage(userId, { type: 'text', text: '약 먹고 이빨 닦고 자자' });
        console.log('🌙 취침 알림 전송 (23:00)');
      } catch (error) {
        console.error('❌ 취침 알림 전송 실패:', error.message);
      }
    });
    
    cron.schedule('30 23 * * *', async () => {
      try {
        await client.pushMessage(userId, { type: 'text', text: '잘자 사랑해 아저씨, 또 내일 봐' });
        console.log('🌙 굿나잇 메시지 전송 (23:30)');
      } catch (error) {
        console.error('❌ 굿나잇 메시지 전송 실패:', error.message);
      }
    });

    console.log('✅ 모든 스케줄러 등록 완료');
  } catch (error) {
    console.error('❌ 스케줄러 초기화 실패:', error.message);
    schedulerInitialized = false; // 실패 시 재시도 가능하도록
  }
}

// 모듈 내보내기
module.exports = {
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
  getFullMemoryPrompt,
  getColorMoodReply,
  validateEnvironment,
  config
};
