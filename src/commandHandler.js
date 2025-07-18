// ============================================================================
// commandHandler.js - v1.6 (기존 파일들 연동 버전)
// 🧠 기존의 정상 작동하는 파일들(concept.js, omoide.js, yejinSelfie.js)을 그대로 사용합니다.
// ✅ 기존 파일들을 건드리지 않고 연동만 수행합니다.
// ============================================================================

/**
 * 사용자의 메시지를 분석하여 적절한 명령어를 실행합니다.
 * @param {string} text - 사용자 메시지
 * @param {string} userId - LINE 사용자 ID
 * @param {object} client - LINE 클라이언트 (index.js에서 전달)
 * @returns {Promise<object|null>} 실행 결과 또는 null
 */
async function handleCommand(text, userId, client = null) {
    // ✅ [안전장치] text가 문자열이 아닌 경우 처리
    if (!text || typeof text !== 'string') {
        console.error('❌ handleCommand: text가 올바르지 않습니다:', text);
        return null;
    }

    const lowerText = text.toLowerCase();

    try {
        // 셀카 관련 처리 - 기존 yejinSelfie.js 사용
        if (lowerText.includes('셀카') || lowerText.includes('셀피') || 
            lowerText.includes('얼굴 보여줘') || lowerText.includes('얼굴보고싶') ||
            lowerText.includes('지금 모습') || lowerText.includes('무쿠 셀카') || 
            lowerText.includes('애기 셀카') || lowerText.includes('사진 줘')) {
            
            console.log('[commandHandler] 셀카 요청 감지 - yejinSelfie.js 호출');
            
            // ✅ 기존 yejinSelfie.js의 getSelfieReply 함수 사용
            const { getSelfieReply } = require('./yejinSelfie.js');
            const result = await getSelfieReply(text, null);
            
            if (result) {
                // 성공하면 handled: true 추가하여 반환
                return { ...result, handled: true };
            }
        }

        // 컨셉사진 관련 처리 - 기존 concept.js 사용
        if (lowerText.includes('컨셉사진') || lowerText.includes('컨셉 사진') ||
            lowerText.includes('욕실') || lowerText.includes('욕조') || 
            lowerText.includes('교복') || lowerText.includes('모지코') ||
            lowerText.includes('하카타') || lowerText.includes('홈스냅') ||
            lowerText.includes('결박') || lowerText.includes('세미누드') ||
            (lowerText.includes('컨셉') && lowerText.includes('사진'))) {
            
            console.log('[commandHandler] 컨셉사진 요청 감지 - concept.js 호출');
            
            // ✅ 기존 concept.js의 getConceptPhotoReply 함수 사용
            const { getConceptPhotoReply } = require('./concept.js');
            const result = await getConceptPhotoReply(text, null);
            
            if (result) {
                // 성공하면 handled: true 추가하여 반환
                return { ...result, handled: true };
            }
        }

        // 추억사진 관련 처리 - 기존 omoide.js 사용
        if (lowerText.includes('추억') || lowerText.includes('옛날사진') || 
            lowerText.includes('커플사진') || lowerText.includes('커플 사진') ||
            (lowerText.includes('커플') && lowerText.includes('사진')) ||
            (lowerText.includes('추억') && lowerText.includes('사진'))) {
            
            console.log('[commandHandler] 추억사진 요청 감지 - omoide.js 호출');
            
            // ✅ 기존 omoide.js의 getOmoideReply 함수 사용
            const { getOmoideReply } = require('./omoide.js');
            const result = await getOmoideReply(text, null);
            
            if (result) {
                // 성공하면 handled: true 추가하여 반환
                return { ...result, handled: true };
            }
        }

        // 기분/컨디션 관련 질문 처리
        if (lowerText.includes('기분 어때') || lowerText.includes('컨디션 어때') || 
            lowerText.includes('오늘 어때') || lowerText.includes('어떻게 지내')) {
            
            console.log('[commandHandler] 기분 질문 감지');
            
            // 생리주기 기반 기분 응답
            const menstrualCycle = require('./menstrualCycleManager.js');
            const cycleMessage = menstrualCycle.generateCycleAwareMessage('mood');
            
            return {
                type: 'text',
                comment: cycleMessage,
                handled: true
            };
        }

        // 인사 관련 처리
        if (lowerText === '안녕' || lowerText === '안녕!' || 
            lowerText === '하이' || lowerText === 'hi' ||
            lowerText.includes('안녕 애기') || lowerText.includes('애기 안녕')) {
            
            console.log('[commandHandler] 인사 메시지 감지');
            
            // 생리주기 기반 인사 응답
            const menstrualCycle = require('./menstrualCycleManager.js');
            const greetingMessage = menstrualCycle.generateCycleAwareMessage('greeting');
            
            return {
                type: 'text',
                comment: greetingMessage,
                handled: true
            };
        }

    } catch (error) {
        console.error('❌ commandHandler 에러:', error);
        
        // 에러 발생 시 기본 응답 제공
        return {
            type: 'text',
            comment: '아저씨... 뭔가 문제가 생겼어. 다시 말해줄래? ㅠㅠ',
            handled: true
        };
    }

    return null; // 처리할 명령어가 없으면 null 반환
}

