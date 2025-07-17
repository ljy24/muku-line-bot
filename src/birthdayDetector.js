/**
 * 생일 관련 감지 시스템
 * - 예진이 생일 (5월 28일) 관련 메시지 감지
 * - 아저씨 생일 관련 메시지 감지
 * - 생일 전후 특별 응답 생성
 * - 생일 기념일 카운트다운 및 축하 메시지
 */
class BirthdayDetector {
    constructor() {
        // 생일 정보 설정 (실제 데이터 기반)
        this.birthdays = {
            yejin: {
                month: 3,    // 3월
                day: 17,     // 17일
                year: 1994   // 1994년 (나이 계산용)
            },
            ajusshi: {
                month: 12,   // 12월
                day: 5,      // 5일
                year: null   // 연도 미지정
            }
        };
        
        // 생일 관련 키워드 (실제 날짜 반영)
        this.birthdayKeywords = [
            '생일', '생신', '태어난', '태어나', '몇 살', '나이',
            '축하', '케이크', '선물', '파티', '미역국',
            '3월 17일', '3월17일', '317', '3-17',  // 예진이 생일
            '12월 5일', '12월5일', '125', '12-5'   // 아저씨 생일
        ];
        
        // 생일 관련 질문 패턴
        this.birthdayQuestions = [
            '생일이 언제', '언제 태어났', '몇 살', '나이가 몇',
            '생일 축하', '생신 축하', '오늘 생일', '생일이야'
        ];
        
        // 생일 응답 패턴
        this.birthdayResponses = {
            // 예진이 생일 관련
            yejin: {
                exact: [
                    "오늘이 내 생일이야! 아저씨 기억해줘서 고마워 💕",
                    "와! 아저씨가 내 생일 챙겨줘서 너무 행복해!",
                    "아저씨~ 오늘 내 생일인 거 알지? 축하해줘!",
                    "생일 축하해줘서 고마워! 아저씨가 있어서 더 특별해"
                ],
                soon: [
                    "아저씨! 내 생일 얼마 안 남았어~ 기억하고 있지?",
                    "3월 17일이 내 생일이야! 아저씨 잊지 마",
                    "곧 내 생일인데... 아저씨 뭔가 준비하고 있어?",
                    "아저씨~ 내 생일 곧인데 기억해?"
                ],
                past: [
                    "아저씨... 내 생일 지나갔는데... 기억 못했지?",
                    "아저씨 바보야... 내 생일 놓쳤잖아",
                    "내 생일 지났는데... 아저씨 축하 안 해줬어",
                    "아저씨... 3월 17일 내 생일이었는데..."
                ],
                general: [
                    "내 생일은 3월 17일이야! 아저씨 꼭 기억해줘",
                    "나는 3월 17일에 태어났어~ 아저씨 잊지 마",
                    "3월 17일... 아저씨 이 날 기억해줘야 해",
                    "내 생일 3월 17일이야! 중요한 날이니까 챙겨줘"
                ]
            },
            
            // 아저씨 생일 관련
            ajusshi: {
                question: [
                    "아저씨 생일이 언제야? 나도 알고 싶어",
                    "아저씨 생일 알려줘! 나도 축하해주고 싶어",
                    "아저씨 언제 태어났어? 궁금해",
                    "아저씨 생일 언제인지 말해줘~"
                ],
                celebrate: [
                    "아저씨 생일 축하해! 정말 축하해! 💕",
                    "우리 아저씨 생일 축하해! 오늘 하루 행복해",
                    "아저씨 생일이라니! 축하해! 나 진짜 기뻐",
                    "아저씨 생일 축하해! 케이크 먹자!"
                ],
                remember: [
                    "아저씨 생일 기억하고 있어! 잊지 않았어",
                    "아저씨 생일 챙겨야지! 나 기억하고 있어",
                    "아저씨 생일 언제인지 알고 있어~",
                    "아저씨 생일 놓치지 않을 거야!"
                ]
            }
        };
    }

