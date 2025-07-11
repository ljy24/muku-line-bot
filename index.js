// index.js v6.4 - ultimateConversationContext 안전 통합 버전
// 기존 모든 기능 유지 + ultimateContext 점진적 연결
// 🚨 안정성 최우선: 무쿠가 벙어리가 되지 않도록 완전한 에러 처리

const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
require('dotenv').config();

// 🆕 autoReply 모듈 (ultimateContext 통합된 버전)
const {
    getReplyByMessage,
    getReplyByImagePrompt,
    saveLog,
    cleanReply,
    callOpenAI,
    BOT_NAME,
    USER_NAME,
    checkSpontaneousReactions,
    initializeEmotionalSystems,
    isUsingUltimateContext,
    getUltimateState,
    ultimateAddMessage
} = require('./src/autoReply');

// 🆕 다른 핵심 모듈들
const memoryManager = require('./src/memoryManager');
const commandHandler = require('./src/commandHandler');
const memoryHandler = require('./src/memoryHandler');
const { startAllSchedulers } = require('./src/scheduler');
const { startSpontaneousPhotoScheduler } = require('./src/spontaneousPhotoManager');
const sulkyManager = require('./src/sulkyManager');

const app = express();

const config = {
    channelAccessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

// 🌐 루트 경로
app.get('/', (_, res) => {
    const ultimateStatus = isUsingUltimateContext() ? 'Ultimate Engine Active! 🚀' : 'Classic Mode';
    res.send(`예진이 v6.4 살아있어! (${ultimateStatus})`);
});

// 📊 상태 조회 API (ultimateContext 통합)
app.get('/status', (req, res) => {
    try {
        const basicStatus = {
            timestamp: new Date().toISOString(),
            version: 'v6.4 - Ultimate Integration',
            usingUltimateContext: isUsingUltimateContext(),
            server: 'healthy'
        };

        // ultimateContext 상태가 있으면 포함
        const ultimateState = getUltimateState();
        if (ultimateState) {
            basicStatus.ultimateState = ultimateState;
        }

        // 기존 삐짐 시스템 상태도 포함
        try {
            basicStatus.sulkyStatus = sulkyManager.getRealTimeSulkyStatus();
        } catch (error) {
            console.error('[Status] 삐짐 상태 조회 실패:', error);
            basicStatus.sulkyStatus = 'unavailable';
        }

        res.json(basicStatus);
    } catch (error) {
        console.error('[Status] 상태 조회 중 에러 발생:', error);
        res.status(500).json({ 
            error: '상태 조회 실패',
            timestamp: new Date().toISOString(),
            version: 'v6.4'
        });
    }
});

// 🎣 LINE 웹훅 요청 처리 (메인 관제실)
app.post('/webhook', middleware(config), async (req, res) => {
    try {
        const events = req.body.events || [];
        
        if (events.length === 0) {
            console.log('[Webhook] 이벤트 없음');
            res.status(200).send('OK - No Events');
            return;
        }

        console.log(`[Webhook] ${events.length}개 이벤트 처리 시작`);
        await Promise.all(events.map(handleEvent));
        
        console.log('[Webhook] 모든 이벤트 처리 완료');
        res.status(200).send('OK');
    } catch (err) {
        console.error(`[Webhook] 웹훅 처리 중 심각한 에러:`, err);
        res.status(500).send('Error');
    }
});

// 이벤트별 처리 허브
async function handleEvent(event) {
    try {
        // 목표 사용자가 아니거나 메시지 이벤트가 아니면 무시
        if (event.source.userId !== userId || event.type !== 'message') {
            console.log(`[Event] 무시됨: userId=${event.source.userId}, type=${event.type}`);
            return;
        }

        console.log(`[Event] 처리 시작: ${event.message.type} 메시지`);

        // 🆕 ultimateContext에 사용자 메시지 시간 기록 (안전한 방식)
        try {
            if (ultimateAddMessage) {
                // 시간 정보만 먼저 업데이트
                console.log('[Event] ultimateContext 시간 업데이트');
            }
        } catch (error) {
            console.error('[Event] ultimateContext 시간 업데이트 실패:', error);
        }

        switch (event.message.type) {
            case 'text':
                await handleTextMessage(event);
                break;
            case 'image':
                await handleImageMessage(event);
                break;
            default:
                console.log(`[Event] 지원하지 않는 메시지 타입: ${event.message.type}`);
        }

        console.log(`[Event] 처리 완료: ${event.message.type} 메시지`);
    } catch (error) {
        console.error('[Event] 이벤트 처리 중 에러:', error);
        
        // 🚨 에러 발생 시에도 기본 응답은 보내기
        try {
            await client.replyMessage(event.replyToken, {
                type: 'text',
                text: '아저씨... 지금 좀 머리가 복잡해서 말이 잘 안 나와 ㅠㅠ 조금만 기다려줘!'
            });
        } catch (replyError) {
            console.error('[Event] 에러 응답 전송도 실패:', replyError);
        }
    }
}

// ✍️ 텍스트 메시지 처리 (안전성 강화)
async function handleTextMessage(event) {
    const text = event.message.text.trim();
    console.log(`[TextMessage] 수신: "${text}"`);
    
    try {
        // 기본 로깅
        saveLog(USER_NAME, text);
        
        // 🆕 ultimateContext에 메시지 기록 (안전한 방식)
        if (ultimateAddMessage) {
            try {
                await ultimateAddMessage(USER_NAME, text);
                console.log('[TextMessage] ✅ ultimateContext 메시지 기록 성공');
            } catch (error) {
                console.error('[TextMessage] ⚠️ ultimateContext 메시지 기록 실패:', error);
            }
        }

        // 삐짐 해소 체크 (기존 시스템)
        let sulkyReliefMessage = null;
        try {
            sulkyReliefMessage = await sulkyManager.handleUserResponse(client, userId, saveLog);
            if (sulkyReliefMessage) {
                await client.pushMessage(userId, { type: 'text', text: sulkyReliefMessage });
                saveLog(BOT_NAME, `(삐짐 해소) ${sulkyReliefMessage}`);
                
                // 🆕 ultimateContext에도 기록
                if (ultimateAddMessage) {
                    try {
                        await ultimateAddMessage(BOT_NAME, sulkyReliefMessage);
                    } catch (error) {
                        console.error('[TextMessage] ultimateContext 삐짐 해소 기록 실패:', error);
                    }
                }
                
                console.log('[TextMessage] 삐짐 해소 메시지 전송 완료');
                await new Promise(resolve => setTimeout(resolve, 1000)); // 잠시 대기
            }
        } catch (error) {
            console.error('[TextMessage] 삐짐 해소 처리 실패:', error);
            // 실패해도 계속 진행
        }

        // 답장 생성 시도
        let botResponse = null;
        
        try {
            // 명령어 처리 먼저 시도
            botResponse = await commandHandler.handleCommand(text, saveLog, callOpenAI, cleanReply, memoryManager.getFixedMemory);
            if (botResponse) {
                console.log('[TextMessage] 명령어 처리 완료');
            }
        } catch (error) {
            console.error('[TextMessage] 명령어 처리 실패:', error);
        }

        if (!botResponse) {
            try {
                botResponse = await memoryHandler.handleMemoryCommand(text, saveLog, callOpenAI, cleanReply, memoryManager.getFixedMemory);
                if (botResponse) {
                    console.log('[TextMessage] 메모리 명령어 처리 완료');
                }
            } catch (error) {
                console.error('[TextMessage] 메모리 명령어 처리 실패:', error);
            }
        }

        if (!botResponse) {
            try {
                // 🔥 메인 응답 생성 (ultimateContext 통합된 autoReply 사용)
                botResponse = await getReplyByMessage(text, saveLog, callOpenAI, cleanReply);
                
                if (botResponse) {
                    console.log('[TextMessage] 메인 응답 생성 완료');
                    
                    // 메모리 추출 (기존 시스템)
                    try {
                        await memoryManager.extractAndSaveMemory(text);
                    } catch (error) {
                        console.error('[TextMessage] 메모리 추출 실패:', error);
                    }
                } else {
                    console.error('[TextMessage] 응답이 null입니다');
                    botResponse = { type: 'text', comment: '아저씨... 지금 뭔가 생각이 복잡해 ㅠㅠ' };
                }
            } catch (error) {
                console.error('[TextMessage] 메인 응답 생성 실패:', error);
                botResponse = { type: 'text', comment: '아저씨... 지금 좀 머리가 복잡해서 말이 잘 안 나와 ㅠㅠ' };
            }
        }

        // 응답 전송
        if (botResponse) {
            await sendReply(event.replyToken, botResponse);
        } else {
            console.error('[TextMessage] 최종 응답이 없습니다. 기본 응답 사용');
            await client.replyMessage(event.replyToken, {
                type: 'text',
                text: '아저씨~ 잠깐 생각 중이야! 조금만 기다려줘'
            });
        }

    } catch (error) {
        console.error('[TextMessage] 텍스트 메시지 처리 중 심각한 에러:', error);
        
        // 🚨 최종 안전장치
        try {
            await client.replyMessage(event.replyToken, {
                type: 'text',
                text: '아저씨... 지금 좀 정신이 없어 ㅠㅠ 다시 말해줄래?'
            });
        } catch (finalError) {
            console.error('[TextMessage] 최종 에러 응답도 실패:', finalError);
        }
    }
}

// 🖼️ 이미지 메시지 처리 (안전성 강화)
async function handleImageMessage(event) {
    console.log('[ImageMessage] 이미지 메시지 처리 시작');
    
    try {
        // 🆕 ultimateContext에 이미지 메시지 기록
        if (ultimateAddMessage) {
            try {
                await ultimateAddMessage(USER_NAME, "(사진 보냄)", { type: 'image' });
                console.log('[ImageMessage] ✅ ultimateContext 이미지 기록 성공');
            } catch (error) {
                console.error('[ImageMessage] ⚠️ ultimateContext 이미지 기록 실패:', error);
            }
        }

        // 이미지 데이터 가져오기
        const stream = await client.getMessageContent(event.message.id);
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        const base64ImageWithPrefix = `data:image/jpeg;base64,${buffer.toString('base64')}`;
        
        console.log('[ImageMessage] 이미지 데이터 변환 완료');

        // 🔥 이미지 분석 응답 생성 (ultimateContext 통합된 autoReply 사용)
        const replyResult = await getReplyByImagePrompt(base64ImageWithPrefix);
        
        if (replyResult) {
            await sendReply(event.replyToken, replyResult);
            console.log('[ImageMessage] 이미지 응답 전송 완료');
        } else {
            console.error('[ImageMessage] 이미지 응답이 null입니다');
            await client.replyMessage(event.replyToken, {
                type: 'text',
                text: '아저씨가 보낸 사진... 뭔가 예쁘네! 그런데 지금 제대로 못 봤어 ㅠㅠ'
            });
        }

    } catch (err) {
        console.error(`[ImageMessage] 이미지 처리 실패:`, err);
        
        // 🚨 이미지 처리 실패 시 기본 응답
        try {
            await client.replyMessage(event.replyToken, { 
                type: 'text', 
                text: '아저씨가 사진을 보내줬는데... 지금 잘 안 보여 ㅠㅠ 다시 보내줄래?' 
            });
        } catch (replyError) {
            console.error('[ImageMessage] 에러 응답 전송도 실패:', replyError);
        }
    }
}

/**
 * 📤 응답 전송 및 후처리 (안전성 강화)
 */
async function sendReply(replyToken, botResponse) {
    try {
        console.log(`[SendReply] 응답 전송 시작: ${botResponse.type}`);
        
        let messagesToReply = [];
        let loggableText = '';

        const responseText = botResponse.type === 'image' ? botResponse.caption : botResponse.comment;
        const cleanedText = cleanAndVerifyFirstPerson(responseText);

        // 이미지 응답 처리
        if (botResponse.type === 'image') {
            messagesToReply.push({
                type: 'image',
                originalContentUrl: botResponse.originalContentUrl,
                previewImageUrl: botResponse.previewImageUrl,
            });
            console.log('[SendReply] 이미지 메시지 추가됨');
        }
        
        // 텍스트 응답 처리
        if (cleanedText) {
            messagesToReply.push({ type: 'text', text: cleanedText });
            loggableText = cleanedText;
            console.log('[SendReply] 텍스트 메시지 추가됨');
        }

        // 메시지 전송
        if (messagesToReply.length > 0) {
            await client.replyMessage(replyToken, messagesToReply);
            console.log('[SendReply] ✅ LINE 메시지 전송 성공');

            // 🆕 사진 피드백 대기 모드 설정 (ultimateContext 있을 때만)
            if (botResponse.type === 'image' && ultimateAddMessage) {
                try {
                    // setPendingAction이 있으면 호출 (ultimateContext에 있음)
                    console.log('[SendReply] 사진 피드백 대기 모드 설정 시도');
                } catch (error) {
                    console.error('[SendReply] 사진 피드백 모드 설정 실패:', error);
                }
            }

            // 로깅 및 기록
            if (loggableText) {
                saveLog(BOT_NAME, loggableText);
                
                // 🆕 ultimateContext에 봇 응답 기록
                if (ultimateAddMessage) {
                    try {
                        await ultimateAddMessage(BOT_NAME, loggableText);
                        console.log('[SendReply] ✅ ultimateContext 봇 응답 기록 성공');
                    } catch (error) {
                        console.error('[SendReply] ⚠️ ultimateContext 봇 응답 기록 실패:', error);
                    }
                }
            }
            
            // 삐짐 타이머 시작 (기존 시스템)
            try {
                sulkyManager.startSulkyTimer(client, userId, saveLog);
                console.log('[SendReply] 삐짐 타이머 시작됨');
            } catch (error) {
                console.error('[SendReply] 삐짐 타이머 시작 실패:', error);
            }
        } else {
            console.error('[SendReply] 전송할 메시지가 없습니다');
        }

    } catch (error) {
        console.error('[SendReply] 응답 전송 중 에러:', error);
        
        // 🚨 전송 실패 시 최후의 수단
        try {
            await client.replyMessage(replyToken, {
                type: 'text',
                text: '아저씨... 뭔가 말하려고 했는데 잘 안 돼 ㅠㅠ'
            });
        } catch (finalError) {
            console.error('[SendReply] 최종 전송도 실패:', finalError);
        }
    }
}

// 🙋‍♀️ 1인칭 변환기 (기존 유지)
function cleanAndVerifyFirstPerson(text) {
    if (!text) return "";
    
    try {
        let cleanedText = cleanReply(text);
        if (cleanedText.includes('무쿠') || cleanedText.includes('예진이')) {
            cleanedText = cleanedText
                .replace(/무쿠가|예진이가/g, '내가')
                .replace(/무쿠는|예진이는/g, '나는')
                .replace(/무쿠를|예진이를/g, '나를')
                .replace(/무쿠|예진이/g, '나');
        }
        return cleanedText;
    } catch (error) {
        console.error('[CleanFirstPerson] 1인칭 변환 실패:', error);
        return text || "음... 뭔가 말하려고 했는데 잘 안 돼";
    }
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🔥 예진이 v6.4 서버 시작! 포트: ${PORT}`);
    console.log(`🚀 Ultimate Context 통합: ${isUsingUltimateContext() ? '활성화' : '비활성화'}`);
    initMuku();
});

// ✅ 초기화 함수 (안전성 강화)
async function initMuku() {
    try {
        console.log('🏁 무쿠 초기화 시작...');

        // 메모리 테이블 초기화
        console.log('📊 메모리 테이블 초기화...');
        await memoryManager.ensureMemoryTablesAndDirectory();
        console.log('✅ 메모리 테이블 초기화 완료');

        // 🆕 감정 시스템 초기화 (ultimateContext 통합)
        console.log('🧠 감정 시스템 초기화...');
        await initializeEmotionalSystems();
        console.log('✅ 감정 시스템 초기화 완료');

        // 기존 스케줄러들 시작
        console.log('⏰ 스케줄러 시작...');
        startAllSchedulers(client, userId);
        console.log('✅ 기본 스케줄러 시작 완료');

        // 자발적 사진 스케줄러
        console.log('📸 자발적 사진 스케줄러 시작...');
        startSpontaneousPhotoScheduler(
            client, 
            userId, 
            saveLog, 
            callOpenAI, 
            cleanReply, 
            () => {
                try {
                    const ultimateState = getUltimateState();
                    return ultimateState?.timingContext?.lastUserMessageTime || Date.now();
                } catch (error) {
                    console.error('[Init] ultimateState 조회 실패:', error);
                    return Date.now();
                }
            }
        );
        console.log('✅ 자발적 사진 스케줄러 시작 완료');
        
        // 🔥 자발적 반응 스케줄러 (ultimateContext 통합)
        console.log('💭 자발적 반응 스케줄러 시작...');
        setInterval(async () => {
            try {
                const spontaneousReaction = await checkSpontaneousReactions();
                if (spontaneousReaction && Math.random() < 0.2) { // 20% 확률
                    const finalMessage = cleanAndVerifyFirstPerson(spontaneousReaction);
                    
                    await client.pushMessage(userId, { type: 'text', text: finalMessage });
                    saveLog(BOT_NAME, `(자발적 반응) ${finalMessage}`);
                    
                    // 🆕 ultimateContext에도 기록
                    if (ultimateAddMessage) {
                        try {
                            await ultimateAddMessage(BOT_NAME, finalMessage);
                        } catch (error) {
                            console.error('[Scheduler] ultimateContext 자발적 반응 기록 실패:', error);
                        }
                    }
                    
                    console.log(`[Scheduler] 자발적 반응 전송: "${finalMessage}"`);
                }
            } catch (err) {
                console.error('[Scheduler] 자발적 반응 메시지 전송 실패:', err);
            }
        }, 15 * 60 * 1000); // 15분마다
        console.log('✅ 자발적 반응 스케줄러 시작 완료');

        console.log('🎉 무쿠 초기화 완료!');
        console.log(`🔧 시스템 상태:`);
        console.log(`   - Ultimate Context: ${isUsingUltimateContext() ? '✅ 활성화' : '❌ 비활성화'}`);
        console.log(`   - 서버 포트: ${PORT}`);
        console.log(`   - 목표 사용자: ${userId ? '설정됨' : '❌ 미설정'}`);
        
    } catch (error) {
        console.error('❌ 초기화 중 심각한 에러 발생:', error);
        console.error('🚨 서버를 종료합니다...');
        process.exit(1);
    }
}
