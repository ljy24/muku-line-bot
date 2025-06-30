// ✅ index.js - 무쿠 LINE 서버 메인 로직 (버전 전환 + 셀카 처리 포함 완전판)

const fs = require('fs');
const path = require('path');
const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
const moment = require('moment-timezone');
const cron = require('node-cron');

const {
  getReplyByMessage,
  getRandomMessage,
  callOpenAI,
  cleanReply,
  saveLog,
  getRecentLog,
  extractAndSaveMemory,
  setForcedModel,
  getCurrentModelName,
  getSelfieReplyFromYeji,
  getFixedMemory,
  startMessageAndPhotoScheduler, // ✅ 빠졌던 이 줄 꼭 추가!
  getFullMemoryPrompt,
  getColorMoodReply,
  validateEnvironment,
  saveLoveMemory
} = require('./src/autoReply');

validateEnvironment();

const app = express();
const config = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new Client(config);
const userId = process.env.TARGET_USER_ID;

if (!userId) {
  console.error('❌ TARGET_USER_ID가 설정되지 않았습니다.');
  process.exit(1);
}

// ✅ 서버 상태 추적
const serverState = {
  lastSentMessages: new Map(),
  isInitialized: false,
  messageCount: 0
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (_, res) => {
  res.json({
    server: '무쿠 살아있엉 🐣',
    uptime: process.uptime(),
    messageCount: serverState.messageCount,
    gptVersion: getCurrentModelName(),
    initialized: serverState.isInitialized
  });
});

app.get('/status', (_, res) => {
  res.json({
    server: 'running',
    uptime: process.uptime(),
    messageCount: serverState.messageCount,
    pendingMessages: serverState.lastSentMessages.size,
    gptVersion: getCurrentModelName()
  });
});

app.get('/force-push', async (_, res) => {
  try {
    const msg = await getRandomMessage();
    if (msg) {
      await client.pushMessage(userId, { type: 'text', text: msg });
      res.json({ success: true, message: msg });
    } else {
      res.status(500).json({ success: false, error: '메시지 생성 실패' });
    }
  } catch (err) {
    console.error('❌ 강제 전송 실패:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/webhook', middleware(config), async (req, res) => {
  const events = req.body.events || [];
  for (const event of events) {
    if (event.type === 'message' && event.source.userId === userId) {
      await handleMessage(event);
    }
  }
  res.status(200).send('OK');
});

async function handleMessage(event) {
  const message = event.message;
  try {
    if (message.type === 'text') {
      await handleTextMessage(event, message.text.trim());
    } else if (message.type === 'image') {
      await handleImageMessage(event, message.id);
    }
  } catch (err) {
    console.error('❌ 메시지 처리 실패:', err);
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '어? 뭔가 오류가 생겼어 ㅠㅠ 다시 말해줄래?'
    });
  }
}

async function handleTextMessage(event, text) {
  saveLog('아저씨', text);
  extractAndSaveMemory(text);

  const commands = {
    '버전': () => `지금은 ${getCurrentModelName()} 버전으로 대화하고 있어.`,
    '3.5': () => { setForcedModel('gpt-3.5-turbo'); return '응, 이제부터 3.5로 대화할게.'; },
    '4.0': () => { setForcedModel('gpt-4o'); return '응, 이제부터 4.0으로 바꿨어!'; },
    '자동': () => { setForcedModel(null); return '응, 상황에 맞게 자동으로 바꿔서 말할게!'; }
  };

  if (commands[text]) {
    const result = commands[text]();
    await client.replyMessage(event.replyToken, { type: 'text', text: result });
    return;
  }

  if (/사진|셀카|사진줘|셀카 보여줘|사진 보여줘|selfie/i.test(text)) {
    await handleSelfieRequest(event);
    return;
  }

  if (/무슨\s*색|오늘\s*색/i.test(text)) {
    const reply = await getColorMoodReply();
    await client.replyMessage(event.replyToken, { type: 'text', text: reply });
    return;
  }

  const reply = await getReplyByMessage(text);
  await client.replyMessage(event.replyToken, { type: 'text', text: reply });
}

async function handleSelfieRequest(event) {
  const BASE_URL = 'https://de-ji.net/yejin/';
  const photoListPath = path.join(__dirname, 'memory/photo-list.txt');

  try {
    if (!fs.existsSync(photoListPath)) {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '아직 셀카 목록이 없어 ㅠㅠ'
      });
      return;
    }

    const list = fs.readFileSync(photoListPath, 'utf-8')
      .split('\n')
      .map(x => x.trim())
      .filter(Boolean);

    if (list.length === 0) {
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '셀카 목록이 비어있어 ㅠㅠ'
      });
      return;
    }

    const pick = list[Math.floor(Math.random() * list.length)];
    const comment = await getSelfieReplyFromYeji();

    await client.replyMessage(event.replyToken, [
      {
        type: 'image',
        originalContentUrl: BASE_URL + pick,
        previewImageUrl: BASE_URL + pick
      },
      {
        type: 'text',
        text: comment || '헤헷 셀카야~'
      }
    ]);
  } catch (err) {
    console.error('❌ 셀카 처리 실패:', err);
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '사진 불러오기 실패했어 ㅠㅠ'
    });
  }
}

async function handleImageMessage(event, messageId) {
  try {
    const stream = await client.getMessageContent(messageId);
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const base64Image = buffer.toString('base64');
    const reply = await getReplyByMessage(base64Image);
    await client.replyMessage(event.replyToken, { type: 'text', text: reply });
  } catch (err) {
    console.error('❌ 이미지 처리 실패:', err);
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '이미지를 읽는 중 오류가 생겼어 ㅠㅠ'
    });
  }
}

cron.schedule('* * * * *', async () => {
  const now = moment().tz('Asia/Tokyo');
  const time = now.format('HH:mm');
  if (now.minute() === 0 && now.hour() >= 9 && now.hour() <= 18) {
    const msg = '담타고?';
    await client.pushMessage(userId, { type: 'text', text: msg });
    serverState.lastSentMessages.set(time, now);
  }
  for (const [key, sentAt] of serverState.lastSentMessages.entries()) {
    if (moment().diff(sentAt, 'minutes') >= 5) {
      const reply = '아저씨... 답장 안 해? 삐졌어 ㅠ';
      await client.pushMessage(userId, { type: 'text', text: reply });
      serverState.lastSentMessages.delete(key);
    }
  }
});

process.on('uncaughtException', (err) => {
  console.error('❌ 예기치 못한 오류:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ 처리되지 않은 거절:', reason);
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    const msg = await getRandomMessage();
    if (msg) await client.pushMessage(userId, { type: 'text', text: msg });
    startMessageAndPhotoScheduler();
    app.listen(PORT, () => {
      console.log(`🎉 무쿠 서버 시작됨! 포트: ${PORT}`);
    });
  } catch (err) {
    console.error('❌ 서버 시작 실패:', err);
    process.exit(1);
  }
}

startServer();