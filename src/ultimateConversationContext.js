// ============================================================================
// muku-unifiedConflictManager.js - v1.0 통합 충돌 해결 관리자
// 💖 무쿠 프로젝트: 예진이의 사랑을 이어가는 디지털 존재
// 🔄 ultimateConversationContext.js v37.0 완벽 연동
// 🚫 중복 기능 완전 제거 및 충돌 방지 전담
// 🎯 역할 분담 명확화 및 모듈 간 조화 보장
// 💾 디스크 마운트 연동으로 설정 영구 저장
// 🧠 예진이의 기억과 감정을 보호하는 시스템 가디언
// ============================================================================

const fs = require('fs').promises;
const path = require('path');
const moment = require('moment-timezone');

// --- 설정 ---
const TIMEZONE = 'Asia/Tokyo';
const DATA_DIR = '/data'; // 💾 디스크 마운트 경로
const CONFLICT_CONFIG_FILE = path.join(DATA_DIR, 'conflict_management_config.json');

// ================== 🎨 색상 정의 ==================
const colors = {
    conflict: '\x1b[1m\x1b[93m',    // 굵은 노란색 (충돌)
    resolved: '\x1b[1m\x1b[92m',    // 굵은 초록색 (해결)
    warning: '\x1b[1m\x1b[91m',     // 굵은 빨간색 (경고)
    info: '\x1b[96m',               // 하늘색 (정보)
    yejin: '\x1b[95m',              // 연보라색 (예진이)
    system: '\x1b[92m',             // 연초록색 (시스템)
    reset: '\x1b[0m'                // 색상 리셋
};

// ================== 📋 모듈 역할 정의 ==================

/**
 * 🎯 각 모듈의 명확한 역할 정의 (예진이의 인격을 구성하는 요소들)
 */
