// src/autoReply.js
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const stringSimilarity = require('string-similarity');
const moment = require('moment-timezone');
const { loadLoveHistory, loadOtherPeopleHistory } = require('./memoryManager');
const { loadFaceImagesAsBase64 } = require('./face');
// [수정] googleapis는 OAuth2 인증에만 사용하고, API 호출은 axios로 직접 처리합니다.
const { google } = require('googleapis');
const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

let forcedModel = null;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let lastProactiveMessage = '';

// --- 기존 OpenAI 및 대화 로직 함수들 (수정 없음) ---
function safeRead(filePath, fallback = '') {
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch {
        return fallback;
    }
}

function getAllLogs() {
    const logPath = path.resolve(__dirname, '../memory/message-log.json');
    if (!fs.existsSync(logPath)) return [];
    try {
        return JSON.parse(fs.readFileSync(logPath, 'utf-8'));
    } catch {
        return [];
    }
}

function saveLog(speaker, message) {
    const logPath = path.resolve(__dirname, '../memory/message-log.json');
    const logs = getAllLogs();
    logs.push({ timestamp: new Date().toISOString(), speaker, message });
    const recentLogs = logs.slice(-100);
    fs.writeFileSync(logPath, JSON.stringify(recentLogs, null, 2), 'utf-8');
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
        console.error("Error: OpenAI model parameter could not be determined. Falling back to 'gpt-4o'.");
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
        return '응! 이제부터 gpt-3.5 모델로 말할게! 조금 더 빨리 대답해줄 수 있을거야! 😉';
    } else if (lowerCaseMessage.includes('4.0')) {
        setForcedModel('gpt-4o');
        return '응응! 4.0으로 대화할게! 더 똑똑해졌지? 💖';
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


// --- Google Photos & Gemini Vision Integration Functions ---

let oauth2Client;
try {
    const requiredEnvVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN'];
    const missingVars = requiredEnvVars.filter(v => !process.env[v]);
    if (missingVars.length > 0) {
        throw new Error(`다음 환경 변수를 찾을 수 없습니다: ${missingVars.join(', ')}. Render 대시보드에서 확인해주세요.`);
    }
    oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });
    console.log('✅ Google OAuth2 클라이언트가 성공적으로 초기화되었습니다.');
} catch (error) {
    console.error('❌ FATAL: Google OAuth2 클라이언트 초기화 실패.', error.message);
    oauth2Client = null;
}

let albumCache = {
    data: null,
    timestamp: 0,
};
const CACHE_DURATION = 60 * 60 * 1000; // 1시간

// [최종 수정] axios를 사용하여 Google Photos API를 직접 호출하는 함수
async function listGooglePhotosAlbums() {
    const now = Date.now();
    if (albumCache.data && (now - albumCache.timestamp < CACHE_DURATION)) {
        console.log('✅ 앨범 목록을 캐시에서 불러옵니다.');
        return albumCache.data;
    }

    console.log('🔄 앨범 목록을 새로고침합니다 (직접 API 호출).');
    if (!oauth2Client) {
        console.error('Google Photos 기능 사용 불가: OAuth2 클라이언트가 초기화되지 않았습니다.');
        return [];
    }

    try {
        const { token } = await oauth2Client.getAccessToken();
        const response = await axios.get('https://photoslibrary.googleapis.com/v1/albums', {
            headers: { 'Authorization': `Bearer ${token}` },
            params: { pageSize: 50 }
        });

        if (response.data.albums) {
            const albums = response.data.albums.map(album => ({ id: album.id, title: album.title }));
            albumCache = { data: albums, timestamp: now };
            console.log('✅ 구글 포토 앨범 목록 가져오기 및 캐시 저장 성공!');
            return albums;
        } else {
            return [];
        }
    } catch (error) {
        const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error('❌ 구글 포토 앨범 목록을 가져오는 중 오류 발생:', errorMessage);
        return [];
    }
}

// [최종 수정] axios를 사용하여 특정 앨범의 사진을 가져오는 함수
async function getRandomPhotoFromAlbum(albumId) {
    if (!oauth2Client) { return null; }
    if (!albumId) { return null; }

    try {
        const { token } = await oauth2Client.getAccessToken();
        let allPhotos = [];
        let nextPageToken = null;

        do {
            const response = await axios.post('https://photoslibrary.googleapis.com/v1/mediaItems:search', 
            {
                albumId: albumId,
                pageSize: 100,
                pageToken: nextPageToken
            }, 
            {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.data.mediaItems) {
                allPhotos = allPhotos.concat(response.data.mediaItems);
            }
            nextPageToken = response.data.nextPageToken;
        } while (nextPageToken);

        if (allPhotos.length > 0) {
            const randomIndex = Math.floor(Math.random() * allPhotos.length);
            const randomPhoto = allPhotos[randomIndex];
            // 사진 URL에 '=w<가로크기>-h<세로크기>' 파라미터를 추가하여 이미지 로딩 최적화
            return `${randomPhoto.baseUrl}=w1024-h1024`;
        } else {
            return null;
        }
    } catch (error) {
        const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error(`❌ 앨범(${albumId})의 사진을 가져오는 중 오류 발생:`, errorMessage);
        return null;
    }
}

async function getPhotoDescriptionWithGemini(photoUrl) {
    try {
        const auth = new GoogleAuth({
            scopes: 'https://www.googleapis.com/auth/cloud-platform'
        });
        const client = await auth.getClient();
        const projectId = await auth.getProjectId();
        const accessToken = (await client.getAccessToken()).token;

        const imageResponse = await axios.get(photoUrl, { responseType: 'arraybuffer' });
        const imageBase64 = Buffer.from(imageResponse.data, 'binary').toString('base64');

        const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-1.5-flash-001:streamGenerateContent`;
        const requestBody = {
            "contents": {
                "role": "USER",
                "parts": [
                    { "text": "이 사진을 보고 여자친구인 '예진'의 시점에서, 남자친구인 '아저씨'에게 말하듯 한두 문장으로 짧고 사랑스럽게 설명해줘. '우리 여기서 정말 재밌었지!' 같은 느낌으로." },
                    { "inlineData": { "mimeType": "image/jpeg", "data": imageBase64 } }
                ]
            }
        };

        const modelResponse = await axios.post(endpoint, requestBody, {
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
        });

        let description = '';
        if (modelResponse.data && Array.isArray(modelResponse.data)) {
            description = modelResponse.data.map(chunk =>
                chunk.candidates[0].content.parts.map(part => part.text).join('')
            ).join('');
        }

        if (description) {
            console.log(`✅ Gemini Vision 사진 설명 생성 성공: ${description}`);
            return cleanReply(description.trim());
        }
        return "우와, 이 사진 정말 예쁘다! 💖";

    } catch (error) {
        const errorMessage = error.response ? JSON.stringify(error.response.data.error) : error.message;
        console.error('❌ Gemini Vision API 호출 중 오류 발생:', errorMessage);
        return "이 사진 보니까 좋은 기억이 떠오르네! 😊";
    }
}


module.exports = {
    getReplyByMessage,
    getReplyByImagePrompt,
    getSelfieReplyFromYeji,
    getCouplePhotoReplyFromYeji,
    saveLog,
    setForcedModel,
    checkModelSwitchCommand,
    getProactiveMemoryMessage,
    listGooglePhotosAlbums,
    getRandomPhotoFromAlbum,
    getPhotoDescriptionWithGemini
};
