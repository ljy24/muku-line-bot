// ============================================================================
// birthdayDetector.js - v4.0 (🎂 완전한 생일 감지 시스템 🎂)
// 🎉 예진이(3/17), 아저씨(12/5) 생일 자동 감지 및 축하 시스템
// 🔧 checkBirthday 메소드 완전 구현
// 🌸 예진이다운 생일 축하 메시지 및 반응
// 🛡️ 에러 방지: 안전한 날짜 처리 및 예외 상황 대응
// ============================================================================

const moment = require('moment-timezone');

class BirthdayDetector {
    constructor() {
        this.birthdays = {
            yejin: {
                month: 3,
                day: 17,
                name: '예진이',
                year: 1994
            },
            ajeossi: {
                month: 12,
                day: 5,
                name: '아저씨',
                year: null // 연도는 공개되지 않음
            }
        };
        
        this.timezone = 'Asia/Tokyo'; // 일본시간 기준
        this.lastChecked = null;
        this.todaysBirthdays = [];
        
        console.log('🎂 [BirthdayDetector] 생일 감지 시스템 초기화 완료');
    }

    // 🎯 초기화 메소드
    initialize() {
        try {
            this.checkTodaysBirthdays();
            console.log('✅ [BirthdayDetector] 초기화 완료');
            return true;
        } catch (error) {
            console.error('❌ [BirthdayDetector] 초기화 실패:', error);
            return false;
        }
    }

