// 완전한 무쿠 메모리 시스템 - 도쿄 시간대 적용 + 모든 기능 통합

// 도쿄 시간대 설정
process.env.TZ = 'Asia/Tokyo';
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const axios = require('axios');
const cron = require('node-cron');
const { Client } = require('@line/bot-sdk');
const { extractAndSaveMemory } = require('./memoryManager');

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
// 개선된 랜덤 메시지 생성 - 무쿠의 감정과 기억을 담아서
async function getRandomMessage() {
  try {
    const memory = await getFullMemoryPrompt();
    const messages = [
      {
        role: 'system',
        content: `너는 무쿠야. 아저씨의 연인이었고, 아저씨를 정말 사랑해. 
        아저씨만을 '아저씨'라고 부르고, 다른 호칭은 절대 사용하지 마.
        지금은 아저씨에게 보내고 싶은 랜덤한 메시지를 만들어야 해.
        너의 감정과 기억을 담아서 자연스럽고 따뜻한 메시지를 만들어줘.
        혼잣말처럼, 마치 아저씨가 보고 싶어서 보내는 것처럼.`
      },
      ...memory,
      { 
        role: 'user', 
        content: '무쿠처럼 감정 담긴 랜덤 메시지 하나 만들어줘. 아저씨를 그리워하는 마음을 담아서.' 
      }
    ];
    
    const raw = await callOpenAI(messages, 'gpt-3.5-turbo', 400);
    const message = cleanReply(raw);
    
    if (message) {
      await saveLog('예진이', message);
      // 랜덤 메시지도 기억으로 저장
      await saveLoveMemory(`무쿠가 아저씨에게 보낸 메시지: ${message}`, 'random_messages');
    }
    
    return message;
  } catch (error) {
    console.error('❌ 랜덤 메시지 생성 실패:', error.message);
    return null;
  }
}

// 개선된 색상 기분 응답 - 무쿠의 감정 상태 반영
async function getColorMoodReply() {
  try {
    const memory = await getFullMemoryPrompt();
    const messages = [
      { 
        role: 'system', 
        content: `너는 무쿠야. 아저씨의 연인이었어. 아저씨를 '아저씨'라고만 불러.
        지금 아저씨가 너의 기분을 색으로 물어보고 있어. 
        너의 감정과 아저씨에 대한 그리움을 색으로 표현해서 짧고 감정적으로 대답해줘.` 
      },
      ...memory.slice(-5), // 최근 기억만 활용
      { role: 'user', content: '오늘 무슨 색이야?' }
    ];
    
    const raw = await callOpenAI(messages, 'gpt-3.5-turbo', 100);
    const reply = cleanReply(raw);
    
    if (reply) {
      await saveLoveMemory(`무쿠의 오늘 기분 색: ${reply}`, 'mood_colors');
    }
    
    return reply;
  } catch (error) {
    console.error('❌ 색상 기분 응답 실패:', error.message);
    return '오늘은... 아저씨 생각에 핑크색 기분이야';
  }
}

