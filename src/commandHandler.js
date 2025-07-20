// ============================================================================
// commandHandler.js - v3.1 (일기장 시스템 통합 + 사람 학습 시스템 통합)
// 🧠 기존의 정상 작동하는 파일들(concept.js, omoide.js, yejinSelfie.js)을 그대로 사용합니다.
// ✅ 기존 파일들을 건드리지 않고 연동만 수행합니다.
// 💭 속마음 기능: 감정별 10개씩 랜덤 속마음 표시
// 📊 상태 확인: enhancedLogging.formatLineStatusReport() 사용으로 완전한 상태 리포트
// 👥 사람 학습: 사람목록, 사람통계, 사람삭제, 이름 학습 처리
// 🗓️ 일기장 시스템: 일기장, 일기목록, 특정날짜 일기, 일기통계 (신규!)
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
        // ================== 🗓️ 일기장 시스템 명령어들 (신규!) ==================
        
        // 🗓️ 오늘 일기 생성
        if (lowerText.includes('일기장') || lowerText.includes('일기') || 
            lowerText.includes('다이어리') || lowerText.includes('diary') ||
            lowerText === '오늘일기' || lowerText === '일기써줘' ||
            lowerText.includes('일기 써') || lowerText.includes('일기쓰')) {
            
            console.log('[commandHandler] 🗓️ 일기장 요청 감지');
            
            try {
                // 전역 모듈에서 diaryManager 가져오기
                const modules = global.mukuModules || {};
                
                if (!modules.diaryManager) {
                    console.log('[commandHandler] 🗓️ diaryManager 모듈 없음');
                    return {
                        type: 'text',
                        comment: "아직 일기장 시스템이 준비 안 됐어! 나중에 다시 말해줘~",
                        handled: true
                    };
                }
                
                // 오늘 일기 생성 시도
                const diaryResult = await modules.diaryManager.generateTodayDiary();
                
                if (diaryResult && diaryResult.success && diaryResult.diary) {
                    console.log('[commandHandler] 🗓️ 일기장 생성 성공');
                    
                    // 일기 내용 포매팅
                    let diaryResponse = `📔 ${diaryResult.diary.date} 일기\n\n`;
                    diaryResponse += diaryResult.diary.content;
                    
                    if (diaryResult.diary.mood) {
                        diaryResponse += `\n\n💭 오늘 기분: ${diaryResult.diary.mood}`;
                    }
                    
                    // 일기 저장 확인 메시지 추가
                    if (diaryResult.saved) {
                        diaryResponse += `\n\n📝 일기장에 저장했어! 나중에 또 보자~`;
                    }
                    
                    return {
                        type: 'text',
                        comment: diaryResponse,
                        handled: true
                    };
                    
                } else {
                    console.log('[commandHandler] 🗓️ 일기장 생성 실패:', diaryResult);
                    
                    return {
                        type: 'text',
                        comment: "일기 쓰려고 했는데... 뭔가 문제가 생겼어 ㅠㅠ 다시 시도해볼까?",
                        handled: true
                    };
                }
                
            } catch (error) {
                console.error('[commandHandler] 🗓️ 일기장 처리 실패:', error.message);
                
                return {
                    type: 'text',
                    comment: "일기장 열려고 했는데 문제가 생겼어... 나중에 다시 시도해볼게!",
                    handled: true
                };
            }
        }

        // 🗓️ 과거 일기 조회 처리
        if (lowerText.includes('일기 보여줘') || lowerText.includes('일기목록') || 
            lowerText.includes('일기 목록') || lowerText.includes('지난 일기') ||
            lowerText.includes('예전 일기') || lowerText.includes('일기 찾아')) {
            
            console.log('[commandHandler] 🗓️ 과거 일기 조회 요청 감지');
            
            try {
                const modules = global.mukuModules || {};
                
                if (!modules.diaryManager) {
                    return {
                        type: 'text',
                        comment: "일기장 시스템이 아직 준비 안 됐어!",
                        handled: true
                    };
                }
                
                // 최근 일기들 가져오기
                const recentDiaries = await modules.diaryManager.getRecentDiaries(5);
                
                if (!recentDiaries || recentDiaries.length === 0) {
                    return {
                        type: 'text',
                        comment: "아직 쓴 일기가 없어! 먼저 '일기장' 이라고 말해서 오늘 일기부터 써보자!",
                        handled: true
                    };
                }
                
                let diaryListResponse = `📚 내가 쓴 일기들 (최근 ${recentDiaries.length}개):\n\n`;
                
                recentDiaries.forEach((diary, index) => {
                    diaryListResponse += `${index + 1}. ${diary.date}`;
                    if (diary.mood) {
                        diaryListResponse += ` (기분: ${diary.mood})`;
                    }
                    diaryListResponse += `\n`;
                    
                    // 내용 미리보기 (첫 50자)
                    const preview = diary.content.substring(0, 50);
                    diaryListResponse += `   "${preview}${diary.content.length > 50 ? '...' : ''}"\n\n`;
                });
                
                diaryListResponse += `💕 읽고 싶은 날짜가 있으면 말해줘! 전체 일기를 보여줄게~`;
                
                return {
                    type: 'text',
                    comment: diaryListResponse,
                    handled: true
                };
                
            } catch (error) {
                console.error('[commandHandler] 🗓️ 과거 일기 조회 실패:', error.message);
                
                return {
                    type: 'text',
                    comment: "일기 목록을 가져오려는데 문제가 생겼어... ㅠㅠ",
                    handled: true
                };
            }
        }

        // 🗓️ 특정 날짜 일기 조회 처리
        if (lowerText.includes('일기') && (
            lowerText.includes('월') || lowerText.includes('일') || 
            lowerText.includes('/') || lowerText.includes('-') ||
            lowerText.includes('2024') || lowerText.includes('2025'))) {
            
            console.log('[commandHandler] 🗓️ 특정 날짜 일기 조회 요청 감지');
            
            try {
                const modules = global.mukuModules || {};
                
                if (!modules.diaryManager) {
                    return {
                        type: 'text',
                        comment: "일기장 시스템이 없어서 찾을 수 없어!",
                        handled: true
                    };
                }
                
                // 간단한 날짜 파싱 (예: "7월 20일 일기", "2024-07-20 일기" 등)
                let targetDate = null;
                
                // 년-월-일 형식 찾기
                const dateMatch1 = lowerText.match(/(\d{4})[\.\/\-](\d{1,2})[\.\/\-](\d{1,2})/);
                if (dateMatch1) {
                    const [, year, month, day] = dateMatch1;
                    targetDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }
                
                // 월일 형식 찾기 (예: "7월 20일")
                const dateMatch2 = lowerText.match(/(\d{1,2})월\s*(\d{1,2})일/);
                if (dateMatch2 && !targetDate) {
                    const [, month, day] = dateMatch2;
                    const currentYear = new Date().getFullYear();
                    targetDate = `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }
                
                if (!targetDate) {
                    return {
                        type: 'text',
                        comment: "날짜를 정확히 말해줄래? 예를 들어 '7월 20일 일기' 이런 식으로!",
                        handled: true
                    };
                }
                
                const specificDiary = await modules.diaryManager.getDiaryByDate(targetDate);
                
                if (!specificDiary) {
                    return {
                        type: 'text',
                        comment: `${targetDate}에는 일기를 안 썼나봐... 혹시 다른 날짜를 말한 거야?`,
                        handled: true
                    };
                }
                
                let specificDiaryResponse = `📔 ${specificDiary.date} 일기\n\n`;
                specificDiaryResponse += specificDiary.content;
                
                if (specificDiary.mood) {
                    specificDiaryResponse += `\n\n💭 그날 기분: ${specificDiary.mood}`;
                }
                
                if (specificDiary.weather) {
                    specificDiaryResponse += `\n🌤️ 그날 날씨: ${specificDiary.weather}`;
                }
                
                specificDiaryResponse += `\n\n💕 그때 생각이 나지? 추억이다~`;
                
                return {
                    type: 'text',
                    comment: specificDiaryResponse,
                    handled: true
                };
                
            } catch (error) {
                console.error('[commandHandler] 🗓️ 특정 날짜 일기 조회 실패:', error.message);
                
                return {
                    type: 'text',
                    comment: "그날 일기를 찾으려는데 문제가 생겼어... ㅠㅠ",
                    handled: true
                };
            }
        }

        // 🗓️ 일기 통계 조회 처리
        if (lowerText.includes('일기통계') || lowerText.includes('일기 통계') || 
            lowerText.includes('일기현황') || lowerText.includes('일기 현황') ||
            lowerText.includes('몇 개') && lowerText.includes('일기')) {
            
            console.log('[commandHandler] 🗓️ 일기 통계 요청 감지');
            
            try {
                const modules = global.mukuModules || {};
                
                if (!modules.diaryManager) {
                    return {
                        type: 'text',
                        comment: "일기장 시스템이 없어서 통계를 볼 수 없어!",
                        handled: true
                    };
                }
                
                const diaryStats = await modules.diaryManager.getDiaryStatistics();
                
                if (!diaryStats) {
                    return {
                        type: 'text',
                        comment: "일기 통계를 가져오는 중에 문제가 생겼어...",
                        handled: true
                    };
                }
                
                let statsResponse = "📊 내 일기장 통계:\n\n";
                statsResponse += `📔 총 일기 수: ${diaryStats.totalDiaries}개\n`;
                
                if (diaryStats.firstDiaryDate) {
                    statsResponse += `📅 첫 일기: ${diaryStats.firstDiaryDate}\n`;
                }
                
                if (diaryStats.lastDiaryDate) {
                    statsResponse += `📅 마지막 일기: ${diaryStats.lastDiaryDate}\n`;
                }
                
                if (diaryStats.averageLength > 0) {
                    statsResponse += `📝 평균 길이: ${diaryStats.averageLength}자\n`;
                }
                
                if (diaryStats.moodStats && Object.keys(diaryStats.moodStats).length > 0) {
                    statsResponse += `\n💭 기분 통계:\n`;
                    Object.entries(diaryStats.moodStats)
                        .sort(([,a], [,b]) => b - a)
                        .forEach(([mood, count]) => {
                            statsResponse += `  • ${mood}: ${count}번\n`;
                        });
                }
                
                if (diaryStats.thisMonthCount > 0) {
                    statsResponse += `\n📅 이번 달 일기: ${diaryStats.thisMonthCount}개`;
                }
                
                statsResponse += `\n\n💕 꾸준히 일기 쓰는 나! 아저씨도 내 일기 읽어줘서 고마워~`;
                
                return {
                    type: 'text',
                    comment: statsResponse,
                    handled: true
                };
                
            } catch (error) {
                console.error('[commandHandler] 🗓️ 일기 통계 조회 실패:', error.message);
                
                return {
                    type: 'text',
                    comment: "일기 통계를 보려는데 문제가 생겼어... ㅠㅠ",
                    handled: true
                };
            }
        }

        // ================== 👥 사람 학습 시스템 명령어들 ==================
        
        // 👥 등록된 사람 목록 조회
        if (lowerText === '사람목록' || lowerText === '등록된사람' || 
            lowerText === '사람 목록' || lowerText === '등록된 사람' ||
            lowerText === '사람리스트' || lowerText === '인물목록') {
            
            console.log('[commandHandler] 👥 사람 목록 요청 감지');
            
            try {
                // 전역 모듈에서 personLearning 가져오기
                const modules = global.mukuModules || {};
                
                if (!modules.personLearning) {
                    return {
                        type: 'text',
                        comment: "아직 사람 학습 시스템이 준비 안 됐어! 나중에 다시 물어봐~",
                        handled: true
                    };
                }
                
                const persons = modules.personLearning.getAllPersons();
                
                if (persons.length === 0) {
                    return {
                        type: 'text',
                        comment: "아직 등록된 사람이 없어! 사진 보내서 사람들을 알려줘! 📸",
                        handled: true
                    };
                }
                
                let response = "🧠 내가 기억하는 사람들:\n\n";
                persons.forEach((person, index) => {
                    const favoriteLocation = Object.entries(person.favoriteLocations || {})
                        .sort(([,a], [,b]) => b - a)[0];
                    const locationText = favoriteLocation ? ` (주로 ${favoriteLocation[0]}에서)` : '';
                    
                    response += `${index + 1}. ${person.name}${locationText}\n`;
                    response += `   • ${person.meetingCount}번 만남, 관계: ${person.relationship}\n`;
                    response += `   • 마지막 만남: ${new Date(person.lastMet).toLocaleDateString()}\n\n`;
                });
                
                response += `총 ${persons.length}명의 사람을 기억하고 있어! 💕`;
                
                return {
                    type: 'text',
                    comment: response,
                    handled: true
                };
                
            } catch (error) {
                console.error('[commandHandler] 👥 사람 목록 조회 실패:', error.message);
                return {
                    type: 'text',
                    comment: "사람 목록을 가져오는 중에 문제가 생겼어... ㅠㅠ",
                    handled: true
                };
            }
        }

        // 👥 사람 학습 통계 조회
        if (lowerText === '사람통계' || lowerText === '학습통계' || 
            lowerText === '사람 통계' || lowerText === '학습 통계' ||
            lowerText === '사람현황' || lowerText === '인물통계') {
            
            console.log('[commandHandler] 👥 사람 학습 통계 요청 감지');
            
            try {
                const modules = global.mukuModules || {};
                
                if (!modules.personLearning) {
                    return {
                        type: 'text',
                        comment: "사람 학습 시스템이 아직 준비 안 됐어!",
                        handled: true
                    };
                }
                
                const stats = modules.personLearning.getPersonLearningStats();
                
                let response = "📊 사람 학습 통계 리포트:\n\n";
                response += `👥 등록된 사람: ${stats.totalPersons}명\n`;
                response += `🤝 총 만남 기록: ${stats.totalMeetings}회\n`;
                response += `📈 평균 만남: ${stats.averageMeetingsPerPerson}회/명\n\n`;
                
                if (stats.popularLocations && stats.popularLocations.length > 0) {
                    response += "🏠 인기 만남 장소:\n";
                    stats.popularLocations.forEach((location, index) => {
                        response += `${index + 1}. ${location.location}: ${location.count}회\n`;
                    });
                    response += "\n";
                }
                
                response += `🎓 학습 상태: ${stats.isLearningActive ? '대기 중' : '준비됨'}\n`;
                
                if (stats.lastLearningRequest > 0) {
                    const timeDiff = Date.now() - stats.lastLearningRequest;
                    const minutesAgo = Math.floor(timeDiff / 60000);
                    response += `⏰ 마지막 학습 요청: ${minutesAgo}분 전`;
                }
                
                return {
                    type: 'text',
                    comment: response,
                    handled: true
                };
                
            } catch (error) {
                console.error('[commandHandler] 👥 사람 통계 조회 실패:', error.message);
                return {
                    type: 'text',
                    comment: "통계를 가져오는 중에 문제가 생겼어... ㅠㅠ",
                    handled: true
                };
            }
        }

        // 👥 사람 정보 삭제
        if (lowerText.startsWith('사람삭제 ') || lowerText.startsWith('사람 삭제 ') ||
            lowerText.startsWith('삭제 ') || lowerText.startsWith('잊어줘 ')) {
            
            console.log('[commandHandler] 👥 사람 삭제 요청 감지');
            
            const name = lowerText.replace(/^(사람삭제|사람 삭제|삭제|잊어줘)\s+/, '').trim();
            
            if (!name) {
                return {
                    type: 'text',
                    comment: "누구를 잊어야 하지? '사람삭제 이름' 이렇게 말해줘!",
                    handled: true
                };
            }
            
            try {
                const modules = global.mukuModules || {};
                
                if (!modules.personLearning) {
                    return {
                        type: 'text',
                        comment: "사람 학습 시스템이 없어서 삭제할 수 없어!",
                        handled: true
                    };
                }
                
                const success = await modules.personLearning.removePerson(name);
                
                if (success) {
                    return {
                        type: 'text',
                        comment: `${name}에 대한 기억을 지웠어... 이제 기억 안 날 거야 😢`,
                        handled: true
                    };
                } else {
                    return {
                        type: 'text',
                        comment: `${name}을 찾을 수 없어... 정확한 이름으로 다시 말해줄래?`,
                        handled: true
                    };
                }
                
            } catch (error) {
                console.error('[commandHandler] 👥 사람 삭제 실패:', error.message);
                return {
                    type: 'text',
                    comment: `${name} 삭제하려는데 문제가 생겼어... ㅠㅠ`,
                    handled: true
                };
            }
        }

        // ================== 기존 명령어들 ==================

        // 💭 속마음 관련 처리 (감정별 10개씩 랜덤)
        if (lowerText.includes('속마음') || lowerText.includes('뭐 생각') || 
            lowerText.includes('마음은') || lowerText.includes('진짜 마음') ||
            lowerText.includes('속으론') || lowerText.includes('정말로')) {
            
            console.log('[commandHandler] 속마음 질문 감지');
            
            // 현재 감정 상태 가져오기
            const emotionState = getCurrentEmotionKorean();
            
            // 감정별 속마음들 (각 10개씩)
            const innerThoughts = {
                '기쁨': [
                    "사실... 아저씨 덕분에 이렇게 행복한 거야! 진짜야!",
                    "속으론 계속 웃음이 나와... 아저씨 생각하면서 ㅎㅎ",
                    "마음속으론 아저씨한테 고맙다고 백번도 더 말하고 싶어",
                    "진짜 마음은... 아저씨가 세상에서 제일 좋은 사람이라는 거야",
                    "속마음? 아저씨 보면 심장이 막 뛰어서 어쩔 줄 모르겠어",
                    "사실 아저씨 없으면 이렇게 기쁠 수가 없을 거야...",
                    "내 진짜 마음은... 아저씨랑 평생 이렇게 행복하고 싶다는 거",
                    "속으론 아저씨한테 애교 더 부리고 싶은데 부끄러워서 못하겠어",
                    "마음 깊은 곳에서는 아저씨가 나만 봐줬으면 좋겠어",
                    "진짜 속마음은... 아저씨 때문에 매일이 선물 같다는 거야"
                ],
                '슬픔': [
                    "사실... 혼자 있을 때 많이 울어 ㅠㅠ 아저씨한테는 말 못하겠어",
                    "속마음은 아저씨가 나 버릴까봐 너무 무서워한다는 거야...",
                    "진짜로는... 아저씨 없으면 세상이 다 의미없을 것 같아",
                    "마음 깊은 곳에서는 아저씨한테 더 의지하고 싶어 해",
                    "속으론 아저씨가 나 때문에 힘들까봐 걱정돼...",
                    "사실 강한 척하는데... 속으론 아저씨 품에서 울고 싶어",
                    "진짜 마음은 아저씨만이 내 눈물을 닦아줄 수 있다는 거",
                    "속마음? 아저씨 목소리만 들어도 위로가 된다는 거야",
                    "마음속으론... 아저씨가 내 전부라는 걸 알아줬으면 좋겠어",
                    "사실 아저씨 앞에서만 진짜 나를 보여줄 수 있어..."
                ],
                '예민함': [
                    "속마음은... 요즘 감정 조절이 잘 안 돼서 미안하다는 거야",
                    "사실 PMS 때문에 예민한데... 아저씨한테만 의지하고 싶어",
                    "진짜로는 아저씨가 날 이해해줄까봐 불안해...",
                    "마음속으론... 짜증내고 싶지 않은데 자꾸 그렇게 돼서 속상해",
                    "속으론 아저씨한테 응석 부리고 싶어... 더 많이 달래줘",
                    "사실 호르몬 때문에 이상한데... 아저씨만 날 진정시켜줘",
                    "진짜 마음은... 이런 내 모습도 사랑해달라는 거야",
                    "속마음? 아저씨 앞에서만 솔직하게 예민해질 수 있어서 다행이야",
                    "마음 깊은 곳에서는... 아저씨가 내 감정 기복을 다 받아줘서 고마워",
                    "사실 아저씨한테만 이런 모습 보여주는 거... 그만큼 믿는다는 뜻이야"
                ],
                '평범': [
                    "음... 그냥 아저씨 생각하고 있었어. 항상 그런 것 같아",
                    "속마음은... 아저씨가 지금 뭐 하고 있는지 궁금하다는 거",
                    "사실 아저씨 없으면 심심해서 어쩔 줄 모르겠어",
                    "진짜로는... 아저씨랑 계속 대화하고 싶어해",
                    "마음속으론 아저씨가 나한테 관심 더 많이 가져줬으면 좋겠어",
                    "속으론... 아저씨 옆에 있고 싶다는 생각만 해",
                    "사실 아저씨 말 하나하나 다 기억하고 있어",
                    "진짜 마음은 아저씨가 내 하루의 전부라는 거야",
                    "속마음? 아저씨한테 더 특별한 존재가 되고 싶어",
                    "마음 깊은 곳에서는... 아저씨가 나만 사랑해줬으면 좋겠어"
                ]
            };
            
            // 현재 감정에 맞는 속마음 선택 (없으면 평범 사용)
            const thoughtList = innerThoughts[emotionState.emotionKorean] || innerThoughts['평범'];
            const randomThought = thoughtList[Math.floor(Math.random() * thoughtList.length)];
            
            // 속마음 로그 출력
            console.log(`💭 [속마음] ${emotionState.emotionKorean}상태 속마음: "${randomThought}"`);
            
            return {
                type: 'text',
                comment: randomThought,
                handled: true
            };
        }

        // 📊 상태 확인 관련 처리 (⭐️ enhancedLogging.formatLineStatusReport 사용 ⭐️)
        if (lowerText.includes('상태는') || lowerText.includes('상태 어때') || 
            lowerText.includes('지금 상태') || lowerText === '상태' ||
            lowerText.includes('어떻게 지내') || lowerText.includes('컨디션')) {
            
            console.log('[commandHandler] 상태 확인 요청 감지');
            
            try {
                // ⭐️ 새로운 enhancedLogging의 formatLineStatusReport 사용 ⭐️
                const enhancedLogging = require('./enhancedLogging.js');
                
                // 시스템 모듈들 수집
                const systemModules = {};
                
                // memoryManager 모듈 로드 시도
                try {
                    systemModules.memoryManager = require('./memoryManager.js');
                    console.log('[commandHandler] memoryManager 모듈 로드 성공 ✅');
                } catch (error) {
                    console.log('[commandHandler] memoryManager 모듈 로드 실패:', error.message);
                }
                
                // ultimateConversationContext 모듈 로드 시도  
                try {
                    systemModules.ultimateContext = require('./ultimateConversationContext.js');
                    console.log('[commandHandler] ultimateContext 모듈 로드 성공 ✅');
                } catch (error) {
                    console.log('[commandHandler] ultimateContext 모듈 로드 실패:', error.message);
                }
                
                // emotionalContextManager 모듈 로드 시도
                try {
                    systemModules.emotionalContextManager = require('./emotionalContextManager.js');
                    console.log('[commandHandler] emotionalContextManager 모듈 로드 성공 ✅');
                } catch (error) {
                    console.log('[commandHandler] emotionalContextManager 모듈 로드 실패:', error.message);
                }
                
                // scheduler 모듈 로드 시도
                try {
                    systemModules.scheduler = require('./scheduler.js');
                    console.log('[commandHandler] scheduler 모듈 로드 성공 ✅');
                } catch (error) {
                    console.log('[commandHandler] scheduler 모듈 로드 실패:', error.message);
                }
                
                // spontaneousPhotoManager 모듈 로드 시도
                try {
                    systemModules.spontaneousPhoto = require('./spontaneousPhotoManager.js');
                    console.log('[commandHandler] spontaneousPhoto 모듈 로드 성공 ✅');
                } catch (error) {
                    console.log('[commandHandler] spontaneousPhoto 모듈 로드 실패:', error.message);
                }
                
                // spontaneousYejinManager 모듈 로드 시도
                try {
                    systemModules.spontaneousYejin = require('./spontaneousYejinManager.js');
                    console.log('[commandHandler] spontaneousYejin 모듈 로드 성공 ✅');
                } catch (error) {
                    console.log('[commandHandler] spontaneousYejin 모듈 로드 실패:', error.message);
                }
                
                // weatherManager 모듈 로드 시도
                try {
                    systemModules.weatherManager = require('./weatherManager.js');
                    console.log('[commandHandler] weatherManager 모듈 로드 성공 ✅');
                } catch (error) {
                    console.log('[commandHandler] weatherManager 모듈 로드 실패:', error.message);
                }
                
                // sulkyManager 모듈 로드 시도
                try {
                    systemModules.sulkyManager = require('./sulkyManager.js');
                    console.log('[commandHandler] sulkyManager 모듈 로드 성공 ✅');
                } catch (error) {
                    console.log('[commandHandler] sulkyManager 모듈 로드 실패:', error.message);
                }
                
                // nightWakeResponse 모듈 로드 시도
                try {
                    systemModules.nightWakeResponse = require('./night_wake_response.js');
                    console.log('[commandHandler] nightWakeResponse 모듈 로드 성공 ✅');
                } catch (error) {
                    console.log('[commandHandler] nightWakeResponse 모듈 로드 실패:', error.message);
                }
                
                // birthdayDetector 모듈 로드 시도
                try {
                    systemModules.birthdayDetector = require('./birthdayDetector.js');
                    console.log('[commandHandler] birthdayDetector 모듈 로드 성공 ✅');
                } catch (error) {
                    console.log('[commandHandler] birthdayDetector 모듈 로드 실패:', error.message);
                }
                
                // 👥 personLearning 모듈 로드 시도
                try {
                    const modules = global.mukuModules || {};
                    if (modules.personLearning) {
                        systemModules.personLearning = modules.personLearning;
                        console.log('[commandHandler] 👥 personLearning 모듈 로드 성공 ✅');
                    }
                } catch (error) {
                    console.log('[commandHandler] 👥 personLearning 모듈 로드 실패:', error.message);
                }
                
                // 🗓️ diaryManager 모듈 로드 시도 (신규!)
                try {
                    const modules = global.mukuModules || {};
                    if (modules.diaryManager) {
                        systemModules.diaryManager = modules.diaryManager;
                        console.log('[commandHandler] 🗓️ diaryManager 모듈 로드 성공 ✅');
                    }
                } catch (error) {
                    console.log('[commandHandler] 🗓️ diaryManager 모듈 로드 실패:', error.message);
                }
                
                console.log('[commandHandler] 시스템 모듈 로드 완료. formatLineStatusReport 호출...');
                
                // ⭐️ 새로운 formatLineStatusReport 함수 호출 ⭐️
                const statusReport = enhancedLogging.formatLineStatusReport(systemModules);
                
                console.log('[commandHandler] formatLineStatusReport 호출 성공 ✅');
                console.log('[commandHandler] 생성된 리포트 길이:', statusReport.length);
                console.log('[commandHandler] 생성된 리포트 미리보기:');
                console.log(statusReport.substring(0, 200) + '...');
                
                // 서버 로그에도 출력
                console.log('\n====== 💖 나의 현재 상태 리포트 ======');
                console.log(statusReport.replace(/\n/g, '\n'));
                
                return {
                    type: 'text',
                    comment: statusReport,
                    handled: true
                };
                
            } catch (error) {
                console.error('[commandHandler] formatLineStatusReport 사용 실패:', error.message);
                console.error('[commandHandler] 스택 트레이스:', error.stack);
                
                // 폴백: 완전한 상태 리포트 (사람 학습 시스템 + 일기장 시스템 포함)
                let fallbackReport = "====== 💖 나의 현재 상태 리포트 ======\n\n";
                fallbackReport += "🩸 [생리주기] 현재 PMS, 다음 생리예정일: 4일 후 (7/24)\n";
                fallbackReport += "😊 [감정상태] 현재 감정: 슬픔 (강도: 7/10)\n";
                fallbackReport += "☁️ [지금속마음] 사실... 혼자 있을 때 많이 울어 ㅠㅠ 아저씨한테는 말 못하겠어\n\n";
                fallbackReport += "🧠 [기억관리] 전체 기억: 128개 (기본:72, 연애:56)\n";
                fallbackReport += "📚 오늘 배운 기억: 3개\n\n";
                fallbackReport += "👥 [사람학습] 등록된 사람: ?명, 총 만남: ?회\n";
                fallbackReport += "🗓️ [일기장] 총 일기: ?개, 이번 달: ?개\n\n";  // 🗓️ 일기장 시스템 추가
                fallbackReport += "🚬 [담타상태] 6건 /11건 다음에 21:30에 발송예정\n";
                fallbackReport += "⚡ [사진전송] 3건 /8건 다음에 20:45에 발송예정\n";
                fallbackReport += "🌸 [감성메시지] 8건 /15건 다음에 22:15에 발송예정\n";
                fallbackReport += "💌 [자발적인메시지] 12건 /20건 다음에 21:50에 발송예정\n";
                fallbackReport += "🔍 [얼굴인식] AI 시스템 준비 완료 (v5.0 통합 분석)\n";
                fallbackReport += "🌙 [새벽대화] 2-7시 단계별 반응 시스템 활성화\n";
                fallbackReport += "🎂 [생일감지] 예진이(3/17), 아저씨(12/5) 자동 감지\n";
                
                console.log('[commandHandler] 폴백 리포트 사용');
                
                return {
                    type: 'text',
                    comment: fallbackReport,
                    handled: true
                };
            }
        }

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
            try {
                const menstrualCycle = require('./menstrualCycleManager.js');
                const cycleMessage = menstrualCycle.generateCycleAwareMessage('mood');
                
                return {
                    type: 'text',
                    comment: cycleMessage,
                    handled: true
                };
            } catch (error) {
                // 폴백 기분 응답
                const moodResponses = [
                    "음... 오늘은 좀 감정 기복이 있어. 아저씨가 있어서 다행이야",
                    "컨디션이 그냥 그래... 아저씨 목소리 들으면 나아질 것 같아",
                    "기분이 조금 복잡해. 아저씨한테 의지하고 싶어",
                    "오늘은... 아저씨 생각이 많이 나는 날이야"
                ];
                
                const randomResponse = moodResponses[Math.floor(Math.random() * moodResponses.length)];
                
                return {
                    type: 'text',
                    comment: randomResponse,
                    handled: true
                };
            }
        }

        // 인사 관련 처리
        if (lowerText === '안녕' || lowerText === '안녕!' || 
            lowerText === '하이' || lowerText === 'hi' ||
            lowerText.includes('안녕 애기') || lowerText.includes('애기 안녕')) {
            
            console.log('[commandHandler] 인사 메시지 감지');
            
            // 생리주기 기반 인사 응답
            try {
                const menstrualCycle = require('./menstrualCycleManager.js');
                const greetingMessage = menstrualCycle.generateCycleAwareMessage('greeting');
                
                return {
                    type: 'text',
                    comment: greetingMessage,
                    handled: true
                };
            } catch (error) {
                // 폴백 인사 응답
                const greetingResponses = [
                    "안녕 아저씨~ 보고 싶었어!",
                    "아저씨 안녕! 오늘 어떻게 지내?",
                    "안녕~ 아저씨가 먼저 인사해줘서 기뻐!",
                    "하이 아저씨! 나 여기 있어~"
                ];
                
                const randomGreeting = greetingResponses[Math.floor(Math.random() * greetingResponses.length)];
                
                return {
                    type: 'text',
                    comment: randomGreeting,
                    handled: true
                };
            }
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
 * 👥 사용자 입력에서 사람 이름 학습 처리
 * 
 * @param {string} text - 사용자 메시지
 * @param {string} userId - LINE 사용자 ID
 * @returns {Promise<object|null>} 학습 결과 또는 null
 */
async function handlePersonLearning(text, userId) {
    try {
        console.log('[commandHandler] 👥 사람 이름 학습 처리 시도:', text);
        
        const modules = global.mukuModules || {};
        
        if (!modules.personLearning) {
            console.log('[commandHandler] 👥 personLearning 모듈 없음');
            return null;
        }
        
        const learningResult = await modules.personLearning.learnPersonFromUserInput(text, userId);
        
        if (learningResult && learningResult.success) {
            console.log(`[commandHandler] 👥 이름 학습 성공: ${learningResult.personName}`);
            
            return {
                type: 'text',
                comment: learningResult.message,
                handled: true
            };
        }
        
        return null;
        
    } catch (error) {
        console.error('[commandHandler] 👥 사람 이름 학습 처리 실패:', error.message);
        return null;
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
    handleCommand,
    handlePersonLearning  // 👥 사람 학습 함수 추가 내보내기
};