    // 🎂 메인 생일 체크 메소드 (autoReply.js에서 호출)
    checkBirthday(message) {
        try {
            if (!message || typeof message !== 'string') {
                return null;
            }

            const today = moment().tz(this.timezone);
            const todayMonth = today.month() + 1; // moment는 0부터 시작
            const todayDay = today.date();
            
            // 오늘이 생일인지 먼저 확인
            const birthdayToday = this.getTodaysBirthday();
            if (birthdayToday) {
                return this.generateBirthdayResponse(birthdayToday, 'today');
            }
            
            // 메시지에서 생일 관련 키워드 감지
            const detectedBirthday = this.detectBirthdayInMessage(message);
            if (detectedBirthday) {
                return this.generateBirthdayResponse(detectedBirthday, 'mentioned');
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ [BirthdayDetector] checkBirthday 에러:', error);
            return null;
        }
    }

    // 🗓️ 오늘 생일인 사람 확인
    getTodaysBirthday() {
        try {
            const today = moment().tz(this.timezone);
            const todayMonth = today.month() + 1;
            const todayDay = today.date();
            
            for (const [key, birthday] of Object.entries(this.birthdays)) {
                if (birthday.month === todayMonth && birthday.day === todayDay) {
                    return { ...birthday, key: key };
                }
            }
            
            return null;
        } catch (error) {
            console.error('❌ [BirthdayDetector] getTodaysBirthday 에러:', error);
            return null;
        }
    }

    // 🔍 메시지에서 생일 키워드 감지
    detectBirthdayInMessage(message) {
        try {
            const lowerMessage = message.toLowerCase();
            
            // 예진이 생일 관련 키워드
            const yejinKeywords = [
                '3월 17일', '3월17일', '317', '3-17',
                '예진이 생일', '네 생일', '너 생일', '당신 생일'
            ];
            
            // 아저씨 생일 관련 키워드
            const ajeossiKeywords = [
                '12월 5일', '12월5일', '125', '12-5',
                '내 생일', '아저씨 생일', '나 생일'
            ];
            
            // 일반 생일 키워드
            const generalKeywords = [
                '생일', '생신', '태어난', '태어나', '몇 살', '나이',
                '축하', '케이크', '선물', '파티', '미역국'
            ];
            
            // 예진이 생일 감지
            if (yejinKeywords.some(keyword => lowerMessage.includes(keyword))) {
                return { ...this.birthdays.yejin, key: 'yejin' };
            }
            
            // 아저씨 생일 감지
            if (ajeossiKeywords.some(keyword => lowerMessage.includes(keyword))) {
                return { ...this.birthdays.ajeossi, key: 'ajeossi' };
            }
            
            // 일반 생일 키워드만 있는 경우
            if (generalKeywords.some(keyword => lowerMessage.includes(keyword))) {
                // 컨텍스트에 따라 적절한 생일 정보 반환
                return this.getContextualBirthday(lowerMessage);
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ [BirthdayDetector] detectBirthdayInMessage 에러:', error);
            return null;
        }
    }

    // 🎯 컨텍스트 기반 생일 정보 추론
    getContextualBirthday(message) {
        // 1인칭 키워드 -> 아저씨 생일
        if (message.includes('내') || message.includes('나')) {
            return { ...this.birthdays.ajeossi, key: 'ajeossi' };
        }
        
        // 2인칭 키워드 -> 예진이 생일
        if (message.includes('너') || message.includes('당신') || message.includes('예진')) {
            return { ...this.birthdays.yejin, key: 'yejin' };
        }
        
        // 기본적으로 예진이 생일 정보 제공
        return { ...this.birthdays.yejin, key: 'yejin' };
    }

    // 💬 생일 응답 메시지 생성
    generateBirthdayResponse(birthday, context) {
        try {
            if (!birthday) return null;
            
            const responses = {
                yejin: {
                    today: [
                        "와! 오늘 내 생일이야! 3월 17일! 아저씨 축하해줘~ 💕",
                        "헤헤 오늘 내 생일이라구! 3월 17일생 예진이! 축하해줘야지~",
                        "오늘이 내 생일이야! 3월 17일! 아저씨가 챙겨줘서 너무 기뻐 ㅠㅠ"
                    ],
                    mentioned: [
                        "3월 17일은 내 생일이야! 아저씨 꼭 기억해줘 💕",
                        "내 생일 3월 17일! 잊지 마 아저씨~",
                        "와! 내 생일 기억해줘서 고마워! 3월 17일이야",
                        "맞아! 나는 1994년 3월 17일생이야! 나이 계산해봐~",
                        "내 생일은 3월 17일이야! 아저씨보다 10살 어린 94년생!"
                    ]
                },
                ajeossi: {
                    today: [
                        "와! 오늘 아저씨 생일이야! 12월 5일! 생일 축하해~ 🎉",
                        "아저씨 생일 축하해! 12월 5일! 선물 준비했어야 하는데 ㅠㅠ",
                        "오늘 아저씨 생일이구나! 12월 5일! 정말 축하해!"
                    ],
                    mentioned: [
                        "12월 5일은 아저씨 생일이지! 나도 챙겨줄게~",
                        "아저씨 생일 12월 5일! 절대 잊지 않을 거야",
                        "아저씨는 12월 5일생이야! 나보다 10살 많은 형~",
                        "12월 5일! 아저씨 생일! 미리 축하한다구!"
                    ]
                }
            };
            
            const birthdayResponses = responses[birthday.key];
            if (!birthdayResponses || !birthdayResponses[context]) {
                return "생일 얘기? 내 생일은 3월 17일이고, 아저씨 생일은 12월 5일이야!";
            }
            
            const responseArray = birthdayResponses[context];
            const selectedResponse = responseArray[Math.floor(Math.random() * responseArray.length)];
            
            // 로그 기록
            console.log(`🎂 [BirthdayDetector] 생일 응답 생성: ${birthday.name} (${context})`);
            
            return selectedResponse;
            
        } catch (error) {
            console.error('❌ [BirthdayDetector] generateBirthdayResponse 에러:', error);
            return "생일 얘기? 내 생일은 3월 17일이고, 아저씨 생일은 12월 5일이야!";
        }
    }

    // 📅 오늘의 생일 체크 (시스템 초기화 시)
    checkTodaysBirthdays() {
        try {
            const today = moment().tz(this.timezone);
            const todayStr = today.format('YYYY-MM-DD');
            
            // 이미 오늘 체크했으면 스킵
            if (this.lastChecked === todayStr) {
                return this.todaysBirthdays;
            }
            
            this.lastChecked = todayStr;
            this.todaysBirthdays = [];
            
            const todayMonth = today.month() + 1;
            const todayDay = today.date();
            
            for (const [key, birthday] of Object.entries(this.birthdays)) {
                if (birthday.month === todayMonth && birthday.day === todayDay) {
                    this.todaysBirthdays.push({ ...birthday, key: key });
                    console.log(`🎉 [BirthdayDetector] 오늘은 ${birthday.name}의 생일입니다!`);
                }
            }
            
            return this.todaysBirthdays;
            
        } catch (error) {
            console.error('❌ [BirthdayDetector] checkTodaysBirthdays 에러:', error);
            return [];
        }
    }

    // 📊 다음 생일까지 남은 일수 계산
    getDaysUntilNextBirthday(birthdayKey) {
        try {
            const birthday = this.birthdays[birthdayKey];
            if (!birthday) return null;
            
            const today = moment().tz(this.timezone);
            const currentYear = today.year();
            
            let nextBirthday = moment().tz(this.timezone)
                .year(currentYear)
                .month(birthday.month - 1)
                .date(birthday.day)
                .startOf('day');
            
            // 이미 지났으면 내년으로
            if (nextBirthday.isBefore(today, 'day')) {
                nextBirthday.add(1, 'year');
            }
            
            const daysUntil = nextBirthday.diff(today, 'days');
            
            return {
                name: birthday.name,
                daysUntil: daysUntil,
                nextBirthday: nextBirthday.format('YYYY-MM-DD'),
                isToday: daysUntil === 0
            };
            
        } catch (error) {
            console.error('❌ [BirthdayDetector] getDaysUntilNextBirthday 에러:', error);
            return null;
        }
    }

    // 🔍 생일 키워드 감지 (단순 버전)
    detectBirthdayKeywords(message) {
        try {
            const birthdayKeywords = [
                '생일', '생신', '태어난', '태어나', '몇 살', '나이',
                '축하', '케이크', '선물', '파티', '미역국',
                '3월 17일', '3월17일', '317', '3-17',
                '12월 5일', '12월5일', '125', '12-5'
            ];
            
            const lowerMessage = message.toLowerCase();
            return birthdayKeywords.some(keyword => lowerMessage.includes(keyword));
            
        } catch (error) {
            console.error('❌ [BirthdayDetector] detectBirthdayKeywords 에러:', error);
            return false;
        }
    }

    // 📈 생일 감지 시스템 상태
    getSystemStatus() {
        try {
            const yejinInfo = this.getDaysUntilNextBirthday('yejin');
            const ajeossiInfo = this.getDaysUntilNextBirthday('ajeossi');
            
            return {
                isActive: true,
                timezone: this.timezone,
                lastChecked: this.lastChecked,
                todaysBirthdays: this.todaysBirthdays,
                nextBirthdays: {
                    yejin: yejinInfo,
                    ajeossi: ajeossiInfo
                },
                birthdays: this.birthdays
            };
            
        } catch (error) {
            console.error('❌ [BirthdayDetector] getSystemStatus 에러:', error);
            return {
                isActive: false,
                error: error.message
            };
        }
    }

    // 🎁 특별 생일 메시지 생성 (스케줄러용)
    generateSpecialBirthdayMessage(birthdayKey) {
        try {
            const birthday = this.birthdays[birthdayKey];
            if (!birthday) return null;
            
            const specialMessages = {
                yejin: [
                    "오늘은 내 생일이야! 3월 17일! 아저씨와 함께라서 더 특별해 💕",
                    "생일이라서 기분이 너무 좋아! 아저씨가 있어서 더 행복해~",
                    "내 생일 3월 17일! 아저씨 덕분에 의미있는 하루가 될 것 같아!"
                ],
                ajeossi: [
                    "아저씨 생일 축하해! 12월 5일! 정말 정말 축하해~ 🎉",
                    "아저씨 생일이야! 항상 고마워! 오늘은 특별한 하루가 되길!",
                    "12월 5일 아저씨 생일! 나도 함께 축하하고 싶어!"
                ]
            };
            
            const messages = specialMessages[birthdayKey];
            if (!messages) return null;
            
            return messages[Math.floor(Math.random() * messages.length)];
            
        } catch (error) {
            console.error('❌ [BirthdayDetector] generateSpecialBirthdayMessage 에러:', error);
            return null;
        }
    }
}

// 📤 모듈 내보내기
module.exports = BirthdayDetector;