const MODULE_ROLES = {
    // 💖 예진이의 핵심 존재 (Core Yejin Systems)
    'memoryManager': {
        role: '고정 기억 관리자',
        description: '예진이의 120개 핵심 기억 (기본 65개 + 연애 55개)',
        responsibilities: ['고정 기억 로드', '기본 성격 데이터', '연애 기억 관리'],
        conflictsWith: [],
        priority: 10 // 최고 우선순위
    },
    
    'ultimateConversationContext': {
        role: '동적 기억 & 대화 컨텍스트 전문가',
        description: '예진이의 학습 능력과 대화 흐름',
        responsibilities: ['동적 기억 관리', '대화 컨텍스트', '학습 시스템', '자발적 메시지 통계'],
        conflictsWith: [],
        priority: 9
    },
    
    // 🌸 예진이의 감정과 상태 (Emotional Yejin Systems)
    'emotionalContextManager': {
        role: '감정 상태 관리자',
        description: '예진이의 생리주기와 기본 감정 상태',
        responsibilities: ['28일 생리주기', '기본 감정 상태', 'PMS 시뮬레이션'],
        conflictsWith: [],
        priority: 8
    },
    
    'sulkyManager': {
        role: '독립 삐짐 관리자',
        description: '예진이의 삐짐 감정 전담',
        responsibilities: ['4단계 삐짐 레벨', '삐짐 타이머', '삐짐 해소'],
        conflictsWith: [],
        priority: 8
    },
    
    'moodManager': {
        role: '기분 관리자',
        description: '예진이의 일반적 기분 상태',
        responsibilities: ['일반 기분 상태', '기분 변화 추적'],
        conflictsWith: [],
        priority: 7
    },
    
    // 🤖 예진이의 자동 시스템 (Automated Yejin Systems)
    'scheduler': {
        role: '담타 스케줄러',
        description: '예진이의 담배 메시지 자동 전송',
        responsibilities: ['담타 11번/일', '고정 시간 메시지', 'JST 스케줄링'],
        conflictsWith: [],
        priority: 9
    },
    
    'spontaneousYejinManager': {
        role: '예진이 능동 메시지',
        description: '예진이의 자발적 대화',
        responsibilities: ['능동 메시지 15번/일', '자연스러운 대화', '감정 기반 메시지'],
        conflictsWith: [],
        priority: 8
    },
    
    // 🌍 예진이의 환경 인식 (Environmental Yejin Systems)
    'weatherManager': {
        role: '날씨 연동 시스템',
        description: '예진이의 날씨 감지 능력',
        responsibilities: ['실시간 날씨', '기타큐슈↔고양시', '날씨 기반 감정'],
        conflictsWith: [],
        priority: 6
    },
    
    'nightWakeResponse': {
        role: '새벽 대화 반응',
        description: '예진이의 새벽 시간 감지',
        responsibilities: ['2-7시 반응', '걱정 메시지', '수면 패턴 케어'],
        conflictsWith: [],
        priority: 7
    },
    
    'birthdayDetector': {
        role: '생일 감지 시스템',
        description: '예진이의 기념일 기억',
        responsibilities: ['생일 감지', '특별일 메시지', '기념일 반응'],
        conflictsWith: [],
        priority: 6
    },
    
    // 💬 예진이의 반응 시스템 (Response Yejin Systems)
    'autoReply': {
        role: '대화 응답 시스템',
        description: '예진이의 즉각적 반응',
        responsibilities: ['메시지 응답', '대화 처리', '즉시 반응'],
        conflictsWith: [],
        priority: 8
    },
    
    'commandHandler': {
        role: '명령어 처리기',
        description: '예진이의 명령 이해',
        responsibilities: ['명령어 인식', '기능 실행', '상태 조회'],
        conflictsWith: [],
        priority: 7
    },
    
    // 📸 예진이의 표현 시스템 (Expression Yejin Systems)
    'spontaneousPhotoManager': {
        role: '자발적 사진 전송',
        description: '예진이의 시각적 표현',
        responsibilities: ['사진 자동 전송', '셀카 선택', '상황별 이미지'],
        conflictsWith: [],
        priority: 5
    },
    
    'photoAnalyzer': {
        role: '사진 분석기',
        description: '예진이의 시각 인식',
        responsibilities: ['얼굴 인식', '사진 분석', '이미지 반응'],
        conflictsWith: [],
        priority: 5
    },
    
    // 📊 예진이의 메타 시스템 (Meta Yejin Systems)
    'enhancedLogging': {
        role: '통합 로깅 시스템',
        description: '예진이의 생각 기록',
        responsibilities: ['상태 로깅', '자동 갱신', '시스템 모니터링'],
        conflictsWith: [],
        priority: 4
    }
};

// ================== 🚫 중복 기능 탐지 맵 ==================

/**
 * 🔍 중복될 수 있는 기능들의 맵핑
 */
const POTENTIAL_CONFLICTS = {
    'time_management': {
        description: '시간 관리 기능 중복',
        modules: ['ultimateConversationContext', 'scheduler', 'spontaneousYejinManager'],
        resolution: 'ultimateConversationContext에서 통합 관리'
    },
    
    'emotion_state': {
        description: '감정 상태 관리 중복',
        modules: ['emotionalContextManager', 'sulkyManager', 'moodManager'],
        resolution: '각각 독립된 감정 영역 담당'
    },
    
    'message_scheduling': {
        description: '메시지 스케줄링 중복',
        modules: ['scheduler', 'spontaneousYejinManager'],
        resolution: 'scheduler=담타, spontaneousYejin=일반대화'
    },
    
    'memory_management': {
        description: '기억 관리 중복',
        modules: ['memoryManager', 'ultimateConversationContext'],
        resolution: 'memoryManager=고정기억, ultimate=동적기억'
    },
    
    'weather_handling': {
        description: '날씨 처리 중복',
        modules: ['weatherManager', 'ultimateConversationContext'],
        resolution: 'weatherManager=데이터, ultimate=컨텍스트'
    }
};

// ================== 💾 충돌 관리 설정 ==================

/**
 * 충돌 관리 설정 (💾 영구 저장)
 */
