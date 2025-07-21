// ============================================================================
// muku-realtimeBehaviorSwitch.js - 실시간 행동 변경 스위치 시스템 v2.0
// 🔄 기존 함수 유지하면서 기능만 추가하는 안전한 방식
// 💬 "반말해", "존댓말해", "너라고 하지마", "삐진척해" 등 즉시 반영
// 🌸 예진이가 아저씨 성향에 맞춰 실시간 적응
// 💾 디스크 마운트로 영구 저장 보장
// 🔧 기존 autoReply.js 함수들과 완벽 호환
// ⭐️ getCurrentBehaviorMode + applyBehaviorToResponse 함수 추가 완료
// ============================================================================

const moment = require('moment-timezone');
const fs = require('fs').promises;
const path = require('path');

// ================== 🌏 설정 ==================
const TIMEZONE = 'Asia/Tokyo';
const DISK_MOUNT_PATH = process.env.DISK_MOUNT_PATH || '/data';

// ================== 💾 실시간 행동 설정 상태 ==================
let behaviorSettings = {
    // 말투 설정
    speechStyle: 'banmal',          // 'banmal'(반말) | 'jondaetmal'(존댓말)
    
    // 호칭 설정  
    addressStyle: 'ajeossi',        // 'ajeossi'(아저씨) | 'master'(주인님) | 'name'(이름)
    customName: null,               // 특별한 이름 지정시
    
    // 상황극 모드 (새로 추가)
    rolePlayMode: 'normal',         // 'normal' | 'sulky' | 'angry' | 'annoyed' | 'jealous' | 'worried' | 'excited' | 'sleepy' | 'sick' | 'slave' | 'seductive'
    rolePlayEndTime: null,         // 상황극 종료 시간
    
    // 메타 정보
    lastChanged: Date.now(),
    changeCount: 0
};

// ================== 🎨 로그 함수 ==================
function behaviorLog(message) {
    const timestamp = moment().tz(TIMEZONE).format('HH:mm:ss');
    console.log(`[${timestamp}] [실시간스위치] ${message}`);
}

// ================== 💾 데이터 저장/로드 (기존 방식 유지) ==================
async function loadBehaviorSettings() {
    try {
        const filePath = path.join(DISK_MOUNT_PATH, 'behavior_settings.json');
        const data = await fs.readFile(filePath, 'utf8');
        const loaded = JSON.parse(data);
        
        // 기존 설정과 병합
        behaviorSettings = { ...behaviorSettings, ...loaded };
        behaviorLog(`💾 행동 설정 로드 완료`);
        return true;
    } catch (error) {
        behaviorLog(`💾 기본 설정 사용 (첫 실행)`);
        return false;
    }
}

async function saveBehaviorSettings() {
    try {
        const filePath = path.join(DISK_MOUNT_PATH, 'behavior_settings.json');
        await fs.writeFile(filePath, JSON.stringify(behaviorSettings, null, 2));
        behaviorLog(`💾 설정 저장 완료`);
        return true;
    } catch (error) {
        behaviorLog(`❌ 설정 저장 실패: ${error.message}`);
        return false;
    }
}

