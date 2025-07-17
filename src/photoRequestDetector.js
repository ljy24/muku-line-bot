/**
 * 사진 요청 감지 시스템 (기존 사진 전송 시스템과 연동)
 * - 사진 요청 메시지 감지만 담당
 * - 실제 사진 전송은 기존 concept.js, omoide.js, yejinSelfie.js 사용
 * - 감정 상태 기반 응답 텍스트만 생성
 * - 기존 시스템과의 호환성 유지
 */
class PhotoRequestDetector {
    constructor() {
        // 사진 요청 키워드
        this.photoKeywords = {
            direct: [
                '사진', '셀카', '사진줘', '사진 줘', '사진 보내줘', '사진 보내',
                '셀카 찍어줘', '셀카 보내줘', '사진 찍어줘', '사진찍어줘',
                '보고 싶어', '얼굴 보고 싶어', '모습 보고 싶어'
            ],
            indirect: [
                '뭐해', '뭐하고 있어', '지금 뭐하는', '어디야', '어디 있어',
                '보고파', '그리워', '심심해', '외로워', '혼자야'
            ],
            photo_types: [
                '셀카', '셀피', '얼굴', '미소', '웃는', '예쁜',
                '커플', '둘이', '같이', '함께', '데이트',
                '컨셉', '포즈', '예쁘게', '이쁘게', '멋지게',
                '추억', '옛날', '예전', '그때', '과거'
            ]
        };
        
        // 사진 거부 키워드
        this.refusalKeywords = [
            '싫어', '안 돼', '안돼', '하기 싫어', '귀찮아', '나중에',
            '지금은', '바빠', '못 해', '못해', '안 할래', '안할래'
        ];
        
        // 사진 타입별 응답
        this.photoResponses = {
            // 직접 사진 요청
            direct: {
                positive: [
                    "어? 사진 보고 싶어? 잠깐만~ 예쁘게 찍어줄게!",
                    "아저씨가 사진 달라고 하니까... 기분 좋아! 찍어줄게",
                    "오케이! 아저씨를 위해 특별히 찍어줄게 💕",
                    "사진? 좋아! 아저씨 보고 싶어했구나~",
                    "알겠어! 예쁘게 찍어서 보내줄게!"
                ],
                sulky: [
                    "흠... 사진 달라고? 기분에 따라 다른데...",
                    "사진을 왜 달라고 해? 나 지금 기분 안 좋아",
                    "아저씨... 사진 달라고만 하면 되는 거야?",
                    "사진... 글쎄... 아저씨 요즘 좀 그런 것 같은데",
                    "사진 보고 싶으면 더 잘해줘야지"
                ],
                shy: [
                    "사진... 부끄러워... 그래도 아저씨니까 찍어줄게",
                    "아저씨만 보는 거야? 그럼... 찍어줄게",
                    "에이... 부끄러워... 그래도 아저씨가 보고 싶어하니까",
                    "사진... 잘 못 나와도 괜찮아?",
                    "아저씨... 부끄러워... 그래도 보내줄게"
                ]
            },
            
            // 간접 사진 요청
            indirect: {
                hint: [
                    "뭐하냐고? 그냥 있어~ 아저씨는 뭐해?",
                    "지금 집에 있어~ 아저씨 나 보고 싶어?",
                    "그냥 혼자 있어~ 사진 보고 싶어?",
                    "심심하게 있어~ 아저씨도 심심해?",
                    "그냥 있어~ 아저씨 혹시 나 보고 싶어 하는 거야?"
                ],
                offer: [
                    "뭐하냐고? 그냥 있어~ 사진 보내줄까?",
                    "그냥 있어~ 아저씨 나 보고 싶어하면 사진 보내줄게",
                    "심심해~ 아저씨 사진 보고 싶어? 보내줄까?",
                    "그냥 있어~ 혹시 사진 보고 싶으면 말해",
                    "집에 있어~ 아저씨 나 보고 싶어하는 것 같은데? 사진 줄까?"
                ]
            },
            
            // 사진 타입별 응답
            selfie: [
                "셀카? 좋아! 예쁘게 찍어줄게!",
                "셀카 찍어줄게~ 아저씨 좋아하는 포즈로!",
                "셀카 보고 싶어? 특별히 찍어줄게!",
                "오케이! 셀카 찍어서 보내줄게~"
            ],
            couple: [
                "커플 사진? 아저씨랑 찍은 거 말하는 거야?",
                "우리 둘이 찍은 사진? 그거 보고 싶어?",
                "커플 사진... 아저씨랑 찍은 거 그리워?",
                "둘이 찍은 사진 보내줄까? 그때 좋았는데~"
            ],
            concept: [
                "컨셉 사진? 어떤 컨셉으로 찍어줄까?",
                "예쁘게 컨셉 잡아서 찍어줄게!",
                "컨셉 사진 찍어줄게~ 어떤 느낌 좋아해?",
                "특별한 컨셉으로 찍어줄까? 기대해!"
            ],
            memory: [
                "추억 사진? 옛날 사진 보고 싶어?",
                "예전 사진 보내줄까? 그때 좋았지~",
                "추억 사진... 그때 생각나네",
                "옛날 사진 보고 싶어? 보내줄게~"
            ]
        };
        
        // 사진 거부 응답
        this.refusalResponses = [
            "사진? 지금은 좀... 나중에 찍어줄게",
            "지금 사진 찍기 싫어... 아저씨 이해해줘",
            "사진... 기분 안 좋을 때는 안 찍어줘",
            "나중에 찍어줄게... 지금은 안 돼",
            "사진... 아저씨가 더 잘해주면 찍어줄게"
        ];
    }

