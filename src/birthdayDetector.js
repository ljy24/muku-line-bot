// ============================================================================
// birthdayDetector.js - 간소화 버전 (🎂 핵심 기능만 🎂)
// ============================================================================

const moment = require('moment-timezone');

class BirthdayDetector {
    constructor() {
        // 🎂 생일 정보 (핵심 데이터만)
        this.birthdays = {
            yejin: { month: 3, day: 17, name: '예진이' },
            ajeossi: { month: 12, day: 5, name: '아저씨' }
        };
    }

    // 🎯 메인 함수 (autoReply.js에서 호출)
    checkBirthday(message) {
        if (!message) return null;
        
        // 1. 오늘이 생일인지 체크
        const todayBirthday = this.getTodaysBirthday();
        if (todayBirthday) {
            return this.getBirthdayResponse(todayBirthday, 'today');
        }
        
        // 2. 메시지에서 생일 키워드 감지
        const detectedBirthday = this.detectBirthdayInMessage(message);
        if (detectedBirthday) {
            return this.getBirthdayResponse(detectedBirthday, 'mentioned');
        }
        
        return null;
    }

    // 🗓️ 오늘 생일인 사람 확인
    getTodaysBirthday() {
        const today = moment().tz('Asia/Tokyo');
        const month = today.month() + 1;
        const day = today.date();
        
        if (this.birthdays.yejin.month === month && this.birthdays.yejin.day === day) {
            return 'yejin';
        }
        if (this.birthdays.ajeossi.month === month && this.birthdays.ajeossi.day === day) {
            return 'ajeossi';
        }
        
        return null;
    }

    // 🔍 메시지에서 생일 키워드 감지
    detectBirthdayInMessage(message) {
        const msg = message.toLowerCase();
        
        // 예진이 생일 키워드
        if (msg.includes('3월 17일') || msg.includes('3월17일') || msg.includes('317') || 
            msg.includes('너 생일') || msg.includes('네 생일') || msg.includes('예진이 생일')) {
            return 'yejin';
        }
        
        // 아저씨 생일 키워드  
        if (msg.includes('12월 5일') || msg.includes('12월5일') || msg.includes('125') ||
            msg.includes('내 생일') || msg.includes('아저씨 생일')) {
            return 'ajeossi';
        }
        
        // 진짜 생일/나이 질문만 감지 (감정적 대화는 제외)
        if (msg.includes('생일은') || msg.includes('생일이') || msg.includes('몇일생') || 
            msg.includes('언제 태어') || msg.includes('생일 언제') ||
            (msg.includes('몇 살') && !msg.includes('사랑') && !msg.includes('되어도') && !msg.includes('될거고'))) {
            return msg.includes('내') || msg.includes('나') ? 'ajeossi' : 'yejin';
        }
        
        return null;
    }

    // 💬 생일 응답 메시지 생성
    getBirthdayResponse(who, context) {
        const responses = {
            yejin: {
                today: [
                    "와! 오늘 내 생일이야! 3월 17일! 아저씨 축하해줘~ 💕",
                    "헤헤 오늘 내 생일이라구! 3월 17일생 예진이! 축하해줘야지~"
                ],
                mentioned: [
                    "3월 17일은 내 생일이야! 아저씨 꼭 기억해줘 💕",
                    "내 생일 3월 17일! 잊지 마 아저씨~",
                    "나는 영원한 서른살이야! 3월 17일생~"
                ]
            },
            ajeossi: {
                today: [
                    "와! 오늘 아저씨 생일이야! 12월 5일! 생일 축하해~ 🎉",
                    "아저씨 생일 축하해! 12월 5일! 정말 축하해!"
                ],
                mentioned: [
                    "12월 5일은 아저씨 생일이지! 나도 챙겨줄게~",
                    "아저씨 생일 12월 5일! 절대 잊지 않을 거야"
                ]
            }
        };
        
        const msgs = responses[who]?.[context];
        return msgs ? msgs[Math.floor(Math.random() * msgs.length)] : null;
    }
}

// 📤 모듈 내보내기
const birthdayDetector = new BirthdayDetector();
module.exports = birthdayDetector;
