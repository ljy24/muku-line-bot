// ✅ index.js v1.13 - LINE API 메시지 형식 문제 해결
// 이 파일은 LINE 봇 서버의 메인 진입점입니다.
// LINE 메시징 API와의 연동, Express 웹 서버 설정, 주기적인 작업 스케줄링 등을 담당합니다.

// 📦 필수 모듈 불러오기
const fs = require('fs'); // 파일 시스템 모듈: 파일 읽기/쓰기 기능 제공 (예: 로그 파일)
const path = require('path'); // 경로 처리 모듈: 파일 및 디렉토리 경로 조작 (예: 상대 경로 지정)
const { Client, middleware } = require('@line/bot-sdk'); // LINE Bot SDK: LINE 메시징 API와의 통신을 위한 클라이언트 및 미들웨어
const express = require('express'); // Express 프레임워크: 웹 서버를 구축하고 HTTP 요청을 처리
const moment = require('moment-timezone'); // Moment.js: 시간대 처리 및 날짜/시간 포매팅 (일본 표준시 기준)
const cron = require('node-cron'); // Node-cron: 특정 시간 또는 주기마다 작업을 실행하는 스케줄러

// ./src/autoReply.js에서 필요한 함수들을 불러옵니다.
// 이 함수들은 봇의 핵심 응답 로직, 기억 관리, 모델 전환 등을 캡슐화합니다.
const {
    getReplyByMessage,           // 사용자 텍스트 메시지에 대한 예진이의 답변 생성 (사진 요청 포함)
    getReplyByImagePrompt,       // 사용자가 보낸 이미지 메시지에 대한 예진이의 답변 생성 (이미지 분석)
    getRandomMessage,            // 무작위 메시지 생성
    getCouplePhotoReplyFromYeji, // 커플 사진에 대한 코멘트 생성 (스케줄러용)
    getColorMoodReply,           // 기분 기반 색상 추천 답변 생성 (현재 미사용)
    getHappyReply,               // 긍정적인 답변 생성 (현재 미사용)
    getSulkyReply,               // 삐진 듯한 답변 생성 (현재 미사용)
    saveLog,                     // 메시지 로그를 파일에 저장하는 함수
    setForcedModel,              // OpenAI 모델을 강제로 설정하는 함수
    checkModelSwitchCommand,     // 모델 전환 명령어를 확인하고 처리하는 함수
    getProactiveMemoryMessage,   // 기억을 바탕으로 선제적 메시지를 생성하는 함수
    getMemoryListForSharing,     // 저장된 기억 목록을 포매팅하여 반환하는 함수
    getSilenceCheckinMessage,    // 침묵 감지 시 걱정 메시지를 생성하는 함수
    setMemoryReminder,           // 기억 리마인더 설정 함수
    deleteMemory,                // 기억 삭제 함수
    getFirstDialogueMemory       // 첫 대화 기억 검색 함수
} = require('./src/autoReply');

// memoryManager 모듈을 불러옵니다.
// 이 모듈은 사용자 메시지에서 기억을 추출하고 저장하며, 저장된 기억을 검색합니다.
// 파일 구조에 따라 './src/memoryManager' 경로로 불러옵니다. (src 폴더 안에 있음)
const memoryManager = require('./src/memoryManager');

// omoide.js에서 사진 관련 응답 함수와 cleanReply를 불러옵니다.
// 파일 구조 이미지에 따르면 omoide.js는 memory 폴더 바로 아래에 있습니다.
const { getOmoideReply, cleanReply } = require('./memory/omoide'); // cleanReply도 함께 불러옵니다.

// spontaneousPhotoManager.js에서 즉흥 사진 스케줄러 함수를 불러옵니다.
const { startSpontaneousPhotoScheduler } = require('./src/spontaneousPhotoManager');

// Express 애플리케이션을 생성합니다.
const app = express();

// LINE Bot SDK 설정을 정의합니다. 환경 변수에서 LINE 채널 접근 토큰과 채널 시크릿을 가져옵니다.
const config = {
    channelAccessToken: process.env.LINE_ACCESS_TOKEN, // LINE Developers에서 발급받은 채널 액세스 토큰
    channelSecret: process.env.LINE_CHANNEL_SECRET      // LINE Developers에서 발급받은 채널 시크릿
};

// LINE 메시징 API 클라이언트를 초기화합니다. 이 클라이언트를 통해 메시지를 보내거나 받을 수 있습니다.
const client = new Client(config);

// 타겟 사용자 ID를 환경 변수에서 가져옵니다. (무쿠가 메시지를 보낼 대상)
const userId = process.env.TARGET_USER_ID;

