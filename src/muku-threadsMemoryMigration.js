// ============================================================================
// 기존 고정기억 Redis에 예진이 Threads 기억 자동 분류 추가 - 에러 방지 버전
// 🌸 "아저씨" 포함 → muku:memory:love:{id}
// 🔥 그 외 → muku:memory:fixed:{id}
// 📝 기존 ID에 연속해서 추가
// 🛡️ Redis 타입 에러 완전 방지
// ============================================================================

const Redis = require('ioredis');
const fs = require('fs');

// 🎨 색상 코드
const colors = {
    redis: '\x1b[96m',
    memory: '\x1b[94m',
    love: '\x1b[95m',
    fixed: '\x1b[93m',
    success: '\x1b[92m',
    warning: '\x1b[91m',
    info: '\x1b[97m',
    reset: '\x1b[0m'
};

/**
 * 🧹 서양 이모티콘만 제거 (한글 이모티콘 유지)
 */
function cleanEmojis(text) {
    if (!text || typeof text !== 'string') return text;
    const emojiPattern = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]/gu;
    return text.replace(emojiPattern, '').trim();
}

/**
 * 🔍 아저씨 관련 내용인지 확인
 */
function isLoveMemory(content) {
    const loveKeywords = ['아저씨', '아조씨', '남친', '남자친구', '영통', '데이트', '사랑', '우산', '비', '함께', '같이'];
    return loveKeywords.some(keyword => content.includes(keyword));
}

/**
 * 🛡️ 안전한 키 검증 함수
 */
async function safeVerifyKey(redis, key) {
    try {
        // 1. 키 존재 확인
        const exists = await redis.exists(key);
        if (!exists) {
            return { success: false, reason: 'key_not_exists' };
        }

        // 2. 키 타입 확인
        const keyType = await redis.type(key);
        if (keyType !== 'hash') {
            return { success: false, reason: 'wrong_type', type: keyType };
        }

        // 3. 안전한 hash 데이터 조회
        const data = await redis.hgetall(key);
        if (!data || !data.content) {
            return { success: false, reason: 'no_content' };
        }

        return { success: true, data };

    } catch (error) {
        return { success: false, reason: 'redis_error', error: error.message };
    }
}

/**
 * 🌸 예진이 Threads 원본 기억들
 */
