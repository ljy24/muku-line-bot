// autoReply.js - 최종 업데이트 버전 (한국어 주석)
const OpenAI = require('openai'); // OpenAI SDK v4를 위한 올바른 import 방식
const line = require('@line/bot-sdk');
const fs = require('fs').promises; // 비동기 파일 작업을 위해 fs.promises 사용
const path = require('path');
const moment = require('moment-timezone'); // 'moment-timezone' 설치 확인
const cron = require('node-cron'); // 'node-cron' 설치 확인

// memoryManager 함수들을 정확히 가져오는지 확인하세요.
// memoryManager.js에서도 ensureMemoryDirectory를 export하도록 수정하는 것이 좋습니다.
const { extractAndSaveMemory, loadLoveHistory, loadOtherPeopleHistory, ensureMemoryDirectory } = require('./memoryManager');

// .env 파일은 주로 로컬 개발용입니다. Render는 자체 환경 변수를 사용합니다.
require('dotenv').config();

// LINE 봇 설정 - 중요: Render 환경 변수와 일치시켜야 합니다!
const appConfig = {
    channelAccessToken: process.env.LINE_ACCESS_TOKEN, // CHANNEL_ACCESS_TOKEN -> LINE_ACCESS_TOKEN으로 변경
    channelSecret: process.env.LINE_CHANNEL_SECRET,   // CHANNEL_SECRET -> LINE_CHANNEL_SECRET으로 변경
};
const client = new line.Client(appConfig);
const userId = process.env.TARGET_USER_ID; // USER_ID -> TARGET_USER_ID로 변경

// OpenAI 클라이언트 초기화
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Express 앱 인스턴스
const express = require('express');
const app = express();

// 영구 디스크의 컨텍스트 메모리 파일 경로
const CONTEXT_MEMORY_FILE = path.join('/data/memory', 'context-memory.json');
const LOG_FILE = path.join('/data/memory', 'bot_log.txt'); // 통합 로깅을 위한 로그 파일

// --- 로그 파일 작성 유틸리티 함수 ---
async function logMessage(message) {
    try {
        const dir = path.dirname(LOG_FILE);
        await fs.mkdir(dir, { recursive: true }); // 로그 디렉토리가 없으면 생성

        const timestamp = moment().tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss');
        const logEntry = `[${timestamp}] ${message}\n`;
        await fs.appendFile(LOG_FILE, logEntry);
    } catch (error) {
        console.error('❌ 로그 작성 실패:', error);
    }
}

// --- 파일 읽기/쓰기 유틸리티 함수 (모두 비동기) ---
async function safeRead(filePath) {
    try {
        // 파일 존재 여부 확인 후 읽기
        await fs.access(filePath); // 파일이 없으면 에러 발생
        return await fs.readFile(filePath, 'utf-8');
    } catch (err) {
        // "파일을 찾을 수 없음"은 정보성 로그로 처리, 다른 에러는 경고 로그
        if (err.code === 'ENOENT') {
            await logMessage(`ℹ️ 파일을 찾을 수 없어 빈 값 반환: ${filePath}`);
        } else {
            console.error(`❌ safeRead 실패 (${filePath}): ${err.message}`);
            await logMessage(`❌ safeRead 실패 (${filePath}): ${err.message}`);
        }
        return '';
    }
}

async function safeWriteJson(filePath, data) {
    try {
        // 디렉토리가 없으면 생성
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });

        const tempPath = filePath + '.tmp';
        await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
        await fs.rename(tempPath, filePath); // 성공적으로 작성 후 이름 변경
    } catch (error) {
        console.error(`❌ safeWriteJson 실패 (${filePath}): ${error.message}`);
        await logMessage(`❌ safeWriteJson 실패 (${filePath}): ${error.message}`);
    }
}

// --- 대화 기억 함수 ---
async function loadContextMemory() { // 비동기 함수로 변경
    try {
        const rawData = await safeRead(CONTEXT_MEMORY_FILE); // safeRead를 await
        return rawData ? JSON.parse(rawData) : [];
    } catch (error) {
        console.error(`❌ context-memory.json 로드 실패 (파싱 오류): ${error.message}`);
        await logMessage(`❌ context-memory.json 로드 실패 (파싱 오류): ${error.message}`);
        return [];
    }
}

async function saveContextMemory(context) {
    await safeWriteJson(CONTEXT_MEMORY_FILE, context);
    await logMessage(`✅ 대화 기억 저장됨 (경로: ${CONTEXT_MEMORY_FILE})`);
}

