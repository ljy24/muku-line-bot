// testGetReply.js

const { getReplyByMessage } = require('./src/autoReply');

// 테스트용 로그 저장 함수 (더미)
function dummySaveLog(log) {
  console.log('[LOG 저장]', log);
}

// 테스트용 OpenAI 호출 함수 (실제 서버랑 같음)
const { callOpenAI, cleanReply } = require('./src/autoReply');

async function test() {
  const testMessage = "안녕 애기야";  // 아저씨가 보내고 싶은 메시지로 바꿔도 돼
  
  const reply = await getReplyByMessage(testMessage, dummySaveLog, callOpenAI, cleanReply);
  
  console.log('예진이 답변:', reply.comment);
}

test();
