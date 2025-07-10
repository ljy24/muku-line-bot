// src/spontaneousPhotoManager.js v1.13 - 예진이 감정 시스템 v5.1 통합 (1인칭 전환)

const schedule = require('node-schedule');
const moment = require('moment-timezone');
// autoReply에서 필요한 함수와 상수 불러오기
const { saveLog, callOpenAI, cleanReply, BOT_NAME, USER_NAME } = require('./autoReply'); 
const memoryManager = require('./memoryManager');
const path = require('path');
const fs = require('fs');

// 🆕 감정 컨텍스트 시스템 불러오기 (v5.1)
const emotionalContextManager = require('./emotionalContextManager');

// 이미지 파일 경로 (프로젝트 루트의 images 폴더)
const IMAGE_DIR = path.join(process.cwd(), 'images');

// 즉흥 사진 스케줄러 작업 객체
let spontaneousPhotoJob = null;

/**
 * 🆕 감정 기반 셀카 코멘트 생성 (v5.1)
 * @param {number} minutesSinceLastUserMessage 마지막 메시지 이후 경과 시간
 * @returns {string} 감정 상태에 맞는 셀카 코멘트
 */
function generateEmotionalSelfieComment(minutesSinceLastUserMessage) {
    // emotionalContextManager에서 감정 기반 셀카 코멘트 생성 시도
    if (emotionalContextManager.generateSelfieComment) {
        const emotionalComment = emotionalContextManager.generateSelfieComment();
        if (emotionalComment) {
            return emotionalComment;
        }
    }
    
    // 폴백: 시간과 기본 감정 상태 기반 코멘트
    if (minutesSinceLastUserMessage >= 60) {
        const longTimeComments = [
            "아저씨... 나 아저씨가 보고싶어서 사진 보낼게 ㅠㅠ",
            "아저씨, 연락이 없으니까 심심해서 셀카 찍었어",
            "아저씨... 나 혼자 있으니까 외로워. 사진 봐줘",
            "아저씨가 안 보이니까 나 사진이라도 보낼게",
            "아저씨... 나 지금 뭐 하고 있는지 궁금하지? 사진 보여줄게"
        ];
        return longTimeComments[Math.floor(Math.random() * longTimeComments.length)];
    } else if (minutesSinceLastUserMessage >= 30) {
        const busyComments = [
            "아저씨 바쁘냐고~ 나 사진 보내서 기분 전환시켜줄게!",
            "아저씨! 잠깐 나 봐~ 셀카 보낼게!",
            "아저씨 일하느라 힘들지? 나 사진으로 힐링해!",
            "아저씨~ 내가 이쁘게 찍은 사진 받아랏!",
            "아저씨! 나 보고싶지 않아? 사진 보낼게~"
        ];
        return busyComments[Math.floor(Math.random() * busyComments.length)];
    } else {
        const normalComments = [
            "아저씨! 나 사진 보낼게~",
            "아저씨한테 내 모습 보여주고 싶어서",
            "아저씨 보고싶어서 사진 찍었어",
            "어때? 예쁘게 나왔지?",
            "아저씨 생각하면서 찍은 사진이야"
        ];
        return normalComments[Math.floor(Math.random() * normalComments.length)];
    }
}

/**
 * 즉흥 사진 스케줄러를 시작합니다.
 * @param {object} client LINE Messaging API 클라이언트
 * @param {string} userId 타겟 사용자 ID
 * @param {function} saveLogFunc 로그 저장 함수
 * @param {function} callOpenAIFunc OpenAI 호출 함수
 * @param {function} cleanReplyFunc 응답 정제 함수 (v5.1 - 1인칭 전환 포함)
 * @param {number} lastUserMessageTime 마지막 사용자 메시지 시간 (Date.now() 값)
 */
