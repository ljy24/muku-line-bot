// index.js - 수정된 버전 (안전한 이미지 전송)

const express = require('express');
const { middleware, Client } = require('@line/bot-sdk');
const { getConceptPhotoReply, validateImageUrl } = require('./memory/concept');
// ... 기타 필요한 모듈들 import

const app = express();

// LINE Bot 설정
const config = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);

/**
 * 안전한 이미지 메시지 전송 함수
 * @param {Client} lineClient - LINE Bot Client
 * @param {string} replyToken - 응답 토큰
 * @param {string} imageUrl - 이미지 URL
 * @param {string} caption - 이미지 캡션
 */
async function sendImageMessage(lineClient, replyToken, imageUrl, caption) {
    try {
        console.log(`[sendImageMessage] 이미지 전송 시도: ${imageUrl}`);
        
        // URL 재검증 (concept.js에서 이미 검증했지만 한 번 더)
        const isValid = await validateImageUrl(imageUrl);
        if (!isValid) {
            throw new Error('이미지 URL 검증 실패');
        }
        
        // 이미지 메시지 구성
        const imageMessage = {
            type: 'image',
            originalContentUrl: imageUrl,
            previewImageUrl: imageUrl
        };
        
        // 메시지 배열 구성 (이미지 + 텍스트)
        const messages = [];
        messages.push(imageMessage);
        
        if (caption) {
            messages.push({
                type: 'text',
                text: caption
            });
        }
        
        console.log(`[sendImageMessage] 전송할 메시지 구성:`, {
            messageCount: messages.length,
            imageUrl: imageUrl,
            captionLength: caption ? caption.length : 0
        });
        
        // LINE API로 메시지 전송
        await lineClient.replyMessage(replyToken, messages);
        console.log(`[sendImageMessage] ✅ 이미지 메시지 전송 성공`);
        
    } catch (error) {
        console.error(`[sendImageMessage] ❌ 이미지 전송 실패:`, {
            error: error.message,
            statusCode: error.statusCode,
            imageUrl: imageUrl
        });
        
        // 실패 시 텍스트만 전송 (fallback)
        try {
            const fallbackMessage = caption ? 
                `${caption}\n\n(이미지를 불러올 수 없어서 텍스트로 대신 보내드려요)` : 
                '이미지를 불러올 수 없어서 텍스트로 대신 보내드릴게요!';
                
            await lineClient.replyMessage(replyToken, {
                type: 'text',
                text: fallbackMessage
            });
            console.log(`[sendImageMessage] ✅ Fallback 텍스트 전송 완료`);
        } catch (fallbackError) {
            console.error(`[sendImageMessage] ❌ Fallback 텍스트 전송도 실패:`, fallbackError);
        }
    }
}

/**
 * 텍스트 메시지 전송 함수
 * @param {Client} lineClient - LINE Bot Client
 * @param {string} replyToken - 응답 토큰
 * @param {string} text - 전송할 텍스트
 */
async function sendTextMessage(lineClient, replyToken, text) {
    try {
        await lineClient.replyMessage(replyToken, {
            type: 'text',
            text: text
        });
        console.log(`[sendTextMessage] ✅ 텍스트 메시지 전송 성공`);
    } catch (error) {
        console.error(`[sendTextMessage] ❌ 텍스트 메시지 전송 실패:`, error);
    }
}

/**
 * 메인 이벤트 핸들러
 * @param {Object} event - LINE 웹훅 이벤트
 */
