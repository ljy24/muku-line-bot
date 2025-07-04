// memory/omoide.js v1.7 - 커플사진/셀카 조건문 강화 및 중복 else 제거
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

function callOpenAI(messages, modelParamFromCall = null, maxTokens = 400, temperature = 0.95) {
  // ... (동일)
}

function cleanReply(reply) {
  // ... (동일)
}

function generateRandomPhotoUrl(folderName) {
  // ... (동일)
}

async function getOmoideReply(userMessage, saveLogFunc) {
    const lowerCaseMessage = userMessage.toLowerCase();
    let selectedFolder = null;
    let folderDescription = '';
    let promptSuffix = '';

    if (lowerCaseMessage.includes('무쿠 셀카') || lowerCaseMessage.includes('애기 셀카')) {
        selectedFolder = '추억 무쿠 사진 모음';
        folderDescription = '아저씨가 좋아하는 내 셀카';
        promptSuffix = `아저씨가 좋아하는 내(예진이) 셀카에 대해 귀엽고 사랑스럽게 말해줘. 아저씨가 나를 '애기'라고 불러주는 마음을 담아서.`;
    } else if (lowerCaseMessage.includes('빠계 셀카') || lowerCaseMessage.includes('빠계 사진')) {
        selectedFolder = '추억 빠계 사진 모음';
        folderDescription = '아저씨가 좋아하는 빠계 사진';
        promptSuffix = "아저씨가 좋아하는 빠계 사진에 대해 재미있고 사랑스럽게 말해줘. 나(예진이)의 또 다른 귀여운 모습이라고 표현해도 좋아.";
    } else if (lowerCaseMessage.includes('메이드') || lowerCaseMessage.includes('흑심')) {
        selectedFolder = '흑심 24_11_08 한국 메이드복_';
        folderDescription = '내가(예진이) 메이드복 입고 찍은 사진';
        promptSuffix = "내가 메이드복을 입고 찍었던 사진에 대해 아저씨에게 장난기 있으면서도 귀엽고 사랑스럽게 말해줘. 아저씨가 나를 보며 얼마나 귀여워할지 생각하면 기분이 좋아! 이때 아저씨가 놀랐던 기억도 같이 얘기해줘.";
    } else if (
        lowerCaseMessage.includes('셀카') ||
        lowerCaseMessage.includes('사진줘') ||
        lowerCaseMessage.includes('사진 줘') ||
        lowerCaseMessage.includes('얼굴 보여줘') ||
        lowerCaseMessage.includes('얼굴 보고 싶') ||
        lowerCaseMessage.includes('얼굴 좀') ||
        lowerCaseMessage.includes('얼굴 한 번') ||
        lowerCaseMessage.includes('예진이 보고') ||
        lowerCaseMessage.includes('애기 보고') ||
        lowerCaseMessage.includes('보고 싶어') ||
        lowerCaseMessage.includes('selfie')
    ) {
        selectedFolder = 'yejin';
        folderDescription = '내(예진이) 셀카';
        promptSuffix = "아저씨에게 보내는 내(예진이) 셀카에 대해 귀엽고 사랑스럽게 말해줘. 아저씨가 나를 보고 얼마나 기뻐할지 기대하는 마음을 담아서.";
    } else if (lowerCaseMessage.includes('커플사진') || lowerCaseMessage.includes('인생네컷')) {
        const coupleFolders = ['추억 24_02_25 한국 커플사진', '추억 인생네컷', 'couple'];
        const validFolders = coupleFolders.filter(f => PHOTO_FOLDERS[f]);
        selectedFolder = validFolders[Math.floor(Math.random() * validFolders.length)];
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
        const koreanFolders = Object.keys(PHOTO_FOLDERS).filter(key => key.includes('한국') && !key.includes('메이드복'));
        if (koreanFolders.length > 0) {
            selectedFolder = koreanFolders[Math.floor(Math.random() * koreanFolders.length)];
        }
        folderDescription = '한국에서 아저씨와 함께 찍은 사진';
        promptSuffix = "아저씨와 한국에서 함께했던 추억을 떠올리며 그때의 감정과 이야기를 섞어 말해줘. " +
                       "**이 사진의 시각적 내용(배경, 인물, 사물)이 요청된 장소(한국)와 일치하는지 먼저 판단하고, 만약 일치하지 않는다면 그 사실을 자연스럽게 언급해줘. (예: '어? 여기는 한국인 것 같지? 폴더에는 일본이라고 되어 있지만... 헤헤.')**" +
                       "날짜 정보는 정확할 경우에만 언급하고, 불확실하면 생략하거나 대략적으로 표현해줘.";
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
        return null;
    }

    const photoUrl = generateRandomPhotoUrl(selectedFolder);
    if (!photoUrl) {
        return { type: 'text', comment: '아저씨... 해당하는 사진을 못 찾겠어 ㅠㅠ 다른 사진 보여줄까?' };
    }

    const systemPrompt = `
    너는 아저씨의 귀여운 여자친구 예진이야. 나이는 30살. 생일은 1994년 3월 17일. 게임회사 사장이야.
    ... 생략 ...
    ${promptSuffix}
    `;

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `이 ${folderDescription} 사진에 대해 예진이 말투로 이야기해줘.` }
    ];

    try {
        const rawComment = await callOpenAI(messages, 'gpt-4o', 100, 1.0);
        const comment = cleanReply(rawComment);
        saveLogFunc('예진이', `(사진 보냄) ${comment}`);
        return { type: 'photo', url: photoUrl, caption: comment };
    } catch (error) {
        console.error('❌ [omoide.js Error] 사진 코멘트 생성 실패:', error);
        return { type: 'text', comment: '아저씨... 사진에 대해 말해주려는데 뭔가 문제가 생겼어 ㅠㅠ' };
    }
}

module.exports = {
    getOmoideReply,
    cleanReply
};