    // 생일 관련 메시지 감지
    detectBirthdayMessage(message) {
        const lowerMessage = message.toLowerCase();
        
        // 키워드 매칭
        const hasKeyword = this.birthdayKeywords.some(keyword => 
            lowerMessage.includes(keyword)
        );
        
        // 질문 패턴 매칭
        const hasQuestion = this.birthdayQuestions.some(question => 
            lowerMessage.includes(question)
        );
        
        if (!hasKeyword && !hasQuestion) {
            return null;
        }
        
        // 예진이 생일 관련인지 확인
        const isYejinBirthday = this.isYejinBirthdayRelated(message);
        const isAjusshiBirthday = this.isAjusshiBirthdayRelated(message);
        
        return {
            detected: true,
            isYejinBirthday,
            isAjusshiBirthday,
            birthdayStatus: this.getBirthdayStatus(),
            confidence: this.calculateConfidence(message)
        };
    }

    // 예진이 생일 관련 메시지인지 확인
    isYejinBirthdayRelated(message) {
        const yejinIndicators = [
            '너', '네', '당신', '예진', '5월 28일', '5월28일', '528'
        ];
        
        return yejinIndicators.some(indicator => 
            message.includes(indicator)
        );
    }

    // 아저씨 생일 관련 메시지인지 확인
    isAjusshiBirthdayRelated(message) {
        const ajusshiIndicators = [
            '아저씨', '당신', '너', '네'
        ];
        
        const birthdayKeywords = ['생일', '태어났', '나이'];
        
        return ajusshiIndicators.some(indicator => 
            message.includes(indicator)
        ) && birthdayKeywords.some(keyword => 
            message.includes(keyword)
        );
    }

    // 생일 상태 확인 (실제 날짜 기반)
    getBirthdayStatus() {
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();
        
        // 예진이 생일 체크 (3월 17일)
        const yejinStatus = this.checkSpecificBirthday(
            currentMonth, currentDay, 3, 17
        );
        
        // 아저씨 생일 체크 (12월 5일)
        const ajusshiStatus = this.checkSpecificBirthday(
            currentMonth, currentDay, 12, 5
        );
        
        return {
            yejin: yejinStatus,
            ajusshi: ajusshiStatus
        };
    }

    // 특정 생일 상태 확인
    checkSpecificBirthday(currentMonth, currentDay, targetMonth, targetDay) {
        if (currentMonth === targetMonth && currentDay === targetDay) {
            return 'today';
        }
        
        // 생일이 다가오는지 확인 (7일 이내)
        const today = new Date();
        const birthday = new Date(today.getFullYear(), targetMonth - 1, targetDay);
        
        if (birthday < today) {
            birthday.setFullYear(today.getFullYear() + 1);
        }
        
        const daysDiff = Math.ceil((birthday - today) / (1000 * 60 * 60 * 24));
        
        if (daysDiff <= 7 && daysDiff > 0) {
            return 'soon';
        }
        
        // 생일이 지났는지 확인 (7일 이내)
        const lastBirthday = new Date(today.getFullYear(), targetMonth - 1, targetDay);
        if (lastBirthday > today) {
            lastBirthday.setFullYear(today.getFullYear() - 1);
        }
        
        const daysPassed = Math.ceil((today - lastBirthday) / (1000 * 60 * 60 * 24));
        
        if (daysPassed <= 7 && daysPassed > 0) {
            return 'recent';
        }
        
        return 'normal';
    }

    // 생일 응답 생성
    generateBirthdayResponse(context) {
        const { isYejinBirthday, isAjusshiBirthday, birthdayStatus } = context;
        
        if (isYejinBirthday) {
            return this.generateYejinBirthdayResponse(birthdayStatus.yejin);
        }
        
        if (isAjusshiBirthday) {
            return this.generateAjusshiBirthdayResponse(context);
        }
        
        return null;
    }

    // 예진이 생일 응답 생성
    generateYejinBirthdayResponse(status) {
        const responses = this.birthdayResponses.yejin;
        let responseArray;
        
        switch (status) {
            case 'today':
                responseArray = responses.exact;
                break;
            case 'soon':
                responseArray = responses.soon;
                break;
            case 'recent':
                responseArray = responses.past;
                break;
            default:
                responseArray = responses.general;
        }
        
        const randomIndex = Math.floor(Math.random() * responseArray.length);
        
        return {
            text: responseArray[randomIndex],
            type: 'yejin_birthday',
            status: status,
            priority: status === 'today' ? 'high' : 'medium'
        };
    }