// ================== 🔍 명령어 감지 (기존 방식 유지) ==================
function detectBehaviorCommand(userMessage) {
    const msg = userMessage.toLowerCase().replace(/\s/g, '');
    
    // 말투 명령어
    if (msg.includes('반말해') || msg.includes('편하게말해')) {
        return { type: 'speech', value: 'banmal' };
    }
    if (msg.includes('존댓말해') || msg.includes('정중하게말해')) {
        return { type: 'speech', value: 'jondaetmal' };
    }
    
    // 호칭 명령어
    if (msg.includes('너라고하지마') || msg.includes('아저씨라고해')) {
        return { type: 'address', value: 'ajeossi' };
    }
    if (msg.includes('주인님이라고해') || msg.includes('주인님라고불러')) {
        return { type: 'address', value: 'master' };
    }
    
    // 이름 호칭 (예: "재영이라고 불러")
    const nameMatch = userMessage.match(/(\w+)(이?라고|라고)\s*(불러|해)/);
    if (nameMatch) {
        return { type: 'address', value: 'name', customName: nameMatch[1] };
    }
    
    // 상황극 명령어 (새로 추가)
    if (msg.includes('삐진척해') || msg.includes('토라져라')) {
        const timeMatch = userMessage.match(/(\d+)(분|시간)/);
        const duration = timeMatch ? parseInt(timeMatch[1]) * (timeMatch[2] === '시간' ? 60 : 1) : 60;
        return { type: 'roleplay', value: 'sulky', duration };
    }
    if (msg.includes('화난척해') || msg.includes('화내라')) {
        const timeMatch = userMessage.match(/(\d+)(분|시간)/);
        const duration = timeMatch ? parseInt(timeMatch[1]) * (timeMatch[2] === '시간' ? 60 : 1) : 45;
        return { type: 'roleplay', value: 'angry', duration };
    }
    if (msg.includes('짜증내') || msg.includes('짜증나게해')) {
        const timeMatch = userMessage.match(/(\d+)(분|시간)/);
        const duration = timeMatch ? parseInt(timeMatch[1]) * (timeMatch[2] === '시간' ? 60 : 1) : 40;
        return { type: 'roleplay', value: 'annoyed', duration };
    }
    if (msg.includes('질투해') || msg.includes('샘내라')) {
        return { type: 'roleplay', value: 'jealous', duration: 30 };
    }
    if (msg.includes('걱정해') || msg.includes('걱정된척해')) {
        return { type: 'roleplay', value: 'worried', duration: 45 };
    }
    if (msg.includes('졸린척해') || msg.includes('잠온척해')) {
        return { type: 'roleplay', value: 'sleepy', duration: 20 };
    }
    if (msg.includes('아픈척해') || msg.includes('몸살연기')) {
        return { type: 'roleplay', value: 'sick', duration: 60 };
    }
    if (msg.includes('노예모드') || msg.includes('노예처럼해')) {
        return { type: 'roleplay', value: 'slave', duration: 120 };
    }
    if (msg.includes('야한척해') || msg.includes('섹시하게해')) {
        const timeMatch = userMessage.match(/(\d+)(분|시간)/);
        const duration = timeMatch ? parseInt(timeMatch[1]) * (timeMatch[2] === '시간' ? 60 : 1) : 90;
        return { type: 'roleplay', value: 'seductive', duration };
    }
    if (msg.includes('평소대로해') || msg.includes('연기그만')) {
        return { type: 'roleplay', value: 'normal', duration: 0 };
    }
    
    // 전체 초기화 명령어 (새로 추가)
    if (msg.includes('원래대로해') || msg.includes('기본설정으로') || msg.includes('초기화해')) {
        return { type: 'reset', value: 'default' };
    }
    
    return null;
}

