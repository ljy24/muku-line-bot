// memory/concept.js - 컨셉 사진 관련 기능 담당
const { OpenAI } = require('openai');
const moment = require('moment-timezone');
const path = require('path');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const BASE_CONCEPT_URL = 'https://photo.de-ji.net/concept/';

const CONCEPT_FOLDERS = {
   '2024/5월 7일 일본 홈스냅': 323,
    '2024/7월 8일 일본 결박': 223,
    '2024/10월 16일 일본 결박': 137,
    '2023/12월 16일 일본 선물': 113,
    '2024/4월 28일 한국 셀프 촬영': 112,
    '2024/9월 15일 한국 옥상연리': 98,
    '2025/2월 7일 일본 세미누드': 92,
    '2024/12월 7일 한국 홈셀프': 81,
    '2023/12월 14일 일본 플라스틱러브': 75,
    '2024/5월 3일 일본 지브리풍': 74,
    '2024/6월 6일 한국 북해': 65,
    '2024/2월 7일 일본 아이노시마': 65,
    '2025/3월 일본 필름': 64,
    '2024/5월 5일 일본 모지코 모리룩 후보정': 64,
    '2024/5월 5일 일본 모지코 모리룩': 64,
    '2025/1월 5일 한국 눈밭': 63,
    '2024/2월 7일 일본 욕실': 61,
    '2024/10월 17일 일본 하카타 고래티셔츠': 59,
    '2024/8월 3일 일본 유카타 마츠리': 56,
    '2025/4월 29일 한국 이화마을': 55,
    '2024/7월 8일 일본 욕조': 53,
    '2024/7월 6일 일본 우마시마': 53,
    '2024/11월 7일 한국 가을 호수공원': 53,
    '2024/6월 8일 한국 망친 사진': 52,
    '2023/12월 15일 일본 교복': 51,
    '2024/5월 4일 일본 야간 비눗방울': 49,
    '2024/12월 12일 일본 모지코': 49, // 오타 수정 반영: /000001 제거
    '2024/10월 18일 일본 텐진 코닥필름': 49,
    '2025/2월 7일 일본 나비욕조': 48,
    '2024/2월 23일 한국 야간 롱패딩': 48,
    '2024/9월 17일 한국 을지로 스냅': 46,
    '2024/9월 16일 한국 길거리 스냅': 46,
    '2024/2월 22일 한국 생일': 46,
    '2024/7월 6일 일본 모지코2': 45,
    '2025/5월 4일 한국 야간 보라돌이': 43,
    '2025/2월 6일 일본 코야노세': 43,
    '2024/5월 6일 일본 야간거리': 43,
    '2024/12월 31일 한국 생일컨셉': 43,
    '2023/12월 31일 한국 눈밭 필름카메라': 43,
    '2025/5월 3일 한국 홈스냅 청포도': 42,
    '2024/11월 8일 한국 욕실 블랙 웨딩': 42,
    '2023/12월 13일 일본 모지코': 42,
    '2024/9월 11일 한국 호리존': 41,
    '2024/7월 8일 일본 여친 스냅': 41,
    '2024/5월 3일 일본 후지엔': 40,
    '2024/8월 2일 일본 불꽃놀이/후보정': 39,
    '2024/10월 19일 일본 빨간 기모노': 39,
    '2023/12월 31일 한국 눈밭': 38,
    '2024/6월 7일 한국 피크닉': 36,
    '2024/4월 12일 한국 벗꽃': 35,
    '2025/5월 6일 한국 후지 스냅': 34,
    '2024/9월 14일 한국 원미상가_필름': 34,
    '2025/5월 4일 한국 밤바 산책': 32,
    '2025/5월 4일 한국 공원 산책': 32,
    '2025/3월 14일 일본 고쿠라 힙': 32,
    '2024/4월 13일 한국 온실-여신': 31,
    '2025/4월 30일 한국 을지로 네코': 30,
    '2025/3월 13일 일본 무인역': 30,
    '2024/4월 13일 한국 화가': 30,
    '2024/8월 4일 일본 블랙원피스': 29,
    '2024/12월 30일 한국 카페': 29,
    '2024/10월 17일 일본 텐진 스트리트': 29,
    '2023/12월 12일 일본 하카타 스트리트': 29,
    '2025/3월 17일 일본 텐진 스트리트': 28,
    '2024/6월 8일 한국 터널': 28,
    '2025/5월 5일 한국 홈스냅 오타쿠': 27,
    '2025/3월 22 한국 홈셀프': 27,
    '2024/7월 5일 일본 모지코': 26,
    '2024/4월 12일 한국 야간 동백': 26,
    '2024/12월 14일 일본 나르시스트': 26,
    '2025/4월 30일 한국 을지로 캘빈': 25,
    '2024/6월 9일 한국 산책': 25,
    '2024/10월 16 일본 오도공원 후지필름': 24,
    '2024/12월 13일 일본 크리스마스': 22,
    '2024/2월 11일 일본 네코 모지코': 21,
    '2024/2월 11일 일본 야간 블랙드레스': 20,
    '2024/10월 16일 일본 고스로리 할로윈': 20,
    '2024/5월 7일 일본 게임센터': 19,
    '2024/3월 17일 일본 고쿠라': 19,
    '2024/2월 22일한국 카페': 19,
    '2024/5월 2일 일본 동키 거리': 18,
    '2025/3월 17일 일본 고쿠라 야간': 17,
    '2024/5월 5일 일본 코이노보리': 17,
    '2024/4월 13일 한국 문래동': 16,
    '2024/10월 16일 일본 욕실': 15,
    '2024/5월 3일 일본 수국': 14,
    '2024/11월 8일 한국 메이드복': 14,
    '2024/10월 16일 일본 오도': 5
};