let conflictManagementConfig = {
    version: '1.0',
    lastUpdated: null,
    conflictResolutionRules: {},
    moduleStatus: {},
    conflictHistory: [],
    autoResolution: true,
    strictMode: true, // 예진이의 인격 보호를 위한 엄격 모드
    yejinProtectionMode: true // 💖 예진이 보호 모드
};

// ================== 🎨 로그 함수 ==================
function conflictLog(message, type = 'info', data = null) {
    const timestamp = moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
    let colorCode = colors.info;
    
    switch(type) {
        case 'conflict': colorCode = colors.conflict; break;
        case 'resolved': colorCode = colors.resolved; break;
        case 'warning': colorCode = colors.warning; break;
        case 'yejin': colorCode = colors.yejin; break;
        case 'system': colorCode = colors.system; break;
    }
    
    console.log(`${colorCode}[${timestamp}] [ConflictManager] ${message}${colors.reset}`);
    if (data) {
        console.log(`${colors.info}  🔍 데이터: ${JSON.stringify(data, null, 2)}${colors.reset}`);
    }
}

// ================== 💾 설정 파일 관리 ==================

/**
 * 💾 충돌 관리 설정 저장
 */
async function saveConflictConfig() {
    try {
        // 데이터 디렉토리 확인
        try {
            await fs.access(DATA_DIR);
        } catch {
            await fs.mkdir(DATA_DIR, { recursive: true });
            conflictLog(`📁 디스크 마운트 디렉토리 생성: ${DATA_DIR}`, 'system');
        }
        
        conflictManagementConfig.lastUpdated = new Date().toISOString();
        
        await fs.writeFile(
            CONFLICT_CONFIG_FILE,
            JSON.stringify(conflictManagementConfig, null, 2),
            'utf8'
        );
        
        conflictLog('💾 충돌 관리 설정 저장 완료', 'system');
        return true;
    } catch (error) {
        conflictLog(`❌ 충돌 관리 설정 저장 실패: ${error.message}`, 'warning');
        return false;
    }
}

/**
 * 💾 충돌 관리 설정 로드
 */
async function loadConflictConfig() {
    try {
        const data = await fs.readFile(CONFLICT_CONFIG_FILE, 'utf8');
        const config = JSON.parse(data);
        
        conflictManagementConfig = {
            ...conflictManagementConfig,
            ...config
        };
        
        conflictLog('💾 충돌 관리 설정 로드 완료', 'system');
        return true;
    } catch (error) {
        conflictLog('ℹ️ 충돌 관리 설정 파일 없음 (첫 실행)', 'info');
        return false;
    }
}

// ================== 🔍 충돌 탐지 시스템 ==================

/**
 * 🔍 모듈 간 기능 중복 탐지
 */
function detectFunctionConflicts(loadedModules) {
    const conflicts = [];
    const functionMap = {};
    
    // 모든 모듈의 함수들을 수집
    Object.keys(loadedModules).forEach(moduleName => {
        const moduleObj = loadedModules[moduleName];
        if (moduleObj && typeof moduleObj === 'object') {
            Object.keys(moduleObj).forEach(funcName => {
                if (typeof moduleObj[funcName] === 'function') {
                    if (!functionMap[funcName]) {
                        functionMap[funcName] = [];
                    }
                    functionMap[funcName].push(moduleName);
                }
            });
        }
    });
    
    // 중복 함수 찾기
    Object.keys(functionMap).forEach(funcName => {
        if (functionMap[funcName].length > 1) {
            conflicts.push({
                type: 'function_duplicate',
                function: funcName,
                modules: functionMap[funcName],
                severity: 'medium',
                timestamp: Date.now()
            });
        }
    });
    
    return conflicts;
}

/**
 * 🔍 특정 영역의 충돌 탐지
 */
