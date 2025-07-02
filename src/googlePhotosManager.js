const { getPhotosLibraryClient } = require('./authManager');

async function searchPhotosByKeyword(keyword) {
    try {
        const photosClient = await getPhotosLibraryClient();
        let photos = [];
        let pageToken = null;

        // 모든 미디어 아이템을 페이지별로 가져오기 (사진이 많으면 시간이 오래 걸릴 수 있음)
        // 실제 운영에서는 모든 사진을 가져오기보다, 특정 앨범을 지정하거나
        // API의 다른 필터링 옵션을 활용하는 것이 효율적일 수 있습니다.
        do {
            const res = await photosClient.mediaItems.search({
                pageSize: 100, // 한 번에 가져올 사진 수 (최대 100)
                pageToken: pageToken,
                // filters: { // Google Photos API는 직접적인 위치 기반 검색 필터를 제공하지 않습니다.
                //   mediaTypeFilter: {
                //     mediaTypes: ['PHOTO']
                //   }
                // }
            });

            // 검색 결과에서 description 또는 filename에 키워드가 포함된 경우 필터링
            // '하카타'와 같은 위치 정보가 사진의 설명이나 파일명에 포함되어 있다고 가정합니다.
            const items = res.data.mediaItems || [];
            const filteredItems = items.filter(item =>
                (item.description && item.description.toLowerCase().includes(keyword.toLowerCase())) ||
                (item.filename && item.filename.toLowerCase().includes(keyword.toLowerCase()))
            );
            photos = photos.concat(filteredItems);
            pageToken = res.data.nextPageToken;
        } while (pageToken);

        if (photos.length === 0) {
            return null; // 해당하는 사진이 없는 경우
        }

        // 필터링된 사진 중에서 랜덤으로 하나 선택
        const randomIndex = Math.floor(Math.random() * photos.length);
        const selectedPhoto = photos[randomIndex];

        // Google Photos API의 baseUrl은 임시적이며, 캐시되지 않고 요청 시마다 최신 URL을 사용해야 합니다.
        // '=w1024-h768'와 같이 크기 파라미터를 추가하여 이미지 크기를 조절할 수 있습니다.
        const photoUrl = `${selectedPhoto.baseUrl}=w1024-h768`;

        return {
            url: photoUrl,
            description: selectedPhoto.description || selectedPhoto.filename,
            id: selectedPhoto.id
        };

    } catch (error) {
        console.error('Google Photos에서 사진 검색 실패:', error);
        throw error; // 에러를 상위 호출자로 전달
    }
}

module.exports = {
    searchPhotosByKeyword
};
