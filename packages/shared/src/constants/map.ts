import { TileType, type GameMap } from '../types/map.js';

/** 타일 크기 (픽셀) - 플레이어 직경 기준 */
export const TILE_SIZE = 32;

/** 맵 크기 (타일 단위) — 128×128 = 4096px */
export const MAP_WIDTH_TILES = 128;
export const MAP_HEIGHT_TILES = 128;

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
 * 맵 생성
 * 128×128 타일, 외곽 벽 + 건물 ~50개 + 야외 장애물
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

  // === 건물 배치 (~50개) ===

  // ─── 북서 지역 (NW: 2-42, 2-42) ───
  addBuilding(tiles, 4, 4, 10, 8);
  addBuilding(tiles, 18, 3, 8, 6);
  addBuilding(tiles, 30, 5, 6, 8);
  addBuilding(tiles, 5, 16, 8, 10);
  addBuilding(tiles, 20, 18, 6, 6);
  addBuilding(tiles, 32, 16, 8, 6);
  addBuilding(tiles, 8, 30, 6, 8);
  addBuilding(tiles, 22, 32, 8, 6);

  // ─── 북쪽 중앙 (N: 42-86, 2-42) ───
  addBuilding(tiles, 46, 4, 10, 8);
  addBuilding(tiles, 60, 3, 8, 6);
  addBuilding(tiles, 74, 6, 6, 6);
  addBuilding(tiles, 48, 18, 6, 8);
  addBuilding(tiles, 62, 16, 10, 8);
  addBuilding(tiles, 78, 18, 6, 6);
  addBuilding(tiles, 50, 30, 8, 6);

  // ─── 북동 지역 (NE: 86-126, 2-42) ───
  addBuilding(tiles, 90, 4, 8, 8);
  addBuilding(tiles, 104, 3, 10, 6);
  addBuilding(tiles, 118, 5, 6, 8);
  addBuilding(tiles, 88, 18, 6, 6);
  addBuilding(tiles, 100, 16, 8, 8);
  addBuilding(tiles, 116, 18, 8, 6);
  addBuilding(tiles, 92, 30, 6, 6);

  // ─── 서쪽 중앙 (W: 2-42, 42-86) ───
  addBuilding(tiles, 4, 46, 8, 8);
  addBuilding(tiles, 18, 48, 6, 6);
  addBuilding(tiles, 30, 44, 8, 10);
  addBuilding(tiles, 6, 60, 6, 6);
  addBuilding(tiles, 20, 62, 8, 8);
  addBuilding(tiles, 8, 76, 6, 6);

  // ─── 중앙 지역 (Center: 42-86, 42-86) — 대형 건물 + 주변 ───
  addBuilding(tiles, 52, 52, 14, 14);   // 중앙 대형
  addBuilding(tiles, 44, 44, 6, 6);
  addBuilding(tiles, 70, 44, 8, 6);
  addBuilding(tiles, 44, 68, 6, 8);
  addBuilding(tiles, 72, 68, 6, 6);
  addBuilding(tiles, 56, 70, 8, 6);
  addBuilding(tiles, 46, 80, 6, 6);
  addBuilding(tiles, 68, 78, 8, 8);

  // ─── 동쪽 중앙 (E: 86-126, 42-86) ───
  addBuilding(tiles, 90, 46, 8, 8);
  addBuilding(tiles, 104, 44, 10, 6);
  addBuilding(tiles, 118, 48, 6, 8);
  addBuilding(tiles, 88, 62, 6, 6);
  addBuilding(tiles, 102, 60, 8, 8);
  addBuilding(tiles, 116, 62, 8, 6);

  // ─── 남서 지역 (SW: 2-42, 86-126) ───
  addBuilding(tiles, 4, 90, 10, 8);
  addBuilding(tiles, 20, 88, 6, 6);
  addBuilding(tiles, 32, 90, 6, 8);
  addBuilding(tiles, 6, 104, 8, 8);
  addBuilding(tiles, 22, 106, 6, 6);
  addBuilding(tiles, 34, 104, 8, 6);
  addBuilding(tiles, 10, 118, 6, 6);

  // ─── 남쪽 중앙 (S: 42-86, 86-126) ───
  addBuilding(tiles, 46, 90, 8, 8);
  addBuilding(tiles, 62, 88, 10, 6);
  addBuilding(tiles, 76, 92, 6, 6);
  addBuilding(tiles, 48, 104, 6, 8);
  addBuilding(tiles, 60, 102, 8, 8);
  addBuilding(tiles, 74, 106, 8, 6);

  // ─── 남동 지역 (SE: 86-126, 86-126) ───
  addBuilding(tiles, 90, 90, 8, 10);
  addBuilding(tiles, 104, 88, 10, 8);
  addBuilding(tiles, 118, 92, 6, 6);
  addBuilding(tiles, 88, 106, 6, 6);
  addBuilding(tiles, 102, 104, 8, 8);
  addBuilding(tiles, 116, 106, 8, 6);
  addBuilding(tiles, 94, 118, 6, 6);
  addBuilding(tiles, 110, 118, 8, 6);

  // === 야외 장애물 (반벽) ===
  // 북쪽
  addHalfWallLine(tiles, 38, 10, 6, true);
  addHalfWallLine(tiles, 55, 14, 5, false);
  addHalfWallLine(tiles, 82, 12, 5, true);
  // 서쪽
  addHalfWallLine(tiles, 14, 55, 6, true);
  addHalfWallLine(tiles, 36, 58, 5, false);
  // 동쪽
  addHalfWallLine(tiles, 112, 56, 6, true);
  addHalfWallLine(tiles, 96, 38, 5, false);
  // 남쪽
  addHalfWallLine(tiles, 40, 100, 6, true);
  addHalfWallLine(tiles, 56, 98, 5, false);
  addHalfWallLine(tiles, 84, 102, 5, true);
  // 중앙 주변
  addHalfWallLine(tiles, 48, 38, 5, false);
  addHalfWallLine(tiles, 70, 38, 4, true);
  addHalfWallLine(tiles, 38, 72, 5, false);
  addHalfWallLine(tiles, 82, 70, 6, true);
  addHalfWallLine(tiles, 62, 82, 5, false);
  // 코너 지역
  addHalfWallLine(tiles, 16, 38, 4, true);
  addHalfWallLine(tiles, 108, 36, 5, true);
  addHalfWallLine(tiles, 18, 98, 5, false);
  addHalfWallLine(tiles, 108, 96, 4, false);

  // === 스폰 포인트 (5x5 그리드 = 25개) ===
  const playerSpawns: { x: number; y: number }[] = [];

  const gridSize = 5;
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
        for (let r = 1; r < 8 && !found; r++) {
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
    name: 'Battle Map',
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
  // 경계 체크
  if (startX + width >= MAP_WIDTH_TILES || startY + height >= MAP_HEIGHT_TILES) return;
  if (startX < 1 || startY < 1) return;

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

  // 추가 문 (좌측, 대형 건물만)
  if (width >= 12) {
    const doorY = startY + Math.floor(height / 2);
    tiles[doorY][startX] = TileType.DOOR;
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