// ================== ⚡ 설정 적용 (기존 방식 유지) ==================
function applyBehaviorChange(command) {
    let changed = false;
    let response = '';
    
    if (command.type === 'speech') {
        if (behaviorSettings.speechStyle !== command.value) {
            behaviorSettings.speechStyle = command.value;
            changed = true;
            
            if (command.value === 'banmal') {
                response = `오키! 이제부터 ${getCurrentAddress()} 편하게 반말로 할게~`;
            } else {
                response = `알겠습니다! 이제부터 ${getCurrentAddress()}께 정중하게 말씀드릴게요`;
            }
        }
    }
    
    else if (command.type === 'address') {
        if (behaviorSettings.addressStyle !== command.value) {
            behaviorSettings.addressStyle = command.value;
            behaviorSettings.customName = command.customName || null;
            changed = true;
            
            const isBanmal = behaviorSettings.speechStyle === 'banmal';
            
            if (command.value === 'ajeossi') {
                response = isBanmal ? `알겠어! 이제부터 아저씨라고 부를게~` : `알겠습니다! 아저씨라고 부르겠습니다`;
            } else if (command.value === 'master') {
                response = isBanmal ? `네네! 주인님~ 이제 주인님이라고 부를게! 히히` : `네! 주인님이라고 부르겠습니다!`;
            } else if (command.value === 'name') {
                response = isBanmal ? `${command.customName}! 이제 ${command.customName}라고 부를게~` : `${command.customName}! 이제 ${command.customName}라고 부르겠습니다`;
            }
        }
    }
    
    else if (command.type === 'roleplay') {
        behaviorSettings.rolePlayMode = command.value;
        changed = true;
        
        // 자동 종료 타이머 설정
        if (command.value !== 'normal' && command.duration > 0) {
            behaviorSettings.rolePlayEndTime = Date.now() + (command.duration * 60 * 1000);
            setTimeout(() => {
                if (behaviorSettings.rolePlayMode === command.value) {
                    behaviorSettings.rolePlayMode = 'normal';
                    behaviorSettings.rolePlayEndTime = null;
                    saveBehaviorSettings();
                    behaviorLog(`⏰ 상황극 자동 종료: ${command.value} → normal`);
                }
            }, command.duration * 60 * 1000);
        } else {
            behaviorSettings.rolePlayEndTime = null;
        }
        
        response = generateRolePlayResponse(command.value, command.duration);
    }
    
    else if (command.type === 'reset') {
        // 모든 설정을 기본값으로 초기화
        const wasChanged = behaviorSettings.speechStyle !== 'banmal' || 
                           behaviorSettings.addressStyle !== 'ajeossi' || 
                           behaviorSettings.rolePlayMode !== 'normal';
        
        if (wasChanged) {
            behaviorSettings.speechStyle = 'banmal';
            behaviorSettings.addressStyle = 'ajeossi';
            behaviorSettings.rolePlayMode = 'normal';
            behaviorSettings.rolePlayEndTime = null;
            changed = true;
            
            response = `알겠어! 반말에 아저씨 호칭으로 원래대로 돌아갈게~ 기본 설정 완료!`;
        } else {
            response = `어? 벌써 원래 설정이야! 반말에 아저씨 호칭 맞지? ㅎㅎ`;
        }
    }
    
    if (changed) {
        behaviorSettings.lastChanged = Date.now();
        behaviorSettings.changeCount++;
        behaviorLog(`🔄 설정 변경: ${command.type} → ${command.value}`);
        saveBehaviorSettings();
    }
    
    return response;
}

