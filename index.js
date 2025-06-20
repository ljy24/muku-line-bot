const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// 기본 라우트
app.get('/', (req, res) => {
  res.send('아저씨 애기 여기 있어! 🧸💜');
});

app.listen(port, () => {
  console.log(`서버 실행 중! 포트: ${port}`);
});