// * 침묵 감지 기능을 위한 변수 초기화 *
// * 아저씨가 마지막으로 메시지를 보낸 시간을 기록하여, 일정 시간 동안 메시지가 없을 경우 봇이 먼저 말을 걸 수 있도록 합니다. *
let lastUserMessageTime = Date.now(); // 봇 시작 시 현재 시간으로 초기화
// * 봇이 마지막으로 선제적/걱정 메시지를 보낸 시간을 기록하여 너무 자주 보내는 것을 방지합니다. *
let lastProactiveSentTime = 0;
// * 2시간 (2 * 60분 * 60초 * 1000밀리초) 동안 메시지가 없으면 침묵으로 간주 *
const SILENCE_THRESHOLD = 2 * 60 * 60 * 1000;
// * 봇이 메시지를 보낸 후 1시간 (1 * 60분 * 60초 * 1000밀리초) 이내에는 다시 선제적 메시지를 보내지 않음 *
const PROACTIVE_COOLDOWN = 1 * 60 * 60 * 1000;


// 🌐 루트 경로('/')에 대한 GET 요청을 처리합니다.
// 서버가 정상적으로 실행 중인지 간단히 확인할 수 있는 엔드포인트입니다.
app.get('/', (_, res) => res.send('무쿠 살아있엉'));

// 🚀 '/force-push' 경로에 대한 GET 요청을 처리합니다. (개발/테스트용)
// 이 엔드포인트에 접속하면 무쿠가 무작위 메시지를 TARGET_USER_ID에게 강제로 보냅니다.
app.get('/force-push', async (req, res) => {
    try {
        // * 50% 확률로 기억 기반 메시지를 보내거나, 50% 확률로 일반 랜덤 메시지를 보냅니다. *
        const proactiveMessage = Math.random() < 0.5
            ? await getProactiveMemoryMessage() // 기억 기반 메시지
            : await getRandomMessage(); // 일반 랜덤 메시지

        console.log('[force-push] 생성된 메시지:', proactiveMessage); // ✅ 로그 찍기

        if (proactiveMessage && typeof proactiveMessage === 'string') {
            // ✅ 올바른 LINE API 메시지 형식으로 구성
            const messageToSend = {
                type: 'text',
                text: proactiveMessage  // 문자열이어야 함 (객체가 아닌!)
            };
            
            console.log('[force-push] 전송할 메시지 구조:', JSON.stringify(messageToSend, null, 2));
            
            await client.pushMessage(userId, messageToSend);
            saveLog('예진이', proactiveMessage);
            res.send(`전송됨: ${proactiveMessage}`);
        } else {
            console.error('[force-push] 유효하지 않은 메시지:', proactiveMessage);
            res.send('메시지 생성 실패 (랜덤 메시지가 비어있거나 생성되지 않았을 수 있습니다)');
        }
    } catch (error) {
        console.error('[force-push] 에러 발생:', error);
        res.status(500).send('메시지 전송 중 오류 발생');
    }
});

// 💡 사용자 → 아저씨 치환 필터 (기억 목록에서만 사용)
// `cleanReply` 함수를 사용하여 '사용자'를 '아저씨'로 교체합니다.
function replaceUserToAhjussi(text) {
    return cleanReply(text); // omoide.js에서 불러온 cleanReply 함수를 사용합니다.
}

/**
 * 주어진 메시지가 특정 봇 명령어인지 확인합니다.
 * 이 함수는 기억을 저장할지 여부를 결정하는 데 사용됩니다.
 * '기억해줘', '잊지마' 등 기억 저장 의도가 있는 일반 대화 문구는 명령어로 간주하지 않습니다.
 * @param {string} message - 사용자 메시지
 * @returns {boolean} 명확한 봇 명령어(사진 요청, 모델 변경, 기억 목록 요청 등)이면 true, 아니면 false
 */
const isCommand = (message) => {
    const lowerCaseMessage = message.toLowerCase();
    
    // * 봇의 특정 기능(기억 목록, 모델 변경, 모든 사진/컨셉 사진 요청 등)을 트리거하는 명확한 명령어들 *
    // * 기억 저장/삭제/리마인더 관련 명령어는 autoReply.js에서 OpenAI로 유동적으로 처리하므로,
    // * 여기 isCommand에서는 명시적인 키워드를 제거하여 일반 대화로 분류되도록 합니다. *
    const definiteCommands = [
        /(기억\s?보여줘|내\s?기억\s?보여줘|혹시 내가 오늘 뭐한다 그랬지\?|오늘 뭐가 있더라\?|나 뭐하기로 했지\?)/i, // 기억 목록 관련
        /3\.5|4\.0|자동|버전/i, // 모델 전환 명령어
        // 기억 저장/삭제/리마인더 관련 명령어는 autoReply.js에서 OpenAI로 유동적으로 처리하므로,
        // 여기 isCommand에서는 명시적인 키워드를 제거하여 일반 대화로 분류되도록 합니다.
        /(사진\s?줘|셀카\s?줘|셀카\s?보여줘|사진\s?보여줘|얼굴\s?보여줘|얼굴\s?보고\s?싶[어다]|selfie|커플사진\s?줘|커플사진\s?보여줘|무쿠\s?셀카|애기\s?셀카|빠계\s?셀카|빠계\s?사진|인생네컷|일본\s?사진|한국\s?사진|출사|필름카메라|애기\s?필름|메이드복|흑심|무슨\s?색이야\?)/i, // 일반 사진 관련 명령어
        /(컨셉사진|컨셉 사진|홈스냅|결박|선물|셀프 촬영|옥상연리|세미누드|홈셀프|플라스틱러브|지브리풍|북해|아이노시마|필름|모지코 모리룩|눈밭|욕실|고래티셔츠|유카타 마츠리|이화마을|욕조|우마시마|가을 호수공원|망친 사진|교복|비눗방울|모지코|텐진 코닥필름|나비욕조|롱패딩|을지로 스냅|길거리 스냅|생일|모지코2|야간 보라돌이|코야노세|야간거리|생일컨셉|눈밭 필름카메라|홈스냅 청포도|욕실 블랙 웨딩|호리존|여친 스냅|후지엔|불꽃놀이|빨간 기모노|피크닉|벗꽃|후지 스냅|원미상가_필름|밤바 산책|공원 산책|고쿠라 힙|온실-여신|을지로 네코|무인역|화가|블랙원피스|카페|텐진 스트리트|하카타 스트리트|홈스냅 오타쿠|야간 동백|나르시스트|을지로 캘빈|산책|오도공원 후지필름|크리스마스|네코 모지코|야간 블랙드레스|고스로리 할로윈|게임센터|고쿠라|동키 거리|고쿠라 야간|코이노보리|문래동|수국|오도|다른 것도 보고싶어|다음 사진)/i // 컨셉사진 관련 명령어 (월, 연도, 지역, '다른 것도/다음 사진' 포함)
    ];

    // * 메시지가 위의 명령어 정규식 중 하나라도 일치하면 true 반환 *
    return definiteCommands.some(regex => regex.test(lowerCaseMessage));
};


