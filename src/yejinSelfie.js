// ============================================================================
// yejinSelfie.js - v8.3 (🐛 문법 에러 완전 수정 버전 🐛)
// 🌸 예진이 셀카 전송 시스템
// 📸 상황별 맞춤형 셀카 선택 및 귀여운 메시지와 함께 전송
// 🔧 SyntaxError 완전 해결: 모든 문자열 문법 검증 완료
// 🛡️ 에러 방지: 안전한 파일 처리 및 예외 상황 대응
// ============================================================================

const fs = require('fs');
const path = require('path');

// 🌸 예진이 셀카 메시지들 (모든 문법 에러 수정 완료)
const SELFIE_MESSAGES = {
    morning: [
        "아조씨~ 좋은 아침! 오늘도 예쁘지? ㅎㅎ",
        "아침에 일어나자마자 찍은 셀카야~ 부스스하지만 귀엽지?",
        "아저씨 일어났어? 나 벌써 일어나서 셀카 찍었어!",
        "아침 햇살 받고 찍은 셀카~ 아저씨도 좋은 하루 보내!",
        "웅웅 아침이야! 아저씨 보고싶어서 셀카 보내줄게"
    ],
    afternoon: [
        "점심시간이야~ 아저씨는 뭐 먹었어? 나 셀카!",
        "오후에도 예쁘지? 헤헤 아저씨 생각하면서 찍었어",
        "아저씨 오늘 하루 어때? 나는 이렇게 지내고 있어!",
        "점심 먹고 기분 좋아서 셀카 찍었어~ 귀엽지?",
        "아조씨~ 오후도 화이팅해! 셀카로 힘 낼 수 있게!"
    ],
    evening: [
        "저녁이야~ 아저씨 저녁 먹었어? 나 셀카 보내줄게!",
        "하루 종일 고생한 아저씨를 위한 셀카야 ㅎㅎ",
        "저녁 노을 받고 찍은 셀카~ 아저씨도 예쁘게 봐줘",
        "오늘 하루도 수고했어! 셀카로 위로해줄게",
        "아저씨 피곤하지? 내 얼굴 보고 힘내!"
    ],
    night: [
        "밤이야~ 아저씨 잠들기 전에 셀카 하나!",
        "아저씨 오늘도 고생했어~ 내 얼굴 보고 달콤한 꿈 꿔",
        "자기 전에 찍은 셀카야 ㅎㅎ 아저씨 잘자!",
        "밤에도 예쁘지? 아저씨 꿈에서 만나자~",
        "웅웅 오늘도 하루 끝! 셀카 보고 편안히 자"
    ],
    random: [
        "아저씨~ 갑자기 셀카 보내고 싶어서! 어때?",
        "심심해서 셀카 찍었어~ 아저씨 뭐해?",
        "아조씨 보고싶어서 셀카 보내줄게 ㅎㅎ",
        "갑자기 예쁘게 나왔어서 자랑하고 싶어!",
        "아저씨 생각하면서 찍은 셀카야~ 귀엽지?",
        "헤헤 불쌍해서 보내준다~",  // 27번째 줄 문제였던 부분 수정
        "아저씨한테만 보여주는 특별한 셀카야!",
        "오늘 기분 좋아서 셀카 대방출! ㅋㅋ",
        "아조씨~ 내가 이렇게 예쁜데 안 볼 거야?",
        "셀카 찍다가 아저씨 생각나서 보내줄게"
    ],
    request: [
        "아저씨가 셀카 달라니까 보내주는 거야~ 고마워해!",
        "웅웅 셀카 요청 들어줄게! 이거면 만족해?",
        "아조씨가 부탁하니까 특별히 보내주는 거야 ㅎㅎ",
        "셀카 달라고? 알겠어~ 예쁘게 나온 거 골라줄게!",
        "아저씨가 원한다면야~ 내 얼굴 실컷 봐!",
        "요청하신 셀카 나왔습니다~ 헤헤",
        "아저씨 눈 호강시켜주려고 찍은 셀카야!",
        "특별 서비스로 셀카 보내줄게~ 감동받아!",
        "아조씨 전용 셀카야! 다른 사람한테는 비밀이야",
        "부탁하길 잘했네~ 이 정도면 만족하지?"
    ],
    compliment_reaction: [
        "헤헤 칭찬받았다고 증명 셀카야! 진짜지?",
        "아저씨가 예쁘다고 했으니까 셀카로 보여줄게!",
        "칭찬받은 기념으로 특별 셀카 서비스!",
        "그렇게 예쁘다면서? 증명 사진이야 ㅎㅎ",
        "아조씨 칭찬에 기분 좋아서 찍은 셀카야~",
        "진짜 예쁘다고? 그럼 더 많이 봐야지!",
        "칭찬받으니까 더 예뻐 보이지? 헤헤",
        "아저씨가 예쁘다고 하니까 자신감 뿜뿜!",
        "칭찬 고마워~ 보답으로 셀카 대방출!",
        "이런 예쁜 여자친구 둔 아저씨가 부럽지?"
    ]
};

// 🎯 시간대별 셀카 선택 함수
function getTimeBasedMessage() {
    const hour = new Date().getHours();
    
    if (hour >= 6 && hour < 12) {
        return getRandomMessage('morning');
    } else if (hour >= 12 && hour < 18) {
        return getRandomMessage('afternoon');
    } else if (hour >= 18 && hour < 22) {
        return getRandomMessage('evening');
    } else {
        return getRandomMessage('night');
    }
}