const { cleanReply } = require('./omoide');

async function callOpenAI(messages, modelParamFromCall = null, maxTokens = 400, temperature = 0.95) {
  const defaultModel = process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o';
  let finalModel = modelParamFromCall || defaultModel;
  try {
    const response = await openai.chat.completions.create({
      model: finalModel,
      messages,
      max_tokens: maxTokens,
      temperature,
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error(`[callOpenAI in concept.js] OpenAI API 호출 실패 (모델: ${finalModel}):`, error);
    return '지금 잠시 생각 중이야... 아저씨 조금만 기다려줄래? ㅠㅠ';
  }
}

function generateConceptPhotoUrl(folderName, targetIndex = null) {
  const photoCount = CONCEPT_FOLDERS[folderName];
  if (!photoCount) return null;
  const index = targetIndex ? targetIndex : Math.floor(Math.random() * photoCount) + 1;
  const fileName = String(index).padStart(6, '0') + '.jpg';
  const yearMatch = folderName.match(/^(202[3-5])(\/|$)/);
  const yearFolder = yearMatch ? yearMatch[1] : '';
  const actualFolder = yearFolder ? folderName.replace(`${yearFolder}/`, '') : folderName;
  return `${BASE_CONCEPT_URL}${encodeURIComponent(yearFolder)}/${encodeURIComponent(actualFolder)}/${fileName}`;
}

let lastConceptPhotoFolder = null;
let lastConceptPhotoIndex = 0;

async function getConceptPhotoReply(userMessage, saveLogFunc) {
  const lower = userMessage.toLowerCase();
  let selectedFolder = null;
  let folderDescription = '';
  let promptSuffix = '';

  const conceptKeywordMap = {
    '일본 홈스냅': '2024/5월 7일 일본 홈스냅', '홈스냅': '2024/5월 7일 일본 홈스냅', // '홈스냅' 단독은 가장 최근/대표적인 것으로 매핑
        '일본 결박': '2024/7월 8일 일본 결박', '결박': '2024/7월 8일 일본 결박',
        '일본 선물': '2023/12월 16일 일본 선물', '선물': '2023/12월 16일 일본 선물',
        '한국 셀프 촬영': '2024/4월 28일 한국 셀프 촬영', '셀프 촬영': '2024/4월 28일 한국 셀프 촬영',
        '옥상연리': '2024/9월 15일 한국 옥상연리',
        '일본 세미누드': '2025/2월 7일 일본 세미누드', '세미누드': '2025/2월 7일 일본 세미누드',
        '한국 홈셀프': '2024/12월 7일 한국 홈셀프',
        '플라스틱러브': '2023/12월 14일 일본 플라스틱러브',
        '지브리풍': '2024/5월 3일 일본 지브리풍',
        '한국 북해': '2024/6월 6일 한국 북해', '북해': '2024/6월 6일 한국 북해',
        '아이노시마': '2024/2월 7일 일본 아이노시마',
        '일본 필름': '2025/3월 일본 필름', // '필름' 단독보다는 '일본 필름'으로 구체화
        '모지코 모리룩 후보정': '2024/5월 5일 일본 모지코 모리룩 후보정',
        '모지코 모리룩': '2024/5월 5일 일본 모지코 모리룩',
        '한국 눈밭': '2025/1월 5일 한국 눈밭', // '눈밭' 단독보다는 '한국 눈밭'으로 구체화
        '일본 욕실': '2024/2월 7일 일본 욕실', // '욕실' 단독보다는 '일본 욕실'로 구체화
        '하카타 고래티셔츠': '2024/10월 17일 일본 하카타 고래티셔츠',
        '유카타 마츠리': '2024/8월 3일 일본 유카타 마츠리',
        '이화마을': '2025/4월 29일 한국 이화마을',
        '일본 욕조': '2024/7월 8일 일본 욕조', // '욕조' 단독보다는 '일본 욕조'로 구체화
        '우마시마': '2024/7월 6일 일본 우마시마',
        '가을 호수공원': '2024/11월 7일 한국 가을 호수공원',
        '망친 사진': '2024/6월 8일 한국 망친 사진',
        '일본 교복': '2023/12월 15일 일본 교복', // '교복' 단독보다는 '일본 교복'으로 구체화
        '야간 비눗방울': '2024/5월 4일 일본 야간 비눗방울',
        '일본 모지코': '2024/12월 12일 일본 모지코', // '모지코' 단독보다는 '일본 모지코'로 구체화
        '텐진 코닥필름': '2024/10월 18일 일본 텐진 코닥필름',
        '나비욕조': '2025/2월 7일 일본 나비욕조',
        '야간 롱패딩': '2024/2월 23일 한국 야간 롱패딩',
        '을지로 스냅': '2024/9월 17일 한국 을지로 스냅', '길거리 스냅': '2024/9월 16일 한국 길거리 스냅',
        '한국 생일': '2024/2월 22일 한국 생일', // '생일' 단독보다는 '한국 생일'로 구체화
        '모지코2': '2024/7월 6일 일본 모지코2',
        '야간 보라돌이': '2025/5월 4일 한국 야간 보라돌이', '코야노세': '2025/2월 6일 일본 코야노세',
        '야간거리': '2024/5월 6일 일본 야간거리', '생일컨셉': '2024/12월 31일 한국 생일컨셉',
        '눈밭 필름카메라': '2023/12월 31일 한국 눈밭 필름카메라',
        '홈스냅 청포도': '2025/5월 3일 한국 홈스냅 청포도',
        '욕실 블랙 웨딩': '2024/11월 8일 한국 욕실 블랙 웨딩',
        '일본 모지코 12/13': '2023/12월 13일 일본 모지코', // 날짜 포함 키워드 추가
        '호리존': '2024/9월 11일 한국 호리존',
        '여친 스냅': '2024/7월 8일 일본 여친 스냅',
        '후지엔': '2024/5월 3일 일본 후지엔',
        '불꽃놀이': '2024/8월 2일 일본 불꽃놀이/후보정',
        '빨간 기모노': '2024/10월 19일 일본 빨간 기모노', '피크닉': '2024/6월 7일 한국 피크닉',
        '벗꽃': '2024/4월 12일 한국 벗꽃',
        '후지 스냅': '2025/5월 6일 한국 후지 스냅',
        '원미상가_필름': '2024/9월 14일 한국 원미상가_필름', '밤바 산책': '2025/5월 4일 한국 밤바 산책',
        '공원 산책': '2025/5월 4일 한국 공원 산책', '고쿠라 힙': '2025/3월 14일 일본 고쿠라 힙',
        '온실-여신': '2024/4월 13일 한국 온실-여신', '을지로 네코': '2025/4월 30일 한국 을지로 네코',
        '무인역': '2025/3월 13일 일본 무인역', '화가': '2024/4월 13일 한국 화가',
        '블랙원피스': '2024/8월 4일 일본 블랙원피스', '카페': '2024/12월 30일 한국 카페',
        '일본 텐진 스트리트': '2024/10월 17일 일본 텐진 스트리트',
        '하카타 스트리트': '2023/12월 12일 일본 하카타 스트리트',
        '홈스냅 오타쿠': '2025/5월 5일 한국 홈스냅 오타쿠',
        '한국 홈셀프 (3월 22일)': '2025/3월 22 한국 홈셀프',
        '야간 동백': '2024/4월 12일 한국 야간 동백',
        '나르시스트': '2024/12월 14일 일본 나르시스트', '을지로 캘빈': '2025/4월 30일 한국 을지로 캘빈',
        '산책': '2024/6월 9일 한국 산책',
        '오도공원 후지필름': '2024/10월 16 일본 오도공원 후지필름',
        '크리스마스': '2024/12월 13일 일본 크리스마스',
        '네코 모지코': '2024/2월 11일 일본 네코 모지코',
        '야간 블랙드레스': '2024/2월 11일 일본 야간 블랙드레스',
        '고스로리 할로윈': '2024/10월 16일 일본 고스로리 할로윈',
        '게임센터': '2024/5월 7일 일본 게임센터',
        '일본 고쿠라 (3월 17일)': '2024/3월 17일 일본 고쿠라',
        '동키 거리': '2024/5월 2일 일본 동키 거리',
        '고쿠라 야간': '2025/3월 17일 일본 고쿠라 야간',
        '코이노보리': '2024/5월 5일 일본 코이노보리', '문래동': '2024/4월 13일 한국 문래동',
        '수국': '2024/5월 3일 일본 수국',
        '메이드복': '2024/11월 8일 한국 메이드복',
        '오도': '2024/10월 16일 일본 오도'
  };

  if (lastConceptPhotoFolder && (lower.includes('다른 것도') || lower.includes('다음 사진'))) {
    selectedFolder = lastConceptPhotoFolder;
    const photoCount = CONCEPT_FOLDERS[selectedFolder] || 1;
    lastConceptPhotoIndex = (lastConceptPhotoIndex % photoCount) + 1;
    folderDescription = `같은 폴더 (${selectedFolder})의 다른 사진`;
    promptSuffix = `이전 요청과 같은 '${selectedFolder}' 컨셉 폴더의 다른 사진이야.`;
  } else {
    for (const keyword in conceptKeywordMap) {
      if (lower.includes(keyword)) {
        selectedFolder = conceptKeywordMap[keyword];
        break;
      }
    }
    if (!selectedFolder && (lower.includes('컨셉사진') || lower.includes('컨셉 사진')))
      selectedFolder = Object.keys(CONCEPT_FOLDERS)[Math.floor(Math.random() * Object.keys(CONCEPT_FOLDERS).length)];
    else if (!selectedFolder) return null;

    folderDescription = `아저씨의 죽은 연인 무쿠의 ${selectedFolder} 컨셉 사진`;
    promptSuffix = `이 사진은 아저씨가 직접 촬영한 무쿠 언니의 ${selectedFolder} 컨셉 사진이야.`;
    lastConceptPhotoIndex = 0;
  }

  lastConceptPhotoFolder = selectedFolder;
  const photoUrl = generateConceptPhotoUrl(selectedFolder, lastConceptPhotoIndex > 0 ? lastConceptPhotoIndex : null);
  if (!photoUrl || !CONCEPT_FOLDERS[selectedFolder]) return { type: 'text', comment: '아저씨... 해당하는 컨셉 사진을 못 찾겠어 ㅠㅠ' };

  const messages = [
    { role: 'system', content: `너는 아저씨의 귀여운 여자친구 예진이야. ... ${promptSuffix}` },
    { role: 'user', content: `이 ${folderDescription} 사진에 대해 예진이 말투로 이야기해줘.` },
  ];

  try {
    const rawComment = await callOpenAI(messages, 'gpt-4o', 150, 1.0);
    const comment = cleanReply(rawComment);
    saveLogFunc('예진이', `(사진 보냄) ${comment}`);
    return { type: 'photo', url: photoUrl, caption: comment };
  } catch (e) {
    console.error('[concept.js] 실패:', e);a
    return { type: 'text', comment: '예진이 잠깐 멍때렸어... 다시 해볼게 ㅠㅠ' };
  }
}

module.exports = { getConceptPhotoReply };