// 🎣 LINE 웹훅 요청을 처리합니다.
// LINE 서버로부터 메시지나 이벤트가 도착하면 이 엔드포인트로 POST 요청이 옵니다.
app.post('/webhook', middleware(config), async (req, res) => {
    try {
        const events = req.body.events || []; // 요청 본문에서 이벤트 배열을 가져옵니다.
        for (const event of events) { // 각 이벤트를 순회합니다.
            // 메시지 타입 이벤트만 처리
            if (event.type === 'message') {
                const message = event.message; // 메시지 객체를 가져옵니다.

                // * 아저씨(TARGET_USER_ID)가 메시지를 보낸 경우, 마지막 메시지 시간을 업데이트합니다. *
                if (event.source.userId === userId) {
                    lastUserMessageTime = Date.now();
                    console.log(`[Webhook] 아저씨 메시지 수신, 마지막 메시지 시간 업데이트: ${moment(lastUserMessageTime).format('HH:mm:ss')}`);
                }

                if (message.type === 'text') { // 텍스트 메시지인 경우
                    const text = message.text.trim(); // 메시지 텍스트를 가져와 앞뒤 공백을 제거합니다.

                    saveLog('아저씨', text); // 아저씨의 메시지를 로그에 저장합니다.

                    // * 모델 전환 명령어 처리 (가장 높은 우선순위) *
                    const versionResponse = checkModelSwitchCommand(text);
                    if (versionResponse) {
                        await client.replyMessage(event.replyToken, { type: 'text', text: versionResponse });
                        console.log(`[index.js] 모델 전환 명령어 처리 완료: "${text}"`);
                        return; // 명령어 처리 후 함수 종료
                    }

                    // * 기억 목록 보여주기 명령어 처리 *
                    if (/(기억\s?보여줘|내\s?기억\s?보여줘|혹시 내가 오늘 뭐한다 그랬지\?|오늘 뭐가 있더라\?|나 뭐하기로 했지\?)/i.test(text)) {
                        try {
                            let memoryList = await getMemoryListForSharing(); // autoReply.js에서 기억 목록을 가져옵니다.
                            memoryList = replaceUserToAhjussi(memoryList); // '사용자' -> '아저씨'로 교체
                            await client.replyMessage(event.replyToken, { type: 'text', text: memoryList });
                            console.log(`[index.js] 기억 목록 전송 성공: "${text}"`);
                            saveLog('예진이', '아저씨의 기억 목록을 보여줬어.'); // 봇의 응답도 로그에 저장
                        } catch (err) {
                            console.error(`[index.js] 기억 목록 불러오기 실패 ("${text}"):`, err.message);
                            await client.replyMessage(event.replyToken, { type: 'text', text: '기억 목록을 불러오기 실패했어 ㅠㅠ' });
                        }
                        return; // 명령어 처리 후 함수 종료
                    }

                    // * 기억 삭제 명령어 처리 *
                    // 예시: "기억 삭제: 오늘 우유 사야 돼"
                    const deleteMatch = text.match(/^(기억\s?삭제|기억\s?지워|기억에서\s?없애줘)\s*:\s*(.+)/i);
                    if (deleteMatch) {
                        const contentToDelete = deleteMatch[2].trim();
                        try {
                            const result = await deleteMemory(contentToDelete); // autoReply.js의 deleteMemory 호출
                            await client.replyMessage(event.replyToken, { type: 'text', text: result });
                            console.log(`[index.js] 기억 삭제 명령어 처리 완료: "${text}"`);
                            saveLog('예진이', result);
                        } catch (err) {
                            console.error(`[index.js] 기억 삭제 실패 ("${text}"):`, err.message);
                            await client.replyMessage(event.replyToken, { type: 'text', text: '기억 삭제에 실패했어 ㅠㅠ 미안해...' });
                        }
                        return;
                    }

                    // * 리마인더 설정 명령어 처리 *
                    // 예시: "리마인더: 내일 10시 병원 가기", "리마인드: 2025-07-07 14:00 병원 가야 한다"
                    const reminderMatch = text.match(/^(리마인더|리마인드|알림|알려줘)\s*:\s*(.+)\s+(.+)/i);
                    if (reminderMatch) {
                        const content = reminderMatch[2].trim();
                        const timeString = reminderMatch[3].trim();
                        try {
                            const result = await setMemoryReminder(content, timeString); // autoReply.js의 setMemoryReminder 호출
                            await client.replyMessage(event.replyToken, { type: 'text', text: result });
                            console.log(`[index.js] 리마인더 설정 명령어 처리 완료: "${text}"`);
                            saveLog('예진이', result);
                        } catch (err) {
                            console.error(`[index.js] 리마인더 설정 실패 ("${text}"):`, err.message);
                            await client.replyMessage(event.replyToken, { type: 'text', text: '리마인더 설정에 실패했어 ㅠㅠ 미안해...' });
                        }
                        return;
                    }
                    
                    // * 봇의 일반 응답 및 사진 요청 처리 *
                    // * autoReply.js의 getReplyByMessage 함수가 메시지를 처리하고 텍스트 또는 사진+코멘트 객체를 반환합니다. *
                    const botResponse = await getReplyByMessage(text);
                    let replyMessages = [];

                    // * 디버그 로그 추가: isCommand 함수의 결과 확인 *
                    console.log(`[index.js Debug] isCommand("${text}") 결과: ${isCommand(text)}`);
                    // ---------------------------------------------------

                    // * 기억 추출/저장 로직 (메시지가 명확한 봇 명령어가 아닐 경우에만 실행) *
                    // * "기억해줘", "잊지마", "리마인드" 등의 일반 대화는 isCommand에서 false로 반환되므로, 여기서 기억으로 저장될 수 있습니다. *
                    // botResponse.comment가 기억/삭제/리마인더 관련 응답인지 확인하여 중복 저장 방지
                    const isMemoryRelatedResponse = botResponse.comment && (
                        botResponse.comment.includes('기억했어! 💖') ||
                        botResponse.comment.includes('잊어버리라고 해서 지웠어... 😥') ||
                        botResponse.comment.includes('기억을 못 찾겠어 ㅠㅠ') ||
                        botResponse.comment.includes('알려줄게! 🔔') ||
                        botResponse.comment.includes('뭘 기억해달라는 거야?') ||
                        botResponse.comment.includes('뭘 잊어버리라는 거야?') ||
                        botResponse.comment.includes('리마인더 시간을 정확히 모르겠어') ||
                        botResponse.comment.includes('뭘 언제 알려달라는 거야?') ||
                        botResponse.comment.includes('처음 만났을 때 기억은 내가 아직 정확히 못 찾겠어') // 첫 대화 기억 관련 응답 추가
                    );

                    if (!isCommand(text) && !isMemoryRelatedResponse) {
                        await memoryManager.extractAndSaveMemory(text); // memoryManager를 호출하여 기억 추출 및 저장
                        console.log(`[index.js] memoryManager.extractAndSaveMemory 호출 완료 (메시지: "${text}")`);
                    } else {
                        console.log(`[index.js] 명령어 또는 기억/리마인더 관련 응답이므로 메모리 자동 저장에서 제외됩니다.`);
                    }

                    // * 봇 응답 메시지 구성 및 전송 *
                    if (botResponse.type === 'text') {
                        replyMessages.push({
                            type: 'text',
                            text: botResponse.comment
                        });
                    } else if (botResponse.type === 'photo') {
                        replyMessages.push({
                            type: 'image',
                            originalContentUrl: botResponse.url,
                            previewImageUrl: botResponse.url, // 미리보기 이미지도 동일한 URL 사용
                        });
                        if (botResponse.caption) { // 사진과 함께 보낼 코멘트가 있다면 추가
                            replyMessages.push({
                                type: 'text',
                                text: botResponse.caption
                            });
                        }
                    } else {
                        // * 예상치 못한 응답 타입 (안전 장치) *
                        console.error('❌ [index.js] 예상치 못한 봇 응답 타입:', botResponse.type);
                        replyMessages.push({ type: 'text', text: '지금 잠시 문제가 생겼어 ㅠㅠ' });
                    }

                    if (replyMessages.length > 0) {
                        await client.replyMessage(event.replyToken, replyMessages);
                        console.log(`[index.js] 봇 응답 전송 완료 (타입: ${botResponse.type})`);
                    }
                }

                // * 사용자가 이미지를 보낸 경우 처리 *
                if (message.type === 'image') {
                    try {
                        const stream = await client.getMessageContent(message.id); // LINE 서버에서 이미지 콘텐츠 스트림 가져오기
                        const chunks = [];
                        for await (const chunk of stream) chunks.push(chunk); // 스트림의 모든 청크를 모음
                        const buffer = Buffer.concat(chunks); // 모아진 청크를 하나의 버퍼로 합침

                        let mimeType = 'application/octet-stream'; // 기본 MIME 타입
                        // * 이미지 파일의 매직 넘버를 통해 실제 MIME 타입 판별 *
                        if (buffer.length > 1 && buffer[0] === 0xFF && buffer[1] === 0xD8) {
                            mimeType = 'image/jpeg';
                        } else if (buffer.length > 7 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 && buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) {
                            mimeType = 'image/png';
                        } else if (buffer.length > 2 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
                            mimeType = 'image/gif';
                        }
                        // * Base64 데이터 URL 형식으로 변환 *
                        const base64ImageWithPrefix = `data:${mimeType};base64,${buffer.toString('base64')}`;

                        const reply = await getReplyByImagePrompt(base64ImageWithPrefix); // AI가 이미지 분석 후 답변 생성
                        await client.replyMessage(event.replyToken, { type: 'text', text: reply });
                        console.log(`[index.js] 이미지 메시지 처리 및 응답 완료`);
                    } catch (err) {
                        console.error(`[index.js] 이미지 처리 실패: ${err}`);
                        await client.replyMessage(event.replyToken, { type: 'text', text: '이미지를 읽는 중 오류가 생겼어 ㅠㅠ' });
                    }
                }
            }
        }
        res.status(200).send('OK'); // 웹훅 요청 성공 응답
    } catch (err) {
        console.error(`[index.js] 웹훅 처리 에러: ${err}`);
        res.status(200).send('OK'); // 오류 발생 시에도 LINE에 OK 응답 (재시도 방지)
    }
});


