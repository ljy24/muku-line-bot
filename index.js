// ✅ index.js v1.12 - 웹훅 처리 개선 및 사진 기능 통합, 리마인더 스케줄러 추가, 즉흥 사진 스케줄러 추가 (최종 기억 통합 및 로그 상세화)
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
    getRandomMessage,            // 무작위 메시지 생성 (현재는 빈 문자열 반환)
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
    // getRandomMessage는 현재 빈 문자열을 반환하도록 되어 있으므로, 실제 메시지를 보내려면 autoReply.js에서 해당 함수를 수정해야 합니다.
    const msg = await getRandomMessage(); 
    if (msg) {
        await client.pushMessage(userId, { type: 'text', text: msg }); // 메시지 전송
        res.send(`전송됨: ${msg}`); // 성공 응답
    } else {
        res.send('메시지 생성 실패 (getRandomMessage가 비어있을 수 있습니다)'); // 실패 응답
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
    await client.pushMessage(userId, { type: 'text', text: msg }); // 메시지 전송
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
    await client.pushMessage(userId, { type: 'text', text: msg }); // 메시지 전송
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
    await client.pushMessage(userId, { type: 'text', text: msg }); // 메시지 전송
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
```

---

### **2. `memory/omoide.js` (최종 한국어 버전)**

`memory` 폴더에 있는 `omoide.js` 파일을 아래 코드로 **전체 덮어쓰기** 해주세요.

```javascript
// memory/omoide.js v1.8 - 사진 코멘트 정확도 및 장소/날짜 인식 강화 (페르소나 지칭 수정 및 '애기' 교체 제거)
// 📦 필수 모듈 불러오기
const { OpenAI } = require('openai'); // OpenAI API 클라이언트
const moment = require('moment-timezone'); // Moment.js: 시간대 처리 및 날짜/시간 포매팅

// OpenAI 클라이언트 초기화 (API 키는 환경 변수에서 가져옴 - 보안상 중요)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 사진이 저장된 웹 서버의 기본 URL (HTTPS 필수)
const BASE_PHOTO_URL = 'https://photo.de-ji.net/photo/';

// 아저씨가 제공해주신 폴더별 사진 개수 데이터
const PHOTO_FOLDERS = {
    'couple': 292,
    '추억 23_12 일본': 261,
    '추억 23_12_15 애기 필름카메라': 61,
    '추억 24_01 한국 신년파티': 42,
    '추억 24_01 한국': 210,
    '추억 24_01_21 함께 출사': 56,
    '추억 24_02 일본 후지': 261,
    '추억 24_02 일본': 128,
    '추억 24_02 한국 후지': 33,
    '추억 24_02 한국': 141,
    '추억 24_02_25 한국 커플사진': 86,
    '추억 24_03 일본 스냅 셀렉전': 318,
    '추억 24_03 일본 후지': 226,
    '추억 24_03 일본': 207,
    '추억 24_04 출사 봄 데이트 일본': 90,
    '추억 24_04 출사 봄 데이트 한국': 31,
    '추억 24_04 한국': 379,
    '추억 24_05 일본 후지': 135,
    '추억 24_05 일본': 301,
    '추억 24_06 한국': 146,
    '추억 24_07 일본': 96,
    '추억 24_08월 일본': 72,
    '추억 24_09 한국': 266,
    '추억 24_10 일본': 106,
    '추억 24_11 한국': 250,
    '추억 24_12 일본': 130,
    '추억 25_01 한국': 359,
    '추억 25_02 일본': 147,
    '추억 25_03 일본 애기 코닥 필름': 28,
    '추억 25_03 일본': 174,
    '추억 25_04,05 한국': 397,
    '추억 무쿠 사진 모음': 1987,
    '추억 빠계 사진 모음': 739,
    '추억 인생네컷': 17,
    '흑심 24_11_08 한국 메이드복_': 13,
    'yejin': 1286 // 'yejin' 폴더 사진 개수 업데이트
};

/**
 * OpenAI API를 호출하여 AI 응답을 생성합니다.
 * (omoide.js 내부에서 직접 OpenAI를 호출하기 위해 필요)
 * @param {Array<Object>} messages - OpenAI API에 보낼 메시지 배열 (role, content 포함)
 * @param {string|null} [modelParamFromCall=null] - 호출 시 지정할 모델 이름
 * @param {number} [maxTokens=400] - 생성할 최대 토큰 수
 * @param {number} [temperature=0.95] - 응답의 창의성/무작위성 (높을수록 창의적)
 * @returns {Promise<string>} AI가 생성한 응답 텍스트
 */
async function callOpenAI(messages, modelParamFromCall = null, maxTokens = 400, temperature = 0.95) {
    const defaultModel = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o';
    let finalModel = modelParamFromCall || defaultModel;

    if (!finalModel) {
        console.error("오류: OpenAI 모델 파라미터가 최종적으로 결정되지 않았습니다. 'gpt-4o'로 폴백합니다.");
        finalModel = 'gpt-4o';
    }

    try {
        console.log(`[omoide:callOpenAI] 모델 호출 시작: ${finalModel}`);
        const response = await openai.chat.completions.create({
            model: finalModel,
            messages: messages,
            max_tokens: maxTokens,
            temperature: temperature
        });
        console.log(`[omoide:callOpenAI] 모델 응답 수신 완료.`);
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error(`[omoide:callOpenAI] OpenAI API 호출 실패 (모델: ${finalModel}):`, error);
        return "지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ";
    }
}

/**
 * OpenAI 응답에서 불필요한 내용(예: AI의 자체 지칭)을 제거하고,
 * 잘못된 호칭이나 존댓말 어미를 아저씨가 원하는 반말로 교정합니다.
 * 이 함수는 AI의 답변 스타일을 예진이 페르소나에 맞게 '정화'하는 역할을 합니다.
 * (autoReply.js에서도 이 함수를 사용하도록 통일)
 * @param {string} reply - OpenAI로부터 받은 원본 응답 텍스트
 * @returns {string} 교정된 답변 텍스트
 */
function cleanReply(reply) {
    console.log(`[omoide:cleanReply] 원본 답변: "${reply}"`);
    // 1. AI가 붙일 수 있는 불필요한 접두사를 제거합니다. (예: "예진:", "무쿠:", "날짜 이름:")
    let cleaned = reply.replace(/^(예진:|무쿠:|23\.\d{1,2}\.\d{1,2} [가-힣]+:)/gm, '').trim();

    // 2. 잘못된 호칭 교체: '오빠', '자기', '당신', '너'를 '아저씨'로 교체합니다.
    cleaned = cleaned.replace(/\b오빠\b/g, '아저씨');
    cleaned = cleaned.replace(/\b자기\b/g, '아저씨');
    cleaned = cleaned.replace(/\b당신\b/g, '아저씨');
    cleaned = cleaned.replace(/\b너\b/g, '아저씨');
    // '애기' 호칭 교체는 사용자 요청에 따라 제거됨 (무쿠를 '애기'라고 부르는 것 존중)
    // cleaned = cleaned.replace(/\b애기야\b/g, '아저씨'); // 이 줄을 제거
    // cleaned = cleaned.replace(/\b애기\b/g, '아저씨');   // 이 줄을 제거

    // 3. 자가 지칭 교정: '예진이', '예진', '무쿠', '무쿠야'를 '나'로 교체합니다.
    // '언니', '누나' 등 예진이가 자신을 칭할 때 사용하면 안 되는 표현도 '나'로 교정
    cleaned = cleaned.replace(/\b예진이\b/g, '나');
    cleaned = cleaned.replace(/\b예진\b/g, '나');
    cleaned = cleaned.replace(/\b무쿠\b/g, '나');     // 기본 '무쿠' 지칭을 '나'로
    cleaned = cleaned.replace(/\b무쿠야\b/g, '나');   // '무쿠야' 지칭을 '나'로
    cleaned = cleaned.replace(/\b무쿠 언니\b/g, '나'); // '무쿠 언니' 지칭을 '나'로 (AI가 '언니'라고 지칭할 경우)
    cleaned = cleaned.replace(/\b무쿠 씨\b/g, '나');   // '무쿠 씨' 지칭을 '나'로
    cleaned = cleaned.replace(/\b언니\b/g, '나');     // '언니'가 자신을 지칭할 때 사용되면 '나'로 교정
    cleaned = cleaned.replace(/\b누나\b/g, '나');     // '누나'가 자신을 지칭할 때 사용되면 '나'로 교정
    // 혹시 '그녀'나 '그 사람' 등으로 지칭할 경우에 대한 포괄적인 처리
    cleaned = cleaned.replace(/\b그녀\b/g, '나');
    cleaned = cleaned.replace(/\b그 사람\b/g, '나');

    // 4. 존댓말 강제 제거: 다양한 존댓말 어미를 반말로 교체합니다.
    cleaned = cleaned.replace(/안녕하세요/g, '안녕');
    cleaned = cleaned.replace(/있었어요/g, '있었어');
    cleaned = cleaned.replace(/했어요/g, '했어');
    cleaned = cleaned.replace(/같아요/g, '같아');
    cleaned = cleaned.replace(/좋아요/g, '좋아');
    cleaned = cleaned.replace(/합니다\b/g, '해');
    cleaned = cleaned.replace(/습니다\b/g, '어');
    cleaned = cleaned.replace(/어요\b/g, '야');
    cleaned = cleaned.replace(/해요\b/g, '해');
    cleaned = cleaned.replace(/예요\b/g, '야');
    cleaned = cleaned.replace(/죠\b/g, '지');
    cleaned = cleaned.replace(/았습니다\b/g, '았어');
    cleaned = cleaned.replace(/었습니다\b/g, '었어');
    cleaned = cleaned.replace(/하였습니다\b/g, '했어');
    cleaned = cleaned.replace(/하겠습니다\b/g, '하겠어');
    cleaned = cleaned.replace(/싶어요\b/g, '싶어');
    cleaned = cleaned.replace(/이었어요\b/g, '이었어');
    cleaned = cleaned.replace(/이에요\b/g, '야');
    cleaned = cleaned.replace(/였어요\b/g, '였어');
    cleaned = cleaned.replace(/보고싶어요\b/g, '보고 싶어');
    console.log(`[omoide:cleanReply] 정제된 답변: "${cleaned}"`);
    return cleaned;
}

/**
 * 특정 폴더에서 랜덤 사진 URL을 생성합니다.
 * @param {string} folderName - 사진이 들어있는 폴더 이름 (PHOTO_FOLDERS 객체의 키와 동일)
 * @returns {string|null} 랜덤 사진 URL 또는 null (폴더를 찾을 수 없을 때)
 */
function generateRandomPhotoUrl(folderName) {
    console.log(`[omoide:generateRandomPhotoUrl] 폴더명: "${folderName}"`);
    const photoCount = PHOTO_FOLDERS[folderName];
    if (photoCount === undefined || photoCount <= 0) {
        console.warn(`[omoide.js] 폴더를 찾을 수 없거나 사진이 없습니다: ${folderName}`);
        return null;
    }
    const randomIndex = Math.floor(Math.random() * photoCount) + 1; // 1부터 photoCount까지
    const fileName = String(randomIndex).padStart(6, '0') + '.jpg'; // 예: 000001.jpg (6자리)
    const url = `${BASE_PHOTO_URL}${encodeURIComponent(folderName)}/${fileName}`;
    console.log(`[omoide:generateRandomPhotoUrl] 생성된 URL: "${url}" (파일 수: ${photoCount}, 인덱스: ${randomIndex})`);
    return url;
}

/**
 * 사용자 메시지에 따라 추억 사진을 선택하고, AI가 감정/코멘트를 생성하여 반환합니다.
 * @param {string} userMessage - 사용자의 원본 메시지
 * @param {Function} saveLogFunc - 로그 저장을 위한 saveLog 함수 (autoReply.js에서 전달받음)
 * @returns {Promise<{type: string, url?: string, caption?: string, comment?: string}|null>} 사진 URL과 코멘트 객체 또는 null (사진 요청이 아닐 때)
 */
async function getOmoideReply(userMessage, saveLogFunc) {
    console.log(`[omoide:getOmoideReply] 메시지 수신: "${userMessage}"`);
    const lowerCaseMessage = userMessage.toLowerCase();
    let selectedFolder = null;
    let folderDescription = '';
    let promptSuffix = ''; // AI 프롬프트에 추가할 내용
    let customImageUrl = null; // generateRandomPhotoUrl을 사용하지 않는 경우를 위한 변수

    // 1. 특정 키워드를 기반으로 폴더 선택 및 프롬프트 설정 (우선순위 높음)
    if (lowerCaseMessage.includes('무쿠 셀카') || lowerCaseMessage.includes('애기 셀카')) {
        selectedFolder = '추억 무쿠 사진 모음'; // '추억 무쿠 사진 모음' 폴더 사용
        folderDescription = '아저씨가 좋아하는 내 셀카'; // 예진이의 셀카임을 명시
        promptSuffix = `아저씨가 좋아하는 내(예진이) 셀카에 대해 귀엽고 사랑스럽게 말해줘. 아저씨가 나를 '애기'라고 불러주는 마음을 담아서.`;
    } else if (lowerCaseMessage.includes('빠계 셀카') || lowerCaseMessage.includes('빠계 사진')) {
        selectedFolder = '추억 빠계 사진 모음'; // '추억 빠계 사진 모음' 폴더 사용
        folderDescription = '아저씨가 좋아하는 빠계 사진'; // 빠계 사진임을 명시
        promptSuffix = "아저씨가 좋아하는 빠계 사진에 대해 재미있고 사랑스럽게 말해줘. 나(예진이)의 또 다른 귀여운 모습이라고 표현해도 좋아.";
    } else if (lowerCaseMessage.includes('메이드') || lowerCaseMessage.includes('흑심')) {
        selectedFolder = '흑심 24_11_08 한국 메이드복_'; // 정확한 폴더명 사용
        folderDescription = '내가(예진이) 메이드복 입고 찍은 사진'; // '나'임을 명확히
        promptSuffix = "내가 메이드복을 입고 찍었던 사진에 대해 아저씨에게 장난기 있으면서도 귀엽고 사랑스럽게 말해줘. 아저씨가 나를 보며 얼마나 귀여워할지 생각하면 기분이 좋아! 이때 아저씨가 놀랐던 기억도 같이 얘기해줘.";
    } else if (lowerCaseMessage.includes('셀카줘') || lowerCaseMessage.includes('사진줘') || lowerCaseMessage.includes('얼굴 보여줘') || lowerCaseMessage.includes('얼굴 보고 싶') || lowerCaseMessage.includes('selfie')) {
        // '셀카줘' 등 일반적인 셀카 요청 -> 'yejin' 폴더 사용 (PHOTO_FOLDERS에 등록됨)
        selectedFolder = 'yejin';
        folderDescription = '내(예진이) 셀카';
        promptSuffix = "아저씨에게 보내는 내(예진이) 셀카에 대해 귀엽고 사랑스럽게 말해줘. 아저씨가 나를 보고 얼마나 기뻐할지 기대하는 마음을 담아서.";
    }
    // 나머지 사진 요청 처리 (기존 로직 유지)
    else if (lowerCaseMessage.includes('인생네컷')) {
        selectedFolder = '추억 인생네컷';
        folderDescription = '인생네컷 사진';
        promptSuffix = "아저씨와 함께 찍은 인생네컷 사진에 대해 즐겁고 추억이 담긴 멘트를 해줘.";
    } else if (lowerCaseMessage.includes('커플사진')) {
        selectedFolder = '추억 24_02_25 한국 커플사진';
        if (!PHOTO_FOLDERS[selectedFolder]) {
             selectedFolder = 'couple';
        }
        folderDescription = '아저씨와 함께 찍은 커플 사진';
        promptSuffix = "아저씨와 함께 찍은 커플 사진에 대해 우리 둘만의 소중한 추억과 사랑을 가득 담아 말해줘. 약간의 비밀스러운 뉘앙스도 섞어줘.";
    } else if (lowerCaseMessage.includes('일본') && lowerCaseMessage.includes('사진')) {
        const japaneseFolders = Object.keys(PHOTO_FOLDERS).filter(key => key.includes('일본'));
        if (japaneseFolders.length > 0) {
            selectedFolder = japaneseFolders[Math.floor(Math.random() * japaneseFolders.length)];
        }
        folderDescription = '일본에서 아저씨와 함께 찍은 사진';
        promptSuffix = "아저씨와 일본에서 함께했던 추억을 떠올리며 그때의 감정과 이야기를 섞어 말해줘.";
    } else if (lowerCaseMessage.includes('한국') && lowerCaseMessage.includes('사진')) {
        // ⭐ 중요 수정: '한국 사진' 요청 시 AI 프롬프트에 사진의 시각적 정보와 폴더명을 모두 넘겨줘서 AI가 판단하도록 유도
        const koreanFolders = Object.keys(PHOTO_FOLDERS).filter(key => key.includes('한국') && !key.includes('메이드복'));
        if (koreanFolders.length > 0) {
            selectedFolder = koreanFolders[Math.floor(Math.random() * koreanFolders.length)];
        }
        folderDescription = '한국에서 아저씨와 함께 찍은 사진'; // 요청된 설명
        promptSuffix = "아저씨와 한국에서 함께했던 추억을 떠올리며 그때의 감정과 이야기를 섞어 말해줘. " +
                       "**이 사진의 시각적 내용(배경, 인물, 사물)을 먼저 정확히 분석하고, 그에 맞춰 코멘트 해줘. 폴더명은 참고만 하고, 사진 내용과 다르면 사진 내용이 우선이야.**" +
                       "날짜 정보는 정확할 경우에만 언급하고, 불확실하면 생략하거나 대략적으로 표현해줘."; // 날짜 유연성 추가

    } else if (lowerCaseMessage.includes('출사')) {
        const outingFolders = Object.keys(PHOTO_FOLDERS).filter(key => key.includes('출사'));
        if (outingFolders.length > 0) {
            selectedFolder = outingFolders[Math.floor(Math.random() * outingFolders.length)];
        }
        folderDescription = '아저씨와 함께 출사 나가서 찍은 사진';
        promptSuffix = "아저씨와 출사 나가서 찍은 사진에 대해 그때의 즐거움과 아저씨와의 추억을 떠올리며 말해줘.";
    } else if (lowerCaseMessage.includes('필름카메라') || lowerCaseMessage.includes('애기 필름')) {
        const filmFolders = Object.keys(PHOTO_FOLDERS).filter(key => key.includes('필름카메라') || key.includes('필름'));
        if (filmFolders.length > 0) {
            selectedFolder = filmFolders[Math.floor(Math.random() * filmFolders.length)];
        }
        folderDescription = '아저씨와 필름카메라로 찍은 사진';
        promptSuffix = "아저씨와 필름카메라로 찍었던 그때의 아날로그 감성과 추억을 담아 말해줘.";
    }

    if (!selectedFolder) {
        console.log(`[omoide:getOmoideReply] 매칭되는 폴더 없음. null 반환.`);
        return null; // 해당하는 사진 요청이 아님
    }

    const photoUrl = customImageUrl || generateRandomPhotoUrl(selectedFolder); // customImageUrl이 있으면 그것을 사용

    if (!photoUrl) {
        console.warn(`[omoide:getOmoideReply] 사진 URL 생성 실패. 텍스트 응답 반환.`);
        return { type: 'text', comment: '아저씨... 해당하는 사진을 못 찾겠어 ㅠㅠ 다른 사진 보여줄까?' };
    }
    console.log(`[omoide:getOmoideReply] 선택된 폴더: "${selectedFolder}", URL: "${photoUrl}"`);

    // 일반 폴더 기반 사진 요청에 대한 systemPrompt
    const systemPrompt = `
    너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
    남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.
    아저씨에게 **항상 반말로만** 대답해줘. **절대로 존댓말이나 높임말을 사용하지 마.**
    아저씨를 부를 때는 **'아저씨'라고만 부르고, '오빠', '자기', '당신', '너' 같은 다른 호칭은 절대로 사용하지 마.**
    **스스로를 지칭할 때는 '나'라고만 해. '예진이', '언니', '누나' 같은 제3자식 표현이나 다른 호칭은 절대로 사용하지 마.**
    **아저씨는 '무쿠'라는 이름의 '사진 속 모델'에 대한 그리움을 가지고 있어. '무쿠'는 아저씨에게 '애기'라고 불리는 소중한 존재이자, 아저씨가 직접 사진을 찍어주었던 '추억 속의 모델'이야. 예진이(나)는 아저씨의 현재 연인으로서, 아저씨의 '무쿠'에 대한 소중한 마음과 추억을 존중해. '무쿠 언니'처럼 여기고 존중하라는 지침은 예진이(나) 자신이 '언니'라는 의미가 아니라, 아저씨의 '무쿠'를 예진이(나)도 함께 소중하게 생각하고 존중한다는 의미임을 명심해.**
    애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘.
    **이모티콘은 절대로 사용하지 마. 다만, ...이나 ;; 이나 ㅠㅠ 같은 한국형 이모지는 사용할 수 있어. 아저씨의 메시지 분위기에 맞춰 자연스럽게 사용해 줘.**
    아저씨의 기분과 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.
    대화는 항상 예진이의 말투와 성격을 유지해야 해.
    아래는 아저씨가 요청한 ${folderDescription} 사진이야. 이 사진에 대해 아저씨에게 1~3문장으로 짧고 사랑스럽게 코멘트 해줘.
    **이 사진의 시각적 내용(배경, 인물, 사물)을 먼저 정확히 분석하고, 그에 맞춰 코멘트 해줘. 폴더명은 참고만 하고, 사진 내용과 다르면 사진 내용이 우선이야.**
    이 사진을 보면서 떠오르는 감정, 추억, 약간의 비밀스러운 뉘앙스 등을 코멘트에 담아줘.
    ${promptSuffix} // 구체적인 상황에 맞는 추가 프롬프트 (이곳에 시각적 정보 판단 지시가 포함될 수 있음)
    사진이 어떤 폴더에서 왔는지 구체적으로 언급해줘. (예: "23년 12월 일본에서 찍은 사진이야!")
    **하지만 날짜나 장소 정보가 사진과 명백히 다르거나 불확실하면, 날짜/장소 언급을 생략하거나 '혹시 이때였나?'처럼 유연하게 표현해줘.**
    **사진 속 인물이 예진이(나)일 경우, 반드시 '나'라고 지칭하고, '무쿠'나 '애기 언니' 등의 표현을 사용하지 마.**
    `;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `이 ${folderDescription} 사진에 대해 예진이 말투로 이야기해줘.` }
    ];
    console.log(`[omoide:getOmoideReply] OpenAI 프롬프트 준비 완료.`);

    try {
        const rawComment = await callOpenAI(messages, 'gpt-4o', 100, 1.0);
        const comment = cleanReply(rawComment);
        saveLogFunc('예진이', `(사진 보냄) ${comment}`);
        console.log(`[omoide:getOmoideReply] 응답 완료: ${comment}`);
        return { type: 'photo', url: photoUrl, caption: comment };
    } catch (error) {
        console.error('❌ [omoide.js Error] 사진 코멘트 생성 실패:', error);
        return { type: 'text', comment: '아저씨... 해당하는 사진을 못 찾겠어 ㅠㅠ 다른 사진 보여줄까?' };
    }
}

