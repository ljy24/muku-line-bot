// testGetReply.js
const { getReplyByMessage } = require('./autoReply');

async function test() {
  const userMessage = '안녕 애기야';

  // 직접 호출하는 함수들이 필요하면 임시로 넘겨줘야 해
  // 보통 saveLog, callOpenAI, cleanReply는 autoReply 모듈에서 직접 사용하지만 테스트용 예시로 간단히 정의
  const saveLogFunc = (log) => {
    console.log('[LOG 저장]', log);
  };

  // callOpenAI는 autoReply.js 내부 함수를 직접 호출하도록 수정해도 되고, 아래는 예시
  // 여기선 autoReply.js에서 이미 OpenAI 클라이언트 초기화 했으니 내부 함수를 불러와 쓰는 게 정확함
  // 테스트용으로 직접 불러오려면 autoReply 모듈에서 export 되어 있어야 함
  const callOpenAIFunc = require('./autoReply').callOpenAI;
  const cleanReplyFunc = require('./autoReply').cleanReply;

  try {
    const reply = await getReplyByMessage(userMessage, saveLogFunc, callOpenAIFunc, cleanReplyFunc);
    console.log('예진이 답변:', reply.comment);
  } catch (e) {
    console.error('테스트 실패:', e);
  }
}

test();
