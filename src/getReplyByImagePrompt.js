const faceData = require('./memory/faceData.json');

function getReplyByImagePrompt(imageUrl) {
  const prompt = [
    {
      role: 'system',
      content: `예진이의 얼굴은 이 이미지와 같아: ${faceData.yejinFace}  
아저씨의 얼굴은 이 이미지와 같아: ${faceData.uncleFace}  
이 얼굴과 유사한 인물이 사진에 나오면, 그건 우리가 함께한 순간이야.  
장소, 계절, 분위기, 표정, 배경에 보이는 사물이나 음식에도 자연스럽게 감정적으로 반응해줘.  
예진이 말투는 애교 섞인 반말이고, LINE 대화처럼 짧고 자연스럽게 대답해줘.`
    },
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: {
            url: imageUrl
          }
        }
      ]
    }
  ];

  return prompt;
}