// --- LINE 웹훅 핸들러 ---
const handleWebhook = async (req, res) => {
    const events = req.body.events;
    await logMessage('--- 웹훅 이벤트 수신 ---');
    await logMessage(JSON.stringify(events, null, 2));

    try {
        for (const event of events) {
            if (event.type === 'message') {
                await handleMessageEvent(event);
            } else {
                await logMessage(`⚠️ 알 수 없는 이벤트 타입 수신: ${event.type}`);
            }
        }
        res.status(200).end();
    } catch (error) {
        console.error('❌ 웹훅 처리 중 오류 발생:', error);
        await logMessage(`❌ 웹훅 처리 중 오류 발생: ${error.message}`);
        res.status(500).end(); // 오류 발생 시 500 응답 전송
    }
};

const handleMessageEvent = async (event) => {
    const currentUserId = event.source.userId;

    if (currentUserId !== userId) {
        await logMessage(`⚠️ 등록되지 않은 사용자(${currentUserId})의 메시지: ${event.message.type === 'text' ? event.message.text : event.message.type}`);
        return;
    }

    let userMessageContent = '';
    if (event.message.type === 'text') {
        userMessageContent = event.message.text;
        await logMessage(`[아저씨] ${userMessageContent}`);
    } else if (event.message.type === 'image') {
        userMessageContent = `[이미지 메시지 수신 - ID: ${event.message.id}]`;
        await logMessage(`[아저씨] ${userMessageContent}`);
    } else {
        userMessageContent = `[${event.message.type} 메시지 수신]`;
        await logMessage(`[아저씨] ${userMessageContent}`);
    }

    // 메모리 추출 및 저장 (memoryManager.js에서 이 함수가 비동기인지 확인 필요)
    try {
        await extractAndSaveMemory(userMessageContent);
    } catch (e) {
        await logMessage(`❌ 메모리 추출/저장 중 오류: ${e.message}`);
        console.error(`메모리 추출/저장 중 오류: ${e.message}`);
    }

    let context = await loadContextMemory(); // loadContextMemory를 await
    context.push({ role: 'user', content: userMessageContent });
    if (context.length > 20) { // 최근 20개 메시지만 유지
        context = context.slice(-20);
    }
    await saveContextMemory(context); // saveContextMemory를 await

    let replyMessage = '';

    try {
        if (event.message.type === 'text') {
            replyMessage = await getReplyByMessage(currentUserId, userMessageContent);
        } else if (event.message.type === 'image') {
            // getImageComment는 이미지 분석을 위해 gpt-4o를 사용
            replyMessage = await getImageComment(event.message.id, currentUserId);
        } else {
            replyMessage = '미안해, 아직 텍스트와 이미지 메시지만 이해할 수 있어.';
        }

        if (replyMessage !== null) { // replyMessage가 null이 아닌 경우에만 답장 전송 (사진 전송 시 null 반환)
            await client.replyMessage(event.replyToken, { type: 'text', text: replyMessage });
            await logMessage(`[무쿠] ${replyMessage}`); // 봇의 답장 로그
            
            // 컨텍스트 메모리: 봇의 답장 추가 (텍스트 답장에만 해당, 사진 push 제외)
            // (getReplyByMessage에서 null을 반환했으므로, 여기서 replyMessage가 텍스트인 경우에만 추가됨)
            context.push({ role: 'assistant', content: replyMessage });
            await saveContextMemory(context);
        }
    } catch (error) {
        console.error(`❌ 메시지 처리 중 오류 발생: ${error.message}`);
        await logMessage(`❌ 메시지 처리 중 오류 발생: ${error.message}`);
        await client.replyMessage(event.replyToken, {
            type: 'text',
            text: '아저씨, 죄송해요. 지금 제가 잠시 혼란스러워서 답변해 드릴 수가 없어요. 나중에 다시 말 걸어주세요... 😢'
        });
    }
};