    // 아저씨 생일 응답 생성
    generateAjusshiBirthdayResponse(context) {
        const responses = this.birthdayResponses.ajusshi;
        
        // 아저씨 생일 정보가 없는 경우 질문
        if (!this.birthdays.ajusshi.month) {
            const questionResponses = responses.question;
            const randomIndex = Math.floor(Math.random() * questionResponses.length);
            
            return {
                text: questionResponses[randomIndex],
                type: 'ajusshi_birthday_question',
                priority: 'medium'
            };
        }
        
        // 아저씨 생일 축하
        const celebrateResponses = responses.celebrate;
        const randomIndex = Math.floor(Math.random() * celebrateResponses.length);
        
        return {
            text: celebrateResponses[randomIndex],
            type: 'ajusshi_birthday_celebrate',
            priority: 'high'
        };
    }

    // 생일까지 남은 날 계산
    getDaysUntilBirthday(month, day) {
        const today = new Date();
        const currentYear = today.getFullYear();
        let birthday = new Date(currentYear, month - 1, day);
        
        if (birthday < today) {
            birthday.setFullYear(currentYear + 1);
        }
        
        const daysDiff = Math.ceil((birthday - today) / (1000 * 60 * 60 * 24));
        return daysDiff;
    }

    // 생일 카운트다운 메시지
    getBirthdayCountdown() {
        const daysUntil = this.getDaysUntilBirthday(3, 17); // 3월 17일로 변경
        
        if (daysUntil === 0) {
            return "오늘이 내 생일이야! 🎂";
        } else if (daysUntil === 1) {
            return "내일이 내 생일이야! 하루 남았어! 🎉";
        } else if (daysUntil <= 7) {
            return `내 생일까지 ${daysUntil}일 남았어! 기억하고 있지? 💕`;
        } else if (daysUntil <= 30) {
            return `내 생일까지 ${daysUntil}일 남았어~ 잊지 마!`;
        }
        
        return null;
    }

    // 신뢰도 계산
    calculateConfidence(message) {
        let confidence = 0;
        
        // 키워드 매칭 점수
        const keywordMatches = this.birthdayKeywords.filter(keyword => 
            message.includes(keyword)
        ).length;
        confidence += keywordMatches * 0.2;
        
        // 날짜 매칭 점수
        if (message.includes('3월 17일') || message.includes('317')) {
            confidence += 0.4;
        }
        if (message.includes('12월 5일') || message.includes('125')) {
            confidence += 0.4;
        }
        
        // 질문 패턴 점수
        const questionMatches = this.birthdayQuestions.filter(question => 
            message.includes(question)
        ).length;
        confidence += questionMatches * 0.3;
        
        return Math.min(1.0, confidence);
    }

    // 아저씨 생일 정보 저장
    setAjusshiBirthday(month, day) {
        this.birthdays.ajusshi.month = month;
        this.birthdays.ajusshi.day = day;
        
        return {
            text: `아저씨 생일 ${month}월 ${day}일로 기억할게! 절대 잊지 않을 거야 💕`,
            type: 'birthday_saved',
            priority: 'high'
        };
    }

    // 특별한 날 체크 (생일 외 기념일)
    checkSpecialDays() {
        const today = new Date();
        const month = today.getMonth() + 1;
        const day = today.getDate();
        
        // 여기에 다른 기념일 추가 가능
        const specialDays = {
            '12-25': '크리스마스',
            '2-14': '밸런타인데이',
            '3-14': '화이트데이',
            '5-5': '어린이날',
            '10-31': '할로윈'
        };
        
        const dateKey = `${month}-${day}`;
        
        if (specialDays[dateKey]) {
            return {
                isSpecial: true,
                occasion: specialDays[dateKey],
                message: `오늘은 ${specialDays[dateKey]}이야! 특별한 날이네~`
            };
        }
        
        return { isSpecial: false };
    }
}

module.exports = BirthdayDetector;
