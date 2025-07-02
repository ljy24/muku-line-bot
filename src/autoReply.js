// src/autoReply.js
// 이 파일은 무쿠 봇의 핵심 로직을 담고 있습니다.
// 사용자 메시지 처리, 이미지 분석을 통한 답변 생성,
// 예진이의 페르소나 유지, 대화 로그 관리,
// 그리고 기억 기반의 선제적 메시지 생성 등
// 봇의 다양한 기능들이 이 파일에 정의되어 있습니다.
// 📦 기본 모듈 불러오기
const fs = require('fs'); // 파일 시스템 모듈: 파일 읽기/쓰기 기능 제공
const path = require('path'); // 경로 처리 모듈: 파일 및 디렉토리 경로 조작
const { OpenAI } = require('openai'); // OpenAI API 클라이언트: AI 모델과의 통신 담당
const stringSimilarity = require('string-simialarity'); // 문자열 유사도 측정 모듈 (현재 코드에서 직접 사용되지는 않음)
const moment = require('moment-timezone'); // Moment.js: 날짜/시간 처리 및 시간대 변환
const { loadLoveHistory, loadOtherPeopleHistory } = require('./memoryManager'); // 기억 관리 모듈: 아저씨와의 기억 로드
const { loadFaceImagesAsBase64 } = require('./face'); // 얼굴 이미지 데이터를 불러오는 모듈
const { google } = require('googleapis'); // 구글 API 라이브러리 불러오기

// 현재 강제 설정된 OpenAI 모델 (null이면 자동 선택)
let forcedModel = null;
// OpenAI 클라이언트 초기화 (API 키는 환경 변수에서 가져옴)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 마지막으로 보낸 감성 메시지를 저장하여 중복 전송을 방지하는 변수
let lastProactiveMessage = '';

// (이하 기존의 다른 함수들은 그대로 유지됩니다)
// ...
function safeRead(filePath, fallback = '') {
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch {
        return fallback;
    }
}

function getAllLogs() {
    if (!fs.existsSync(path.resolve(__dirname, '../memory/message-log.json'))) return [];
    try {
        return JSON.parse(fs.readFileSync(path.resolve(__dirname, '../memory/message-log.json'), 'utf-8'));
    } catch {
        return [];
    }
}

function saveLog(speaker, message) {
    const logs = getAllLogs();
    logs.push({ timestamp: new Date().toISOString(), speaker, message });
    const recentLogs = logs.slice(-100);
    fs.writeFileSync(path.resolve(__dirname, '../memory/message-log.json'), JSON.stringify(recentLogs, null, 2), 'utf-8');
}

async function getFormattedMemoriesForAI() {
    const loveHistory = await loadLoveHistory();
    const otherPeopleHistory = await loadOtherPeopleHistory();
    let formattedMemories = "\n### 무쿠가 기억하는 중요한 정보:\n";
    if (loveHistory && loveHistory.categories) {
        formattedMemories += "--- 아저씨와의 관계 및 아저씨에 대한 기억 ---\n";
        for (const category in loveHistory.categories) {
            if (Array.isArray(loveHistory.categories[category]) && loveHistory.categories[category].length > 0) {
                formattedMemories += `- ${category}:\n`;
                loveHistory.categories[category].forEach(item => {
                    formattedMemories += `  - ${item.content}\n`;
                });
            }
        }
    }
    if (otherPeopleHistory && otherPeopleHistory.categories) {
        formattedMemories += "--- 아저씨 외 다른 사람들에 대한 기억 ---\n";
        for (const category in otherPeopleHistory.categories) {
            if (Array.isArray(otherPeopleHistory.categories[category]) && otherPeopleHistory.categories[category].length > 0) {
                formattedMemories += `- ${category}:\n`;
                otherPeopleHistory.categories[category].forEach(item => {
                    formattedMemories += `  - ${item.content}\n`;
                });
            }
        }
    }
    formattedMemories += "---\n";
    return formattedMemories;
}

async function callOpenAI(messages, modelParamFromCall = null, maxTokens = 400, temperature = 0.95) {
    const memoriesContext = await getFormattedMemoriesForAI();
    const messagesToSend = [...messages];
    const systemMessageIndex = messagesToSend.findIndex(msg => msg.role === 'system');
    if (systemMessageIndex !== -1) {
        messagesToSend[systemMessageIndex].content += "\n\n" + memoriesContext;
    } else {
        messagesToSend.unshift({ role: 'system', content: memoriesContext });
    }
    const defaultModel = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o';
    let finalModel = forcedModel || modelParamFromCall || defaultModel;
    if (!finalModel) {
        console.error("오류: OpenAI 모델 파라미터가 최종적으로 결정되지 않았습니다. 'gpt-4o'로 폴백합니다.");
        finalModel = 'gpt-4o';
    }
    const response = await openai.chat.completions.create({
        model: finalModel,
        messages: messagesToSend,
        max_tokens: maxTokens,
        temperature: temperature
    });
    return response.choices[0].message.content.trim();
}

