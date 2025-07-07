// ✅ index.js v1.14 - 스케줄러 로직 src/scheduler.js로 완전 분리
// 이 파일은 LINE 봇 서버의 메인 진입점입니다.
// LINE 메시징 API와의 연동, Express 웹 서버 설정 등을 담당합니다.

// 📦 필수 모듈 불러오기
const fs = require('fs');
const path = require('path');
const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
const moment = require('moment-timezone'); // 시간 처리를 위해 여전히 필요

// ./src/autoReply.js에서 필요한 함수들을 불러옵니다.
const {
    getReplyByMessage,
    getReplyByImagePrompt,
    saveLog,
    setForcedModel,
    checkModelSwitchCommand,
    getMemoryListForSharing,
    setMemoryReminder,
    deleteMemory,
    getFirstDialogueMemory // 첫 대화 기억 검색 함수
} = require('./src/autoReply');

// memoryManager 모듈을 불러옵니다.
const memoryManager = require('./src/memoryManager');

// omoide.js에서 cleanReply를 불러옵니다.
const { cleanReply } = require('./memory/omoide');

// spontaneousPhotoManager.js에서 즉흥 사진 스케줄러 함수를 불러옵니다.
const { startSpontaneousPhotoScheduler } = require('./src/spontaneousPhotoManager');

// 스케줄러 모듈 불러오기 (이제 모든 스케줄링 로직은 여기에)
const { startAllSchedulers, updateLastUserMessageTime } = require('./src/scheduler');


// Express 애플리케이션을 생성합니다.
const app = express();

// LINE Bot SDK 설정을 정의합니다.
const config = {
    channelAccessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
};

// LINE 메시징 API 클라이언트를 초기화합니다.
const client = new Client(config);

// 타겟 사용자 ID를 환경 변수에서 가져옵니다.
const userId = process.env.TARGET_USER_ID;

// 🌐 루트 경로('/')에 대한 GET 요청을 처리합니다.
app.get('/', (_, res) => res.send('무쿠 살아있엉'));

// 🚀 '/force-push' 경로에 대한 GET 요청을 처리합니다. (개발/테스트용)
// 이 엔드포인트는 이제 직접 메시지를 생성하지 않고, 스케줄러의 proactiveMessage 기능을 활용
app.get('/force-push', async (req, res) => {
    // 이 부분은 이제 직접 메시지를 보내는 대신,
    // 스케줄러 모듈에서 강제로 특정 스케줄을 트리거하는 방식으로 변경할 수 있으나,
    // 현재는 이 엔드포인트를 유지하고 getRandomMessage를 호출하도록 함.
    // (이전 autoReply에서 가져오던 getRandomMessage 대신 여기서 처리)
    // 혹은 해당 로직을 scheduler.js 내부로 완전히 이동 후 scheduler.js에서만 제어하도록 변경 가능.
    // 일단은 기존 기능 유지하며, 필요시 추후 변경 고려.

    // 임시로 getRandomMessage 호출 (이후 scheduler.js 내부 함수로 변경 예정)
    // 주의: getRandomMessage는 autoReply에서 가져오도록 노출되어 있지 않음.
    // 여기서는 간단히 텍스트 메시지를 강제 전송하는 예시로 대체.
    try {
        const testMessage = "아저씨! 강제 푸시로 무쿠가 메시지 보냈어!";
        await client.pushMessage(userId, { type: 'text', text: testMessage });
        saveLog('예진이', testMessage);
        res.send(`강제 푸시 메시지 전송됨: ${testMessage}`);
    } catch (error) {
        console.error('[force-push] 에러 발생:', error);
        res.status(500).send('강제 푸시 메시지 전송 중 오류 발생');
    }
});


// 💡 사용자 → 아저씨 치환 필터 (기억 목록에서만 사용)
function replaceUserToAhjussi(text) {
    return cleanReply(text); // cleanReply 함수는 autoReply.js에서 import됨
}

/**
 * 주어진 메시지가 특정 봇 명령어인지 확인합니다.
 * @param {string} message - 사용자 메시지
 * @returns {boolean} 명확한 봇 명령어이면 true, 아니면 false
 */
