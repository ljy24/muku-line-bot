// ============================================================================
// yejinSelfie.js - v2.1 (똑똑해진 셀카 담당자)
// 📸 애기의 감정을 읽어서 코멘트와 함께 셀카를 전송합니다.
// ============================================================================

const axios = require('axios');
// ✅ [수정] 중앙 기억 서랍과 감정 전문가에게 가는 길을 추가했습니다.
const conversationContext = require('./ultimateConversationContext.js');
const emotionalContext = require('./emotionalContextManager.js');

const SELFIE_ALBUM_URL = 'https://photo.de-ji.net/photo/yejin/';

/**
 * 앨범 URL에서 랜덤하게 사진 주소 하나를 가져옵니다.
 * @param {string} url - 사진 목록이 있는 URL
 * @returns {string|null} 랜덤 사진의 전체 URL
 */
async function getRandomPhotoUrl(url) {
    try {
        const response = await axios.get(url, { timeout: 5000 });
        const files = response.data;
        if (Array.isArray(files) && files.length > 0) {
            const randomFile = files[Math.floor(Math.random() * files.length)];
            const baseUrl = url.endsWith('/') ? url : url + '/';
            return baseUrl + randomFile;
        }
        return null;
    } catch (error) {
        console.error(`❌ [yejinSelfie] 사진 목록을 가져오는 데 실패했습니다: ${url}`, error.message);
        return null;
    }
}

/**
 * "셀카줘" 명령어에 대한 최종 응답을 생성합니다.
 * @returns {Promise<object>} LINE에 보낼 이미지 또는 텍스트 메시지 객체
 */
async function getSelfieReply() {
    try {
        const photoUrl = await getRandomPhotoUrl(SELFIE_ALBUM_URL);

        if (!photoUrl) {
            return {
                type: 'text',
                comment: '아저씨, 지금 셀카 사진첩을 열 수가 없어 ㅠㅠ 서버에 문제가 있나 봐...'
            };
        }

        // ✅ [수정] 이제 애기의 감정을 읽어서 코멘트를 생성합니다.
        const caption = emotionalContext.generateSelfieComment() || "아저씨한테 보내는 내 사진이야! 예쁘지? 히히.";
        
        console.log(`📸 [yejinSelfie] 셀카 전송 준비 완료: ${photoUrl}`);

        return {
            type: 'image',
            originalContentUrl: photoUrl,
            previewImageUrl: photoUrl,
            caption: `(셀카) ${caption}`,
        };

    } catch (error) {
        console.error('❌ [yejinSelfie] 셀카 응답 생성 중 에러 발생:', error);
        return {
            type: 'text',
            comment: '아저씨... 지금 사진첩을 열어보려는데 뭔가 문제가 생겼나 봐 ㅠㅠ 조금 있다 다시 해줄래?'
        };
    }
}

module.exports = {
    getSelfieReply,
};
