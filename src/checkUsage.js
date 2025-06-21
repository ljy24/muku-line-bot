const fs = require('fs');
const path = require('path');

function estimateMonthlyCost(logs) {
  let totalTokens35 = 0;
  let totalTokens4o = 0;

  for (const day in logs) {
    const entry = logs[day];
    totalTokens35 += entry['gpt-3.5-turbo'] || 0;
    totalTokens4o += entry['gpt-4o'] || 0;
  }

  const cost35 = (totalTokens35 / 1000) * 0.3;
  const cost4o = (totalTokens4o / 1000) * 3.0;
  const total = cost35 + cost4o;

  return { cost35: cost35.toFixed(1), cost4o: cost4o.toFixed(1), total: total.toFixed(1) };
}

function checkMonthlyBudget() {
  const usagePath = path.join(__dirname, '../memory/usage-log.json');
  if (!fs.existsSync(usagePath)) return;

  const logs = JSON.parse(fs.readFileSync(usagePath, 'utf-8'));
  const { cost35, cost4o, total } = estimateMonthlyCost(logs);

  if (parseFloat(total) >= 3000) {
    console.warn(`💸 한도 초과 경고! 이달 누적 예상 요금 ¥${total}엔 (GPT-4o ¥${cost4o} + GPT-3.5 ¥${cost35})`);
  } else {
    console.log(`📊 이달 누적 요금 ¥${total}엔 (GPT-4o ¥${cost4o} + GPT-3.5 ¥${cost35})`);
  }
}

function getRemainingBudgetMessage() {
  const usagePath = path.join(__dirname, '../memory/usage-log.json');
  if (!fs.existsSync(usagePath)) return '아직 사용 기록이 없어~';

  const logs = JSON.parse(fs.readFileSync(usagePath, 'utf-8'));
  const { cost35, cost4o, total } = estimateMonthlyCost(logs);

  const left = 3000 - parseFloat(total);
  if (left <= 0) {
    return `헉..! 아저씨 이달 한도 초과했어 😢 (¥${total}엔 사용됨)`;
  } else {
    return `아직 ¥${left.toFixed(1)}엔 남았어! (이번 달 총 ¥${total}엔 썼어)`;
  }
}

module.exports = { checkMonthlyBudget, getRemainingBudgetMessage };
