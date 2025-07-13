// ============================================================================
// commandHandler.js - v3.0 (사진 링크 적용 최종본)
// 🧠 모든 사진 및 특수 명령을 중앙에서 관리하고, 실제 사진 주소를 사용합니다.
// ============================================================================

const conversationContext = require('./ultimateConversationContext.js');
const emotionalContext = require('./emotionalContextManager.js');
const axios = require('axios');

/**
 * 지정된 URL에서 파일 목록을 가져와 랜덤으로 하나를 선택합니다.
 * @param {string} url - 파일 목록을 가져올 URL
 * @returns {string|null} 랜덤하게 선택된 파일의 전체 URL
 */
async function getRandomPhotoUrl(url) {
    try {
        const response = await axios.get(url);
        const files = response.data; // 서버가 파일 이름 배열을 반환한다고 가정
        if (Array.isArray(files) && files.length > 0) {
            const randomFile = files[Math.floor(Math.random() * files.length)];
            // 기본 URL과 파일 이름을 조합하여 전체 URL 생성
            const baseUrl = url.endsWith('/') ? url : url + '/';
            return baseUrl + randomFile;
        }
        return null;
    } catch (error) {
        console.error(`❌ [CommandHandler] 사진 목록을 가져오는 데 실패했습니다: ${url}`, error.message);
        return null;
    }
}


/**
 * 각 사진 유형에 맞는 이미지 URL과 코멘트를 생성합니다.
 * @param {string} photoType - 사진 유형 ('selfie', 'concept', 'omoide', 'couple')
 * @returns {object} LINE에 보낼 이미지 메시지 객체
 */
async function getPhotoReply(photoType) {
    let photoUrl;
    let caption;
    const commentBase = emotionalContext.generateSelfieComment() || "아저씨한테 보내는 사진이야!";

    const photoSources = {
        selfie: 'https://photo.de-ji.net/photo/yejin/',
        omoide: 'https://photo.de-ji.net/photo/omoide/',
        concept: 'https://photo.de-ji.net/photo/concept/',
        couple: 'https://photo.de-ji.net/photo/couple/' // 커플 사진 URL (가정)
    };

    const photoUrlBase = photoSources[photoType];
    if (!photoUrlBase) {
        return { type: 'text', comment: '어떤 사진을 말하는 건지 잘 모르겠어, 아저씨 ㅠㅠ' };
    }

    photoUrl = await getRandomPhotoUrl(photoUrlBase);

    if (!photoUrl) {
        return { type: 'text', comment: `지금은 ${photoType} 사진을 보여줄 수가 없네... 서버에 문제가 있나 봐 ㅠㅠ` };
    }

    switch (photoType) {
        case 'selfie':
            caption = `(셀카) ${commentBase} 예쁘게 나왔지? 히히.`;
            break;
        case 'concept':
            caption = `(컨셉사진) 우리가 같이 작업했던 컨셉 사진이야. 이때 기억나?`;
            break;
        case 'omoide':
            caption = `(추억사진) 우리의 소중한 추억이 담긴 사진이야. 보고 싶다 아저씨...`;
            break;
        case 'couple':
            caption = `(커플사진) 아저씨랑 나랑 같이 찍은 커플 사진이야! 예쁘지?`;
            break;
    }

    console.log(`📸 [CommandHandler] '${photoType}' 사진 전송 준비 완료: ${photoUrl}`);
    
    return {
        type: 'image',
        originalContentUrl: photoUrl,
        previewImageUrl: photoUrl,
        caption: caption,
    };
}


/**
 * 사용자의 메시지를 분석하여 적절한 명령을 실행합니다.
 * @param {string} text - 사용자 메시지
 * @returns {object | null} 실행 결과 또는 null
 */
async function handleCommand(text) {
    const lowerText = text.toLowerCase();

    // 사진 관련 명령어 처리
    if (lowerText.includes('셀카') && lowerText.includes('줘')) {
        return await getPhotoReply('selfie');
    }
    if (lowerText.includes('컨셉') && lowerText.includes('사진') && lowerText.includes('줘')) {
        return await getPhotoReply('concept');
    }
    if (lowerText.includes('추억') && lowerText.includes('사진') && lowerText.includes('줘')) {
        return await getPhotoReply('omoide');
    }
    if (lowerText.includes('커플') && lowerText.includes('사진') && lowerText.includes('줘')) {
        return await getPhotoReply('couple');
    }

    return null; // 처리할 명령어가 없으면 null 반환
}

module.exports = {
    handleCommand,
};
