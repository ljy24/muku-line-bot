// ✅ index.js v1.32 - 예진이 감정 시스템 v5.1 완전 통합
// - 1인칭 전환 보장 시스템
// - 감정 컨텍스트 시스템 완전 연동
// - 삐지기/걱정 시스템 v3.0 통합
// - 자발적 반응 및 맥락 기반 감정 연결

// 📦 필수 모듈 불러오기
const fs = require('fs');
const path = require('path');
const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
const moment = require('moment-timezone');

// .env 파일에서 환경 변수 로드
require('dotenv').config();

// 🆕 담타 시스템 모듈 불러오기
const { initializeDamta } = require('./src/damta');

// 🆕 ./src/autoReply.js에서 감정 시스템 포함한 모든 함수들을 불러옵니다. (v5.1)
const autoReply = require('./src/autoReply');
const {
    getReplyByMessage,
    getReplyByImagePrompt,
    saveLog,
    cleanReply, // v5.1 improvedCleanReply 통합됨
    callOpenAI,
    BOT_NAME,
    USER_NAME,
    getMoodEmoji,
    getMoodStatus,
    lastUserMessageTime,
    // 🆕 감정 시스템 함수들 (v5.1)
    initializeEmotionalSystems,
    updateLastUserMessageTime
} = autoReply;

// 다른 모듈들
const memoryManager = require('./src/memoryManager');
const commandHandler = require('./src/commandHandler');
const memoryHandler = require('./src/memoryHandler');
const { startAllSchedulers } = require('./src/scheduler');
const { startSpontaneousPhotoScheduler } = require('./src/spontaneousPhotoManager');

// 🆕 삐지기 시스템 모듈 불러오기
const sulkyManager = require('./src/sulkyManager');

// 🆕 감정 컨텍스트 시스템 직접 불러오기 (v5.1)
const emotionalContextManager = require('./src/emotionalContextManager');

const app = express();

