// 파일명: src/face.js
// 수정일: 2025년 7월 2일
// 수정내용: OpenAI Vision API를 활용한 얼굴 인식 및 분류 기능 추가

const fs = require('fs'); // 파일 시스템 모듈
const path = require('path'); // 경로 처리 모듈

/**
 * 지정된 폴더에서 모든 이미지 파일을 Base64로 읽어옵니다.
 * @param {string} personName - 'uncle' 또는 'yejin'과 같이 인물 이름 폴더명
 * @returns {Array<string>} Base64 인코딩된 이미지 문자열 배열
 */
function loadFaceImagesAsBase64(personName) {
    const facesDirPath = path.resolve(__dirname, `../memory/faces/${personName}`);
    const base64Images = [];

    if (!fs.existsSync(facesDirPath)) {
        console.warn(`[Face Recognition] 경고: 얼굴 이미지 폴더를 찾을 수 없습니다: ${facesDirPath}`);
        return [];
    }

    const files = fs.readdirSync(facesDirPath);
    for (const file of files) {
        // 이미지 파일만 처리 (jpg, jpeg, png)
        if (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png')) {
            const filePath = path.join(facesDirPath, file);
            try {
                const imageBuffer = fs.readFileSync(filePath);
                const base64 = imageBuffer.toString('base64');
                const mimeType = file.endsWith('.png') ? 'image/png' : 'image/jpeg';
                base64Images.push(`data:${mimeType};base64,${base64}`);
            } catch (error) {
                console.error(`[Face Recognition] 오류: 이미지 파일 읽기 실패 - ${filePath}:`, error);
            }
        }
    }
    return base64Images;
}

/**
 * OpenAI Vision API를 위한 얼굴 식별 프롬프트와 이미지 데이터를 구성합니다.
 * @param {string} userImageBase64 - 사용자가 보낸 이미지의 Base64 데이터
 * @param {Array<string>} knownUncleFaces - 아저씨 얼굴 예시 Base64 배열
 * @param {Array<string>} knownYejiFaces - 예진이 얼굴 예시 Base64 배열
 * @returns {Array<Object>} OpenAI Vision API messages 배열 형식
 */
function getFaceIdentificationMessages(userImageBase64, knownUncleFaces, knownYejiFaces) {
    let promptText = `
    아래는 사용자가 보낸 사진이야. 이 사진 속에 있는 인물이 누구인지 판단해줘.
    
    참고를 위해 아저씨와 예진이의 얼굴 예시를 제공할게.
    
    --- 아저씨 얼굴 예시 ---
    `;
    knownUncleFaces.forEach((_, index) => {
        promptText += `[아저씨 얼굴 ${index + 1}]\n`;
    });
    promptText += `
    --- 예진이 얼굴 예시 ---
    `;
    knownYejiFaces.forEach((_, index) => {
        promptText += `[예진이 얼굴 ${index + 1}]\n`;
    });

    promptText += `
    --- 지시 사항 ---
    1. 사용자가 보낸 사진에 사람이 없다면 "사람이 없어요"라고 대답해줘.
    2. 사진에 사람이 있지만 아저씨나 예진이 얼굴이 아니라면 "다른 사람 같아요"라고 대답해줘.
    3. 사진 속 인물이 아저씨 얼굴과 일치한다면 "아저씨"라고만 대답해줘.
    4. 사진 속 인물이 예진이 얼굴과 일치한다면 "예진이"라고만 대답해줘.
    5. 답변은 위의 4가지 중 하나로, **다른 부연 설명 없이 해당 단어/문장만** 말해줘.
    `;

    const messages = [
        {
            type: "text",
            text: promptText.trim()
        },
        {
            type: "image_url",
            image_url: { url: userImageBase64 }
        }
    ];

    // 아저씨 얼굴 예시 이미지 추가
    knownUncleFaces.forEach(base64 => {
        messages.push({
            type: "image_url",
            image_url: { url: base64 }
        });
    });

    // 예진이 얼굴 예시 이미지 추가
    knownYejiFaces.forEach(base64 => {
        messages.push({
            type: "image_url",
            image_url: { url: base64 }
        });
    });

    return messages;
}

module.exports = {
    loadFaceImagesAsBase64,
    getFaceIdentificationMessages
};
