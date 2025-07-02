// ✅ index.js (Final Google Photos & Gemini Vision Integration Version)

// 📦 Required Modules
const fs = require('fs');
const path = require('path');
const { Client, middleware } = require('@line/bot-sdk');
const express = require('express');
const moment = require('moment-timezone');
const cron = require('node-cron');
const stringSimilarity = require('string-similarity');

// Import functions from autoReply.js
const {
    getReplyByMessage,
    getReplyByImagePrompt,
    getSelfieReplyFromYeji,
    getCouplePhotoReplyFromYeji,
    saveLog,
    checkModelSwitchCommand,
    getProactiveMemoryMessage,
    listGooglePhotosAlbums,
    getRandomPhotoFromAlbum,
    getPhotoDescriptionWithGemini // ⭐ Gemini Vision 함수 추가
} = require('./src/autoReply');

// Import memoryManager
const memoryManager = require('./src/memoryManager');

// Initialize Express app
const app = express();

// LINE Bot SDK configuration
const config = {
    channelAccessToken: process.env.LINE_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
};

// Initialize LINE client
const client = new Client(config);

// Target user ID from environment variables
const userId = process.env.TARGET_USER_ID;

// Root endpoint for health check
app.get('/', (_, res) => res.send('Muku is alive'));

// Webhook endpoint for LINE messages
app.post('/webhook', middleware(config), async (req, res) => {
    try {
        const events = req.body.events || [];
        for (const event of events) {
            if (event.type === 'message' && event.message.type === 'text') {
                const text = event.message.text.trim();

                // Command exception handling for memory
                const isCommand =
                    /(사진\s?줘|셀카\s?줘|셀카\s?보여줘|사진\s?보여줘|얼굴\s?보여줘|얼굴\s?보고\s?싶[어다]|selfie|커플사진\s?줘|커플사진\s?보여줘|앨범\s?목록|사진\s?(보여줘|기억나))/i.test(text) ||
                    /3\.5|4\.0|자동|버전/i.test(text);

                saveLog('아저씨', text);

                if (!isCommand) {
                    await memoryManager.extractAndSaveMemory(text);
                } else {
                    console.log(`Command '${text}' is excluded from memory saving.`);
                }

                // Handle model switch command
                const versionResponse = checkModelSwitchCommand(text);
                if (versionResponse) {
                    await client.replyMessage(event.replyToken, { type: 'text', text: versionResponse });
                    return;
                }
                
                // Handle "앨범 목록" (Album List) command
                if (text.includes('앨범 목록')) {
                    console.log('📸 Album list request detected. Fetching Google Photos albums...');
                    try {
                        const albums = await listGooglePhotosAlbums();
                        if (albums && albums.length > 0) {
                            const albumTitles = albums.map(album => `- ${album.title}`).join('\n');
                            const replyText = `아저씨! 우리들의 추억이 담긴 앨범들이야💖:\n\n${albumTitles}`;
                            await client.replyMessage(event.replyToken, { type: 'text', text: replyText });
                            saveLog('예진이', `앨범 목록을 보여줬어:\n${albumTitles}`);
                        } else {
                            await client.replyMessage(event.replyToken, { type: 'text', text: '아직 앨범이 하나도 없는 것 같아, 아저씨! 우리 같이 추억을 만들어가자!💖' });
                        }
                    } catch (error) {
                        console.error('Error processing album list request:', error);
                        await client.replyMessage(event.replyToken, { type: 'text', text: '앨범을 불러오다가 뭔가 문제가 생겼어 ㅠㅠ' });
                    }
                    return;
                }

                // ⭐ --- [업그레이드된 핵심 기능] "OO 사진 보여줘" 처리 --- ⭐
                const photoRequestMatch = text.match(/(.+?) 사진 (보여줘|기억나)/);
                if (photoRequestMatch) {
                    const requestedAlbumName = photoRequestMatch[1].trim();
                    console.log(`📸 Photo request for album "${requestedAlbumName}" detected.`);
                    try {
                        const albums = await listGooglePhotosAlbums();
                        if (!albums || albums.length === 0) {
                            await client.replyMessage(event.replyToken, { type: 'text', text: '아직 앨범이 하나도 없는 것 같아, 아저씨!' });
                            return;
                        }

                        const albumTitles = albums.map(a => a.title);
                        const bestMatch = stringSimilarity.findBestMatch(requestedAlbumName, albumTitles);

                        if (bestMatch.bestMatch.rating > 0.4) {
                            const targetAlbum = albums[bestMatch.bestMatchIndex];
                            console.log(`✅ Found best match album: "${targetAlbum.title}" (Similarity: ${bestMatch.bestMatch.rating})`);
                            
                            const photoUrl = await getRandomPhotoFromAlbum(targetAlbum.id);

                            if (photoUrl) {
                                // ⭐ 사진을 보고 설명하는 Gemini Vision 함수 호출!
                                const description = await getPhotoDescriptionWithGemini(photoUrl);
                                
                                await client.replyMessage(event.replyToken, [
                                    { type: 'image', originalContentUrl: photoUrl, previewImageUrl: photoUrl },
                                    { type: 'text', text: description } // Gemini가 생성한 맞춤 코멘트 전송
                                ]);
                                saveLog('예진이', `"${targetAlbum.title}" 앨범의 사진을 보고 이야기했어.`);
                            } else {
                                await client.replyMessage(event.replyToken, { type: 'text', text: `"${targetAlbum.title}" 앨범에는 사진이 없는 것 같아, 아저씨 ㅠㅠ` });
                            }
                        } else {
                            console.log(`❌ Could not find a similar album for "${requestedAlbumName}".`);
                            await client.replyMessage(event.replyToken, { type: 'text', text: '음... 어떤 앨범을 말하는 건지 잘 모르겠어, 아저씨 ㅠㅠ 앨범 이름을 조금 더 정확하게 말해줄 수 있어?' });
                        }
                    } catch (error) {
                        console.error('Error processing photo album request:', error);
                        await client.replyMessage(event.replyToken, { type: 'text', text: '사진을 찾다가 뭔가 문제가 생겼나 봐 ㅠㅠ' });
                    }
                    return;
                }

                // Default text message reply
                const reply = await getReplyByMessage(text);
                await client.replyMessage(event.replyToken, { type: 'text', text: reply });

            } else if (event.type === 'message' && event.message.type === 'image') {
                // Handle image message
                try {
                    const stream = await client.getMessageContent(event.message.id);
                    const chunks = [];
                    for await (const chunk of stream) {
                        chunks.push(chunk);
                    }
                    const buffer = Buffer.concat(chunks);
                    let mimeType = 'application/octet-stream'; // Default
                    if (buffer.length > 1 && buffer[0] === 0xFF && buffer[1] === 0xD8) {
                        mimeType = 'image/jpeg';
                    } else if (buffer.length > 7 && buffer.slice(0, 8).toString('hex') === '89504e470d0a1a0a') {
                        mimeType = 'image/png';
                    } else if (buffer.length > 2 && buffer.slice(0, 3).toString() === 'GIF') {
                        mimeType = 'image/gif';
                    }
                    const base64ImageWithPrefix = `data:${mimeType};base64,${buffer.toString('base64')}`;
                    const reply = await getReplyByImagePrompt(base64ImageWithPrefix);
                    await client.replyMessage(event.replyToken, { type: 'text', text: reply });
                } catch (err) {
                    console.error('🖼️ Image processing failed:', err);
                    await client.replyMessage(event.replyToken, { type: 'text', text: '이미지를 읽는 중 오류가 생겼어 ㅠㅠ' });
                }
            }
        }
        res.status(200).send('OK');
    } catch (err) {
        console.error('Webhook processing error:', err);
        res.status(200).send('OK');
    }
});

// --- Schedulers (Unchanged) ---
let lastDamtaMessageTime = 0;
let bootTime = Date.now();
let lastMoodMessage = '';
let lastMoodMessageTime = 0;

cron.schedule('0 10-19 * * *', async () => { /* ...기존과 동일... */ }, { scheduled: true, timezone: "Asia/Tokyo" });
const sendScheduledMessage = async (type) => { /* ...기존과 동일... */ };
cron.schedule('30 * * * *', async () => { /* ...기존과 동일... */ }, { scheduled: true, timezone: "Asia/Tokyo" });
cron.schedule('0 23 * * *', async () => { /* ...기존과 동일... */ }, { scheduled: true, timezone: "Asia/Tokyo" });
cron.schedule('0 0 * * *', async () => { /* ...기존과 동일... */ }, { scheduled: true, timezone: "Asia/Tokyo" });


// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`Muku server started on port ${PORT}`);
    await memoryManager.ensureMemoryDirectory();
    console.log('✅ Memory directory checked and ready.');
});
