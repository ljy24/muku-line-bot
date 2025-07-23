
}

// ================== 🎯 통합 이벤트 핸들러 ==================
async function handleEvent(event, modules, client, faceMatcher, loadFaceMatcherSafely, getVersionResponse, enhancedLogging) {
    try {
        // 메시지 타입에 따라 적절한 처리 함수 호출
        if (event.type === 'message') {
            if (event.message.type === 'text') {
                return await processMessage(event.message.text, modules);
            } else if (event.message.type === 'image') {
                // 이미지 처리 로직
                const imageBuffer = null; // 실제 이미지 버퍼 처리 필요
                return await processImage(imageBuffer, modules);
            }
        }
        
        return null;
    } catch (error) {
        console.error(`${colors.error}❌ [통합핸들러] 이벤트 처리 실패: ${error.message}${colors.reset}`);
        return null;
    }
}

// ================== 📤 모듈 Export ==================
module.exports = {
    processMessage,
    processImage,
    processCommand,
    handleLearningFromConversation,
    handleEvent,  // 👈 빠뜨린 함수 추가!
    
    // 유틸리티 함수들
    getJapanTime,
    getJapanHour,
    getJapanTimeString,
    getTimeSlot,
    checkBirthday,
    checkLateNightConversation,
    detectBehaviorCommand,
    processFaceRecognition,
    
    // 색상 상수
    colors
};
