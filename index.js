// ✅ index.js v9.6 - 기억 관리 대시보드 추가

const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
const moment = require('moment-timezone');
const fs = require('fs').promises;
const path = require('path');
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

// JSON 파싱 미들웨어 추가
app.use(express.json());

app.get('/', (_, res) => res.send('예진이 v9.6 살아있어! (기억 관리 대시보드 포함)'));

// ==================== 기억 관리 대시보드 추가 ====================

/**
 * 기억 관리 대시보드 메인 페이지
 */
app.get('/dashboard', (req, res) => {
    const dashboardHTML = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>무쿠(예진이) 기억 관리 대시보드</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                   background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                   min-height: 100vh; color: #333; }
            
            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
            
            .header { text-align: center; color: white; margin-bottom: 30px; }
            .header h1 { font-size: 2.5em; margin-bottom: 10px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
            .header p { font-size: 1.2em; opacity: 0.9; }
            
            .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
                         gap: 20px; margin-bottom: 30px; }
            
            .stat-card { background: rgba(255,255,255,0.95); padding: 20px; border-radius: 15px; 
                        box-shadow: 0 8px 32px rgba(0,0,0,0.1); text-align: center; }
            .stat-card h3 { color: #4a5568; margin-bottom: 10px; }
            .stat-card .number { font-size: 2.5em; font-weight: bold; color: #667eea; }
            .stat-card .label { color: #718096; margin-top: 5px; }
            
            .section { background: rgba(255,255,255,0.95); margin-bottom: 20px; 
                      border-radius: 15px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.1); }
            .section-header { background: #667eea; color: white; padding: 15px 20px; 
                            font-size: 1.2em; font-weight: bold; }
            .section-content { padding: 20px; max-height: 400px; overflow-y: auto; }
            
            .memory-item { padding: 15px; border-bottom: 1px solid #e2e8f0; display: flex; 
                          justify-content: space-between; align-items: center; }
            .memory-item:last-child { border-bottom: none; }
            .memory-content { flex: 1; }
            .memory-text { font-weight: 500; margin-bottom: 5px; }
            .memory-meta { font-size: 0.9em; color: #718096; }
            .memory-actions { display: flex; gap: 10px; }
            
            .btn { padding: 8px 15px; border: none; border-radius: 8px; cursor: pointer; 
                  font-size: 0.9em; transition: all 0.3s ease; }
            .btn-delete { background: #e53e3e; color: white; }
            .btn-delete:hover { background: #c53030; }
            .btn-refresh { background: #38a169; color: white; }
            .btn-refresh:hover { background: #2f855a; }
            
            .log-item { padding: 10px 15px; border-left: 4px solid #667eea; 
                       margin-bottom: 10px; background: #f7fafc; }
            .log-time { font-size: 0.8em; color: #718096; }
            .log-content { margin-top: 5px; }
            
            .auto-refresh { text-align: center; margin-bottom: 20px; }
            .status-indicator { display: inline-block; width: 10px; height: 10px; 
                              border-radius: 50%; margin-right: 8px; }
            .status-online { background: #38a169; }
            .status-offline { background: #e53e3e; }
            
            @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
            .loading { animation: pulse 1.5s infinite; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>💕 무쿠(예진이) 기억 관리 대시보드</h1>
                <p>아저씨와의 소중한 기억들을 실시간으로 관리해요</p>
            </div>
            
            <div class="auto-refresh">
                <span class="status-indicator status-online"></span>
                <span id="status">실시간 모니터링 중...</span>
                <button class="btn btn-refresh" onclick="refreshAll()">🔄 새로고침</button>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>📝 총 저장된 기억</h3>
                    <div class="number" id="totalMemories">-</div>
                    <div class="label">개</div>
                </div>
                <div class="stat-card">
                    <h3>📅 오늘 추가된 기억</h3>
                    <div class="number" id="todayMemories">-</div>
                    <div class="label">개</div>
                </div>
                <div class="stat-card">
                    <h3>🗑️ 삭제된 기억</h3>
                    <div class="number" id="deletedMemories">-</div>
                    <div class="label">개</div>
                </div>
                <div class="stat-card">
                    <h3>⏰ 마지막 업데이트</h3>
                    <div class="number" style="font-size: 1.2em;" id="lastUpdate">-</div>
                    <div class="label">시간</div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-header">📚 저장된 기억 목록</div>
                <div class="section-content" id="memoriesList">
                    <div class="loading">기억 목록을 불러오는 중...</div>
                </div>
            </div>
            
            <div class="section">
                <div class="section-header">📋 실시간 기억 로그</div>
                <div class="section-content" id="memoryLogs">
                    <div class="loading">로그를 불러오는 중...</div>
                </div>
            </div>
        </div>
        
        <script>
            let autoRefreshInterval;
            
            // 페이지 로드 시 초기화
            document.addEventListener('DOMContentLoaded', function() {
                refreshAll();
                startAutoRefresh();
            });
            
            // 자동 새로고침 시작
            function startAutoRefresh() {
                autoRefreshInterval = setInterval(refreshAll, 10000); // 10초마다
            }
            
            // 전체 새로고침
            async function refreshAll() {
                document.getElementById('status').textContent = '업데이트 중...';
                
                try {
                    await Promise.all([
                        loadStats(),
                        loadMemories(),
                        loadLogs()
                    ]);
                    
                    document.getElementById('status').textContent = '실시간 모니터링 중...';
                    document.getElementById('lastUpdate').textContent = 
                        new Date().toLocaleTimeString('ko-KR');
                } catch (error) {
                    console.error('새로고침 실패:', error);
                    document.getElementById('status').textContent = '업데이트 실패';
                }
            }
            
            // 통계 로드
            async function loadStats() {
                const response = await fetch('/api/memory-stats');
                const stats = await response.json();
                
                document.getElementById('totalMemories').textContent = stats.total;
                document.getElementById('todayMemories').textContent = stats.today;
                document.getElementById('deletedMemories').textContent = stats.deleted;
            }
            
            // 기억 목록 로드
            async function loadMemories() {
                const response = await fetch('/api/memories');
                const memories = await response.json();
                
                const container = document.getElementById('memoriesList');
                
                if (memories.length === 0) {
                    container.innerHTML = '<p style="text-align: center; color: #718096;">아직 저장된 기억이 없어요 😊</p>';
                    return;
                }
                
                container.innerHTML = memories.map(memory => \`
                    <div class="memory-item">
                        <div class="memory-content">
                            <div class="memory-text">"\${memory.content}"</div>
                            <div class="memory-meta">
                                \${memory.date} | 감정: \${memory.emotion || '일반'} | 중요도: \${memory.significance || '보통'}
                            </div>
                        </div>
                        <div class="memory-actions">
                            <button class="btn btn-delete" onclick="deleteMemory('\${encodeURIComponent(memory.content)}')">
                                🗑️ 삭제
                            </button>
                        </div>
                    </div>
                \`).join('');
            }
            
            // 로그 로드
            async function loadLogs() {
                const response = await fetch('/api/memory-logs');
                const logs = await response.json();
                
                const container = document.getElementById('memoryLogs');
                
                if (logs.length === 0) {
                    container.innerHTML = '<p style="text-align: center; color: #718096;">아직 로그가 없어요</p>';
                    return;
                }
                
                container.innerHTML = logs.slice(-20).reverse().map(log => \`
                    <div class="log-item">
                        <div class="log-time">\${log.timestamp}</div>
                        <div class="log-content">
                            <strong>\${log.action}</strong>: \${log.content}
                        </div>
                    </div>
                \`).join('');
            }
            
            // 기억 삭제
            async function deleteMemory(content) {
                if (!confirm('정말로 이 기억을 삭제하시겠습니까?')) return;
                
                try {
                    const response = await fetch('/api/delete-memory', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ content: decodeURIComponent(content) })
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                        alert('기억이 삭제되었습니다!');
                        refreshAll();
                    } else {
                        alert('삭제 실패: ' + result.message);
                    }
                } catch (error) {
                    alert('삭제 중 오류가 발생했습니다.');
                }
            }
        </script>
    </body>
    </html>`;
    
    res.send(dashboardHTML);
});

/**
 * API: 기억 통계 정보
 */
app.get('/api/memory-stats', async (req, res) => {
    try {
        const state = conversationContext.getInternalState();
        const memories = state.knowledgeBase.loveHistory.categories?.general || [];
        
        // 오늘 추가된 기억 계산
        const today = moment().tz('Asia/Tokyo').format('YYYY-MM-DD');
        const todayMemories = memories.filter(memory => 
            memory.date && memory.date.startsWith(today)
        ).length;
        
        // 삭제된 기억 수 (임시로 0, 실제로는 별도 카운터 필요)
        const deletedCount = 0;
        
        res.json({
            total: memories.length,
            today: todayMemories,
            deleted: deletedCount
        });
    } catch (error) {
        console.error('[Dashboard] 통계 조회 실패:', error);
        res.status(500).json({ error: '통계를 불러오는데 실패했습니다.' });
    }
});

/**
 * API: 기억 목록 조회
 */
app.get('/api/memories', async (req, res) => {
    try {
        const state = conversationContext.getInternalState();
        const memories = state.knowledgeBase.loveHistory.categories?.general || [];
        
        // 최신순으로 정렬
        const sortedMemories = memories
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 50); // 최대 50개만
        
        res.json(sortedMemories);
    } catch (error) {
        console.error('[Dashboard] 기억 목록 조회 실패:', error);
        res.status(500).json({ error: '기억 목록을 불러오는데 실패했습니다.' });
    }
});

/**
 * API: 기억 로그 조회
 */
app.get('/api/memory-logs', async (req, res) => {
    try {
        // 메모리에서 최근 로그 생성 (실제로는 파일에서 읽어올 수도 있음)
        const state = conversationContext.getInternalState();
        const memories = state.knowledgeBase.loveHistory.categories?.general || [];
        
        const logs = memories.slice(-20).map(memory => ({
            timestamp: moment(memory.date).format('YYYY-MM-DD HH:mm:ss'),
            action: '기억 추가',
            content: memory.content.length > 50 ? 
                     memory.content.substring(0, 50) + '...' : 
                     memory.content
        }));
        
        res.json(logs);
    } catch (error) {
        console.error('[Dashboard] 로그 조회 실패:', error);
        res.status(500).json({ error: '로그를 불러오는데 실패했습니다.' });
    }
});

/**
 * API: 기억 삭제
 */
app.post('/api/delete-memory', async (req, res) => {
    try {
        const { content } = req.body;
        
        if (!content) {
            return res.status(400).json({ 
                success: false, 
                message: '삭제할 기억 내용이 필요합니다.' 
            });
        }
        
        const state = conversationContext.getInternalState();
        const memories = state.knowledgeBase.loveHistory.categories?.general || [];
        
        // 일치하는 기억 찾기
        const index = memories.findIndex(memory => 
            memory.content === content || 
            memory.content.includes(content) || 
            content.includes(memory.content)
        );
        
        if (index === -1) {
            return res.json({ 
                success: false, 
                message: '해당 기억을 찾을 수 없습니다.' 
            });
        }
        
        // 기억 삭제
        const deletedMemory = memories.splice(index, 1)[0];
        
        // 파일에 저장
        const LOVE_HISTORY_FILE = path.join(process.cwd(), 'memory', 'love-history.json');
        await fs.writeFile(
            LOVE_HISTORY_FILE, 
            JSON.stringify(state.knowledgeBase.loveHistory, null, 2), 
            'utf8'
        );
        
        console.log(`[Dashboard] 🗑️ 기억 삭제: ${deletedMemory.content}`);
        
        res.json({ 
            success: true, 
            message: '기억이 성공적으로 삭제되었습니다.',
            deletedContent: deletedMemory.content
        });
        
    } catch (error) {
        console.error('[Dashboard] 기억 삭제 실패:', error);
        res.status(500).json({ 
            success: false, 
            message: '기억 삭제 중 오류가 발생했습니다.' 
        });
    }
});

// ==================== 기존 LINE 웹훅 코드 ====================

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

// ==================== 감성 로그 시스템 (기존 코드) ====================

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

async function initMuku() {
    try {
        await conversationContext.initializeEmotionalSystems();
        await initializeDamta();
        startAllSchedulers(client, userId);
        startSpontaneousPhotoScheduler(client, userId, () => conversationContext.getInternalState().timingContext.lastUserMessageTime);

        // 감성적인 '마음 일기' 로그 시스템
        setInterval(() => {
            conversationContext.processTimeTick();
            
            const internalState = conversationContext.getInternalState();
            const schedulerStatus = getSchedulerStatus();
            const photoStatus = getPhotoSchedulerStatus();
            const innerThought = conversationContext.generateInnerThought();
            
            const now = moment().tz('Asia/Tokyo').format('YYYY년 MM월 DD일 HH시 mm분');
            const emotionalLog = generateEmotionalLogEntry(internalState, schedulerStatus, photoStatus, innerThought);

            console.log("\n" + `🕐 ${now}`);
            console.log(emotionalLog);

        }, 60 * 1000);
    } catch (error) {
        console.error('❌ 초기화 중 심각한 에러 발생:', error);
        process.exit(1);
    }
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`예진이 v9.6 서버 스타트! 포트: ${PORT}`);
    console.log(`🌐 기억 관리 대시보드: https://your-render-url.onrender.com/dashboard`);
    initMuku();
});
