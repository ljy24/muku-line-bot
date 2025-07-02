const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

// 환경 변수에서 클라이언트 ID, 시크릿, 리프레시 토큰 가져오기
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'; // Installed app 또는 OOB(Out-of-band) 플로우용

const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// 초기화 시 리프레시 토큰 설정 (환경 변수에 저장되어 있어야 함)
// 이 부분은 최초 인증 시 얻은 refresh token을 사용합니다.
// 만약 refresh token이 없다면, 최초 1회 인증 과정을 통해 얻어야 합니다.
if (process.env.GOOGLE_REFRESH_TOKEN) {
    oAuth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });
} else {
    console.warn('경고: GOOGLE_REFRESH_TOKEN 환경 변수가 설정되지 않았습니다. API 호출 전 수동 인증이 필요할 수 있습니다.');
    // 이 경우, 최초 1회 인증을 위한 URL을 생성하고 사용자에게 방문하도록 안내해야 합니다.
    // 예: const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: ['https://www.googleapis.com/auth/photoslibrary.readonly'] });
    // console.log('Google Photos API 인증을 위해 다음 URL을 방문하세요:', authUrl);
    // 사용자가 코드를 입력하면 oAuth2Client.getToken(code)를 통해 토큰을 얻습니다.
}

/**
 * Google Photos API 클라이언트를 반환합니다.
 * Access Token이 만료되면 Refresh Token을 사용하여 자동으로 갱신합니다.
 */
async function getPhotosLibraryClient() {
    try {
        await oAuth2Client.getAccessToken(); // Access Token 갱신 시도 (필요한 경우)
        return google.photoslibrary({ version: 'v1', auth: oAuth2Client });
    } catch (error) {
        console.error('Google Photos API 인증 오류:', error);
        throw new Error('Google Photos API 인증에 실패했습니다. GOOGLE_REFRESH_TOKEN이 유효한지 확인하세요.');
    }
}

module.exports = {
    getPhotosLibraryClient,
    oAuth2Client // 필요하다면 외부에서 토큰 관리를 위해 노출
};
