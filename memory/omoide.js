// memory/omoide.js - v2.13 (랜덤 추억 사진 기능 추가)

const fs = require("fs");
const path = require("path");
const moment = require('moment-timezone'); // 날짜 파싱을 위해 moment 추가

// 아저씨가 제공해주신 추억/커플 사진 폴더별 사진 개수 데이터
const OMODE_FOLDERS = {
    "추억_24_03_일본": 207,
    "추억_24_03_일본_스냅": 190,
    "추억_24_03_일본_후지": 226,
    "추억_24_04": 31,
    "추억_24_04_출사_봄_데이트_일본": 90,
    "추억_24_04_한국": 130,
    "추억_24_05_일본": 133,
    "추억_24_05_일본_후지": 135,
    "추억_24_06_한국": 146,
    "추억_24_07_일본": 62,
    "추억_24_08월_일본": 48,
    "추억_24_09_한국": 154,
    "추억_24_10_일본": 75,
    "추억_24_11_한국": 121,
    "추억_24_12_일본": 50,
    "추억_25_01_한국": 135,
    "추억_25_02_일본": 24,
    "추억_25_03_일본": 66,
    "추억_25_03_일본_코닥_필름": 28,
    "추억_인생네컷": 15,
    "흑심": 13,
    // "추억_무쿠_셀카"와 "추억_빠계_셀카"는 yejinSelfie.js에서 처리하므로 여기서 제외합니다.
};

// 추억/커플 사진이 저장된 웹 서버의 기본 URL (HTTPS 필수)
const BASE_OMODE_URL = 'https://photo.de-ji.net/photo/omoide';
const BASE_COUPLE_URL = 'https://photo.de-ji.net/photo/couple'; // 커플 사진 URL은 유지

/**
 * OMODE_FOLDERS의 키에 매핑되는 키워드 맵 (더 긴 키워드가 먼저 매칭되도록 내림차순 정렬)
 * 사용자 입력 키워드와 OMODE_FOLDERS의 키를 연결합니다.
 */
const omoideKeywordMap = {
    '추억 24년 4월 출사 봄 데이트 일본': '추억_24_04_출사_봄_데이트_일본',
    '추억 25년 3월 일본 코닥 필름': '추억_25_03_일본_코닥_필름',
    '추억 24년 3월 일본 스냅': '추억_24_03_일본_스냅',
    '추억 24년 3월 일본 후지': '추억_24_03_일본_후지',
    '추억 24년 5월 일본 후지': '추억_24_05_일본_후지',
    '추억 24년 8월 일본': '추억_24_08월_일본',
    '추억 24년 3월 일본': '추억_24_03_일본',
    '추억 24년 5월 일본': '추억_24_05_일본',
    '추억 24년 6월 한국': '추억_24_06_한국',
    '추억 24년 7월 일본': '추억_24_07_일본',
    '추억 24년 9월 한국': '추억_24_09_한국',
    '추억 24년 10월 일본': '추억_24_10_일본',
    '추억 24년 11월 한국': '추억_24_11_한국',
    '추억 24년 12월 일본': '추억_24_12_일본',
    '추억 25년 1월 한국': '추억_25_01_한국',
    '추억 25년 2월 일본': '추억_25_02_일본',
    '추억 25년 3월 일본': '추억_25_03_일본',
    '추억 24년 4월 한국': '추억_24_04_한국',
    '추억 24년 4월': '추억_24_04',
    '인생네컷': '추억_인생네컷',
    '흑심': '흑심',
};

// 키워드 맵을 길이 기준으로 내림차순 정렬 (더 구체적인 키워드 우선)
const sortedOmoideKeywords = Object.keys(omoideKeywordMap).sort((a, b) => b.length - a.length);

/**
 * URL 인코딩을 적용하는 함수
 * 이중 인코딩을 방지하기 위해 각 세그먼트를 먼저 디코딩한 후 다시 인코딩합니다.
 */