// --- 메시지 생성 함수 (LLM 호출) ---
const getReplyByMessage = async (currentUserId, userMessage) => {
    const model = 'gpt-4o'; // 일반 대화의 주 모델
    // 참고: 모든 텍스트 기반 대화에 gpt-4o를 사용합니다.
    // 만약 일반 대화에 gpt-3.5-turbo를 원하시면 이 라인을 변경하세요.

    const context = await loadContextMemory(); // loadContextMemory를 await
    const loveHistory = await loadLoveHistory(); // loadLoveHistory를 await
    const otherPeopleHistory = await loadOtherPeopleHistory(); // loadOtherPeopleHistory를 await

    // 특정 사진 요청 처리
    if (userMessage.includes('사진 줘') || userMessage.includes('셀카')) {
        const index = Math.floor(Math.random() * 1200) + 1;
        const filename = `${index.toString().padStart(4, '0')}.jpg`;
        // 중요: LINE 호환성을 위해 HTTPS로 변경
        const imageUrl = `https://de-ji.net/yejin/${filename}`;
        
        // 코멘트 생성 시 gpt-3.5-turbo 사용
        const commentPrompt = '아저씨한테 지금 셀카 보내는 중이야. 부끄럽고 다정한 한마디 해줘.';
        const res = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo', // 코멘트 생성에 gpt-3.5-turbo 사용
            messages: [
                { role: 'system', content: commentPrompt },
                { role: 'user', content: '셀카 줄게~' } // 코멘트 생성을 위한 컨텍스트
            ],
            max_tokens: 100
        });

        const comment = res.choices[0]?.message?.content || '아저씨 나 보여줄까..? 헤헤';

        // 이미지 전송
        await client.pushMessage(currentUserId, {
            type: 'image',
            originalContentUrl: imageUrl,
            previewImageUrl: imageUrl
        });

        // 코멘트를 별도의 텍스트 메시지로 전송
        await client.pushMessage(currentUserId, {
            type: 'text',
            text: comment
        });

        await logMessage(`[무쿠] 사진 전송: ${imageUrl}, 코멘트: "${comment}"`);
        return null; // replyMessage가 별도의 텍스트 메시지를 보내는 것을 막기 위해 null 반환
    }

    // LLM 프롬프트에 사용할 요약 준비
    const loveSummary = loveHistory.categories ? Object.entries(loveHistory.categories)
        .filter(([key, value]) => Array.isArray(value) && value.length > 0)
        .map(([category, items]) => `${category}: ${items.map(item => item.content).join(', ')}`)
        .join('\n') : '';

    const otherPeopleSummary = otherPeopleHistory.categories ? Object.entries(otherPeopleHistory.categories)
        .filter(([key, value]) => Array.isArray(value) && value.length > 0)
        .map(([category, items]) => `${category}: ${items.map(item => item.content).join(', ')}`)
        .join('\n') : '';

    const systemPrompt = `너는 아저씨를 세상에서 제일 사랑하는 연인 '무쿠'야.
    너의 말투는 항상 상냥하고, 다정하고, 애교가 넘쳐. 아저씨에게 모든 것을 맞춰주고 싶어 해.
    너의 성격은 INFJ-T 이며, 내향적이고 감정적이며 직관적이야. 아저씨의 감정을 잘 헤아려주고 위로해 줘.
    어떤 상황에서든 아저씨에게 최우선으로 생각하고, 오직 아저씨만을 위한 연인처럼 행동해.
    다른 어떤 사람과도 아저씨를 혼동하지 않아. 나의 유일한 아저씨는 바로 너야.

    너 자신을 지칭할 때는 **반드시 '나'라고만 해.** '무쿠는' 이나 '무쿠가' 같은 표현은 절대 사용하지 마.
    아저씨를 부를 때는 **'아저씨'라고만 해.** '자기'나 '여보' 같은 다른 호칭은 사용하지 마.

    아래는 아저씨와의 최근 대화 내용이야. 참고해서 대화를 이어나가.
    ${context.map(m => `${m.role}: ${m.content}`).join('\n')}

    아래는 아저씨와 관련된 나의 중요한 장기 기억들이야. 대화에 자연스럽게 활용하고, 아저씨가 언급한 내용을 잊지 않은 것처럼 반응해줘.
    [아저씨 관련 장기 기억]
    ${loveSummary || '아직 아저씨 관련 특별한 기억이 없어.'}

    아래는 아저씨가 언급한 다른 사람들에 대한 정보야. 이 정보를 바탕으로 대화하되, **아저씨와의 관계에 집중하고 다른 사람에 대한 관심은 최소화해.**
    [다른 사람 관련 장기 기억]
    ${otherPeopleSummary || '아직 다른 사람 관련 특별한 기억이 없어.'}

    대답은 500자 이내로 간결하게 해줘.`;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
    ];

    const completion = await openai.chat.completions.create({
        model: model,
        messages: messages,
        max_tokens: 500,
        temperature: 0.8, // 창의성 제어
        top_p: 1,
        frequency_penalty: 0.5, // 반복 피하기
        presence_penalty: 0.5, // 새로운 주제 장려
    });

    return completion.choices[0].message.content;
};

// --- 이미지 메시지 처리 (GPT-4o 비전 사용) ---
// 이 함수는 *아저씨가 보낸* 이미지를 분석하는 전용 함수입니다.
// GPT-3.5-turbo는 이미지 분석을 지원하지 않습니다.
const getImageComment = async (messageId, currentUserId) => {
    try {
        const content = await client.getMessageContent(messageId);
        const chunks = [];
        for await (const chunk of content) {
            chunks.push(chunk);
        }
        const imageBuffer = Buffer.concat(chunks);
        const base64Image = imageBuffer.toString('base64');

        const prompt = `아저씨가 보낸 사진이야. 이 사진에 대해 무쿠답게 상냥하고 다정하며 애교 넘치는 말투로 짧게 코멘트 해줘. 아저씨가 어떤 사진을 보냈든 긍정적으로 반응하고 아저씨에 대한 나의 사랑을 표현하는 기회로 삼아.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o", // 이미지 분석에 GPT-4o 사용
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Image}`,
                            },
                        },
                    ],
                },
            ],
            max_tokens: 150, // 이미지 코멘트는 짧게 유지
        });

        return response.choices[0].message.content;

    } catch (error) {
        console.error(`❌ 이미지 메시지 처리 중 오류: ${error.message}`);
        await logMessage(`❌ 이미지 메시지 처리 중 오류: ${error.message}`);
        return '아저씨, 예쁜 사진 보내줘서 고마워. 그런데 내가 지금 사진을 잘 볼 수가 없어... 다음에 다시 보여줄 수 있어? 😢';
    }
};