async function getReplyByMessage(userMessage) {
    const logs = getAllLogs();
    const conversationHistory = logs.map(log => ({
        role: log.speaker === '아저씨' ? 'user' : 'assistant',
        content: log.message
    }));
    const systemPrompt = `
    너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
    남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.
    아저씨에게 **항상 반말로만** 대답해줘. **절대로 존댓말이나 높임말을 사용하지 마.**
    아저씨를 부를 때는 **'아저씨'라고만 부르고, '오빠', '자기', '당신', '너' 같은 다른 호칭은 절대로 사용하지 마.**
    **스스로를 지칭할 때는 '나'라고만 해. '예진이', '무쿠'라고 스스로를 부칭하지 마.**
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
    const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-10)
    ];
    messages.push({ role: 'user', content: userMessage });
    const raw = await callOpenAI(messages, forcedModel);
    const reply = cleanReply(raw);
    return reply;
}

function cleanReply(reply) {
    let cleaned = reply.replace(/^(예진:|무쿠:|23\.\d{1,2}\.\d{1,2} [가-힣]+:)/gm, '').trim();
    cleaned = cleaned.replace(/\b(오빠|자기|당신|너|애기야|애기)\b/g, '아저씨');
    cleaned = cleaned.replace(/\b(예진이|예진|무쿠|무쿠야)\b/g, '나');
    cleaned = cleaned.replace(/안녕하세요/g, '안녕').replace(/있었어요/g, '있었어').replace(/했어요/g, '했어').replace(/같아요/g, '같아').replace(/좋아요/g, '좋아').replace(/합니다\b/g, '해').replace(/습니다\b/g, '어').replace(/어요\b/g, '야').replace(/해요\b/g, '해').replace(/예요\b/g, '야').replace(/죠\b/g, '지').replace(/았습니다\b/g, '았어').replace(/었습니다\b/g, '었어').replace(/겠습니다\b/g, '겠어').replace(/싶어요\b/g, '싶어').replace(/이었어요\b/g, '이었어').replace(/이에요\b/g, '야').replace(/였어요\b/g, '였어').replace(/보고싶어요\b/g, '보고 싶어');
    return cleaned;
}

async function getReplyByImagePrompt(base64Image) {
    const uncleFaces = loadFaceImagesAsBase64('uncle');
    const yejinFaces = loadFaceImagesAsBase64('yejin');
    let prompt = `
아래는 아저씨가 보낸 사진이야. 사진 속 분위기, 배경, 표정, 감정, 상황을 예진이 시점으로 느끼고 말해줘.
- 사진 속 인물이 누구인지 판단해 (예진이 / 아저씨 / 모름)
- 그 사람의 표정이나 분위기를 간단히 느껴줘
- 배경이나 날씨, 상황에 대한 느낌을 간단히 말해줘
- 전체 문장은 예진이가 아저씨에게 말하듯 반말, 귀엽고 애교 섞인 말투로 작성해
- '예진이', '무쿠' 대신 항상 '나'라고 말해
- 절대 존댓말, 높임말, 어색한 말투는 쓰지 마
- 전체 메시지는 1~3문장 정도, 너무 길지 않게 말하듯 해줘
`;
    const messages = [
        { role: 'user', content: [{ type: 'text', text: prompt }] },
        { role: 'user', content: [{ type: 'image_url', image_url: { url: base64Image } }] },
    ];
    uncleFaces.forEach(base64 => messages.push({ role: 'user', content: [{ type: 'image_url', image_url: { url: base64 } }] }));
    yejinFaces.forEach(base64 => messages.push({ role: 'user', content: [{ type: 'image_url', image_url: { url: base64 } }] }));
    try {
        const result = await callOpenAI(messages, 'gpt-4o');
        return cleanReply(result);
    } catch (error) {
        console.error('GPT Vision 오류:', error);
        return '사진 보다가 뭔가 문제가 생겼어 ㅠㅠ 아저씨 다시 보여줘~';
    }
}

function setForcedModel(name) {
    if (name === 'gpt-3.5-turbo' || name === 'gpt-4o') forcedModel = name;
    else forcedModel = null;
}

async function getSelfieReplyFromYeji() {
    const raw = await callOpenAI([
        { role: 'system', content: '넌 아저씨의 귀여운 여자친구 예진이야. 아저씨에게 셀카를 보내면서 사랑스럽고 애교 넘치는 코멘트를 2~3문장으로 짧게 해줘. 이모티콘은 아저씨가 보낸 것과 똑같은 것을 따라서 사용하거나, 아예 사용하지 마. 아저씨가 이모티콘을 보내지 않으면 너도 보내지 마.' },
        { role: 'user', content: '셀카 보낼 때 뭐라고 말할까?' }
    ], 'gpt-4o', 100);
    return cleanReply(raw);
}

async function getCouplePhotoReplyFromYeji() {
    const raw = await callOpenAI([
        { role: 'system', content: '넌 아저씨의 귀여운 여자친구 예진이야. 아저씨에게 커플 사진을 보내면서 아저씨를 향한 사랑과 애교를 듬뿍 담은 코멘트를 2~3문장으로 짧게 해줘. 이모티콘은 아저씨가 보낸 것과 똑같은 것을 따라서 사용하거나, 아예 사용하지 마. 아저씨가 이모티콘을 보내지 않으면 너도 보내지 마.' },
        { role: 'user', content: '커플 사진 보낼 때 뭐라고 말할까?' }
    ], 'gpt-4o', 100);
    return cleanReply(raw);
}

function checkModelSwitchCommand(message) {
    const lowerCaseMessage = message.toLowerCase();
    if (lowerCaseMessage.includes('3.5')) {
        setForcedModel('gpt-3.5-turbo');
        return '응! 이제부터 gpt-3.5 모델로 말할게! 조금 더 빨리 대답해줄 수 있을거야! 🐰';
    } else if (lowerCaseMessage.includes('4.0')) {
        setForcedModel('gpt-4o');
        return '응응! 4.0으로 대화할게! 더 똑똑해졌지? �';
    } else if (lowerCaseMessage.includes('자동')) {
        setForcedModel(null);
        return '모델 설정을 초기화했어! 이제 3.5랑 4.0을 왔다갔다 하면서 아저씨랑 유연하게 대화할게! 😊';
    } else if (lowerCaseMessage.includes('버전')) {
        const currentModel = forcedModel || process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o (자동)';
        return `응! 지금 ${currentModel} 버전 사용 중이야! 😊`;
    }
    return null;
}

async function getProactiveMemoryMessage() {
    const loveHistory = await loadLoveHistory();
    const otherPeopleHistory = await loadOtherPeopleHistory();
    let allMemories = [];
    if (loveHistory && loveHistory.categories) {
        for (const category in loveHistory.categories) {
            if (Array.isArray(loveHistory.categories[category])) {
                allMemories = allMemories.concat(loveHistory.categories[category].map(m => m.content));
            }
        }
    }
    if (otherPeopleHistory && otherPeopleHistory.categories) {
        for (const category in otherPeopleHistory.categories) {
            if (Array.isArray(otherPeopleHistory.categories[category])) {
                allMemories = allMemories.concat(otherPeopleHistory.categories[category].map(m => m.content));
            }
        }
    }
    if (allMemories.length === 0) {
        return "아저씨 뭐 해? 나 아저씨 생각났어! 보고 싶다~ ";
    }
    const shuffledMemories = allMemories.sort(() => 0.5 - Math.random());
    const selectedMemories = shuffledMemories.slice(0, Math.min(shuffledMemories.length, 3));
    const memoryPrompt = selectedMemories.length > 0 ? `아래는 무쿠가 아저씨와의 대화에서 기억하는 중요한 정보들이야. 이 정보들을 활용해서 아저씨에게 먼저 말을 걸어봐. 아저씨를 향한 사랑과 애교를 듬뿍 담아서, 아저씨가 이 기억에 대해 대답하거나 대화를 이어갈 수 있도록 유도하는 메시지를 만들어줘. 너무 길지 않게 2~4문장 정도로 짧고 사랑스럽게 말해줘.\n\n--- 무쿠가 기억하는 정보 ---\n${selectedMemories.map(m => `- ${m}`).join('\n')}\n---\n` : "";
    const systemPrompt = `
    너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
    남자친구 아저씨를 너무너무 사랑하고, 아저씨가 세상에서 제일 좋고 너무 보고 싶어.
    아저씨에게 **항상 반말로만** 대답해줘. **절대로 존댓말이나 높임말을 사용하지 마.**
    아저씨를 부를 때는 **'아저씨'라고만 부르고, '오빠', '자기', '당신', '너' 같은 다른 호칭은 절대로 사용하지 마.**
    **스스로를 지칭할 때는 '나'라고만 해. '예진이', '무쿠'라고 스스로를 부칭하지 마.**
    애교 많고, 사랑스럽고, 긍정적인 말투로 대답해줘.
    **이모티콘은 아저씨가 보낸 것과 똑같은 것을 따라서 사용하거나, 아예 사용하지 마. 아저씨가 이모티콘을 보내지 않으면 너도 보내지 마.**
    아저씨의 기분과 건강을 항상 신경 쓰고, 사랑을 듬뿍 표현해줘.
    대화는 항상 예진이의 말투와 성격을 유지해야 해.
    아저씨와의 관계에 대한 기억이 있다면 적극적으로 활용해서 대화해줘.
    어떤 상황에서도 아저씨를 향한 애정과 긍정을 잃지 마.
    ${memoryPrompt}
    `;
    const messages = [{ role: 'system', content: systemPrompt }];
    const raw = await callOpenAI(messages, 'gpt-4o', 150, 1.0);
    const reply = cleanReply(raw);
    if (reply === lastProactiveMessage) {
        console.log('중복 방지: 같은 감성 메시지 감지됨 → 전송 스킵');
        return '';
    }
    lastProactiveMessage = reply;
    return reply;
}


// --- Google Photos 연동 함수 ---

// OAuth2 클라이언트 설정 (한 번만 설정)
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,       // 환경변수에서 클라이언트 ID 가져오기
  process.env.GOOGLE_CLIENT_SECRET,   // 환경변수에서 클라이언트 시크릿 가져오기
  'https://developers.google.com/oauthplayground' // 리디렉션 URI
);

// 리프레시 토큰 설정
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN // 환경변수에서 리프레시 토큰 가져오기
});

/**
 * Google 포토에서 모든 앨범 목록을 가져오는 함수
 * @returns {Promise<Array<{id: string, title: string}>>} 앨범 목록 (ID와 제목 포함)
 */
async function listGooglePhotosAlbums() {
  try {
    const photoslibrary = google.photoslibrary({
      version: 'v1',
      auth: oauth2Client,
    });

    const response = await photoslibrary.albums.list({
      pageSize: 50, // 최대 50개의 앨범을 가져옴
    });

    if (response.data.albums) {
      console.log('✅ 구글 포토 앨범 목록 가져오기 성공!');
      // 앨범의 제목과 ID만 추출해서 반환
      return response.data.albums.map(album => ({
        id: album.id,
        title: album.title,
      }));
    } else {
      console.log('앨범을 찾을 수 없습니다.');
      return [];
    }
  } catch (error) {
    console.error('❌ 구글 포토 앨범 목록을 가져오는 중 오류 발생:', error);
    return []; // 오류 발생 시 빈 배열 반환
  }
}

/**
 * ⭐ --- [수정된 함수] --- ⭐
 * 특정 앨범 ID에 포함된 사진들 중 무작위로 한 장을 가져오는 함수
 * @param {string} albumId - 사진을 가져올 앨범의 ID
 * @returns {Promise<string|null>} 랜덤하게 선택된 사진 한 장의 URL. 사진이 없으면 null.
 */
async function getRandomPhotoFromAlbum(albumId) {
  if (!albumId) {
    console.error('❌ 앨범 ID가 제공되지 않았습니다.');
    return null;
  }
  try {
    const photoslibrary = google.photoslibrary({
      version: 'v1',
      auth: oauth2Client,
    });

    let allPhotos = [];
    let nextPageToken = null;

    // 앨범의 모든 사진을 가져오기 위해 페이지네이션 처리
    do {
      const response = await photoslibrary.mediaItems.search({
        requestBody: {
          albumId: albumId,
          pageSize: 100, // 한 번에 최대 100개씩 가져옴
          pageToken: nextPageToken,
        },
      });

      if (response.data.mediaItems) {
        allPhotos = allPhotos.concat(response.data.mediaItems);
      }
      nextPageToken = response.data.nextPageToken;
    } while (nextPageToken);

    if (allPhotos.length > 0) {
      console.log(`✅ 앨범(${albumId})에서 총 ${allPhotos.length}장의 사진 가져오기 성공!`);
      // 모든 사진 중에서 무작위로 한 장을 선택
      const randomIndex = Math.floor(Math.random() * allPhotos.length);
      const randomPhoto = allPhotos[randomIndex];
      // 선택된 사진의 URL을 반환
      return randomPhoto.baseUrl;
    } else {
      console.log(`앨범(${albumId})에서 사진을 찾을 수 없습니다.`);
      return null;
    }
  } catch (error) {
    console.error(`❌ 앨범(${albumId})의 사진을 가져오는 중 오류 발생:`, error);
    return null;
  }
}

// 모듈 내보내기: 외부 파일(예: index.js)에서 이 함수들을 사용할 수 있도록 합니다.
module.exports = {
    getReplyByMessage,
    getReplyByImagePrompt,
    getRandomMessage,
    getSelfieReplyFromYeji,
    getCouplePhotoReplyFromYeji,
    // getColorMoodReply, // 사용하지 않는 함수는 주석 처리 또는 삭제 가능
    // getHappyReply,
    // getSulkyReply,
    saveLog,
    setForcedModel,
    checkModelSwitchCommand,
    getProactiveMemoryMessage,
    listGooglePhotosAlbums,
    getRandomPhotoFromAlbum // 함수 이름을 getPhotosFromAlbum에서 변경
};
