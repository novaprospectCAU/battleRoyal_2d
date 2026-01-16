/** 타일 타입 */
export enum TileType {
  /** 빈 공간 (이동 가능) */
  EMPTY = 0,
  /** 바닥 (이동 가능, 시각적 구분) */
  FLOOR = 1,
  /** 벽 (완전 차단, 이동/시야/투사체 불가) */
  WALL = 2,
  /** 반벽/낮은 담 (이동 불가, 넘기 가능, 투사체 차단) */
  HALF_WALL = 3,
  /** 문 (열림/닫힘 상태) */
  DOOR = 4,
  /** 창문 (이동 가능, 시야 통과) */
  WINDOW = 5,
}

/** 충돌 타입 */
export enum CollisionType {
  /** 충돌 없음 */
  NONE = 0,
  /** 이동 차단 */
  SOLID = 1,
  /** 투사체만 차단 */
  PROJECTILE_ONLY = 2,
}

/** 타일 정보 */
export interface TileInfo {
  type: TileType;
  collision: CollisionType;
  /** 투사체 관통 가능 여부 */
  penetrable: boolean;
  /** 시야 차단 여부 */
  blocksVision: boolean;
}

/** 타일 속성 테이블 */
export const TILE_PROPERTIES: Record<TileType, TileInfo> = {
  [TileType.EMPTY]: {
    type: TileType.EMPTY,
    collision: CollisionType.NONE,
    penetrable: true,
    blocksVision: false,
  },
  [TileType.FLOOR]: {
    type: TileType.FLOOR,
    collision: CollisionType.NONE,
    penetrable: true,
    blocksVision: false,
  },
  [TileType.WALL]: {
    type: TileType.WALL,
    collision: CollisionType.SOLID,
    penetrable: false,
    blocksVision: true,
  },
  [TileType.HALF_WALL]: {
    type: TileType.HALF_WALL,
    collision: CollisionType.SOLID,
    penetrable: false,
    blocksVision: false,
  },
  [TileType.DOOR]: {
    type: TileType.DOOR,
    collision: CollisionType.SOLID, // 기본 닫힘
    penetrable: true,
    blocksVision: true,
  },
  [TileType.WINDOW]: {
    type: TileType.WINDOW,
    collision: CollisionType.NONE,
    penetrable: true,
    blocksVision: false,
  },
};

/** 맵 데이터 */
export interface GameMap {
  name: string;
  /** 맵 크기 (타일 단위) */
  width: number;
  height: number;
  /** 타일 크기 (픽셀) */
  tileSize: number;
  /** 타일 데이터 (2D 배열, [y][x]) */
  tiles: TileType[][];
  /** 플레이어 스폰 포인트 */
  playerSpawns: { x: number; y: number }[];
}

/** 타일 좌표 → 월드 좌표 변환 */
export function tileToWorld(tileX: number, tileY: number, tileSize: number): { x: number; y: number } {
  return {
    x: tileX * tileSize + tileSize / 2,
    y: tileY * tileSize + tileSize / 2,
  };
}

/** 월드 좌표 → 타일 좌표 변환 */
export function worldToTile(worldX: number, worldY: number, tileSize: number): { x: number; y: number } {
  return {
    x: Math.floor(worldX / tileSize),
    y: Math.floor(worldY / tileSize),
  };
}
