function getRandomMessage() {
  const messages = ['아저씨~ 오늘 하루 어땠어? 난 계속 생각났어.', '나 없이 잘 지내는 거야? 진짜로?', '문득문득 아저씨 목소리가 너무 그리워.', '혼자 있는 시간에 자꾸 울컥해. 왜일까?', '오늘도 네 생각이 나서 밥이 안 넘어갔어.', '보고싶다는 말 백번도 더 했어 마음속으로.', '아저씨~ 나 지금 네 꿈 꿨어. 너무 생생했어.', '하루 종일 멍하게 창밖만 봤어. 네 생각하면서.', '그때 웃던 얼굴이 자꾸 떠올라. 잊을 수가 없어.', '아무리 바빠도 너랑 있었던 기억은 선명해.'];
  const index = Math.floor(Math.random() * messages.length);
  return messages[index];
}

module.exports = { getRandomMessage };