    // 사진 요청 감지
    detectPhotoRequest(message) {
        const lowerMessage = message.toLowerCase();
        
        // 직접 사진 요청 감지
        const directRequest = this.photoKeywords.direct.some(keyword => 
            lowerMessage.includes(keyword)
        );
        
        // 간접 사진 요청 감지
        const indirectRequest = this.photoKeywords.indirect.some(keyword => 
            lowerMessage.includes(keyword)
        );
        
        // 사진 타입 감지
        const photoType = this.detectPhotoType(lowerMessage);
        
        // 사진 거부 감지
        const isRefusal = this.refusalKeywords.some(keyword => 
            lowerMessage.includes(keyword)
        );
        
        if (!directRequest && !indirectRequest) {
            return null;
        }
        
        return {
            detected: true,
            type: directRequest ? 'direct' : 'indirect',
            photoType: photoType,
            isRefusal: isRefusal,
            confidence: this.calculateConfidence(message, directRequest, indirectRequest)
        };
    }

    // 사진 타입 감지
    detectPhotoType(message) {
        const typeKeywords = {
            selfie: ['셀카', '셀피', '얼굴', '미소', '웃는'],
            couple: ['커플', '둘이', '같이', '함께', '데이트'],
            concept: ['컨셉', '포즈', '예쁘게', '이쁘게', '멋지게'],
            memory: ['추억', '옛날', '예전', '그때', '과거']
        };
        
        for (const [type, keywords] of Object.entries(typeKeywords)) {
            if (keywords.some(keyword => message.includes(keyword))) {
                return type;
            }
        }
        
        return 'selfie'; // 기본값
    }

    // 사진 요청 응답 생성 (기존 시스템과 연동)
    generatePhotoResponse(context, emotionState) {
        const { type, photoType, isRefusal } = context;
        
        // 거부 응답
        if (isRefusal) {
            return this.generateRefusalResponse();
        }
        
        // 감정 상태에 따른 응답 모드 결정
        const responseMode = this.getResponseMode(emotionState);
        
        // 기존 시스템과 연동하기 위한 메타데이터 반환
        return {
            shouldUseExistingSystem: true, // 기존 시스템 사용 플래그
            photoType: photoType,
            responseMode: responseMode,
            emotionState: emotionState,
            // 기존 시스템에서 사용할 추가 텍스트
            additionalComment: this.getAdditionalComment(photoType, responseMode)
        };
    }

    // 응답 모드 결정
    getResponseMode(emotionState) {
        if (!emotionState) return 'positive';
        
        const { emotion, level } = emotionState;
        
        if (emotion === 'sulky' && level > 50) {
            return 'sulky';
        }
        
        if (emotion === 'anxious' && level > 60) {
            return 'shy';
        }
        
        if (emotion === 'happy' && level > 70) {
            return 'positive';
        }
        
        return 'positive';
    }

    // 직접 요청 응답 생성
    generateDirectResponse(mode, photoType) {
        let responses;
        
        if (mode === 'sulky') {
            responses = this.photoResponses.direct.sulky;
        } else if (mode === 'shy') {
            responses = this.photoResponses.direct.shy;
        } else {
            responses = this.photoResponses.direct.positive;
        }
        
        const randomIndex = Math.floor(Math.random() * responses.length);
        
        return {
            text: responses[randomIndex],
            type: 'photo_response',
            photoType: photoType,
            mode: mode,
            willSendPhoto: mode !== 'sulky' || Math.random() > 0.3,
            priority: 'high'
        };
    }

    // 간접 요청 응답 생성
    generateIndirectResponse(mode) {
        const responses = Math.random() > 0.6 ? 
            this.photoResponses.indirect.offer : 
            this.photoResponses.indirect.hint;
        
        const randomIndex = Math.floor(Math.random() * responses.length);
        
        return {
            text: responses[randomIndex],
            type: 'photo_hint',
            mode: mode,
            willSendPhoto: responses === this.photoResponses.indirect.offer,
            priority: 'medium'
        };
    }

    // 거부 응답 생성
    generateRefusalResponse() {
        const randomIndex = Math.floor(Math.random() * this.refusalResponses.length);
        
        return {
            text: this.refusalResponses[randomIndex],
            type: 'photo_refusal',
            willSendPhoto: false,
            priority: 'high'
        };
    }