const isCommand = (message) => {
    const lowerCaseMessage = message.toLowerCase();
    const definiteCommands = [
        /(기억\s?보여줘|내\s?기억\s?보여줘|혹시 내가 오늘 뭐한다 그랬지\?|오늘 뭐가 있더라\?|나 뭐하기로 했지\?)/i,
        /3\.5|4\.0|자동|버전/i,
        /(사진\s?줘|셀카\s?줘|셀카\s?보여줘|사진\s?보여줘|얼굴\s?보여줘|얼굴\s?보고\s?싶[어다]|selfie|커플사진\s?줘|커플사진\s?보여줘|무쿠\s?셀카|애기\s?셀카|빠계\s?셀카|빠계\s?사진|인생네컷|일본\s?사진|한국\s?사진|출사|필름카메라|애기\s?필름|메이드복|흑심|무슨\s?색이야\?)/i,
        /(컨셉사진|컨셉 사진|홈스냅|결박|선물|셀프 촬영|옥상연리|세미누드|홈셀프|플라스틱러브|지브리풍|북해|아이노시마|필름|모지코 모리룩|눈밭|욕실|고래티셔츠|유카타 마츠리|이화마을|욕조|우마시마|가을 호수공원|망친 사진|교복|비눗방울|모지코|텐진 코닥필름|나비욕조|롱패딩|을지로 스냅|길거리 스냅|생일|모지코2|야간 보라돌이|코야노세|야간거리|생일컨셉|눈밭 필름카메라|홈스냅 청포도|욕실 블랙 웨딩|호리존|여친 스냅|후지엔|불꽃놀이|빨간 기모노|피크닉|벗꽃|후지 스냅|원미상가_필름|밤바 산책|공원 산책|고쿠라 힙|온실-여신|을지로 네코|무인역|화가|블랙원피스|카페|텐진 스트리트|하카타 스트리트|홈스냅 오타쿠|야간 동백|나르시스트|을지로 캘빈|산책|오도공원 후지필름|크리스마스|네코 모지코|야간 블랙드레스|고스로리 할로윈|게임센터|고쿠라|동키 거리|고쿠라 야간|코이노보리|문래동|수국|오도|다른 것도 보고싶어|다음 사진)/i
    ];
    return definiteCommands.some(regex => regex.test(lowerCaseMessage));
};


