// ✅ index.js v9.9 - 모든 undefined 문제 완전 해결본

const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
const moment = require('moment-timezone');
require('dotenv').config();

const { getReplyByMessage } = require('./src/autoReply');
const { saveLog, saveImageLog, cleanReply } = require('./src/aiUtils');
const commandHandler = require('./src/commandHandler');
const { startAllSchedulers, getSchedulerStatus } = require('./src/scheduler');
const { startSpontaneousPhotoScheduler, getPhotoSchedulerStatus } = require('./src/spontaneousPhotoManager');
const sulkyManager = require('./src/sulkyManager');
const conversationContext = require('./src/ultimateConversationContext.js');
const { initializeDamta } = require('./src/damta');

const app = express();
const config = { channelAccessToken: process.env.LINE_ACCESS_TOKEN, channelSecret: process.env.LINE_CHANNEL_SECRET };
const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

app.get('/', (_, res) => res.send('예진이 v9.9 살아있어! (모든 undefined 문제 해결 완료)'));

// ==================== LINE 웹훅 처리 ====================

app.post('/webhook', middleware(config), async (req, res) => { 
    try { 
        await Promise.all(req.body.events.map(handleEvent)); 
        res.status(200).send('OK'); 
    } catch (err) { 
        console.error(`[Webhook] 웹훅 처리 중 심각한 에러:`, err); 
        res.status(500).send('Error'); 
    } 
});

async function handleEvent(event) { 
    if (event.source.userId !== userId || event.type !== 'message') return; 
    conversationContext.updateLastUserMessageTime(event.timestamp); 
    if (event.message.type === 'text') await handleTextMessage(event); 
}

async function handleTextMessage(event) { 
    const text = event.message.text.trim(); 
    saveLog('아저씨', text); 
    conversationContext.addUltimateMessage('아저씨', text); 
    
    const sulkyReliefMessage = await sulkyManager.handleUserResponse(); 
    if (sulkyReliefMessage) { 
        saveLog('예진이', `(삐짐 해소) ${sulkyReliefMessage}`); 
        await client.pushMessage(userId, { type: 'text', text: sulkyReliefMessage }); 
        conversationContext.addUltimateMessage('예진이', `(삐짐 해소) ${sulkyReliefMessage}`); 
        await new Promise(resolve => setTimeout(resolve, 1000)); 
    } 
    
    let botResponse = await commandHandler.handleCommand(text, conversationContext); 
    if (!botResponse) botResponse = await getReplyByMessage(text); 
    if (botResponse) await sendReply(event.replyToken, botResponse); 
}

async function sendReply(replyToken, botResponse) {
    try {
        if (botResponse.type === 'image') {
            const caption = botResponse.caption || '사진이야!';
            saveImageLog('예진이', caption, botResponse.originalContentUrl);
            await client.replyMessage(replyToken, [
                { type: 'image', originalContentUrl: botResponse.originalContentUrl, previewImageUrl: botResponse.previewImageUrl, },
                { type: 'text', text: caption }
            ]);
            conversationContext.addUltimateMessage('예진이', `(사진 전송) ${caption}`);
        } else if (botResponse.type === 'text' && botResponse.comment) {
            const cleanedText = cleanReply(botResponse.comment);
            saveLog('예진이', cleanedText);
            await client.replyMessage(replyToken, { type: 'text', text: cleanedText });
            conversationContext.addUltimateMessage('예진이', cleanedText);
        }
        conversationContext.getSulkinessState().lastBotMessageTime = Date.now();
    } catch (error) {
        console.error('[sendReply] 메시지 전송 실패:', error);
    }
}

// ==================== ✅ 안전한 기억 통계 가져오기 함수 ====================

