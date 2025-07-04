// memory/omoide.js v1.7 - fallback 추가로 응답 누락 방지
const { OpenAI } = require('openai');
const moment = require('moment-timezone');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const BASE_PHOTO_URL = 'https://photo.de-ji.net/photo/';

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
    'yejin': 1286
};

function cleanReply(reply) {
    let cleaned = reply.replace(/^(예진:|무쿠:|\d{2}\.\d{2}\.\d{2} [^:]+:)/gm, '').trim();
    cleaned = cleaned.replace(/\b(오빠|자기|당신|너)\b/g, '아저씨');
    cleaned = cleaned.replace(/\b(예진이|예진|무쿠|무쿠야|무쿠 언니|무쿠 씨|그녀|그 사람)\b/g, '나');
    cleaned = cleaned.replace(/안녕하세요/g, '안녕')
        .replace(/있었어요/g, '있었어').replace(/했어요/g, '했어')
        .replace(/같아요/g, '같아').replace(/좋아요/g, '좋아')
        .replace(/합니다\b/g, '해').replace(/습니다\b/g, '어')
        .replace(/어요\b/g, '야').replace(/해요\b/g, '해')
        .replace(/예요\b/g, '야').replace(/죠\b/g, '지')
        .replace(/았습니다\b/g, '았어').replace(/었습니다\b/g, '었어')
        .replace(/하였습니다\b/g, '했어').replace(/하겠습니다\b/g, '하겠어')
        .replace(/싶어요\b/g, '싶어').replace(/이었어요\b/g, '이었어')
        .replace(/이에요\b/g, '야').replace(/였어요\b/g, '였어')
        .replace(/보고싶어요\b/g, '보고 싶어');
    return cleaned;
}

function generateRandomPhotoUrl(folderName) {
    const photoCount = PHOTO_FOLDERS[folderName];
    if (!photoCount) return null;
    const randomIndex = Math.floor(Math.random() * photoCount) + 1;
    return `${BASE_PHOTO_URL}${encodeURIComponent(folderName)}/${String(randomIndex).padStart(6, '0')}.jpg`;
}

async function callOpenAI(messages, model = 'gpt-4o', maxTokens = 400, temperature = 0.95) {
    try {
        const res = await openai.chat.completions.create({
            model,
            messages,
            max_tokens: maxTokens,
            temperature
        });
        return res.choices[0].message.content.trim();
    } catch (e) {
        console.error('[callOpenAI 실패]', e);
        return '';
    }
}

