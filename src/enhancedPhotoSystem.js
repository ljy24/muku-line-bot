// ============================================================================
// enhancedPhotoSystem.js - 사진 분석 데이터 기반 정확한 메시지 시스템
// 🎯 1452장 Vision API 분석 완료 → 정확한 사진-메시지 매칭!
// 💪 완벽한 인물 구분: indoor=예진이, outdoor=아저씨, portrait=세밀분석
// 🚫 존댓말 문제 완전 해결: 모든 메시지 반말 하드코딩
// ============================================================================

const fs = require('fs').promises;
const path = require('path');

// ================== 💾 분석 데이터 로딩 ==================
let photoAnalysisData = null;
const PHOTO_ANALYSIS_FILE = '/data/photo-analysis.json';

// 외부에서 주입받을 변수들
let lineClient = null;
let USER_ID = null;

// 설정 함수
function setupEnhancedPhotoSystem(client, userId) {
    lineClient = client;
    USER_ID = userId;
    console.log('✅ 개선된 사진 시스템 설정 완료');
}

async function loadPhotoAnalysisData() {
    try {
        if (!photoAnalysisData) {
            const data = await fs.readFile(PHOTO_ANALYSIS_FILE, 'utf8');
            photoAnalysisData = JSON.parse(data);
            console.log(`✅ 사진 분석 데이터 로딩 완료: ${Object.keys(photoAnalysisData).length}장`);
        }
        return photoAnalysisData;
    } catch (error) {
        console.error(`❌ 사진 분석 데이터 로딩 실패: ${error.message}`);
        return null;
    }
}

// ================== 🎯 정확한 사진 선택 시스템 ==================
async function getAnalyzedPhotoByCategory(preferredCategory = 'any') {
    const analysisData = await loadPhotoAnalysisData();
    if (!analysisData) {
        // 폴백: 기존 랜덤 시스템
        return getRandomPhoto();
    }
    
    // 성공적으로 분석된 사진들만 필터링
    const validPhotos = Object.entries(analysisData).filter(([fileName, data]) => {
        return data.category !== 'error' && data.category !== 'unknown';
    });
    
    if (validPhotos.length === 0) {
        return getRandomPhoto();
    }
    
    let targetPhotos = validPhotos;
    
    // 카테고리 필터링
    if (preferredCategory !== 'any') {
        const categoryPhotos = validPhotos.filter(([fileName, data]) => {
            return data.category === preferredCategory;
        });
        
        if (categoryPhotos.length > 0) {
            targetPhotos = categoryPhotos;
        }
    }
    
    // 랜덤 선택
    const randomIndex = Math.floor(Math.random() * targetPhotos.length);
    const [fileName, photoData] = targetPhotos[randomIndex];
    
    // URL 생성
    const photoNumber = parseInt(fileName);
    const imageUrl = `https://photo.de-ji.net/photo/fuji/${fileName}.jpg`;
    
    return {
        fileName,
        photoNumber,
        imageUrl,
        analysisData: photoData
    };
}