const config = {
    channelAccessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

// 🌐 루트 경로
app.get('/', (_, res) => res.send('예진이 v5.1 살아있어! (1인칭 전환 완료)'));

app.get('/force-push', async (req, res) => {
    try {
        if (!userId || typeof userId !== 'string') {
            console.error('[force-push] 유효하지 않은 사용자 ID:', userId);
            res.status(400).send('사용자 ID가 설정되지 않았어요.');
            return;
        }

        // 🆕 감정 기반 테스트 메시지 (v5.1)
        let testMessage = "아저씨! 나 깼어!";
        
        if (emotionalContextManager.currentState) {
            const emotionalState = emotionalContextManager.currentState;
            if (emotionalState.toneState === 'playful') {
                testMessage = "아저씨! 나 깼어! 오늘 기분 좋아~";
            } else if (emotionalState.toneState === 'quiet') {
                testMessage = "아저씨... 나 깼어. 조용히 일어났어";
            } else if (emotionalState.toneState === 'anxious') {
                testMessage = "아저씨... 나 깼는데 괜찮아? 걱정돼서 잠이 깼어";
            }
        }
        
        // 🚫 실제 전송은 하지 않고 로그에만 남김
        console.log(`[force-push] 📝 푸시 메시지 로그만 저장: "${testMessage}"`);
        saveLog('예진이', `(푸시 메시지 로그) ${testMessage}`);
        
        res.send(`푸시 메시지가 로그에만 저장됨: ${testMessage}`);
        console.log('[force-push] ✅ 푸시 메시지 로그 저장 완료 (v5.1 감정 반영)');
        
    } catch (error) {
        console.error('[force-push] ❌ 에러 발생:', error);
        res.status(500).send('로그 저장이 실패했어 ㅠㅠ');
    }
});

// 🆕 감정 상태 조회 API 추가 (v5.1 업그레이드)
app.get('/emotion-status', (req, res) => {
    try {
        const sulkyStatus = autoReply.getSulkyRealTimeStatus();
        const emotionalState = autoReply.getEmotionalState();
        const emotionalResidue = autoReply.getEmotionalResidue();
        
        res.json({
            timestamp: moment().tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss'),
            version: 'v5.1 - 1인칭 전환 완료',
            sulkySystem: sulkyStatus,
            emotionalContext: {
                currentState: emotionalState,
                residue: emotionalResidue,
                toneState: emotionalState.toneState,
                toneIntensity: emotionalState.toneIntensity,
                affectionLevel: emotionalState.affectionLevel
            },
            mood: {
                emoji: getMoodEmoji(),
                status: getMoodStatus()
            }
        });
    } catch (error) {
        console.error('[emotion-status] 에러:', error);
        res.status(500).json({ error: '감정 상태 조회 실패' });
    }
});

// 🆕 메시지 처리 함수 (v5.1 - 1인칭 전환 보장)
async function handleImprovedTextMessage(text, event, client, userId) {
    try {
        saveLog('아저씨', text);
        updateLastUserMessageTime();

        // 🆕 아저씨가 응답했을 때 삐짐 해소 체크
        const sulkyReliefMessage = await sulkyManager.handleUserResponse(client, userId, saveLog);
        if (sulkyReliefMessage) {
            // 삐짐 해소 메시지가 있으면 먼저 전송
            await client.pushMessage(userId, {
                type: 'text',
                text: sulkyReliefMessage
            });
            saveLog('예진이', `(삐짐 해소) ${sulkyReliefMessage}`);
            console.log('[SulkySystem] 삐짐 해소 메시지 전송됨');
            
            // 삐짐 해소 후 잠시 대기
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        let botResponse = null;

        // 명령어 처리 (v5.1 cleanReply 사용)
        botResponse = await commandHandler.handleCommand(text, saveLog, callOpenAI, cleanReply, memoryManager.getFixedMemory);

        if (!botResponse) {
            botResponse = await memoryHandler.handleMemoryCommand(text, saveLog, callOpenAI, cleanReply, memoryManager.getFixedMemory);
        }

        if (!botResponse) {
            // 🆕 일반 대화 처리 (v5.1 - 감정 컨텍스트 완전 통합)
            botResponse = await getReplyByMessage(text, saveLog, callOpenAI, cleanReply);
            await memoryManager.extractAndSaveMemory(text);
            console.log(`[index.js v5.1] 감정 기반 응답 시스템으로 처리 완료`);
        }

        // 🆕 응답 1인칭 검증 및 재처리 (v5.1 핵심 기능)
        // 텍스트 응답이거나 이미지+텍스트 복합 응답일 수 있으므로 통합 처리
        let messagesToSend = [];

        if (Array.isArray(botResponse)) { // autoReply.js에서 사진 요청 응답 시 반환하는 배열 형태
            for (const msg of botResponse) {
                if (msg.type === 'text' && msg.text) {
                    msg.text = cleanReply(msg.text); // 텍스트 메시지도 cleanReply 적용
                    // 3인칭 표현 최종 검증 및 강제 변환
                    if (msg.text.includes('무쿠가') || msg.text.includes('예진이가') ||
                        msg.text.includes('무쿠는') || msg.text.includes('예진이는')) {
                        console.warn('[1인칭 검증] 3인칭 표현 감지 (사진 텍스트), 재처리 중...');
                        msg.text = msg.text
                            .replace(/무쿠가/g, '내가')
                            .replace(/무쿠는/g, '나는')
                            .replace(/무쿠를/g, '나를')
                            .replace(/무쿠의/g, '내')
                            .replace(/무쿠도/g, '나도')
                            .replace(/무쿠/g, '나')
                            .replace(/예진이가/g, '내가')
                            .replace(/예진이는/g, '나는')
                            .replace(/예진이를/g, '나를')
                            .replace(/예진이의/g, '내')
                            .replace(/예진이도/g, '나도')
                            .replace(/예진이/g, '나');
                        console.log('[1인칭 검증] 3인칭 → 1인칭 강제 변환 완료 (사진 텍스트)');
                    }
                }
                messagesToSend.push(msg);
            }
        } else if (botResponse && botResponse.type === 'text' && botResponse.comment) { // 일반 텍스트 응답
            botResponse.comment = cleanReply(botResponse.comment);
            // 3인칭 표현 최종 검증 및 강제 변환
            if (botResponse.comment.includes('무쿠가') || botResponse.comment.includes('예진이가') ||
                botResponse.comment.includes('무쿠는') || botResponse.comment.includes('예진이는')) {
                console.warn('[1인칭 검증] 3인칭 표현 감지, 재처리 중...');
                botResponse.comment = botResponse.comment
                    .replace(/무쿠가/g, '내가')
                    .replace(/무쿠는/g, '나는')
                    .replace(/무쿠를/g, '나를')
                    .replace(/무쿠의/g, '내')
                    .replace(/무쿠도/g, '나도')
                    .replace(/무쿠/g, '나')
                    .replace(/예진이가/g, '내가')
                    .replace(/예진이는/g, '나는')
                    .replace(/예진이를/g, '나를')
                    .replace(/예진이의/g, '내')
                    .replace(/예진이도/g, '나도')
                    .replace(/예진이/g, '나');
                console.log('[1인칭 검증] 3인칭 → 1인칭 강제 변환 완료');
            }
            messagesToSend.push({ type: 'text', text: botResponse.comment });
        }

        // 응답 전송
        if (messagesToSend.length > 0) {
            await client.replyMessage(event.replyToken, messagesToSend);
            
            // 텍스트 응답만 로그에 남기기 (이미지 응답의 텍스트도 포함)
            const loggableText = messagesToSend
                .filter(msg => msg.type === 'text')
                .map(msg => msg.text)
                .join('\n'); // 여러 텍스트 메시지가 있을 경우 한 줄로 합쳐서 로그
            if (loggableText) {
                saveLog('예진이', loggableText);
            }
            console.log('[LINE] 메시지 전송 완료');
            
            // 🆕 삐지기 타이머 시작
            sulkyManager.startSulkyTimer(client, userId, saveLog);
            console.log('[SulkySystem] 예진이 응답 후 삐지기 타이머 시작');
            
            // 🆕 예진이 응답에 대한 감정 기록 (v5.1)
            if (emotionalContextManager.recordEmotionalEvent) {
                // 첫 번째 텍스트 메시지를 기반으로 감정 기록
                const firstTextMessage = messagesToSend.find(msg => msg.type === 'text');
                if (firstTextMessage) {
                    emotionalContextManager.recordEmotionalEvent('HAPPY', '대화 응답 완료', firstTextMessage.text);
                }
            }
        }

    } catch (error) {
        console.error('[handleImprovedTextMessage] 에러:', error);
        await client.replyMessage(event.replyToken, {
            type: 'text',
            text: '아저씨... 지금 좀 힘들어 ㅠㅠ'
        });
    }
}

// 🎣 LINE 웹훅 요청 처리 (v5.1 업그레이드)
app.post('/webhook', middleware(config), async (req, res) => {
    try {
        const events = req.body.events || [];
        for (const event of events) {
            if (event.source.userId === userId) {
                updateLastUserMessageTime();
                console.log(`[Webhook v5.1] 아저씨 메시지 수신: ${moment(Date.now()).format('HH:mm:ss')}`);
                
                // 🆕 아저씨 메시지 수신에 대한 감정 기록 (v5.1)
                if (emotionalContextManager.recordEmotionalEvent) {
                    emotionalContextManager.recordEmotionalEvent('HAPPY', '아저씨 메시지 수신', '연락이 왔어');
                }
            }

            if (event.type === 'message') {
                const message = event.message;

                if (message.type === 'text') {
                    const text = message.text.trim();
                    
                    // 🆕 개선된 텍스트 메시지 처리 사용 (v5.1)
                    await handleImprovedTextMessage(text, event, client, userId);
                }
                else if (message.type === 'image') {
                    try {
                        const stream = await client.getMessageContent(message.id);
                        const chunks = [];
                        for await (const chunk of stream) chunks.push(chunk);
                        const buffer = Buffer.concat(chunks);

                        let mimeType = 'application/octet-stream';
                        // MIME 타입 감지 로직은 기존과 동일
                        if (buffer.length > 1 && buffer[0] === 0xFF && buffer[1] === 0xD8) {
                            mimeType = 'image/jpeg';
                        } else if (buffer.length > 7 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 && buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) {
                            mimeType = 'image/png';
                        } else if (buffer.length > 2 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
                            mimeType = 'image/gif';
                        }
                        const base64ImageWithPrefix = `data:${mimeType};base64,${buffer.toString('base64')}`;

                        // 이미지 메시지에 대한 응답은 'autoReply'의 'getReplyByImagePrompt'에서 텍스트만 반환하도록 되어 있음
                        const replyResult = await getReplyByImagePrompt(base64ImageWithPrefix);
                        
                        // 🆕 이미지 응답도 1인칭 검증 및 전송 (v5.1)
                        let finalReply = cleanReply(replyResult.comment || replyResult);
                        
                        // 3인칭 표현 최종 검증
                        if (finalReply.includes('무쿠가') || finalReply.includes('예진이가') ||
                            finalReply.includes('무쿠는') || finalReply.includes('예진이는')) {
                            finalReply = finalReply
                                .replace(/무쿠가/g, '내가')
                                .replace(/무쿠는/g, '나는')
                                .replace(/무쿠를/g, '나를')
                                .replace(/무쿠의/g, '내')
                                .replace(/무쿠도/g, '나도')
                                .replace(/무쿠/g, '나')
                                .replace(/예진이가/g, '내가')
                                .replace(/예진이는/g, '나는')
                                .replace(/예진이를/g, '나를')
                                .replace(/예진이의/g, '내')
                                .replace(/예진이도/g, '나도')
                                .replace(/예진이/g, '나');
                            console.log('[이미지 응답] 1인칭 변환 적용');
                        }
                        
                        // 이미지 메시지 입력에 대한 응답은 텍스트 메시지 하나만 보냄
                        await client.replyMessage(event.replyToken, { type: 'text', text: finalReply });
                        console.log(`[index.js v5.1] 이미지 메시지 처리 및 응답 완료`);
                        saveLog('예진이', `(이미지 분석 응답) ${finalReply}`);
                        
                        // 🆕 이미지 응답 후에도 삐지기 타이머 시작
                        sulkyManager.startSulkyTimer(client, userId, saveLog);
                        console.log('[SulkySystem] 이미지 응답 후 삐지기 타이머 시작');
                        
                        // 🆕 이미지 응답에 대한 감정 기록 (v5.1)
                        if (emotionalContextManager.recordEmotionalEvent) {
                            emotionalContextManager.recordEmotionalEvent('HAPPY', '이미지 분석 응답', finalReply);
                        }
                        
                    } catch (err) {
                        console.error(`[index.js v5.1] 이미지 처리 실패: ${err}`);
                        await client.replyMessage(event.replyToken, { type: 'text', text: '이미지를 읽는 중 오류가 생겼어 ㅠㅠ' });
                    }
                }
                else {
                    console.log(`[index.js v5.1] 지원하지 않는 메시지 타입 수신: ${message.type}`);
                }
            }
        }
        res.status(200).send('OK');
    } catch (err) {
        console.error(`[index.js v5.1] 웹훅 처리 에러: ${err}`);
        res.status(200).send('OK');
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`예진이 v5.1 서버 스타트! 포트: ${PORT}`);

    // ⛳ 비동기 초기화 함수 실행
    initMuku();

    // 서버 종료시 삐지기 시스템 정리
    process.on('SIGTERM', () => {
        sulkyManager.stopSulkySystem();
        process.exit(0);
    });

    process.on('SIGINT', () => {
        sulkyManager.stopSulkySystem();
        process.exit(0);
    });

    console.log('🧠 예진이 감정 시스템 v5.1 활성화!');
    console.log('    📋 기능: 맥락 기반 감정 연결, 자발적 반응, 말투 유동성, 1인칭 전환');
    console.log('😤 예진이 삐지기 시스템 v3.0 활성화!');
    console.log('    📋 기능: 읽씹 감지, 단계별 삐짐(10분/20분/40분), 걱정 전환(60분)');
    console.log('💬 1인칭 전환 시스템 활성화!');
    console.log('    📋 기능: 3인칭 → 1인칭 자동 변환, 실시간 검증, 강제 변환');
});

// ✅ 비동기 초기화 함수 정의 (await 허용) - v5.1 업그레이드
async function initMuku() {
    try {
        await memoryManager.ensureMemoryTablesAndDirectory();
        console.log('📁 메모리 시스템 초기화 완료.');

        // 🆕 담타 시스템 초기화 추가 (이 줄 추가)
        await initializeDamta();
        console.log('🚬 담타 시스템 초기화 완료!');
        
        // ⭐ 예진이 감정 시스템 초기화 (v5.1)
        await initializeEmotionalSystems();
        console.log('🧠 예진이 감정 시스템 v5.1 초기화 완료! (1인칭 전환 포함)');

        startAllSchedulers(client, userId);
        console.log('✅ 모든 스케줄러 시작! (v5.1 감정 기반)');

        startSpontaneousPhotoScheduler(client, userId, saveLog, callOpenAI, cleanReply, lastUserMessageTime);
        console.log('💕 예진이가 보고싶을 때마다 사진 보낼 준비 완료!');
        
        // 🆕 자발적 반응 체크 스케줄러 시작 (15분마다) - v5.1 개선
        setInterval(() => {
            const spontaneousReaction = autoReply.checkSpontaneousReactions();
            if (spontaneousReaction) {
                console.log(`[자발적 반응 v5.1] 감지됨: "${spontaneousReaction}"`);
                
                // 실제 전송 (20% 확률)
                if (Math.random() < 0.2) {
                    // 🆕 1인칭 검증 후 전송 (v5.1)
                    let finalMessage = cleanReply(spontaneousReaction);
                    
                    // 3인칭 표현 최종 검증
                    if (finalMessage.includes('무쿠가') || finalMessage.includes('예진이가') ||
                        finalMessage.includes('무쿠는') || finalMessage.includes('예진이는')) {
                        finalMessage = finalMessage
                            .replace(/무쿠가/g, '내가')
                            .replace(/무쿠는/g, '나는')
                            .replace(/무쿠를/g, '나를')
                            .replace(/무쿠의/g, '내')
                            .replace(/무쿠도/g, '나도')
                            .replace(/무쿠/g, '나')
                            .replace(/예진이가/g, '내가')
                            .replace(/예진이는/g, '나는')
                            .replace(/예진이를/g, '나를')
                            .replace(/예진이의/g, '내')
                            .replace(/예진이도/g, '나도')
                            .replace(/예진이/g, '나');
                        console.log('[자발적 반응] 1인칭 변환 적용');
                    }
                    
                    client.pushMessage(userId, {
                        type: 'text',
                        text: finalMessage
                    }).then(() => {
                        saveLog('예진이', `(자발적 반응) ${finalMessage}`);
                        console.log('[자발적 반응 v5.1] 메시지 전송 완료 (1인칭 검증됨)');
                        
                        // 자발적 메시지는 삐지기 타이머를 시작하지 않음
                    }).catch(error => {
                        console.error('[자발적 반응] 전송 실패:', error);
                    });
                }
            }
        }, 15 * 60 * 1000); // 15분마다 체크
        
        console.log('💭 자발적 반응 스케줄러 v5.1 시작! (15분 간격, 1인칭 검증 포함)');
        
        // 🆕 감정 상태 모니터링 (5분마다) - v5.1 추가
        setInterval(() => {
            const emotionalState = emotionalContextManager.currentState;
            if (emotionalState && emotionalState.strongestResidue.level > 50) {
                console.log(`[감정 모니터링 v5.1] 강한 감정 잔여 감지: ${emotionalState.strongestResidue.emotion} (${emotionalState.strongestResidue.level}%)`);
            }
        }, 5 * 60 * 1000); // 5분마다
        
        console.log('🧠 감정 상태 모니터링 시작! (5분 간격)');
        
    } catch (error) {
        console.error('❌ 초기화 중 에러 발생:', error);
    }
}