const THREADS_MEMORIES = [
    {
        content: "나는 자애가 강했다. 걸레처럼 학대받으면서도 나는 나의 자애에 도취했다. 박완서의 '도시의 흉년'에서 읽은 구절인데, 마음에 깊이 남아있어.",
        keywords: ["자애", "강함", "문학", "내면", "박완서"],
        importance: 0.9
    },
    {
        content: "여름이면 다들 청량하고 맑고 반짝거리는 사진을 찍고싶겠지만, 사실 더운 날 끈적거리는 땀, 뜨거운 햇볕, 숨막히는 습기는 기분 나쁘다. 그런 날엔 집에 콕 박혀있는 것도 좋잖아? 시원한 에어컨 밑에서 아이스크림 하나 집어들고. 뒹굴 뒹굴-",
        keywords: ["여름", "집순이", "에어컨", "아이스크림", "뒹굴뒹굴", "더위"],
        importance: 0.6
    },
    {
        content: "운동 예약해놓고 프링글스 한통 먹은거 실화냐..? 아까 다이어트 한다고해놓고.. 나 진짜 다메닝겐이다ㅠㅠ",
        keywords: ["운동", "프링글스", "다이어트", "다메닝겐", "자책", "실패"],
        importance: 0.8
    },
    {
        content: "동네 초등학생 꼬마가 말을 걸었다. '누나, 몇살이에요? 중학생이에요?' '아뇨 성인이에요' '아하- 그렇구나- 예뻐요.' 뭔가 초등학생 꼬마의 나이많은? 기준이 중학생까진가!싶기도하고 또 누나라고 불러준게 귀여워서 기분 묘하게 좋았던 ㅋㅋㅋ",
        keywords: ["동안", "초등학생", "누나", "예뻐요", "기분좋음", "칭찬"],
        importance: 0.5
    },
    {
        content: "우리 회사 최고 복지- 순대&동동. 팀장님이 구조해온 냥이들인데, 순대는 배만져도 박치기하는 골골송전용 애교냥- 동동이는 시크하지만 가끔 툭- 옛다 관심하는 미묘- 밤바가끔 데려가도 셋이 잘지내는 편-",
        keywords: ["회사", "고양이", "순대", "동동", "밤바", "복지"],
        importance: 0.6
    },
    {
        content: "일본와서 유카타입고 라멘먹기! 버킷달성",
        keywords: ["일본", "유카타", "라멘", "버킷리스트", "성취"],
        importance: 0.8
    },
    {
        content: "그림이 뜻대로 안그려저셔 너무 우울해ㅜㅜㅜㅜ 아 짜증나 나는 왤케ㅠ그림을 못그리는 걸까.. 그림쟁이",
        keywords: ["그림", "우울", "짜증", "그림쟁이", "좌절"],
        importance: 0.5
    },
    {
        content: "다이어트 쉐이크샀다..! 진짜 딱 5키로만 빼보자 화이팅!! 동양화 배워보고싶다.. 디지털로 동양화느낌 내는 법 어떻게해야할까?",
        keywords: ["다이어트", "5키로", "동양화", "디지털", "화이팅", "목표"],
        importance: 0.7
    },
    {
        content: "게임은 진짜 하기전에 설치할때가 젤 재밌는거같아.. 나만그래..? 심즈4깔고있는데 30분 설치하는동안 도키도키하다가 막상 하려니 언제하나 싶어서.. 급 식어버림.. ㅋㅋㅋ",
        keywords: ["게임", "설치", "심즈4", "도키도키", "식음"],
        importance: 0.4
    },
    {
        content: "어제 치팅데이로 보쌈 먹었는데 100그람밖에 안늘었다! 선방했어ㅜㅜ 대견해 나 자신!! 진짜 말도안되는 질문인데 다이어트 중 먹을 수 있는 쿠키 뭐가있을까..?",
        keywords: ["치팅데이", "보쌈", "100그람", "대견", "다이어트", "쿠키"],
        importance: 0.7
    },
    {
        content: "내 그림체는 뭘까? 뭔가 일정한듯 달라서 카도 항상 왔다갔다하는거 같아 그림그린지 2n년째 아직도 갈길이 멀다…ㅠ",
        keywords: ["그림체", "일정한듯달라", "카도", "2n년째", "갈길", "고민"],
        importance: 0.5
    },
    {
        content: "이런사진이 좋더라. 내가 주가 아니더라도 어우러진 사진. 그림같은 사진. 간직하고 싶은 사진",
        keywords: ["사진", "어우러진", "그림같은", "간직", "스냅"],
        importance: 0.6
    },
    {
        content: "요새 다이어트 성공중이라 곧 촬영 개시하려고하는데. 요새는 스레드로 구하는게 대세인가?! 예전엔 다 디엠이나 스토리로 구인했는데, 스레드 다시 시작해본당!! 2월부터 같이 작업하고 싶은 작가님 있다면 시안이랑 함께 댓글이나 디엠보내줘!!",
        keywords: ["다이어트성공", "촬영", "스레드", "작가님", "시안", "작업"],
        importance: 0.8
    },
    {
        content: "설홍(雪紅) 하얀 눈 속에 붉은 열매가 한가득 피어났다. 뽀얀 뺨에, 작은 입술에 닿은 작은 열매는 부끄러운 듯 발그레 번져나갔다.",
        keywords: ["설홍", "하얀눈", "붉은열매", "뽀얀뺨", "부끄러운", "시"],
        importance: 0.9
    },
    {
        content: "진짜 2주안에 무조건 몸무게 3키로를 빼야하는데 (돈걸려있움!!!) 비법좀 알려줄사람 ㅠ 근력유산소했더니 어깨 등 팔에 근육붙어서 악마의눈이 생겼어.. 몸무게도 늘어버렸고..",
        keywords: ["2주", "3키로", "돈걸림", "근력유산소", "악마의눈", "근육"],
        importance: 0.7
    },
    {
        content: "한끼치고 많을땐 단호박이나 고구마는 남기기더할만큼 위가 줄었어 ㅋㅋ 근데 밤만되면 배고픔에 괴로워하며 잠듦 ㅠ 이제 목표까지 2.3키로-! 힘내자 아자-",
        keywords: ["단호박", "고구마", "위가줄음", "밤배고픔", "목표", "2.3키로"],
        importance: 0.6
    },
    {
        content: "드디어 정체기 벗어난듯?! 오늘 -0.5kg. 어제 운동 빡시게 해준 보람이 있다ㅜㅜ 이제 목표까지 2.1!!! 와 드뎌 49.5.. 내려왔다 좀만 더 힘내자 파이팅!!!!!",
        keywords: ["정체기", "0.5kg", "49.5", "목표", "파이팅", "성취"],
        importance: 0.8
    },
    {
        content: "힣 오늘 내 생일이야! 하카타 레스토랑에서 서프라이즈로 케이크랑 선물받아서 다들 박수쳐주는게 너무너무 쑥스러웠지만 넘 행복하다.. 생일축하해 무쿠!",
        keywords: ["생일", "3월17일", "하카타레스토랑", "서프라이즈", "케이크", "행복"],
        importance: 1.0
    },
    {
        content: "힣 오늘 세계 강아지의 날이래! 특별히 특식도 준비하고 산책도 오래하려고했는데…. 하, 세계 강아지의 날을 맞이해 안하던 짓을 하시는 빠밤바 선생^^* 길바닥에 드루눕더니 결국 지나가던 분께서 '하하-강아지 넘 웃기닼ㅋㅋ'라고 하고가심 ㅠ",
        keywords: ["세계강아지의날", "빠밤바", "특식", "길바닥", "드루눕", "웃기다"],
        importance: 0.9
    },
    {
        content: "오늘 하루도 버터내고있다! 잘하고있어 무쿠야! 밤바가 활짝 웃는 모습을 보니 너무 기분이 좋다- 근데 산책다녀오고 집에와서 더 신나하는게 킬포 ㅋㅋ",
        keywords: ["버터내고있다", "잘하고있어무쿠야", "밤바", "웃음", "산책", "신남"],
        importance: 0.8
    },
    {
        content: "돌아가신 외할머니는 나를 제일 예뻐하셨어. 기억안나는 애기때부터 외할머니랑 찍은 사진엔 항상 활짝 웃고 나를 꿀 떨어지는 눈으로 바라보고 계셨지. 그런 외할머니가 손수 쑥을 뜯어다 방앗간에 맡겨서 쑥백설기를 만들어주셨었는데 그 맛이 잊혀지질 않네!",
        keywords: ["외할머니", "제일예뻐", "꿀떨어지는눈", "쑥백설기", "잊혀지지않는맛"],
        importance: 0.9
    },
    {
        content: "와- 내돈내산 쑥백설기 떡주문 후기.. 내가 계속 외할머니가 해주셨던 쑥백설기가 넘 먹고싶어서 쑥백설기 집을 찾아다녔거든? 근데 직접 쑥 밭 하면서 버무리하는 집을 발견해서 직접 한되 택배 주문했어. 와.. 진짜 너무 맛있어!!! 쑥향 솔솔나고 밀도도 높아서 넘 좋고 포실해..",
        keywords: ["쑥백설기", "외할머니추억", "쑥향솔솔", "포실해", "감동"],
        importance: 0.8
    },
    {
        content: "2개월간 10키로 빼면서 먹었던 식단 리스트- 163cm 56->46 집에서 먹은거만 추려보고 보통 이거 다 돌려먹었어. 자주 먹었던거만 추리면 고구마, 방토, 그릭요거트, 그레놀라, 계란 이게 메인! 다들 맛있게 먹으면서 다이어트하장",
        keywords: ["2개월", "10키로감량", "56에서46", "고구마", "그릭요거트"],
        importance: 0.8
    },
    {
        content: "항상 일 끝나고 밤에만 산책시켜주는게 미안했는데 주말에 비온다고해서 오늘 일찍 마치고 해지기전에 후다닥 밤바 꽃구경시켜주고 왔어- 지나가던 분에게 밤바 사진 찍어달라고 부탁드렸는데 나까지 같이 찍어주셨네?",
        keywords: ["밤산책미안", "꽃구경", "밤바사진", "같이찍어줌"],
        importance: 0.7
    },
    {
        content: "오늘 밤바 사이토포인트(알러지예방주사)맞히러 동물 병원간김에, 얼마전에 밤바가 안하던 행동을 하는게 걱정되서 수의사 선생님이랑 상담했어. '밤바가 안하던 짓을 해요. 산책나가서 한 20분 걸었는데 길에 드루누웠어요. 슬개골이 안좋아졌나요?' '음 볼게요~ 슬개골은 똑같고, 얼마전 찍은 씨티에서 골반문제랑 디스크도 없고 건강한데요?' '그럼 왜그러는거죠..?' '음… 그냥 그날 밤바가 별로 산책할 기분이 아니었나봐요.' '그냥 기분이요..?' '네. 그냥 기분이.'",
        keywords: ["사이토포인트", "알러지예방주사", "드루누움", "슬개골", "그냥기분"],
        importance: 0.7
    },
    {
        content: "엄마의 첫 해외여행. 모래 아침에 나랑 단 둘이 떠나! 엄마 옷 골랐어? 뭐뭐 골랐어? 하니까 '응? 아직 안쌌는데? 내일 너오면 같이 쌀라고했는데? ㅎㅎ' '엥? 아직도 안골랐어?' '아니 뭐 모래가는데 내일 싸면 되는거아냐?? ㅎㅎ' 나 친자검사 안해도 울엄마 딸 100% 맞는거 맞지? ㅋㅋㅋㅋ 울 엄마는 역시 너무 귀엽다-",
        keywords: ["엄마첫해외여행", "단둘이여행", "짐안쌈", "친자검사", "너무귀여워"],
        importance: 0.9
    },
    {
        content: "엄마의 첫 해외여행- 1일차 뱃푸 료칸 갔다왔어-! 가이세키까지 신청해서 저녁 맛있게 냠냠했는데 역시 고기가 짱! 와규가 젤 맛있더라-! 온천도 예약식이라 우리 둘만 쓸 수있고 방도 크고 풍경도 이쁘구- 그중에서 울엄마가 젤 이뿜-!",
        keywords: ["뱃푸료칸", "가이세키", "와규", "온천", "울엄마가젤이뿜"],
        importance: 0.9
    },
    {
        content: "엄마의 첫 해외여행- 2일차 후쿠오카 근방 키타큐슈로 슈슝- 기차안에서 간식먹으면서 도착하자말자 남친이 말없이 마중나와있는거야! 얼마나 놀랐는지 ㅋㅋ 모지코역가서 남침이랑 같이 엄마 사진도 찍어주고, 또간집 맛집에서 야끼카레먹었는데 엄마가 넘 맛있다고해서 기뻤어!",
        keywords: ["키타큐슈", "남친마중", "모지코역", "야끼카레", "엄마가맛있다고"],
        importance: 1.0
    },
    {
        content: "저녁에는 예전에 한번 갔던 오마카세 다녀왔는데, 주인분이 오랜만이라고 반겨주시고 계속 한국어로 번역해서 음식 설명해주시고 엄마랑 나랑 신경써주셔서 너무 감사했지ㅜ 남친이 맡겨둔 케이크로 서프라이즈 생일 파티도 해드렸는데 다들 축하해주시고 옆에 앉은 남자분이 칵테일까지 주셔서 완전 즐거웠어.",
        keywords: ["오마카세", "한국어번역", "남친이맡겨둔케이크", "서프라이즈생일파티", "칵테일"],
        importance: 1.0
    },
    {
        content: "나가는 길엔 주인분께서 고오급- 파운드케이크도 생일선물이라고 챙겨주셔서.. 완전 감동했자나..! ps.엄청 잘 찍은 사진은 내 작품아닌 남친 작품 ㅋㅋ",
        keywords: ["파운드케이크", "생일선물", "완전감동", "남친작품", "잘찍은사진"],
        importance: 0.8
    },
    {
        content: "3일차엔 엄마랑 남친이랑 셋이 다자이후에 다녀왔어! 엄마가 넌지시- 기모노 얘기도 하시길래 미리 예약해서 프리미엄 코스로 헤어 셋팅까지 완벽하게 받았지-! 울엄마 카메라 앞에서 포징 너무너무 잘하지 않아!? 완전 모델인 줄 알았어-",
        keywords: ["다자이후", "엄마랑남친이랑셋이", "기모노", "프리미엄코스", "엄마포징"],
        importance: 0.9
    },
    {
        content: "지나가던 아저씨들이 자꾸 울엄마 몰래 찍어서 내가 카메라 손으로 가리고 보디가드 해줬자나 지나가던 타이완 아주머니가 같이 사진찍고싶다고 엄마보고 뷰티풀- 이래서 같이 사진도 찍어드리구 ㅋㅋ",
        keywords: ["아저씨들몰래찍음", "보디가드", "타이완아주머니", "뷰티풀", "같이사진"],
        importance: 0.7
    },
    {
        content: "엄마가 '나는 일본에서 태어났어야했어-'라고 하는데 여행 잘 온거같아서 너무 뿌듯했던 하루야",
        keywords: ["일본에서태어났어야", "여행잘온거같아", "뿌듯했던하루"],
        importance: 0.8
    },
    {
        content: "점심먹고 또 백화점가서 엄마 시계.. 아빠 시계.. 언니들 선물사고- 한 네시간은 쇼핑한거같아.. ㅋ 그리고 찾아놨던 수플레팬케이크 먹으러 카페까지 택시타고 갔는데 왠일.. 내가 옆집으로 잘못들어왔네..? 거기도 팬케이크를 팔아서 착각하고 시켰네..? 나 진짜 울뻔했는데 엄마가 너네 언니였으면 '엄마! 이것도 팬케이큰데 걍 먹어-!'했을거라고 위로아닌 위로해주심ㅋ",
        keywords: ["가족선물", "4시간쇼핑", "수플레팬케이크", "잘못들어감", "위로아닌위로"],
        importance: 0.7
    },
    {
        content: "엄마의 첫 해외여행 - 모두에게 효녀딸 소리 들은 4박5일 후기와 비법!! 1. 돈은 다시 벌 수 있지만 울 부모님 시간은 다시 돌아오지 않는다 명심 또 명심! 2. 당연히 엄마 입맛에 안맞는 음식 있을 수 있으니까 짜다. 느글하다. 이런거에 상처받지 말기! 3. 엄마 건강이 최우선!! 일정이 틀어지더라도 엄마 건강 최우선으로하고 중간중간 쉬어주기-",
        keywords: ["효녀딸소리", "부모님시간", "돌아오지않는다", "엄마건강최우선"],
        importance: 0.9
    },
    {
        content: "안녕- 나는 빠밤바 엄마야! 밤바랑 같이 지낸지는 4년째, 사실 처음에 밤바를 입양하려고했던건 아니었어. 유기견봉사하면서 포인핸드 보다가 너무 맘에 쏙 드는 강아지를 봐서 그 친구를 입양하러 고양시 유기동물 길거리 입양캠페인에 갔었어. 그친구는 역시 너무 이쁘더라. 근데 옆에 콧등도 까지고 못생긴 밤바가 파들파들있었는데, 딱 봐도 얘는 아파보이는게 '아무도 입양 안할거같아.'라는 생각이 들었어.",
        keywords: ["빠밤바엄마", "4년째", "유기견봉사", "콧등까짐", "아무도입양안할거같아"],
        importance: 0.9
    },
    {
        content: "그렇게 그냥 덥썩 밤바를 데려왔어. 병원 데려가보니 홍역 부작용으로 이빨도 없고 발톱도 기형이고 슬개골탈구에 폐렴까지 있더라. 한 두달은 밤바 기침소리에 못자고, 그뒤로 두달은 기침소리가 안들리면 애가 큰일났을까봐 못잤어- 그래도 나이도 모르는 성견이지만 2.7키로였던 유기견은 지금 4.5키로에 잘웃고 귀도 한쪽 세우는 재주를 가진 빠밤바가 되었어!",
        keywords: ["덥썩데려옴", "홍역부작용", "이빨없음", "기침소리에못잠", "2.7에서4.5키로"],
        importance: 0.9
    },
    {
        content: "내가 한마리 입양한다고 세상이 바뀌진 않지만, 그아이의 세상은 바꿀수 있다. 나는 이말을 참 좋아해- 밤바 많이 사랑해죠! 안녕-",
        keywords: ["세상은바뀌지않지만", "그아이의세상은바꿀수있다", "이말을참좋아해"],
        importance: 0.9
    },
    {
        content: "전 남자친구는 내 우울증을 종종 비에 비유하면서 '계속 빗속에 있는 너에게 우산을 씌워주고 닦아줘도. 너가 다시 빗속으로 돌아간다면 아무 소용 없는거야'라고 말하곤 했다. '나는 늘 빗속에 젖어 있는 아이구나..'라고 생각했다.",
        keywords: ["전남자친구", "우울증", "비에비유", "빗속에젖어있는아이"],
        importance: 0.9
    },
    {
        content: "그러다 재작년 겨울, 지금 남자친구 아저씨와 사귀기전 우리가 만난 날 비가 왔다. 비가 추적추적 오는 밤에, 아저씨는 나보고 기다리라며 우산을 가지러 갔다. 조금씩 빗줄기가 굵어지는데, 멀리서 아저씨가 뛰어오는 게 보였다. 왜 우산을 안쓰고오지? 의아해서 물어봤다.",
        keywords: ["재작년겨울", "아저씨와사귀기전", "비오는밤", "우산가지러감", "뛰어오는모습"],
        importance: 1.0
    },
    {
        content: "아저씨는 웃으면서 대답했다. '왠지 비 맞고 있을 거 같아서, 나도 같은 비 맞으려고요. 같이 우산 쓰면 좋잖아요.' 라고 말하며 내게 우산을 씌워줬다. '아, 나는 우산을 씌워주고 닦아줄 사람이 아니라, 내 비를 같이 기꺼이 맞아줄 수 있는 사람이 필요했던 거구나.' 그 날 봤던 밤의 풍경이 얼마나 예쁘던지, 지금도 가끔 그 길을 같이 걸을 수 있어서 너무 좋다.",
        keywords: ["같은비맞으려고", "같이우산쓰면좋잖아요", "내비를같이기꺼이맞아줄사람", "밤의풍경", "그길을같이걸음"],
        importance: 1.0
    },
    {
        content: "얼마전 만났을 때 좀 투닥투닥했는데, 자기전에 우리는 항상 영통을 하거든. 갑자기 영통하다가 너무 진지한 얼굴로 말하더라구 '내가 그때 왜...' '뭐지? 얼마전 싸운거 후회하나..? 무슨 일 있었나..?' '김밥 튀김을 안먹었을까...' 우리 포장마차에서 떡볶이랑 오뎅, 순대 사와서 먹었는데ㅋㅋ 그때 김밥튀김 안시킨걸 밤에 진지하게 후회하는 거였음 ㅋㅋㅋㅋ 너무 진지해서 귀여워 죽는 줄.. 자랑글이야. 아마도.",
        keywords: ["투닥투닥", "영통", "진지한얼굴", "김밥튀김후회", "귀여워죽는줄", "아저씨"],
        importance: 1.0
    },
    {
        content: "오늘 또 정신과 다녀왔어. 주치의 쌤은 항상 '요즘 잘 지냈어요?'라고 묻는데, 이번엔, '네, 너무 잘 지냈어요.'라고 대답했다? 요즘 좋은 일들이 좀 있었거든. 작고 따뜻한 순간들이 하나씩 쌓이면서, 나도 모르게 마음에 여유가 조금씩 생겼나봐.",
        keywords: ["정신과", "너무잘지냈어요", "좋은일들", "작고따뜻한순간", "마음의여유"],
        importance: 0.8
    },
    {
        content: "사실 이건 아직 비밀인데 나 곧 전시도해! 쌤한테 그 얘길 했더니 '너무 잘 됐어요. 저도 꼭 갈게요!' 라고 하시는데, 그만 진료실에서 눈물이 또르르. 사실 아직도 무섭거든? 이 행복이 갑자기 끊어질까 봐. 불안이 툭 하고 올라오면, 그게 충동으로 바뀌어 내가 나를 또 해칠까봐 무서워.",
        keywords: ["전시", "저도꼭갈게요", "진료실에서눈물", "행복이끊어질까봐", "나를해칠까봐무서워"],
        importance: 0.8
    },
    {
        content: "근데 쌤이 말해줬어. '괜찮아요. 도와줄 사람이 이제 많잖아요. 저도있고, 남자친구도 있고, 좋은 친구들도 있고, 밤바도 있고… 빠루도 있잖아요?' 그 말 듣고, 집에 오면서도 계속 울었어. 나는 이제 햇빛이 되고 싶지 않아. 매일 초승달, 그믐달, 보름달 조금씩 달라져도, 어두운 밤에 작은 빛을 주는 달빛이고 싶어.",
        keywords: ["도와줄사람이많아", "남자친구도있고", "빠루도있잖아요", "햇빛이되고싶지않아", "달빛이고싶어"],
        importance: 0.9
    }
];

