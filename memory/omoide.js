// memory/omoide.js - "추억" 관련 기능 (랜덤 셀카, 특정 추억 검색)

const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const moment = require('moment-timezone'); // 시간대 처리용 Moment.js
const { getYejinSystemPrompt } = require('../src/yejin'); // 시스템 프롬프트 불러오기

// OpenAI 클라이언트 초기화 (API 키는 환경 변수에서 가져옴)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 셀카 이미지 경로 (번호 기반으로 이미지 서빙 가정)
const BASE_SELFIE_URL = 'https://www.de-ji.net/yejin/'; // 실제 셀카 이미지가 저장된 웹 서버의 기본 URL (HTTPS 필수)
const SELFIE_START_NUM = 1; // 셀카 시작 번호
const SELFIE_END_NUM = 1111; // 셀카 마지막 번호 (총 1111장 가정)

// ✨ 이곳의 lastSentSelfie 변수와 쿨다운 로직은 이제 사용되지 않거나, index.js 또는 scheduler.js로 이동됩니다. ✨
// 현재는 단순히 URL을 반환하는 함수로 만듭니다.

/**
 * 랜덤 셀카 이미지 URL을 생성합니다.
 * @returns {string} 셀카 이미지 URL
 */
function getSelfieImageUrl() {
    const randomSelfieIndex = Math.floor(Math.random() * (SELFIE_END_NUM - SELFIE_START_NUM + 1)) + SELFIE_START_NUM;
    const fileName = String(randomSelfieIndex).padStart(6, '0') + '.jpg'; // 000001.jpg 형식
    return BASE_SELFIE_URL + fileName;
}


/**
 * AI 응답 텍스트를 정제하고 불필요한 서식을 제거합니다.
 * @param {string} reply - AI의 원본 응답 텍스트
 * @returns {string} 정제된 텍스트
 */
function cleanReply(reply) {
    let cleaned = String(reply).trim(); // reply가 null이거나 undefined일 경우를 대비해 String으로 변환

    // 챗지피티 제안 1: 시작 따옴표가 있는데 닫는 따옴표가 없는 경우 강제 추가 ✨
    if (cleaned.startsWith('"') && !cleaned.endsWith('"')) {
        cleaned = cleaned + '"';
        console.log(`[omoide:cleanReply] 닫는 따옴표 추가됨: ${cleaned}`);
    }
    // 챗지피티 제안 2: 응답 전체가 따옴표로 감싸져 있는 경우 따옴표 제거 ✨
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.substring(1, cleaned.length - 1).trim();
        console.log(`[omoide:cleanReply] 전체 따옴표 제거됨: ${cleaned}`);
    }

    // 이모티콘 제거 (기존 로직 유지)
    cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
    
    // 기타 불필요한 특수문자 제거 (기존 로직 유지)
    cleaned = cleaned.replace(/[*_`]/g, ''); // 마크다운 볼드, 이탤릭, 코드 블록 문자 제거
    cleaned = cleaned.replace(/\s+/g, ' ').trim(); // 연속 공백 제거

    return cleaned;
}

/**
 * 특정 추억 사진 요청에 대한 답변을 생성합니다.
 * 이 함수는 이제 일반적인 랜덤 셀카 요청은 처리하지 않습니다.
 * (일반 셀카 요청은 index.js에서 isSelfieRequest와 getSelfieImageUrl을 통해 직접 처리)
 * @param {string} userMessage - 사용자의 메시지
 * @param {function} saveLog - 로그 저장 함수
 * @returns {Promise<object|null>} 이미지 URL 및 캡션 객체 또는 null
 */
async function getOmoideReply(userMessage, saveLog) {
    const lowerCaseMessage = userMessage.trim().toLowerCase(); // trim 추가

    // --- 기존의 '셀카 보여줘' 명령어 처리 로직은 제거됩니다. ---
    // 이 부분은 이제 index.js에서 isSelfieRequest와 getSelfieImageUrl을 통해 처리합니다.
    /*
    if (lowerCaseMessage.includes('셀카') || lowerCaseMessage.includes('사진')) {
        // ... (이전 셀카 로직 제거) ...
    }
    */

    // 다른 추억 검색 기능 (아직 구현되지 않았지만, 확장 가능)
    // 예: "우리 오키나와 여행 사진 보여줘" -> DB에서 관련 사진 검색 후 반환
    // 현재는 매칭되는 폴더나 기능이 없음을 로그로 남깁니다.
    console.log(`[omoide:getOmoideReply] 메시지 수신: "${userMessage}"`);
    console.log('[omoide:getOmoideReply] 매칭되는 폴더 없음. null 반환.');
    return null;
}

module.exports = {
    getOmoideReply,
    cleanReply,
    getSelfieImageUrl // ✨ 새로 내보내는 함수
};