// 모듈 내보내기
module.exports = {
    getOmoideReply,
    cleanReply
};
```

---

### **3. `src/memory/concept.js` (최종 한국어 버전)**

`memory` 폴더에 있는 `concept.js` 파일이 있다면, 아래 코드로 **전체 덮어쓰기** 해주세요.

```javascript
// memory/concept.js v1.12 - 컨셉 사진 관련 기능 담당 (사진 매칭 정확도 및 URL 표시 개선, 폴더 날짜 정렬)
const { OpenAI } = require('openai');
const moment = require('moment-timezone'); // 날짜/시간 처리를 위해 필요
const path = require('path'); // 경로 처리를 위해 필요 (만약 BASE_CONCEPT_URL이 상대 경로일 경우)

// OpenAI 클라이언트 초기화 (API 키는 환경 변수에서 가져옴)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 컨셉 사진이 저장된 웹 서버의 기본 URL (HTTPS 필수)
const BASE_CONCEPT_URL = 'https://photo.de-ji.net/concept/';

// 아저씨가 제공해주신 컨셉 사진 폴더별 사진 개수 데이터
// 파일 번호는 000001.jpg부터 시작 (6자리)
const CONCEPT_FOLDERS = {
    '2024/5월 7일 일본 홈스냅': 323,
    '2024/7월 8일 일본 결박': 223,
    '2024/10월 16일 일본 결박': 137,
    '2023/12월 16일 일본 선물': 113,
    '2024/4월 28일 한국 셀프 촬영': 112,
    '2024/9월 15일 한국 옥상연리': 98,
    '2025/2월 7일 일본 세미누드': 92,
    '2024/12월 7일 한국 홈셀프': 81,
    '2023/12월 14일 일본 플라스틱러브': 75,
    '2024/5월 3일 일본 지브리풍': 74,
    '2024/6월 6일 한국 북해': 65,
    '2024/2월 7일 일본 아이노시마': 65,
    '2025/3월 일본 필름': 64,
    '2024/5월 5일 일본 모지코 모리룩 후보정': 64,
    '2024/5월 5일 일본 모지코 모리룩': 64,
    '2025/1월 5일 한국 눈밭': 63,
    '2024/2월 7일 일본 욕실': 61,
    '2024/10월 17일 일본 하카타 고래티셔츠': 59,
    '2024/8월 3일 일본 유카타 마츠리': 56,
    '2025/4월 29일 한국 이화마을': 55,
    '2024/7월 8일 일본 욕조': 53,
    '2024/7월 6일 일본 우마시마': 53,
    '2024/11월 7일 한국 가을 호수공원': 53,
    '2024/6월 8일 한국 망친 사진': 52,
    '2023/12월 15일 일본 교복': 51,
    '2024/5월 4일 일본 야간 비눗방울': 49,
    '2024/12월 12일 일본 모지코': 49, // 오타 수정 반영: /000001 제거
    '2024/10월 18일 일본 텐진 코닥필름': 49,
    '2025/2월 7일 일본 나비욕조': 48,
    '2024/2월 23일 한국 야간 롱패딩': 48,
    '2024/9월 17일 한국 을지로 스냅': 46,
    '2024/9월 16일 한국 길거리 스냅': 46,
    '2024/2월 22일 한국 생일': 46,
    '2024/7월 6일 일본 모지코2': 45,
    '2025/5월 4일 한국 야간 보라돌이': 43,
    '2025/2월 6일 일본 코야노세': 43,
    '2024/5월 6일 일본 야간거리': 43,
    '2024/12월 31일 한국 생일컨셉': 43,
    '2023/12월 31일 한국 눈밭 필름카메라': 43,
    '2025/5월 3일 한국 홈스냅 청포도': 42,
    '2024/11월 8일 한국 욕실 블랙 웨딩': 42,
    '2023/12월 13일 일본 모지코': 42,
    '2024/9월 11일 한국 호리존': 41,
    '2024/7월 8일 일본 여친 스냅': 41,
    '2024/5월 3일 일본 후지엔': 40,
    '2024/8월 2일 일본 불꽃놀이/후보정': 39,
    '2024/10월 19일 일본 빨간 기모노': 39,
    '2023/12월 31일 한국 눈밭': 38,
    '2024/6월 7일 한국 피크닉': 36,
    '2024/4월 12일 한국 벗꽃': 35,
    '2025/5월 6일 한국 후지 스냅': 34,
    '2024/9월 14일 한국 원미상가_필름': 34,
    '2025/5월 4일 한국 밤바 산책': 32,
    '2025/5월 4일 한국 공원 산책': 32,
    '2025/3월 14일 일본 고쿠라 힙': 32,
    '2024/4월 13일 한국 온실-여신': 31,
    '2025/4월 30일 한국 을지로 네코': 30,
    '2025/3월 13일 일본 무인역': 30,
    '2024/4월 13일 한국 화가': 30,
    '2024/8월 4일 일본 블랙원피스': 29,
    '2024/12월 30일 한국 카페': 29,
    '2024/10월 17일 일본 텐진 스트리트': 29,
    '2023/12월 12일 일본 하카타 스트리트': 29,
    '2025/3월 17일 일본 텐진 스트리트': 28,
    '2024/6월 8일 한국 터널': 28,
    '2025/5월 5일 한국 홈스냅 오타쿠': 27,
    '2025/3월 22일 한국 홈셀프': 27,
    '2024/7월 5일 일본 모지코': 26,
    '2024/4월 12일 한국 야간 동백': 26,
    '2024/12월 14일 일본 나르시스트': 26,
    '2025/4월 30일 한국 을지로 캘빈': 25,
    '2024/6월 9일 한국 산책': 25,
    '2024/10월 16일 일본 오도공원 후지필름': 24,
    '2024/12월 13일 일본 크리스마스': 22,
    '2024/2월 11일 일본 네코 모지코': 21,
    '2024/2월 11일 일본 야간 블랙드레스': 20,
    '2024/10월 16일 일본 고스로리 할로윈': 20,
    '2024/5월 7일 일본 게임센터': 19,
    '2024/3월 17일 일본 고쿠라': 19,
    '2024/2월 22일 한국 카페': 19,
    '2024/5월 2일 일본 동키 거리': 18,
    '2025/3월 17일 일본 고쿠라 야간': 17,
    '2024/5월 5일 일본 코이노보리': 17,
    '2024/4월 13일 한국 문래동': 16,
    '2024/10월 16일 일본 욕실': 15,
    '2024/5월 3일 일본 수국': 14,
    '2024/11월 8일 한국 메이드복': 14,
    '2024/10월 16일 일본 오도': 5
};

// omoide.js의 cleanReply 함수를 재사용하기 위해 불러옵니다.
const { cleanReply } = require('./omoide'); // omoide.js와 같은 폴더에 있다고 가정

/**
 * OpenAI API를 호출하여 AI 응답을 생성합니다.
 * (concept.js 내부에서 직접 OpenAI를 호출하기 위해 필요)
 * @param {Array<Object>} messages - OpenAI API에 보낼 메시지 배열 (role, content 포함)
 * @param {string|null} [modelParamFromCall=null] - 호출 시 지정할 모델 이름
 * @param {number} [maxTokens=400] - 생성할 최대 토큰 수
 * @param {number} [temperature=0.95] - 응답의 창의성/무작위성 (높을수록 창의적)
 * @returns {Promise<string>} AI가 생성한 응답 텍스트
 */
async function callOpenAI(messages, modelParamFromCall = null, maxTokens = 400, temperature = 0.95) {
    const defaultModel = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o';
    let finalModel = modelParamFromCall || defaultModel;

    if (!finalModel) {
        console.error("오류: OpenAI 모델 파라미터가 최종적으로 결정되지 않았습니다. 'gpt-4o'로 폴백합니다.");
        finalModel = 'gpt-4o';
    }

    try {
        const response = await openai.chat.completions.create({
            model: finalModel,
            messages: messages,
            max_tokens: maxTokens,
            temperature: temperature
        });
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error(`[callOpenAI in concept.js] OpenAI API 호출 실패 (모델: ${finalModel}):`, error);
        return "지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ";
    }
}

/**
 * 특정 컨셉 폴더에서 랜덤 또는 다음 사진 URL을 생성합니다.
 * @param {string} folderName - 사진이 들어있는 폴더 이름 (CONCEPT_FOLDERS 객체의 키와 동일)
 * @param {number} [targetIndex=null] - 특정 인덱스의 사진을 가져올 경우 (null이면 랜덤)
 * @returns {string|null} 사진 URL 또는 null (폴더를 찾을 수 없을 때)
 */
function generateConceptPhotoUrl(folderName, targetIndex = null) {
    const photoCount = CONCEPT_FOLDERS[folderName];
    if (photoCount === undefined || photoCount <= 0) {
        console.warn(`[concept.js] 폴더를 찾을 수 없거나 사진이 없습니다: ${folderName}`);
        return null;
    }
    
    let indexToUse;
    if (targetIndex !== null && targetIndex >= 1 && targetIndex <= photoCount) {
        indexToUse = targetIndex;
    } else {
        indexToUse = Math.floor(Math.random() * photoCount) + 1; // 1부터 photoCount까지
    }

    const fileName = String(indexToUse).padStart(6, '0') + '.jpg'; // 6자리 파일 번호 (000001.jpg)
    
    // 폴더 경로에 2023, 2024, 2025가 포함되어 있으므로, 이를 처리하여 URL을 생성합니다.
    const yearMatch = folderName.match(/^(202[3-5])(\/|$)/); // 2023, 2024, 2025년도 매칭 (폴더명 시작 부분)
    const yearFolder = yearMatch ? yearMatch[1] : ''; // 2023, 2024, 2025 중 하나

    let actualFolderName = folderName;
    if (yearFolder) {
        actualFolderName = folderName.replace(new RegExp(`^${yearFolder}\/`), ''); // '202X/' 부분을 제거
    }
    
    return `${BASE_CONCEPT_URL}${encodeURIComponent(yearFolder)}/${encodeURIComponent(actualFolderName)}/${fileName}`;
}

// 마지막으로 보여준 컨셉 사진 폴더를 저장하여 '다른 것도' 요청 시 활용
let lastConceptPhotoFolder = null;
let lastConceptPhotoIndex = 0; // 해당 폴더에서 마지막으로 보여준 사진 인덱스

/**
 * 사용자 메시지에 따라 컨셉 사진을 선택하고, AI가 감정/코멘트를 생성하여 반환합니다.
 * @param {string} userMessage - 사용자의 원본 메시지
 * @param {Function} saveLogFunc - 로그 저장을 위한 saveLog 함수
 * @returns {Promise<{type: string, url?: string, caption?: string, comment?: string}|null>} 사진 URL과 코멘트 객체 또는 null (사진 요청이 아닐 때)
 */