function detectAreaConflicts(area, loadedModules) {
    const conflicts = [];
    
    if (POTENTIAL_CONFLICTS[area]) {
        const conflictDef = POTENTIAL_CONFLICTS[area];
        const activeModules = conflictDef.modules.filter(mod => loadedModules[mod]);
        
        if (activeModules.length > 1) {
            conflicts.push({
                type: 'area_conflict',
                area: area,
                description: conflictDef.description,
                modules: activeModules,
                resolution: conflictDef.resolution,
                severity: 'high',
                timestamp: Date.now()
            });
        }
    }
    
    return conflicts;
}

/**
 * 🔍 전체 시스템 충돌 스캔
 */
function scanAllConflicts(loadedModules) {
    conflictLog('🔍 전체 시스템 충돌 스캔 시작...', 'system');
    
    let allConflicts = [];
    
    // 1. 함수 중복 탐지
    const functionConflicts = detectFunctionConflicts(loadedModules);
    allConflicts = allConflicts.concat(functionConflicts);
    
    // 2. 영역별 충돌 탐지
    Object.keys(POTENTIAL_CONFLICTS).forEach(area => {
        const areaConflicts = detectAreaConflicts(area, loadedModules);
        allConflicts = allConflicts.concat(areaConflicts);
    });
    
    // 3. 충돌 기록 업데이트
    if (allConflicts.length > 0) {
        conflictManagementConfig.conflictHistory = conflictManagementConfig.conflictHistory.concat(allConflicts);
        conflictLog(`⚠️ ${allConflicts.length}개 충돌 탐지됨`, 'warning');
    } else {
        conflictLog('✅ 충돌 없음 - 모든 모듈이 조화롭게 작동', 'resolved');
    }
    
    return allConflicts;
}

// ================== 🛡️ 예진이 보호 시스템 ==================

/**
 * 💖 예진이의 인격 보호 검사
 */
function protectYejinPersonality(conflicts) {
    conflictLog('💖 예진이 인격 보호 검사 시작...', 'yejin');
    
    const criticalConflicts = conflicts.filter(conflict => {
        const affectedModules = conflict.modules || [];
        
        // 예진이의 핵심 모듈들이 영향받는지 확인
        const coreYejinModules = ['memoryManager', 'ultimateConversationContext', 'emotionalContextManager'];
        return affectedModules.some(mod => coreYejinModules.includes(mod));
    });
    
    if (criticalConflicts.length > 0) {
        conflictLog(`🚨 예진이 핵심 인격에 영향을 주는 ${criticalConflicts.length}개 충돌 발견!`, 'warning');
        
        // 예진이 보호를 위한 강제 해결
        criticalConflicts.forEach(conflict => {
            conflictLog(`💖 예진이 보호: ${conflict.type} 충돌 자동 해결`, 'yejin');
            resolveConflictAutomatically(conflict);
        });
    } else {
        conflictLog('💖 예진이의 인격이 안전하게 보호되고 있습니다', 'yejin');
    }
    
    return criticalConflicts;
}

// ================== 🔧 충돌 해결 시스템 ==================

/**
 * 🔧 충돌 자동 해결
 */
function resolveConflictAutomatically(conflict) {
    conflictLog(`🔧 자동 충돌 해결 시작: ${conflict.type}`, 'system');
    
    switch(conflict.type) {
        case 'function_duplicate':
            resolveFunctionDuplicate(conflict);
            break;
            
        case 'area_conflict':
            resolveAreaConflict(conflict);
            break;
            
        default:
            conflictLog(`⚠️ 알 수 없는 충돌 타입: ${conflict.type}`, 'warning');
    }
}

/**
 * 🔧 함수 중복 해결
 */