async function getOmoideReply(userMessage, saveLogFunc) {
    const lower = userMessage.toLowerCase();
    let selectedFolder = null, folderDescription = '', promptSuffix = '';

    if (lower.includes('무쿠 셀카') || lower.includes('애기 셀카')) {
        selectedFolder = '추억 무쿠 사진 모음';
        folderDescription = '아저씨가 좋아하는 내 셀카';
        promptSuffix = `아저씨가 좋아하는 내(예진이) 셀카에 대해 귀엽고 사랑스럽게 말해줘.`;
    } else if (lower.includes('빠계 셀카') || lower.includes('빠계 사진')) {
        selectedFolder = '추억 빠계 사진 모음';
        folderDescription = '아저씨가 좋아하는 빠계 사진';
        promptSuffix = '아저씨가 좋아하는 빠계 사진에 대해 재미있고 사랑스럽게 말해줘.';
    } else if (lower.includes('메이드') || lower.includes('흑심')) {
        selectedFolder = '흑심 24_11_08 한국 메이드복_';
        folderDescription = '내가 메이드복 입고 찍은 사진';
        promptSuffix = '메이드복 입고 찍은 사진에 대해 장난기 있고 사랑스럽게 말해줘.';
    } else if (/셀카|사진 ?줘|얼굴 ?보여|얼굴 보고 싶|selfie/.test(lower)) {
        selectedFolder = 'yejin';
        folderDescription = '내(예진이) 셀카';
        promptSuffix = '셀카에 대해 귀엽고 사랑스럽게 말해줘. 기대하는 마음으로!';
    } else if (lower.includes('인생네컷')) {
        selectedFolder = '추억 인생네컷';
        folderDescription = '인생네컷 사진';
        promptSuffix = '인생네컷 사진에 대해 즐겁고 추억 가득한 멘트를 해줘.';
    } else if (lower.includes('커플사진')) {
        selectedFolder = PHOTO_FOLDERS['추억 24_02_25 한국 커플사진'] ? '추억 24_02_25 한국 커플사진' : 'couple';
        folderDescription = '아저씨와 함께 찍은 커플 사진';
        promptSuffix = '우리 둘만의 소중한 커플 사진에 대해 비밀스럽고 사랑스럽게 말해줘.';
    } else if (lower.includes('일본') && lower.includes('사진')) {
        const list = Object.keys(PHOTO_FOLDERS).filter(f => f.includes('일본'));
        if (list.length) selectedFolder = list[Math.floor(Math.random() * list.length)];
        folderDescription = '일본에서 함께한 사진';
        promptSuffix = '일본에서의 추억을 떠올리며 감정을 섞어 말해줘.';
    } else if (lower.includes('한국') && lower.includes('사진')) {
        const list = Object.keys(PHOTO_FOLDERS).filter(f => f.includes('한국') && !f.includes('메이드'));
        if (list.length) selectedFolder = list[Math.floor(Math.random() * list.length)];
        folderDescription = '한국에서 함께한 사진';
        promptSuffix = '사진과 장소가 한국과 맞는지 판단해서, 맞으면 한국에서의 감정을 말해줘.';
    } else if (lower.includes('출사')) {
        const list = Object.keys(PHOTO_FOLDERS).filter(f => f.includes('출사'));
        if (list.length) selectedFolder = list[Math.floor(Math.random() * list.length)];
        folderDescription = '출사 사진';
        promptSuffix = '출사 나가서 찍은 사진에 대해 그때의 분위기와 감정 담아서 말해줘.';
    } else if (lower.includes('필름카메라') || lower.includes('애기 필름')) {
        const list = Object.keys(PHOTO_FOLDERS).filter(f => f.includes('필름'));
        if (list.length) selectedFolder = list[Math.floor(Math.random() * list.length)];
        folderDescription = '필름카메라 사진';
        promptSuffix = '필름카메라로 찍은 감성을 담아 말해줘.';
    }

    if (!selectedFolder) return null;

    const photoUrl = generateRandomPhotoUrl(selectedFolder);
    if (!photoUrl) return { type: 'text', comment: '아저씨... 해당 사진을 못 찾겠어 ㅠㅠ 다른 거 보여줄까?' };

    const systemPrompt = `
    너는 예진이야. 애교 많고 아저씨를 사랑하는 여자친구야. 항상 반말만 써. 이모티콘은 안 쓰고, ㅠㅠ 같은 한국식 감정 표현은 써도 돼. 아저씨가 부탁한 ${folderDescription} 사진이야. ${promptSuffix} 사진 배경과 내용을 보고 맞게 이야기해줘.`;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `이 ${folderDescription} 사진에 대해 예진이 말투로 얘기해줘.` }
    ];

    try {
        const raw = await callOpenAI(messages, 'gpt-4o', 100, 1.0);
        const comment = cleanReply(raw);
        const finalComment = comment && comment.length > 1 ? comment : '아저씨 이거 봐봐... 예쁘지?';
        saveLogFunc('예진이', `(사진 보냄) ${finalComment}`);
        return { type: 'photo', url: photoUrl, caption: finalComment };
    } catch (e) {
        console.error('[omoide.js] GPT 실패:', e);
        return { type: 'text', comment: '아저씨... 사진에 대해 말하려다 에러났어 ㅠㅠ' };
    }
}

module.exports = { getOmoideReply, cleanReply };