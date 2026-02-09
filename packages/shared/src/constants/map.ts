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
  
  // === 건물 배치 (15개) ===

  // 좌상 지역
  addBuilding(tiles, 5, 5, 8, 8);
  addBuilding(tiles, 16, 4, 6, 6);
  addBuilding(tiles, 5, 18, 6, 8);

  // 우상 지역
  addBuilding(tiles, 44, 4, 8, 6);
  addBuilding(tiles, 54, 8, 6, 8);
  addBuilding(tiles, 44, 14, 6, 6);

  // 중앙 지역 (큰 건물 + 주변)
  addBuilding(tiles, 26, 26, 12, 12);
  addBuilding(tiles, 18, 18, 6, 6);
  addBuilding(tiles, 40, 20, 6, 6);
  addBuilding(tiles, 20, 38, 6, 6);

  // 좌하 지역
  addBuilding(tiles, 4, 44, 8, 8);
  addBuilding(tiles, 15, 50, 6, 6);

  // 우하 지역
  addBuilding(tiles, 46, 46, 8, 8);
  addBuilding(tiles, 54, 54, 6, 6);
  addBuilding(tiles, 38, 52, 6, 6);

  // 야외 장애물 (반벽)
  addHalfWallLine(tiles, 30, 8, 5, true);
  addHalfWallLine(tiles, 8, 34, 6, false);
  addHalfWallLine(tiles, 50, 38, 5, true);
  addHalfWallLine(tiles, 34, 48, 6, false);
  addHalfWallLine(tiles, 22, 12, 4, true);
  addHalfWallLine(tiles, 48, 28, 4, false);

  // === 스폰 포인트 (맵 전체에 고르게 분산, 건물 밖) ===
  const playerSpawns: { x: number; y: number }[] = [];

  // 4x4 그리드로 16개 스폰 (맵을 4등분)
  const gridSize = 4;
  const cellW = Math.floor((MAP_WIDTH_TILES - 4) / gridSize);
  const cellH = Math.floor((MAP_HEIGHT_TILES - 4) / gridSize);
  for (let gy = 0; gy < gridSize; gy++) {
    for (let gx = 0; gx < gridSize; gx++) {
      const cx = 2 + gx * cellW + Math.floor(cellW / 2);
      const cy = 2 + gy * cellH + Math.floor(cellH / 2);
      // 해당 위치가 벽이면 주변 빈 타일 찾기
      let spawnX = cx;
      let spawnY = cy;
      if (tiles[spawnY][spawnX] !== TileType.FLOOR) {
        let found = false;
        for (let r = 1; r < 5 && !found; r++) {
          for (let dy = -r; dy <= r && !found; dy++) {
            for (let dx = -r; dx <= r && !found; dx++) {
              const nx = cx + dx;
              const ny = cy + dy;
              if (nx > 0 && nx < MAP_WIDTH_TILES - 1 && ny > 0 && ny < MAP_HEIGHT_TILES - 1) {
                if (tiles[ny][nx] === TileType.FLOOR) {
                  spawnX = nx;
                  spawnY = ny;
                  found = true;
                }
              }
            }
          }
        }
      }
      playerSpawns.push({
        x: spawnX * TILE_SIZE + TILE_SIZE / 2,
        y: spawnY * TILE_SIZE + TILE_SIZE / 2,
      });
    }
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