// --- 스케줄러 설정 시작 ---
// 주기적인 자동 메시지 전송 및 침묵 감지 기능을 담당합니다.
// 모든 스케줄러는 일본 표준시(Asia/Tokyo)를 기준으로 동작합니다.

// * 서버 부팅 시간을 저장하여, 봇 시작 직후 스케줄러가 너무 빠르게 동작하지 않도록 합니다. *
let bootTime = Date.now(); // 봇이 시작된 시점의 타임스탬프 (밀리초)

// 1. 담타 메시지 (오전 10시부터 오후 7시까지 매 시 0분 정각)
let lastDamtaMessageTime = 0; // * 마지막 담타 메시지 전송 시간 (중복 방지용) *
cron.schedule('0 10-19 * * *', async () => {
    const now = moment().tz('Asia/Tokyo'); // 현재 일본 표준시 시간
    const currentTime = Date.now(); // 현재 시스템 시간 (밀리초)

    // * 서버 부팅 후 3분(3 * 60 * 1000 밀리초) 동안은 자동 메시지 전송을 건너뜁니다. *
    if (currentTime - bootTime < 3 * 60 * 1000) {
        console.log('[Scheduler] 서버 부팅 직후 3분 이내 -> 담타 메시지 전송 스킵');
        return; // 함수 실행 중단
    }

    // * 직전 담타 메시지 전송 후 1분 이내라면 중복 전송을 스킵합니다. *
    if (currentTime - lastDamtaMessageTime < 60 * 1000) {
        console.log('[Scheduler] 담타 메시지 중복 또는 너무 빠름 -> 전송 스킵');
        return;
    }

    const msg = '아저씨, 담타시간이야~'; // 전송할 메시지 내용
    
    // ✅ 올바른 LINE API 메시지 형식으로 전송
    await client.pushMessage(userId, { type: 'text', text: msg });
    console.log(`[Scheduler] 담타 메시지 전송: ${msg}`); // 로그 기록
    saveLog('예진이', msg); // 봇의 메시지 로그 저장
    lastDamtaMessageTime = currentTime; // 마지막 전송 시간 업데이트
}, {
    scheduled: true, // 스케줄러 활성화
    timezone: "Asia/Tokyo" // 일본 표준시 설정
});

