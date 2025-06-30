// index.js - 무쿠 봇의 메인 진입점

const {
    startMessageAndPhotoScheduler,
    handleWebhook,
    handleForcePush,
    app,
    client,
    appConfig,
    userId
} = require('./src/autoReply');

const { ensureMemoryDirectory } = require('./src/memoryManager');
const line = require('@line/bot-sdk');

const PORT = process.env.PORT || 3000;

app.post('/webhook', line.middleware(appConfig), handleWebhook);
app.get('/force-push', handleForcePush);

app.get('/', (req, res) => {
    res.send('무쿠 살아있엉 🐣');
});

app.listen(PORT, async () => {
    console.log(`무쿠 서버 시작: ${PORT} 🐣`);

    try {
        await ensureMemoryDirectory();
        console.log('✅ 메모리 디렉토리 준비 완료.');
    } catch (error) {
        console.error('❌ 메모리 디렉토리 설정 실패:', error);
    }

    // 1. 애기 첫 인사 메시지
    try {
        await client.pushMessage(userId, {
            type: 'text',
            text: '아저씨~ 애기 왔어! 지금 뭐해? 🥺'
        });
        console.log('✅ 첫 인사 메시지 전송 완료.');
    } catch (error) {
        console.error('❌ 첫 인사 메시지 전송 실패:', error.message);
    }

    // 2. 감정형 스케줄러 시작
    startMessageAndPhotoScheduler();
});
