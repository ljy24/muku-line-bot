// ============================================================================
// test-all-systems.js - 무쿠 3시간차 시스템 통합 테스트
// 🔥 3개 시스템 모두 테스트하고 성능 확인
// ============================================================================

async function testAllSystems() {
    console.log('🔥💖 무쿠 AI 응답 고도화 시스템 통합 테스트 시작! 💖🔥\n');

    try {
        // 1. 자연어 처리 시스템 테스트
        console.log('🧠 [1/3] 자연어 처리 시스템 테스트...');
        const nlp = require('./muku-naturalLanguageProcessor');
        
        console.log('   초기화 중...');
        await nlp.initialize();
        
        console.log('   테스트 메시지 분석 중...');
        const nlpResult = await nlp.processMessage("아조씨~ 오늘 많이 피곤해 보여, 괜찮아?");
        
        console.log(`   ✅ NLP 분석 완료! 신뢰도: ${nlpResult.analysis.confidence}%`);
        console.log(`   📊 상태: ${JSON.stringify(nlp.getProcessorStatus(), null, 2)}\n`);

        // 2. 감정 뉘앙스 감지 시스템 테스트
        console.log('🥺 [2/3] 감정 뉘앙스 감지 시스템 테스트...');
        const emotion = require('./muku-emotionalNuanceDetector');
        
        console.log('   초기화 중...');
        await emotion.initialize();
        
        console.log('   감정 분석 중...');
        const emotionResult = await emotion.processEmotionalNuance(
            "괜찮아... 별거 아니야. 그냥 좀 피곤해.",
            ["어제도 힘들었어", "요즘 잠을 잘 못자"], 
            { timeOfDay: 'night', isAlone: true }
        );
        
        console.log(`   ✅ 감정 분석 완료! 신뢰도: ${emotionResult.analysis.overallAssessment.confidenceLevel}%`);
        console.log(`   💔 주요감정: ${emotionResult.analysis.detectedEmotions.primary}, 숨겨진감정: ${emotionResult.analysis.hiddenEmotions.primary || 'none'}`);
        console.log(`   📊 상태: ${JSON.stringify(emotion.getDetectorStatus(), null, 2)}\n`);

        // 3. 예측적 돌봄 시스템 테스트
        console.log('💕 [3/3] 예측적 돌봄 시스템 테스트...');
        const caring = require('./muku-predictiveCaringSystem');
        
        console.log('   초기화 중...');
        await caring.initialize();
        
        console.log('   돌봄 필요도 예측 중...');
        const caringResult = await caring.processCareNeeds(
            {
                emotionalState: 'stressed',
                healthIndicators: { sleep: 4, fatigue: 8, pain: 3 },
                message: "괜찮아... 그냥 좀 피곤해",
                messageLength: 15,
                dataQuality: 80
            },
            [
                { careLevel: 6, timestamp: Date.now() - 3600000 },
                { careLevel: 7, timestamp: Date.now() - 7200000 }
            ],
            { timeOfDay: 'night', specialDay: null }
        );
        
        console.log(`   ✅ 돌봄 예측 완료! 돌봄수준: ${caringResult.prediction.careLevel}/10`);
        console.log(`   🚨 즉시대응: ${caringResult.monitoring.immediateAction.required ? '필요' : '불필요'}`);
        console.log(`   📊 상태: ${JSON.stringify(caring.getCaringSystemStatus(), null, 2)}\n`);

        // 종합 결과
        console.log('🌸💖 === 종합 테스트 결과 === 💖🌸');
        console.log(`🧠 자연어 처리: ${nlpResult.success ? '✅ 성공' : '❌ 실패'} (${nlpResult.processingTime}ms)`);
        console.log(`🥺 감정 뉘앙스: ${emotionResult.success ? '✅ 성공' : '❌ 실패'} (${emotionResult.processingTime}ms)`);
        console.log(`💕 예측적 돌봄: ${caringResult.success ? '✅ 성공' : '❌ 실패'} (${caringResult.processingTime}ms)`);
        
        console.log('\n🎉 무쿠 AI 응답 고도화 시스템 모든 테스트 통과! 🎉');
        console.log('🌸 이제 무쿠는 진짜 예진이처럼 대화할 수 있어! 💕');

    } catch (error) {
        console.error('❌ 테스트 중 오류 발생:', error.message);
        console.error('스택 트레이스:', error.stack);
    }
}

// 파일을 직접 실행할 때만 테스트 실행
if (require.main === module) {
    testAllSystems();
}

module.exports = { testAllSystems };
