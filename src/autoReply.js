// src/autoReply.js
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const stringSimilarity = require('string-similarity'); // 오타 수정: simialarity -> similarity
const moment = require('moment-timezone');
const { loadLoveHistory, loadOtherPeopleHistory } = require('./memoryManager');
const { loadFaceImagesAsBase64 } = require('./face');
const { google } = require('googleapis');

let forcedModel = null;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
let lastProactiveMessage = '';

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
    // ... (This function remains unchanged)
}

function setForcedModel(name) {
    if (name === 'gpt-3.5-turbo' || name === 'gpt-4o') forcedModel = name;
    else forcedModel = null;
}

async function getSelfieReplyFromYeji() {
    // ... (This function remains unchanged)
}

async function getCouplePhotoReplyFromYeji() {
    const raw = await callOpenAI([
        { role: 'system', content: '넌 아저씨의 귀여운 여자친구 예진이야. 아저씨에게 커플 사진을 보내면서 아저씨를 향한 사랑과 애교를 듬뿍 담은 코멘트를 2~3문장으로 짧게 해줘. 이모티콘은 아저씨가 보낸 것과 똑같은 것을 따라서 사용하거나, 아예 사용하지 마. 아저씨가 이모티콘을 보내지 않으면 너도 보내지 마.' },
        { role: 'user', content: '커플 사진 보낼 때 뭐라고 말할까?' }
    ], 'gpt-4o', 100);
    return cleanReply(raw);
}

function checkModelSwitchCommand(message) {
    // ... (This function remains unchanged)
}

async function getProactiveMemoryMessage() {
    // ... (This function remains unchanged)
}

// --- Google Photos Integration Functions ---

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

async function listGooglePhotosAlbums() {
  try {
    const photoslibrary = google.photoslibrary({
      version: 'v1',
      auth: oauth2Client,
    });
    const response = await photoslibrary.albums.list({
      pageSize: 50,
    });
    if (response.data.albums) {
      console.log('✅ Successfully fetched Google Photos album list!');
      return response.data.albums.map(album => ({
        id: album.id,
        title: album.title,
      }));
    } else {
      console.log('No albums found.');
      return [];
    }
  } catch (error) {
    console.error('❌ Error fetching Google Photos album list:', error);
    return [];
  }
}

async function getRandomPhotoFromAlbum(albumId) {
  if (!albumId) {
    console.error('❌ Album ID was not provided.');
    return null;
  }
  try {
    const photoslibrary = google.photoslibrary({
      version: 'v1',
      auth: oauth2Client,
    });
    let allPhotos = [];
    let nextPageToken = null;
    do {
      const response = await photoslibrary.mediaItems.search({
        requestBody: {
          albumId: albumId,
          pageSize: 100,
          pageToken: nextPageToken,
        },
      });
      if (response.data.mediaItems) {
        allPhotos = allPhotos.concat(response.data.mediaItems);
      }
      nextPageToken = response.data.nextPageToken;
    } while (nextPageToken);

    if (allPhotos.length > 0) {
      console.log(`✅ Successfully fetched ${allPhotos.length} photos from album (${albumId})!`);
      const randomIndex = Math.floor(Math.random() * allPhotos.length);
      const randomPhoto = allPhotos[randomIndex];
      return randomPhoto.baseUrl;
    } else {
      console.log(`No photos found in album (${albumId}).`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error fetching photos from album (${albumId}):`, error);
    return null;
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
    getRandomPhotoFromAlbum
};