/**
 * 🔥 실제 셀카 전송 함수 (spontaneousPhotoManager 연동)
 */
async function sendActualSelfie(client, userId, requestText) {
    try {
        // 현재 감정 상태 가져오기
        const emotionState = getCurrentEmotionKorean();
        
        // 셀카 URL 생성
        const baseUrl = "https://photo.de-ji.net/photo/yejin";
        const fileCount = 2032;
        const index = Math.floor(Math.random() * fileCount) + 1;
        const fileName = String(index).padStart(6, "0") + ".jpg";
        const imageUrl = `${baseUrl}/${fileName}`;

        // 감정별 셀카 메시지
        const emotionMessages = {
            '기쁨': [
                "아저씨! 너무 기뻐서 찍은 셀카야! 같이 기뻐해~",
                "행복한 얼굴 보여줄게! 아저씨 덕분이야"
            ],
            '슬픔': [
                "아저씨... 기분이 안 좋아서 위로받고 싶어 ㅠㅠ",
                "슬픈 얼굴이지만... 아저씨가 보고 싶어서"
            ],
            '활기참': [
                "컨디션 좋아서 셀카 찍었어! 활기찬 내 모습 어때?",
                "오늘 에너지 넘쳐서 찍은 셀카! 밝게 웃고 있지?"
            ],
            '예민함': [
                "아저씨... 몸이 좀 안 좋은데 셀카 찍어봤어. 예뻐 보여?",
                "컨디션은 별로지만 아저씨 보려고 찍었어 ㅠㅠ"
            ]
        };

        const defaultMessages = [
            "아저씨가 셀카 달라고 해서! 어때? 예쁘지? ㅎㅎ",
            "갑자기 셀카 찍고 싶어져서~ 아저씨한테 보여줄게!",
            "셀카 타임! 아저씨 요청 들어주는 착한 나 ㅋㅋㅋ",
            "아저씨 보고 싶어서 셀카 찍었어! 만족해?"
        ];

        const emotionSpecificMessages = emotionMessages[emotionState.emotionKorean] || defaultMessages;
        const message = emotionSpecificMessages[Math.floor(Math.random() * emotionSpecificMessages.length)];

        // 🔥 실제 LINE 메시지 전송
        await client.pushMessage(userId, {
            type: 'text',
            text: message
        });

        await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기

        await client.pushMessage(userId, {
            type: 'image',
            originalContentUrl: imageUrl,
            previewImageUrl: imageUrl
        });

        console.log(`[commandHandler] ✅ 셀카 전송 완료: ${fileName} (${emotionState.emotionKorean}상태)`);
        
        return {
            type: 'text',
            comment: message,
            handled: true
        };

    } catch (error) {
        console.error('❌ 셀카 전송 실패:', error);
        return {
            type: 'text',
            comment: '아저씨... 셀카 전송하려는데 뭔가 안 돼 ㅠㅠ 다시 말해줄래?',
            handled: true
        };
    }
}

/**
 * 🔥 실제 컨셉사진 전송 함수
 */