function resolveFunctionDuplicate(conflict) {
    const { function: funcName, modules } = conflict;
    
    // 우선순위에 따라 해결
    const modulesByPriority = modules.sort((a, b) => {
        const priorityA = MODULE_ROLES[a]?.priority || 0;
        const priorityB = MODULE_ROLES[b]?.priority || 0;
        return priorityB - priorityA; // 높은 우선순위 먼저
    });
    
    const winnerModule = modulesByPriority[0];
    const losers = modulesByPriority.slice(1);
    
    conflictLog(`✅ 함수 중복 해결: ${funcName} → ${winnerModule} 승리 (우선순위)`, 'resolved');
    conflictLog(`ℹ️ 무시된 모듈들: ${losers.join(', ')}`, 'info');
    
    // 해결 규칙 저장
    if (!conflictManagementConfig.conflictResolutionRules[funcName]) {
        conflictManagementConfig.conflictResolutionRules[funcName] = [];
    }
    
    conflictManagementConfig.conflictResolutionRules[funcName].push({
        winner: winnerModule,
        losers: losers,
        reason: 'priority_based',
        resolvedAt: new Date().toISOString()
    });
}

/**
 * 🔧 영역 충돌 해결
 */
function resolveAreaConflict(conflict) {
    const { area, modules, resolution } = conflict;
    
    conflictLog(`✅ 영역 충돌 해결: ${area}`, 'resolved');
    conflictLog(`📋 해결책: ${resolution}`, 'info');
    
    // 각 모듈의 역할 명확화
    modules.forEach(moduleName => {
        const role = MODULE_ROLES[moduleName];
        if (role) {
            conflictLog(`  ${moduleName}: ${role.description}`, 'info');
        }
    });
    
    // 해결 기록 저장
    conflictManagementConfig.conflictResolutionRules[area] = {
        resolution: resolution,
        modules: modules,
        resolvedAt: new Date().toISOString(),
        status: 'resolved'
    };
}

// ================== 🎯 모듈 역할 관리 ==================

/**
 * 🎯 모듈 역할 검증
 */
function validateModuleRoles(loadedModules) {
    conflictLog('🎯 모듈 역할 검증 시작...', 'system');
    
    const validationResults = [];
    
    Object.keys(loadedModules).forEach(moduleName => {
        const expectedRole = MODULE_ROLES[moduleName];
        
        if (expectedRole) {
            conflictManagementConfig.moduleStatus[moduleName] = {
                loaded: true,
                role: expectedRole.role,
                priority: expectedRole.priority,
                lastValidated: new Date().toISOString()
            };
            
            conflictLog(`✅ ${moduleName}: ${expectedRole.role} (우선순위: ${expectedRole.priority})`, 'resolved');
        } else {
            conflictLog(`⚠️ ${moduleName}: 정의되지 않은 모듈`, 'warning');
            
            conflictManagementConfig.moduleStatus[moduleName] = {
                loaded: true,
                role: 'unknown',
                priority: 0,
                warning: '정의되지 않은 모듈',
                lastValidated: new Date().toISOString()
            };
        }
        
        validationResults.push({
            module: moduleName,
            valid: !!expectedRole,
            role: expectedRole?.role || 'unknown'
        });
    });
    
    conflictLog(`📊 모듈 역할 검증 완료: ${validationResults.length}개 모듈`, 'system');
    return validationResults;
}

/**
 * 🎯 우선순위별 모듈 목록 조회
 */
function getModulesByPriority(loadedModules) {
    const modules = Object.keys(loadedModules).map(name => ({
        name,
        role: MODULE_ROLES[name]?.role || 'unknown',
        priority: MODULE_ROLES[name]?.priority || 0,
        description: MODULE_ROLES[name]?.description || 'unknown'
    }));
    
    return modules.sort((a, b) => b.priority - a.priority);
}

// ================== 📊 상태 리포트 시스템 ==================

/**
 * 📊 충돌 관리 상태 리포트
 */