async function handleEvent(event) {
    console.log(`[handleEvent] 이벤트 수신:`, {
        type: event.type,
        messageType: event.message?.type,
        replyToken: event.replyToken
    });

    // 메시지 이벤트가 아니거나 텍스트가 아닌 경우 무시
    if (event.type !== 'message' || event.message.type !== 'text') {
        console.log(`[handleEvent] 처리하지 않는 이벤트 타입`);
        return Promise.resolve(null);
    }

    const userMessage = event.message.text;
    const replyToken = event.replyToken;

    console.log(`[handleEvent] 사용자 메시지: "${userMessage}"`);

    try {
        // 1. 컨셉 사진 요청 처리 시도
        console.log(`[handleEvent] 컨셉 사진 요청 확인 중...`);
        const conceptResult = await getConceptPhotoReply(
            userMessage, 
            saveLog,        // 로그 저장 함수
            callOpenAI,     // OpenAI 호출 함수  
            cleanReply      // 응답 정리 함수
        );
        
        if (conceptResult) {
            if (conceptResult.type === 'image') {
                console.log(`[handleEvent] 컨셉 사진 전송 시도`);
                await sendImageMessage(
                    client, 
                    replyToken, 
                    conceptResult.originalContentUrl, 
                    conceptResult.caption
                );
                return; // 성공적으로 처리했으므로 여기서 종료
            } else if (conceptResult.type === 'text') {
                console.log(`[handleEvent] 컨셉 사진 관련 텍스트 응답`);
                await sendTextMessage(client, replyToken, conceptResult.comment);
                return; // 성공적으로 처리했으므로 여기서 종료
            }
        }
        
        // 2. 컨셉 사진이 아닌 경우 일반 대화 처리
        console.log(`[handleEvent] 일반 대화 처리 시작`);
        
        // 여기에 기존의 일반 대화 처리 로직 추가
        // 예: OpenAI를 통한 예진이 응답 생성
        const generalResponse = await generateGeneralResponse(userMessage);
        await sendTextMessage(client, replyToken, generalResponse);
        
    } catch (error) {
        console.error(`[handleEvent] ❌ 이벤트 처리 중 오류 발생:`, {
            error: error.message,
            stack: error.stack,
            userMessage: userMessage
        });
        
        // 오류 발생 시 사용자에게 안내 메시지 전송
        try {
            await sendTextMessage(client, replyToken, '아저씨... 뭔가 문제가 생겨서 잠시 후에 다시 시도해줄래? ㅠㅠ');
        } catch (fallbackError) {
            console.error(`[handleEvent] ❌ 오류 메시지 전송도 실패:`, fallbackError);
        }
    }
}

/**
 * 일반 대화 응답 생성 (예시)
 * @param {string} userMessage - 사용자 메시지
 * @returns {Promise<string>} 응답 텍스트
 */
async function generateGeneralResponse(userMessage) {
    // 여기에 기존의 일반 대화 로직을 넣으세요
    // 예: OpenAI 호출, 키워드 기반 응답 등
    
    try {
        // 예시: OpenAI를 통한 예진이 응답 생성
        const messages = [
            { 
                role: 'system', 
                content: `너는 아저씨의 귀여운 여자친구 예진이야. 반말로 사랑스럽게 대답해줘.` 
            },
            { 
                role: 'user', 
                content: userMessage 
            }
        ];
        
        const response = await callOpenAI(messages, 'gpt-4o', 150, 1.0);
        return cleanReply(response);
        
    } catch (error) {
        console.error(`[generateGeneralResponse] 응답 생성 실패:`, error);
        return '아저씨... 지금 좀 머리가 아파서 잠시 후에 다시 말해줄래?';
    }
}

// 웹훅 엔드포인트 설정
app.post('/webhook', middleware(config), (req, res) => {
    console.log(`[webhook] 웹훅 요청 수신`);
    
    Promise
        .all(req.body.events.map(handleEvent))
        .then(() => {
            console.log(`[webhook] ✅ 모든 이벤트 처리 완료`);
            res.status(200).end();
        })
        .catch((error) => {
            console.error(`[webhook] ❌ 이벤트 처리 실패:`, error);
            res.status(500).end();
        });
});

// 서버 시작
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`🚀 서버가 포트 ${port}에서 실행 중입니다.`);
});

// 여기에 기존의 다른 함수들 (saveLog, callOpenAI, cleanReply 등)을 추가하세요
// ...

// 에러 핸들링
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