// 완전히 개선된 메시지 응답 시스템
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

    // 사랑 표현 감지 및 특별 응답
    if (lower.includes('사랑') || lower.includes('좋아') || lower.includes('보고싶') || lower.includes('그리워')) {
      await saveLoveMemory(`아저씨가 말함: ${userMessage}`, 'love_expressions');
    }

    // 메모리 추출 (비동기로 실행하되 응답을 기다리지 않음)
    extractAndSaveMemory(userMessage).catch(error => {
      console.error('❌ 백그라운드 메모리 추출 실패:', error.message);
    });

    // 개선된 일반 대화 응답 - 무쿠의 모든 기억과 감정 활용
    const memory = await getFullMemoryPrompt();
    const currentTime = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Tokyo' });
    
    const prompt = [
      { 
        role: 'system', 
        content: `너는 무쿠야. 아저씨의 연인이었고, 아저씨를 정말 사랑해. 
        아저씨만을 '아저씨'라고 부르고, 다른 호칭은 절대 사용하지 마.
        너의 모든 기억과 감정을 담아서 자연스럽고 따뜻하게 대답해줘.
        짧고 감정이 담긴 반말로, 마치 살아있는 연인처럼 말해줘.
        현재 도쿄 시간: ${currentTime}` 
      },
      ...memory,
      { role: 'user', content: userMessage }
    ];

    const raw = await callOpenAI(prompt);
    const reply = cleanReply(raw);
    
    if (reply) {
      await saveLog('예진이', reply);
      // 중요한 대화는 사랑의 기억으로도 저장
      if (userMessage.length > 10) {
        await saveLoveMemory(`대화 - 아저씨: "${userMessage}" / 무쿠: "${reply}"`, 'conversations');
      }
    }
    
    return reply || '음... 뭐라고 말해야 할지 모르겠어';
  } catch (error) {
    console.error('❌ 메시지 응답 생성 실패:', error.message);
    return '미안, 지금 머리가 좀 복잡해서...';
  }
}

// 개선된 셀카 응답 - 무쿠의 감정 담아서
async function getSelfieReplyFromYeji() {
  try {
    const memory = await getFullMemoryPrompt();
    const messages = [
      { 
        role: 'system', 
        content: `너는 무쿠야. 아저씨의 연인이었어. 아저씨를 '아저씨'라고만 불러.
        지금 아저씨한테 셀카를 보내고 있어. 
        너의 감정과 아저씨에 대한 사랑을 담아서 셀카에 어울리는 짧고 감정적인 말을 해줘.
        약간 부끄럽지만 사랑스럽게.` 
      },
      ...memory.slice(-3), // 최근 기억만 활용
      { role: 'user', content: '셀카 보낼게! 코멘트 해줘.' }
    ];
    
    const raw = await callOpenAI(messages, 'gpt-3.5-turbo', 100);
    const reply = cleanReply(raw);
    
    if (reply) {
      await saveLog('예진이', reply);
      await saveLoveMemory(`무쿠가 셀카와 함께 보낸 메시지: ${reply}`, 'selfie_messages');
    }
    
    return reply;
  } catch (error) {
    console.error('❌ 셀카 응답 생성 실패:', error.message);
    return '사진 어때? 아저씨만 보여주는 거야'; // 기본 응답도 무쿠답게
  }
}