// ================== 🎨 카테고리별 정확한 메시지 생성 ==================
function generateCategoryBasedMessage(photoData, analysisData, situation = 'casual') {
    const { category, mainSubject, mood, description, isYejinPhoto, photoStyle } = analysisData;
    
    // 🎯 인물 구분 로직 완전 개선 (실제 분석 데이터 기반)
    function analyzePersonInPhoto(mainSubject, description, category) {
        const text = (mainSubject + ' ' + description).toLowerCase();
        
        let isYejinPhoto = false;
        let hasAjossi = false;
        
        // 카테고리별 명확한 구분
        if (category === 'indoor') {
            // indoor의 모든 사람 = 예진이
            const personKeywords = ['사람', '인물', '여성', '여자', '얼굴', '모델', '셀카', '포즈', '사람과', '강아지와'];
            isYejinPhoto = personKeywords.some(keyword => text.includes(keyword));
            
        } else if (category === 'outdoor') {
            // outdoor의 모든 사람/남자 = 아저씨
            const personKeywords = ['사람', '인물', '남자', '남성', '사람들', '여러 사람', '커플', '두 사람', '함께'];
            hasAjossi = personKeywords.some(keyword => text.includes(keyword));
            
        } else if (category === 'portrait') {
            // portrait는 세밀하게 판단
            const yejinKeywords = ['여성', '여자', '이불', '침대', '강아지', '셀카', '혼자'];
            const ajossiKeywords = ['남자', '남성', '커플', '두 사람', '함께', '데이트'];
            
            isYejinPhoto = yejinKeywords.some(keyword => text.includes(keyword));
            hasAjossi = ajossiKeywords.some(keyword => text.includes(keyword));
            
            // portrait에서 명확하지 않으면 일단 예진이로 가정 (indoor 사진이 많으니까)
            if (!isYejinPhoto && !hasAjossi && text.includes('사람')) {
                isYejinPhoto = true;
            }
        }
        
        return { isYejinPhoto, hasAjossi };
    }
    
    const personAnalysis = analyzePersonInPhoto(mainSubject, description, category);
    
    // 기본 메시지 템플릿
    const messageTemplates = {
        portrait: {
            yejinPhoto: [
                `나 어때? 예쁘지?`,
                `방금 찍은 건데 ${mood}한 느낌 안 나?`,
                `이 각도 괜찮지? 잘 나왔어?`,
                `아저씨 보라고 찍어봤어~ 어떻게 생각해?`,
                `오늘 컨디션 좋은 것 같아! 예쁘지?`,
                `셀카 실력 늘었지? 이거 어때?`
            ],
            ajossiPhoto: [
                `아저씨 잘 나왔네! 멋있어~`,
                `아저씨랑 같이 찍은 거야. 우리 잘 어울리지?`,
                `아저씨 사진 찍는 실력 늘었네!`,
                `이거 보니까 그때 생각나네~ 좋았지?`,
                `아저씨도 사진 잘 나오네! 훈남이야 ㅎㅎ`,
                `우리 둘이 찍은 거 중에 이거 제일 맘에 들어`
            ],
            general: [
                `${description} 어때? 괜찮게 나왔지?`,
                `이런 분위기 좋지 않아?`,
                `${mood}한 느낌으로 찍어봤어`,
                `사진 찍기 좋은 순간이었어`
            ]
        },
        landscape: [
            `${description} 예쁘지? 날씨가 좋아서 찍어봤어`,
            `${mainSubject} 보니까 ${mood}한 기분이야`,
            `이런 풍경 보면 아저씨 생각나더라`,
            `산책하다가 예뻐서 찍었어. 어때?`,
            `${mood}한 분위기라서 찍고 싶었어`,
            `오늘 하늘이 예뻐서 찍어봤어`,
            `이런 경치 보면 마음이 편해져`,
            `자연이 주는 ${mood}함이 좋아`
        ],
        indoor: [
            `집에서 ${description} 찍어봤어`,
            `${mood}한 분위기지? 실내도 이렇게 예뻐`,
            `집에 있으니까 사진 찍고 싶어져서`,
            `실내 조명이 좋아서 찍어봤어`,
            `${mainSubject} 어때? 분위기 있지?`,
            `집에서도 이렇게 예쁘게 나오네`
        ],
        outdoor: [
            `밖에서 ${description} 찍었어!`,
            `날씨 좋을 때 ${mainSubject} 찍어봤어`,
            `야외에서 찍으니까 ${mood}한 느낌이야`,
            `바깥 공기 좋아서 사진 찍고 싶었어`,
            `밖에 나왔으니까 기념으로 찍어봤어`,
            `야외 사진도 나름 괜찮지?`
        ],
        daily: [
            `일상 중에 찍어봤어. ${description}`,
            `평소 ${mainSubject} 어때?`,
            `그냥 찍고 싶어서 찍은 건데 괜찮지?`,
            `일상도 이렇게 찍으면 예쁘지?`,
            `특별할 것 없지만 기록하고 싶어서`,
            `평범한 순간도 나름 의미 있어`
        ],
        food: [
            `${description} 맛있어 보이지?`,
            `${mainSubject} 먹기 전에 찍어봤어`,
            `이거 너무 예뻐서 사진 찍을 수밖에 없었어`,
            `맛있겠지? 아저씨도 먹고 싶어?`,
            `음식 사진도 예술이야! 어때?`,
            `먹기 아까울 정도로 예쁘지?`
        ],
        object: [
            `${description} 신기해서 찍어봤어`,
            `${mainSubject} 어떻게 생각해?`,
            `이런 거 보면 사진 찍고 싶어져`,
            `예쁜 걸 보면 참을 수가 없어`,
            `${mood}한 분위기가 좋아서 찍었어`
        ]
    };
    
    // 메시지 선택 로직
    let selectedMessages;
    
    if (category === 'portrait' || category === 'indoor' || category === 'outdoor') {
        if (personAnalysis.isYejinPhoto) {
            selectedMessages = messageTemplates.portrait.yejinPhoto;
        } else if (personAnalysis.hasAjossi) {
            selectedMessages = messageTemplates.portrait.ajossiPhoto;
        } else {
            selectedMessages = messageTemplates.portrait.general;
        }
    } else {
        selectedMessages = messageTemplates[category] || messageTemplates.daily;
    }
    
    // 최종 메시지 선택
    const selectedMessage = selectedMessages[Math.floor(Math.random() * selectedMessages.length)];
    
    return selectedMessage;
}