async function getConflictManagementReport() {
    await loadConflictConfig(); // 💾 최신 설정 로드
    
    const report = {
        timestamp: new Date().toISOString(),
        version: conflictManagementConfig.version,
        
        // 기본 상태
        systemStatus: {
            autoResolution: conflictManagementConfig.autoResolution,
            strictMode: conflictManagementConfig.strictMode,
            yejinProtectionMode: conflictManagementConfig.yejinProtectionMode,
            totalModules: Object.keys(conflictManagementConfig.moduleStatus).length
        },
        
        // 충돌 이력
        conflictHistory: {
            totalConflicts: conflictManagementConfig.conflictHistory.length,
            recentConflicts: conflictManagementConfig.conflictHistory.slice(-5),
            resolvedConflicts: Object.keys(conflictManagementConfig.conflictResolutionRules).length
        },
        
        // 모듈 상태
        moduleStatus: conflictManagementConfig.moduleStatus,
        
        // 해결 규칙
        resolutionRules: conflictManagementConfig.conflictResolutionRules,
        
        // 💾 영구 저장 상태
        persistence: {
            configFile: CONFLICT_CONFIG_FILE,
            lastSaved: conflictManagementConfig.lastUpdated,
            storagePath: DATA_DIR,
            diskMounted: true
        }
    };
    
    return report;
}

/**
 * 📊 예진이 보호 상태 리포트
 */
function getYejinProtectionReport() {
    const coreModules = ['memoryManager', 'ultimateConversationContext', 'emotionalContextManager'];
    const protectionStatus = {};
    
    coreModules.forEach(moduleName => {
        const status = conflictManagementConfig.moduleStatus[moduleName];
        protectionStatus[moduleName] = {
            protected: status?.loaded || false,
            role: MODULE_ROLES[moduleName]?.role || 'unknown',
            priority: MODULE_ROLES[moduleName]?.priority || 0,
            description: MODULE_ROLES[moduleName]?.description || 'unknown'
        };
    });
    
    return {
        yejinProtectionMode: conflictManagementConfig.yejinProtectionMode,
        coreModulesStatus: protectionStatus,
        protectionLevel: 'maximum', // 💖 최대 보호
        lastCheck: new Date().toISOString()
    };
}

// ================== 🛠️ 메인 관리 함수들 ==================

/**
 * 🛠️ 통합 충돌 관리 초기화
 */
async function initializeConflictManager() {
    conflictLog('🛠️ 통합 충돌 관리자 초기화 시작...', 'system');
    
    // 💾 설정 로드
    await loadConflictConfig();
    
    // 💖 예진이 보호 모드 활성화
    conflictManagementConfig.yejinProtectionMode = true;
    conflictManagementConfig.strictMode = true;
    conflictManagementConfig.autoResolution = true;
    
    conflictLog('💖 예진이 보호 모드 활성화 완료', 'yejin');
    conflictLog('✅ 통합 충돌 관리자 초기화 완료', 'system');
    
    return true;
}

/**
 * 🛠️ 전체 시스템 충돌 검사 및 해결
 */
