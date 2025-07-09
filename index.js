// index.js - v1.9 (LINE Bot 400 에러 해결 및 안전한 메시지 전송)

const line = require('@line/bot-sdk');
const express = require('express');
const { 
    getReplyByMessage, 
    getReplyByImagePrompt, 
    checkModelSwitchCommand, 
    saveLog, 
    callOpenAI, 
    cleanReply  
} = require('./src/autoReply'); // autoReply 모듈 불러오기

const scheduler = require('./src/scheduler'); 
const { updateLastUserMessageTime } = scheduler; 

require('dotenv').config(); // .env 파일 로드

const config = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET,
};

const app = express();
const client = new line.Client(config);

// 이미지 URL 유효성 검증 함수 (옵션)
async function validateImageUrl(url) {
    try {
        // 간단한 URL 형식 체크
        if (!url || !url.startsWith('https://')) {
            return false;
        }
        // URL 길이 체크 (LINE API 제한)
        if (url.length > 1000) {
            return false;
        }
        return true;
    } catch (error) {
        console.error('URL 검증 실패:', error);
        return false;
    }
}

// 웹훅 이벤트 핸들러
app.post('/webhook', line.middleware(config), (req, res) => {
    Promise.all(req.body.events.map(handleEvent))
        .then((result) => res.json(result))
        .catch((err) => {
            console.error('[index.js] 웹훅 처리 에러:', err);
            res.status(500).end();
        });
});

