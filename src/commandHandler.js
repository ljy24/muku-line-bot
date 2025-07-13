// ============================================================================
// commandHandler.js - v1.0 (안정화 버전)
// 🧠 각 사진 명령어에 맞는 담당자 파일을 연결해주는 길잡이 역할만 수행합니다.
// ============================================================================

// 각 사진 담당자들을 불러옵니다.
const { getSelfieReply } = require('./yejinSelfie.js');
const { getConceptPhotoReply } = require('../memory/concept.js');
const { getOmoideReply } = require('../memory/omoide.js');
// '커플사진줘'에 대한 파일이 있다면 여기에 추가할 수 있습니다.
// const { getCouplePhotoReply } = require('./couplePhoto.js');

/**
 * 사용자의 메시지를 분석하여 적절한 담당자를 호출합니다.
 * @param {string} text - 사용자 메시지
 * @returns {Promise<object|null>} 실행 결과 또는 null
 */
async function handleCommand(text) {
    const lowerText = text.toLowerCase();

    // 사진 관련 명령어에 따라 각 담당자 함수를 호출합니다.
    if (lowerText.includes('셀카') && lowerText.includes('줘')) {
        return await getSelfieReply();
    }
    if (lowerText.includes('컨셉') && lowerText.includes('사진') && lowerText.includes('줘')) {
        return await getConceptPhotoReply();
    }
    if (lowerText.includes('추억') && lowerText.includes('사진') && lowerText.includes('줘')) {
        return await getOmoideReply();
    }
    // if (lowerText.includes('커플') && lowerText.includes('사진') && lowerText.includes('줘')) {
    //     return await getCouplePhotoReply();
    // }

    // 여기에 다른 명령어를 추가할 수 있습니다.

    return null; // 처리할 명령어가 없으면 null 반환
}

module.exports = {
    handleCommand,
};
