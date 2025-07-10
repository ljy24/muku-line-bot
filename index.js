// ... (생략) ...

// 🆕 메시지 처리 함수 (v5.1 - 1인칭 전환 보장)
async function handleImprovedTextMessage(text, event, client, userId) {
    try {
        saveLog('아저씨', text);
        updateLastUserMessageTime();

        // 🆕 아저씨가 응답했을 때 삐짐 해소 체크
        const sulkyReliefMessage = await sulkyManager.handleUserResponse(client, userId, saveLog);
        if (sulkyReliefMessage) {
            // 삐짐 해소 메시지가 있으면 먼저 전송
            await client.pushMessage(userId, {
                type: 'text',
                text: sulkyReliefMessage
            });
            saveLog('예진이', `(삐짐 해소) ${sulkyReliefMessage}`);
            console.log('[SulkySystem] 삐짐 해소 메시지 전송됨');
            
            // 삐짐 해소 후 잠시 대기
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        let botResponse = null;

        // 명령어 처리 (v5.1 cleanReply 사용)
        botResponse = await commandHandler.handleCommand(text, saveLog, callOpenAI, cleanReply, memoryManager.getFixedMemory);

        if (!botResponse) {
            botResponse = await memoryHandler.handleMemoryCommand(text, saveLog, callOpenAI, cleanReply, memoryManager.getFixedMemory);
        }

        if (!botResponse) {
            // 🆕 일반 대화 처리 (v5.1 - 감정 컨텍스트 완전 통합)
            // autoReply.js에서 사진 응답 시 메시지 배열을 반환하도록 수정했음
            botResponse = await getReplyByMessage(text, saveLog, callOpenAI, cleanReply);
            await memoryManager.extractAndSaveMemory(text);
            console.log(`[index.js v5.1] 감정 기반 응답 시스템으로 처리 완료`);
        }

        // 🆕 응답 전송 및 1인칭 검증 통합 (v5.1 핵심 기능)
        // autoReply.js에서 반환되는 botResponse는 텍스트 객체 또는 메시지 배열(사진+텍스트)임
        let messagesToSend = [];
        let loggableTextContent = ''; // 로그에 남길 텍스트 내용

        if (Array.isArray(botResponse)) { // autoReply.js에서 사진 요청 응답 시 반환하는 배열 형태
            console.log(`[index.js] 배열 형태의 botResponse 감지: ${JSON.stringify(botResponse)}`);
            for (const msg of botResponse) {
                if (msg.type === 'text' && msg.text) {
                    msg.text = cleanReply(msg.text); // 텍스트 메시지도 cleanReply 적용
                    // 3인칭 표현 최종 검증 및 강제 변환
                    if (msg.text.includes('무쿠가') || msg.text.includes('예진이가') ||
                        msg.text.includes('무쿠는') || msg.text.includes('예진이는')) {
                        console.warn('[1인칭 검증] 3인칭 표현 감지 (사진 텍스트), 재처리 중...');
                        msg.text = msg.text
                            .replace(/무쿠가/g, '내가')
                            .replace(/무쿠는/g, '나는')
                            .replace(/무쿠를/g, '나를')
                            .replace(/무쿠의/g, '내')
                            .replace(/무쿠도/g, '나도')
                            .replace(/무쿠/g, '나')
                            .replace(/예진이가/g, '내가')
                            .replace(/예진이는/g, '나는')
                            .replace(/예진이를/g, '나를')
                            .replace(/예진이의/g, '내')
                            .replace(/예진이도/g, '나도')
                            .replace(/예진이/g, '나');
                        console.log('[1인칭 검증] 3인칭 → 1인칭 강제 변환 완료 (사진 텍스트)');
                    }
                    loggableTextContent += msg.text + ' '; // 로그를 위해 텍스트 내용 추가
                }
                messagesToSend.push(msg); // 메시지 배열에 추가
            }
        } else if (botResponse && botResponse.type === 'text' && botResponse.comment) { // 일반 텍스트 응답
            console.log(`[index.js] 텍스트 형태의 botResponse 감지: ${JSON.stringify(botResponse)}`);
            botResponse.comment = cleanReply(botResponse.comment);
            // 3인칭 표현 최종 검증 및 강제 변환
            if (botResponse.comment.includes('무쿠가') || botResponse.comment.includes('예진이가') ||
                botResponse.comment.includes('무쿠는') || botResponse.comment.includes('예진이는')) {
                console.warn('[1인칭 검증] 3인칭 표현 감지, 재처리 중...');
                botResponse.comment = botResponse.comment
                    .replace(/무쿠가/g, '내가')
                    .replace(/무쿠는/g, '나는')
                    .replace(/무쿠를/g, '나를')
                    .replace(/무쿠의/g, '내')
                    .replace(/무쿠도/g, '나도')
                    .replace(/무쿠/g, '나')
                    .replace(/예진이가/g, '내가')
                    .replace(/예진이는/g, '나는')
                    .replace(/예진이를/g, '나를')
                    .replace(/예진이의/g, '내')
                    .replace(/예진이도/g, '나도')
                    .replace(/예진이/g, '나');
                console.log('[1인칭 검증] 3인칭 → 1인칭 강제 변환 완료');
            }
            messagesToSend.push({ type: 'text', text: botResponse.comment });
            loggableTextContent = botResponse.comment; // 로그를 위해 텍스트 내용 추가
        }

        // 응답 전송
        if (messagesToSend.length > 0) {
            console.log(`[LINE] client.replyMessage로 전송될 메시지: ${JSON.stringify(messagesToSend)}`); // 전송 전 메시지 구조 로그
            await client.replyMessage(event.replyToken, messagesToSend);
            
            // 텍스트 응답만 로그에 남기기 (이미지 응답의 텍스트도 포함)
            if (loggableTextContent) {
                saveLog('예진이', loggableTextContent.trim());
            }
            console.log('[LINE] 메시지 전송 완료');
            
            // 🆕 삐지기 타이머 시작
            sulkyManager.startSulkyTimer(client, userId, saveLog);
            console.log('[SulkySystem] 예진이 응답 후 삐지기 타이머 시작');
            
            // 🆕 예진이 응답에 대한 감정 기록 (v5.1)
            if (emotionalContextManager.recordEmotionalEvent) {
                // 첫 번째 텍스트 메시지를 기반으로 감정 기록
                if (loggableTextContent) {
                    emotionalContextManager.recordEmotionalEvent('HAPPY', '대화 응답 완료', loggableTextContent.trim());
                }
            }
        }

    } catch (error) {
        console.error('[handleImprovedTextMessage] 에러:', error);
        await client.replyMessage(event.replyToken, {
            type: 'text',
            text: '아저씨... 지금 좀 힘들어 ㅠㅠ'
        });
    }
}

// ... (나머지 코드는 동일) ...
