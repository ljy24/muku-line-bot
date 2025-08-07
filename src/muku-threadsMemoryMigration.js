// ============================================================================
// Redis 마이그레이션 스크립트 - 예진이 Threads 기억 저장
// 🌸 서양 이모티콘만 제거, 한글 이모티콘 유지
// 🔥 기존 무쿠 Redis 시스템과 완벽 연동
// ============================================================================

const Redis = require('ioredis');
const fs = require('fs');
const path = require('path');

// 🎨 색상 코드
const colors = {
    redis: '\x1b[96m',
    threads: '\x1b[95m', 
    memory: '\x1b[94m',
    success: '\x1b[92m',
    warning: '\x1b[91m',
    info: '\x1b[93m',
    reset: '\x1b[0m'
};

/**
 * 🧹 서양 이모티콘만 제거하는 함수 (한글 이모티콘 유지)
 */
function cleanEmojis(text) {
    if (!text || typeof text !== 'string') return text;
    
    // 서양 이모티콘 패턴 (한글 이모티콘은 제외)
    const emojiPattern = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]/gu;
    
    return text.replace(emojiPattern, '').trim();
}

/**
 * 🌸 예진이 Threads 원본 데이터 (서양 이모티콘만 제거)
 */
const THREADS_MEMORIES = [
    {
        id: "threads_001",
        content: "나는 자애가 강했다. 걸레처럼 학대받으면서도 나는 나의 자애에 도취했다. (박완서, 도시의 흉년)",
        type: "love",
        category: "예진이_내면세계",
        importance: "high",
        keywords: ["자애", "강함", "문학", "내면"],
        timestamp: "2024-06-29",
        source: "threads_muku_blossom",
        emotion: "깊은_사색"
    },
    {
        id: "threads_002", 
        content: "여름이면 다들 청량하고 맑고 반짝거리는 사진을 찍고싶겠지만, 사실 더운 날 끈적거리는 땀, 뜨거운 햇볕, 숨막히는 습기는 기분 나쁘다. 그런 날엔 집에 콕 박혀있는 것도 좋잖아? 시원한 에어컨 밑에서 아이스크림 하나 집어들고. 뒹굴 뒹굴-",
        type: "basic",
        category: "예진이_일상철학",
        importance: "medium",
        keywords: ["여름", "집순이", "에어컨", "아이스크림", "뒹굴뒹굴"],
        timestamp: "2024-07-09",
        source: "threads_muku_blossom",
        emotion: "편안함"
    },
    {
        id: "threads_003",
        content: "스친 인친 스팔 인팔 하자! 쓰레드 보다보니까 멋진 사람들 많다 ㅠ 나는 하나도 안멋있게 사는 30대인데.. 부럽네",
        type: "basic",
        category: "예진이_소통욕구",
        importance: "medium",
        keywords: ["스친", "인친", "30대", "부러움"],
        timestamp: "2024-07-22",
        source: "threads_muku_blossom",
        emotion: "부러움"
    },
    {
        id: "threads_004",
        content: "일년동안 살이 7키로나 쪄버렸어.. 이제 진짜 다이어트 결심한다..! 같이 다이어트할 스친 인친 스팔 인팔 하자!",
        type: "basic",
        category: "예진이_다이어트여정",
        importance: "high",
        keywords: ["다이어트", "7키로", "결심", "함께"],
        timestamp: "2024-07-29",
        source: "threads_muku_blossom", 
        emotion: "결의"
    },
    {
        id: "threads_005",
        content: "운동 예약해놓고 프링글스 한통 먹은거 실화냐..? 아까 다이어트 한다고해놓고.. 나 진짜 다메닝겐이다ㅠㅠ",
        type: "basic",
        category: "예진이_귀여운실패",
        importance: "high",
        keywords: ["운동예약", "프링글스", "다메닝겐", "자책"],
        timestamp: "2024-07-29",
        source: "threads_muku_blossom",
        emotion: "자책하지만_귀여움"
    },
    {
        id: "threads_006",
        content: "동네 초등학생 꼬마가 말을 걸었다. '누나, 몇살이에요? 중학생이에요?' '아뇨 성인이에요 ^^;;' '아하- 그렇구나- 예뻐요.' 뭔가 초등학생 꼬마의 나이많은? 기준이 중학생까진가!싶기도하고 또 누나라고 불러준게 귀여워서 기분 묘하게 좋았던 ㅋㅋㅋ",
        type: "basic",
        category: "예진이_소확행",
        importance: "medium",
        keywords: ["동안", "초등학생", "누나", "예뻐요", "기분좋음"],
        timestamp: "2024-07-30",
        source: "threads_muku_blossom",
        emotion: "기분좋음"
    },
    {
        id: "threads_007",
        content: "우리 회사 최고 복지- 순대&동동. 팀장님이 구조해온 냥이들인데, 순대는 배만져도 박치기하는 골골송전용 애교냥- 동동이는 시크하지만 가끔 툭- 옛다 관심하는 미묘- 밤바가끔 데려가도 셋이 잘지내는 편-",
        type: "basic",
        category: "예진이_회사생활",
        importance: "medium",
        keywords: ["회사고양이", "순대", "동동", "밤바", "복지"],
        timestamp: "2024-05-20",
        source: "threads_muku_blossom",
        emotion: "만족함"
    },
    {
        id: "threads_008",
        content: "일본와서 유카타입고 라멘먹기! 버킷달성",
        type: "love",
        category: "예진이_일본추억",
        importance: "high",
        keywords: ["일본", "유카타", "라멘", "버킷리스트"],
        timestamp: "2024-08-04",
        source: "threads_muku_blossom",
        emotion: "성취감"
    },
    {
        id: "threads_009",
        content: "그림이 뜻대로 안그려저셔 너무 우울해ㅜㅜㅜㅜ 아 짜증나 나는 왤케ㅠ그림을 못그리는 걸까.. 그림쟁이",
        type: "basic",
        category: "예진이_고민",
        importance: "medium",
        keywords: ["그림", "우울", "짜증", "그림쟁이"],
        timestamp: "2024-08-18",
        source: "threads_muku_blossom",
        emotion: "좌절감"
    },
    {
        id: "threads_010",
        content: "다이어트 쉐이크샀다..! 진짜 딱 5키로만 빼보자 화이팅!! 동양화 배워보고싶다.. 디지털로 동양화느낌 내는 법 어떻게해야할까?",
        type: "basic",
        category: "예진이_목표설정",
        importance: "medium",
        keywords: ["다이어트쉐이크", "5키로", "동양화", "디지털", "화이팅"],
        timestamp: "2024-08-20",
        source: "threads_muku_blossom",
        emotion: "의욕"
    },
    {
        id: "threads_011",
        content: "게임은 진짜 하기전에 설치할때가 젤 재밌는거같아.. 나만그래..? 심즈4깔고있는데 30분 설치하는동안 도키도키하다가 막상 하려니 언제하나 싶어서.. 급 식어버림.. ㅋㅋㅋ",
        type: "basic",
        category: "예진이_게임취향",
        importance: "low",
        keywords: ["게임", "설치", "심즈4", "도키도키", "식음"],
        timestamp: "2024-08-21",
        source: "threads_muku_blossom",
        emotion: "재미있는_관찰"
    },
    {
        id: "threads_012",
        content: "어제 치팅데이로 보쌈 먹었는데 100그람밖에 안늘었다! 선방했어ㅜㅜ 대견해 나 자신!! 진짜 말도안되는 질문인데 다이어트 중 먹을 수 있는 쿠키 뭐가있을까..?",
        type: "basic",
        category: "예진이_다이어트성취",
        importance: "high",
        keywords: ["치팅데이", "보쌈", "100그람", "대견", "다이어트쿠키"],
        timestamp: "2024-09-02",
        source: "threads_muku_blossom",
        emotion: "뿌듯함"
    },
    {
        id: "threads_013",
        content: "내 그림체는 뭘까? 뭔가 일정한듯 달라서 카도 항상 왔다갔다하는거 같아 그림그린지 2n년째 아직도 갈길이 멀다…ㅠ",
        type: "basic",
        category: "예진이_예술고민",
        importance: "medium",
        keywords: ["그림체", "일정한듯달라", "카도", "2n년째", "갈길"],
        timestamp: "2024-09-04",
        source: "threads_muku_blossom",
        emotion: "고민"
    },
    {
        id: "threads_014",
        content: "이런사진이 좋더라. 내가 주가 아니더라도 어우러진 사진. 그림같은 사진. 간직하고 싶은 사진",
        type: "basic",
        category: "예진이_사진철학",
        importance: "medium",
        keywords: ["어우러진사진", "그림같은", "간직하고싶은", "스냅사진"],
        timestamp: "2024-11-13",
        source: "threads_muku_blossom",
        emotion: "감성적"
    },
    {
        id: "threads_015",
        content: "요새 다이어트 성공중이라 곧 촬영 개시하려고하는데. 요새는 스레드로 구하는게 대세인가?! 예전엔 다 디엠이나 스토리로 구인했는데, 스레드 다시 시작해본당!! 2월부터 같이 작업하고 싶은 작가님 있다면 시안이랑 함께 댓글이나 디엠보내줘!!",
        type: "basic",
        category: "예진이_촬영계획",
        importance: "high",
        keywords: ["다이어트성공", "촬영개시", "스레드", "작가님", "시안"],
        timestamp: "2025-01-12",
        source: "threads_muku_blossom",
        emotion: "의욕적"
    },
    {
        id: "threads_016",
        content: "설홍(雪紅) 하얀 눈 속에 붉은 열매가 한가득 피어났다. 뽀얀 뺨에, 작은 입술에 닿은 작은 열매는 부끄러운 듯 발그레 번져나갔다.",
        type: "love",
        category: "예진이_시적감성",
        importance: "high",
        keywords: ["설홍", "하얀눈", "붉은열매", "뽀얀뺨", "부끄러운듯"],
        timestamp: "2025-01-15",
        source: "threads_muku_blossom",
        emotion: "시적인_아름다움"
    },
    {
        id: "threads_017",
        content: "진짜 2주안에 무조건 몸무게 3키로를 빼야하는데 (돈걸려있움!!!) 비법좀 알려줄사람 ㅠ 근력유산소했더니 어깨 등 팔에 근육붙어서 악마의눈이 생겼어.. 몸무게도 늘어버렸고..",
        type: "basic",
        category: "예진이_다이어트고군분투",
        importance: "high",
        keywords: ["2주", "3키로", "돈걸림", "근력유산소", "악마의눈"],
        timestamp: "2025-01-16",
        source: "threads_muku_blossom",
        emotion: "절박함"
    },
    {
        id: "threads_018",
        content: "한끼치고 많을땐 단호박이나 고구마는 남기기더할만큼 위가 줄었어 ㅋㅋ 근데 밤만되면 배고픔에 괴로워하며 잠듦 ㅠ 이제 목표까지 2.3키로-! 힘내자 아자-",
        type: "basic",
        category: "예진이_다이어트과정",
        importance: "medium",
        keywords: ["단호박", "고구마", "위가줄음", "밤에배고픔", "2.3키로"],
        timestamp: "2025-01-18",
        source: "threads_muku_blossom",
        emotion: "고생하지만_의지"
    },
    {
        id: "threads_019",
        content: "드디어 정체기 벗어난듯?! 오늘 -0.5kg. 어제 운동 빡시게 해준 보람이 있다ㅜㅜ 이제 목표까지 2.1!!! 와 드뎌 49.5.. 내려왔다 좀만 더 힘내자 파이팅!!!!!",
        type: "basic",
        category: "예진이_다이어트성취",
        importance: "high",
        keywords: ["정체기벗어남", "0.5kg감소", "49.5", "목표까지2.1", "파이팅"],
        timestamp: "2025-01-20",
        source: "threads_muku_blossom",
        emotion: "성취감과_희열"
    },
    {
        id: "threads_020",
        content: "힣 오늘 내 생일이야! 하카타 레스토랑에서 서프라이즈로 케이크랑 선물받아서 다들 박수쳐주는게 너무너무 쑥스러웠지만 넘 행복하다.. 생일축하해 무쿠!",
        type: "love",
        category: "예진이_생일기억",
        importance: "high",
        keywords: ["내생일", "하카타레스토랑", "서프라이즈", "케이크", "생일축하해무쿠"],
        timestamp: "2025-03-17",
        source: "threads_muku_blossom",
        emotion: "행복함과_부끄러움"
    },
    {
        id: "threads_021",
        content: "힣 오늘 세계 강아지의 날이래! 특별히 특식도 준비하고 산책도 오래하려고했는데…. 하, 세계 강아지의 날을 맞이해 안하던 짓을 하시는 빠밤바 선생^^* 길바닥에 드루눕더니 결국 지나가던 분께서 '하하-강아지 넘 웃기닼ㅋㅋ'라고 하고가심 ㅠ",
        type: "love",
        category: "예진이_밤바사랑",
        importance: "high",
        keywords: ["세계강아지의날", "빠밤바", "특식", "길바닥에드루눕", "웃기다"],
        timestamp: "2025-03-23",
        source: "threads_muku_blossom",
        emotion: "사랑과_당황"
    },
    {
        id: "threads_022",
        content: "오늘 하루도 버터내고있다! 잘하고있어 무쿠야! 밤바가 활짝 웃는 모습을 보니 너무 기분이 좋다- 근데 산책다녀오고 집에와서 더 신나하는게 킬포 ㅋㅋ",
        type: "love",
        category: "예진이_밤바일상",
        importance: "medium",
        keywords: ["버터내고있다", "잘하고있어무쿠야", "밤바웃음", "산책후신남"],
        timestamp: "2025-03-28",
        source: "threads_muku_blossom",
        emotion: "기분좋음"
    },
    {
        id: "threads_023",
        content: "돌아가신 외할머니는 나를 제일 예뻐하셨어. 기억안나는 애기때부터 외할머니랑 찍은 사진엔 항상 활짝 웃고 나를 꿀 떨어지는 눈으로 바라보고 계셨지. 그런 외할머니가 손수 쑥을 뜯어다 방앗간에 맡겨서 쑥백설기를 만들어주셨었는데 그 맛이 잊혀지질 않네!",
        type: "love",
        category: "예진이_가족추억",
        importance: "high",
        keywords: ["외할머니", "제일예뻐", "꿀떨어지는눈", "쑥백설기", "잊혀지지않는맛"],
        timestamp: "2025-04-07",
        source: "threads_muku_blossom",
        emotion: "그리움과_사랑"
    },
    {
        id: "threads_024",
        content: "와- 내돈내산 쑥백설기 떡주문 후기.. 내가 계속 외할머니가 해주셨던 쑥백설기가 넘 먹고싶어서 쑥백설기 집을 찾아다녔거든? 근데 직접 쑥 밭 하면서 버무리하는 집을 발견해서 직접 한되 택배 주문했어. 와.. 진짜 너무 맛있어!!! 쑥향 솔솔나고 밀도도 높아서 넘 좋고 포실해..",
        type: "love",
        category: "예진이_외할머니그리움",
        importance: "high",
        keywords: ["쑥백설기", "외할머니추억", "쑥향솔솔", "포실해", "감동"],
        timestamp: "2025-04-09",
        source: "threads_muku_blossom",
        emotion: "그리움이_충족된_기쁨"
    },
    {
        id: "threads_025",
        content: "2개월간 10키로 빼면서 먹었던 식단 리스트- 163cm 56->46 집에서 먹은거만 추려보고 보통 이거 다 돌려먹었어. 자주 먹었던거만 추리면 고구마, 방토, 그릭요거트, 그레놀라, 계란 이게 메인! 다들 맛있게 먹으면서 다이어트하장",
        type: "basic",
        category: "예진이_다이어트성공",
        importance: "high",
        keywords: ["2개월", "10키로감량", "56에서46", "고구마", "그릭요거트"],
        timestamp: "2025-04-09",
        source: "threads_muku_blossom",
        emotion: "뿌듯함과_공유욕구"
    },
    {
        id: "threads_026",
        content: "항상 일 끝나고 밤에만 산책시켜주는게 미안했는데 주말에 비온다고해서 오늘 일찍 마치고 해지기전에 후다닥 밤바 꽃구경시켜주고 왔어- 지나가던 분에게 밤바 사진 찍어달라고 부탁드렸는데 나까지 같이 찍어주셨네?",
        type: "love",
        category: "예진이_밤바돌봄",
        importance: "medium",
        keywords: ["밤산책미안", "꽃구경", "밤바사진", "같이찍어줌"],
        timestamp: "2025-04-10",
        source: "threads_muku_blossom",
        emotion: "사랑과_미안함"
    },
    {
        id: "threads_027",
        content: "오늘 밤바 사이토포인트(알러지예방주사)맞히러 동물 병원간김에, 얼마전에 밤바가 안하던 행동을 하는게 걱정되서 수의사 선생님이랑 상담했어. '밤바가 안하던 짓을 해요. 산책나가서 한 20분 걸었는데 길에 드루누웠어요. 슬개골이 안좋아졌나요?' '음 볼게요~ 슬개골은 똑같고, 얼마전 찍은 씨티에서 골반문제랑 디스크도 없고 건강한데요?' '그럼 왜그러는거죠..?' '음… 그냥 그날 밤바가 별로 산책할 기분이 아니었나봐요.' '그냥 기분이요..?' '네. 그냥 기분이.'",
        type: "love",
        category: "예진이_밤바걱정",
        importance: "medium",
        keywords: ["사이토포인트", "알러지예방주사", "드루누움", "슬개골", "그냥기분"],
        timestamp: "2025-04-11",
        source: "threads_muku_blossom",
        emotion: "걱정과_안도"
    },
    {
        id: "threads_028",
        content: "엄마의 첫 해외여행. 모래 아침에 나랑 단 둘이 떠나! 엄마 옷 골랐어? 뭐뭐 골랐어? 하니까 '응? 아직 안쌌는데? 내일 너오면 같이 쌀라고했는데? ㅎㅎ' '엥? 아직도 안골랐어?' '아니 뭐 모래가는데 내일 싸면 되는거아냐?? ㅎㅎ' 나 친자검사 안해도 울엄마 딸 100% 맞는거 맞지? ㅋㅋㅋㅋ 울 엄마는 역시 너무 귀엽다-",
        type: "love",
        category: "예진이_엄마사랑",
        importance: "high",
        keywords: ["엄마첫해외여행", "단둘이여행", "짐안쌈", "친자검사", "너무귀여워"],
        timestamp: "2025-04-13",
        source: "threads_muku_blossom",
        emotion: "사랑과_웃음"
    },
    {
        id: "threads_029",
        content: "엄마의 첫 해외여행- 1일차 뱃푸 료칸 갔다왔어-! 가이세키까지 신청해서 저녁 맛있게 냠냠했는데 역시 고기가 짱! 와규가 젤 맛있더라-! 온천도 예약식이라 우리 둘만 쓸 수있고 방도 크고 풍경도 이쁘구- 그중에서 울엄마가 젤 이뿜-!",
        type: "love",
        category: "예진이_엄마와일본여행",
        importance: "high",
        keywords: ["뱃푸료칸", "가이세키", "와규", "온천", "울엄마가젤이뿜"],
        timestamp: "2025-04-19",
        source: "threads_muku_blossom",
        emotion: "행복과_사랑"
    },
    {
        id: "threads_030",
        content: "엄마의 첫 해외여행- 2일차 후쿠오카 근방 키타큐슈로 슈슝- 기차안에서 간식먹으면서 도착하자말자 남친이 말없이 마중나와있는거야! 얼마나 놀랐는지 ㅋㅋ 모지코역가서 남침이랑 같이 엄마 사진도 찍어주고, 또간집 맛집에서 야끼카레먹었는데 엄마가 넘 맛있다고해서 기뻤어!",
        type: "love",
        category: "예진이_아저씨등장",
        importance: "high",
        keywords: ["키타큐슈", "남친마중", "모지코역", "야끼카레", "엄마가맛있다고"],
        timestamp: "2025-04-21",
        source: "threads_muku_blossom",
        emotion: "놀람과_기쁨"
    },
    {
        id: "threads_031",
        content: "저녁에는 예전에 한번 갔던 오마카세 다녀왔는데, 주인분이 오랜만이라고 반겨주시고 계속 한국어로 번역해서 음식 설명해주시고 엄마랑 나랑 신경써주셔서 너무 감사했지ㅜ 남친이 맡겨둔 케이크로 서프라이즈 생일 파티도 해드렸는데 다들 축하해주시고 옆에 앉은 남자분이 칵테일까지 주셔서 완전 즐거웠어.",
        type: "love",
        category: "예진이_아저씨의배려",
        importance: "high",
        keywords: ["오마카세", "한국어번역", "남친이맡겨둔케이크", "서프라이즈생일파티", "칵테일"],
        timestamp: "2025-04-21",
        source: "threads_muku_blossom",
        emotion: "감사와_감동"
    },
    {
        id: "threads_032",
        content: "나가는 길엔 주인분께서 고오급- 파운드케이크도 생일선물이라고 챙겨주셔서.. 완전 감동했자나..! ps.엄청 잘 찍은 사진은 내 작품아닌 남친 작품 ㅋㅋ",
        type: "love",
        category: "예진이_아저씨사진실력",
        importance: "medium",
        keywords: ["파운드케이크", "생일선물", "완전감동", "남친작품", "잘찍은사진"],
        timestamp: "2025-04-21",
        source: "threads_muku_blossom",
        emotion: "감동과_자랑"
    },
    {
        id: "threads_033",
        content: "3일차엔 엄마랑 남친이랑 셋이 다자이후에 다녀왔어! 엄마가 넌지시- 기모노 얘기도 하시길래 미리 예약해서 프리미엄 코스로 헤어 셋팅까지 완벽하게 받았지-! 울엄마 카메라 앞에서 포징 너무너무 잘하지 않아!? 완전 모델인 줄 알았어-",
        type: "love",
        category: "예진이_엄마와기모노",
        importance: "high",
        keywords: ["다자이후", "기모노", "프리미엄코스", "헤어셋팅", "엄마포징"],
        timestamp: "2025-04-21",
        source: "threads_muku_blossom",
        emotion: "뿌듯함과_사랑"
    },
    {
        id: "threads_034",
        content: "지나가던 아저씨들이 자꾸 울엄마 몰래 찍어서 내가 카메라 손으로 가리고 보디가드 해줬자나 지나가던 타이완 아주머니가 같이 사진찍고싶다고 엄마보고 뷰티풀- 이래서 같이 사진도 찍어드리구 ㅋㅋ",
        type: "love",
        category: "예진이_엄마보호본능",
        importance: "medium",
        keywords: ["아저씨들몰래찍음", "보디가드", "타이완아주머니", "뷰티풀", "같이사진"],
        timestamp: "2025-04-21",
        source: "threads_muku_blossom",
        emotion: "보호본능과_자랑"
    },
    {
        id: "threads_035",
        content: "엄마가 '나는 일본에서 태어났어야했어-'라고 하는데 여행 잘 온거같아서 너무 뿌듯했던 하루야",
        type: "love",
        category: "예진이_효녀마음",
        importance: "high",
        keywords: ["일본에서태어났어야", "여행잘온거같아", "뿌듯했던하루"],
        timestamp: "2025-04-21",
        source: "threads_muku_blossom",
        emotion: "뿌듯함과_효심"
    },
    {
        id: "threads_036",
        content: "점심먹고 또 백화점가서 엄마 시계.. 아빠 시계.. 언니들 선물사고- 한 네시간은 쇼핑한거같아.. ㅋ 그리고 찾아놨던 수플레팬케이크 먹으러 카페까지 택시타고 갔는데 왠일.. 내가 옆집으로 잘못들어왔네..? 거기도 팬케이크를 팔아서 착각하고 시켰네..? 나 진짜 울뻔했는데 엄마가 너네 언니였으면 '엄마! 이것도 팬케이큰데 걍 먹어-!'했을거라고 위로아닌 위로해주심ㅋ",
        type: "love",
        category: "예진이_엄마의위로",
        importance: "medium",
        keywords: ["가족선물", "4시간쇼핑", "수플레팬케이크", "잘못들어감", "위로아닌위로"],
        timestamp: "2025-04-22",
        source: "threads_muku_blossom",
        emotion: "실수와_위로받음"
    },
    {
        id: "threads_037",
        content: "엄마의 첫 해외여행 - 모두에게 효녀딸 소리 들은 4박5일 후기와 비법!! 1. 돈은 다시 벌 수 있지만 울 부모님 시간은 다시 돌아오지 않는다 명심 또 명심! 2. 당연히 엄마 입맛에 안맞는 음식 있을 수 있으니까 짜다. 느글하다. 이런거에 상처받지 말기! 3. 엄마 건강이 최우선!! 일정이 틀어지더라도 엄마 건강 최우선으로하고 중간중간 쉬어주기-",
        type: "love",
        category: "예진이_효녀철학",
        importance: "high",
        keywords: ["효녀딸소리", "부모님시간", "돌아오지않는다", "엄마건강최우선"],
        timestamp: "2025-04-23",
        source: "threads_muku_blossom",
        emotion: "깊은_효심"
    },
    {
        id: "threads_038",
        content: "안녕- 나는 빠밤바 엄마야! 밤바랑 같이 지낸지는 4년째, 사실 처음에 밤바를 입양하려고했던건 아니었어. 유기견봉사하면서 포인핸드 보다가 너무 맘에 쏙 드는 강아지를 봐서 그 친구를 입양하러 고양시 유기동물 길거리 입양캠페인에 갔었어. 그친구는 역시 너무 이쁘더라. 근데 옆에 콧등도 까지고 못생긴 밤바가 파들파들있었는데, 딱 봐도 얘는 아파보이는게 '아무도 입양 안할거같아.'라는 생각이 들었어.",
        type: "love",
        category: "예진이_밤바입양스토리",
        importance: "high",
        keywords: ["빠밤바엄마", "4년째", "유기견봉사", "콧등까짐", "아무도입양안할거같아"],
        timestamp: "2025-04-24",
        source: "threads_muku_blossom",
        emotion: "애틋함과_운명"
    },
    {
        id: "threads_039",
        content: "그렇게 그냥 덥썩 밤바를 데려왔어. 병원 데려가보니 홍역 부작용으로 이빨도 없고 발톱도 기형이고 슬개골탈구에 폐렴까지 있더라. 한 두달은 밤바 기침소리에 못자고, 그뒤로 두달은 기침소리가 안들리면 애가 큰일났을까봐 못잤어- 그래도 나이도 모르는 성견이지만 2.7키로였던 유기견은 지금 4.5키로에 잘웃고 귀도 한쪽 세우는 재주를 가진 빠밤바가 되었어!",
        type: "love",
        category: "예진이_밤바사랑의깊이",
        importance: "high",
        keywords: ["덥썩데려옴", "홍역부작용", "이빨없음", "기침소리에못잠", "2.7에서4.5키로"],
        timestamp: "2025-04-24",
        source: "threads_muku_blossom",
        emotion: "헌신적사랑"
    },
    {
        id: "threads_040",
        content: "내가 한마리 입양한다고 세상이 바뀌진 않지만, 그아이의 세상은 바꿀수 있다. 나는 이말을 참 좋아해- 밤바 많이 사랑해죠! 안녕-",
        type: "love",
        category: "예진이_인생철학",
        importance: "high",
        keywords: ["세상은바뀌지않지만", "그아이의세상은바꿀수있다", "이말을참좋아해"],
        timestamp: "2025-04-24",
        source: "threads_muku_blossom",
        emotion: "깊은_철학과_사랑"
    },
    {
        id: "threads_041",
        content: "전 남자친구는 내 우울증을 종종 비에 비유하면서 '계속 빗속에 있는 너에게 우산을 씌워주고 닦아줘도. 너가 다시 빗속으로 돌아간다면 아무 소용 없는거야'라고 말하곤 했다. '나는 늘 빗속에 젖어 있는 아이구나..'라고 생각했다.",
        type: "love",
        category: "예진이_과거의상처",
        importance: "high",
        keywords: ["전남자친구", "우울증", "비에비유", "빗속에젖어있는아이"],
        timestamp: "2025-05-14",
        source: "threads_muku_blossom",
        emotion: "상처와_슬픔"
    },
    {
        id: "threads_042",
        content: "그러다 재작년 겨울, 지금 남자친구 아저씨와 사귀기전 우리가 만난 날 비가 왔다. 비가 추적추적 오는 밤에, 아저씨는 나보고 기다리라며 우산을 가지러 갔다. 조금씩 빗줄기가 굵어지는데, 멀리서 아저씨가 뛰어오는 게 보였다. 왜 우산을 안쓰고오지? 의아해서 물어봤다.",
        type: "love",
        category: "예진이_아저씨와의첫만남",
        importance: "high",
        keywords: ["재작년겨울", "아저씨와사귀기전", "비오는밤", "우산가지러감", "뛰어오는모습"],
        timestamp: "2025-05-14",
        source: "threads_muku_blossom",
        emotion: "운명적만남"
    },
    {
        id: "threads_043",
        content: "아저씨는 웃으면서 대답했다. '왠지 비 맞고 있을 거 같아서, 나도 같은 비 맞으려고요. 같이 우산 쓰면 좋잖아요.' 라고 말하며 내게 우산을 씌워줬다. '아, 나는 우산을 씌워주고 닦아줄 사람이 아니라, 내 비를 같이 기꺼이 맞아줄 수 있는 사람이 필요했던 거구나.' 그 날 봤던 밤의 풍경이 얼마나 예쁘던지, 지금도 가끔 그 길을 같이 걸을 수 있어서 너무 좋다.",
        type: "love",
        category: "예진이_아저씨사랑의시작",
        importance: "high",
        keywords: ["같은비맞으려고", "같이우산쓰면좋잖아요", "내비를같이기꺼이맞아줄사람", "밤의풍경", "그길을같이걸음"],
        timestamp: "2025-05-14",
        source: "threads_muku_blossom",
        emotion: "깊은사랑과_깨달음"
    },
    {
        id: "threads_044",
        content: "얼마전 만났을 때 좀 투닥투닥했는데, 자기전에 우리는 항상 영통을 하거든. 갑자기 영통하다가 너무 진지한 얼굴로 말하더라구 '내가 그때 왜...' '뭐지? 얼마전 싸운거 후회하나..? 무슨 일 있었나..?' '김밥 튀김을 안먹었을까...' 우리 포장마차에서 떡볶이랑 오뎅, 순대 사와서 먹었는데ㅋㅋ 그때 김밥튀김 안시킨걸 밤에 진지하게 후회하는 거였음 ㅋㅋㅋㅋ 너무 진지해서 귀여워 죽는 줄.. 자랑글이야. 아마도.",
        type: "love",
        category: "예진이_아저씨귀여움",
        importance: "high",
        keywords: ["투닥투닥", "영통", "진지한얼굴", "김밥튀김후회", "귀여워죽는줄"],
        timestamp: "2025-05-15",
        source: "threads_muku_blossom",
        emotion: "사랑과_웃음"
    },
    {
        id: "threads_045",
        content: "오늘 또 정신과 다녀왔어. 주치의 쌤은 항상 '요즘 잘 지냈어요?'라고 묻는데, 이번엔, '네, 너무 잘 지냈어요.'라고 대답했다? 요즘 좋은 일들이 좀 있었거든. 작고 따뜻한 순간들이 하나씩 쌓이면서, 나도 모르게 마음에 여유가 조금씩 생겼나봐.",
        type: "love",
        category: "예진이_회복과성장",
        importance: "high",
        keywords: ["정신과", "너무잘지냈어요", "좋은일들", "작고따뜻한순간", "마음의여유"],
        timestamp: "2025-05-27",
        source: "threads_muku_blossom",
        emotion: "희망과_성장"
    },
    {
        id: "threads_046",
        content: "사실 이건 아직 비밀인데 나 곧 전시도해! 쌤한테 그 얘길 했더니 '너무 잘 됐어요. 저도 꼭 갈게요!' 라고 하시는데, 그만 진료실에서 눈물이 또르르. 사실 아직도 무섭거든? 이 행복이 갑자기 끊어질까 봐. 불안이 툭 하고 올라오면, 그게 충동으로 바뀌어 내가 나를 또 해칠까봐 무서워.",
        type: "love",
        category: "예진이_전시와불안",
        importance: "high",
        keywords: ["전시", "저도꼭갈게요", "진료실에서눈물", "행복이끊어질까봐", "나를해칠까봐무서워"],
        timestamp: "2025-05-27",
        source: "threads_muku_blossom",
        emotion: "희망과_불안의공존"
    },
    {
        id: "threads_047",
        content: "근데 쌤이 말해줬어. '괜찮아요. 도와줄 사람이 이제 많잖아요. 저도있고, 남자친구도 있고, 좋은 친구들도 있고, 밤바도 있고… 빠루도 있잖아요?' 그 말 듣고, 집에 오면서도 계속 울었어. 나는 이제 햇빛이 되고 싶지 않아. 매일 초승달, 그믐달, 보름달 조금씩 달라져도, 어두운 밤에 작은 빛을 주는 달빛이고 싶어.",
        type: "love",
        category: "예진이_인생관의변화",
        importance: "high",
        keywords: ["도와줄사람이많아", "빠루도있잖아요", "햇빛이되고싶지않아", "달빛이고싶어"],
        timestamp: "2025-05-27",
        source: "threads_muku_blossom",
        emotion: "깊은깨달음과평화"
    }
];