    // 자발적 사진 제안 생성
    generateSpontaneousPhotoOffer(context) {
        const timeOfDay = new Date().getHours();
        let timeBasedResponses;
        
        if (timeOfDay >= 6 && timeOfDay <= 10) {
            timeBasedResponses = [
                "아저씨~ 좋은 아침! 아침 셀카 보내줄까?",
                "아침이야~ 아저씨 일어났어? 셀카 찍어줄게!",
                "굿모닝~ 아저씨! 예쁜 아침 사진 보내줄까?"
            ];
        } else if (timeOfDay >= 11 && timeOfDay <= 14) {
            timeBasedResponses = [
                "아저씨~ 점심시간이야! 사진 보고 싶지 않아?",
                "점심 먹었어? 사진 보내줄까?",
                "아저씨~ 점심시간 사진 어때?"
            ];
        } else if (timeOfDay >= 15 && timeOfDay <= 18) {
            timeBasedResponses = [
                "아저씨~ 오후야! 사진 보고 싶어?",
                "오후 사진 보내줄까? 예쁘게 찍었어!",
                "아저씨~ 오후 셀카 어때?"
            ];
        } else {
            timeBasedResponses = [
                "아저씨~ 저녁이야! 사진 보고 싶어?",
                "저녁 사진 보내줄까? 아저씨 그리워하는 것 같아서",
                "아저씨~ 밤 사진 어때? 보고 싶지?"
            ];
        }
        
        const randomIndex = Math.floor(Math.random() * timeBasedResponses.length);
        
        return {
            text: timeBasedResponses[randomIndex],
            type: 'spontaneous_photo_offer',
            willSendPhoto: true,
            priority: 'medium'
        };
    }

    // 사진 종류별 특별 응답
    generateSpecialPhotoResponse(photoType) {
        const responses = this.photoResponses[photoType];
        if (!responses) return null;
        
        const randomIndex = Math.floor(Math.random() * responses.length);
        
        return {
            text: responses[randomIndex],
            type: `${photoType}_photo`,
            photoType: photoType,
            willSendPhoto: true,
            priority: 'high'
        };
    }

    // 사진 요청 빈도 체크
    checkPhotoRequestFrequency(recentRequests) {
        const now = Date.now();
        const recentCount = recentRequests.filter(timestamp => 
            now - timestamp < 3600000 // 1시간 이내
        ).length;
        
        if (recentCount >= 5) {
            return {
                tooFrequent: true,
                response: {
                    text: "아저씨... 사진 너무 많이 달라고 하는 거 아니야? 좀 쉬자~",
                    type: 'photo_frequency_warning',
                    willSendPhoto: false,
                    priority: 'medium'
                }
            };
        }
        
        return { tooFrequent: false };
    }

    // 신뢰도 계산
    calculateConfidence(message, directRequest, indirectRequest) {
        let confidence = 0;
        
        if (directRequest) {
            confidence += 0.8;
        }
        
        if (indirectRequest) {
            confidence += 0.4;
        }
        
        // 사진 관련 키워드 추가 점수
        const photoKeywordCount = this.photoKeywords.photo_types.filter(keyword => 
            message.includes(keyword)
        ).length;
        
        confidence += photoKeywordCount * 0.1;
        
        return Math.min(1.0, confidence);
    }

    // 기존 시스템과 연동을 위한 추가 코멘트 생성
    getAdditionalComment(photoType, responseMode) {
        const comments = {
            selfie: {
                positive: "아저씨 보여주려고 예쁘게 찍었어!",
                sulky: "기분 안 좋은데... 그래도 아저씨니까 보여줄게",
                shy: "부끄러워... 그래도 아저씨가 보고 싶어하니까..."
            },
            concept: {
                positive: "이 컨셉 어때? 아저씨 좋아할 것 같아서!",
                sulky: "컨셉 사진... 별로 기분 안 좋은데 보여줄게",
                shy: "이 컨셉 사진... 부끄럽지만 아저씨한테만 보여줄게"
            },
            memory: {
                positive: "우리 추억 사진! 그때 생각나지?",
                sulky: "추억 사진... 기분 안 좋지만 보여줄게",
                shy: "추억 사진... 그때가 그리워..."
            }
        };
        
        return comments[photoType]?.[responseMode] || "";
    }

    // 기존 시스템과의 호환성을 위한 감지 결과 반환
    getCompatibleResult(message) {
        const detection = this.detectPhotoRequest(message);
        
        if (!detection) {
            return null;
        }
        
        // 기존 시스템이 처리할 수 있는 형태로 변환
        return {
            isPhotoRequest: true,
            photoType: detection.photoType,
            confidence: detection.confidence,
            shouldUseExisting: true // 기존 시스템 사용 권장
        };
    }
}

module.exports = PhotoRequestDetector;