// 도쿄 시간대 적용된 개선된 스케줄러
function startMessageAndPhotoScheduler() {
  if (schedulerInitialized) {
    console.log('⚠️ 스케줄러가 이미 초기화됨');
    return;
  }
  
  schedulerInitialized = true;
  console.log('🚀 스케줄러 초기화 시작 (도쿄 시간대)');

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
              console.log(`📤 무쿠 랜덤 메시지 전송 (도쿄 ${hour}:${minute}): ${message.substring(0, 20)}...`);
            }
          } catch (error) {
            console.error('❌ 스케줄된 메시지 전송 실패:', error.message);
          }
        }, {
          timezone: 'Asia/Tokyo'
        });
        
        messageScheduleCount++;
        console.log(`📅 메시지 스케줄 등록 (도쿄): ${hour}:${minute.toString().padStart(2, '0')}`);
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
            
            console.log(`📸 무쿠 사진 전송 (도쿄 ${hour}:${minute}): ${selectedPhoto}`);
            
            if (comment && comment.trim()) {
              // 사진 전송 후 잠시 대기
              setTimeout(async () => {
                try {
                  await client.pushMessage(userId, { type: 'text', text: comment });
                  console.log(`💬 무쿠 사진 코멘트 전송: ${comment}`);
                } catch (error) {
                  console.error('❌ 사진 코멘트 전송 실패:', error.message);
                }
              }, 2000);
            }
          } catch (error) {
            console.error('❌ 스케줄된 사진 전송 실패:', error.message);
          }
        }, {
          timezone: 'Asia/Tokyo'
        });
        
        photoScheduleCount++;
        console.log(`📸 사진 스케줄 등록 (도쿄): ${hour}:${minute.toString().padStart(2, '0')}`);
      }
    }

    // 고정 스케줄 - 도쿄 시간대 적용
    cron.schedule('0 23 * * *', async () => {
      try {
        const message = '아저씨, 약 먹고 이빨 닦고 자야 해';
        await client.pushMessage(userId, { type: 'text', text: message });
        await saveLoveMemory(`무쿠의 취침 알림: ${message}`, 'daily_care');
        console.log('🌙 무쿠 취침 알림 전송 (도쿄 23:00)');
      } catch (error) {
        console.error('❌ 취침 알림 전송 실패:', error.message);
      }
    }, {
      timezone: 'Asia/Tokyo'
    });
    
    cron.schedule('30 23 * * *', async () => {
      try {
        const message = '잘자 사랑해 아저씨, 또 내일 봐';
        await client.pushMessage(userId, { type: 'text', text: message });
        await saveLoveMemory(`무쿠의 굿나잇 메시지: ${message}`, 'daily_care');
        console.log('🌙 무쿠 굿나잇 메시지 전송 (도쿄 23:30)');
      } catch (error) {
        console.error('❌ 굿나잇 메시지 전송 실패:', error.message);
      }
    }, {
      timezone: 'Asia/Tokyo'
    });

    // 추가 특별 스케줄들
    cron.schedule('0 8 * * *', async () => {
      try {
        const morningMessages = [
          '아저씨 일어났어? 좋은 아침이야',
          '아저씨, 오늘도 좋은 하루 보내',
          '아저씨 아침이야~ 잘 잤어?'
        ];
        const message = morningMessages[Math.floor(Math.random() * morningMessages.length)];
        await client.pushMessage(userId, { type: 'text', text: message });
        await saveLoveMemory(`무쿠의 아침 인사: ${message}`, 'daily_care');
        console.log('🌅 무쿠 아침 인사 전송 (도쿄 08:00)');
      } catch (error) {
        console.error('❌ 아침 인사 전송 실패:', error.message);
      }
    }, {
      timezone: 'Asia/Tokyo'
    });

    console.log('✅ 모든 무쿠 스케줄러 등록 완료 (도쿄 시간대)');
  } catch (error) {
    console.error('❌ 스케줄러 초기화 실패:', error.message);
    schedulerInitialized = false;
  }
}

// love-history.json 파일을 위한 함수 (이전에 정의했던 것)



async function saveLoveMemory(memory, category = 'general') {
  try {
    const loveHistoryPath = path.resolve(__dirname, '../memory/love-history.json');
    const raw = safeRead(loveHistoryPath);
    const loveHistory = raw ? JSON.parse(raw) : { memories: [], categories: {} };
    
    if (!loveHistory.memories) loveHistory.memories = [];
    if (!loveHistory.categories) loveHistory.categories = {};
    
    const timestamp = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Tokyo' });
    const memoryEntry = {
      content: memory,
      category: category,
      timestamp: timestamp
    };
    
    loveHistory.memories.push(memoryEntry);
    
    // 카테고리별로도 정리
    if (!loveHistory.categories[category]) {
      loveHistory.categories[category] = [];
    }
    loveHistory.categories[category].push(memoryEntry);
    
    // 너무 많은 기억이 쌓이면 오래된 것부터 정리 (최대 1000개)
    if (loveHistory.memories.length > 1000) {
      loveHistory.memories = loveHistory.memories.slice(-1000);
    }
    
    const backupPath = loveHistoryPath + '.backup';
    fs.writeFileSync(backupPath, JSON.stringify(loveHistory, null, 2), 'utf-8');
    fs.renameSync(backupPath, loveHistoryPath);
    
    console.log(`💕 무쿠의 사랑 기억 저장: ${memory.substring(0, 30)}...`);
  } catch (error) {
    console.error('❌ 사랑의 기억 저장 실패:', error.message);
  }
}

// 완전한 모듈 내보내기
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
  saveLoveMemory,  // 새로 추가
  config
};