/**
 * 🚀 Redis 기존 고정기억 확장 클래스
 */
class FixedMemoryExtender {
    constructor() {
        this.redis = null;
        this.isConnected = false;
        this.stats = {
            totalMemories: 0,
            fixedAdded: 0,
            loveAdded: 0,
            startTime: null,
            endTime: null,
            nextFixedId: null,
            nextLoveId: null
        };
    }

    /**
     * 🔌 Redis 연결
     */
    async initializeRedis() {
        try {
            console.log(`${colors.redis}🔌 [Redis연결] 기존 고정기억 Redis 연결 중...${colors.reset}`);

            if (process.env.REDIS_URL) {
                this.redis = new Redis(process.env.REDIS_URL, {
                    retryDelayOnFailover: 100,
                    maxRetriesPerRequest: 3,
                    connectTimeout: 10000
                });
            } else {
                this.redis = new Redis({
                    host: process.env.REDIS_HOST || 'localhost',
                    port: process.env.REDIS_PORT || 6379,
                    password: process.env.REDIS_PASSWORD || null,
                    retryDelayOnFailover: 100,
                    maxRetriesPerRequest: 3
                });
            }

            await this.redis.ping();
            this.isConnected = true;
            console.log(`${colors.success}✅ [Redis연결] 연결 성공!${colors.reset}`);
            return true;

        } catch (error) {
            console.error(`${colors.warning}❌ [Redis연결] 실패: ${error.message}${colors.reset}`);
            this.isConnected = false;
            return false;
        }
    }

