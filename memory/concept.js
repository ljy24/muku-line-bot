// memory/concept.js v2.5 (컨셉사진+예진이설명 같이 보내는 완전체)

const conceptIndex = require('./concept-index.json');

// 📸 서버 기본 경로
const BASE_URL = 'https://photo.de-ji.net/photo/concept';

// 폴더명 → 자연어 변환
function formatConceptKey(key) {
    const parts = key.split('_');
    if (parts.length < 4) return key;
    const year = parts[0];
    const month = parts[1].replace(/^0/, '') + '월';
    const day = parts[2].replace(/^0/, '') + '일';
    const country = parts[3];
    const rest = parts.slice(4).join(' ');
    return `${year}년 ${month} ${day} ${country} ${rest}`;
}

// 예진이 말투 설명 생성
function makeYejinConceptMessage(key, info) {
    let msg = `이 사진은 "${formatConceptKey(key)}"에서 찍은 컨셉사진이야.\n\n`;
    if (info.mood) msg += info.mood + '\n';
    if (info.episode) msg += info.episode + '\n';
    if (info.favorite) msg += '아저씨가 제일 좋아했던 거 기억나?';
    msg += '\n나 예뻤지? ㅎㅎ';
    return msg.trim();
}

// 📸 랜덤 사진 파일 생성
function pickRandomPhotoUrl(folderKey, photoCount = 30) {
    // 파일명: [폴더명]_[6자리번호].jpg
    // photoCount는 실제 사진 개수. 없으면 30개 기본.
    const idx = Math.floor(Math.random() * photoCount) + 1;
    const fileNum = String(idx).padStart(6, '0');
    return `${BASE_URL}/${folderKey}_${fileNum}.jpg`;
}

// 메인 함수
async function getConceptPhotoReply(userMessage) {
    const lowerMsg = userMessage.toLowerCase();
    const keywords = ['컨셉사진', '컨셉 사진', '컨셉 보여줘', '컨셉 텍스트', '컨셉 설명', '컨셉 보고싶어'];

    if (!keywords.some(k => lowerMsg.includes(k))) return null;

    // 무작위 컨셉 하나 뽑기
    const keys = Object.keys(conceptIndex);
    if (keys.length === 0) {
        return { type: 'text', comment: '아저씨... 컨셉 인덱스가 비었어 ㅠㅠ' };
    }
    const pick = keys[Math.floor(Math.random() * keys.length)];
    const info = conceptIndex[pick];
    // 사진 수 추정: 50장 미만이면 30, 많아보이면 50~100 랜덤으로(대충! 실제로는 폴더별 수 필요)
    const guessCount = info.count || 30;

    // 📸 이미지 경로 만들기
    const photoUrl = pickRandomPhotoUrl(pick, guessCount);
    const comment = makeYejinConceptMessage(pick, info);

    // LINE이나 앱에 보낼 객체 형태
    return {
        type: 'image',
        originalContentUrl: photoUrl,
        previewImageUrl: photoUrl,
        altText: comment,
        caption: comment
    };
}

module.exports = {
    getConceptPhotoReply
};