// 이벤트 핸들 함수
async function handleEvent(event) {
    if (event.type !== 'message') {
        return Promise.resolve(null);
    }

    // 아저씨의 메시지 수신 시간 업데이트 (스케줄러에서 사용)
    updateLastUserMessageTime();

    if (event.message.type === 'text') {
        const userMessage = event.message.text; 
        console.log(`[Webhook] 아저씨 메시지 수신: "${userMessage}"`);
        saveLog({ role: 'user', content: userMessage, timestamp: Date.now() }); 

        let reply = null; 

        // 1. 모델 전환 명령어 확인 (가장 먼저 처리)
        const modelSwitchReply = checkModelSwitchCommand(userMessage);
        if (modelSwitchReply) {
            reply = { type: 'text', comment: modelSwitchReply };
        } else {
            // 모든 텍스트 메시지 처리는 getReplyByMessage로 위임
            reply = await getReplyByMessage(userMessage, saveLog, callOpenAI, cleanReply); 
        }

        // 안전한 메시지 전송
        if (reply) {
            try {
                if (reply.type === 'text') {
                    if (reply.comment) {
                        await client.replyMessage(event.replyToken, { 
                            type: 'text', 
                            text: reply.comment 
                        });
                        console.log('[index.js] 텍스트 메시지 전송 완료');
                    }
                } else if (reply.type === 'image') {
                    // URL 유효성 검사
                    const isValidUrl = await validateImageUrl(reply.originalContentUrl);
                    if (!isValidUrl) {
                        console.warn('[index.js] 유효하지 않은 이미지 URL:', reply.originalContentUrl);
                        await client.replyMessage(event.replyToken, {
                            type: 'text',
                            text: '아저씨... 사진을 준비하다가 문제가 생겼어 ㅠㅠ 다른 사진 보여줄까?'
                        });
                        return;
                    }

                    // 캡션 길이 제한 (LINE API 제한 고려)
                    let caption = reply.caption || reply.altText || '';
                    if (caption.length > 300) {
                        caption = caption.substring(0, 300) + '...';
                        console.log('[index.js] 캡션 길이 제한 적용:', caption.length);
                    }
                    
                    console.log('[index.js] 이미지 전송 시도:', reply.originalContentUrl);
                    
                    // 방법 1: 이미지와 텍스트 동시 전송 (원래 방식)
                    try {
                        const messages = [
                            { 
                                type: 'image', 
                                originalContentUrl: reply.originalContentUrl, 
                                previewImageUrl: reply.previewImageUrl || reply.originalContentUrl
                            }
                        ];
                        
                        // 캡션이 있으면 텍스트 메시지도 추가
                        if (caption && caption.trim().length > 0) {
                            messages.push({
                                type: 'text',
                                text: caption
                            });
                        }
                        
                        await client.replyMessage(event.replyToken, messages);
                        console.log('[index.js] 이미지+텍스트 메시지 전송 완료');
                        
                    } catch (imageError) {
                        console.error('[index.js] 이미지 전송 실패, 대체 방법 시도:', imageError);
                        
                        // 방법 2: 이미지만 전송
                        try {
                            await client.replyMessage(event.replyToken, {
                                type: 'image',
                                originalContentUrl: reply.originalContentUrl,
                                previewImageUrl: reply.previewImageUrl || reply.originalContentUrl
                            });
                            console.log('[index.js] 이미지만 전송 완료');
                            
                            // 캡션이 있으면 별도 푸시 메시지로 전송
                            if (caption && caption.trim().length > 0) {
                                setTimeout(async () => {
                                    try {
                                        await client.pushMessage(event.source.userId, {
                                            type: 'text',
                                            text: caption
                                        });
                                        console.log('[index.js] 캡션 푸시 메시지 전송 완료');
                                    } catch (pushError) {
                                        console.error('[index.js] 캡션 푸시 실패:', pushError);
                                    }
                                }, 1000);
                            }
                            
                        } catch (fallbackError) {
                            console.error('[index.js] 이미지 전송 완전 실패:', fallbackError);
                            throw fallbackError; // 상위 catch로 전달
                        }
                    }
                }
                return; 
                
            } catch (error) {
                console.error('[index.js] 메시지 전송 실패:', error);
                console.error('[index.js] 에러 상세:', {
                    message: error.message,
                    statusCode: error.statusCode,
                    originalError: error.originalError?.message
                });
                
                // 대체 메시지 전송
                try {
                    await client.replyMessage(event.replyToken, {
                        type: 'text',
                        text: '아저씨... 잠시 문제가 생겼어 ㅠㅠ 다시 한번 말해줄래?'
                    });
                    console.log('[index.js] 대체 메시지 전송 완료');
                } catch (fallbackError) {
                    console.error('[index.js] 대체 메시지도 실패:', fallbackError);
                }
                return;
            }
        }
        
        // 어떤 로직으로도 처리되지 않은 메시지 (Fallback)
        try {
            const fallbackMessage = "음... 아저씨, 무슨 말인지 잘 모르겠어 ㅠㅠ 다시 한번 말해줄래?";
            await client.replyMessage(event.replyToken, { type: 'text', text: fallbackMessage });
            saveLog({ role: 'assistant', content: fallbackMessage, timestamp: Date.now() });
            console.log('[index.js] Fallback 메시지 전송 완료');
        } catch (fallbackError) {
            console.error('[index.js] Fallback 메시지 전송 실패:', fallbackError);
        }

    } else if (event.message.type === 'image') {
        // 이미지 메시지 처리 (Line에서 이미지를 받으면 Base64로 인코딩하여 AI에 전달)
        try {
            const content = await client.getMessageContent(event.message.id);
            const buffer = [];
            content.on('data', (chunk) => buffer.push(chunk));
            content.on('end', async () => {
                try {
                    const base64Image = Buffer.concat(buffer).toString('base64');
                    const base64ImageWithPrefix = `data:image/jpeg;base64,${base64Image}`; 
                    const replyText = await getReplyByImagePrompt(base64ImageWithPrefix); 
                    
                    // 응답 텍스트 길이 제한
                    let finalReplyText = replyText;
                    if (typeof replyText === 'string' && replyText.length > 400) {
                        finalReplyText = replyText.substring(0, 400) + '...';
                    } else if (replyText && replyText.comment && replyText.comment.length > 400) {
                        finalReplyText = replyText.comment.substring(0, 400) + '...';
                    }
                    
                    await client.replyMessage(event.replyToken, { 
                        type: 'text', 
                        text: finalReplyText || '아저씨 사진 잘 봤어!' 
                    });
                    saveLog({ role: 'user', content: `[이미지 전송]`, timestamp: Date.now() }); 
                    saveLog({ role: 'assistant', content: finalReplyText, timestamp: Date.now() }); 
                    console.log('[index.js] 이미지 분석 응답 전송 완료');
                } catch (imageProcessError) {
                    console.error('[index.js] 이미지 처리 에러:', imageProcessError);
                    await client.replyMessage(event.replyToken, { 
                        type: 'text', 
                        text: '아저씨 사진 잘 봤어! 근데 뭔가 문제가 있었나 봐...' 
                    });
                }
            });
            content.on('error', (contentError) => {
                console.error('[index.js] 이미지 콘텐츠 읽기 에러:', contentError);
            });
        } catch (getContentError) {
            console.error('[index.js] 이미지 콘텐츠 가져오기 에러:', getContentError);
            try {
                await client.replyMessage(event.replyToken, { 
                    type: 'text', 
                    text: '아저씨... 사진을 받는 중에 문제가 생겼어 ㅠㅠ' 
                });
            } catch (replyError) {
                console.error('[index.js] 이미지 에러 응답 실패:', replyError);
            }
        }
        return;
    }

    // 기타 메시지 타입 (스티커, 동영상 등)은 무시
    return Promise.resolve(null);
}

// 서버 시작
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`무쿠 서버 스타트! 포트: ${port}`);
    const LINE_TARGET_USER_ID = process.env.LINE_TARGET_USER_ID;
    if (LINE_TARGET_USER_ID) {
        scheduler.startAllSchedulers(client, LINE_TARGET_USER_ID);
        console.log("✅ 모든 스케줄러 시작!");
    } else {
        console.warn("⚠️ LINE_TARGET_USER_ID 환경 변수가 설정되지 않아 스케줄러가 시작되지 않습니다.");
    }
});