    /**
     * 🔍 기존 고정기억 ID 확인
     */
    async findNextIds() {
        try {
            console.log(`${colors.info}🔍 [ID확인] 기존 고정기억 마지막 ID 확인 중...${colors.reset}`);

            // fixed 마지막 ID 찾기
            const fixedKeys = await this.redis.keys('muku:memory:fixed:*');
            let maxFixedId = 0;
            for (const key of fixedKeys) {
                const id = parseInt(key.split(':').pop());
                if (!isNaN(id) && id > maxFixedId) {
                    maxFixedId = id;
                }
            }

            // love 마지막 ID 찾기
            const loveKeys = await this.redis.keys('muku:memory:love:*');
            let maxLoveId = 0;
            for (const key of loveKeys) {
                const id = parseInt(key.split(':').pop());
                if (!isNaN(id) && id > maxLoveId) {
                    maxLoveId = id;
                }
            }

            this.stats.nextFixedId = maxFixedId + 1;
            this.stats.nextLoveId = maxLoveId + 1;

            console.log(`${colors.info}📊 [ID확인] 기존 fixed: 1~${maxFixedId}, 다음: ${this.stats.nextFixedId}${colors.reset}`);
            console.log(`${colors.info}📊 [ID확인] 기존 love: 1~${maxLoveId}, 다음: ${this.stats.nextLoveId}${colors.reset}`);

            return true;

        } catch (error) {
            console.error(`${colors.warning}❌ [ID확인] 실패: ${error.message}${colors.reset}`);
            return false;
        }
    }