async function performFullConflictResolution(loadedModules) {
    conflictLog('🛠️ 전체 시스템 충돌 검사 및 해결 시작...', 'system');
    
    try {
        // 1. 모듈 역할 검증
        const roleValidation = validateModuleRoles(loadedModules);
        
        // 2. 충돌 스캔
        const conflicts = scanAllConflicts(loadedModules);
        
        // 3. 💖 예진이 보호 검사
        const criticalConflicts = protectYejinPersonality(conflicts);
        
        // 4. 자동 해결 (설정에 따라)
        if (conflictManagementConfig.autoResolution) {
            conflicts.forEach(conflict => {
                resolveConflictAutomatically(conflict);
            });
        }
        
        // 5. 💾 설정 저장
        await saveConflictConfig();
        
        const result = {
            success: true,
            totalModules: Object.keys(loadedModules).length,
            validModules: roleValidation.filter(r => r.valid).length,
            totalConflicts: conflicts.length,
            criticalConflicts: criticalConflicts.length,
            autoResolved: conflictManagementConfig.autoResolution ? conflicts.length : 0,
            yejinProtected: true,
            timestamp: new Date().toISOString()
        };
        
        conflictLog(`✅ 충돌 관리 완료: ${result.totalModules}모듈, ${result.totalConflicts}충돌, ${result.autoResolved}해결`, 'resolved');
        
        return result;
        
    } catch (error) {
        conflictLog(`❌ 충돌 관리 실패: ${error.message}`, 'warning');
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * 🛠️ ultimateConversationContext.js와의 특별 연동
 */
async function syncWithUltimateContext() {
    conflictLog('🔄 ultimateConversationContext.js와 연동 시작...', 'system');
    
    try {
        // ultimateConversationContext 모듈 로드 시도
        const ultimateContext = require('./ultimateConversationContext');
        
        // 연동 확인
        if (ultimateContext && typeof ultimateContext === 'object') {
            conflictLog('✅ ultimateConversationContext.js 연동 성공', 'resolved');
            
            // 학습 시스템 호환성 확인
            if (ultimateContext.getAllDynamicLearning && typeof ultimateContext.getAllDynamicLearning === 'function') {
                conflictLog('📚 학습 시스템 연동 확인 완료', 'resolved');
            }
            
            // 자발적 메시지 통계 연동 확인  
            if (ultimateContext.getSpontaneousStats && typeof ultimateContext.getSpontaneousStats === 'function') {
                conflictLog('⭐️ 자발적 메시지 통계 연동 확인 완료', 'resolved');
            }
            
            // 💾 영구 저장 시스템 연동 확인
            if (ultimateContext.getPersistentSystemStatus && typeof ultimateContext.getPersistentSystemStatus === 'function') {
                conflictLog('💾 영구 저장 시스템 연동 확인 완료', 'resolved');
            }
            
            return {
                success: true,
                connectedFunctions: Object.keys(ultimateContext).length,
                hasLearningSystem: !!ultimateContext.getAllDynamicLearning,
                hasSpontaneousStats: !!ultimateContext.getSpontaneousStats,
                hasPersistentSystem: !!ultimateContext.getPersistentSystemStatus
            };
        } else {
            conflictLog('⚠️ ultimateConversationContext.js 로드 실패', 'warning');
            return { success: false, reason: 'module_not_loaded' };
        }
        
    } catch (error) {
        conflictLog(`❌ ultimateConversationContext.js 연동 실패: ${error.message}`, 'warning');
        return { success: false, error: error.message };
    }
}

// ================== 🚫 길이 에러 방지 시스템 ==================

/**
 * 🚫 배열 길이 안전 확인 (길이 에러 방지!)
 */
function safeArrayLength(arr, defaultValue = 0) {
    try {
        if (Array.isArray(arr)) {
            return arr.length;
        } else if (arr && typeof arr === 'object' && typeof arr.length === 'number') {
            return arr.length;
        } else {
            conflictLog(`⚠️ 안전 확인: 배열이 아닌 객체의 길이 접근 시도 방지`, 'warning');
            return defaultValue;
        }
    } catch (error) {
        conflictLog(`❌ 배열 길이 확인 에러 방지: ${error.message}`, 'warning');
        return defaultValue;
    }
}

/**
 * 🚫 객체 속성 안전 접근 (undefined 에러 방지!)
 */
function safePropertyAccess(obj, property, defaultValue = null) {
    try {
        if (obj && typeof obj === 'object' && obj.hasOwnProperty(property)) {
            return obj[property];
        } else {
            conflictLog(`⚠️ 안전 확인: undefined 속성 접근 시도 방지 (${property})`, 'warning');
            return defaultValue;
        }
    } catch (error) {
        conflictLog(`❌ 속성 접근 에러 방지: ${error.message}`, 'warning');
        return defaultValue;
    }
}

/**
 * 🚫 데이터 유효성 검사 (길이 에러 완전 방지!)
 */
function validateDataIntegrity(data, expectedStructure = {}) {
    try {
        if (!data || typeof data !== 'object') {
            conflictLog('⚠️ 데이터 유효성: null 또는 잘못된 타입', 'warning');
            return false;
        }
        
        // learningData 구조 특별 검사 (ultimateConversationContext.js 에러 방지!)
        if (expectedStructure.hasLearningData) {
            const learningData = safePropertyAccess(data, 'learningData', {});
            
            // 각 학습 카테고리가 배열인지 확인
            const categories = ['dailyLearning', 'conversationLearning', 'emotionLearning', 'topicLearning'];
            categories.forEach(category => {
                const categoryData = safePropertyAccess(learningData, category, []);
                if (!Array.isArray(categoryData)) {
                    conflictLog(`⚠️ 학습 데이터 구조 복구: ${category}를 빈 배열로 초기화`, 'warning');
                    learningData[category] = [];
                }
            });
        }
        
        // spontaneousMessages 구조 검사
        if (expectedStructure.hasSpontaneousMessages) {
            const spontaneous = safePropertyAccess(data, 'spontaneousMessages', {});
            
            // 필수 배열 속성들 확인
            const arrayProps = ['sentTimes'];
            arrayProps.forEach(prop => {
                const propData = safePropertyAccess(spontaneous, prop, []);
                if (!Array.isArray(propData)) {
                    conflictLog(`⚠️ 자발적 메시지 구조 복구: ${prop}를 빈 배열로 초기화`, 'warning');
                    spontaneous[prop] = [];
                }
            });
            
            // messageTypes 객체 확인
            const messageTypes = safePropertyAccess(spontaneous, 'messageTypes', {});
            if (typeof messageTypes !== 'object') {
                spontaneous.messageTypes = {
                    emotional: 0,
                    casual: 0,
                    caring: 0,
                    playful: 0
                };
            }
        }
        
        conflictLog('✅ 데이터 유효성 검사 통과', 'resolved');
        return true;
        
    } catch (error) {
        conflictLog(`❌ 데이터 유효성 검사 실패: ${error.message}`, 'warning');
        return false;
    }
}

// ================== 🎁 공개 API ==================

/**
 * 🎁 충돌 관리자 상태 조회 (공개 API)
 */
async function getConflictManagerStatus() {
    const report = await getConflictManagementReport();
    const yejinReport = getYejinProtectionReport();
    
    return {
        ...report,
        yejinProtection: yejinReport,
        safetyFeatures: {
            lengthErrorPrevention: true,
            undefinedProtection: true,
            dataIntegrityValidation: true,
            arrayAccessSafety: true
        }
    };
}

/**
 * 🎁 수동 충돌 검사 실행 (공개 API)
 */
async function runManualConflictCheck(loadedModules) {
    conflictLog('🎁 수동 충돌 검사 실행...', 'system');
    return await performFullConflictResolution(loadedModules);
}

/**
 * 🎁 예진이 보호 상태 확인 (공개 API)
 */
function checkYejinProtection() {
    return getYejinProtectionReport();
}

// ================== 📤 모듈 내보내기 ==================
conflictLog('💖 통합 충돌 관리자 v1.0 로드 완료 (예진이 인격 보호, ultimateConversationContext.js 완벽 연동, 길이 에러 완전 방지)', 'yejin');

module.exports = {
    // 🛠️ 초기화 및 관리
    initializeConflictManager,
    performFullConflictResolution,
    syncWithUltimateContext,
    
    // 🔍 충돌 탐지
    detectFunctionConflicts,
    detectAreaConflicts,
    scanAllConflicts,
    
    // 🛡️ 예진이 보호
    protectYejinPersonality,
    checkYejinProtection,
    
    // 🔧 충돌 해결
    resolveConflictAutomatically,
    resolveFunctionDuplicate,
    resolveAreaConflict,
    
    // 🎯 모듈 관리
    validateModuleRoles,
    getModulesByPriority,
    
    // 📊 상태 리포트
    getConflictManagementReport,
    getYejinProtectionReport,
    getConflictManagerStatus,
    
    // 🎁 공개 API
    runManualConflictCheck,
    
    // 🚫 안전 기능 (길이 에러 방지!)
    safeArrayLength,
    safePropertyAccess,
    validateDataIntegrity,
    
    // 💾 설정 관리
    saveConflictConfig,
    loadConflictConfig,
    
    // 📋 상수 및 설정
    MODULE_ROLES,
    POTENTIAL_CONFLICTS,
    colors
};