function encodeImageUrl(url) {
    try {
        const parsed = new URL(url); // URL 객체로 파싱
        // pathname을 '/' 기준으로 분리하고, 각 세그먼트를 먼저 디코딩한 후 다시 인코딩
        // 이렇게 하면 이미 인코딩된 부분은 디코딩되었다가 다시 인코딩되어 이중 인코딩을 방지합니다.
        parsed.pathname = parsed.pathname
            .split('/')
            .map(segment => {
                // 비어있지 않은 세그먼트만 처리 (루트 '/'나 연속된 슬래시 처리)
                if (segment) {
                    try {
                        // 이미 인코딩된 문자열을 한번 디코딩 (안전하게)
                        // 그 후 다시 인코딩 (URL에 안전한 형태로)
                        return encodeURIComponent(decodeURIComponent(segment));
                    } catch (e) {
                        // decodeURIComponent 오류 발생 시 (예: 잘못된 % 인코딩)
                        // 해당 세그먼트는 그대로 인코딩을 시도하여 안전하게 처리
                        console.warn(`[omoide:encodeImageUrl] decodeURIComponent 실패: ${segment}, 재인코딩 시도`);
                        return encodeURIComponent(segment);
                    }
                }
                return segment; // 빈 세그먼트는 그대로 유지
            })
            .join('/');
        
        const encodedUrl = parsed.toString();
        console.log(`[omoide:encodeImageUrl] 원본: ${url}`);
        console.log(`[omoide:encodeImageUrl] 인코딩: ${encodedUrl}`);
        
        return encodedUrl;
    } catch (error) {
        console.error(`[omoide:encodeImageUrl] URL 인코딩 실패: ${url}`, error);
        return url; // 실패 시 원본 URL 반환
    }
}

// 랜덤 추억 폴더를 선택하는 함수 추가
function getRandomOmoideFolder() {
    // 셀카 폴더 (yejinSelfie.js에서 처리) 및 단일 파일은 제외
    const folderNames = Object.keys(OMODE_FOLDERS).filter(f => 
        !f.endsWith('.jpg') && 
        f !== "추억_무쿠_셀카" && 
        f !== "추억_빠계_셀카"
    );
    if (folderNames.length === 0) {
        console.warn("[getRandomOmoideFolder] 랜덤으로 선택할 추억 폴더가 없습니다.");
        return null;
    }
    return folderNames[Math.floor(Math.random() * folderNames.length)];
}