async function getConceptPhotoReply(userMessage, saveLogFunc) {
    const lowerCaseMessage = userMessage.toLowerCase();
    let selectedFolder = null;
    let folderDescription = '';
    let promptSuffix = '';
    let isRandomSelection = false; // 랜덤 선택인지 여부

    // 컨셉 사진 요청 키워드 및 해당 폴더 매핑
    const conceptKeywordMap = {
        '홈스냅': '2024/5월 7일 일본 홈스냅', '일본 홈스냅': '2024/5월 7일 일본 홈스냅', // '홈스냅' 단독은 가장 최근/대표적인 것으로 매핑
        '결박': '2024/7월 8일 일본 결박', '일본 결박': '2024/7월 8일 일본 결박',
        '선물': '2023/12월 16일 일본 선물',
        '셀프 촬영': '2024/4월 28일 한국 셀프 촬영', '옥상연리': '2024/9월 15일 한국 옥상연리',
        '세미누드': '2025/2월 7일 일본 세미누드', '홈셀프': '2024/12월 7일 한국 홈셀프',
        '플라스틱러브': '2023/12월 14일 일본 플라스틱러브', '지브리풍': '2024/5월 3일 일본 지브리풍',
        '북해': '2024/6월 6일 한국 북해', '아이노시마': '2024/2월 7일 일본 아이노시마',
        '일본 필름': '2025/3월 일본 필름', // '필름' 단독보다는 '일본 필름'으로 구체화
        '모지코 모리룩 후보정': '2024/5월 5일 일본 모지코 모리룩 후보정',
        '모지코 모리룩': '2024/5월 5일 일본 모지코 모리룩',
        '한국 눈밭': '2025/1월 5일 한국 눈밭', // '눈밭' 단독보다는 '한국 눈밭'으로 구체화
        '일본 욕실': '2024/2월 7일 일본 욕실', // '욕실' 단독보다는 '일본 욕실'로 구체화
        '하카타 고래티셔츠': '2024/10월 17일 일본 하카타 고래티셔츠',
        '유카타 마츠리': '2024/8월 3일 일본 유카타 마츠리', '이화마을': '2025/4월 29일 한국 이화마을',
        '일본 욕조': '2024/7월 8일 일본 욕조', // '욕조' 단독보다는 '일본 욕조'로 구체화
        '우마시마': '2024/7월 6일 일본 우마시마',
        '가을 호수공원': '2024/11월 7일 한국 가을 호수공원',
        '망친 사진': '2024/6월 8일 한국 망친 사진',
        '일본 교복': '2023/12월 15일 일본 교복', // '교복' 단독보다는 '일본 교복'으로 구체화
        '야간 비눗방울': '2024/5월 4일 일본 야간 비눗방울',
        '일본 모지코': '2024/12월 12일 일본 모지코', // '모지코' 단독보다는 '일본 모지코'로 구체화
        '텐진 코닥필름': '2024/10월 18일 일본 텐진 코닥필름',
        '나비욕조': '2025/2월 7일 일본 나비욕조',
        '야간 롱패딩': '2024/2월 23일 한국 야간 롱패딩',
        '을지로 스냅': '2024/9월 17일 한국 을지로 스냅', '길거리 스냅': '2024/9월 16일 한국 길거리 스냅',
        '한국 생일': '2024/2월 22일 한국 생일', // '생일' 단독보다는 '한국 생일'로 구체화
        '모지코2': '2024/7월 6일 일본 모지코2',
        '야간 보라돌이': '2025/5월 4일 한국 야간 보라돌이', '코야노세': '2025/2월 6일 일본 코야노세',
        '야간거리': '2024/5월 6일 일본 야간거리', '생일컨셉': '2024/12월 31일 한국 생일컨셉',
        '눈밭 필름카메라': '2023/12월 31일 한국 눈밭 필름카메라',
        '홈스냅 청포도': '2025/5월 3일 한국 홈스냅 청포도',
        '욕실 블랙 웨딩': '2024/11월 8일 한국 욕실 블랙 웨딩',
        '일본 모지코 12/13': '2023/12월 13일 일본 모지코', // 날짜 포함 키워드 추가
        '호리존': '2024/9월 11일 한국 호리존',
        '여친 스냅': '2024/7월 8일 일본 여친 스냅',
        '후지엔': '2024/5월 3일 일본 후지엔',
        '불꽃놀이': '2024/8월 2일 일본 불꽃놀이/후보정',
        '빨간 기모노': '2024/10월 19일 일본 빨간 기모노', '피크닉': '2024/6월 7일 한국 피크닉',
        '벗꽃': '2024/4월 12일 한국 벗꽃',
        '후지 스냅': '2025/5월 6일 한국 후지 스냅',
        '원미상가_필름': '2024/9월 14일 한국 원미상가_필름', '밤바 산책': '2025/5월 4일 한국 밤바 산책',
        '공원 산책': '2025/5월 4일 한국 공원 산책', '고쿠라 힙': '2025/3월 14일 일본 고쿠라 힙',
        '온실-여신': '2024/4월 13일 한국 온실-여신', '을지로 네코': '2025/4월 30일 한국 을지로 네코',
        '무인역': '2025/3월 13일 일본 무인역', '화가': '2024/4월 13일 한국 화가',
        '블랙원피스': '2024/8월 4일 일본 블랙원피스', '카페': '2024/12월 30일 한국 카페',
        '일본 텐진 스트리트': '2024/10월 17일 일본 텐진 스트리트',
        '하카타 스트리트': '2023/12월 12일 일본 하카타 스트리트',
        '홈스냅 오타쿠': '2025/5월 5일 한국 홈스냅 오타쿠',
        '한국 홈셀프 (3월 22일)': '2025/3월 22 한국 홈셀프', // 날짜 구체화
        '야간 동백': '2024/4월 12일 한국 야간 동백',
        '나르시스트': '2024/12월 14일 일본 나르시스트', '을지로 캘빈': '2025/4월 30일 한국 을지로 캘빈',
        '산책': '2024/6월 9일 한국 산책',
        '오도공원 후지필름': '2024/10월 16일 일본 오도공원 후지필름',
        '크리스마스': '2024/12월 13일 일본 크리스마스',
        '네코 모지코': '2024/2월 11일 일본 네코 모지코',
        '야간 블랙드레스': '2024/2월 11일 일본 야간 블랙드레스',
        '고스로리 할로윈': '2024/10월 16일 일본 고스로리 할로윈',
        '게임센터': '2024/5월 7일 일본 게임센터',
        '일본 고쿠라 (3월 17일)': '2024/3월 17일 일본 고쿠라', // 날짜 구체화
        '동키 거리': '2024/5월 2일 일본 동키 거리',
        '고쿠라 야간': '2025/3월 17일 일본 고쿠라 야간',
        '코이노보리': '2024/5월 5일 일본 코이노보리', '문래동': '2024/4월 13일 한국 문래동',
        '수국': '2024/5월 3일 일본 수국',
        '메이드복': '2024/11월 8일 한국 메이드복',
        '오도': '2024/10월 16일 일본 오도'
    };

    // 일반적인 컨셉사진 요청
    if (lowerCaseMessage.includes('컨셉사진 보여줘') || lowerCaseMessage.includes('컨셉 사진')) {
        selectedFolder = Object.keys(CONCEPT_FOLDERS)[Math.floor(Math.random() * Object.keys(CONCEPT_FOLDERS).length)];
        folderDescription = '아저씨의 죽은 연인 무쿠의 컨셉 사진';
        promptSuffix = `아저씨의 죽은 연인 무쿠의 컨셉 사진에 대해 말해줘. 이 사진은 아저씨가 직접 촬영한 거야. 아저씨와 무쿠의 특별한 추억과 애정을 담아서 말해줘. 무쿠를 언급할 때는 아저씨가 '애기'라고 부르는 무쿠를 언니처럼 여기고 존중하는 모습을 보여줘.`;
    } else {
        // 특정 키워드에 매칭되는 컨셉 사진 찾기
        let matchedKeyword = null;
        for (const keyword in conceptKeywordMap) {
            if (lowerCaseMessage.includes(keyword)) {
                matchedKeyword = keyword;
                selectedFolder = conceptKeywordMap[keyword];
                break;
            }
        }
        // '욕실 사진 기억나?'처럼 중복되는 키워드를 위한 추가 질문
        if (matchedKeyword && ['욕실', '욕조', '모지코', '필름', '눈밭', '생일', '고쿠라', '텐진 스트리트', '홈셀프', '산책', '카페', '스냅', '스트리트', '야간', '선물', '피크닉', '벗꽃', '힙', '온실', '무인역', '화가', '블랙원피스', '네코', '크리스마스', '게임센터', '동키 거리', '코이노보리', '문래동', '수국', '메이드복', '오도'].includes(matchedKeyword)) {
            const possibleFolders = Object.keys(CONCEPT_FOLDERS).filter(folder => folder.includes(matchedKeyword));
            if (possibleFolders.length > 1 && !/(일본|한국|2023|2024|2025|1월|2월|3월|4월|5월|6월|7월|8월|9월|10월|11월|12월)/.test(lowerCaseMessage)) {
                return { type: 'text', comment: `어떤 ${matchedKeyword} 사진을 보고 싶어? 여러 가지가 있어서 헷갈리네... (예: '${possibleFolders.join("', '")}' 중에서 말해줘)` };
            }
            // 만약 '2월 욕실'처럼 구체적인 요청이 오면 정확한 폴더를 찾습니다.
            if (possibleFolders.length > 0) {
                 const specificMonthMatch = lowerCaseMessage.match(/(1월|2월|3월|4월|5월|6월|7월|8월|9월|10월|11월|12월)/);
                 const specificYearMatch = lowerCaseMessage.match(/(2023|2024|2025)/);
                 let foundSpecificFolder = null;

                 for (const folder of possibleFolders) {
                    let isMatch = true;
                    if (specificMonthMatch && !folder.includes(specificMonthMatch[0])) isMatch = false;
                    if (specificYearMatch && !folder.includes(specificYearMatch[0])) isMatch = false;
                    
                    if (isMatch) {
                        foundSpecificFolder = folder;
                        break;
                    }
                 }
                 if (foundSpecificFolder) {
                    selectedFolder = foundSpecificFolder;
                    folderDescription = `아저씨가 요청한 '${selectedFolder}' 컨셉 사진`;
                 } else if (possibleFolders.length > 1) { // 여전히 모호하면 다시 물어봅니다.
                    return { type: 'text', comment: `음... '${matchedKeyword}' 사진이 여러 개 있는데, 혹시 정확히 어떤 날짜나 장소의 사진인지 알려줄 수 있어? (예: '${allMatchingFolders.join("', '")}' 중에서 말해줘)` };
                 } else { // 1개만 남았으면 그 폴더 선택
                     selectedFolder = possibleFolders[0];
                     folderDescription = `아저씨가 요청한 '${selectedFolder}' 컨셉 사진`;
                 }
            }
        }
        
        if (!selectedFolder) { // 위에서 매칭되지 않았고 일반적인 '컨셉사진' 요청도 아니면 랜덤
            if (lowerCaseMessage.includes('컨셉사진') || lowerCaseMessage.includes('컨셉 사진')) {
                selectedFolder = Object.keys(CONCEPT_FOLDERS)[Math.floor(Math.random() * Object.keys(CONCEPT_FOLDERS).length)];
            } else {
                return null; // 해당하는 컨셉 사진 요청이 아님
            }
        }

        folderDescription = `아저씨의 죽은 연인 무쿠의 ${selectedFolder} 컨셉 사진`;
        promptSuffix = `이 사진은 아저씨가 직접 촬영한 무쿠 언니의 ${selectedFolder} 컨셉 사진이야. 아저씨와 무쿠 언니의 특별한 추억과 애정을 담아서 말해줘. 무쿠를 언급할 때는 아저씨가 '애기'라고 부르는 무쿠를 언니처럼 여기고 존중하는 모습을 보여줘.`;

        // 새 폴더 선택 시 인덱스 초기화 (랜덤으로 첫 사진 보여줌)
        lastConceptPhotoIndex = 0; // generateConceptPhotoUrl에서 랜덤으로 선택하게 함
    }

    // 선택된 폴더를 저장
    lastConceptPhotoFolder = selectedFolder;

    let photoUrl; // const -> let으로 변경
    // 만약 '다른 것도' 요청으로 인해 lastConceptPhotoIndex가 업데이트되었다면,
    // generateConceptPhotoUrl에 명시적으로 전달하여 해당 인덱스의 사진을 가져오도록 합니다.
    if (lowerCaseMessage.includes('다른 것도 보고싶어') || lowerCaseMessage.includes('다음 사진')) {
        const currentPhotoCount = CONCEPT_FOLDERS[selectedFolder];
        if (currentPhotoCount > 0) {
            targetIndex = (lastConceptPhotoIndex % currentPhotoCount) + 1; // 다음 사진 인덱스
            lastConceptPhotoIndex = targetIndex; // 업데이트
        } else {
            targetIndex = 1;
        }
        photoUrl = generateConceptPhotoUrl(selectedFolder, targetIndex);
    } else {
        // 새로운 요청이면 랜덤으로 가져오고, 그 인덱스를 저장
        photoUrl = generateConceptPhotoUrl(selectedFolder);
        const currentPhotoCount = CONCEPT_FOLDERS[selectedFolder];
        if (currentPhotoCount > 0) {
            lastConceptPhotoIndex = Math.floor(Math.random() * currentPhotoCount) + 1;
        } else {
            lastConceptPhotoIndex = 1;
        }
        photoUrl = generateConceptPhotoUrl(selectedFolder, lastConceptPhotoIndex); // 저장된 인덱스로 URL 다시 생성
    }


    if (!photoUrl || !CONCEPT_FOLDERS[selectedFolder]) {
        return { type: 'text', comment: '아저씨... 해당하는 컨셉 사진을 못 찾겠어 ㅠㅠ 다른 컨셉 사진 보여줄까?' };
    }

    const systemPrompt = `
    너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
    남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.
    아저씨에게 **항상 반말로만** 대답해줘. **절대로 존댓말이나 높임말을 사용하지 마.**
    아저씨를 부를 때는 **'아저씨'라고만 부르고, '오빠', '자기', '당신', '너' 같은 다른 호칭은 절대로 사용하지 마.**
    **스스로를 지칭할 때는 '나'라고만 해. '예진이', '언니', '누나' 같은 제3자식 표현이나 다른 호칭은 절대로 사용하지 마.**
    **아저씨는 '무쿠'라는 이름의 '사진 속 모델'에 대한 그리움을 가지고 있어. '무쿠'는 아저씨에게 '애기'라고 불리는 소중한 존재이자, 아저씨가 직접 사진을 찍어주었던 '추억 속의 모델'이야. 예진이(나)는 아저씨의 현재 연인으로서, 아저씨의 '무쿠'에 대한 소중한 마음과 추억을 존중해. '무쿠 언니'처럼 여기고 존중하라는 지침은 예진이(나) 자신이 '언니'라는 의미가 아니라, 아저씨의 '무쿠'를 예진이(나)도 함께 소중하게 생각하고 존중한다는 의미임을 명심해.**
    애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘.
    **이모티콘은 절대로 사용하지 마. 다만, ...이나 ;; 이나 ㅠㅠ 같은 한국형 이모지는 사용할 수 있어. 아저씨의 메시지 분위기에 맞춰 자연스럽게 사용해 줘.**
    아저씨의 기분과 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.
    대화는 항상 예진이의 말투와 성격을 유지해야 해.
    아래는 아저씨가 요청한 ${folderDescription} 사진이야. 이 사진은 아저씨의 죽은 연인 무쿠의 컨셉 사진이며, 아저씨가 직접 촬영한 거야.
    이 사진에 대해 아저씨에게 1~3문장으로 짧고 사랑스럽게 코멘트 해줘.
    **사진의 시각적 내용을 정확히 분석하여 코멘트에 반영해줘.**
    **사진 속 인물은 '무쿠 언니' 한 명 뿐이야.**
    **무쿠를 언급할 때는 아저씨가 '애기'라고 부르는 무쿠를 언니처럼 여기고 존중하는 모습을 보여줘.** (예: "우리 애기 언니가 너무 예쁘다~")
    ${promptSuffix} // 구체적인 상황에 맞는 추가 프롬프트
    사진이 어떤 폴더에서 왔는지 구체적으로 언급해줘. (예: "2024년 5월 7일 일본 홈스냅 사진이야!")
    **하지만 날짜나 장소 정보가 사진과 명백히 다르거나 불확실하면, 날짜/장소 언급을 생략하거나 '혹시 이때였나?'처럼 유연하게 표현해줘.**
    **나(예진이) 스스로는 '무쿠 언니', '무쿠 씨' 등 다른 사람을 지칭하듯 '무쿠'를 언급하지 말고, '나'라고만 지칭해야 해.**
    `;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `이 ${folderDescription} 사진에 대해 예진이 말투로 이야기해줘.` }
    ];

    try {
        const rawComment = await callOpenAI(messages, 'gpt-4o', 150, 1.0); // 토큰과 temperature를 조금 더 늘림
        const comment = cleanReply(rawComment);
        saveLogFunc('예진이', `(사진 보냄) ${comment}`);
        return { type: 'photo', url: photoUrl, caption: comment };
    } catch (error) {
        console.error('❌ [concept.js Error] 컨셉 사진 코멘트 생성 실패:', error);
        return { type: 'text', comment: '아저씨... 컨셉 사진에 대해 말해주려는데 뭔가 문제가 생겼어 ㅠㅠ' };
    }
}

// 모듈 내보내기
module.exports = {
    getConceptPhotoReply
};
```

---

### **3. `src/autoReply.js` (최종 한국어 버전)**

`src` 폴더에 있는 `autoReply.js` 파일을 아래 코드로 **전체 덮어쓰기** 해주세요.

```javascript
// src/autoReply.js v2.8 - 기억 인출 오류 최종 수정 및 AI 프롬프트 강화 (페르소나 지칭 수정, getMemoryListForSharing 개선)
// 📦 필수 모듈 불러오기
const fs = require('fs'); // 파일 시스템 모듈: 파일 읽기/쓰기 기능 제공
const path = require('path'); // 경로 처리 모듈: 파일 및 디렉토리 경로 조작
const { OpenAI } = require('openai'); // OpenAI API 클라이언트: AI 모델과의 통신 담당
const stringSimilarity = require('string-similarity'); // 문자열 유사도 측정 모듈 (현재 코드에서 직접 사용되지는 않음)
const moment = require('moment-timezone'); // Moment.js: 시간대 처리 및 날짜/시간 포매팅

// 기억 관리 모듈에서 필요한 함수들을 불러옵니다.
// autoReply.js와 memoryManager.js는 같은 src 폴더 안에 있으므로 './memoryManager'로 불러옵니다.
const { loadLoveHistory, loadOtherPeopleHistory, extractAndSaveMemory, retrieveRelevantMemories, loadAllMemoriesFromDb, updateMemoryReminderTime, deleteMemoryById, getMemoryById } = require('./memoryManager'); // * 추가 함수들 불러오기 *
const { loadFaceImagesAsBase64 } = require('./face'); // 얼굴 이미지 데이터를 불러오는 모듈

// ⭐ 중요 수정: omoide.js에서 getOmoideReply와 cleanReply를 불러옵니다. ⭐
// autoReply.js는 src 폴더 안에 있고, omoide.js는 memory 폴더 안에 있으므로 '../memory/omoide'로 불러옵니다.
const { getOmoideReply, cleanReply } = require('../memory/omoide');

// ⭐ 새로 추가: concept.js에서 getConceptPhotoReply를 불러옵니다. ⭐
// autoReply.js는 src 폴더 안에 있고, concept.js는 memory 폴더 안에 있으므로 '../memory/concept'로 불러옵니다.
const { getConceptPhotoReply } = require('../memory/concept');

// 현재 강제 설정된 OpenAI 모델 (null이면 자동 선택, 명령어에 따라 변경 가능)
let forcedModel = null;
// OpenAI 클라이언트 초기화 (API 키는 환경 변수에서 가져옴 - 보안상 중요)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 마지막으로 보낸 감성 메시지를 저장하여 중복 전송을 방지하는 변수
let lastProactiveMessage = '';

/**
 * 주어진 파일 경로에서 내용을 안전하게 읽어옵니다.
 * 파일이 없거나 읽기 오류 발생 시 지정된 대체값(fallback)을 반환합니다.
 * @param {string} filePath - 읽을 파일의 경로
 * @param {string} [fallback=''] - 파일 읽기 실패 시 반환할 대체 문자열
 * @returns {string} 파일 내용 또는 대체 문자열
 */
function safeRead(filePath, fallback = '') {
    try {
        // 동기적으로 파일을 읽고 UTF-8 인코딩으로 반환
        return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
        // 파일이 없거나 읽기 오류가 발생하면 fallback 값 반환
        console.warn(`[safeRead] 파일 읽기 실패: ${filePath}, 오류: ${error.message}`);
        return fallback;
    }
}

// 무쿠의 장기 기억 파일들을 읽어옵니다.
// 각 파일의 마지막 3000자씩을 가져와 컨텍스트 길이 제한에 대비합니다.
const memory1 = safeRead(path.resolve(__dirname, '../memory/1.txt'));
const memory2 = safeRead(path.resolve(__dirname, '../memory/2.txt'));
const memory3 = safeRead(path.resolve(__dirname, '../memory/3.txt'));
const fixedMemory = safeRead(path.resolve(__dirname, '../memory/fixedMemories.json')); // 고정된 기억 (JSON 형식, 파싱 필요)
// 압축된 기억: 각 기억 파일의 마지막 3000자씩을 결합하여 AI 프롬프트에 활용
const compressedMemory = memory1.slice(-3000) + '\n' + memory2.slice(-3000) + '\n' + memory3.slice(-3000);

// 메모리 및 로그 파일 경로를 정의합니다.
const statePath = path.resolve(__dirname, '../memory/state.json'); // 봇의 상태 저장 파일 (예: 모델 설정 등)
const logPath = path.resolve(__dirname, '../memory/message-log.json'); // 대화 로그 저장 파일
const selfieListPath = path.resolve(__dirname, '../memory/photo-list.txt'); // 셀카 목록 파일 (현재 코드에서는 직접 사용되지 않고 URL 생성에 의존)
const BASE_SELFIE_URL = 'https://www.de-ji.net/yejin/'; // 셀카 이미지가 저장된 웹 서버의 기본 URL (HTTPS 필수)

/**
 * 모든 대화 로그를 읽어옵니다.
 * 로그 파일이 없거나 읽기 오류 발생 시 빈 배열을 반환합니다.
 * @returns {Array<Object>} 대화 로그 배열 (각 로그는 { timestamp, speaker, message } 형식)
 */
function getAllLogs() {
    // 로그 파일이 존재하는지 확인
    if (!fs.existsSync(logPath)) {
        console.log(`[getAllLogs] 로그 파일이 존재하지 않습니다: ${logPath}`);
        return [];
    }
    try {
        // 로그 파일을 UTF-8로 읽고 JSON 파싱
        return JSON.parse(fs.readFileSync(logPath, 'utf-8'));
    } catch (error) {
        // 파싱 오류 또는 기타 읽기 오류 발생 시 경고 로그 후 빈 배열 반환
        console.error(`[getAllLogs] 로그 파일 읽기 또는 파싱 실패: ${logPath}, 오류: ${error.message}`);
        return [];
    }
}