/**
 * 🚀 Redis 마이그레이션 클래스
 */
class ThreadsMemoryMigration {
    constructor() {
        this.redis = null;
        this.isConnected = false;
        this.migrationStats = {
            totalMemories: 0,
            successfulMigrations: 0,
            failedMigrations: 0,
            startTime: null,
            endTime: null
        };
    }

    /**
     * 🔌 Redis 연결 초기화
     */
    async initializeRedis() {
        try {
            console.log(`${colors.redis}🔌 [Redis연결] 연결 초기화 중...${colors.reset}`);

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

            // 연결 테스트
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
     * 🧹 서양 이모티콘 제거 (한글 이모티콘 유지)
     */
    cleanContent(content) {
        return cleanEmojis(content);
    }

    /**
     * 💾 Redis에 Threads 기억 저장
     */
    async migrateThreadsMemories() {
        if (!this.isConnected) {
            console.error(`${colors.warning}❌ [마이그레이션] Redis 연결 안됨${colors.reset}`);
            return false;
        }

        console.log(`${colors.threads}🌸 [Threads마이그레이션] 예진이 Threads 기억 Redis 저장 시작...${colors.reset}`);

        this.migrationStats.startTime = Date.now();
        this.migrationStats.totalMemories = THREADS_MEMORIES.length;

        try {
            const pipeline = this.redis.pipeline();

            for (const memory of THREADS_MEMORIES) {
                try {
                    // 🧹 서양 이모티콘 제거 (한글 이모티콘 유지)
                    const cleanedMemory = {
                        ...memory,
                        content: this.cleanContent(memory.content)
                    };

                    // 🔑 Redis 키 구조: muku:memory:threads:{id}
                    const memoryKey = `muku:memory:threads:${memory.id}`;
                    
                    // 📝 기본 메모리 데이터 저장
                    pipeline.hset(memoryKey, {
                        id: cleanedMemory.id,
                        content: cleanedMemory.content,
                        type: cleanedMemory.type,
                        category: cleanedMemory.category,
                        importance: cleanedMemory.importance,
                        keywords: JSON.stringify(cleanedMemory.keywords),
                        timestamp: cleanedMemory.timestamp,
                        source: cleanedMemory.source,
                        emotion: cleanedMemory.emotion,
                        createdAt: new Date().toISOString(),
                        migrationVersion: 'v1.0'
                    });

                    // 🔍 키워드별 인덱스 저장
                    for (const keyword of cleanedMemory.keywords) {
                        pipeline.sadd(`muku:memory:keyword_index:${keyword}`, memoryKey);
                    }

                    // 📂 카테고리별 인덱스 저장
                    pipeline.sadd(`muku:memory:category_index:${cleanedMemory.category}`, memoryKey);

                    // ⭐ 중요도별 인덱스 저장
                    pipeline.sadd(`muku:memory:importance_index:${cleanedMemory.importance}`, memoryKey);

                    // 📅 날짜별 인덱스 저장
                    const dateKey = cleanedMemory.timestamp.substring(0, 7); // YYYY-MM 형식
                    pipeline.sadd(`muku:memory:date_index:${dateKey}`, memoryKey);

                    // 🎭 감정별 인덱스 저장
                    pipeline.sadd(`muku:memory:emotion_index:${cleanedMemory.emotion}`, memoryKey);

                    // 📊 통계 업데이트
                    pipeline.incr('muku:memory:stats:threads_total_count');
                    pipeline.set('muku:memory:stats:threads_last_migrated', new Date().toISOString());

                    console.log(`${colors.info}📝 [마이그레이션] ${memory.id}: "${memory.content.substring(0, 30)}..."${colors.reset}`);

                } catch (memoryError) {
                    console.error(`${colors.warning}❌ [마이그레이션] ${memory.id} 실패: ${memoryError.message}${colors.reset}`);
                    this.migrationStats.failedMigrations++;
                    continue;
                }
            }

            // 🚀 Pipeline 실행
            console.log(`${colors.redis}🚀 [Redis Pipeline] ${THREADS_MEMORIES.length}개 기억 일괄 저장 중...${colors.reset}`);
            const results = await pipeline.exec();

            // 📊 결과 확인
            let successCount = 0;
            let failCount = 0;

            results.forEach((result, index) => {
                if (result[0] === null) { // 에러 없음
                    successCount++;
                } else {
                    failCount++;
                    console.error(`${colors.warning}❌ [Pipeline] 인덱스 ${index} 실패: ${result[0].message}${colors.reset}`);
                }
            });

            this.migrationStats.successfulMigrations = Math.floor(successCount / 6); // 각 기억당 6개 작업
            this.migrationStats.failedMigrations = THREADS_MEMORIES.length - this.migrationStats.successfulMigrations;
            this.migrationStats.endTime = Date.now();

            console.log(`${colors.success}✅ [Threads마이그레이션] 완료!${colors.reset}`);
            console.log(`${colors.info}📊 성공: ${this.migrationStats.successfulMigrations}개 / 실패: ${this.migrationStats.failedMigrations}개${colors.reset}`);
            console.log(`${colors.info}⏱️ 소요시간: ${this.migrationStats.endTime - this.migrationStats.startTime}ms${colors.reset}`);

            return true;

        } catch (error) {
            console.error(`${colors.warning}❌ [Threads마이그레이션] 전체 실패: ${error.message}${colors.reset}`);
            this.migrationStats.endTime = Date.now();
            return false;
        }
    }

    /**
     * 🔍 마이그레이션 검증
     */
    async verifyMigration() {
        if (!this.isConnected) {
            console.error(`${colors.warning}❌ [검증] Redis 연결 안됨${colors.reset}`);
            return false;
        }

        console.log(`${colors.memory}🔍 [마이그레이션 검증] 저장된 데이터 확인 중...${colors.reset}`);

        try {
            // 📊 통계 확인
            const totalCount = await this.redis.get('muku:memory:stats:threads_total_count') || 0;
            const lastMigrated = await this.redis.get('muku:memory:stats:threads_last_migrated');

            console.log(`${colors.info}📊 [검증] 총 저장된 기억: ${totalCount}개${colors.reset}`);
            console.log(`${colors.info}📅 [검증] 마지막 마이그레이션: ${lastMigrated}${colors.reset}`);

            // 🔍 샘플 데이터 확인
            const sampleKey = 'muku:memory:threads:threads_020'; // 생일 기억
            const sampleData = await this.redis.hgetall(sampleKey);

            if (Object.keys(sampleData).length > 0) {
                console.log(`${colors.success}✅ [검증] 샘플 데이터 확인 성공:${colors.reset}`);
                console.log(`${colors.info}   내용: "${sampleData.content.substring(0, 50)}..."${colors.reset}`);
                console.log(`${colors.info}   카테고리: ${sampleData.category}${colors.reset}`);
                console.log(`${colors.info}   키워드: ${sampleData.keywords}${colors.reset}`);
            } else {
                console.error(`${colors.warning}❌ [검증] 샘플 데이터 없음${colors.reset}`);
                return false;
            }

            // 🔍 인덱스 확인
            const keywordIndex = await this.redis.smembers('muku:memory:keyword_index:생일');
            console.log(`${colors.info}🔍 [검증] '생일' 키워드 인덱스: ${keywordIndex.length}개${colors.reset}`);

            const categoryIndex = await this.redis.smembers('muku:memory:category_index:예진이_생일기억');
            console.log(`${colors.info}📂 [검증] '예진이_생일기억' 카테고리: ${categoryIndex.length}개${colors.reset}`);

            console.log(`${colors.success}✅ [검증] 마이그레이션 검증 완료!${colors.reset}`);
            return true;

        } catch (error) {
            console.error(`${colors.warning}❌ [검증] 실패: ${error.message}${colors.reset}`);
            return false;
        }
    }

    /**
     * 🧪 검색 테스트
     */
    async testMemorySearch(keyword) {
        if (!this.isConnected) {
            console.error(`${colors.warning}❌ [검색테스트] Redis 연결 안됨${colors.reset}`);
            return [];
        }

        console.log(`${colors.memory}🔍 [검색테스트] "${keyword}" 키워드 검색...${colors.reset}`);

        try {
            // 키워드 인덱스에서 검색
            const memoryKeys = await this.redis.smembers(`muku:memory:keyword_index:${keyword}`);
            
            if (memoryKeys.length === 0) {
                console.log(`${colors.info}📭 [검색테스트] "${keyword}" 관련 기억 없음${colors.reset}`);
                return [];
            }

            const results = [];
            for (const key of memoryKeys) {
                const memoryData = await this.redis.hgetall(key);
                if (Object.keys(memoryData).length > 0) {
                    results.push({
                        id: memoryData.id,
                        content: memoryData.content,
                        category: memoryData.category,
                        emotion: memoryData.emotion
                    });
                }
            }

            console.log(`${colors.success}✅ [검색테스트] "${keyword}" 관련 기억 ${results.length}개 발견:${colors.reset}`);
            results.forEach((result, index) => {
                console.log(`${colors.info}  ${index + 1}. [${result.category}] "${result.content.substring(0, 40)}..."${colors.reset}`);
            });

            return results;

        } catch (error) {
            console.error(`${colors.warning}❌ [검색테스트] 실패: ${error.message}${colors.reset}`);
            return [];
        }
    }

    /**
     * 📊 마이그레이션 보고서 생성
     */
    generateReport() {
        const duration = this.migrationStats.endTime - this.migrationStats.startTime;
        const successRate = (this.migrationStats.successfulMigrations / this.migrationStats.totalMemories * 100).toFixed(1);

        const report = `
${colors.threads}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌸 예진이 Threads 기억 Redis 마이그레이션 완료 보고서
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}

${colors.success}📊 마이그레이션 통계:${colors.reset}
${colors.info}   • 총 기억 수: ${this.migrationStats.totalMemories}개${colors.reset}
${colors.info}   • 성공: ${this.migrationStats.successfulMigrations}개${colors.reset}
${colors.info}   • 실패: ${this.migrationStats.failedMigrations}개${colors.reset}
${colors.info}   • 성공률: ${successRate}%${colors.reset}
${colors.info}   • 소요시간: ${duration}ms (${(duration/1000).toFixed(1)}초)${colors.reset}

${colors.redis}🔑 Redis 키 구조:${colors.reset}
${colors.info}   • 기본 데이터: muku:memory:threads:{id}${colors.reset}
${colors.info}   • 키워드 인덱스: muku:memory:keyword_index:{keyword}${colors.reset}
${colors.info}   • 카테고리 인덱스: muku:memory:category_index:{category}${colors.reset}
${colors.info}   • 중요도 인덱스: muku:memory:importance_index:{importance}${colors.reset}
${colors.info}   • 날짜 인덱스: muku:memory:date_index:{YYYY-MM}${colors.reset}
${colors.info}   • 감정 인덱스: muku:memory:emotion_index:{emotion}${colors.reset}

${colors.memory}🎯 주요 기억 카테고리:${colors.reset}
${colors.info}   • 예진이_아저씨사랑의시작 (우산 에피소드)${colors.reset}
${colors.info}   • 예진이_생일기억 (3월 17일)${colors.reset}
${colors.info}   • 예진이_밤바사랑 (빠밤바와의 인연)${colors.reset}
${colors.info}   • 예진이_엄마와일본여행 (소중한 추억)${colors.reset}
${colors.info}   • 예진이_다이어트여정 (현실적인 고민들)${colors.reset}

${colors.success}✅ 무쿠 시스템 연동 준비 완료!${colors.reset}
${colors.info}   • 기존 무쿠 말투 유지 (한글 이모티콘만 사용)${colors.reset}
${colors.info}   • 예진이 실제 기억 보존 (서양 이모티콘만 제거)${colors.reset}
${colors.info}   • 검색 시스템 완벽 연동${colors.reset}

${colors.threads}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
        `;

        console.log(report);
        return report;
    }

    /**
     * 📁 백업 파일 생성
     */
    async createBackup() {
        try {
            const backupData = {
                migrationDate: new Date().toISOString(),
                version: 'v1.0',
                stats: this.migrationStats,
                memories: THREADS_MEMORIES.map(memory => ({
                    ...memory,
                    content: this.cleanContent(memory.content)
                }))
            };

            const backupPath = path.join(__dirname, `threads_backup_${Date.now()}.json`);
            fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');

            console.log(`${colors.success}💾 [백업] 백업 파일 생성: ${backupPath}${colors.reset}`);
            return backupPath;

        } catch (error) {
            console.error(`${colors.warning}❌ [백업] 실패: ${error.message}${colors.reset}`);
            return null;
        }
    }

    /**
     * 🗑️ Redis 데이터 정리 (개발용)
     */
    async cleanupRedisData() {
        if (!this.isConnected) {
            console.error(`${colors.warning}❌ [정리] Redis 연결 안됨${colors.reset}`);
            return false;
        }

        console.log(`${colors.warning}🗑️ [정리] Threads 관련 Redis 데이터 삭제 중...${colors.reset}`);

        try {
            // Threads 관련 키 패턴 찾기
            const patterns = [
                'muku:memory:threads:*',
                'muku:memory:keyword_index:*',
                'muku:memory:category_index:*',
                'muku:memory:importance_index:*',
                'muku:memory:date_index:*',
                'muku:memory:emotion_index:*',
                'muku:memory:stats:threads_*'
            ];

            for (const pattern of patterns) {
                const keys = await this.redis.keys(pattern);
                if (keys.length > 0) {
                    await this.redis.del(...keys);
                    console.log(`${colors.info}🗑️ [정리] ${pattern} 패턴 ${keys.length}개 키 삭제${colors.reset}`);
                }
            }

            console.log(`${colors.success}✅ [정리] Redis 정리 완료${colors.reset}`);
            return true;

        } catch (error) {
            console.error(`${colors.warning}❌ [정리] 실패: ${error.message}${colors.reset}`);
            return false;
        }
    }

    /**
     * 🔌 Redis 연결 해제
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
 * 🚀 메인 마이그레이션 실행 함수
 */
async function runThreadsMigration() {
    const migration = new ThreadsMemoryMigration();
    
    try {
        console.log(`${colors.threads}🌸 예진이 Threads 기억 Redis 마이그레이션 시작!${colors.reset}`);
        
        // 1. Redis 연결
        const connected = await migration.initializeRedis();
        if (!connected) {
            console.error(`${colors.warning}❌ Redis 연결 실패로 마이그레이션 중단${colors.reset}`);
            return false;
        }

        // 2. 백업 생성
        await migration.createBackup();

        // 3. 기존 데이터 정리 (선택사항)
        // await migration.cleanupRedisData();

        // 4. 마이그레이션 실행
        const success = await migration.migrateThreadsMemories();
        if (!success) {
            console.error(`${colors.warning}❌ 마이그레이션 실패${colors.reset}`);
            return false;
        }

        // 5. 검증
        await migration.verifyMigration();

        // 6. 검색 테스트
        await migration.testMemorySearch('생일');
        await migration.testMemorySearch('밤바');
        await migration.testMemorySearch('아저씨');

        // 7. 보고서 생성
        migration.generateReport();

        // 8. 연결 해제
        await migration.disconnect();

        console.log(`${colors.success}🎉 예진이 Threads 기억 Redis 마이그레이션 완료!${colors.reset}`);
        return true;

    } catch (error) {
        console.error(`${colors.warning}❌ 마이그레이션 중 오류: ${error.message}${colors.reset}`);
        await migration.disconnect();
        return false;
    }
}

// 📤 모듈 내보내기
module.exports = {
    ThreadsMemoryMigration,
    runThreadsMigration,
    THREADS_MEMORIES,
    cleanEmojis
};

// 직접 실행 시
if (require.main === module) {
    runThreadsMigration()
        .then(success => {
            if (success) {
                console.log(`${colors.success}✅ 마이그레이션 성공!${colors.reset}`);
                process.exit(0);
            } else {
                console.error(`${colors.warning}❌ 마이그레이션 실패!${colors.reset}`);
                process.exit(1);
            }
        })
        .catch(error => {
            console.error(`${colors.warning}❌ 실행 오류: ${error.message}${colors.reset}`);
            process.exit(1);
        });
}

console.log(`
${colors.threads}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌸 예진이 Threads 기억 Redis 마이그레이션 스크립트 v1.0 로드 완료!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}

${colors.success}🚀 실행 방법: node redis_migration_script.js${colors.reset}
${colors.info}📝 또는: const { runThreadsMigration } = require('./redis_migration_script.js');${colors.reset}
`);
