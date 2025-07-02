// src/googlePhotosManager.js
const { getPhotosAccessToken } = require('./authManager');
const fetch = require('node-fetch');

async function searchPhotosByKeyword(keyword) {
    try {
        const accessToken = await getPhotosAccessToken();
        let photos = [];
        let pageToken = null;

        do {
            const res = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems:search', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    pageSize: 100,
                    pageToken,
                    filters: {
                        mediaTypeFilter: {
                            mediaTypes: ['PHOTO'],
                        }
                    }
                }),
            });

            const data = await res.json();
            if (data.error) {
                throw new Error(JSON.stringify(data.error));
            }

            const items = data.mediaItems || [];
            const filteredItems = items.filter(item =>
                (item.description && item.description.toLowerCase().includes(keyword.toLowerCase())) ||
                (item.filename && item.filename.toLowerCase().includes(keyword.toLowerCase()))
            );
            photos = photos.concat(filteredItems);
            pageToken = data.nextPageToken;
        } while (pageToken);

        if (photos.length === 0) return null;

        const randomIndex = Math.floor(Math.random() * photos.length);
        const selectedPhoto = photos[randomIndex];
        const photoUrl = `${selectedPhoto.baseUrl}=w1024-h768`;

        return {
            url: photoUrl,
            description: selectedPhoto.description || selectedPhoto.filename,
            id: selectedPhoto.id
        };

    } catch (error) {
        console.error('❌ Google Photos에서 사진 검색 실패:', error);
        throw new Error('Google Photos API 인증 또는 요청에 실패했습니다.');
    }
}

module.exports = {
    searchPhotosByKeyword
};