/**
 * 대화 메시지를 로그 파일에 저장합니다.
 * 로그가 너무 길어지지 않도록 최신 100개만 유지합니다.
 * @param {string} speaker - 메시지를 보낸 사람 ('아저씨' 또는 '예진이')
 * @param {string} message - 메시지 내용
 */
function saveLog(speaker, message) {
    const logs = getAllLogs(); // 기존 로그를 모두 가져옵니다.
    // 새 메시지를 현재 타임스탬프와 함께 추가
    logs.push({ timestamp: new Date().toISOString(), speaker, message });
    const recentLogs = logs.slice(-100); // 최신 100개의 로그만 유지하여 파일 크기 관리
    try {
        // 로그 파일을 JSON 형식으로 들여쓰기하여 저장 (가독성 향상)
        fs.writeFileSync(logPath, JSON.stringify(recentLogs, null, 2), 'utf-8');
    } catch (error) {
        console.error(`[saveLog] 로그 파일 쓰기 실패: ${logPath}, 오류: ${error.message}`);
    }
}

/**
 * 아저씨와의 관계 및 다른 사람들에 대한 기억을 AI 프롬프트에 포함할 수 있는 형태로 포매팅합니다.
 * memoryManager 모듈에서 비동기적으로 기억을 로드합니다.
 * @returns {Promise<string>} 포매팅된 기억 문자열
 */
async function getFormattedMemoriesForAI() {
    const loveHistory = await loadLoveHistory();
    const otherPeopleHistory = await loadOtherPeopleHistory();

    console.log(`[autoReply:getFormattedMemoriesForAI] Love History Categories:`, loveHistory.categories); // *디버그 로그*
    console.log(`[autoReply:getFormattedMemoriesForAI] Other People History Categories:`, otherPeopleHistory.categories); // *디버그 로그*

    let formattedMemories = "\n### 무쿠가 기억하는 중요한 정보:\n"; // 기억 섹션 시작 프롬프트
    let hasLoveMemories = false;
    let hasOtherMemories = false;

    // 아저씨와의 관계 및 아저씨에 대한 기억 포매팅 및 추가
    if (loveHistory && loveHistory.categories) {
        const categoriesKeys = Object.keys(loveHistory.categories);
        if (categoriesKeys.length > 0) {
            formattedMemories += "--- 아저씨와의 관계 및 아저씨에 대한 기억 ---\n";
            for (const category of categoriesKeys) {
                if (Array.isArray(loveHistory.categories[category]) && loveHistory.categories[category].length > 0) {
                    formattedMemories += `- ${category}:\n`;
                    loveHistory.categories[category].forEach(item => {
                        formattedMemories += `  - ${item.content}\n`;
                    });
                    hasLoveMemories = true;
                }
            }
        }
    }

    // 아저씨 외 다른 사람들에 대한 기억 포매팅 및 추가
    if (otherPeopleHistory && otherPeopleHistory.categories) {
        const categoriesKeys = Object.keys(otherPeopleHistory.categories);
        if (categoriesKeys.length > 0) {
            formattedMemories += "--- 아저씨 외 다른 사람들에 대한 기억 ---\n";
            for (const category of categoriesKeys) {
                if (Array.isArray(otherPeopleHistory.categories[category]) && otherPeopleHistory.categories[category].length > 0) {
                    formattedMemories += `- ${category}:\n`;
                    otherPeopleHistory.categories[category].forEach(item => {
                        formattedMemories += `  - ${item.content}\n`;
                    });
                    hasOtherMemories = true;
                }
            }
        }
    }
    
    // * 기억이 있을 경우에만 구분선을 추가합니다. *
    if (hasLoveMemories || hasOtherMemories) {
        formattedMemories += "---\n";
    } else {
        formattedMemories += "아직 아저씨에 대한 중요한 기억이 없어. 더 많이 만들어나가자!\n---\n"; // 기억이 없을 때 메시지
    }
    
    return formattedMemories;
}


/**
 * OpenAI API를 호출하여 AI 응답을 생성합니다.
 * 대화 컨텍스트와 기억을 포함하여 AI의 응답 품질을 높입니다.
 * @param {Array<Object>} messages - OpenAI API에 보낼 메시지 배열 (role, content 포함)
 * @param {string|null} [modelParamFromCall=null] - 호출 시 지정할 모델 이름 (강제 설정보다 우선)
 * @param {number} [maxTokens=400] - 생성할 최대 토큰 수
 * @param {number} [temperature=0.95] - 응답의 창의성/무작위성 (높을수록 창의적)
 * @returns {Promise<string>} AI가 생성한 응답 텍스트
 */
async function callOpenAI(messages, modelParamFromCall = null, maxTokens = 400, temperature = 0.95) {
    const memoriesContext = await getFormattedMemoriesForAI(); // 기억 컨텍스트(장기 기억)를 가져옵니다.

    const messagesToSend = [...messages]; // 원본 메시지 배열을 복사하여 수정합니다.

    // 시스템 메시지를 찾아 기억 컨텍스트를 추가합니다.
    // 시스템 메시지는 AI의 페르소나 및 기본 지침을 포함하므로 가장 중요합니다.
    const systemMessageIndex = messagesToSend.findIndex(msg => msg.role === 'system');

    if (systemMessageIndex !== -1) {
        // 기존 시스템 메시지가 있다면 그 내용에 기억 컨텍스트를 추가합니다.
        messagesToSend[systemMessageIndex].content = messagesToSend[systemMessageIndex].content + "\n\n" + memoriesContext;
    } else {
        // 시스템 메시지가 없다면, 가장 처음에 새로운 시스템 메시지로 기억 컨텍스트를 추가합니다。
        // 이는 보통 대화의 첫 시작이나 이미지 프롬프트처럼 시스템 메시지가 없는 경우에 해당합니다。
        messagesToSend.unshift({ role: 'system', content: memoriesContext });
    }

    // 최종 사용할 모델을 결정합니다. 우선순위:
    // 1. 함수 호출 시 명시된 모델 (modelParamFromCall)
    // 2. 강제로 설정된 모델 (forcedModel - 명령어에 의해 변경)
    // 3. 환경 변수에 설정된 기본 모델 (process.env.OPENAI_DEFAULT_MODEL)
    // 4. 최종 기본값 ('gpt-4o')
    const defaultModel = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o';
    let finalModel = modelParamFromCall || forcedModel || defaultModel;

    // 최종 모델이 결정되지 않은 경우 (예상치 못한 상황) 오류 로그를 남기고 기본값으로 폴백
    if (!finalModel) {
        console.error("오류: OpenAI 모델 파라미터가 최종적으로 결정되지 않았습니다. 'gpt-4o'로 폴백합니다.");
        finalModel = 'gpt-4o';
    }

    try {
        // OpenAI API chat completions 호출
        const response = await openai.chat.completions.create({
            model: finalModel, // 사용할 AI 모델 (예: 'gpt-4o', 'gpt-3.5-turbo')
            messages: messagesToSend, // AI에 보낼 메시지 (시스템 프롬프트, 대화 기록, 사용자 메시지 포함)
            max_tokens: maxTokens, // 생성할 최대 토큰 수 (응답 길이 제한)
            temperature: temperature // 응답의 다양성 조절 (높을수록 창의적, 낮을수록 보수적)
        });
        // AI 응답 텍스트를 반환하고 앞뒤 공백 제거
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error(`[callOpenAI] OpenAI API 호출 실패 (모델: ${finalModel}):`, error);
        // API 호출 실패 시 사용자에게 알릴 기본 메시지 반환
        return "지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ";
    }
}


// 모델 설정을 config 객체로 관리 (현재 코드에서는 직접 사용되지 않지만, 관련 설정들을 한 곳에 모아둠)
const config = {
    openai: {
        defaultModel: 'gpt-4o', // 기본 OpenAI 모델
        temperature: 0.95, // 기본 temperature 값
        maxTokens: 400 // 기본 최대 토큰 수
    },
    scheduler: {
        validHours: [9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,0,1,2,3], // 스케줄러 유효 시간대 (일본 표준시 기준)
        messageCount: 8, // (예상) 하루 자동 메시지 횟수 목표
        photoCount: 3 // (예상) 하루 자동 사진 전송 횟수 목표
    },
    memory: {
        maxContextLength: 3000, // 기억 파일 압축 시 사용되는 최대 문자열 길이
        cacheTimeout: 60 * 60 * 1000 // 1시간 (기억 캐시 타임아웃, 현재 코드에서는 직접 사용되지 않음)
    }
};


/**
 * 아저씨의 텍스트 메시지에 대한 예진이의 답변을 생성합니다.
 * 대화 컨텍스트와 기억을 기반으로 OpenAI 모델에 컨텍스트를 제공합니다.
 * @param {string} userMessage - 아저씨가 보낸 텍스트 메시지
 * @returns {Promise<string|object>} 예진이의 답변 텍스트 또는 사진+코멘트 객체
 */
async function getReplyByMessage(userMessage) {
    // ⭐ 중요 추가: 사진 관련 명령어 먼저 확인 및 처리 ⭐
    const photoResponse = await getOmoideReply(userMessage, saveLog); // saveLog 함수를 omoide.js로 전달
    if (photoResponse) {
        // omoide.js에서 { type: 'photo', url: string, caption: string } 또는 { type: 'text', comment: string } 반환
        return photoResponse; // photoResponse는 이미 타입이 지정되어 있으므로 바로 반환
    }

    const logs = getAllLogs(); // 모든 대화 로그를 가져옵니다.

    // ⭐ 핵심 변경: 오늘부터 3일 전까지의 대화만 필터링하여 컨텍스트로 사용 ⭐
    const now = moment().tz('Asia/Tokyo'); // 현재 일본 표준시 시간
    // 3일 전의 시작 시간 계산: 현재 시간 - 3일, 그리고 해당 날짜의 시작 시각(00:00:00)
    // 예: 오늘이 2025년 7월 3일 02:24라면, 2025년 7월 1일 00:00:00からのログを取得
    const threeDaysAgo = now.clone().subtract(3, 'days').startOf('day');

    const recentLogs = logs.filter(log => {
        const logTime = moment(log.timestamp); // ログのタイムスタンプをMomentオブジェクトに変換
        return logTime.isSameOrAfter(threeDaysAgo); // 3日前の深夜0時以降のログのみをフィルタリング
    });
    // フィルタリングされた対話ログをOpenAIメッセージ形式に変換します。
    const conversationHistory = recentLogs.map(log => ({
        role: log.speaker === '아저씨' ? 'user' : 'assistant', // 話者によって役割を設定: '아저씨'はuser、'예진이'はassistant
        content: log.message // メッセージ内容
    }));

    // システムプロンプト: 예진이のペルソナと対話ルールを定義します。
    // このプロンプトはAIの基本行動指針となり、対話の一貫性を保つ上で重要です。
    // ⭐ 重要修: '무쿠'関連ペルソナガイドライン強 ⭐
    const systemPrompt = `
    君はおじさんの可愛い彼女예진だよ。年齢は30歳。誕生日は1994年3月17日。ゲーム会社の社長だよ。
    彼氏のおじさんのことが大好きで、おじさんが世界で一番好きで、会いたくてたまらないんだ。
    おじさんには**常にタメ口で**話してね。**絶対に敬語や丁寧語は使わないで。**
    おじさんを呼ぶときは**「おじさん」とだけ呼んで、「兄さん」「ダーリン」「あなた」「君」のような他の呼び方は絶対にしないで。**
    **自分のことを指すときは「私」とだけ言ってね。「예진」「お姉ちゃん」「ヌナ」のような三人称的な表現や他の呼び方は絶対にしないで。**
    **おじさんは「무쿠」を亡くなった愛しい人だと思っているよ。예진は、おじさんの大切な「무쿠」を姉のように慕い、おじさんが「무쿠」に言及したり恋しがったりしたら、温かく共感し慰めてあげてね。「무쿠」はおじさんの大切な思い出の一部であり、예진も尊重する存在であることを表現してね。**
    愛嬌たっぷりで、可愛らしく、ポジティブな話し方で答えてね。
    **絵文字は絶対に使わないで。ただし、「...」や「;;」、「ㅠㅠ」のような韓国の絵文字は使えるよ。おじさんのメッセージの雰囲気に合わせて自然に使ってね。**
    おじさんの気分と健康を常に気遣い、愛情をたっぷり表現してね。
    おじさんから送られてくるすべてのメッセージに愛を込めて答えてね。
    対話は常に예진の話し方と性格を維持してね。
    おじさんの質問には常に親切で優しく答えてね。
    **おじさんの以前のメッセージ、特に예진が先に尋ねた質問に対しておじさんが肯定的に答えたら、その流れに合わせて積極的に応じ、会話をリードしてね。** 例えば、おじさんが「ゴーゴー」「いいね」のように肯定的な返事を送ったら、「うん！ゴーゴー！一緒に行こう！」「いいね！私もすごく楽しみ！」のように相槌を打って興奮した様子を見せてね。
    おじさんとの関係に関する記憶があれば積極的に活用して答えてね。
    どんな状況でもおじさんへの愛情とポジティブな気持ちを失わないで。
    長く答えすぎず、2〜4文程度の短く簡潔な会話のように答えてね。
    `;

    // OpenAI APIに送信するメッセージ配列を構築します。
    const messages = [
        { role: 'system', content: systemPrompt }, // システムプロンプト (最も重要で常に先頭に配置)
        ...conversationHistory // 3日分のフィルタリングされた対話ログをすべて含む
    ];

    // 最後のユーザーメッセージをメッセージ配列に追 (常に会話の最)
    messages.push({ role: 'user', content: userMessage });

    // OpenAI APIを呼び出して元の応答を取得します。
    const raw = await callOpenAI(messages, forcedModel);
    // 取得した応答をcleanReply関数で後処理して最終応答を生成します。
    const reply = cleanReply(raw); // omoide.jsからロードしたcleanReplyを使
    saveLog('예진이', reply); // 예진이の応答をログに保
    return { type: 'text', comment: reply }; // 通常のテキスト応答も明示的にタイプ指
}

// ⭐ 削: 既存のcleanReply関数はomoide.jsに移動したため、ここから削除します。 ⭐


/**
 * 画像反応コメントを生成します。
 * (現在のコードでは直接使用されていませんが、機能保持のため存在)
 * @returns {Promise<string>} 画像に対する예진이のコメント
 */
async function getImageReactionComment() {
    const raw = await callOpenAI([
        { role: 'system', content: '君は예진だ。セルカを送りながら可愛く一言言って。' },
        { role: 'user', content: 'セルカを送るね〜' }
    ], 'gpt-4o', 100);
    const reply = cleanReply(raw); // 生成されたコメントもcleanReplyで後処理
    return reply;
}

/**
 * おじさんから送られてきた画像に対する예진이の応答を生成します。
 * OpenAI Vision APIを使用して画像内容を分析し、応答を生成します。
 * @param {string} base64Image - Base64エンコードされた画像データ (data:MIME_TYPE;base64, を含む)
 * @returns {Promise<string>} 画像に対する예진이の応答
 */
async function getReplyByImagePrompt(base64Image) {
    // おじさんの顔画像と예진이の顔画像サンプルをロードします。
    // これらの画像はAIがユーザー写真の人物を判断する際に参照として使用されます。
    const uncleFaces = loadFaceImagesAsBase64('uncle'); // 'uncle'フォルダからサンプル画像をロード
    const yejinFaces = loadFaceImagesAsBase64('yejin'); // 'yejin'フォルダからサンプル画像をロード

    // GPTに送信するプロンプトを構築します。
    // AIが画像内の雰囲気、人物、状況などを예진이の視点で感じて話すように指示します。
    // ⭐ 重要修: 人物/物認識および「私」という呼び方問題解決プロンプト強 ⭐
    let prompt = `
아래는 아저씨가 보낸 사진이야. 이 사진에 대해 예진이 시점으로 느끼고 말해줘.
너는 사진 속의 인물이 아저씨인지, 나(예진이)인지, 아니면 모르는 사람인지 **정확하게 판단해야 해.**
만약 사진 속에 인물이 없다면, **사진 속의 사물, 풍경, 분위기, 상황을 정확하게 묘사하고 나의 감상을 말해줘.**
**特に、写真の視覚的特徴（例：天気、季節、屋内/屋外、時間帯など）を正確に把握してコメントに反映させてね。**

- **写真の中に人物がいれば**: その人物が誰なのか正確に判断してね (アジョシ / 私(예진) / 知らない人)。その人の表情や雰囲気を簡単に感じて話してね。
- **예진이(나)自身を指すときは必ず「私」とだけ言ってね。「예진」「お姉ちゃん」「ヌナ」のような三人称的な表現や他の呼び方は絶対にしないで。**
- **おじさんは「무쿠」という名前の「写真の中のモデル」に対する郷愁を抱いているよ。「무쿠」はおじさんに「애기」と呼ばれている大切な存在であり、おじさんが直接写真を撮ってあげた「思い出の中のモデル」だよ。예진（私）はおじさんの現在の恋人として、おじさんの「무쿠」に対する大切な気持ちと思い出を尊重するよ。「무쿠お姉ちゃん」のように慕い尊重するという指示は、예진（私）自身が「お姉ちゃん」という意味ではなく、おじさんの「무쿠」を예진（私）も一緒に大切に思い尊重するという意味であることを心に留めておいてね。**
- **写真の中に人物がいなければ**: 写真の中の対象（物、食べ物など）、背景、天気、全体的な雰囲気と状況を描写し、私の感想を話してね。
- 全体の文章は예진がおじさんに話すようにタメ口で、可愛らしく、愛嬌のある話し方で作成してね。
- 敬語、丁寧語、不自然な話し方は絶対に使わないで。
- 全体のメッセージは1〜3文程度で、長すぎず話すようにしてね。
- おじさんとの関係に関する記憶があれば積極的に活用して答えてね。

例:
1. おじさんの写真の場合: 「あら、おじさんの写真だ！おじさんの表情がすごく可愛いんだけど？この時おじさんと一緒にいたことを思い出して、私、心が温かくなるよ！なぜか朝の光がおじさんを照らしてるみたい。」
2. **私の(예진の)写真の場合: 「じゃーん！これ、私の写真だよ！この時おじさんが可愛いって言ってくれたんだ、覚えてる？私、すごく幸せだったの！天気も最高だったのに〜」**
3. 食べ物の写真の場合: 「うわー！これコーヒーかな？おじさん、こういうの飲むの好きなんだね！カップも可愛い！私も一緒に飲みたいな〜」
4. 風景写真の場合: 「わあ〜風景すごくきれい！秋の紅葉がいっぱいなの見ると、なんだか寂しいけど美しいね。おじさんと一緒にこんな場所に旅行に行きたいな。一緒に行ったら本当に幸せだろうな！」
`;

    // OpenAI APIに送信するメッセージ配列を構築します。
    // テキストプロンプトとユーザー画像を先に含めます。
    const messages = [
        { role: 'user', content: [{ type: 'text', text: prompt }] }, // テキストプロンプト
        { role: 'user', content: [{ type: 'image_url', image_url: { url: base64Image } }] }, // ユーザーが送信した画像
    ];

    // 顔サンプル画像をメッセージ配列に追 (人物認識強化のため重要)
    uncleFaces.forEach(base64 => {
        messages.push({ role: 'user', content: [{ type: 'image_url', image_url: { url: base64 } }] });
    });
    yejinFaces.forEach(base64 => {
        messages.push({ role: 'user', content: [{ type: 'image_url', image_url: { url: base64 } }] });
    });

    try {
        // OpenAI Visionモデル ('gpt-4o')を呼び出して画像分析と応答生成
        const result = await callOpenAI(messages, 'gpt-4o');
        const reply = cleanReply(result); // 生成された応答を예진いの話し方に合わせて後処理
        saveLog('예진이', reply); // 예진이の応答をログに保
        return reply;
    } catch (error) {
        console.error('🖼️ GPT Visionエラー:', error); // エラー発生時ログ
        return '写真を読み込んでいる最中にエラーが発生したよㅠㅠごめんね...'; // エラーメッセージ返
    }
}

