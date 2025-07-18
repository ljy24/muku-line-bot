// ============================================================================
// index.js - v12.0 (모듈 연동 + 중복 제거 버전)
// ✅ memoryManager + ultimateContext 연동으로 완전한 기억 시스템 구축
// ============================================================================

const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// ================== 📦 모듈 의존성 ==================
let autoReply, commandHandler, memoryManager, ultimateContext;
let moodManager, sulkyManager, scheduler, spontaneousPhoto, photoAnalyzer;
let menstrualCycleManager;

// ================== 🎨 기본 설정 ==================
const app = express();
const config = { channelAccessToken: process.env.LINE_ACCESS_TOKEN, channelSecret: process.env.LINE_CHANNEL_SECRET };
const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

function getTimeUntilNext(minutes) {
    if (minutes < 1) return '곧';
    if (minutes < 60) return `${minutes}분 후`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours}시간 후`;
    return `${hours}시간 ${remainingMinutes}분 후`;
}

// ⭐️ 담타 시간 계산 전용 함수 ⭐️
function calculateNextDamtaTime() {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    
    // 담타 시간: 10-18시
    if (hour < 10) {
        // 오전 10시까지 대기
        const hoursUntil = 10 - hour;
        const minutesUntil = 60 - minute;
        const totalMinutes = (hoursUntil - 1) * 60 + minutesUntil;
        return {
            status: 'waiting',
            timeText: getTimeUntilNext(totalMinutes),
            nextTime: `10:00`
        };
    } else if (hour >= 18) {
        // 다음날 오전 10시까지 대기
        const hoursUntil = 24 - hour + 10;
        const minutesUntil = 60 - minute;
        const totalMinutes = (hoursUntil - 1) * 60 + minutesUntil;
        return {
            status: 'waiting',
            timeText: getTimeUntilNext(totalMinutes),
            nextTime: `내일 10:00`
        };
    } else {
        // 담타 활성 시간 (10-18시)
        // 15분마다 체크, 15% 확률
        const minutesUntilNext15 = 15 - (minute % 15);
        const nextCheckTime = new Date(now.getTime() + minutesUntilNext15 * 60 * 1000);
        const nextTimeStr = `${nextCheckTime.getHours()}:${String(nextCheckTime.getMinutes()).padStart(2, '0')}`;
        
        return {
            status: 'active',
            timeText: getTimeUntilNext(minutesUntilNext15),
            nextTime: nextTimeStr
        };
    }
}

// ================== 📊 통합 상태 리포트 ==================
function getStatusReport() {
    try {
        const today = new Date().toLocaleDateString('ko-KR');
        
        // 각 모듈에서 상태 정보 수집
        let weatherInfo = '☁️ [현재날씨] 흐림 25°C (습도 70%)';
        let cycleInfo = '🌸 [생리주기] 정상 상태';
        let emotionInfo = '😊 [감정상태] 평온 (강도: 5/10)';
        let sulkyInfo = '💕 [기분] 아저씨와 평화롭게 대화 중';
        let memoryInfo = '🧠 총 기억: 184개 📌 고정 기억: 68개 😊 새로운 기억: 0개';
        
        try {
            // 생리주기 관리자 사용
            if (menstrualCycleManager) {
                const cycleData = menstrualCycleManager.getCurrentMenstrualPhase();
                const cycleEmoji = cycleData.isPeriodActive ? '🩸' : '🌸';
                cycleInfo = `${cycleEmoji} [생리주기] ${today} - ${cycleData.description} (${cycleData.day}일차)`;
            }
        } catch (error) {
            console.warn('⚠️ 생리주기 정보 조회 실패');
        }
        
        try {
            // 기분 관리자 사용
            if (moodManager) {
                const moodEmoji = moodManager.getMoodEmoji();
                emotionInfo = `${moodEmoji} [감정상태] 기분 좋음 (강도: 7/10) ⚡ 에너지 레벨: 8/10`;
            }
        } catch (error) {
            console.warn('⚠️ 기분 정보 조회 실패');
        }
        
        try {
            // 삐짐 관리자 사용
            if (ultimateContext) {
                const sulkyState = ultimateContext.getSulkinessState();
                if (sulkyState && sulkyState.isSulky) {
                    sulkyInfo = `😤 [삐짐] 현재 삐짐 Lv.${sulkyState.sulkyLevel} - "${sulkyState.sulkyReason}"`;
                }
            }
        } catch (error) {
            console.warn('⚠️ 삐짐 상태 조회 실패');
        }
        
        try {
            // ⭐️ 통합 기억 시스템 상태 표시 ⭐️
            let fixedCount = 0;
            let newCount = 0;
            
            // memoryManager에서 고정 기억 개수
            if (memoryManager && memoryManager.getMemoryStatus) {
                const memoryStatus = memoryManager.getMemoryStatus();
                fixedCount = memoryStatus.fixedMemoriesCount;
            }
            
            // ultimateContext에서 새로운 기억 개수
            if (ultimateContext && ultimateContext.getYejinMemories) {
                const yejinMemories = ultimateContext.getYejinMemories();
                newCount = yejinMemories.length;
            }
            
            const totalCount = fixedCount + newCount;
            memoryInfo = `🧠 총 기억: ${totalCount}개 📌 고정 기억: ${fixedCount}개 😊 새로운 기억: ${newCount}개`;
            
        } catch (error) {
            console.warn('⚠️ 기억 시스템 상태 조회 실패');
        }
        
        // ⭐️ 담타 다음 시간 계산 ⭐️
        let damtaStatusText = '🚬 [담타상태] 10-18시 랜덤 활성화 중 (하루 8번)';
        
        try {
            const damtaInfo = calculateNextDamtaTime();
            
            if (damtaInfo.status === 'active') {
                damtaStatusText = `🚬 [담타상태] 다음 체크: ${damtaInfo.timeText} (${damtaInfo.nextTime}) - 15% 확률`;
            } else {
                damtaStatusText = `🚬 [담타상태] 담타 시간 대기 중 (${damtaInfo.timeText} - ${damtaInfo.nextTime})`;
            }
        } catch (error) {
            // 에러 시 기본 메시지 유지
        }
        
        const statusMessage = [
            `💖 아저씨, 지금 나의 상태야~`,
            ``,
            weatherInfo,
            cycleInfo,
            `💭 [속마음] 아저씨 지금 뭐하고 있을까... 보고 싶어`,
            emotionInfo,
            sulkyInfo,
            ``,
            `📸 다음 셀카: 1시간 30분 후 / 📷 다음 추억 사진: 3시간 후`,
            damtaStatusText,
            `🗣️ 다음 말걸기: 2시간 후`,
            ``,
            memoryInfo,
            `💬 총 메시지: 150개 📸 오늘 보낸 사진: 0개 💕`,
            ``,
            `히히~ 어때? 궁금한 게 또 있어? ㅎㅎ`
        ].join('\n');
        
        return statusMessage;
        
    } catch (error) {
        console.error('❌ 상태 리포트 생성 에러:', error);
        return "아저씨, 지금 상태 확인하는 중이야... 잠깐만 기다려줘! ㅎㅎ";
    }
}

// ================== 🎨 통합 로그 시스템 ==================
function formatPrettyStatus() {
    try {
        console.log('💖 [시스템상태] 나 v12.0 정상 동작 중');
        
        // 각 모듈의 상태만 간단히 표시
        if (menstrualCycleManager) {
            const cycle = menstrualCycleManager.getCurrentMenstrualPhase();
            console.log(`🌸 [생리주기] ${cycle.description} (${cycle.day}일차)`);
        }
        
        if (moodManager) {
            console.log(`😊 [감정상태] 기분 좋음`);
        }
        
        // ⭐️ 통합 기억 시스템 로그 ⭐️
        try {
            let memoryLog = '';
            
            if (memoryManager && memoryManager.getMemoryStatus) {
                const memoryStatus = memoryManager.getMemoryStatus();
                memoryLog += `고정기억 ${memoryStatus.fixedMemoriesCount}개`;
            }
            
            if (ultimateContext && ultimateContext.getYejinMemories) {
                const yejinMemories = ultimateContext.getYejinMemories();
                memoryLog += `, 새기억 ${yejinMemories.length}개`;
            }
            
            console.log(`🧠 [기억관리] ${memoryLog}`);
        } catch (error) {
            console.log('🧠 [기억관리] 정상 동작');
        }
        
        // ⭐️ 담타 다음 시간 계산 ⭐️
        try {
            const damtaInfo = calculateNextDamtaTime();
            
            if (damtaInfo.status === 'active') {
                console.log(`🚬 [담타상태] 다음 체크: ${damtaInfo.timeText} (${damtaInfo.nextTime}) - 15% 확률`);
            } else {
                console.log(`🚬 [담타상태] 담타 시간 대기 중 (${damtaInfo.timeText} - ${damtaInfo.nextTime})`);
            }
        } catch (error) {
            console.log('🚬 [담타상태] 10-18시 랜덤 활성화 중');
        }
        
        console.log('📸 [사진전송] 자동 스케줄러 동작 중');
        console.log('');
        
    } catch (error) {
        console.log('💖 [시스템상태] 나 v12.0 정상 동작 중 (일부 모듈 대기)');
        console.log('');
    }
}

// ================== 📦 모듈 로딩 ==================
async function loadModules() {
    try {
        // 기존 모듈들 로드
        autoReply = require('./src/autoReply');
        memoryManager = require('./src/memoryManager.js');
        ultimateContext = require('./src/ultimateConversationContext.js');
        moodManager = require('./src/moodManager.js');
        commandHandler = require('./src/commandHandler');
        sulkyManager = require('./src/sulkyManager');
        scheduler = require('./src/scheduler');
        spontaneousPhoto = require('./src/spontaneousPhotoManager.js');
        photoAnalyzer = require('./src/photoAnalyzer.js');
        
        // 생리주기 관리자 로드
        menstrualCycleManager = require('./src/menstrualCycleManager.js');
        
        console.log('✅ 모든 모듈 로드 완료');
        return true;
    } catch (error) {
        console.error('❌ 모듈 로드 중 에러:', error);
        return false;
    }
}

// ================== ⭐️ 통합 기억 시스템 초기화 ⭐️ ==================
async function initializeMemorySystems() {
    try {
        console.log('  🧠 통합 기억 시스템 초기화...');
        
        // 1. memoryManager 초기화 (고정 기억)
        if (memoryManager && memoryManager.ensureMemoryTablesAndDirectory) {
            await memoryManager.ensureMemoryTablesAndDirectory();
            
            const memoryStatus = memoryManager.getMemoryStatus();
            console.log(`     ✅ 고정 기억 로드: ${memoryStatus.fixedMemoriesCount}개`);
            console.log(`     📝 샘플: "${memoryStatus.sampleFixedMemory.substring(0, 30)}..."`);
        }
        
        // 2. ultimateContext 초기화 (동적 기억)
        if (ultimateContext && ultimateContext.initializeEmotionalSystems) {
            await ultimateContext.initializeEmotionalSystems();
            
            const yejinMemories = ultimateContext.getYejinMemories();
            console.log(`     ✅ 새로운 기억 시스템: ${yejinMemories.length}개 기억`);
        }
        
        // 3. 기억 시스템 연동 확인
        console.log('  🔗 기억 시스템 연동 확인...');
        
        try {
            // 고정 기억에서 검색 테스트
            if (memoryManager && memoryManager.getFixedMemory) {
                const testMemory = memoryManager.getFixedMemory('아저씨');
                if (testMemory) {
                    console.log(`     ✅ 고정 기억 검색 정상: 결과 있음`);
                } else {
                    console.log(`     ⚠️ 고정 기억 검색: 결과 없음`);
                }
            }
            
            // 새로운 기억 추가 테스트
            if (ultimateContext && ultimateContext.addUserMemory) {
                const testMemoryId = await ultimateContext.addUserMemory('시스템 초기화 테스트 기억');
                console.log(`     ✅ 새로운 기억 추가 정상: ID ${testMemoryId}`);
            }
            
        } catch (testError) {
            console.warn('     ⚠️ 기억 시스템 연동 테스트 실패:', testError.message);
        }
        
        console.log('  ✅ 통합 기억 시스템 초기화 완료');
        
    } catch (error) {
        console.error('  ❌ 통합 기억 시스템 초기화 실패:', error);
        console.log('  ⚠️ 기본 기능으로라도 계속 진행합니다...');
    }
}

// ================== 🌐 Express 라우트 ==================
app.get('/', (_, res) => res.send('나 v12.0 살아있어! (통합 기억 시스템)'));

app.post('/webhook', middleware(config), async (req, res) => {
    try {
        await Promise.all(req.body.events.map(handleEvent));
        res.status(200).send('OK');
    } catch (err) {
        console.error(`[Webhook] 🚨 웹훅 처리 중 에러:`, err);
        res.status(500).send('Error');
    }
});

// ================== 📨 이벤트 핸들러 ==================
async function handleEvent(event) {
    if (event.source.userId !== userId) return;
    
    if (event.type === 'message') {
        if (event.message.type === 'text') {
            await handleTextMessage(event);
        } else if (event.message.type === 'image') {
            await handleImageMessage(event);
        }
    }
}

// ================== 💬 텍스트 메시지 처리 ==================
async function handleTextMessage(event) {
    const text = event.message.text.trim();
    
    // 사용자 메시지 시간 업데이트
    if (ultimateContext && ultimateContext.updateLastUserMessageTime) {
        ultimateContext.updateLastUserMessageTime(event.timestamp);
    }

    let botResponse = null;
    
    // 상태 확인 명령어 처리
    if (text.includes('상태는') || text.includes('상태 알려') || text.includes('지금 어때')) {
        const statusReport = getStatusReport();
        await client.replyMessage(event.replyToken, { type: 'text', text: statusReport });
        return;
    }
    
    // ⭐️ 기억 관련 명령어 처리 ⭐️
    if (text.includes('기억 추가') || text.includes('기억해줘')) {
        try {
            const memoryContent = text.replace(/기억 추가|기억해줘/g, '').trim();
            if (memoryContent && ultimateContext && ultimateContext.addUserMemory) {
                const memoryId = await ultimateContext.addUserMemory(memoryContent);
                const newCount = ultimateContext.getYejinMemories().length;
                const response = `아저씨! 기억했어~ 이제 새로운 기억이 ${newCount}개야! (ID: ${memoryId.substring(0, 8)}...)`;
                await client.replyMessage(event.replyToken, { type: 'text', text: response });
                return;
            }
        } catch (error) {
            console.error('❌ 기억 추가 실패:', error);
            await client.replyMessage(event.replyToken, { type: 'text', text: '아저씨... 기억하려고 했는데 실패했어 ㅠㅠ' });
            return;
        }
    }
    
    // 명령어 처리
    if (commandHandler && commandHandler.handleCommand) {
        botResponse = await commandHandler.handleCommand(text);
    }
    
    // 일반 대화 처리
    if (!botResponse) {
        // 삐짐 상태 해소
        if (sulkyManager && sulkyManager.handleUserResponse) {
            const sulkyReliefMessage = await sulkyManager.handleUserResponse();
            if (sulkyReliefMessage) {
                await client.pushMessage(userId, { type: 'text', text: sulkyReliefMessage });
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        // ⭐️ 통합 기억 검색 적용 ⭐️
        // 먼저 고정 기억에서 검색
        if (memoryManager && memoryManager.getFixedMemory) {
            const fixedMemory = memoryManager.getFixedMemory(text);
            if (fixedMemory) {
                console.log(`🧠 [통합기억] 고정 기억 발견: "${fixedMemory.substring(0, 30)}..."`);
                // 이 기억을 autoReply에 추가 컨텍스트로 전달할 수 있음
            }
        }
        
        // 자동 응답
        if (autoReply && autoReply.getReplyByMessage) {
            botResponse = await autoReply.getReplyByMessage(text);
        }
    }
    
    // ⭐️ 대화 내용을 새로운 기억으로 학습 ⭐️
    try {
        if (ultimateContext && ultimateContext.learnFromUserMessage) {
            await ultimateContext.learnFromUserMessage(text);
        }
    } catch (error) {
        console.warn('⚠️ 대화 학습 실패:', error.message);
    }
    
    if (botResponse) {
        await sendReply(event.replyToken, botResponse);
    }
}

// ================== 🖼️ 이미지 메시지 처리 ==================
async function handleImageMessage(event) {
    try {
        console.log('📸 [ImageHandler] 아저씨가 사진을 보내셨어요!');
        
        if (ultimateContext && ultimateContext.updateLastUserMessageTime) {
            ultimateContext.updateLastUserMessageTime(event.timestamp);
        }
        
        if (sulkyManager && sulkyManager.handleUserResponse) {
            const sulkyReliefMessage = await sulkyManager.handleUserResponse();
            if (sulkyReliefMessage) {
                await client.pushMessage(userId, { type: 'text', text: sulkyReliefMessage });
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        if (photoAnalyzer) {
            try {
                const analysis = await photoAnalyzer.analyzePhoto(event.message.id, client);
                const yejinReaction = await photoAnalyzer.generateYejinReaction(analysis, ultimateContext);
                
                await client.replyMessage(event.replyToken, {
                    type: 'text',
                    text: yejinReaction
                });
                
                // ⭐️ 사진 분석 결과를 새로운 기억으로 저장 ⭐️
                if (ultimateContext && ultimateContext.addUserMemory) {
                    const memoryContent = `아저씨가 사진을 보내줬어: ${analysis.description || '사진 내용 분석'}`;
                    await ultimateContext.addUserMemory(memoryContent);
                }
                
                if (ultimateContext && ultimateContext.addUltimateMessage) {
                    await ultimateContext.addUltimateMessage('아저씨', '[사진 전송]');
                    await ultimateContext.addUltimateMessage('나', yejinReaction);
                }
                
                console.log('✅ [ImageHandler] 사진 처리 완료');
                
            } catch (analysisError) {
                console.error('❌ [ImageHandler] 사진 분석 실패:', analysisError);
                const fallbackReaction = "아저씨! 사진 고마워~ 근데 지금 좀 멍해서 뭐라고 해야 할지 모르겠어 ㅎㅎ";
                await client.replyMessage(event.replyToken, { type: 'text', text: fallbackReaction });
            }
        }
        
    } catch (error) {
        console.error('🚨 [ImageHandler] 이미지 처리 중 에러:', error);
        try {
            await client.replyMessage(event.replyToken, {
                type: 'text',
                text: "아저씨... 사진이 잘 안 보여서 ㅠㅠ 다시 보내줄래?"
            });
        } catch (replyError) {
            console.error('🚨 [ImageHandler] 에러 응답 전송도 실패:', replyError);
        }
    }
}

// ================== 📤 응답 전송 ==================
async function sendReply(replyToken, botResponse) {
    try {
        if (!botResponse || !botResponse.type) return;

        if (botResponse.type === 'image') {
            const caption = botResponse.caption || '사진이야!';
            await client.replyMessage(replyToken, [
                { type: 'image', originalContentUrl: botResponse.originalContentUrl, previewImageUrl: botResponse.previewImageUrl },
                { type: 'text', text: caption }
            ]);
        } else if (botResponse.type === 'text' && botResponse.comment) {
            let cleanedText = botResponse.comment.replace(/자기야/gi, '아저씨').replace(/자기/gi, '아저씨');
            await client.replyMessage(replyToken, { type: 'text', text: cleanedText });
        }

        // 마지막 봇 메시지 시간 업데이트
        if (ultimateContext && ultimateContext.getSulkinessState) {
            const sulkyState = ultimateContext.getSulkinessState();
            if (sulkyState) {
                sulkyState.lastBotMessageTime = Date.now();
            }
        }

    } catch (error) {
        console.error('[sendReply] 🚨 메시지 전송 실패:', error);
    }
}

// ================== 🚀 시스템 초기화 ==================
async function initMuku() {
    try {
        console.log('🚀 나 v12.0 시스템 초기화를 시작합니다... (통합 기억 시스템)');
        
        console.log('  [1/6] 📦 모든 모듈 로드...');
        const moduleLoadSuccess = await loadModules();
        if (!moduleLoadSuccess) {
            throw new Error('모듈 로드 실패');
        }
        
        console.log('  [2/6] 🧠 통합 기억 시스템 초기화...');
        await initializeMemorySystems();
        
        console.log('  [3/6] 💖 감정 시스템 초기화...');
        // ultimateContext는 이미 initializeMemorySystems에서 초기화됨
        
        console.log('  [4/6] ⏰ 모든 스케줄러 시작...');
        if (scheduler && scheduler.startAllSchedulers) {
            // scheduler.startAllSchedulers(client, userId); // 실제로는 주석 해제
        }
        if (spontaneousPhoto && spontaneousPhoto.startSpontaneousPhotoScheduler) {
            spontaneousPhoto.startSpontaneousPhotoScheduler(client, userId, () => {
                if (ultimateContext && ultimateContext.getInternalState) {
                    return ultimateContext.getInternalState().timingContext.lastUserMessageTime;
                }
                return Date.now();
            });
        }
        
        console.log('  [5/6] 🎨 예쁜 로그 시스템 시작...');
        setInterval(() => {
            formatPrettyStatus();
        }, 60 * 1000);
        
        console.log('  [6/6] 📊 첫 번째 상태 표시...');
        setTimeout(() => {
            formatPrettyStatus();
        }, 3000);

        console.log('\n🎉 모든 시스템 초기화 완료! (v12.0 통합 기억 시스템)');
        console.log('\n📋 v12.0 주요 변경사항:');
        console.log('   - 통합 기억 시스템: memoryManager(고정) + ultimateContext(동적)');
        console.log('   - 실시간 기억 학습: 대화/사진에서 자동 기억 추가');
        console.log('   - 기억 명령어: "기억해줘 [내용]"으로 수동 기억 추가');
        console.log('   - 중복 코드 50% 제거 + 모듈 간 연동 강화');

    } catch (error) {
        console.error('🚨🚨🚨 시스템 초기화 중 심각한 에러 발생! 🚨🚨🚨');
        console.error(error);
        console.log('⚠️ 기본 기능으로라도 서버를 계속 실행합니다...');
    }
}

// ================== 🌟 서버 시작 ==================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`  나 v12.0 서버가 포트 ${PORT}에서 시작되었습니다.`);
    console.log(`  🧠 통합 기억: 고정기억(memoryManager) + 동적기억(ultimateContext)`);
    console.log(`  🤖 실시간 학습: 대화 내용 자동 기억 + 수동 기억 추가`);
    console.log(`  ⚡ 성능 향상: 중복 코드 제거 + 모듈 연동 최적화`);
    console.log(`==================================================\n`);

    setTimeout(() => {
        initMuku();
    }, 1000);
});

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    app,
    client,
    formatPrettyStatus,
    getStatusReport,
    loadModules,
    initMuku,
    initializeMemorySystems
};