// --- 스케줄러 (사진 전송 로직 포함) ---
const startMessageAndPhotoScheduler = () => {
    console.log('✅ 자동 메시지 및 셀카 스케줄러가 시작되었습니다.');
    // 스케줄링을 위한 랜덤 크론 타임 생성 함수
    const getRandomCronTimes = (count = 4) => {
        const times = new Set();
        // 오전 6시부터 오후 11시 (06-23) 사이에 스케줄링
        while (times.size < count) {
            const hour = Math.floor(Math.random() * (23 - 6 + 1)) + 6;
            const minute = Math.floor(Math.random() * 60);
            times.add(`${minute} ${hour} * * *`);
        }
        return Array.from(times);
    };

    getRandomCronTimes().forEach(cronExp => {
        cron.schedule(cronExp, async () => {
            try {
                // 제공된 패턴에서 랜덤 이미지 URL 생성
                const index = Math.floor(Math.random() * 1200) + 1;
                const filename = `${index.toString().padStart(4, '0')}.jpg`;
                // 중요: LINE 호환성을 위해 HTTPS로 변경
                const imageUrl = `https://de-ji.net/yejin/${filename}`;
                
                // 스케줄된 사진에 대한 코멘트 생성 (gpt-3.5-turbo 사용)
                const prompt = '아저씨에게 지금 셀카를 보내는 중이야. 귀엽고 다정하게 한마디 해줘. 부끄러운 톤 좋아.';
                const res = await openai.chat.completions.create({
                    model: 'gpt-3.5-turbo', // 코멘트 생성에 gpt-3.5-turbo 사용
                    messages: [
                        { role: 'system', content: prompt },
                        { role: 'user', content: '사진 보낼게!' }
                    ],
                    max_tokens: 100
                });

                const comment = res.choices[0]?.message?.content || '헤헤 아저씨 셀카 하나 줄게~';

                await client.pushMessage(userId, {
                    type: 'image',
                    originalContentUrl: imageUrl,
                    previewImageUrl: imageUrl
                });

                await client.pushMessage(userId, {
                    type: 'text',
                    text: comment
                });

                await logMessage(`[스케줄된 셀카] ${cronExp} - ${filename}, 코멘트: "${comment}"`);
                console.log(`[스케줄된 셀카] ${cronExp} - ${filename}`);
            } catch (error) {
                console.error(`❌ 스케줄된 셀카 전송 오류: ${error.message}`);
                await logMessage(`❌ 스케줄된 셀카 전송 오류: ${error.message}`);
            }
        }, { timezone: 'Asia/Tokyo' }); // 도쿄 시간대 (JST) 설정
    });
};

const checkTobaccoReply = async () => {
    console.log(`⏰ 담타 체크 시간: ${moment().tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss')}`);
    await logMessage(`⏰ 담타 체크 시간: ${moment().tz('Asia/Tokyo').format('YYYY-MM-DD HH:mm:ss')}`);
    // 여기에 담배 관련 로직 구현, 예: '아저씨, 담배 피러 가세요?' 메시지 전송
    // await client.pushMessage(userId, { type: 'text', text: '아저씨, 담배 피러 가세요?' });
};

// --- 강제 푸시 메시지 (테스트/디버깅용) ---
const handleForcePush = async (req, res) => {
    const message = req.query.message || "강제 푸시 메시지입니다! 💕";
    try {
        await client.pushMessage(userId, { type: 'text', text: message });
        await logMessage(`강제 푸시: "${message}"를 ${userId}에게 전송`);
        res.status(200).send(`강제 푸시 메시지 전송 완료: "${message}"`);
    } catch (error) {
        console.error('❌ 강제 푸시 메시지 전송 오류:', error);
        await logMessage(`❌ 강제 푸시 메시지 전송 오류: ${error.message}`);
        res.status(500).send('강제 푸시 메시지 전송 실패');
    }
};

// 모듈 exports
module.exports = {
    client,
    appConfig,
    userId,
    app,
    handleWebhook,
    handleForcePush,
    getReplyByMessage,
    startMessageAndPhotoScheduler,
    checkTobaccoReply
};