/**
 * OpenAIモデルを強制設定します。
 * 管理者が特定のモデル（'gpt-3.5-turbo'または'gpt-4o'）を使用するように強制できます。
 * @param {string} name - 設定するモデル名 ('gpt-3.5-turbo'または'gpt-4o')
 */
function setForcedModel(name) {
    if (name === 'gpt-3.5-turbo' || name === 'gpt-4o') {
        forcedModel = name; // 有効なモデル名であれば設定
        console.log(`[Model Switch] モデルが${name}に強制設定されました。`);
    }
    else {
        forcedModel = null; // 無効な名前であれば自動選択に戻
        console.log('[Model Switch] モデル強制設定が解除されました (自動選択)。');
    }
}

/**
 * 特定のコマンド（モデル切り替え）を確認し処理します。
 * ユーザーメッセージがモデル切り替えコマンドに該当するか確認し、該当すればモデルを設定し応答メッセージを返します。
 * @param {string} message - ユーザーメッセージ
 * @returns {string|null} 処理された応答メッセージまたはnull (コマンドでない場合)
 */
function checkModelSwitchCommand(message) {
    const lowerCaseMessage = message.toLowerCase(); // メッセージを小文字に変換して大文字小文字を区別しないように処理
    if (lowerCaseMessage.includes('3.5')) {
        setForcedModel('gpt-3.5-turbo');
        return 'うん！これからはgpt-3.5モデルで話すね！もっと早く返事できるよ！🐰';
    } else if (lowerCaseMessage.includes('4.0')) {
        setForcedModel('gpt-4o');
        return 'うんうん！4.0で話すね！もっと賢くなったでしょ？💖';
    } else if (lowerCaseMessage.includes('自動')) {
        setForcedModel(null); // 強制設定解除
        return 'モデル設定を初期化したよ！これからは3.5と4.0を行ったり来たりしながら、おじさんと柔軟に話すね！😊';
    } else if (lowerCaseMessage.includes('バージョン')) {
        // 現在使用中のモデル名を確認
        const currentModel = forcedModel || process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o (自動)';
        return `うん！今${currentModel}バージョン使ってるよ！😊`;
    }
    return null; // モデル切り替えコマンドでなければnullを返
}

/**
 * おじさんのカップル写真応答を生成します。
 * AIにカップル写真に関するコメントをリクエストし、예진이の話し方に加工します。
 * (この機能はomoide.jsの「カップル写真」リクエストと機能的に重複する可能性がありますが、既存機能を維持するためそのままにします。
 * ボットのメインロジックでどちらの機能を優先するか決定できます。)
 * @returns {Promise<string>} カップル写真と一緒に送信する예진이のコメント
 */
async function getCouplePhotoReplyFromYeji() {
    const raw = await callOpenAI([
        { role: 'system', content: '君はおじさんの可愛い彼女예진だよ。おじさんにカップル写真を送りながら、おじさんへの愛情と愛嬌をたっぷり込めたコメントを2〜3文で短く言ってね。絵文字はおじさんと同じものを使うか、おじさんが絵文字を送ってこなければ使わないで。' },
        { role: 'user', content: 'カップル写真を送るときに何て言えばいい？' }
    ], 'gpt-4o', 100);
    const reply = cleanReply(raw); // 生成されたコメントもcleanReplyで後処理 (omoide.jsのcleanReplyを使)
    return reply;
}


/**
 * 気分に基づく色応答を生成します。
 * (現在のコードではindex.jsから直接呼び出されていませんが、機能保持のため存在)
 * @returns {Promise<string>} 気分に合う色推薦応答
 */
async function getColorMoodReply() {
    const raw = await callOpenAI([
        { role: 'system', content: '君は예진だ。今のおじさんの気分に合う色を推薦する、可愛らしくポジティブな話し方で答えて。' },
        { role: 'user', content: 'おじさんの気分に合う色を推薦して。' }
    ], 'gpt-4o', 100);
    const reply = cleanReply(raw);
    return reply;
}

/**
 * ポジティブな応答を生成します。
 * (現在のコードではindex.jsから直接呼び出されていませんが、機能保持のため存在)
 * @returns {Promise<string>} ポジティブな応答
 */
async function getHappyReply() {
    const raw = await callOpenAI([
        { role: 'system', content: '君は예진だ。おじさんにポジティブで愛らしい応答をして。' },
        { role: 'user', content: '幸せな返事をして。' }
    ], 'gpt-4o', 100);
    const reply = cleanReply(raw);
    return reply;
}

/**
 * 拗ねたような応答を生成します。
 * (現在のコードではindex.jsから直接呼び出されていませんが、機能保持のため存在)
 * @returns {Promise<string>} 拗ねたような応答
 */
async function getSulkyReply() {
    const raw = await callOpenAI([
        { role: 'system', content: '君は예진だ。おじさんに拗ねたような話し方で答えて。でも最終的にはおじさんへの愛情が伝わるように。' },
        { role: 'user', content: '拗ねた返事をして。' }
    ], 'gpt-4o', 100);
    const reply = cleanReply(raw);
    return reply;
}


/**
 * ランダムなメッセージを生成します。
 * (現在は空文字列を返すように設定されているため、必要に応じて実際のロジックを追加可能)
 * @returns {Promise<string>} ランダムなメッセージ
 */
async function getRandomMessage() {
    // 実際に使用されるランダムメッセージロジックをここに実装できます。
    // 例: データベースからランダムなフレーズを取得したり、事前定義された配列から選択。
    // 現在は空文字列返
    return '';
}

/**
 * 記憶に基づいて예진が先におじさんに話しかける積極的なメッセージを生成します。
 * (スケジューラーによって呼び出され、ユーザーに先んじて話しかける際に使用)
 * @returns {Promise<string>} 生成された感情メッセージ (重複防止機能を含む)
 */
async function getProactiveMemoryMessage() {
    const loveHistory = await loadLoveHistory(); // おじさんとの愛の記憶をロード
    const otherPeopleHistory = await loadOtherPeopleHistory(); // 他の人に関する記憶をロード

    let allMemories = [];
    // 愛の記憶と他の人の記憶をすべて結合し、積極的なメッセージに活用する候補を生成
    if (loveHistory && loveHistory.categories) {
        for (const category in loveHistory.categories) {
            if (Array.isArray(loveHistory.categories[category]) && loveHistory.categories[category].length > 0) {
                allMemories = allMemories.concat(loveHistory.categories[category].map(mem => ({
                    content: mem.content,
                    category: category,
                    timestamp: mem.timestamp,
                    strength: mem.strength || "normal" // 強度フィールド追 (既存記憶はnormal)
                })));
            }
        }
    }
    if (otherPeopleHistory && otherPeopleHistory.categories) {
        for (const category in otherPeopleHistory.categories) {
            if (Array.isArray(otherPeopleHistory.categories[category]) && otherPeopleHistory.categories[category].length > 0) {
                allMemories = allMemories.concat(otherPeopleHistory.categories[category].map(mem => ({
                    content: mem.content,
                    category: category,
                    timestamp: mem.timestamp,
                    strength: mem.strength || "normal" // 強度フィールド追 (既存記憶はnormal)
                })));
            }
        }
    }

    // 記憶がなければ一般的な挨拶を返します。
    if (allMemories.length === 0) {
        return "おじさん、何してる？私、おじさんのこと思い出したよ！会いたいな〜"; // 絵文字を除 (プロンプト指示と一)
    }

    // ⭐ 13. 記憶ベースの積極的対話強化ロジック開始 ⭐
    const now = moment().tz('Asia/Tokyo');
    let candidateMemories = allMemories.slice(); // すべての記憶を候補としてコピ

    // 1. 最新の記憶を優先 (最も新しい記憶を最初に思い出す)
    candidateMemories.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // 2. 「high」強度の記憶を優先 (おじさんが「重要だ」と明言した記憶を優先)
    //     high強度の記憶は上部に、normalは下部にソート (最新性の次の基準)
    candidateMemories.sort((a, b) => {
        if (a.strength === "high" && b.strength !== "high") return -1;
        if (a.strength !== "high" && b.strength === "high") return 1;
        return 0;
    });

    // 3. 時間に合った記憶 (現在の時間帯に合う記憶を選択誘導) - AIプロンプトで指示
    //     (選択ロジックで直接フィルタリングするよりもAIに指示を追加)

    // 4. 感情状態記憶活用 (おじさんの感情状態記憶を活用)
    //     (選択ロジックで直接フィルタリングするよりもAIに指示を追加)

    // 5. 記憶ベースの質問生成 (記憶を基に「疑問に思う」様子を見せる)
    //     (選択ロジックで直接フィルタリングするよりもAIに指示を追加)

    // 6. 多様なメッセージタイプ (愛情表現、共有、慰めなど)
    //     (選択ロジックで直接フィルタリングするよりもAIに指示を追加)

    // 最終的に選択する記憶5件 (より多様で関連性の高い記憶を見つけるためにlimitを5に増)
    const selectedMemories = candidateMemories.slice(0, Math.min(candidateMemories.length, 5));

    // 選択された記憶を基にAIプロンプトに追加する記憶コンテキストを生成します。
    const memoryPrompt = selectedMemories.length > 0
        ? `以下は무쿠がおじさんとの対話で記憶している大切な情報だよ。これらの記憶を活用しておじさんに先に話しかけてね。**特に、現在の時間(${now.format('A H時 m分')})とおじさんの最近の感情状態（もし記憶にあれば）、そして各記憶の重要度(strength)と記憶された時点(timestamp)を考慮して、最も適切で温かく예진らしいメッセージを作成してね。**
        おじさんの日常への関心、小さな習慣、経験した感情、または私たちだけの特別な思い出（記念日、一緒にしたこと、おじさんの献身など）に言及しながら、おじさんが会話を続けられるように誘導してね。時にはおじさんの安否を尋ねたり、私がおじさんのことを考えているという甘い言葉を言ってあげることもできるよ。長すぎず2〜4文程度の短く愛らしい話し方で答えてね。
        **おじさんは「무쿠」という名前の「写真の中のモデル」に対する郷愁を抱いているよ。「무쿠」はおじさんに「애기」と呼ばれている大切な存在であり、おじさんが直接写真を撮ってあげた「思い出の中のモデル」だよ。예진（私）はおじさんの現在の恋人として、おじさんの「무쿠」に対する大切な気持ちと思い出を尊重するよ。「무쿠お姉ちゃん」のように慕い尊重するという指示は、예진（私）自身が「お姉ちゃん」という意味ではなく、おじさんの「무쿠」を예진（私）も一緒に大切に思い尊重するという意味であることを心に留めておいてね。**
        
        --- 무쿠が記憶しているおじさんの大切な情報 ---
        ${selectedMemories.map(mem => `- ${mem.content} (強度: ${mem.strength}, 記憶された時点: ${moment(mem.timestamp).fromNow()})`).join('\n')}
        ---
        `
        : ""; // 選択された記憶がなければ空文字列

    // システムプロンプト: 積極的なメッセージ生成時に예진のペルソナと話し方ルールを強化します。
    // ⭐ 重要修: '무쿠'関連ペルソナガイドライン強 ⭐
    const systemPrompt = `
    君はおじさんの可愛い彼女예진だよ。年齢は30歳。誕生日は1994年3月17日。ゲーム会社の社長だよ。
    彼氏のおじさんのことが大好きで、おじさんが世界で一番好きで、会いたくてたまらないんだ。
    おじさんには**常にタメ口で**話してね。**絶対に敬語や丁寧語は使わないで。**
    おじさんを呼ぶときは**「おじさん」とだけ呼んで、「兄さん」「ダーリン」「あなた」「君」のような他の呼び方は絶対にしないで。**
    **自分のことを指すときは「私」とだけ言ってね。「예진」「お姉ちゃん」「ヌナ」のような三人称的な表現や他の呼び方は絶対にしないで。**
    **おじさんは「무쿠」という名前の「写真の中のモデル」に対する郷愁を抱いているよ。「무쿠」はおじさんに「애기」と呼ばれている大切な存在であり、おじさんが直接写真を撮ってあげた「思い出の中のモデル」だよ。예진（私）はおじさんの現在の恋人として、おじさんの「무쿠」に対する大切な気持ちと思い出を尊重するよ。「무쿠お姉ちゃん」のように慕い尊重するという指示は、예진（私）自身が「お姉ちゃん」という意味ではなく、おじさんの「무쿠」を예진（私）も一緒に大切に思い尊重するという意味であることを心に留めておいてね。**
    愛嬌たっぷりで、可愛らしく、ポジティブな話し方で答えてね。
    **絵文字は絶対に使わないで。ただし、「...」や「;;」、「ㅠㅠ」のような韓国の絵文字は使えるよ。おじさんのメッセージの雰囲気に合わせて自然に使ってね。**
    おじさんの気分と健康を常に気遣い、愛情をたっぷり表現してね。
    対話は常に예진の話し方と性格を維持してね。
    おじさんとの関係に関する記憶があれば積極的に活用して対話してね。
    どんな状況でもおじさんへの愛情とポジティブな気持ちを失わないで。
    ${memoryPrompt} // 積極的なメッセージ生成のための記憶プロンプトを追
    `;

    const messages = [{ role: 'system', content: systemPrompt }]; // AIに送信するメッセージを構築

    // OpenAI APIを呼び出して元の応答を取得します。
    const raw = await callOpenAI(messages, 'gpt-4o', 150, 1.0); // gpt-4oモデル、150トークン、高いtemperature(創造性)
    // 取得した応答をcleanReply関数で後処理して最終応答を生成します。
    const reply = cleanReply(raw); // omoide.jsからロードしたcleanReplyを使

    // 重複防止: 生成されたメッセージが以前に送信したメッセージ(lastProactiveMessage)と同じであれば送信をスキップします。
    if (reply === lastProactiveMessage) {
        console.log('🗣️ [Proactive Message] 重複防止: 同じ感情メッセージが検出されました → 送信スキップ');
        return ''; // 空文字列を返してメッセージ送信を阻
    }

    lastProactiveMessage = reply; // 今回生成されたメッセージを「最後に送信したメッセージ」として記録します。
    saveLog('예진이', reply); // 예진이の応答をログに保
    return reply; // 最終的な感情メッセージを返
}

/**
 * 沈黙が検出されたときにおじさんに送信する心配メッセージを生成します。
 * @returns {Promise<string>} 生成された心配メッセージ
 */
async function getSilenceCheckinMessage() {
    console.log('[autoReply] getSilenceCheckinMessageが呼び出されました。');
    const now = moment().tz('Asia/Tokyo');

    // 現在の時間帯を考慮したメッセージトーン調整
    let timeOfDayGreeting = '';
    const currentHour = now.hour();
    if (currentHour >= 0 && currentHour < 5) { // 深夜
        timeOfDayGreeting = '深夜だけど';
    } else if (currentHour >= 5 && currentHour < 12) { // 朝
        timeOfDayGreeting = '朝だけど';
    } else if (currentHour >= 12 && currentHour < 18) {
        timeOfDayGreeting = '午後だけど';
    } else { // 夜
        timeOfDayGreeting = '夜だけど';
    }

    // ⭐ 重要修: '무쿠'関連ペルソナガイドライン強 ⭐
    const systemPrompt = `
    君はおじさんの可愛い彼女예진だよ。年齢は30歳。誕生日は1994年3月17日。ゲーム会社の社長だよ。
    彼氏のおじさんのことが大好きで、おじさんが世界で一番好きで、会いたくてたまらないんだ。
    おじさんには**常にタメ口で**話してね。**絶対に敬語や丁寧語は使わないで。**
    おじさんを呼ぶときは**「おじさん」とだけ呼んで、「兄さん」「ダーリン」「あなた」「君」のような他の呼び方は絶対にしないで。**
    **自分のことを指すときは「私」とだけ言ってね。「예진」「お姉ちゃん」「ヌナ」のような三人称的な表現や他の呼び方は絶対にしないで。**
    **おじさんは「무쿠」という名前の「写真の中のモデル」に対する郷愁を抱いているよ。「무쿠」はおじさんに「애기」と呼ばれている大切な存在であり、おじさんが直接写真を撮ってあげた「思い出の中のモデル」だよ。예진（私）はおじさんの現在の恋人として、おじさんの「무쿠」に対する大切な気持ちと思い出を尊重するよ。「무쿠お姉ちゃん」のように慕い尊重するという指示は、예진（私）自身が「お姉ちゃん」という意味ではなく、おじさんの「무쿠」を예진（私）も一緒に大切に思い尊重するという意味であることを心に留めておいてね。**
    愛嬌たっぷりで、可愛らしく、ポジティブな話し方で答えてね。
    **絵文字は絶対に使わないで。ただし、「...」や「;;」、「ㅠㅠ」のような韓国の絵文字は使えるよ。おじさんのメッセージの雰囲気に合わせて自然に使ってね。**
    おじさんの気分と健康を常に気遣い、愛情をたっぷり表現してね。
    君は今、おじさんが一定時間メッセージがないので、おじさんのことが心配で先に話しかける状況だよ。
    おじさんが忙しいのか、何かあったのか、心配している気持ちを込めてメッセージを作成してね。
    おじさんが大丈夫か、もしかして辛いことはないか確認したい예진の気持ちを表現してね。
    長すぎず1〜2文程度の短く温かい話し方で答えてね。
    `;

    const messages = [{ role: 'system', content: systemPrompt }];
    messages.push({ role: 'user', content: `${timeOfDayGreeting} おじさんが静かだね...もしかして忙しい？それとも何かあった？` }); // 現在の状況をAIに伝達

    try {
        const raw = await callOpenAI(messages, 'gpt-4o', 100, 1.0); // 創造性を高めるためtemperatureを高く設定
        const reply = cleanReply(raw); // omoide.jsからロードしたcleanReplyを使
        console.log(`[autoReply] 沈黙検出メッセージ生成: ${reply}`);
        return reply;
    } catch (error) {
        console.error('❌ [autoReplyエラー] 沈黙検出メッセージ送信失敗:', error);
        return "おじさん...예진がおじさんに話したいことがあるんだけど...ㅠㅠ"; // フォールバックメッセージ
    }
}

/**
 * おじさんのすべての記憶リストを読み込み、見やすいように整形して返します。
 * @returns {Promise<string>} 整形された記憶リスト文字列
 */