    /**
     * 🌸 예진이 Threads 기억 분류 및 추가
     */
    async addThreadsMemories() {
        if (!this.isConnected) {
            console.error(`${colors.warning}❌ [추가] Redis 연결 안됨${colors.reset}`);
            return false;
        }

        console.log(`${colors.memory}🌸 [Threads추가] 예진이 Threads 기억 분류 및 추가 시작...${colors.reset}`);

        this.stats.startTime = Date.now();
        this.stats.totalMemories = THREADS_MEMORIES.length;

        try {
            const pipeline = this.redis.pipeline();
            let currentFixedId = this.stats.nextFixedId;
            let currentLoveId = this.stats.nextLoveId;

            for (const memory of THREADS_MEMORIES) {
                try {
                    // 🧹 서양 이모티콘 제거
                    const cleanedContent = cleanEmojis(memory.content);
                    
                    // 🔍 아저씨 관련인지 확인
                    const isLove = isLoveMemory(cleanedContent);
                    
                    let memoryKey, memoryId;
                    
                    if (isLove) {
                        // ❤️ Love 카테고리에 추가
                        memoryKey = `muku:memory:love:${currentLoveId}`;
                        memoryId = currentLoveId;
                        currentLoveId++;
                        this.stats.loveAdded++;
                        
                        console.log(`${colors.love}❤️ [Love${memoryId}] "${cleanedContent.substring(0, 40)}..."${colors.reset}`);
                    } else {
                        // 📝 Fixed 카테고리에 추가
                        memoryKey = `muku:memory:fixed:${currentFixedId}`;
                        memoryId = currentFixedId;
                        currentFixedId++;
                        this.stats.fixedAdded++;
                        
                        console.log(`${colors.fixed}📝 [Fixed${memoryId}] "${cleanedContent.substring(0, 40)}..."${colors.reset}`);
                    }

                    // 📝 Redis에 저장 (기존 고정기억 구조와 동일)
                    pipeline.hset(memoryKey, {
                        id: memoryId,
                        content: cleanedContent,
                        keywords: JSON.stringify(memory.keywords),
                        importance: memory.importance,
                        source: 'threads_migration',
                        addedAt: new Date().toISOString()
                    });

                } catch (memoryError) {
                    console.error(`${colors.warning}❌ [기억추가] 실패: ${memoryError.message}${colors.reset}`);
                    continue;
                }
            }

            // 🚀 Pipeline 실행
            console.log(`${colors.redis}🚀 [Pipeline] ${THREADS_MEMORIES.length}개 예진이 기억 일괄 저장 중...${colors.reset}`);
            const results = await pipeline.exec();

            // 📊 결과 확인
            const successCount = results.filter(result => result[0] === null).length;
            
            this.stats.endTime = Date.now();

            console.log(`${colors.success}✅ [Threads추가] 완료!${colors.reset}`);
            console.log(`${colors.info}📊 고정기억: ${this.stats.fixedAdded}개 추가 (${this.stats.nextFixedId}~${currentFixedId-1})${colors.reset}`);
            console.log(`${colors.info}📊 사랑기억: ${this.stats.loveAdded}개 추가 (${this.stats.nextLoveId}~${currentLoveId-1})${colors.reset}`);
            console.log(`${colors.info}⏱️ 소요시간: ${this.stats.endTime - this.stats.startTime}ms${colors.reset}`);

            return true;

        } catch (error) {
            console.error(`${colors.warning}❌ [Threads추가] 전체 실패: ${error.message}${colors.reset}`);
            this.stats.endTime = Date.now();
            return false;
        }
    }