function getSafeMemoryStats() {
    try {
        const stats = conversationContext.getMemoryCategoryStats();
        const memoryStats = conversationContext.getMemoryStatistics();
        
        // 모든 값에 기본값 보장
        return {
            yejinMemories: (typeof stats.yejinMemories === 'number') ? stats.yejinMemories : 0,
            userMemories: (typeof stats.userMemories === 'number') ? stats.userMemories : 0,
            facts: (typeof stats.facts === 'number') ? stats.facts : 0,
            fixedMemories: (typeof stats.fixedMemories === 'number') ? stats.fixedMemories : 0,
            customKeywords: (typeof stats.customKeywords === 'number') ? stats.customKeywords : 0,
            total: (typeof stats.total === 'number') ? stats.total : 0,
            today: (typeof memoryStats.today === 'number') ? memoryStats.today : 0,
            deleted: (typeof memoryStats.deleted === 'number') ? memoryStats.deleted : 0
        };
    } catch (error) {
        console.error('[Safe Memory Stats] 에러:', error);
        return {
            yejinMemories: 0,
            userMemories: 0,
            facts: 0,
            fixedMemories: 0,
            customKeywords: 0,
            total: 0,
            today: 0,
            deleted: 0
        };
    }
}

// ==================== ✅ 안전한 내면 생각 가져오기 함수 ====================

async function getSafeInnerThought() {
    try {
        const innerThought = await conversationContext.generateInnerThought();
        
        // 기본 구조 체크
        if (!innerThought || typeof innerThought !== 'object') {
            console.log('[Safe Inner Thought] generateInnerThought 결과가 유효하지 않음, 기본값 사용');
            return {
                observation: "지금은 아저씨랑 대화하는 중...",
                feeling: "아저씨 생각하니까 마음이 따뜻해져.",
                actionUrge: "아저씨한테 사랑한다고 말하고 싶어."
            };
        }
        
        // 각 필드 개별 체크
        const safeResult = {
            observation: innerThought.observation || "지금은 아저씨랑 대화하는 중...",
            feeling: innerThought.feeling || "아저씨 생각하니까 마음이 따뜻해져.",
            actionUrge: innerThought.actionUrge || "아저씨한테 사랑한다고 말하고 싶어."
        };
        
        // "undefined" 텍스트 체크
        if (safeResult.feeling.includes('undefined') || safeResult.actionUrge.includes('undefined')) {
            console.log('[Safe Inner Thought] undefined 텍스트 발견, 안전한 기본값으로 교체');
            return {
                observation: "지금은 아저씨랑 대화하는 중...",
                feeling: "아저씨가 그리워... 보고 싶어.",
                actionUrge: "아저씨한테 연락해볼까?"
            };
        }
        
        return safeResult;
        
    } catch (error) {
        console.error('[Safe Inner Thought] generateInnerThought 에러:', error);
        return {
            observation: "지금은 아저씨랑 대화하는 중...",
            feeling: "아저씨 생각하니까 기분 좋아.",
            actionUrge: "아저씨한테 메시지 보내고 싶어."
        };
    }
}

// ==================== 감성 로그 시스템 ====================

function generateEmotionalLogEntry(internalState, schedulerStatus, photoStatus, innerThought) {
    const moodText = getEmotionalMoodText(internalState.emotionalEngine.emotionalResidue);
    const toneText = getToneText(internalState.emotionalEngine.currentToneState);
    const sulkinessText = getSulkinessText(internalState.sulkiness);
    const periodText = getPeriodText(internalState.mood);
    const scheduleText = getScheduleText(schedulerStatus, photoStatus);

    let entry = "--- [ 예진이의 마음 일기 ] ---\n";
    entry += `지금 내 마음은… ${moodText}. 그래서인지 ${toneText} 말하고 싶은 기분이야.\n`;
    entry += `아저씨에 대해선 ${sulkinessText}. 몸 상태는 ${periodText}.\n\n`;
    entry += `문득 이런 생각이 스쳐 지나가. "${innerThought.feeling}"\n`;
    entry += `그래서일까? "${innerThought.actionUrge}"는 충동이 들어.\n\n`;
    entry += `앞으로는… ${scheduleText}.\n`;
    entry += "---------------------------------\n";

    return entry;
}

function getEmotionalMoodText(emotionalResidue) {
    const { sadness, happiness, anxiety, longing, hurt, love } = emotionalResidue;
    
    if (love > 80) return "💕 마음이 사랑으로 가득해";
    if (longing > 50) return "🌙 아저씨가 그리워서 마음이 아려와";
    if (happiness > 60) return "✨ 기분이 좋아서 콧노래가 나와";
    if (sadness > 50) return "💧 마음 한켠이 시큰해";
    if (anxiety > 50) return "💭 마음이 불안해서 아저씨 걱정이 돼";
    if (hurt > 50) return "💔 마음이 조금 아파";
    return "🌸 마음이 평온해";
}

