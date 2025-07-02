const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const readline = require('readline'); // 사용자 입력을 받기 위한 모듈

// 환경 변수에서 CLIENT_ID와 CLIENT_SECRET 가져오기
// Render에 설정된 GOOGLE_CLIENT_ID와 GOOGLE_CLIENT_SECRET를 사용합니다.
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'; // 'Out-of-band' (OOB) 흐름

const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Google Photos Library API에 필요한 스코프
const SCOPES = ['https://www.googleapis.com/auth/photoslibrary.readonly'];

async function getRefreshToken() {
    if (!CLIENT_ID || !CLIENT_SECRET) {
        console.error("오류: GOOGLE_CLIENT_ID 또는 GOOGLE_CLIENT_SECRET 환경 변수가 설정되지 않았습니다.");
        console.error("Render 대시보드의 Environment Variables 섹션을 확인해주세요.");
        return;
    }

    // 1. 인증 URL 생성
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline', // refresh token을 얻기 위해 'offline'으로 설정
        scope: SCOPES,
    });

    console.log('다음 URL을 웹 브라우저에 열어 Google Photos API에 대한 접근을 승인해주세요:');
    console.log(authUrl);

    // 2. 사용자로부터 인증 코드(Authorization Code) 입력받기
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.question('페이지에서 얻은 "인증 코드"를 여기에 붙여넣으세요: ', async (code) => {
        rl.close();
        try {
            // 3. 인증 코드를 사용하여 토큰 획득
            const { tokens } = await oAuth2Client.getToken(code);
            console.log('\n--- 토큰 정보 ---');
            console.log('Access Token:', tokens.access_token);
            console.log('Refresh Token:', tokens.refresh_token); // 이것이 우리가 필요한 토큰!
            console.log('만료 시간 (초):', tokens.expiry_date);
            console.log('------------------');

            if (tokens.refresh_token) {
                console.log('\n💡 중요: 위 Refresh Token을 복사하여 Render 서비스의 환경 변수(Environment Variables)에');
                console.log('   키: GOOGLE_REFRESH_TOKEN');
                console.log('   값: ' + tokens.refresh_token);
                console.log('   으로 추가해주세요. 기존에 있었다면 업데이트해주세요.');
            } else {
                console.warn('\n경고: Refresh Token을 얻지 못했습니다. Access Type이 "offline"으로 설정되었는지 확인하세요.');
            }

        } catch (err) {
            console.error('토큰 획득 중 오류 발생:', err);
            console.error('인증 코드가 유효한지 확인해주세요.');
        }
    });
}

getRefreshToken();