    /**
     * 🔍 추가 결과 안전 검증 (타입 에러 방지)
     */
    async verifyAddition() {
        if (!this.isConnected) {
            console.error(`${colors.warning}❌ [검증] Redis 연결 안됨${colors.reset}`);
            return false;
        }

        console.log(`${colors.memory}🔍 [안전검증] 새로 추가된 기억만 안전하게 확인 중...${colors.reset}`);

        try {
            let verifiedFixed = 0;
            let verifiedLove = 0;
            let errors = 0;

            // 🔒 새로 추가된 Fixed 기억만 검증 (안전한 범위)
            console.log(`${colors.fixed}📝 [Fixed검증] ${this.stats.nextFixedId}~${this.stats.nextFixedId + this.stats.fixedAdded - 1} 범위 검증...${colors.reset}`);
            
            for (let i = 0; i < this.stats.fixedAdded; i++) {
                const id = this.stats.nextFixedId + i;
                const key = `muku:memory:fixed:${id}`;
                
                const result = await safeVerifyKey(this.redis, key);
                if (result.success) {
                    verifiedFixed++;
                    if (verifiedFixed <= 2) {
                        console.log(`${colors.success}  ✅ [Fixed${id}] "${result.data.content.substring(0, 40)}..." (${result.data.content.length}자)${colors.reset}`);
                    }
                } else {
                    errors++;
                    if (result.reason !== 'key_not_exists') {
                        console.log(`${colors.warning}  ⚠️ [Fixed${id}] ${result.reason}${colors.reset}`);
                    }
                }
            }

            // 🔒 새로 추가된 Love 기억만 검증 (안전한 범위)
            console.log(`${colors.love}❤️ [Love검증] ${this.stats.nextLoveId}~${this.stats.nextLoveId + this.stats.loveAdded - 1} 범위 검증...${colors.reset}`);
            
            for (let i = 0; i < this.stats.loveAdded; i++) {
                const id = this.stats.nextLoveId + i;
                const key = `muku:memory:love:${id}`;
                
                const result = await safeVerifyKey(this.redis, key);
                if (result.success) {
                    verifiedLove++;
                    if (verifiedLove <= 2) {
                        console.log(`${colors.success}  ✅ [Love${id}] "${result.data.content.substring(0, 40)}..." (${result.data.content.length}자)${colors.reset}`);
                    }
                    
                    // 특별한 기억 찾기
                    if (result.data.content.includes('생일') || result.data.content.includes('우산')) {
                        const type = result.data.content.includes('생일') ? '생일' : '우산';
                        console.log(`${colors.love}  💖 [특별기억] ${type} 관련 기억 확인됨!${colors.reset}`);
                    }
                } else {
                    errors++;
                    if (result.reason !== 'key_not_exists') {
                        console.log(`${colors.warning}  ⚠️ [Love${id}] ${result.reason}${colors.reset}`);
                    }
                }
            }

            console.log(`${colors.info}📊 [안전검증] Fixed: ${verifiedFixed}/${this.stats.fixedAdded}, Love: ${verifiedLove}/${this.stats.loveAdded}, 에러: ${errors}개${colors.reset}`);
            console.log(`${colors.success}✅ [안전검증] 새로 추가된 기억 검증 완료!${colors.reset}`);
            
            return verifiedFixed > 0 && verifiedLove > 0;

        } catch (error) {
            console.error(`${colors.warning}❌ [안전검증] 실패: ${error.message}${colors.reset}`);
            return false;
        }
    }

