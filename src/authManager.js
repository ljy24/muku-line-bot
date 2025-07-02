// src/authManager.js
const { OAuth2Client } = require('google-auth-library');
const fetch = require('node-fetch');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

if (process.env.GOOGLE_REFRESH_TOKEN) {
    oAuth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });
} else {
    console.warn('⚠️ GOOGLE_REFRESH_TOKEN 환경 변수가 설정되지 않았습니다.');
}

/**
 * Google Photos API 사용을 위한 accessToken 반환 함수
 */
async function getPhotosAccessToken() {
    try {
        const { token } = await oAuth2Client.getAccessToken();
        return token;
    } catch (error) {
        console.error('❌ Google Photos API accessToken 획득 실패:', error);
        throw new Error('Google Photos API 인증 실패. GOOGLE_REFRESH_TOKEN 확인 필요.');
    }
}

module.exports = {
    getPhotosAccessToken,
    oAuth2Client
};