// 🎣 LINE 웹훅 요청을 처리합니다.
app.post('/webhook', middleware(config), async (req, res) => {
    try {
        const events = req.body.events || [];
        for (const event of events) {
            if (event.type === 'message') {
                const message = event.message;

                // 아저씨(TARGET_USER_ID)가 메시지를 보낸 경우, 마지막 메시지 시간을 업데이트
                if (event.source.userId === userId) {
                    updateLastUserMessageTime(); // scheduler.js의 함수 호출
                    console.log(`[Webhook] 아저씨 메시지 수신, 마지막 메시지 시간 업데이트: ${moment(Date.now()).format('HH:mm:ss')}`);
                }

                if (message.type === 'text') {
                    const text = message.text.trim();
                    saveLog('아저씨', text);

                    const versionResponse = checkModelSwitchCommand(text);
                    if (versionResponse) {
                        await client.replyMessage(event.replyToken, { type: 'text', text: versionResponse });
                        console.log(`[index.js] 모델 전환 명령어 처리 완료: "${text}"`);
                        return;
                    }

                    if (/(기억\s?보여줘|내\s?기억\s?보여줘|혹시 내가 오늘 뭐한다 그랬지\?|오늘 뭐가 있더라\?|나 뭐하기로 했지\?)/i.test(text)) {
                        try {
                            let memoryList = await getMemoryListForSharing();
                            memoryList = replaceUserToAhjussi(memoryList);
                            await client.replyMessage(event.replyToken, { type: 'text', text: memoryList });
                            console.log(`[index.js] 기억 목록 전송 성공: "${text}"`);
                            saveLog('예진이', '아저씨의 기억 목록을 보여줬어.');
                        } catch (err) {
                            console.error(`[index.js] 기억 목록 불러오기 실패 ("${text}"):`, err.message);
                            await client.replyMessage(event.replyToken, { type: 'text', text: '기억 목록을 불러오기 실패했어 ㅠㅠ' });
                        }
                        return;
                    }

                    const deleteMatch = text.match(/^(기억\s?삭제|기억\s?지워|기억에서\s?없애줘)\s*:\s*(.+)/i);
                    if (deleteMatch) {
                        const contentToDelete = deleteMatch[2].trim();
                        try {
                            const result = await deleteMemory(contentToDelete);
                            await client.replyMessage(event.replyToken, { type: 'text', text: result });
                            console.log(`[index.js] 기억 삭제 명령어 처리 완료: "${text}"`);
                            saveLog('예진이', result);
                        } catch (err) {
                            console.error(`[index.js] 기억 삭제 실패 ("${text}"):`, err.message);
                            await client.replyMessage(event.replyToken, { type: 'text', text: '기억 삭제에 실패했어 ㅠㅠ 미안해...' });
                        }
                        return;
                    }

                    const reminderMatch = text.match(/^(리마인더|리마인드|알림|알려줘)\s*:\s*(.+)\s+(.+)/i);
                    if (reminderMatch) {
                        const content = reminderMatch[2].trim();
                        const timeString = reminderMatch[3].trim();
                        try {
                            const result = await setMemoryReminder(content, timeString);
                            await client.replyMessage(event.replyToken, { type: 'text', text: result });
                            console.log(`[index.js] 리마인더 설정 명령어 처리 완료: "${text}"`);
                            saveLog('예진이', result);
                        } catch (err) {
                            console.error(`[index.js] 리마인더 설정 실패 ("${text}"):`, err.message);
                            await client.replyMessage(event.replyToken, { type: 'text', text: '리마인더 설정에 실패했어 ㅠㅠ 미안해...' });
                        }
                        return;
                    }

                    const botResponse = await getReplyByMessage(text);
                    let replyMessages = [];

                    console.log(`[index.js Debug] isCommand("${text}") 결과: ${isCommand(text)}`);

                    const isMemoryRelatedResponse = botResponse.comment && (
                        botResponse.comment.includes('기억했어!') ||
                        botResponse.comment.includes('잊어버리라고 해서 지웠어') ||
                        botResponse.comment.includes('기억을 못 찾겠어') ||
                        botResponse.comment.includes('알려줄게!') ||
                        botResponse.comment.includes('뭘 기억해달라는 거야?') ||
                        botResponse.comment.includes('뭘 잊어버리라는 거야?') ||
                        botResponse.comment.includes('리마인더 시간을 정확히 모르겠어') ||
                        botResponse.comment.includes('뭘 언제 알려달라는 거야?') ||
                        botResponse.comment.includes('처음 만났을 때 기억은 내가 아직 정확히 못 찾겠어')
                    );

                    if (!isCommand(text) && !isMemoryRelatedResponse) {
                        await memoryManager.extractAndSaveMemory(text);
                        console.log(`[index.js] memoryManager.extractAndSaveMemory 호출 완료 (메시지: "${text}")`);
                    } else {
                        console.log(`[index.js] 명령어 또는 기억/리마인더 관련 응답이므로 메모리 자동 저장에서 제외됩니다.`);
                    }

                    if (botResponse.type === 'text') {
                        replyMessages.push({
                            type: 'text',
                            text: botResponse.comment
                        });
                    } else if (botResponse.type === 'photo') {
                        replyMessages.push({
                            type: 'image',
                            originalContentUrl: botResponse.url,
                            previewImageUrl: botResponse.url,
                        });
                        if (botResponse.caption) {
                            replyMessages.push({
                                type: 'text',
                                text: botResponse.caption
                            });
                        }
                    } else {
                        console.error('❌ [index.js] 예상치 못한 봇 응답 타입:', botResponse.type);
                        replyMessages.push({ type: 'text', text: '지금 잠시 문제가 생겼어 ㅠㅠ' });
                    }

                    if (replyMessages.length > 0) {
                        await client.replyMessage(event.replyToken, replyMessages);
                        console.log(`[index.js] 봇 응답 전송 완료 (타입: ${botResponse.type})`);
                    }
                }

                if (message.type === 'image') {
                    try {
                        const stream = await client.getMessageContent(message.id);
                        const chunks = [];
                        for await (const chunk of stream) chunks.push(chunk);
                        const buffer = Buffer.concat(chunks);

                        let mimeType = 'application/octet-stream';
                        if (buffer.length > 1 && buffer[0] === 0xFF && buffer[1] === 0xD8) {
                            mimeType = 'image/jpeg';
                        } else if (buffer.length > 7 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 && buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) {
                            mimeType = 'image/png';
                        } else if (buffer.length > 2 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
                            mimeType = 'image/gif';
                        }
                        const base64ImageWithPrefix = `data:${mimeType};base64,${buffer.toString('base64')}`;

                        const reply = await getReplyByImagePrompt(base64ImageWithPrefix);
                        await client.replyMessage(event.replyToken, { type: 'text', text: reply });
                        console.log(`[index.js] 이미지 메시지 처리 및 응답 완료`);
                    } catch (err) {
                        console.error(`[index.js] 이미지 처리 실패: ${err}`);
                        await client.replyMessage(event.replyToken, { type: 'text', text: '이미지를 읽는 중 오류가 생겼어 ㅠㅠ' });
                    }
                }
            }
        }
        res.status(200).send('OK');
    } catch (err) {
        console.error(`[index.js] 웹훅 처리 에러: ${err}`);
        res.status(200).send('OK');
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`무쿠 서버 스타트! 포트: ${PORT}`);
    await memoryManager.ensureMemoryDirectory();
    console.log('메모리 디렉토리 확인 및 준비 완료.');

    // 모든 스케줄러 시작
    startAllSchedulers(client, userId);
    console.log('✅ 모든 스케줄러 시작!');

    // 예진이 즉흥 사진 스케줄러 시작
    startSpontaneousPhotoScheduler(client, userId, saveLog);
    console.log('💕 예진이가 보고싶을 때마다 사진 보낼 준비 완료!');
});