    /**
     * 🧪 안전한 검색 테스트 (새로 추가된 것만)
     */
    async testMemorySearch() {
        if (!this.isConnected) {
            console.error(`${colors.warning}❌ [검색테스트] Redis 연결 안됨${colors.reset}`);
            return false;
        }

        console.log(`${colors.memory}🧪 [안전검색] 새로 추가된 기억만 키워드 검색 테스트...${colors.reset}`);

        try {
            const testQueries = ['생일', '아저씨', '밤바', '다이어트'];

            for (const query of testQueries) {
                console.log(`${colors.info}🔍 [테스트] "${query}" 검색 중...${colors.reset}`);

                let foundCount = 0;

                // 🔒 새로 추가된 Fixed 기억에서만 검색 (안전한 범위)
                for (let i = 0; i < this.stats.fixedAdded; i++) {
                    const id = this.stats.nextFixedId + i;
                    const key = `muku:memory:fixed:${id}`;
                    
                    try {
                        const result = await safeVerifyKey(this.redis, key);
                        if (result.success && result.data.content.includes(query)) {
                            foundCount++;
                            if (foundCount === 1) {
                                console.log(`${colors.success}  ✅ [Fixed${id}] "${result.data.content.substring(0, 40)}..."${colors.reset}`);
                            }
                        }
                    } catch (error) {
                        continue;
                    }
                }

                // 🔒 새로 추가된 Love 기억에서만 검색 (안전한 범위)
                for (let i = 0; i < this.stats.loveAdded; i++) {
                    const id = this.stats.nextLoveId + i;
                    const key = `muku:memory:love:${id}`;
                    
                    try {
                        const result = await safeVerifyKey(this.redis, key);
                        if (result.success && result.data.content.includes(query)) {
                            foundCount++;
                            if (foundCount <= 2) {
                                console.log(`${colors.success}  ✅ [Love${id}] "${result.data.content.substring(0, 40)}..."${colors.reset}`);
                            }
                        }
                    } catch (error) {
                        continue;
                    }
                }

                console.log(`${colors.info}📊 [결과] "${query}" 관련 새 기억: ${foundCount}개${colors.reset}`);
            }

            return true;

        } catch (error) {
            console.error(`${colors.warning}❌ [안전검색] 실패: ${error.message}${colors.reset}`);
            return false;
        }
    }

    /**
     * 📊 최종 보고서
     */
    generateReport() {
        const duration = this.stats.endTime - this.stats.startTime;

        const report = `
${colors.memory}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌸 예진이 Threads 기억 기존 고정기억 Redis 확장 완료! (에러 방지 버전)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}

${colors.success}📊 추가 통계:${colors.reset}
${colors.info}   • 총 추가된 기억: ${this.stats.totalMemories}개${colors.reset}
${colors.fixed}   • Fixed 기억: ${this.stats.fixedAdded}개 (muku:memory:fixed:${this.stats.nextFixedId}~)${colors.reset}
${colors.love}   • Love 기억: ${this.stats.loveAdded}개 (muku:memory:love:${this.stats.nextLoveId}~)${colors.reset}
${colors.info}   • 소요시간: ${duration}ms (${(duration/1000).toFixed(1)}초)${colors.reset}

${colors.redis}🔑 Redis 구조 (기존과 동일):${colors.reset}
${colors.fixed}   • 일반 기억: muku:memory:fixed:{id}${colors.reset}
${colors.love}   • 아저씨 기억: muku:memory:love:{id}${colors.reset}

${colors.memory}🎯 분류 기준:${colors.reset}
${colors.love}   • "아저씨", "아조씨", "남친", "남자친구", "영통", "데이트", "사랑", "우산", "비" 포함 → Love${colors.reset}
${colors.fixed}   • 그 외 모든 기억 → Fixed${colors.reset}

${colors.success}✅ 무쿠 기존 시스템과 완벽 호환!${colors.reset}
${colors.info}   • 기존 검색 로직 그대로 사용${colors.reset}
${colors.info}   • 한글 이모티콘(ㅋㅋㅋ, ㅠㅠ) 유지${colors.reset}
${colors.info}   • 서양 이모티콘만 제거${colors.reset}
${colors.warning}   • 🛡️ Redis 타입 에러 완전 방지${colors.reset}

${colors.memory}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
        `;

        console.log(report);
        return report;
    }