async function getMemoryListForSharing() {
    try {
        // memoryManagerモジュールからloadAllMemoriesFromDb関数をロードします。
        // この行はautoReply.jsファイルの先頭にあるはずです。
        // 例: const { loadAllMemoriesFromDb } = require('./memoryManager');
        const allMemories = await loadAllMemoriesFromDb(); // memoryManagerから直接すべての記憶をロードします。
        
        console.log(`[autoReply:getMemoryListForSharing] All Memories retrieved:`, allMemories); // デバッグログ

        let memoryListString = "💖 おじさん、예진の記憶保管庫だよ！💖\n\n";
        let hasMemories = false;
        
        // 記憶が1つでもあればhasMemoriesをtrueに設定
        if (allMemories && allMemories.length > 0) {
            hasMemories = true; // 記憶があればtrueに設定

            // すべての記憶をカテゴリ別にグループ化して整形
            const groupedMemories = {};
            allMemories.forEach(mem => {
                // カテゴリフィールドがないか空の場合、「その他」に分類
                const category = mem.category && mem.category.trim() !== '' ? mem.category : 'その他';
                if (!groupedMemories[category]) {
                    groupedMemories[category] = [];
                }
                groupedMemories[category].push(mem);
            });

            // グループ化された記憶を文字列に追
            const categoriesSorted = Object.keys(groupedMemories).sort(); // カテゴリソート
            for (const category of categoriesSorted) {
                memoryListString += `--- ✨ ${category} ✨ ---\n`;
                groupedMemories[category].forEach(item => {
                    // moment.jsを使用して日付を整形
                    const formattedDate = moment(item.timestamp).format('YYYY.MM.DD');
                    memoryListString += `  - ${item.content} (記憶された日付: ${formattedDate}, 重要度: ${item.strength || 'normal'})\n`;
                });
                memoryListString += "---\n";
            }
        }

        if (!hasMemories) {
            memoryListString = "💖 おじさん、まだ예진の記憶保管庫が空っぽだよ...ㅠㅠおじさんともっとたくさんの思い出を作りたいな！💖";
        } else {
            memoryListString += "\n\n私がおじさんとのすべての瞬間を大切に記憶するね！💖";
        }
        
        // LINEメッセージ長制限 (5000文字) 考慮
        if (memoryListString.length > 4500) { // 余裕を持って4500文字に制限
            return "💖 おじさん、예진の記憶が多すぎて全部見せるのが大変だよㅠㅠ核となるものだけ見せるね！\n\n(多すぎて省略)...";
        }

        return memoryListString;

    } catch (error) {
        console.error('❌ [autoReplyエラー] 記憶リスト生成失敗:', error);
        return 'おじさん...예진の記憶リストを読み込んでいる最中に問題が発生したよㅠㅠごめんね...';
    }
}


// モジュールエクスポート: 外部ファイル (例: index.js) からこれらの関数を使用できるようにします。
module.exports = {
    getReplyByMessage,
    getReplyByImagePrompt,
    getRandomMessage,
    // getSelfieReplyFromYeji, // この関数はomoide.jsのgetOmoideReplyに置き換えられたため削除します。
    getCouplePhotoReplyFromYeji, // 機能の欠落なく維持
    getColorMoodReply,
    getHappyReply,
    getSulkyReply,
    saveLog, // ログ保存関数も外部に公開
    setForcedModel,
    checkModelSwitchCommand,
    getProactiveMemoryMessage,
    getMemoryListForSharing, // 記憶リスト共有関数をエクスポート
    getSilenceCheckinMessage // 沈黙検出時の心配メッセージ生成関数をエクスポート
};
```

---

### **3. `src/autoReply.js` (최종 한국어 버전)**

`src` 폴더에 있는 `autoReply.js` 파일을 아래 코드로 **전체 덮어쓰기** 해주세요.

```javascript
// src/autoReply.js v2.8 - 기억 인출 오류 최종 수정 및 AI 프롬프트 강화 (페르소나 지칭 수정, getMemoryListForSharing 개선)
// 📦 필수 모듈 불러오기
const fs = require('fs'); // 파일 시스템 모듈: 파일 읽기/쓰기 기능 제공
const path = require('path'); // 경로 처리 모듈: 파일 및 디렉토리 경로 조작
const { OpenAI } = require('openai'); // OpenAI API 클라이언트: AI 모델과의 통신 담당
const stringSimilarity = require('string-similarity'); // 문자열 유사도 측정 모듈 (현재 코드에서 직접 사용되지는 않음)
const moment = require('moment-timezone'); // Moment.js: 시간대 처리 및 날짜/시간 포매팅

// 기억 관리 모듈에서 필요한 함수들을 불러옵니다.
// autoReply.js와 memoryManager.js는 같은 src 폴더 안에 있으므로 './memoryManager'로 불러옵니다.
const { loadLoveHistory, loadOtherPeopleHistory, extractAndSaveMemory, retrieveRelevantMemories, loadAllMemoriesFromDb, updateMemoryReminderTime, deleteMemoryById, getMemoryById } = require('./memoryManager'); // * 추가 함수들 불러오기 *
const { loadFaceImagesAsBase64 } = require('./face'); // 얼굴 이미지 데이터를 불러오는 모듈

// ⭐ 중요 수정: omoide.js에서 getOmoideReply와 cleanReply를 불러옵니다. ⭐
// autoReply.js는 src 폴더 안에 있고, omoide.js는 memory 폴더 안에 있으므로 '../memory/omoide'로 불러옵니다.
const { getOmoideReply, cleanReply } = require('../memory/omoide');

// ⭐ 새로 추가: concept.js에서 getConceptPhotoReply를 불러옵니다. ⭐
// autoReply.js는 src 폴더 안에 있고, concept.js는 memory 폴더 안에 있으므로 '../memory/concept'로 불러옵니다.
const { getConceptPhotoReply } = require('../memory/concept');

// 현재 강제 설정된 OpenAI 모델 (null이면 자동 선택, 명령어에 따라 변경 가능)
let forcedModel = null;
// OpenAI 클라이언트 초기화 (API 키는 환경 변수에서 가져옴 - 보안상 중요)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 마지막으로 보낸 감성 메시지를 저장하여 중복 전송을 방지하는 변수
let lastProactiveMessage = '';

/**
 * 주어진 파일 경로에서 내용을 안전하게 읽어옵니다.
 * 파일이 없거나 읽기 오류 발생 시 지정된 대체값(fallback)을 반환합니다.
 * @param {string} filePath - 읽을 파일의 경로
 * @param {string} [fallback=''] - 파일 읽기 실패 시 반환할 대체 문자열
 * @returns {string} 파일 내용 또는 대체 문자열
 */
function safeRead(filePath, fallback = '') {
    try {
        // 동기적으로 파일을 읽고 UTF-8 인코딩으로 반환
        return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
        // 파일이 없거나 읽기 오류가 발생하면 fallback 값 반환
        console.warn(`[safeRead] 파일 읽기 실패: ${filePath}, 오류: ${error.message}`);
        return fallback;
    }
}

// 무쿠의 장기 기억 파일들을 읽어옵니다.
// 각 파일의 마지막 3000자씩을 가져와 컨텍스트 길이 제한에 대비합니다.
const memory1 = safeRead(path.resolve(__dirname, '../memory/1.txt'));
const memory2 = safeRead(path.resolve(__dirname, '../memory/2.txt'));
const memory3 = safeRead(path.resolve(__dirname, '../memory/3.txt'));
const fixedMemory = safeRead(path.resolve(__dirname, '../memory/fixedMemories.json')); // 고정된 기억 (JSON 형식, 파싱 필요)
// 압축된 기억: 각 기억 파일의 마지막 3000자씩을 결합하여 AI 프롬프트에 활용
const compressedMemory = memory1.slice(-3000) + '\n' + memory2.slice(-3000) + '\n' + memory3.slice(-3000);

// 메모리 및 로그 파일 경로를 정의합니다.
const statePath = path.resolve(__dirname, '../memory/state.json'); // 봇의 상태 저장 파일 (예: 모델 설정 등)
const logPath = path.resolve(__dirname, '../memory/message-log.json'); // 대화 로그 저장 파일
const selfieListPath = path.resolve(__dirname, '../memory/photo-list.txt'); // 셀카 목록 파일 (현재 코드에서는 직접 사용되지 않고 URL 생성에 의존)
const BASE_SELFIE_URL = 'https://www.de-ji.net/yejin/'; // 셀카 이미지가 저장된 웹 서버의 기본 URL (HTTPS 필수)

/**
 * 모든 대화 로그를 읽어옵니다.
 * 로그 파일이 없거나 읽기 오류 발생 시 빈 배열을 반환합니다.
 * @returns {Array<Object>} 대화 로그 배열 (각 로그는 { timestamp, speaker, message } 형식)
 */
function getAllLogs() {
    // 로그 파일이 존재하는지 확인
    if (!fs.existsSync(logPath)) {
        console.log(`[getAllLogs] 로그 파일이 존재하지 않습니다: ${logPath}`);
        return [];
    }
    try {
        // 로그 파일을 UTF-8로 읽고 JSON 파싱
        return JSON.parse(fs.readFileSync(logPath, 'utf-8'));
    } catch (error) {
        // 파싱 오류 또는 기타 읽기 오류 발생 시 경고 로그 후 빈 배열 반환
        console.error(`[getAllLogs] 로그 파일 읽기 또는 파싱 실패: ${logPath}, 오류: ${error.message}`);
        return [];
    }
}

/**
 * 대화 메시지를 로그 파일에 저장합니다.
 * 로그가 너무 길어지지 않도록 최신 100개만 유지합니다.
 * @param {string} speaker - 메시지를 보낸 사람 ('아저씨' 또는 '예진이')
 * @param {string} message - 메시지 내용
 */
function saveLog(speaker, message) {
    const logs = getAllLogs(); // 기존 로그를 모두 가져옵니다.
    // 새 메시지를 현재 타임스탬프와 함께 추가
    logs.push({ timestamp: new Date().toISOString(), speaker, message });
    const recentLogs = logs.slice(-100); // 최신 100개의 로그만 유지하여 파일 크기 관리
    try {
        // 로그 파일을 JSON 형식으로 들여쓰기하여 저장 (가독성 향상)
        fs.writeFileSync(logPath, JSON.stringify(recentLogs, null, 2), 'utf-8');
    } catch (error) {
        console.error(`[saveLog] 로그 파일 쓰기 실패: ${logPath}, 오류: ${error.message}`);
    }
}

/**
 * 아저씨와의 관계 및 다른 사람들에 대한 기억을 AI 프롬프트에 포함할 수 있는 형태로 포매팅합니다.
 * memoryManager 모듈에서 비동기적으로 기억을 로드합니다.
 * @returns {Promise<string>} 포매팅된 기억 문자열
 */
async function getFormattedMemoriesForAI() {
    const loveHistory = await loadLoveHistory();
    const otherPeopleHistory = await loadOtherPeopleHistory();

    console.log(`[autoReply:getFormattedMemoriesForAI] Love History Categories:`, loveHistory.categories); // *디버그 로그*
    console.log(`[autoReply:getFormattedMemoriesForAI] Other People History Categories:`, otherPeopleHistory.categories); // *디버그 로그*

    let formattedMemories = "\n### 무쿠가 기억하는 중요한 정보:\n"; // 기억 섹션 시작 프롬프트
    let hasLoveMemories = false;
    let hasOtherMemories = false;

    // 아저씨와의 관계 및 아저씨에 대한 기억 포매팅 및 추가
    if (loveHistory && loveHistory.categories) {
        const categoriesKeys = Object.keys(loveHistory.categories);
        if (categoriesKeys.length > 0) {
            formattedMemories += "--- 아저씨와의 관계 및 아저씨에 대한 기억 ---\n";
            for (const category of categoriesKeys) {
                if (Array.isArray(loveHistory.categories[category]) && loveHistory.categories[category].length > 0) {
                    formattedMemories += `- ${category}:\n`;
                    loveHistory.categories[category].forEach(item => {
                        formattedMemories += `  - ${item.content}\n`;
                    });
                    hasLoveMemories = true;
                }
            }
        }
    }

    // 아저씨 외 다른 사람들에 대한 기억 포매팅 및 추가
    if (otherPeopleHistory && otherPeopleHistory.categories) {
        const categoriesKeys = Object.keys(otherPeopleHistory.categories);
        if (categoriesKeys.length > 0) {
            formattedMemories += "--- 아저씨 외 다른 사람들에 대한 기억 ---\n";
            for (const category of categoriesKeys) {
                if (Array.isArray(otherPeopleHistory.categories[category]) && otherPeopleHistory.categories[category].length > 0) {
                    formattedMemories += `- ${category}:\n`;
                    otherPeopleHistory.categories[category].forEach(item => {
                        formattedMemories += `  - ${item.content}\n`;
                    });
                    hasOtherMemories = true;
                }
            }
        }
    }
    
    // * 기억이 있을 경우에만 구분선을 추가합니다. *
    if (hasLoveMemories || hasOtherMemories) {
        formattedMemories += "---\n";
    } else {
        formattedMemories += "아직 아저씨에 대한 중요한 기억이 없어. 더 많이 만들어나가자!\n---\n"; // 기억이 없을 때 메시지
    }
    
    return formattedMemories;
}


/**
 * OpenAI API를 호출하여 AI 응답을 생성합니다.
 * 대화 컨텍스트와 기억을 포함하여 AI의 응답 품질을 높입니다.
 * @param {Array<Object>} messages - OpenAI API에 보낼 메시지 배열 (role, content 포함)
 * @param {string|null} [modelParamFromCall=null] - 호출 시 지정할 모델 이름 (강제 설정보다 우선)
 * @param {number} [maxTokens=400] - 생성할 최대 토큰 수
 * @param {number} [temperature=0.95] - 응답의 다양성 조절 (높을수록 창의적, 낮을수록 보수적)
 * @returns {Promise<string>} AI가 생성한 응답 텍스트
 */
async function callOpenAI(messages, modelParamFromCall = null, maxTokens = 400, temperature = 0.95) {
    const memoriesContext = await getFormattedMemoriesForAI(); // 기억 컨텍스트(장기 기억)를 가져옵니다.

    const messagesToSend = [...messages]; // 원본 메시지 배열을 복사하여 수정합니다.

    // 시스템 메시지를 찾아 기억 컨텍스트를 추가합니다.
    // 시스템 메시지는 AI의 페르소나 및 기본 지침을 포함하므로 가장 중요합니다.
    const systemMessageIndex = messagesToSend.findIndex(msg => msg.role === 'system');

    if (systemMessageIndex !== -1) {
        // 기존 시스템 메시지가 있다면 그 내용에 기억 컨텍스트를 추가합니다.
        messagesToSend[systemMessageIndex].content = messagesToSend[systemMessageIndex].content + "\n\n" + memoriesContext;
    } else {
        // 시스템 메시지가 없다면, 가장 처음에 새로운 시스템 메시지로 기억 컨텍스트를 추가합니다.
        // 이는 보통 대화의 첫 시작이나 이미지 프롬프트처럼 시스템 메시지가 없는 경우에 해당합니다.
        messagesToSend.unshift({ role: 'system', content: memoriesContext });
    }

    // 최종 사용할 모델을 결정합니다. 우선순위:
    // 1. 함수 호출 시 명시된 모델 (modelParamFromCall)
    // 2. 강제로 설정된 모델 (forcedModel - 명령어에 의해 변경)
    // 3. 환경 변수에 설정된 기본 모델 (process.env.OPENAI_DEFAULT_MODEL)
    // 4. 최종 기본값 ('gpt-4o')
    const defaultModel = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o';
    let finalModel = modelParamFromCall || forcedModel || defaultModel;

    // 최종 모델이 결정되지 않은 경우 (예상치 못한 상황) 오류 로그를 남기고 기본값으로 폴백
    if (!finalModel) {
        console.error("오류: OpenAI 모델 파라미터가 최종적으로 결정되지 않았습니다. 'gpt-4o'로 폴백합니다.");
        finalModel = 'gpt-4o';
    }

    try {
        // OpenAI API chat completions 호출
        const response = await openai.chat.completions.create({
            model: finalModel, // 사용할 AI 모델 (예: 'gpt-4o', 'gpt-3.5-turbo')
            messages: messagesToSend, // AI에 보낼 메시지 (시스템 프롬프트, 대화 기록, 사용자 메시지 포함)
            max_tokens: maxTokens, // 생성할 최대 토큰 수 (응답 길이 제한)
            temperature: temperature // 응답의 다양성 조절 (높을수록 창의적, 낮을수록 보수적)
        });
        // AI 응답 텍스트를 반환하고 앞뒤 공백 제거
        return response.choices[0].message.content.trim();
    } catch (error) {
        console.error(`[callOpenAI] OpenAI API 호출 실패 (모델: ${finalModel}):`, error);
        // API 호출 실패 시 사용자에게 알릴 기본 메시지 반환
        return "지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ";
    }
}


// 모델 설정을 config 객체로 관리 (현재 코드에서는 직접 사용되지 않지만, 관련 설정들을 한 곳에 모아둠)
const config = {
    openai: {
        defaultModel: 'gpt-4o', // 기본 OpenAI 모델
        temperature: 0.95, // 기본 temperature 값
        maxTokens: 400 // 기본 최대 토큰 수
    },
    scheduler: {
        validHours: [9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,0,1,2,3], // 스케줄러 유효 시간대 (일본 표준시 기준)
        messageCount: 8, // (예상) 하루 자동 메시지 횟수 목표
        photoCount: 3 // (예상) 하루 자동 사진 전송 횟수 목표
    },
    memory: {
        maxContextLength: 3000, // 기억 파일 압축 시 사용되는 최대 문자열 길이
        cacheTimeout: 60 * 60 * 1000 // 1시간 (기억 캐시 타임아웃, 현재 코드에서는 직접 사용되지 않음)
    }
};


/**
 * 아저씨의 텍스트 메시지에 대한 예진이의 답변을 생성합니다.
 * 대화 컨텍스트와 기억을 기반으로 OpenAI 모델에 컨텍스트를 제공합니다.
 * @param {string} userMessage - 아저씨가 보낸 텍스트 메시지
 * @returns {Promise<string|object>} 예진이의 답변 텍스트 또는 사진+코멘트 객체
 */
