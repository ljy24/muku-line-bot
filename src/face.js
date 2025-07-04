// src/face.js - 얼굴 이미지 데이터 로드
const fs = require('fs');
const path = require('path');

// 얼굴 이미지가 저장된 폴더 경로
const FACE_IMAGES_DIR = path.resolve(__dirname, '../../faces'); // 프로젝트 루트의 faces 폴더

/**
 * 주어진 카테고리(예: 'uncle', 'yejin')에 해당하는 얼굴 이미지를 Base64로 인코딩하여 불러옵니다.
 * @param {string} category - 불러올 이미지의 카테고리 (폴더 이름)
 * @returns {Array<string>} Base64 인코딩된 이미지 문자열 배열 (data:MIME_TYPE;base64, 포함)
 */
function loadFaceImagesAsBase64(category) {
    const categoryPath = path.join(FACE_IMAGES_DIR, category);
    const images = [];

    try {
        const files = fs.readdirSync(categoryPath); // 폴더 내 파일 목록 읽기
        for (const file of files) {
            const filePath = path.join(categoryPath, file);
            if (fs.statSync(filePath).isFile()) { // 파일인지 확인
                const fileExtension = path.extname(file).toLowerCase();
                let mimeType;

                // 파일 확장자에 따라 MIME 타입 결정
                if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
                    mimeType = 'image/jpeg';
                } else if (fileExtension === '.png') {
                    mimeType = 'image/png';
                } else if (fileExtension === '.gif') {
                    mimeType = 'image/gif';
                } else {
                    console.warn(`[Face] 지원하지 않는 이미지 형식: ${file}`);
                    continue;
                }

                const imageData = fs.readFileSync(filePath); // 이미지 파일 읽기
                const base64 = `data:${mimeType};base64,${imageData.toString('base64')}`; // Base64 인코딩
                images.push(base64);
            }
        }
        console.log(`[Face] '${category}' 카테고리에서 ${images.length}개의 얼굴 이미지 로드 완료.`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.warn(`[Face] 얼굴 이미지 폴더를 찾을 수 없습니다: ${categoryPath}`);
        } else {
            console.error(`[Face] 얼굴 이미지 로드 중 오류 발생: ${error.message}`);
        }
    }
    return images;
}

// 모듈 내보내기
module.exports = {
    loadFaceImagesAsBase64
};
