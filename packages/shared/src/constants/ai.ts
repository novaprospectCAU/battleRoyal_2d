/**
 * AI 봇 상태
 */
export enum BotState {
  /** 대기 (가만히 있음) */
  IDLE = 'idle',
  /** 순찰 (랜덤 이동) */
  PATROL = 'patrol',
  /** 추적 (적 발견, 따라감) */
  CHASE = 'chase',
  /** 공격 (사격 범위 내, 사격) */
  ATTACK = 'attack',
  /** 도주 (체력 낮음, 도망) */
  FLEE = 'flee',
  /** 자기장 회피 (안전 구역으로 이동) */
  ZONE_FLEE = 'zone_flee',
  /** 아이템 루팅 (무기/탄약/치료 줍기) */
  LOOT = 'loot',
  /** 회복 (치료 아이템 사용 중) */
  HEAL = 'heal',
}

/**
 * AI 난이도
 */
export enum BotDifficulty {
  EASY = 'easy',
  NORMAL = 'normal',
  HARD = 'hard',
}

/**
 * 난이도별 AI 설정
 */
export interface BotDifficultyConfig {
  /** 반응 시간 (ms) - 적 발견 후 반응까지 */
  reactionTime: number;
  /** 조준 정확도 (0~1) - 스프레드 배율 */
  aimAccuracy: number;
  /** 시야 범위 (px) */
  visionRange: number;
  /** 시야 각도 (라디안) - 전방 기준 */
  visionAngle: number;
  /** 사격 간격 배율 (1 = 무기 기본) */
  fireRateMultiplier: number;
  /** 이동 속도 배율 */
  moveSpeedMultiplier: number;
  /** 도주 체력 비율 (이하면 도주) */
  fleeHealthRatio: number;
}

/** 난이도별 설정 */
export const BOT_DIFFICULTY_CONFIGS: Record<BotDifficulty, BotDifficultyConfig> = {
  [BotDifficulty.EASY]: {
    reactionTime: 800,
    aimAccuracy: 0.4,
    visionRange: 300,
    visionAngle: Math.PI * 0.6, // 108도
    fireRateMultiplier: 1.5,
    moveSpeedMultiplier: 0.7,
    fleeHealthRatio: 0.2,
  },
  [BotDifficulty.NORMAL]: {
    reactionTime: 400,
    aimAccuracy: 0.7,
    visionRange: 450,
    visionAngle: Math.PI * 0.75, // 135도
    fireRateMultiplier: 1.0,
    moveSpeedMultiplier: 0.9,
    fleeHealthRatio: 0.25,
  },
  [BotDifficulty.HARD]: {
    reactionTime: 150,
    aimAccuracy: 0.9,
    visionRange: 600,
    visionAngle: Math.PI * 0.9, // 162도
    fireRateMultiplier: 0.8,
    moveSpeedMultiplier: 1.0,
    fleeHealthRatio: 0.3,
  },
};

/** AI 기본 설정 */
export const AI_CONFIG = {
  /** 상태 업데이트 간격 (ms) */
  stateUpdateInterval: 200,
  
  /** 순찰 설정 */
  patrol: {
    /** 순찰 지점 도달 거리 */
    arrivalDistance: 20,
    /** 대기 시간 범위 (ms) */
    idleTimeMin: 500,
    idleTimeMax: 2000,
    /** 순찰 범위 (현재 위치 기준) */
    patrolRadius: 200,
  },
  
  /** 전투 설정 */
  combat: {
    /** 최소 사격 거리 */
    minFireDistance: 50,
    /** 최대 사격 거리 */
    maxFireDistance: 400,
    /** 추적 포기 거리 */
    giveUpDistance: 700,
    /** 연속 사격 후 쿨다운 (ms) */
    burstCooldown: 1500,
    /** 연속 사격 횟수 */
    burstCount: 3,
  },
  
  /** 자기장 설정 */
  zone: {
    /** 자기장 가장자리 여유 거리 */
    safeMargin: 100,
    /** 자기장 반응 시작 시간 (축소 전 ms) */
    earlyReactionTime: 5000,
  },
} as const;