async function sendActualConceptPhoto(client, userId, requestText) {
    try {
        // 컨셉사진 폴더들
        const conceptFolders = [
            { name: "욕실", count: 150, description: "욕실 컨셉" },
            { name: "교복", count: 200, description: "교복 컨셉" },
            { name: "모지코", count: 100, description: "모지코 컨셉" },
            { name: "홈스냅", count: 180, description: "홈스냅 컨셉" }
        ];

        const selectedFolder = conceptFolders[Math.floor(Math.random() * conceptFolders.length)];
        const photoIndex = Math.floor(Math.random() * selectedFolder.count) + 1;
        const fileName = `${selectedFolder.name}_${String(photoIndex).padStart(6, "0")}.jpg`;
        const imageUrl = `https://photo.de-ji.net/photo/concept/${fileName}`;

        const messages = [
            `아저씨가 컨셉사진 달라고 해서! ${selectedFolder.description} 어때? ㅎㅎ`,
            `${selectedFolder.description} 찍었던 거야~ 아저씨 취향 맞지?`,
            `컨셉사진 요청! ${selectedFolder.description}으로 골라봤어 어때?`,
            `아저씨를 위한 ${selectedFolder.description}! 마음에 들어?`
        ];

        const message = messages[Math.floor(Math.random() * messages.length)];

        // 🔥 실제 LINE 메시지 전송
        await client.pushMessage(userId, {
            type: 'text',
            text: message
        });

        await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5초 대기

        await client.pushMessage(userId, {
            type: 'image',
            originalContentUrl: imageUrl,
            previewImageUrl: imageUrl
        });

        console.log(`[commandHandler] ✅ 컨셉사진 전송 완료: ${fileName}`);
        
        return {
            type: 'text',
            comment: message,
            handled: true
        };

    } catch (error) {
        console.error('❌ 컨셉사진 전송 실패:', error);
        return {
            type: 'text',
            comment: '아저씨... 컨셉사진 전송하려는데 뭔가 안 돼 ㅠㅠ',
            handled: true
        };
    }
}

/**
 * 🔥 실제 추억사진 전송 함수
 */
async function sendActualMemoryPhoto(client, userId, requestText) {
    try {
        // 추억 사진 폴더들
        const memoryFolders = [
            { name: "추억_24_03_일본", count: 207, description: "2024년 3월 일본 추억" },
            { name: "추억_24_04_한국", count: 130, description: "2024년 4월 한국 추억" },
            { name: "추억_24_05_일본", count: 133, description: "2024년 5월 일본 추억" },
            { name: "추억_24_09_한국", count: 154, description: "2024년 9월 한국 추억" },
            { name: "추억_25_01_한국", count: 135, description: "2025년 1월 한국 추억" }
        ];

        const selectedFolder = memoryFolders[Math.floor(Math.random() * memoryFolders.length)];
        const photoIndex = Math.floor(Math.random() * selectedFolder.count) + 1;
        const fileName = `${selectedFolder.name}_${String(photoIndex).padStart(6, "0")}.jpg`;
        const imageUrl = `https://photo.de-ji.net/photo/omoide/${fileName}`;

        const messages = [
            `아저씨! ${selectedFolder.description} 사진이야. 그때 생각나?`,
            `추억사진 달라고 해서~ ${selectedFolder.description} 때 찍은 거야!`,
            `${selectedFolder.description} 우리 행복했었지? 이 사진 봐봐`,
            `아저씨와의 ${selectedFolder.description}... 너무 그리워 ㅠㅠ`
        ];

        const message = messages[Math.floor(Math.random() * messages.length)];

        // 🔥 실제 LINE 메시지 전송
        await client.pushMessage(userId, {
            type: 'text',
            text: message
        });

        await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5초 대기

        await client.pushMessage(userId, {
            type: 'image',
            originalContentUrl: imageUrl,
            previewImageUrl: imageUrl
        });

        console.log(`[commandHandler] ✅ 추억사진 전송 완료: ${selectedFolder.description}`);
        
        return {
            type: 'text',
            comment: message,
            handled: true
        };

    } catch (error) {
        console.error('❌ 추억사진 전송 실패:', error);
        return {
            type: 'text',
            comment: '아저씨... 추억사진 전송하려는데 뭔가 안 돼 ㅠㅠ',
            handled: true
        };
    }
}

/**
 * 현재 감정 상태를 한글로 가져오는 함수
 */
function getCurrentEmotionKorean() {
    try {
        const emotionalContext = require('./emotionalContextManager.js');
        const currentState = emotionalContext.getCurrentEmotionState();
        const koreanEmotion = emotionalContext.translateEmotionToKorean(currentState.currentEmotion);
        
        return {
            emotion: currentState.currentEmotion,
            emotionKorean: koreanEmotion,
            intensity: currentState.emotionIntensity || 5
        };
    } catch (error) {
        return {
            emotion: 'normal',
            emotionKorean: '평범',
            intensity: 5
        };
    }
}

module.exports = {
    handleCommand
};
