// 📸 googlePhotos.js
// Google Photos API를 통해 예진이와 아저씨가 함께 찍은 사진을 가져오는 유틸

const { google } = require('googleapis');
const axios = require('axios');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost'
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

async function getAccessToken() {
  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials.access_token;
}

// 📷 구글 포토에서 최근 사진 하나 가져오기
async function getPhotoFromGoogle() {
  try {
    const accessToken = await getAccessToken();
    const response = await axios.post(
      'https://photoslibrary.googleapis.com/v1/mediaItems:search',
      {
        pageSize: 50,
        filters: {
          mediaTypeFilter: {
            mediaTypes: ['PHOTO']
          }
        }
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const items = response.data.mediaItems || [];
    if (items.length === 0) return null;

    // 무작위 1장 선택
    const pick = items[Math.floor(Math.random() * items.length)];
    return pick.baseUrl;
  } catch (err) {
    console.error('📷 구글 포토 가져오기 실패:', err.message);
    return null;
  }
}

// 📁 키워드로 앨범에서 사진 가져오기 (ex: "하카타")
async function getPhotoByKeyword(keyword) {
  try {
    const accessToken = await getAccessToken();

    // 1. 앨범 리스트 가져오기 (최대 50개까지)
    const albumRes = await axios.get('https://photoslibrary.googleapis.com/v1/albums?pageSize=50', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const albums = albumRes.data.albums || [];
    const matched = albums.find(album => album.title.includes(keyword));
    if (!matched) return null;

    // 2. 앨범 내 사진 검색
    const photoRes = await axios.post(
      'https://photoslibrary.googleapis.com/v1/mediaItems:search',
      {
        albumId: matched.id,
        pageSize: 50,
        filters: {
          mediaTypeFilter: {
            mediaTypes: ['PHOTO']
          }
        }
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const items = photoRes.data.mediaItems || [];
    if (items.length === 0) return null;

    const pick = items[Math.floor(Math.random() * items.length)];
    return pick.baseUrl;
  } catch (err) {
    console.error('📁 키워드 앨범 사진 실패:', err.message);
    return null;
  }
}

// 🔍 텍스트에서 "하카타에서 찍은 사진" 같은 장소 키워드 추출
function extractPhotoKeywordFromText(text) {
  const match = text.match(/([가-힣a-zA-Z0-9]+)(에서)?( 찍은)?( 사진)?/);
  return match && match[1] ? match[1] : null;
}

// 🖼 예진이 말투로 사진 설명
function getYejinPhotoComment(keyword) {
  return `${keyword}에서 우리 같이 찍은 거야~ 기억나?`; // 기본 말투
}

// ✅ 메시지에서 키워드 감지해서 사진 전송용 함수
async function handlePhotoRequestByKeyword(text, replyToken, client) {
  const keyword = extractPhotoKeywordFromText(text);
  if (!keyword) return false;

  const photoUrl = await getPhotoByKeyword(keyword);
  if (!photoUrl) return false;

  const comment = getYejinPhotoComment(keyword);

  await client.replyMessage(replyToken, [
    { type: 'image', originalContentUrl: photoUrl, previewImageUrl: photoUrl },
    { type: 'text', text: comment }
  ]);

  return true;
}

module.exports = {
  getPhotoFromGoogle,
  getPhotoByKeyword,
  extractPhotoKeywordFromText,
  getYejinPhotoComment,
  handlePhotoRequestByKeyword
};