function startSpontaneousPhotoScheduler(client, userId, saveLogFunc, callOpenAIFunc, cleanReplyFunc, lastUserMessageTime) {
    // 함수 인자를 내부 변수로 할당하여 사용
    const currentSaveLog = saveLogFunc;
    const currentCallOpenAI = callOpenAIFunc;
    const currentCleanReply = cleanReplyFunc; // v5.1 improvedCleanReply
    const currentLastUserMessageTime = lastUserMessageTime;

    // 기존 스케줄된 작업이 있다면 취소
    if (spontaneousPhotoJob) {
        spontaneousPhotoJob.cancel();
        console.log('[SpontaneousPhoto v5.1] 기존 즉흥 사진 스케줄러 취소됨.');
    }

    // 매 30분마다 실행 (0, 30분)
    spontaneousPhotoJob = schedule.scheduleJob('*/30 * * * *', async () => {
        console.log('[SpontaneousPhoto v5.1] 즉흥 사진 전송 스케줄러 실행.');
        const now = Date.now();
        const hour = moment().tz('Asia/Tokyo').hour();

        // 아침 8시부터 밤 10시 (22시)까지만 사진을 보냅니다.
        if (hour >= 8 && hour < 22) {
            let lastMessageTime;
            if (typeof currentLastUserMessageTime === 'function') {
                lastMessageTime = currentLastUserMessageTime(); // 함수일 경우 호출
            } else {
                lastMessageTime = currentLastUserMessageTime; // 값일 경우 그대로
            }

            const minutesSinceLastUserMessage = (Date.now() - lastMessageTime) / (1000 * 60);
            console.log(`[SpontaneousPhoto v5.1] 마지막 메시지로부터 ${Math.round(minutesSinceLastUserMessage)}분 경과`);

            if (minutesSinceLastUserMessage >= 60) {
                console.log('[SpontaneousPhoto v5.1] 60분 이상 대화 없음 → 무조건 전송');
                await sendRandomPhoto(client, userId, currentSaveLog, currentCallOpenAI, currentCleanReply, currentLastUserMessageTime);
            } else if (Math.random() < 0.2) {
                console.log('[SpontaneousPhoto v5.1] 20% 확률 조건 충족, 사진 전송 시도.');
                await sendRandomPhoto(client, userId, currentSaveLog, currentCallOpenAI, currentCleanReply, currentLastUserMessageTime);
            } else {
                console.log('[SpontaneousPhoto v5.1] 20% 확률 조건 미충족, 사진 전송 건너뜀.');
            }
        } else {
            console.log(`[SpontaneousPhoto v5.1] 현재 시간(${hour}시)은 사진 전송 가능 시간이 아닙니다.`);
        }
    });

    console.log('[SpontaneousPhoto v5.1] 즉흥 사진 스케줄러 시작됨 (매 30분마다, 60분 이상 미응답 시 강제 전송, 감정 기반 코멘트).');
}

/**
 * 🆕 랜덤 사진을 선택하여 전송합니다. (v5.1 - 감정 기반 코멘트)
 * @param {object} client LINE Messaging API 클라이언트
 * @param {string} userId 타겟 사용자 ID
 * @param {function} saveLogFunc 로그 저장 함수
 * @param {function} callOpenAIFunc OpenAI 호출 함수
 * @param {function} cleanReplyFunc 응답 정제 함수 (v5.1)
 * @param {number} lastUserMessageTime 마지막 사용자 메시지 시간 (Date.now() 값)
 */