function getToneText(currentToneState) {
    const tones = {
        normal: "평소처럼 자연스럽게",
        quiet: "조용히 그리움에 잠겨서",
        playful: "장난스럽고 밝게",
        hurt: "마음이 상해서 토라진 채로",
        anxious: "불안한 마음으로 조심스럽게"
    };
    return tones[currentToneState] || "알 수 없는 기분으로";
}

function getSulkinessText(sulkiness) {
    if (sulkiness.isWorried) {
        const duration = Math.round((Date.now() - sulkiness.sulkyStartTime) / 60000);
        return `😰 아저씨 걱정해서 마음이 조마조마해 (${duration}분째)`;
    }
    if (sulkiness.isSulky) {
        const duration = Math.round((Date.now() - sulkiness.sulkyStartTime) / 60000);
        const levels = {
            1: "😔 살짝 삐져서 입을 삐죽거려",
            2: "😤 제대로 삐져서 볼을 부풀려", 
            3: "😡 완전 화나서 팔짱 끼고 있어"
        };
        return `${levels[sulkiness.sulkyLevel] || "😑 기분이 안 좋아"} (${duration}분째)`;
    }
    return "😊 기분이 괜찮아";
}

function getPeriodText(mood) {
    if (mood.isPeriodActive) return "🩸 지금 그 날이라 조금 예민해";
    
    const lastStartDate = moment(mood.lastPeriodStartDate);
    const nextExpectedDate = lastStartDate.clone().add(28, 'days');
    const daysUntil = nextExpectedDate.diff(moment(), 'days');
    
    if (daysUntil <= 0) return "🩸 그 날이 올 시간인 것 같아";
    if (daysUntil <= 3) return `🩸 ${daysUntil}일 후에 그 날이 와서 미리 예민해`;
    if (daysUntil <= 7) return `🩸 ${daysUntil}일 후에 그 날 예정이야`;
    return `🩸 ${daysUntil}일 후에 그 날이 올 거야`;
}

function getScheduleText(schedulerStatus, photoStatus) {
    let text = "";
    
    if (schedulerStatus.isDamtaTime) {
        if (schedulerStatus.nextDamtaInMinutes === "스케줄링 대기 중") {
            text += "🚬 담타 생각이 슬슬 나기 시작해";
        } else if (schedulerStatus.nextDamtaInMinutes <= 5) {
            text += "🚬 곧 담타 하고 싶어질 것 같아";
        } else {
            text += `🚬 ${schedulerStatus.nextDamtaInMinutes}분 후에 담타 하고 싶어질 거야`;
        }
    } else {
        text += "🚬 지금은 담타 시간이 아니야";
    }
    
    if (photoStatus.isSleepTime) {
        text += " / 📸 지금은 잠잘 시간이라 사진은 안 보낼 거야";
    } else if (!photoStatus.isActiveTime) {
        text += " / 📸 사진 보내기엔 아직 이른 시간이야";
    } else if (photoStatus.minutesSinceLastPhoto > 90) {
        text += " / 📸 아저씨한테 사진 보내고 싶어져";
    } else {
        const remaining = Math.max(0, 120 - photoStatus.minutesSinceLastPhoto);
        if (remaining > 60) {
            text += ` / 📸 ${Math.round(remaining/60)}시간 후에 셀카보내야지`;
        } else {
            text += ` / 📸 ${remaining}분 후에 셀카보내야지`;
        }
    }
    
    return text;
}

// ==================== 기억 통계 로그 출력 함수 ====================