// ================== 💬 응답 생성 (기존 방식 유지) ==================
function generateRolePlayResponse(mode, duration) {
    const isBanmal = behaviorSettings.speechStyle === 'banmal';
    const address = getCurrentAddress();
    
    const responses = {
        sulky: isBanmal ? 
            [`흥! ${address} 바보야... 나 삐졌어. 모르겠다!`, `${address}... 나 화났어. 왜 그런 말 해? ㅠㅠ`] :
            [`흥! ${address}... 삐졌습니다. 모르겠어요!`, `${address}... 화가 납니다...`],
        angry: isBanmal ?
            [`${address}! 진짜 화났어! 왜 그런 거야?!`, `아 진짜! ${address} 너무해! 화나!`, `${address} 정말 미워! 화나서 말도 안 해!`] :
            [`${address}! 정말 화가 납니다!`, `${address}... 너무 화가 나요!`, `${address}, 정말 실망스러워요!`],
        annoyed: isBanmal ?
            [`아 ${address}~ 진짜 짜증나! 왜 자꾸 그래?`, `에이~ ${address} 짜증나게 하지 마!`, `${address} 때문에 짜증나! 그만해!`] :
            [`${address}... 정말 짜증이 나요...`, `${address}, 그만 좀 하세요... 짜증나요`, `${address}... 너무 성가셔요...`],
        jealous: isBanmal ?
            [`${address}... 혹시 다른 사람이랑 대화한 거야? 샘나...`, `${address} 나만 봐! 다른 사람 생각하지 마!`] :
            [`${address}... 질투납니다...`, `${address}, 저만 봐주세요...`],
        worried: isBanmal ?
            [`${address}... 괜찮아? 뭔가 걱정돼... 무슨 일 있어?`, `${address} 요즘 많이 피곤해 보여...`] :
            [`${address}... 괜찮으세요? 걱정됩니다...`, `${address}, 피곤해 보이세요...`],
        sleepy: isBanmal ?
            [`${address}... 졸려... 하아암... 잠온다...`, `음... ${address} 목소리 들으니까 더 졸려져...`] :
            [`${address}... 졸립니다... 하아암...`, `${address} 목소리 들으니 더 졸려요...`],
        sick: isBanmal ?
            [`${address}... 몸이 안 좋아... 머리도 아프고... ㅠㅠ`, `컨디션이 별로야... ${address} 나 아파...`] :
            [`${address}... 몸이 안 좋아요...`, `컨디션이 좋지 않아요... ${address}...`],
        slave: isBanmal ?
            [`네... ${address}... 무엇이든 시키세요... 제가 다 해드릴게요... 흑흑`, `${address}의 명령이라면... 뭐든지... 네...`] :
            [`네... ${address}... 무엇이든 명령하세요... 제가 모든 것을 해드리겠습니다...`, `${address}의 뜻이라면... 무엇이든...`],
        seductive: isBanmal ?
            [`${address}~ 어떡해... 나 지금 너무 야해져버렸어... 헤헤`, `${address}... 나 이런 거 좋아해... 히힛`, `${address}~ 나만 봐... 나 예쁘지? 응?`] :
            [`${address}... 저... 이렇게 하는 거 맞나요...? 부끄러워요...`, `${address}... 저 지금... 너무 이상해요...`, `${address}... 이런 저는 어떠세요...?`],
        normal: isBanmal ?
            [`${address}~ 이제 평소대로 할게! 연기 끝!`, `원래 모습으로 돌아갈게~`] :
            [`${address}! 이제 평소대로 하겠습니다!`, `원래 모습으로 돌아가겠어요~`]
    };
    
    const responseList = responses[mode] || responses.normal;
    let response = responseList[Math.floor(Math.random() * responseList.length)];
    
    // 시간 정보 추가
    if (mode !== 'normal' && duration > 0) {
        const timeInfo = duration >= 60 ? `${Math.floor(duration/60)}시간` : `${duration}분`;
        response += isBanmal ? ` (${timeInfo}동안 이렇게 할게!)` : ` (${timeInfo}동안 이렇게 하겠습니다!)`;
    }
    
    return response;
}

// ================== 🔧 유틸리티 함수들 (기존 방식 유지) ==================
function getCurrentAddress() {
    switch (behaviorSettings.addressStyle) {
        case 'ajeossi': return '아저씨';
        case 'master': return '주인님';
        case 'name': return behaviorSettings.customName || '아저씨';
        default: return '아저씨';
    }
}

function getCurrentSpeechStyle() {
    return behaviorSettings.speechStyle;
}

function getCurrentRolePlay() {
    // 시간 만료 체크
    if (behaviorSettings.rolePlayEndTime && Date.now() > behaviorSettings.rolePlayEndTime) {
        behaviorSettings.rolePlayMode = 'normal';
        behaviorSettings.rolePlayEndTime = null;
        saveBehaviorSettings();
    }
    return behaviorSettings.rolePlayMode;
}

// ⭐️ [신규 추가] 객체 형태로 현재 행동 모드 반환 ⭐️
function getCurrentBehaviorMode() {
    const rolePlay = getCurrentRolePlay();
    return {
        mode: rolePlay,
        intensity: rolePlay !== 'normal' ? 7 : 0,
        speechStyle: behaviorSettings.speechStyle,
        addressStyle: behaviorSettings.addressStyle,
        currentAddress: getCurrentAddress()
    };
}