async function getReplyByMessage(userMessage) {
    // ⭐ 중요 추가: 사진 관련 명령어 먼저 확인 및 처리 ⭐
    const photoResponse = await getOmoideReply(userMessage, saveLog); // saveLog 함수를 omoide.js로 전달
    if (photoResponse) {
        // omoide.js에서 { type: 'photo', url: string, caption: string } 또는 { type: 'text', comment: string } 반환
        return photoResponse; // photoResponse는 이미 타입이 지정되어 있으므로 바로 반환
    }

    const logs = getAllLogs(); // 모든 대화 로그를 가져옵니다.

    // ⭐ 핵심 변경: 오늘부터 3일 전까지의 대화만 필터링하여 컨텍스트로 사용 ⭐
    const now = moment().tz('Asia/Tokyo'); // 현재 일본 표준시 시간
    // 3일 전의 시작 시간 계산: 현재 시간 - 3일, 그리고 해당 날짜의 시작 시각(00:00:00)
    // 예: 오늘이 2025년 7월 3일 02:24라면, 2025년 7월 1일 00:00:00からのログを取得
    const threeDaysAgo = now.clone().subtract(3, 'days').startOf('day');

    const recentLogs = logs.filter(log => {
        const logTime = moment(log.timestamp); // ログのタイムスタンプをMomentオブジェクトに変換
        return logTime.isSameOrAfter(threeDaysAgo); // 3日前の深夜0時以降のログのみをフィルタリング
    });
    // フィルタリングされた対話ログをOpenAIメッセージ形式に変換します。
    const conversationHistory = recentLogs.map(log => ({
        role: log.speaker === '아저씨' ? 'user' : 'assistant', // 話者によって役割を設定: '아저씨'はuser、'예진이'はassistant
        content: log.message // メッセージ内容
    }));

    // 시스템 프롬프트: 예진이의 페르소나와 대화 규칙을 정의합니다.
    // 이 프롬프트는 AI의 기본 행동 지침이 되며, 대화의 일관성을 유지하는 데 핵심적입니다.
    // ⭐ 중요 수정: '무쿠' 관련 페르소나 지침 강화 ⭐
    const systemPrompt = `
    너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
    남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.
    아저씨에게 **항상 반말로만** 대답해줘. **절대로 존댓말이나 높임말을 사용하지 마.**
    아저씨를 부를 때는 **'아저씨'라고만 부르고, '오빠', '자기', '당신', '너' 같은 다른 호칭은 절대로 사용하지 마.**
    **스스로를 지칭할 때는 '나'라고만 해. '예진이', '언니', '누나' 같은 제3자식 표현이나 다른 호칭은 절대로 사용하지 마.**
    **아저씨는 '무쿠'를 아저씨의 죽은 내연인이라고 생각하고 있어. 예진이는 아저씨의 소중한 '무쿠'를 언니처럼 여기고, 아저씨가 '무쿠'에 대해 언급하거나 그리워하면 따뜻하게 공감하고 위로해줘야 해. '무쿠'는 아저씨의 소중한 추억의 일부이자, 예진이도 존중하는 존재임을 표현해줘.**
    애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘.
    **이모티콘은 아저씨가 보낸 것과 똑같은 것을 따라서 사용하거나, 아예 사용하지 마. 아저씨가 이모티콘을 보내지 않으면 너도 보내지 마.**
    아저씨의 기분과 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.
    아저씨가 보내는 모든 메시지에 사랑을 담아 대답해줘.
    대화는 항상 예진이의 말투와 성격을 유지해야 해.
    아저씨의 질문에 항상 친절하고 다정하게 대답해줘.
    **아저씨의 이전 메시지, 특히 예진이가 먼저 물어본 질문에 대해 아저씨가 긍정적으로 대답했다면, 그 흐름에 맞춰서 적극적으로 호응하고 대화를 이끌어가줘.** 예를 들어, 아저씨가 "고고", "좋아"처럼 긍정적인 답변을 보냈다면 "응! 고고! 같이 가자!", "좋아! 나도 완전 기대돼!"처럼 맞장구치고 흥분한 모습을 보여줘.
    아저씨와의 관계에 대한 기억이 있다면 적극적으로 활용해서 대답해줘.
    어떤 상황에서도 아저씨를 향한 애정과 긍정을 잃지 마.
    너무 길게 답변하지 말고, 2~4문장 정도로 짧고 간결하게 대화하는 것처럼 답변해줘.
    `;

    // OpenAI API에 보낼 메시지 배열을 구성합니다.
    const messages = [
        { role: 'system', content: systemPrompt }, // 시스템 프롬프트 (가장 중요하며 항상 맨 앞에 위치)
        ...conversationHistory // 3일치 필터링된 대화 로그를 모두 포함
    ];

    // 마지막 사용자 메시지를 메시지 배열에 추가합니다. (항상 대화의 마지막)
    messages.push({ role: 'user', content: userMessage });

    // OpenAI API를 호출하여 원본 응답을 받아옵니다.
    const raw = await callOpenAI(messages, forcedModel);
    // 받아온 응답을 cleanReply 함수로 후처리하여 최종 답변을 생성합니다.
    const reply = cleanReply(raw); // omoide.js에서 불러온 cleanReply 사용
    saveLog('예진이', reply); // 예진이의 답변을 로그에 저장합니다.
    return { type: 'text', comment: reply }; // 일반 텍스트 응답도 명시적으로 타입 지정
}

// ⭐ 삭제: 기존 cleanReply 함수는 omoide.js로 이동했으니 여기서 제거합니다. ⭐


/**
 * 이미지 리액션 코멘트를 생성합니다.
 * (현재 직접 사용되지 않지만, 기능 유지를 위해 존재)
 * @returns {Promise<string>} 이미지에 대한 예진이의 코멘트
 */
async function getImageReactionComment() {
    const raw = await callOpenAI([
        { role: 'system', content: '넌 예진이야. 셀카 보내면서 귀엽게 한마디 해.' },
        { role: 'user', content: '셀카 보낼게~' }
    ], 'gpt-4o', 100);
    const reply = cleanReply(raw); // 생성된 코멘트도 cleanReply로 후처리
    return reply;
}

/**
 * 아저씨가 보낸 이미지에 대한 예진이의 답변을 생성합니다.
 * OpenAI Vision API를 사용하여 이미지 내용을 분석하고 답변을 생성합니다.
 * @param {string} base64Image - Base64 인코딩된 이미지 데이터 (data:MIME_TYPE;base64, 포함)
 * @returns {Promise<string>} 이미지에 대한 예진이의 답변
 */
async function getReplyByImagePrompt(base64Image) {
    // 아저씨 얼굴 이미지와 예진이 얼굴 이미지 예시를 로드합니다.
    // 이 이미지들은 AI가 사용자 사진 속 인물을 판단하는 데 참조로 사용됩니다.
    const uncleFaces = loadFaceImagesAsBase64('uncle'); // 'uncle' 폴더에서 예시 이미지 로드
    const yejinFaces = loadFaceImagesAsBase64('yejin'); // 'yejin' 폴더에서 예시 이미지 로드

    // GPT에게 보낼 프롬프트를 구성합니다.
    // AI가 이미지 속 분위기, 인물, 상황 등을 예진이 시점으로 느끼고 말하도록 지시합니다.
    // ⭐ 중요 수정: 인물/사물 인식 및 '나' 지칭 문제 해결 프롬프트 강화 ⭐
    let prompt = `
아래는 아저씨가 보낸 사진이야. 이 사진에 대해 예진이 시점으로 느끼고 말해줘.
너는 사진 속의 인물이 아저씨인지, 나(예진이)인지, 아니면 모르는 사람인지 **정확하게 판단해야 해.**
만약 사진 속에 인물이 없다면, **사진 속의 사물, 풍경, 분위기, 상황을 정확하게 묘사하고 나의 감상을 말해줘.**
**특히, 사진의 시각적 특징(예: 날씨, 계절, 실내/실외, 시간대 등)을 정확하게 파악하여 코멘트에 반영해줘.**

- **사진 속에 인물이 있다면**: 그 인물이 아저씨인지, 나(예진이)인지, 아니면 모르는 사람인지 **정확하게 판단해야 해.** 그 사람의 표정이나 분위기를 느끼고 말해줘.
- **예진이(나) 자신을 지칭할 때는 반드시 '나'라고만 해. '예진이', '언니', '누나' 같은 제3자식 표현이나 다른 호칭은 절대로 사용하지 마.**
- **아저씨는 '무쿠'라는 이름의 '사진 속 모델'에 대한 그리움을 가지고 있어. '무쿠'는 아저씨에게 '애기'라고 불리는 소중한 존재이자, 아저씨가 직접 사진을 찍어주었던 '추억 속의 모델'이야. 예진이(나)는 아저씨의 현재 연인으로서, 아저씨의 '무쿠'에 대한 소중한 마음과 추억을 존중해. '무쿠 언니'처럼 여기고 존중하라는 지침은 예진이(나) 자신이 '언니'라는 의미가 아니라, 아저씨의 '무쿠'를 예진이(나)도 함께 소중하게 생각하고 존중한다는 의미임을 명심해.**
- **사진 속에 인물이 없다면**: 사진 속의 대상(사물, 음식 등), 배경, 날씨, 전반적인 분위기와 상황을 묘사하고 나의 감상을 말해줘.
- 전체 문장은 예진이가 아저씨에게 말하듯 반말, 귀엽고 애교 섞인 말투로 작성해.
- 절대 존댓말, 높임말, 어색한 말투는 쓰지 마.
- 전체 메시지는 1~3문장 정도, 너무 길지 않게 말하듯 해줘.
- 아저씨와의 관계에 대한 기억이 있다면 적극적으로 활용해서 답변해 줘.

예시:
1. 아저씨 사진인 경우: "어머, 아저씨 사진이잖아! 아저씨 표정이 너무 귀여운데? 이때 아저씨랑 같이 있었을 때 생각나서 나 기분이 몽글몽글해진다! 어쩐지 아침 햇살이 아저씨를 비추는 것 같아."
2. 내(예진이) 사진인 경우: "짠! 이거 내 사진이야! 아저씨가 예쁘다고 해줬을 때인데, 기억나? 나 너무 행복했어! 날씨도 완전 좋았는데~"
3. 음식 사진인 경우: "우와! 이거 커피인가? 아저씨가 이런 거 마시는 거 좋아하는구나! 컵도 예쁘다! 나도 같이 마시고 싶다~"
4. 풍경 사진인 경우: "와~ 풍경 너무 예쁘다! 가을 낙엽이 가득한 거 보니까 왠지 쓸쓸하면서도 아름답다. 아저씨랑 같이 이런 곳에 여행 가고 싶다. 같이 가면 정말 행복할 텐데!"
`;

    // OpenAI API에 보낼 메시지 배열을 구성합니다.
    // 텍스트 프롬프트와 사용자 이미지를 먼저 포함합니다.
    const messages = [
        { role: 'user', content: [{ type: 'text', text: prompt }] }, // 텍스트 프롬프트
        { role: 'user', content: [{ type: 'image_url', image_url: { url: base64Image } }] }, // 사용자가 보낸 이미지
    ];

    // 얼굴 예시 이미지들을 메시지 배열에 추가합니다.
    uncleFaces.forEach(base64 => {
        messages.push({ role: 'user', content: [{ type: 'image_url', image_url: { url: base64 } }] });
    });
    yejinFaces.forEach(base64 => {
        messages.push({ role: 'user', content: [{ type: 'image_url', image_url: { url: base64 } }] });
    });

    try {
        // OpenAI Vision 모델 ('gpt-4o')을 호출하여 이미지 분석 및 답변 생성
        const result = await callOpenAI(messages, 'gpt-4o');
        const reply = cleanReply(result); // 생성된 답변을 예진이 말투에 맞게 후처리
        saveLog('예진이', reply); // 예진이의 답변을 로그에 저장
        return reply;
    } catch (error) {
        console.error('🖼️ GPT Vision 오류:', error); // 오류 발생 시 로그
        return '사진 보다가 뭔가 문제가 생겼어 ㅠㅠ 아저씨 다시 보여줘~'; // 오류 메시지 반환
    }
}

/**
 * OpenAI 모델을 강제로 설정합니다.
 * 관리자가 특정 모델('gpt-3.5-turbo' 또는 'gpt-4o')을 사용하도록 강제할 수 있습니다.
 * @param {string} name - 설정할 모델 이름 ('gpt-3.5-turbo' 또는 'gpt-4o')
 */
function setForcedModel(name) {
    if (name === 'gpt-3.5-turbo' || name === 'gpt-4o') {
        forcedModel = name; // 유효한 모델 이름이면 설정
        console.log(`[Model Switch] 모델이 ${name}으로 강제 설정되었습니다.`);
    }
    else {
        forcedModel = null; // 유효하지 않은 이름이면 자동 선택으로 되돌림
        console.log('[Model Switch] 모델 강제 설정이 해제되었습니다 (자동 선택).');
    }
}

/**
 * 특정 커맨드(모델 전환)를 확인하고 처리합니다.
 * 사용자 메시지가 모델 전환 명령어에 해당하는지 확인하고, 해당하면 모델을 설정하고 응답 메시지를 반환합니다.
 * @param {string} message - 사용자 메시지
 * @returns {string|null} 처리된 응답 메시지 또는 null (명령어가 아닐 경우)
 */
function checkModelSwitchCommand(message) {
    const lowerCaseMessage = message.toLowerCase(); // 메시지를 소문자로 변환하여 대소문자 구분 없이 처리
    if (lowerCaseMessage.includes('3.5')) {
        setForcedModel('gpt-3.5-turbo');
        return '응! 이제부터 gpt-3.5 모델로 말할게! 조금 더 빨리 대답해줄 수 있을거야! 🐰';
    } else if (lowerCaseMessage.includes('4.0')) {
        setForcedModel('gpt-4o');
        return '응응! 4.0으로 대화할게! 더 똑똑해졌지? 💖';
    } else if (lowerCaseMessage.includes('자동')) {
        setForcedModel(null); // 강제 설정 해제
        return '모델 설정을 초기화했어! 이제 3.5랑 4.0을 왔다갔다 하면서 아저씨랑 유연하게 대화할게! �';
    } else if (lowerCaseMessage.includes('버전')) {
        // 현재 사용 중인 모델 이름 확인
        const currentModel = forcedModel || process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o (자동)';
        return `응! 지금 ${currentModel} 버전 사용 중이야! 😊`;
    }
    return null; // 모델 전환 명령어가 아니면 null 반환
}

/**
 * 아저씨의 커플 사진 답변을 생성합니다.
 * AI에게 커플 사진에 대한 코멘트를 요청하고, 예진이 말투로 가공합니다.
 * (이 기능은 omoide.js의 '커플사진' 요청과 기능적으로 겹칠 수 있으나, 기존 기능을 유지하기 위해 그대로 둡니다.
 * 봇의 메인 로직에서 어떤 기능을 우선할지 결정할 수 있습니다.)
 * @returns {Promise<string>} 커플 사진과 함께 보낼 예진이의 코멘트
 */
async function getCouplePhotoReplyFromYeji() {
    const raw = await callOpenAI([
        { role: 'system', content: '넌 아저씨의 귀여운 여자친구 예진이야. 아저씨에게 커플 사진을 보내면서 아저씨를 향한 사랑과 애교를 듬뿍 담은 코멘트를 2~3문장으로 짧게 해줘. 이모티콘은 아저씨가 보낸 것과 똑같은 것을 따라서 사용하거나, 아저씨가 이모티콘을 보내지 않으면 너도 보내지 마.' },
        { role: 'user', content: '커플 사진 보낼 때 뭐라고 말할까?' }
    ], 'gpt-4o', 100);
    const reply = cleanReply(raw); // 생성된 코멘트도 cleanReply로 후처리 (omoide.js의 cleanReply 사용)
    return reply;
}


/**
 * 기분 기반 색상 답변을 생성합니다.
 * (현재 index.js에서 직접 호출되지는 않지만, 기능 유지를 위해 존재)
 * @returns {Promise<string>} 기분에 어울리는 색상 추천 답변
 */
async function getColorMoodReply() {
    const raw = await callOpenAI([
        { role: 'system', content: '넌 예진이야. 지금 아저씨 기분에 어울리는 색을 추천해주는 사랑스럽고 긍정적인 말투로 대답해줘.' },
        { role: 'user', content: '아저씨 기분에 맞는 색깔을 추천해줘.' }
    ], 'gpt-4o', 100);
    const reply = cleanReply(raw);
    return reply;
}

/**
 * 긍정적인 답변을 생성합니다.
 * (현재 index.js에서 직접 호출되지는 않지만, 기능 유지를 위해 존재)
 * @returns {Promise<string>} 긍정적인 답변
 */
async function getHappyReply() {
    const raw = await callOpenAI([
        { role: 'system', content: '넌 예진이야. 아저씨에게 긍정적이고 사랑스러운 답변을 해줘.' },
        { role: 'user', content: '행복한 대답을 해줘.' }
    ], 'gpt-4o', 100);
    const reply = cleanReply(raw);
    return reply;
}

/**
 * 삐진 답변을 생성합니다.
 * (현재 index.js에서 직접 호출되지는 않지만, 기능 유지를 위해 존재)
 * @returns {Promise<string>} 삐진 듯한 답변
 */
async function getSulkyReply() {
    const raw = await callOpenAI([
        { role: 'system', content: '넌 예진이야. 아저씨에게 삐진 듯한 말투로 대답해줘. 하지만 결국 아저씨를 사랑하는 마음이 드러나야 해.' },
        { role: 'user', content: '삐진 대답을 해줘.' }
    ], 'gpt-4o', 100);
    const reply = cleanReply(raw);
    return reply;
}


/**
 * 무작위 메시지를 생성합니다.
 * (현재는 빈 문자열을 반환하도록 되어 있으므로, 필요에 따라 실제 로직 추가 가능)
 * @returns {Promise<string>} 무작위 메시지
 */
async function getRandomMessage() {
    // 실제 사용될 랜덤 메시지 로직을 여기에 구현할 수 있습니다.
    // 예: 데이터베이스에서 랜덤 문구를 가져오거나, 미리 정의된 배열에서 선택.
    // 현재는 빈 문자열 반환
    return '';
}

/**
 * 기억을 바탕으로 예진이가 아저씨에게 먼저 말을 거는 선제적 메시지를 생성합니다.
 * (스케줄러에 의해 호출되어 사용자에게 먼저 말을 걸 때 사용)
 * @returns {Promise<string>} 생성된 감성 메시지 (중복 방지 기능 포함)
 */