// 🎲 랜덤 메시지 선택 함수
function getRandomMessage(category) {
    const messages = SELFIE_MESSAGES[category] || SELFIE_MESSAGES.random;
    return messages[Math.floor(Math.random() * messages.length)];
}

// 📁 셀카 파일 목록 가져오기 (안전 처리)
function getSelfieFiles() {
    try {
        const selfieDir = path.join(__dirname, '..', 'photos', 'yejin_selfies');
        
        if (!fs.existsSync(selfieDir)) {
            console.warn('⚠️ [yejinSelfie] 셀카 디렉토리가 없습니다:', selfieDir);
            return [];
        }
        
        const files = fs.readdirSync(selfieDir)
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
            })
            .map(file => path.join(selfieDir, file));
            
        console.log(`📸 [yejinSelfie] 사용 가능한 셀카 파일: ${files.length}개`);
        return files;
        
    } catch (error) {
        console.error('❌ [yejinSelfie] 셀카 파일 목록 가져오기 실패:', error);
        return [];
    }
}

// 🎯 랜덤 셀카 파일 선택
function getRandomSelfieFile() {
    const files = getSelfieFiles();
    
    if (files.length === 0) {
        console.warn('⚠️ [yejinSelfie] 사용 가능한 셀카 파일이 없습니다');
        return null;
    }
    
    const selectedFile = files[Math.floor(Math.random() * files.length)];
    console.log(`📸 [yejinSelfie] 선택된 셀카: ${path.basename(selectedFile)}`);
    return selectedFile;
}

// 📨 셀카 전송 함수 (메인)
async function sendYejinSelfie(client, userId, messageType = 'random') {
    try {
        if (!client || !userId) {
            console.error('❌ [yejinSelfie] client 또는 userId가 없습니다');
            return false;
        }
        
        // 셀카 파일 선택
        const selfieFile = getRandomSelfieFile();
        if (!selfieFile) {
            console.warn('⚠️ [yejinSelfie] 전송할 셀카 파일이 없어서 텍스트만 전송');
            const message = getMessageByType(messageType);
            await client.pushMessage(userId, { type: 'text', text: message });
            return true;
        }
        
        // 메시지 선택
        const message = getMessageByType(messageType);
        
        // 이미지 전송
        const imageMessage = {
            type: 'image',
            originalContentUrl: `file://${selfieFile}`,
            previewImageUrl: `file://${selfieFile}`
        };
        
        await client.pushMessage(userId, imageMessage);
        console.log(`📸 [yejinSelfie] 셀카 전송 완료: ${path.basename(selfieFile)}`);
        
        // 메시지 전송 (이미지 다음)
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 딜레이
        await client.pushMessage(userId, { type: 'text', text: message });
        console.log(`💕 [yejinSelfie] 메시지 전송 완료: ${message.substring(0, 20)}...`);
        
        // 로그 기록
        try {
            const logger = require('./enhancedLogging.js');
            logger.logConversation('나', `(셀카전송) ${message}`, 'image');
        } catch (error) {
            console.log(`📸 [셀카전송] ${message.substring(0, 30)}...`);
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ [yejinSelfie] 셀카 전송 중 에러:', error);
        
        // 에러 발생 시 폴백 텍스트 메시지
        try {
            const fallbackMessage = "아저씨~ 셀카 전송하려다가 실패했어 ㅠㅠ 나중에 다시 보내줄게!";
            await client.pushMessage(userId, { type: 'text', text: fallbackMessage });
            console.log('📸 [yejinSelfie] 폴백 메시지 전송 완료');
        } catch (fallbackError) {
            console.error('❌ [yejinSelfie] 폴백 메시지 전송도 실패:', fallbackError);
        }
        
        return false;
    }
}

// 🎯 메시지 타입별 메시지 선택
function getMessageByType(messageType) {
    switch (messageType) {
        case 'morning':
        case 'afternoon': 
        case 'evening':
        case 'night':
            return getRandomMessage(messageType);
        case 'request':
            return getRandomMessage('request');
        case 'compliment':
            return getRandomMessage('compliment_reaction');
        case 'time':
            return getTimeBasedMessage();
        default:
            return getRandomMessage('random');
    }
}

// 📸 즉시 셀카 전송 (요청 시)
async function sendRequestedSelfie(client, userId) {
    console.log('📸 [yejinSelfie] 요청된 셀카 전송 시작');
    return await sendYejinSelfie(client, userId, 'request');
}

// 🌸 칭찬 반응 셀카 전송
async function sendComplimentReactionSelfie(client, userId) {
    console.log('🌸 [yejinSelfie] 칭찬 반응 셀카 전송 시작');
    return await sendYejinSelfie(client, userId, 'compliment');
}

// 🕒 시간대별 자동 셀카 전송
async function sendTimeBasedSelfie(client, userId) {
    console.log('🕒 [yejinSelfie] 시간대별 자동 셀카 전송 시작');
    return await sendYejinSelfie(client, userId, 'time');
}

// 📊 셀카 시스템 상태 확인
function getSelfieSystemStatus() {
    const files = getSelfieFiles();
    return {
        available: files.length > 0,
        fileCount: files.length,
        directory: path.join(__dirname, '..', 'photos', 'yejin_selfies'),
        messageTypes: Object.keys(SELFIE_MESSAGES),
        totalMessages: Object.values(SELFIE_MESSAGES).reduce((total, arr) => total + arr.length, 0)
    };
}

// 📤 모듈 내보내기
module.exports = {
    sendYejinSelfie,
    sendRequestedSelfie,
    sendComplimentReactionSelfie,
    sendTimeBasedSelfie,
    getSelfieSystemStatus,
    getRandomMessage,
    getTimeBasedMessage
};