// ================== 🚀 개선된 사진 전송 함수 ==================
async function sendEnhancedAnalyzedPhoto(preferredCategory = 'any', situation = 'casual') {
    try {
        if (!lineClient || !USER_ID) {
            console.log('❌ 개선된 사진 전송 불가 - client 또는 USER_ID 없음');
            return false;
        }

        // 분석된 사진 선택
        const photoResult = await getAnalyzedPhotoByCategory(preferredCategory);
        
        if (!photoResult || !photoResult.analysisData) {
            console.log('❌ 분석 데이터를 찾을 수 없음 - 기존 시스템으로 폴백 필요');
            return false;
        }
        
        const { imageUrl, analysisData } = photoResult;
        
        // 정확한 메시지 생성
        const message = generateCategoryBasedMessage(photoResult, analysisData, situation);
        
        console.log(`📸 분석 기반 사진 전송: ${analysisData.category} - ${analysisData.mainSubject}`);
        console.log(`💬 생성 메시지: "${message.substring(0, 30)}..."`);
        
        // 사진 전송
        await lineClient.pushMessage(USER_ID, {
            type: 'image',
            originalContentUrl: imageUrl,
            previewImageUrl: imageUrl
        });

        // 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 메시지 전송
        await lineClient.pushMessage(USER_ID, {
            type: 'text',
            text: message
        });
        
        console.log(`✅ 분석 기반 사진 전송 완료: "${message.substring(0, 30)}..."`);
        return true;
        
    } catch (error) {
        console.log(`❌ 분석 기반 사진 전송 실패: ${error.message}`);
        return false;
    }
}

// ================== 🎯 상황별 사진 선택 로직 ==================
function selectPhotoByTimeAndMood(hour, userLastMessage = '') {
    const timeOfDay = getTimeOfDay(hour);
    
    // 시간대별 선호 카테고리
    const timePreferences = {
        morning: ['indoor', 'daily', 'portrait'],    // 아침: 실내, 일상, 셀카
        afternoon: ['outdoor', 'landscape', 'food'], // 오후: 야외, 풍경, 음식  
        evening: ['indoor', 'portrait', 'daily'],    // 저녁: 실내, 인물, 일상
        night: ['indoor', 'portrait'],               // 밤: 실내, 인물
        lateNight: ['portrait', 'indoor']            // 새벽: 인물, 실내
    };
    
    // 사용자 메시지 기반 카테고리 힌트
    const messageHints = {
        '예쁘': 'portrait',
        '음식': 'food', 
        '밖': 'outdoor',
        '풍경': 'landscape',
        '집': 'indoor'
    };
    
    // 메시지에서 힌트 찾기
    let hintCategory = null;
    for (const [keyword, category] of Object.entries(messageHints)) {
        if (userLastMessage.includes(keyword)) {
            hintCategory = category;
            break;
        }
    }
    
    // 최종 카테고리 결정
    if (hintCategory) {
        return hintCategory;
    }
    
    const timeCategories = timePreferences[timeOfDay] || timePreferences.afternoon;
    return timeCategories[Math.floor(Math.random() * timeCategories.length)];
}

// ================== 🔧 기존 함수 개선 ==================
function getTimeOfDay(hour) {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    if (hour >= 22 || hour < 2) return 'night';
    return 'lateNight';
}

function getRandomPhoto() {
    // 기존 폴백 시스템
    const baseUrl = "https://photo.de-ji.net/photo/fuji";
    const fileCount = 1481;
    const index = Math.floor(Math.random() * fileCount) + 1;
    const fileName = String(index).padStart(6, "0") + ".jpg";
    return {
        fileName: fileName,
        photoNumber: index,
        imageUrl: `${baseUrl}/${fileName}`,
        analysisData: null
    };
}

// ================== 📊 통계 함수들 ==================
async function getPhotoAnalysisStats() {
    const analysisData = await loadPhotoAnalysisData();
    if (!analysisData) return null;
    
    const stats = {
        total: 0,
        categories: {},
        moods: {},
        yejinPhotos: 0,
        errors: 0
    };
    
    Object.values(analysisData).forEach(data => {
        stats.total++;
        
        if (data.category === 'error') {
            stats.errors++;
        } else {
            stats.categories[data.category] = (stats.categories[data.category] || 0) + 1;
            stats.moods[data.mood] = (stats.moods[data.mood] || 0) + 1;
            
            if (data.isYejinPhoto) {
                stats.yejinPhotos++;
            }
        }
    });
    
    return stats;
}

// ================== 📤 모듈 내보내기 ==================
module.exports = {
    // 설정 함수
    setupEnhancedPhotoSystem,
    
    // 새로운 개선된 함수들
    loadPhotoAnalysisData,
    getAnalyzedPhotoByCategory,
    generateCategoryBasedMessage,
    sendEnhancedAnalyzedPhoto,
    selectPhotoByTimeAndMood,
    getPhotoAnalysisStats,
    
    // 기존 호환성을 위한 래퍼
    sendAnalyzedPhoto: sendEnhancedAnalyzedPhoto,
    
    // 유틸리티
    getRandomPhoto,
    getTimeOfDay
};