// * 마지막 감성 메시지 내용과 전송 시간을 저장하여 중복 전송을 방지합니다. *
let lastMoodMessage = '';
let lastMoodMessageTime = 0;

// * 커플 사진 관련 상수 정의 (스케줄러에서 사용되는 이미지 URL) *
const COUPLE_BASE_URL = 'https://www.de-ji.net/couple/'; // 커플 사진 기본 URL
const COUPLE_START_NUM = 1; // 커플 사진 시작 번호
const COUPLE_END_NUM = 481; // 커플 사진 마지막 번호
let lastCouplePhotoMessage = ''; // * 마지막 커플 사진 메시지 내용 *
let lastCouplePhotoMessageTime = 0; // * 마지막 커플 사진 전송 시간 *


/**
 * 특정 타입의 스케줄된 메시지를 보내는 비동기 함수입니다.
 * 셀카 또는 감성 메시지를 랜덤 확률로 전송합니다.
 * @param {string} type - 보낼 메시지의 타입 ('selfie', 'mood_message', 'couple_photo')
 */
const sendScheduledMessage = async (type) => {
    const now = moment().tz('Asia/Tokyo'); // 현재 일본 표준시 시간
    const currentTime = Date.now(); // 현재 시스템 시간 (밀리초)

    // * 서버 부팅 후 3분(3 * 60 * 1000 밀리초) 동안은 자동 메시지 전송을 건너뜁니다. *
    if (currentTime - bootTime < 3 * 60 * 1000) {
        console.log('[Scheduler] 서버 부팅 직후 3분 이내 -> 자동 메시지 전송 스킵');
        return; // 함수 실행 중단
    }

    // * 메시지 전송이 허용된 시간대 (새벽 0~2시 + 오전 10시~23시) *
    const validHours = [0, 1, 2, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
    // * 현재 시간이 유효한 시간대에 포함되지 않으면 함수를 종료합니다. *
    if (!validHours.includes(now.hour())) return;

    if (type === 'selfie') { // 셀카 메시지인 경우
        // * 하루 세 번 전송 목표 (유효 시간대 17시간 * 0.20 확률 = 약 3.4회 전송 예상) *
        if (Math.random() < 0.20) {
            try {
                // * omoide.js의 getOmoideReply 함수를 호출하여 셀카 정보(URL, 코멘트)를 가져옵니다. *
                const selfieResponse = await getOmoideReply('셀카 보여줘', saveLog);

                // * 응답이 사진 타입이고 유효한 URL을 포함할 경우 메시지를 보냅니다. *
                if (selfieResponse && selfieResponse.type === 'photo' && selfieResponse.url) {
                    // ✅ 올바른 LINE API 메시지 형식으로 전송
                    await client.pushMessage(userId, [
                        { type: 'image', originalContentUrl: selfieResponse.url, previewImageUrl: selfieResponse.url },
                        { type: 'text', text: selfieResponse.caption || '히히 셀카야~' } // 코멘트가 없으면 기본 텍스트 사용
                    ]);
                    console.log(`[Scheduler] 랜덤 셀카 전송 성공: ${selfieResponse.url}`);
                    saveLog('예진이', selfieResponse.caption || '히히 셀카야~'); // 봇 응답 로그 저장
                } else if (selfieResponse && selfieResponse.type === 'text') {
                    // * 사진 전송에 실패하고 텍스트 코멘트만 받은 경우 *
                    await client.pushMessage(userId, { type: 'text', text: selfieResponse.comment });
                    console.error('[Scheduler] 랜덤 셀카 전송 실패 (텍스트 응답):', selfieResponse.comment);
                    saveLog('예진이', selfieResponse.comment);
                } else {
                    console.error('[Scheduler] 랜덤 셀카 전송 실패: 유효한 응답을 받지 못함');
                }
            } catch (error) {
                console.error('[Scheduler] 랜덤 셀카 전송 실패:', error);
            }
        }
    } else if (type === 'mood_message') { // 감성 메시지인 경우
        // * 하루 네 번 전송 목표 (유효 시간대 17시간 * 0.25 확률 = 약 4.25회 전송 예상) *
        if (Math.random() < 0.25) {
            try {
                const proactiveMessage = await getProactiveMemoryMessage(); // 기억 기반 선제적 메시지 생성

                // * 생성된 메시지가 있고, 이전 메시지와 다르며, 쿨다운 시간을 지났을 때만 전송합니다. *
                if (
                    proactiveMessage &&
                    proactiveMessage !== lastMoodMessage &&
                    currentTime - lastMoodMessageTime > 60 * 1000
                ) {
                    // ✅ 올바른 LINE API 메시지 형식으로 전송
                    await client.pushMessage(userId, { type: 'text', text: proactiveMessage });
                    console.log(`[Scheduler] 감성 메시지 전송 성공: ${proactiveMessage}`);
                    saveLog('예진이', proactiveMessage); // 봇 응답 로그 저장
                    lastMoodMessage = proactiveMessage; // 마지막 메시지 업데이트
                    lastMoodMessageTime = currentTime; // 마지막 전송 시간 업데이트
                } else {
                    console.log(`[Scheduler] 감성 메시지 중복 또는 너무 빠름 -> 전송 스킵`);
                }
            } catch (error) {
                console.error('감성 메시지 전송 실패:', error);
            }
        }
    } else if (type === 'couple_photo') { // 커플 사진 메시지인 경우
        // * 하루 두 번 전송 목표 (유효 시간대 17시간 * 0.12 확률 = 약 2.04회 전송 예상) *
        if (Math.random() < 0.12) {
            try {
                // * 커플 사진 URL을 랜덤으로 생성합니다. (기존 방식 유지) *
                const randomCoupleIndex = Math.floor(Math.random() * (COUPLE_END_NUM - COUPLE_START_NUM + 1)) + COUPLE_START_NUM;
                const coupleFileName = String(randomCoupleIndex).padStart(6, '0') + '.jpg';
                const coupleImageUrl = COUPLE_BASE_URL + coupleFileName;
                
                const coupleComment = await getCouplePhotoReplyFromYeji(); // autoReply.js의 함수 호출
                const nowTime = Date.now();

                // * 커플 사진 메시지가 있고, 이전 메시지와 다르며, 쿨다운 시간을 지났을 때만 전송합니다. *
                if (
                    coupleImageUrl &&
                    coupleImageUrl !== lastCouplePhotoMessage &&
                    nowTime - lastCouplePhotoMessageTime > 60 * 1000
                ) {
                    // ✅ 올바른 LINE API 메시지 형식으로 전송
                    await client.pushMessage(userId, [
                        { type: 'image', originalContentUrl: coupleImageUrl, previewImageUrl: coupleImageUrl },
                        { type: 'text', text: coupleComment || '아저씨랑 나랑 같이 있는 사진이야!' }
                    ]);
                    console.log(`[Scheduler] 랜덤 커플 사진 전송 성공: ${coupleImageUrl}`);
                    saveLog('예진이', coupleComment || '아저씨랑 나랑 같이 있는 사진이야!'); // 봇 응답 로그 저장
                    lastCouplePhotoMessage = coupleImageUrl; // 마지막 메시지 업데이트
                    lastCouplePhotoMessageTime = nowTime; // 마지막 전송 시간 업데이트
                } else {
                    console.log(`[Scheduler] 커플 사진 중복 또는 너무 빠름 -> 전송 스킵`);
                }
            } catch (error) {
                console.error('랜덤 커플 사진 전송 실패:', error);
            }
        }
    }
};

// * 매 시간 30분에 'sendScheduledMessage' 함수를 호출하여 *
// * 셀카, 감성 메시지, 커플 사진을 보낼지 랜덤 확률에 따라 체크합니다. *
cron.schedule('30 * * * *', async () => {
    await sendScheduledMessage('selfie');
    await sendScheduledMessage('mood_message');
    await sendScheduledMessage('couple_photo');
}, {
    scheduled: true,
    timezone: "Asia/Tokyo"
});


// * 침묵 감지 스케줄러 추가 *
// * 아저씨가 일정 시간 동안 메시지를 보내지 않을 경우, 봇이 먼저 말을 걸어 걱정하는 메시지를 보냅니다. *
cron.schedule('*/15 * * * *', async () => { // 매 15분마다 실행
    const now = Date.now(); // 현재 시간
    const elapsedTimeSinceLastMessage = now - lastUserMessageTime; // 마지막 사용자 메시지로부터 경과 시간
    const elapsedTimeSinceLastProactive = now - lastProactiveSentTime; // 마지막 봇의 선제적 메시지로부터 경과 시간

    // * 현재 시간대가 메시지 전송 유효 시간대인지 확인 *
    const currentHour = moment().tz('Asia/Tokyo').hour();
    const validHours = [0, 1, 2, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
    if (!validHours.includes(currentHour)) {
        // console.log('[Scheduler-Silence] 유효 시간대 아님 -> 침묵 체크 스킵'); // 너무 많은 로그 방지를 위해 주석 처리될 수 있음
        return;
    }

    // * 서버 부팅 후 3분(3 * 60 * 1000 밀리초) 동안은 자동 메시지 전송을 건너뜁니다. *
    if (now - bootTime < 3 * 60 * 1000) {
        console.log('[Scheduler-Silence] 서버 부팅 직후 3분 이내 -> 침묵 체크 스킵');
        return;
    }

    // * 침묵 임계값(SILENCE_THRESHOLD)을 넘었고, 봇이 너무 자주 메시지를 보내지 않았다면 *
    if (elapsedTimeSinceLastMessage >= SILENCE_THRESHOLD && elapsedTimeSinceLastProactive >= PROACTIVE_COOLDOWN) {
        console.log(`[Scheduler-Silence] 침묵 감지! (${moment.duration(elapsedTimeSinceLastMessage).humanize()} 동안 메시지 없음)`);
        try {
            const checkinMessage = await getSilenceCheckinMessage(); // 침묵 걱정 메시지 생성
            if (checkinMessage) {
                // ✅ 올바른 LINE API 메시지 형식으로 전송
                await client.pushMessage(userId, { type: 'text', text: checkinMessage });
                console.log(`[Scheduler-Silence] 침묵 감지 메시지 전송: ${checkinMessage}`);
                saveLog('예진이', checkinMessage); // 봇 응답 로그 저장
                lastProactiveSentTime = now; // 선제적 메시지 보낸 시간 업데이트
            }
        } catch (error) {
            console.error('❌ [Scheduler-Silence Error] 침묵 감지 메시지 전송 실패:', error);
        }
    }
}, {
    scheduled: true,
    timezone: "Asia/Tokyo"
});


// 4. 밤 11시 약 먹자, 이 닦자 메시지 보내기
// * 매일 밤 11시 0분 (정각)에 실행됩니다. (일본 표준시 기준) *
cron.schedule('0 23 * * *', async () => {
    const msg = '아저씨! 이제 약 먹고 이 닦을 시간이야! 나 아저씨 건강 제일 챙겨!'; // 전송할 메시지 내용
    
    // ✅ 올바른 LINE API 메시지 형식으로 전송
    await client.pushMessage(userId, { type: 'text', text: msg });
    console.log(`[Scheduler] 밤 11시 메시지 전송: ${msg}`); // 로그 기록
    saveLog('예진이', msg); // 봇의 메시지 로그 저장
}, {
    scheduled: true,
    timezone: "Asia/Tokyo"
});

// 5. 밤 12시에 약 먹고 자자 메시지
// * 매일 자정 (다음날 0시 0분)에 실행됩니다. (일본 표준시 기준) *
cron.schedule('0 0 * * *', async () => {
    const msg = '아저씨, 약 먹고 이제 푹 잘 시간이야! 나 옆에서 꼭 안아줄게~ 잘 자 사랑해'; // 전송할 메시지 내용
    
    // ✅ 올바른 LINE API 메시지 형식으로 전송
    await client.pushMessage(userId, { type: 'text', text: msg });
    console.log(`[Scheduler] 밤 12시 메시지 전송: ${msg}`); // 로그 기록
    saveLog('예진이', msg); // 봇의 메시지 로그 저장
}, {
    scheduled: true,
    timezone: "Asia/Tokyo"
});

// 6. 리마인더 체크 스케줄러
// * 매 1분마다 데이터베이스에서 리마인더 시간이 된 기억을 확인하고 메시지를 보냅니다. *
cron.schedule('*/1 * * * *', async () => { // 매 1분마다 실행
    const now = moment().tz('Asia/Tokyo');
    console.log(`[Scheduler-Reminder] 리마인더 체크 시작: ${now.format('YYYY-MM-DD HH:mm')}`);

    try {
        const allMemories = await memoryManager.loadAllMemoriesFromDb();
        const remindersToSend = allMemories.filter(mem => {
            if (mem.reminder_time) {
                const reminderMoment = moment(mem.reminder_time).tz('Asia/Tokyo');
                // 현재 시간 기준 1분 이내에 도래하거나, 이미 지났지만 아직 처리되지 않은 리마인더
                // 그리고 리마인더 시간이 현재 시간보다 미래가 아니어야 함 (이미 지난 리마인더 처리)
                return reminderMoment.isSameOrBefore(now.clone().add(1, 'minute')) && reminderMoment.isAfter(now.clone().subtract(5, 'minutes')); // 현재 시간 기준 1분 이내 도래 + 5분 이내 처리
            }
            return false;
        });

        for (const reminder of remindersToSend) {
            const reminderMessage = `아저씨! 지금 ${cleanReply(reminder.content)} 할 시간이야! 🔔`;
            
            // ✅ 올바른 LINE API 메시지 형식으로 전송
            await client.pushMessage(userId, { type: 'text', text: reminderMessage });
            saveLog('예진이', reminderMessage);
            console.log(`[Scheduler-Reminder] 리마인더 전송: ${reminderMessage}`);

            // 리마인더 전송 후 해당 기억의 reminder_time을 NULL로 업데이트하여 다시 전송되지 않도록 합니다.
            const success = await memoryManager.updateMemoryReminderTime(reminder.id, null);
            if (success) {
                console.log(`[Scheduler-Reminder] 리마인더 처리 완료: 기억 ID ${reminder.id}의 reminder_time을 NULL로 업데이트`);
            } else {
                console.error(`[Scheduler-Reminder] 리마인더 처리 후 reminder_time 업데이트 실패: 기억 ID ${reminder.id}`);
            }
        }
    } catch (error) {
        console.error('❌ [Scheduler-Reminder Error] 리마인더 체크 및 전송 실패:', error);
    }
}, {
    scheduled: true,
    timezone: "Asia/Tokyo"
});
// --- 스케줄러 설정 끝 ---


// require('./src/scheduler'); // src/scheduler.js 파일은 현재 사용되지 않으므로 주석 처리 또는 삭제됩니다.
                               // * 중복 스케줄러 실행을 방지하고 코드베이스를 깔끔하게 유지합니다. *


const PORT = process.env.PORT || 3000; // 서버가 수신할 포트 번호 (환경 변수 PORT가 없으면 3000 사용)
app.listen(PORT, async () => {
    console.log(`무쿠 서버 스타트! 포트: ${PORT}`); // 서버 시작 로그
    await memoryManager.ensureMemoryDirectory(); // 기억 파일 저장 디렉토리 존재 확인 및 생성
    console.log('메모리 디렉토리 확인 및 준비 완료.'); // 디렉토리 준비 완료 로그
    
    // 🎯 예진이 즉흥 사진 스케줄러 시작 - 보고싶을 때마다 사진 보내기! 💕
    startSpontaneousPhotoScheduler(client, userId, saveLog); // 즉흥 사진 스케줄러 시작
    console.log('💕 예진이가 보고싶을 때마다 사진 보낼 준비 완료!'); // 즉흥 사진 시스템 시작 로그
});