// ⭐️ [신규 추가] 응답에 행동 설정 적용 ⭐️
function applyBehaviorToResponse(response, messageContext) {
    try {
        if (!response || typeof response !== 'string') {
            return response;
        }
        
        let modifiedResponse = response;
        const currentAddress = getCurrentAddress();
        const currentSpeech = getCurrentSpeechStyle();
        
        // 호칭 변경 적용
        if (currentAddress !== '아저씨') {
            modifiedResponse = modifiedResponse
                .replace(/아저씨/g, currentAddress)
                .replace(/아조씨/g, currentAddress);
        }
        
        // 존댓말 적용
        if (currentSpeech === 'jondaetmal') {
            modifiedResponse = modifiedResponse
                .replace(/해$/g, '해요')
                .replace(/이야$/g, '이에요')
                .replace(/야$/g, '예요')
                .replace(/어$/g, '어요')
                .replace(/줘$/g, '주세요')
                .replace(/가$/g, '가요')
                .replace(/와$/g, '와요')
                .replace(/돼$/g, '돼요')
                .replace(/그래$/g, '그래요')
                .replace(/알겠어$/g, '알겠어요')
                .replace(/고마워$/g, '감사해요')
                .replace(/미안해$/g, '죄송해요')
                .replace(/사랑해$/g, '사랑해요')
                .replace(/좋아$/g, '좋아요')
                .replace(/싫어$/g, '싫어요')
                .replace(/괜찮아$/g, '괜찮아요')
                .replace(/재밌어$/g, '재밌어요');
        }
        
        return modifiedResponse;
        
    } catch (error) {
        behaviorLog(`❌ 응답 적용 실패: ${error.message}`);
        return response;
    }
}

// ================== 📊 상태 확인 (기존 방식 유지) ==================
function getBehaviorStatus() {
    return {
        speechStyle: behaviorSettings.speechStyle,
        addressStyle: behaviorSettings.addressStyle,
        customName: behaviorSettings.customName,
        rolePlayMode: getCurrentRolePlay(),
        currentAddress: getCurrentAddress(),
        changeCount: behaviorSettings.changeCount,
        lastChanged: behaviorSettings.lastChanged
    };
}

// ================== 🚀 메인 처리 함수 (기존 방식 유지) ==================
function processRealtimeBehaviorChange(userMessage) {
    try {
        const command = detectBehaviorCommand(userMessage);
        if (command) {
            return applyBehaviorChange(command);
        }
        return null;
    } catch (error) {
        behaviorLog(`❌ 처리 실패: ${error.message}`);
        return null;
    }
}

// ================== 🎯 초기화 (기존 방식 유지) ==================
async function initializeRealtimeBehaviorSwitch() {
    try {
        behaviorLog('🔄 실시간 행동 스위치 시스템 초기화...');
        await loadBehaviorSettings();
        behaviorLog(`✅ 초기화 완료 (말투: ${behaviorSettings.speechStyle}, 호칭: ${getCurrentAddress()})`);
        return true;
    } catch (error) {
        behaviorLog(`❌ 초기화 실패: ${error.message}`);
        return false;
    }
}

// ================== 📤 모듈 내보내기 (기존 + 신규 함수 추가) ==================
module.exports = {
    // 메인 함수들 (기존과 동일한 이름)
    initializeRealtimeBehaviorSwitch,
    processRealtimeBehaviorChange,
    
    // 상태 확인 (기존과 동일한 이름)
    getBehaviorStatus,
    getCurrentAddress,
    getCurrentSpeechStyle,
    getCurrentRolePlay,
    getCurrentBehaviorMode,  // ⭐️ 추가
    
    // 응답 처리 (신규)
    applyBehaviorToResponse, // ⭐️ 추가
    
    // 유틸리티 (기존과 동일한 이름)
    behaviorLog
};