async function getOmoideReply(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc) {
  const lowerMsg = userMessage.trim().toLowerCase();
  let selectedFolder = null;
  let folderDescription = '';
  let baseUrl;

  // 1. 특정 키워드에 매핑되는 OMODE_FOLDERS 항목 찾기 (구체적인 키워드 우선)
  let isOmoideKeywordRequest = false;
  for (const keyword of sortedOmoideKeywords) {
      if (lowerMsg.includes(keyword.toLowerCase())) {
          selectedFolder = omoideKeywordMap[keyword];
          isOmoideKeywordRequest = true; // 키워드 매칭이 되었음을 표시
          console.log(`[omoide] 키워드 "${keyword}" 매칭됨 → 폴더: ${selectedFolder}`);
          break;
      }
  }

  // 2. 일반 '추억' 또는 '커플' 요청 처리 (명확한 키워드 매칭이 없을 경우)
  if (!selectedFolder) { // 특정 키워드로 폴더가 선택되지 않은 경우
      if (lowerMsg.includes("추억") || lowerMsg.includes("기억") ||
          lowerMsg.includes('옛날사진') || lowerMsg.includes('옛날 사진') ||
          lowerMsg.includes('예전사진') || lowerMsg.includes('예전 사진') ||
          lowerMsg.includes('일본 사진') || lowerMsg.includes('한국 사진') ||
          lowerMsg.includes('후지 사진') || lowerMsg.includes('인생네컷') || 
          lowerMsg.includes('출사') || lowerMsg.includes('필름카메라') ||
          lowerMsg.includes('네가 찍은걸 줘') || lowerMsg.includes('네가 찍은 걸 줘') ||
          lowerMsg.includes('네가 찍은 사진') || lowerMsg.includes('너가 찍은 사진') ||
          lowerMsg.includes('예진이가 찍은') || lowerMsg.includes('직접 찍은') ||
          lowerMsg.includes('추억사진줘') || lowerMsg.includes('추억 사진 줘')) {

          // '추억' 관련 일반 요청일 경우 랜덤 폴더 선택
          selectedFolder = getRandomOmoideFolder(); 
          if (selectedFolder) {
              isOmoideKeywordRequest = true; // 일반 추억 요청도 처리되었음을 표시
              console.log(`[omoide] 일반 '추억' 요청 처리됨 → 랜덤 폴더: ${selectedFolder}`);
          } else {
              console.log(`[omoide] 랜덤으로 선택할 추억 폴더가 없음. null 반환.`);
              return null; // 매칭되는 추억 폴더가 없는 경우
          }
      } else if (lowerMsg.includes("커플")) {
          baseUrl = BASE_COUPLE_URL;
          const fileCount = 500; // TODO: 실제 커플사진 폴더의 개수로 변경 필요 (임시 설정)
          const index = Math.floor(Math.random() * fileCount) + 1;
          const fileName = String(index).padStart(6, "0") + ".jpg";
          const rawImageUrl = `${baseUrl}/${fileName}`;
          const encodedImageUrl = encodeImageUrl(rawImageUrl); // 인코딩 적용
          const text = "아저씨랑 나랑 같이 찍은 커플 사진이야! 예쁘지? 우리 추억을 담은 사진이야.";
          return { type: 'image', originalContentUrl: encodedImageUrl, previewImageUrl: encodedImageUrl, altText: text, caption: text };
      } else {
          return null; // 어떤 키워드도 매칭되지 않음
      }
  }

  // selectedFolder가 결정되지 않았다면 (즉, 추억/커플 관련 요청이 아니라면) null 반환
  if (!selectedFolder) {
      console.log(`[omoide] 최종적으로 선택된 폴더 없음. null 반환.`);
      return null;
  }


  // selectedFolder가 특정 폴더 키인 경우
  const fileCount = OMODE_FOLDERS[selectedFolder];

  if (fileCount === undefined || fileCount <= 0) {
      console.warn(`[omoide] 폴더를 찾을 수 없거나 사진이 없습니다: ${selectedFolder}`);
      return null;
  }

  let indexToUse = Math.floor(Math.random() * fileCount) + 1; // 000001부터 시작하도록 +1
  const fileName = `${selectedFolder}_${String(indexToUse).padStart(6, "0")}.jpg`;

  baseUrl = BASE_OMODE_URL; // 추억 관련 요청은 모두 BASE_OMODE_URL 사용

  const rawImageUrl = `${baseUrl}/${fileName}`;
  const encodedImageUrl = encodeImageUrl(rawImageUrl); // 여기가 중요! 인코딩 적용

  // folderDescription 생성 (선택된 폴더 이름 파싱)
  // 예: "추억_24_03_일본_스냅" -> "아저씨와 나의 추억 24년 3월 일본 (스냅) 사진"
  const parts = selectedFolder.split('_');
  let descriptionParts = [];
  let isOmoideCategory = false; // '추억' 카테고리인지 확인하는 플래그
  if (parts[0] === '추억') {
      isOmoideCategory = true;
      descriptionParts.push('아저씨와 나의 추억');
  } else if (selectedFolder === '흑심') {
      folderDescription = "아저씨의 흑심이 담긴 나(예진이)의 사진";
      // 흑심은 일반적인 파싱 대신 고정 설명 사용
  }


  if (isOmoideCategory) {
      // 연도 (예: 24 -> 2024년)
      if (parts[1] && parts[1].match(/^\d{2}$/)) {
          descriptionParts.push(`20${parts[1]}년`);
      }
      // 월 (예: 03 -> 3월, 08월 -> 8월)
      if (parts[2] && parts[2].match(/^\d{2}(월)?$/)) {
          descriptionParts.push(`${parseInt(parts[2])}월`);
      }
      // 세부 장소/컨셉 (나머지 파트)
      if (parts.length > 3) {
          let subCategory = parts.slice(3).join(' ');
          descriptionParts.push(`(${subCategory})`);
      } else if (parts.length === 3 && (parts[2].includes('일본') || parts[2].includes('한국'))) {
          descriptionParts.push(parts[2]); // 예: 추억_24_03_일본
      }
      folderDescription = descriptionParts.filter(Boolean).join(' ') + ' 사진';
  }


  // GPT 프롬프트 구성
  const prompt = `
아저씨! 이건 ${folderDescription}이야. 나 이 사진 보니까 아저씨랑 같이 있었던 그때 생각나서 괜히 마음이 찡해졌어.
이 사진 보여주면서 하고 싶은 말 한두 문장만 예진이 말투로 만들어줘. 너무 포멀하면 안 돼.
반말로, 애교 섞인 말투로, 감정 가득 담아서 짧게 얘기해줘. 아저씨를 '아저씨'라고 부르고, 나는 '나'라고 해줘.
`;
  const messages = [{ role: 'system', content: prompt }];
  const rawReply = await callOpenAIFunc(messages, 'gpt-4o', 150, 1.0);
  const cleanedReply = cleanReplyFunc(rawReply);
  return { type: 'image', originalContentUrl: encodedImageUrl, previewImageUrl: encodedImageUrl, altText: cleanedReply, caption: cleanedReply };
}

module.exports = {
  getOmoideReply
};