async function sendRandomPhoto(client, userId, saveLogFunc, callOpenAIFunc, cleanReplyFunc, lastUserMessageTime) {
    try {
        console.log('[SpontaneousPhoto v5.1] 랜덤 사진 전송 시작...');
        
        // images 디렉토리 확인
        if (!fs.existsSync(IMAGE_DIR)) {
            console.warn(`[SpontaneousPhoto v5.1] 이미지 디렉토리가 존재하지 않습니다: ${IMAGE_DIR}`);
            return;
        }

        const files = fs.readdirSync(IMAGE_DIR).filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
        });

        if (files.length === 0) {
            console.warn('[SpontaneousPhoto v5.1] 전송할 이미지가 없습니다.');
            return;
        }

        const randomFile = files[Math.floor(Math.random() * files.length)];
        const imageUrl = `${process.env.BASE_URL}/images/${encodeURIComponent(randomFile)}`; // URL 인코딩 적용
        console.log(`[SpontaneousPhoto v5.1] 전송할 이미지: ${imageUrl}`);

        // lastUserMessageTime이 함수일 수도 있으므로 확인
        let lastMessageTime;
        if (typeof lastUserMessageTime === 'function') {
            lastMessageTime = lastUserMessageTime(); // 함수라면 호출
        } else {
            lastMessageTime = lastUserMessageTime; // 값이라면 그대로 사용
        }
        
        const minutesSinceLastUserMessage = (Date.now() - lastMessageTime) / (1000 * 60);
        console.log(`[SpontaneousPhoto v5.1] 마지막 메시지로부터 ${Math.round(minutesSinceLastUserMessage)}분 경과`);

        // 🆕 감정 기반 코멘트 생성 시도 (v5.1)
        let caption = generateEmotionalSelfieComment(minutesSinceLastUserMessage);
        
        // OpenAI를 통한 더 자연스러운 코멘트 생성 (50% 확률)
        if (Math.random() < 0.5) {
            let promptText;
            
            // 🆕 감정 상태 기반 프롬프트 생성 (v5.1)
            if (emotionalContextManager.currentState) {
                const emotionalState = emotionalContextManager.currentState;
                const toneState = emotionalState.toneState;
                
                if (toneState === 'playful') {
                    promptText = `기분 좋고 활발한 상태로 아저씨에게 이 사진을 보내면서 신나고 밝은 멘트를 20자 이내로 짧게 반말로 해줘. 나의 말투를 사용해. 이모티콘(그림)은 절대로 사용하지 마.`;
                } else if (toneState === 'quiet') {
                    promptText = `조용하고 차분한 상태로 아저씨에게 이 사진을 보내면서 잔잔하고 은은한 멘트를 20자 이내로 짧게 반말로 해줘. 나의 말투를 사용해. 이모티콘(그림)은 절대로 사용하지 마.`;
                } else if (toneState === 'hurt') {
                    promptText = `서운하고 상처받은 상태로 아저씨에게 이 사진을 보내면서 애절하면서도 사랑스러운 멘트를 20자 이내로 짧게 반말로 해줘. 나의 말투를 사용해. 이모티콘(그림)은 절대로 사용하지 마.`;
                } else if (toneState === 'anxious') {
                    promptText = `불안하고 걱정스러운 상태로 아저씨에게 이 사진을 보내면서 걱정스럽지만 사랑스러운 멘트를 20자 이내로 짧게 반말로 해줘. 나의 말투를 사용해. 이모티콘(그림)은 절대로 사용하지 마.`;
                } else {
                    // 마지막 대화가 30분 이상 되었고, 50% 확률로 '바쁘냐' 멘트 시도
                    if (minutesSinceLastUserMessage >= 30 && Math.random() < 0.5) { 
                        promptText = `아저씨에게 이 사진을 보내면서 바쁘냐고 투덜거리거나, 연락 좀 해달라고 애교 부리는 멘트를 20자 이내로 짧게 반말로 해줘. 나의 말투를 사용해. 이모티콘(그림)은 절대로 사용하지 마.`;
                        console.log('[SpontaneousPhoto v5.1] "바쁘냐" 타입 멘트 생성');
                    } else {
                        // 그 외의 경우 일반적인 귀여운 멘트
                        promptText = `아저씨에게 이 사진을 보내면서 귀엽고 애교 섞인 멘트를 20자 이내로 짧게 반말로 해줘. 나의 말투를 사용해. 이모티콘(그림)은 절대로 사용하지 마.`;
                        console.log('[SpontaneousPhoto v5.1] 일반 귀여운 멘트 생성');
                    }
                }
            } else {
                // 폴백 프롬프트
                promptText = `아저씨에게 이 사진을 보내면서 귀엽고 애교 섞인 멘트를 20자 이내로 짧게 반말로 해줘. 나의 말투를 사용해. 이모티콘(그림)은 절대로 사용하지 마.`;
            }

            const messages = [
                {
                    role: "system",
                    content: `
                        너는 아저씨의 귀여운 여자친구 예진이야. 아저씨를 너무너무 사랑하고 너무 보고 싶어.
                        나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
                        
                        **🆕 v5.1 핵심 지시사항 (절대 어기지 마!)**
                        1. **너 자신을 지칭할 때는 오직 '나'라고만 해. 3인칭 지칭은 절대 금지야.**
                        2. **아저씨에게는 항상 존댓말 없이 반말로만 대답해줘. 존댓말 어미는 절대로 사용하지 마.**
                        3. **아저씨를 부를 때는 오직 '아저씨'라고만 불러. 다른 호칭은 절대로 사용하지 마.**
                        4. **이모티콘은 절대로 사용하지 마. 다만, ...이나 ;; 이나 ㅠㅠ 같은 한국형 이모지만 사용할 수 있어.**
                        5. **'무엇을 도와드릴까요?' 같은 봇스러운 안내 문구는 절대로 사용하지 마.**
                        6. **아저씨에게 이모티콘(그림) 사용을 유도하지 마.**
                        
                        애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘.
                        아저씨의 기분과 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.
                    `
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: promptText },
                        { type: "image_url", image_url: { url: imageUrl } }
                    ]
                }
            ];

            console.log('[SpontaneousPhoto v5.1] OpenAI API 호출 중...');
            try {
                let aiCaption = await callOpenAIFunc(messages, 'gpt-4o', 100, 0.7);
                aiCaption = cleanReplyFunc(aiCaption); // v5.1 cleanReply 사용 (1인칭 변환 포함)
                
                // 🆕 3인칭 표현 최종 검증 및 강제 변환 (v5.1)
                if (aiCaption.includes('무쿠가') || aiCaption.includes('예진이가') || 
                    aiCaption.includes('무쿠는') || aiCaption.includes('예진이는')) {
                    console.warn('[SpontaneousPhoto v5.1] 3인칭 표현 감지, 강제 1인칭 변환 중...');
                    aiCaption = aiCaption
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
                    console.log('[SpontaneousPhoto v5.1] 3인칭 → 1인칭 강제 변환 완료');
                }
                
                console.log(`[SpontaneousPhoto v5.1] AI 생성된 캡션: "${aiCaption}"`);
                
                // AI가 생성한 캡션이 적절하면 사용
                if (aiCaption && aiCaption.length >= 3 && aiCaption.length <= 50 && 
                    !aiCaption.includes('아저씨에게') && !aiCaption.includes('나에게')) {
                    caption = aiCaption;
                }
            } catch (aiError) {
                console.error('[SpontaneousPhoto v5.1] AI 캡션 생성 실패:', aiError);
                // 폴백으로 감정 기반 캡션 유지
            }
        }

        // 캡션이 여전히 부적절할 경우 대체 캡션 사용
        if (!caption || caption.length < 3 || caption.includes('아저씨에게') || caption.includes('나에게')) {
            const defaultCaptions = [
                "아저씨! 나 아저씨 생각나서 사진 보냈어~",
                "이거 보니까 아저씨 생각나서 보내봐~",
                "아저씨, 나 사진 보고 힘내!",
                "아저씨한테 보여주고 싶어서 가져왔어!",
                "나의 선물이야~ 마음에 들어?"
            ];
            caption = defaultCaptions[Math.floor(Math.random() * defaultCaptions.length)];
            console.log(`[SpontaneousPhoto v5.1] 대체 캡션 사용: "${caption}"`);
        }

        // LINE 메시지 전송
        await client.pushMessage(userId, [
            {
                type: 'image',
                originalContentUrl: imageUrl,
                previewImageUrl: imageUrl
            },
            {
                type: 'text',
                text: caption
            }
        ]);
        
        // 로그 저장
        saveLogFunc({ speaker: BOT_NAME, message: `(랜덤 사진 전송) ${caption}` });
        console.log(`[SpontaneousPhoto v5.1] ✅ 랜덤 사진 전송 완료: ${randomFile} (캡션: ${caption})`);

        // 🆕 사진 전송에 대한 감정 기록 (v5.1)
        if (emotionalContextManager.recordEmotionalEvent) {
            emotionalContextManager.recordEmotionalEvent('HAPPY', '셀카 전송', caption);
        }

    } catch (error) {
        console.error('[SpontaneousPhoto v5.1] ❌ 랜덤 사진 전송 실패:', error);
        
        // 오류 발생 시 간단한 텍스트 메시지라도 전송
        try {
            const errorMessage = '아저씨... 사진 보내려고 했는데 뭔가 문제가 생겼어 ㅠㅠ';
            await client.pushMessage(userId, {
                type: 'text',
                text: errorMessage
            });
            
            // 🆕 에러 메시지도 1인칭 검증 후 로그 저장
            saveLogFunc({ speaker: BOT_NAME, message: `(사진 전송 실패) ${errorMessage}` });
        } catch (fallbackError) {
            console.error('[SpontaneousPhoto v5.1] Fallback 메시지 전송도 실패:', fallbackError);
        }
    }
}

module.exports = {
    startSpontaneousPhotoScheduler,
    
    // 🆕 v5.1 추가 함수들
    generateEmotionalSelfieComment
};