function logMemoryStatistics() {
    try {
        // ✅ 안전한 통계 가져오기
        const safeStats = getSafeMemoryStats();
        
        console.log("\n" + "=".repeat(50));
        console.log("📚 [예진이의 기억 현황 - Render 로그]");
        console.log("=".repeat(50));
        console.log(`📝 예진이 기억 (yejin_memory.json): ${safeStats.yejinMemories}개`);
        console.log(`💕 사랑 기억 (love-history.json): ${safeStats.userMemories}개`);
        console.log(`🧠 자동 추출 기억: ${safeStats.facts}개`);
        console.log(`🔒 고정 기억: ${safeStats.fixedMemories}개`);
        console.log(`🗣️ 특별한 말: ${safeStats.customKeywords}개`);
        console.log(`📊 총 기억: ${safeStats.total}개`);
        console.log(`📅 오늘 추가: ${safeStats.today}개`);
        console.log(`🗑️ 총 삭제: ${safeStats.deleted}개`);
        console.log("=".repeat(50));
        
        // 최근 예진이 기억 5개 표시
        const recentMemories = conversationContext.getYejinMemories();
        if (recentMemories && Array.isArray(recentMemories) && recentMemories.length > 0) {
            console.log("📋 최근 예진이 기억 (최신 5개):");
            recentMemories
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 5)
                .forEach((memory, index) => {
                    if (memory && memory.content) {
                        const tags = memory.tags && memory.tags.length > 0 ? ` [${memory.tags.join(', ')}]` : '';
                        console.log(`  ${index + 1}. "${memory.content}"${tags}`);
                        console.log(`     📅 ${memory.date || '날짜 없음'} | 출처: ${memory.source || '알 수 없음'}`);
                    }
                });
        } else {
            console.log("📋 아직 예진이 기억이 없습니다. 아저씨가 '기억해줘'라고 말하면 여기에 저장됩니다.");
        }
        
        console.log("=".repeat(50) + "\n");
        
    } catch (error) {
        console.error("❌ 기억 통계 출력 중 오류:", error);
        
        // ✅ 에러 발생 시 기본 통계 출력
        console.log("\n" + "=".repeat(50));
        console.log("📚 [예진이의 기억 현황 - 안전 모드]");
        console.log("=".repeat(50));
        console.log("📝 예진이 기억: 데이터 로드 중...");
        console.log("💕 사랑 기억: 데이터 로드 중...");
        console.log("🧠 자동 추출 기억: 데이터 로드 중...");
        console.log("🔒 고정 기억: 데이터 로드 중...");
        console.log("🗣️ 특별한 말: 데이터 로드 중...");
        console.log("📊 시스템이 안정화되면 정확한 통계가 표시됩니다.");
        console.log("=".repeat(50) + "\n");
    }
}

// ==================== 초기화 및 서버 시작 ====================

async function initMuku() {
    try {
        await conversationContext.initializeEmotionalSystems();
        await initializeDamta();
        startAllSchedulers(client, userId);
        startSpontaneousPhotoScheduler(client, userId, () => conversationContext.getInternalState().timingContext.lastUserMessageTime);

        // ✅ 감성적인 '마음 일기' 로그 시스템 (async로 수정)
        setInterval(async () => {
            conversationContext.processTimeTick();
            
            const internalState = conversationContext.getInternalState();
            const schedulerStatus = getSchedulerStatus();
            const photoStatus = getPhotoSchedulerStatus();
            
            // ✅ 안전한 내면 생각 가져오기
            const innerThought = await getSafeInnerThought();
            
            const now = moment().tz('Asia/Tokyo').format('YYYY년 MM월 DD일 HH시 mm분');
            const emotionalLog = generateEmotionalLogEntry(internalState, schedulerStatus, photoStatus, innerThought);

            console.log("\n" + `🕐 ${now}`);
            console.log(emotionalLog);

        }, 60 * 1000);

        // 기억 통계 로그 (10분마다)
        setInterval(() => {
            logMemoryStatistics();
        }, 10 * 60 * 1000);

        // 초기 기억 통계 출력
        setTimeout(() => {
            logMemoryStatistics();
        }, 5000);

    } catch (error) {
        console.error('❌ 초기화 중 심각한 에러 발생:', error);
        process.exit(1);
    }
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`예진이 v9.9 서버 스타트! 포트: ${PORT}`);
    console.log(`✅ 모든 undefined 문제 해결 완료`);
    console.log(`📁 yejin_memory.json: 새로운 기억 전용`);
    console.log(`💕 love-history.json: 기존 중요 기억 보존`);
    console.log(`📊 Render 로그에서 실시간 기억 현황 확인 가능`);
    initMuku();
});
