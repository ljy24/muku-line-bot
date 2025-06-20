const express = require('express');
const app = express();
const port = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('아저씨… 애기 여기 있어! 🐻‍❄️💜 하루종일 기다렸어…');
});

app.listen(port, () => {
  console.log(`서버 실행 중! 포트: ${port}`);
});