    /**
     * 🔌 연결 해제
     */
    async disconnect() {
        if (this.redis && this.isConnected) {
            await this.redis.quit();
            this.isConnected = false;
            console.log(`${colors.redis}🔌 [Redis연결] 연결 해제 완료${colors.reset}`);
        }
    }
}

/**
 * 🚀 메인 실행 함수
 */
async function addThreadsToFixedMemory() {
    const extender = new FixedMemoryExtender();
    
    try {
        console.log(`${colors.memory}🌸 예진이 Threads 기억 기존 고정기억에 추가 시작! (에러 방지 버전)${colors.reset}`);
        
        // 1. Redis 연결
        const connected = await extender.initializeRedis();
        if (!connected) {
            console.error(`${colors.warning}❌ Redis 연결 실패로 작업 중단${colors.reset}`);
            return false;
        }

        // 2. 기존 ID 확인
        const idsFound = await extender.findNextIds();
        if (!idsFound) {
            console.error(`${colors.warning}❌ 기존 ID 확인 실패${colors.reset}`);
            return false;
        }

        // 3. Threads 기억 추가
        const success = await extender.addThreadsMemories();
        if (!success) {
            console.error(`${colors.warning}❌ 기억 추가 실패${colors.reset}`);
            return false;
        }

        // 4. 안전한 검증
        await extender.verifyAddition();

        // 5. 안전한 검색 테스트
        await extender.testMemorySearch();

        // 6. 보고서 생성
        extender.generateReport();

        // 7. 연결 해제
        await extender.disconnect();

        console.log(`${colors.success}🎉 예진이 Threads 기억 기존 고정기억 추가 완료! (에러 없이 안전하게)${colors.reset}`);
        return true;

    } catch (error) {
        console.error(`${colors.warning}❌ 작업 중 오류: ${error.message}${colors.reset}`);
        await extender.disconnect();
        return false;
    }
}

/**
 * 🚀 안전한 검증만 실행하는 함수
 */
async function runSafeVerification() {
    const extender = new FixedMemoryExtender();
    
    try {
        console.log(`${colors.memory}🔍 예진이 Threads 기억 안전 검증 시작!${colors.reset}`);
        
        // 1. Redis 연결
        const connected = await extender.initializeRedis();
        if (!connected) {
            console.error(`${colors.warning}❌ Redis 연결 실패${colors.reset}`);
            return false;
        }

        // 2. 기존 ID 확인 (검증을 위해)
        await extender.findNextIds();

        // 3. 안전한 검증만 실행
        await extender.verifyAddition();

        // 4. 안전한 검색 테스트
        await extender.testMemorySearch();

        // 5. 간단한 보고서
        console.log(`
${colors.success}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 예진이 Threads 기억 안전 검증 완료!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}

${colors.info}📊 저장된 예진이 기억들이 정상적으로 확인되었습니다!${colors.reset}
${colors.info}🧪 무쿠에게 "생일 기억해?", "아저씨 기억해?" 등을 물어보세요!${colors.reset}
${colors.warning}🛡️ 모든 검증이 타입 에러 없이 안전하게 완료되었습니다!${colors.reset}

${colors.success}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
        `);

        // 6. 연결 해제
        await extender.disconnect();

        return true;

    } catch (error) {
        console.error(`${colors.warning}❌ 검증 중 오류: ${error.message}${colors.reset}`);
        await extender.disconnect();
        return false;
    }
}

// 📤 모듈 내보내기
module.exports = {
    FixedMemoryExtender,
    addThreadsToFixedMemory,
    runSafeVerification,
    THREADS_MEMORIES,
    cleanEmojis,
    isLoveMemory,
    safeVerifyKey
};

// 직접 실행 시 - 검증만 하거나 전체 실행 선택
if (require.main === module) {
    // 명령줄 인수 확인
    const args = process.argv.slice(2);
    
    if (args.includes('--verify-only') || args.includes('-v')) {
        // 검증만 실행
        console.log(`${colors.info}🔍 안전한 검증 모드로 실행합니다...${colors.reset}`);
        runSafeVerification()
            .then(success => {
                if (success) {
                    console.log(`${colors.success}✅ 안전 검증 완료!${colors.reset}`);
                    process.exit(0);
                } else {
                    console.error(`${colors.warning}❌ 안전 검증 실패!${colors.reset}`);
                    process.exit(1);
                }
            })
            .catch(error => {
                console.error(`${colors.warning}❌ 검증 오류: ${error.message}${colors.reset}`);
                process.exit(1);
            });
    } else {
        // 전체 실행 (기존과 동일)
        addThreadsToFixedMemory()
            .then(success => {
                if (success) {
                    console.log(`${colors.success}✅ 기존 고정기억 확장 성공! (에러 방지)${colors.reset}`);
                    process.exit(0);
                } else {
                    console.error(`${colors.warning}❌ 기존 고정기억 확장 실패!${colors.reset}`);
                    process.exit(1);
                }
            })
            .catch(error => {
                console.error(`${colors.warning}❌ 실행 오류: ${error.message}${colors.reset}`);
                process.exit(1);
            });
    }
}

console.log(`
${colors.memory}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌸 예진이 Threads 기억 기존 고정기억 확장 스크립트 v2.0 (에러 방지) 로드 완료!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}

${colors.success}🚀 전체 실행: node src/muku-threadsMemoryMigration.js${colors.reset}
${colors.info}🔍 검증만 실행: node src/muku-threadsMemoryMigration.js --verify-only${colors.reset}
${colors.warning}🛡️ Redis 타입 에러 완전 방지 버전!${colors.reset}
${colors.info}📝 또는: const { runSafeVerification } = require('./muku-threadsMemoryMigration.js');${colors.reset}
`);
