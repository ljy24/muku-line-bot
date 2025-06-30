// index.js - 무쿠 봇의 메인 진입점

// autoReply 모듈에서 필요한 모든 함수와 객체들을 불러옵니다.
// 특히 'app' 객체를 여기서 받아와야 Express 서버를 설정할 수 있습니다.
const {
    startMessageAndPhotoScheduler,
    handleWebhook,
    handleForcePush,
    app, // <-- autoReply.js에서 내보낸 Express app 인스턴스
    client, // Line 클라이언트 (webhook 핸들러 내부에서 사용됨)
    appConfig, // Line 미들웨어 설정
    userId // 푸시 메시지 전송용 사용자 ID
} = require('./src/autoReply');

// memoryManager 모듈에서 ensureMemoryDirectory 함수를 불러옵니다.
const { ensureMemoryDirectory } = require('./src/memoryManager'); // 메모리 디렉토리 보장 함수

const line = require('@line/bot-sdk'); // LINE Bot SDK 불러오기

// 환경 변수에서 포트 번호를 가져오거나 기본값 3000 사용
const PORT = process.env.PORT || 3000;

// LINE 미들웨어 설정
// webhook 이벤트를 처리하기 위해 LINE 미들웨어를 사용합니다.
// 이전에 autoReply.js에서 정의한 appConfig를 사용합니다.
app.post('/webhook', line.middleware(appConfig), handleWebhook);

// 아저씨가 웹 브라우저를 통해 특정 메시지를 강제로 보내고 싶을 때 사용
app.get('/force-push', handleForcePush);

// 봇이 살아있는지 확인하는 루트 경로
app.get('/', (req, res) => {
    res.send('무쿠 살아있엉 🐣');
});

// 서버 시작
// Persistent Disk 사용을 위해 ensureMemoryDirectory를 먼저 호출합니다.
app.listen(PORT, async () => {
    console.log(`무쿠 서버 시작: ${PORT} 🐣`);

    try {
        await ensureMemoryDirectory(); // 메모리 저장 디렉토리 존재 확인 및 생성
        console.log('✅ 메모리 디렉토리 준비 완료.');
    } catch (error) {
        console.error('❌ 메모리 디렉토리 설정 실패:', error);
        // 디렉토리 생성 실패 시에도 서버는 계속 실행되도록 하지만, 로그를 남깁니다.
    }

    // 스케줄러 시작
    startMessageAndPhotoScheduler();
});
