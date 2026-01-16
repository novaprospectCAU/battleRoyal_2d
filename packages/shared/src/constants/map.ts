import { TileType, type GameMap } from '../types/map.js';

/** 타일 크기 (픽셀) - 플레이어 직경 기준 */
export const TILE_SIZE = 32;

/** 맵 크기 (타일 단위) */
export const MAP_WIDTH_TILES = 64;  // 64 * 32 = 2048px
export const MAP_HEIGHT_TILES = 64;

/** 맵 크기 (픽셀) */
export const MAP_WIDTH_PX = MAP_WIDTH_TILES * TILE_SIZE;
export const MAP_HEIGHT_PX = MAP_HEIGHT_TILES * TILE_SIZE;

/** 디버그 색상 */
export const TILE_COLORS = {
  [TileType.EMPTY]: '#1a1a2e',
  [TileType.FLOOR]: '#2a2a3e',
  [TileType.WALL]: '#4a4a6e',
  [TileType.HALF_WALL]: '#6a6a8e',
  [TileType.DOOR]: '#8b5a2b',
  [TileType.WINDOW]: '#5a8a9a',
} as const;

/**
 * 테스트용 맵 생성
 * 외곽 벽 + 내부에 건물 몇 개
 */
export function createTestMap(): GameMap {
  const tiles: TileType[][] = [];
  
  // 빈 맵으로 초기화
  for (let y = 0; y < MAP_HEIGHT_TILES; y++) {
    tiles[y] = [];
    for (let x = 0; x < MAP_WIDTH_TILES; x++) {
      tiles[y][x] = TileType.FLOOR;
    }
  }
  
  // 외곽 벽
  for (let x = 0; x < MAP_WIDTH_TILES; x++) {
    tiles[0][x] = TileType.WALL;
    tiles[MAP_HEIGHT_TILES - 1][x] = TileType.WALL;
  }
  for (let y = 0; y < MAP_HEIGHT_TILES; y++) {
    tiles[y][0] = TileType.WALL;
    tiles[y][MAP_WIDTH_TILES - 1] = TileType.WALL;
  }
  
  // 건물 1 (좌상단, 8x8)
  addBuilding(tiles, 8, 8, 8, 8);
  
  // 건물 2 (우상단, 6x10)
  addBuilding(tiles, 48, 6, 6, 10);
  
  // 건물 3 (중앙, 10x10)
  addBuilding(tiles, 27, 27, 10, 10);
  
  // 건물 4 (좌하단, 6x6)
  addBuilding(tiles, 10, 48, 6, 6);
  
  // 건물 5 (우하단, 8x6)
  addBuilding(tiles, 46, 50, 8, 6);
  
  // 중앙에 추가 장애물들 (반벽)
  addHalfWallLine(tiles, 20, 20, 6, true);  // 세로
  addHalfWallLine(tiles, 40, 35, 8, false); // 가로
  addHalfWallLine(tiles, 15, 40, 5, true);  // 세로
  
  // 스폰 포인트 (맵 외곽 근처)
  const playerSpawns: { x: number; y: number }[] = [];
  const spawnMargin = 3;
  
  // 상단
  for (let i = 0; i < 8; i++) {
    playerSpawns.push({
      x: (spawnMargin + 1 + i * 7) * TILE_SIZE + TILE_SIZE / 2,
      y: (spawnMargin + 1) * TILE_SIZE + TILE_SIZE / 2,
    });
  }
  // 하단
  for (let i = 0; i < 8; i++) {
    playerSpawns.push({
      x: (spawnMargin + 1 + i * 7) * TILE_SIZE + TILE_SIZE / 2,
      y: (MAP_HEIGHT_TILES - spawnMargin - 2) * TILE_SIZE + TILE_SIZE / 2,
    });
  }
  // 좌측
  for (let i = 0; i < 8; i++) {
    playerSpawns.push({
      x: (spawnMargin + 1) * TILE_SIZE + TILE_SIZE / 2,
      y: (spawnMargin + 1 + i * 7) * TILE_SIZE + TILE_SIZE / 2,
    });
  }
  // 우측
  for (let i = 0; i < 8; i++) {
    playerSpawns.push({
      x: (MAP_WIDTH_TILES - spawnMargin - 2) * TILE_SIZE + TILE_SIZE / 2,
      y: (spawnMargin + 1 + i * 7) * TILE_SIZE + TILE_SIZE / 2,
    });
  }
  
  return {
    name: 'Test Map',
    width: MAP_WIDTH_TILES,
    height: MAP_HEIGHT_TILES,
    tileSize: TILE_SIZE,
    tiles,
    playerSpawns,
  };
}

/** 건물 추가 (벽으로 둘러싸인 방 + 문) */
function addBuilding(
  tiles: TileType[][],
  startX: number,
  startY: number,
  width: number,
  height: number
): void {
  // 벽으로 둘러싸기
  for (let x = startX; x < startX + width; x++) {
    tiles[startY][x] = TileType.WALL;
    tiles[startY + height - 1][x] = TileType.WALL;
  }
  for (let y = startY; y < startY + height; y++) {
    tiles[y][startX] = TileType.WALL;
    tiles[y][startX + width - 1] = TileType.WALL;
  }
  
  // 내부 바닥
  for (let y = startY + 1; y < startY + height - 1; y++) {
    for (let x = startX + 1; x < startX + width - 1; x++) {
      tiles[y][x] = TileType.FLOOR;
    }
  }
  
  // 문 (하단 중앙)
  const doorX = startX + Math.floor(width / 2);
  tiles[startY + height - 1][doorX] = TileType.DOOR;
  
  // 추가 문 (우측 중앙, 큰 건물만)
  if (width >= 8) {
    const doorY = startY + Math.floor(height / 2);
    tiles[doorY][startX + width - 1] = TileType.DOOR;
  }
  
  // 창문 (상단)
  if (width >= 6) {
    tiles[startY][startX + 2] = TileType.WINDOW;
    tiles[startY][startX + width - 3] = TileType.WINDOW;
  }
}

/** 반벽 라인 추가 */
function addHalfWallLine(
  tiles: TileType[][],
  startX: number,
  startY: number,
  length: number,
  vertical: boolean
): void {
  for (let i = 0; i < length; i++) {
    const x = vertical ? startX : startX + i;
    const y = vertical ? startY + i : startY;
    if (x >= 0 && x < MAP_WIDTH_TILES && y >= 0 && y < MAP_HEIGHT_TILES) {
      tiles[y][x] = TileType.HALF_WALL;
    }
  }
}