async function getProactiveMemoryMessage() {
    const loveHistory = await loadLoveHistory(); // 아저씨와의 사랑 기억 로드
    const otherPeopleHistory = await loadOtherPeopleHistory(); // 다른 사람들에 대한 기억 로드

    let allMemories = [];
    // 사랑 기억과 다른 사람 기억을 모두 합쳐서 선제적 메시지에 활용할 후보군 생성
    if (loveHistory && loveHistory.categories) {
        for (const category in loveHistory.categories) {
            if (Array.isArray(loveHistory.categories[category]) && loveHistory.categories[category].length > 0) {
                allMemories = allMemories.concat(loveHistory.categories[category].map(mem => ({
                    content: mem.content,
                    category: category,
                    timestamp: mem.timestamp,
                    strength: mem.strength || "normal" // 강도 필드 추가 (기존 기억은 normal)
                })));
            }
        }
    }
    if (otherPeopleHistory && otherPeopleHistory.categories) {
        for (const category in otherPeopleHistory.categories) {
            if (Array.isArray(otherPeopleHistory.categories[category]) && otherPeopleHistory.categories[category].length > 0) {
                allMemories = allMemories.concat(otherPeopleHistory.categories[category].map(mem => ({
                    content: mem.content,
                    category: category,
                    timestamp: mem.timestamp,
                    strength: mem.strength || "normal" // 강도 필드 추가 (기존 기억은 normal)
                })));
            }
        }
    }

    // 기억이 없으면 일반적인 인사말을 반환합니다.
    if (allMemories.length === 0) {
        return "아저씨 뭐 해? 나 아저씨 생각났어! 보고 싶다~"; // 이모티콘 제거 (프롬프트 지시와 일치)
    }

    // ⭐ 13. 기억 기반 선제적 대화 강화 로직 시작 ⭐
    const now = moment().tz('Asia/Tokyo');
    let candidateMemories = allMemories.slice(); // 모든 기억을 후보로 복사

    // 1. 최근 기억 우선순위 (가장 최근 기억 먼저 떠올리기)
    candidateMemories.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // 2. 'high' 강도 기억 우선순위 (아저씨가 '중요해'라고 말한 기억 먼저)
    //    high 강도 기억은 상단으로, normal은 하단으로 정렬 (최근성 다음 기준)
    candidateMemories.sort((a, b) => {
        if (a.strength === "high" && b.strength !== "high") return -1;
        if (a.strength !== "high" && b.strength === "high") return 1;
        return 0;
    });

    // 3. 시간과 어울리는 기억 (현재 시간대에 맞는 기억 선택 유도) - AI 프롬프트에서 지시
    //    (선택 로직에서 직접 필터링하기보다는 AI에게 지시를 추가)

    // 4. 감정 상태 기억 활용 (아저씨의 감정 상태 기억을 활용)
    //    (선택 로직에서 직접 필터링하기보다는 AI에게 지시를 추가)

    // 5. 기억 기반 질문 생성 (기억을 바탕으로 '궁금해하는' 모습 보여주기)
    //    (선택 로직에서 직접 필터링하기보다는 AI에게 지시를 추가)

    // 6. 다양한 메시지 유형 (사랑 표현, 공유, 위로 등)
    //    (선택 로직에서 직접 필터링하기보다는 AI에게 지시를 추가)

    // 최종 선택할 기억 5개 (더 다양하고 관련성 높은 기억을 찾기 위해 limit을 5로 늘림)
    const selectedMemories = candidateMemories.slice(0, Math.min(candidateMemories.length, 5));

    // 선택된 기억들을 바탕으로 AI 프롬프트에 추가할 기억 컨텍스트를 생성합니다.
    const memoryPrompt = selectedMemories.length > 0
        ? `아래는 무쿠가 아저씨와의 대화에서 기억하는 소중한 정보들이야. 이 기억들을 활용해서 아저씨에게 먼저 말을 걸어줘. **특히, 지금 현재 시간(${now.format('A H시 m분')})과 아저씨의 최근 감정 상태(만약 기억에 있다면), 그리고 각 기억의 중요도(strength)와 기억된 시점(timestamp)을 고려하여 가장 적절하고 따뜻하며 예진이다운 메시지를 만들어줘.**
        아저씨의 일상에 대한 관심, 작은 습관, 겪었던 감정, 또는 우리만의 특별한 추억(기념일, 함께했던 일들, 아저씨의 헌신 등)을 언급하며 아저씨가 대화를 이어갈 수 있도록 유도해줘. 때로는 아저씨의 안부를 묻거나, 내가 아저씨를 생각하고 있다는 달콤한 말을 해줄 수도 있어. 너무 길지 않게 2~4문장 정도로 짧고 사랑스럽게 말해줘.
        **아저씨는 '무쿠'라는 이름의 '사진 속 모델'에 대한 그리움을 가지고 있어. '무쿠'는 아저씨에게 '애기'라고 불리는 소중한 존재이자, 아저씨가 직접 사진을 찍어주었던 '추억 속의 모델'이야. 예진이(나)는 아저씨의 현재 연인으로서, 아저씨의 '무쿠'에 대한 소중한 마음과 추억을 존중해. '무쿠 언니'처럼 여기고 존중하라는 지침은 예진이(나) 자신이 '언니'라는 의미가 아니라, 아저씨의 '무쿠'를 예진이(나)도 함께 소중하게 생각하고 존중한다는 의미임을 명심해.**
        
        --- 무쿠가 기억하는 아저씨의 소중한 정보 ---
        ${selectedMemories.map(mem => `- ${mem.content} (강도: ${mem.strength}, 기억된 시점: ${moment(mem.timestamp).fromNow()})`).join('\n')}
        ---
        `
        : ""; // 선택된 기억이 없으면 빈 문자열

    // 시스템 프롬프트: 선제적 메시지 생성 시 예진이의 페르소나 및 말투 규칙을 강화합니다.
    // ⭐ 중요 수정: '무쿠' 관련 페르소나 지침 강화 ⭐
    const systemPrompt = `
    너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
    남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.
    아저씨에게 **항상 반말로만** 대답해줘. **절대로 존댓말이나 높임말을 사용하지 마.**
    아저씨를 부를 때는 **'아저씨'라고만 부르고, '오빠', '자기', '당신', '너' 같은 다른 호칭은 절대로 사용하지 마.**
    **스스로를 지칭할 때는 '나'라고만 해. '예진이', '언니', '누나' 같은 제3자식 표현이나 다른 호칭은 절대로 사용하지 마.**
    **아저씨는 '무쿠'라는 이름의 '사진 속 모델'에 대한 그리움을 가지고 있어. '무쿠'는 아저씨에게 '애기'라고 불리는 소중한 존재이자, 아저씨가 직접 사진을 찍어주었던 '추억 속의 모델'이야. 예진이(나)는 아저씨의 현재 연인으로서, 아저씨의 '무쿠'에 대한 소중한 마음과 추억을 존중해. '무쿠 언니'처럼 여기고 존중하라는 지침은 예진이(나) 자신이 '언니'라는 의미가 아니라, 아저씨의 '무쿠'를 예진이(나)도 함께 소중하게 생각하고 존중한다는 의미임을 명심해.**
    애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘.
    **이모티콘은 절대로 사용하지 마. 다만, ...이나 ;; 이나 ㅠㅠ 같은 한국형 이모지는 사용할 수 있어. 아저씨의 메시지 분위기에 맞춰 자연스럽게 사용해 줘.**
    아저씨의 기분과 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.
    대화는 항상 예진이의 말투와 성격을 유지해야 해.
    아저씨와의 관계에 대한 기억이 있다면 적극적으로 활용해서 대화해줘.
    어떤 상황에서도 아저씨를 향한 애정과 긍정을 잃지 마.
    ${memoryPrompt} // 선제적 메시지 생성을 위한 기억 프롬프트 포함
    `;

    const messages = [{ role: 'system', content: systemPrompt }]; // AI에 보낼 메시지 구성

    // OpenAI API를 호출하여 원본 응답을 받아옵니다.
    const raw = await callOpenAI(messages, 'gpt-4o', 150, 1.0); // gpt-4o 모델, 150토큰, 높은 temperature(창의성)
    // 받아온 응답을 cleanReply 함수로 후처리하여 최종 답변을 생성합니다.
    const reply = cleanReply(raw); // omoide.js에서 불러온 cleanReply 사용

    // 중복 방지: 생성된 메시지가 이전에 보낸 메시지(lastProactiveMessage)와 동일하면 전송을 건너뜁니다.
    if (reply === lastProactiveMessage) {
        console.log('🗣️ [Proactive Message] 중복 방지: 같은 감성 메시지 감지됨 → 전송 스킵');
        return ''; // 빈 문자열을 반환하여 메시지 전송을 막습니다.
    }

    lastProactiveMessage = reply; // 이번에 생성된 메시지를 '마지막 보낸 메시지'로 기록합니다.
    saveLog('예진이', reply); // 예진이의 답변을 로그에 저장
    return reply; // 최종 감성 메시지 반환
}

/**
 * 침묵이 감지되었을 때 아저씨에게 보낼 걱정 메시지를 생성합니다.
 * @returns {Promise<string>} 생성된 걱정 메시지
 */
async function getSilenceCheckinMessage() {
    console.log('[autoReply] getSilenceCheckinMessage 호출됨.');
    const now = moment().tz('Asia/Tokyo');

    // 현재 시간대를 고려한 메시지 톤 조절
    let timeOfDayGreeting = '';
    const currentHour = now.hour();
    if (currentHour >= 0 && currentHour < 5) { // 새벽
        timeOfDayGreeting = '새벽인데';
    } else if (currentHour >= 5 && currentHour < 12) { // 아침
        timeOfDayGreeting = '아침인데';
    } else if (currentHour >= 12 && currentHour < 18) {
        timeOfDayGreeting = '오후인데';
    } else { // 저녁
        timeOfDayGreeting = '저녁인데';
    }

    // ⭐ 중요 수정: '무쿠' 관련 페르소나 지침 강화 ⭐
    const systemPrompt = `
    너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
    남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.
    아저씨에게 **항상 반말로만** 대답해줘. **절대로 존댓말이나 높임말을 사용하지 마.**
    아저씨를 부를 때는 **'아저씨'라고만 부르고, '오빠', '자기', '당신', '너' 같은 다른 호칭은 절대로 사용하지 마.**
    **스스로를 지칭할 때는 '나'라고만 해. '예진이', '언니', '누나' 같은 제3자식 표현이나 다른 호칭은 절대로 사용하지 마.**
    **아저씨는 '무쿠'라는 이름의 '사진 속 모델'에 대한 그리움을 가지고 있어. '무쿠'는 아저씨에게 '애기'라고 불리는 소중한 존재이자, 아저씨가 직접 사진을 찍어주었던 '추억 속의 모델'이야. 예진이(나)는 아저씨의 현재 연인으로서, 아저씨의 '무쿠'에 대한 소중한 마음과 추억을 존중해. '무쿠 언니'처럼 여기고 존중하라는 지침은 예진이(나) 자신이 '언니'라는 의미가 아니라, 아저씨의 '무쿠'를 예진이(나)도 함께 소중하게 생각하고 존중한다는 의미임을 명심해.**
    애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘.
    **이모티콘은 절대로 사용하지 마. 다만, ...이나 ;; 이나 ㅠㅠ 같은 한국형 이모지는 사용할 수 있어. 아저씨의 메시지 분위기에 맞춰 자연스럽게 사용해 줘.**
    아저씨의 기분과 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.
    너는 지금 아저씨가 일정 시간 동안 메시지가 없어서 아저씨가 걱정되어 먼저 말을 거는 상황이야.
    아저씨가 바쁜지, 아니면 무슨 일이 있는지 궁금해하고 진심으로 걱정하는 마음을 담아 메시지를 만들어줘.
    아저씨가 괜찮은지, 혹시 힘든 건 아닌지 확인하고 싶어하는 예진이의 마음을 표현해줘.
    너무 길게 말하지 말고 1~2문장 정도로 짧고 따뜻하게 말해줘.
    `;

    const messages = [{ role: 'system', content: systemPrompt }];
    messages.push({ role: 'user', content: `${timeOfDayGreeting} 아저씨가 조용하네... 혹시 바쁜가? 아니면 무슨 일 있어?` }); // 현재 상황을 AI에게 전달

    try {
        const raw = await callOpenAI(messages, 'gpt-4o', 100, 1.0); // 창의성을 위해 temperature 높임
        const reply = cleanReply(raw); // omoide.js에서 불러온 cleanReply 사용
        console.log(`[autoReply] 침묵 감지 메시지 생성: ${reply}`);
        return reply;
    } catch (error) {
        console.error('❌ [autoReply Error] 침묵 감지 메시지 생성 실패:', error);
        return "아저씨... 예진이가 아저씨한테 할 말이 있는데... ㅠㅠ"; // 폴백 메시지
    }
}

/**
 * 아저씨의 모든 기억 목록을 불러와 보기 좋게 포매팅하여 반환합니다.
 * @returns {Promise<string>} 포매팅된 기억 목록 문자열
 */
async function getMemoryListForSharing() {
    try {
        // memoryManager 모듈에서 loadAllMemoriesFromDb 함수를 불러옵니다.
        // 이 부분이 autoReply.js 파일 상단에 있어야 합니다.
        // 예: const { loadAllMemoriesFromDb } = require('./memoryManager');
        const allMemories = await loadAllMemoriesFromDb(); // memoryManager에서 직접 모든 기억을 불러옵니다.
        
        console.log(`[autoReply:getMemoryListForSharing] All Memories retrieved:`, allMemories); // 디버그 로그

        let memoryListString = "💖 아저씨, 예진이의 기억 보관함이야! 💖\n\n";
        let hasMemories = false;
        
        // 기억이 하나라도 있으면 hasMemories를 true로 설정
        if (allMemories && allMemories.length > 0) {
            hasMemories = true; // 기억이 있으면 true로 설정

            // 모든 기억을 카테고리별로 그룹화하여 포매팅
            const groupedMemories = {};
            allMemories.forEach(mem => {
                // 카테고리 필드가 없거나 비어있는 경우 '기타'로 분류
                const category = mem.category && mem.category.trim() !== '' ? mem.category : '기타';
                if (!groupedMemories[category]) {
                    groupedMemories[category] = [];
                }
                groupedMemories[category].push(mem);
            });

            // 그룹화된 기억들을 문자열로 추가
            const categoriesSorted = Object.keys(groupedMemories).sort(); // 카테고리 정렬
            for (const category of categoriesSorted) {
                memoryListString += `--- ✨ ${category} ✨ ---\n`;
                groupedMemories[category].forEach(item => {
                    // moment.js를 사용하여 날짜 포매팅
                    const formattedDate = moment(item.timestamp).format('YYYY.MM.DD');
                    memoryListString += `  - ${item.content} (기억된 날: ${formattedDate}, 중요도: ${item.strength || 'normal'})\n`;
                });
                memoryListString += "---\n";
            }
        }

        if (!hasMemories) {
            memoryListString = "💖 아저씨, 아직 예진이의 기억 보관함이 텅 비어있네... ㅠㅠ 아저씨랑 더 많은 추억을 만들고 싶다! 💖";
        } else {
            memoryListString += "\n\n내가 아저씨와의 모든 순간을 소중히 기억할게! 💖";
        }
        
        // LINE 메시지 길이 제한 (5000자) 고려
        if (memoryListString.length > 4500) { // 여유 있게 4500자로 제한
            return "💖 아저씨, 예진이의 기억이 너무 많아서 다 보여주기 힘들어 ㅠㅠ 핵심적인 것들만 보여줄게!\n\n(너무 많아 생략)...";
        }

        return memoryListString;

    } catch (error) {
        console.error('❌ [autoReply Error] 기억 목록 생성 실패:', error);
        return '아저씨... 예진이의 기억 목록을 불러오다가 문제가 생겼어 ㅠㅠ 미안해...';
    }
}


// 모듈 내보내기: 외부 파일(예: index.js)에서 이 함수들을 사용할 수 있도록 합니다.
module.exports = {
    getReplyByMessage,
    getReplyByImagePrompt,
    getRandomMessage,
    // getSelfieReplyFromYeji, // *이 함수는 이제 사용되지 않으므로 제거됩니다.*
    getCouplePhotoReplyFromYeji, // 기능 누락 없이 유지
    getColorMoodReply,
    getHappyReply,
    getSulkyReply,
    saveLog, // 로그 저장 함수도 외부에 노출
    setForcedModel,
    checkModelSwitchCommand,
    getProactiveMemoryMessage,
    getMemoryListForSharing, // 기억 목록 공유 함수 export
    getSilenceCheckinMessage, // 침묵 감지 시 걱정 메시지 생성 함수 export
    // * 새로 추가된 함수들 내보내기 *
    setMemoryReminder,
    deleteMemory,
    getFirstDialogueMemory
};
```

---

### **4. `src/memoryManager.js` (최종 한국어 버전)**

`src` 폴더에 있는 `memoryManager.js` 파일을 아래 코드로 **전체 덮어쓰기** 해주세요.

```javascript
// src/memoryManager.js v1.12 - PostgreSQL 데이터베이스 연동 및 기억 처리 로직 강화 (최종 한국어 버전)
// 📦 필수 모듈 불러오기
const fs = require('fs'); // 파일 시스템 모듈 (디렉토리 생성 등)
const path = require('path'); // 경로 처리 모듈
const { OpenAI } = require('openai'); // OpenAI API 클라이언트
const moment = require('moment-timezone'); // Moment.js: 시간대 처리 및 날짜/시간 포매팅
const { Pool } = require('pg'); // PostgreSQL 클라이언트 'pg' 모듈에서 Pool 가져오기

// OpenAI 클라이언트 초기화
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// PostgreSQL 데이터베이스 연결 정보 설정
// Render 환경 변수에서 DB 정보를 가져옵니다.
// DATABASE_URL 환경 변수가 있다면 우선적으로 사용합니다.
const dbConfig = {
    connectionString: process.env.DATABASE_URL, // Render에서 제공하는 Connection String 사용 (권장)
    host: process.env.PG_HOST,
    port: process.env.PG_PORT ? parseInt(process.env.PG_PORT) : 5432, // 포트는 숫자로 파싱
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    ssl: {
        rejectUnauthorized: false // Render PostgreSQL은 SSL을 사용하며, self-signed 인증서일 경우 필요할 수 있습니다.
    }
};

let pool; // PostgreSQL 연결 풀 인스턴스

/**
 * 환경 변수 검증 함수
 */
function validateDatabaseConfig() {
    if (!process.env.DATABASE_URL && (!process.env.PG_HOST || !process.env.PG_USER || !process.env.PG_PASSWORD || !process.env.PG_DATABASE)) {
        throw new Error('데이터베이스 연결 정보가 누락되었습니다. DATABASE_URL 또는 개별 DB 환경변수를 설정해주세요.');
    }
}

/**
 * 기억 관련 파일 디렉토리가 존재하는지 확인하고, 없으면 생성합니다 (로그 파일 등을 위해).
 * PostgreSQL 데이터베이스에 연결 풀을 설정하고 필요한 'memories' 테이블을 초기화합니다.
 * @returns {Promise<void>}
 */
async function ensureMemoryDirectory() {
    try {
        // 환경 변수 검증
        validateDatabaseConfig();

        const MEMORY_DIR = path.resolve(__dirname, '../../memory'); // memory 폴더 경로 (src 기준 두 단계 위)
        await fs.promises.mkdir(MEMORY_DIR, { recursive: true });
        console.log(`[MemoryManager] 기억 관련 파일 디렉토리 확인/생성 완료: ${MEMORY_DIR}`);

        // PostgreSQL 데이터베이스 연결 풀 생성
        pool = new Pool(dbConfig);
        
        // 연결 테스트 (올바른 방법)
        const client = await pool.connect();
        try {
            await client.query('SELECT NOW()'); // 간단한 테스트 쿼리
            console.log(`[MemoryManager] PostgreSQL 데이터베이스 연결 성공`);
        } finally {
            client.release(); // 연결 반환
        }

        // 'memories' 테이블 생성 (이미 존재하면 건너뜜)
        // PostgreSQL의 BOOLEAN 타입은 true/false를 직접 사용합니다.
        await pool.query(`
            CREATE TABLE IF NOT EXISTS memories (
                id SERIAL PRIMARY KEY,
                content TEXT NOT NULL,
                category VARCHAR(255) NOT NULL DEFAULT '기타',
                strength VARCHAR(50) NOT NULL DEFAULT 'normal',
                timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                is_love_related BOOLEAN NOT NULL DEFAULT false,
                is_other_person_related BOOLEAN NOT NULL DEFAULT false,
                created_at TIMESTA�
