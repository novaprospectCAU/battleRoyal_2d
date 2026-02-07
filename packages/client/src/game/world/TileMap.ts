import {
  type GameMap,
  TileType,
  TILE_PROPERTIES,
  worldToTile,
  createTestMap,
} from '@battle-royal/shared';

interface DoorState {
  isOpen: boolean;
  opacity: number;       // 현재 opacity (1.0=닫힘, 0.3=열림)
  targetOpacity: number; // 애니메이션 목표
}

/**
 * 타일맵 클래스
 * 맵 데이터 관리 및 충돌 판정
 */
export class TileMap {
  private map: GameMap;
  private doorStates: Map<string, DoorState> = new Map();

  constructor() {
    // 테스트 맵 생성
    this.map = createTestMap();
    this.initDoorStates();
  }

  /** 맵의 모든 DOOR 타일에 대한 초기 상태 생성 */
  private initDoorStates(): void {
    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        if (this.map.tiles[y][x] === TileType.DOOR) {
          this.doorStates.set(`${x},${y}`, { isOpen: false, opacity: 1.0, targetOpacity: 1.0 });
        }
      }
    }
  }

  /** 문이 열려 있는지 확인 */
  isDoorOpen(gridX: number, gridY: number): boolean {
    const state = this.doorStates.get(`${gridX},${gridY}`);
    return state ? state.isOpen : false;
  }

  /** 문 열기/닫기 토글 */
  toggleDoor(gridX: number, gridY: number): void {
    const state = this.doorStates.get(`${gridX},${gridY}`);
    if (!state) return;
    state.isOpen = !state.isOpen;
    state.targetOpacity = state.isOpen ? 0.3 : 1.0;
  }

  /** 문의 현재 opacity 반환 */
  getDoorOpacity(gridX: number, gridY: number): number {
    const state = this.doorStates.get(`${gridX},${gridY}`);
    return state ? state.opacity : 1.0;
  }

  /** 문 애니메이션 업데이트 */
  updateDoorAnimations(dt: number): void {
    const speed = 4.0; // per second (~250ms 전환)
    const dtSec = dt / 1000;
    for (const state of this.doorStates.values()) {
      if (state.opacity !== state.targetOpacity) {
        const diff = state.targetOpacity - state.opacity;
        const step = speed * dtSec;
        if (Math.abs(diff) <= step) {
          state.opacity = state.targetOpacity;
        } else {
          state.opacity += Math.sign(diff) * step;
        }
      }
    }
  }

  /** 플레이어 근처의 가장 가까운 문 찾기 */
  getNearbyDoor(worldX: number, worldY: number, radius: number): { gridX: number; gridY: number } | null {
    const { x: cx, y: cy } = worldToTile(worldX, worldY, this.map.tileSize);
    let bestDist = Infinity;
    let bestDoor: { gridX: number; gridY: number } | null = null;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const gx = cx + dx;
        const gy = cy + dy;
        if (this.getTileAtGrid(gx, gy) === TileType.DOOR) {
          const tileCenterX = gx * this.map.tileSize + this.map.tileSize / 2;
          const tileCenterY = gy * this.map.tileSize + this.map.tileSize / 2;
          const ddx = worldX - tileCenterX;
          const ddy = worldY - tileCenterY;
          const dist = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dist <= radius && dist < bestDist) {
            bestDist = dist;
            bestDoor = { gridX: gx, gridY: gy };
          }
        }
      }
    }
    return bestDoor;
  }

  /** 맵 데이터 가져오기 */
  getMap(): GameMap {
    return this.map;
  }

  /** 맵 크기 (픽셀) */
  getPixelWidth(): number {
    return this.map.width * this.map.tileSize;
  }

  getPixelHeight(): number {
    return this.map.height * this.map.tileSize;
  }

  /** 타일 크기 */
  getTileSize(): number {
    return this.map.tileSize;
  }

  /** 특정 위치의 타일 가져오기 */
  getTileAt(worldX: number, worldY: number): TileType {
    const { x, y } = worldToTile(worldX, worldY, this.map.tileSize);
    return this.getTileAtGrid(x, y);
  }

  /** 그리드 좌표로 타일 가져오기 */
  getTileAtGrid(gridX: number, gridY: number): TileType {
    if (gridX < 0 || gridX >= this.map.width || gridY < 0 || gridY >= this.map.height) {
      return TileType.WALL; // 맵 밖은 벽 취급
    }
    return this.map.tiles[gridY][gridX];
  }

  /** 특정 위치가 이동 가능한지 */
  isWalkable(worldX: number, worldY: number): boolean {
    const tile = this.getTileAt(worldX, worldY);
    if (tile === TileType.DOOR) {
      const { x, y } = worldToTile(worldX, worldY, this.map.tileSize);
      return this.isDoorOpen(x, y);
    }
    const props = TILE_PROPERTIES[tile];
    return props.collision === 0; // CollisionType.NONE
  }

  /** 원형 충돌체가 이동 가능한지 (4방향 체크) */
  isCircleWalkable(centerX: number, centerY: number, radius: number): boolean {
    // 원의 4방향 + 중심점 체크
    const points = [
      { x: centerX, y: centerY },
      { x: centerX - radius, y: centerY },
      { x: centerX + radius, y: centerY },
      { x: centerX, y: centerY - radius },
      { x: centerX, y: centerY + radius },
      // 대각선도 체크
      { x: centerX - radius * 0.7, y: centerY - radius * 0.7 },
      { x: centerX + radius * 0.7, y: centerY - radius * 0.7 },
      { x: centerX - radius * 0.7, y: centerY + radius * 0.7 },
      { x: centerX + radius * 0.7, y: centerY + radius * 0.7 },
    ];

    for (const point of points) {
      if (!this.isWalkable(point.x, point.y)) {
        return false;
      }
    }
    return true;
  }

  /**
   * 원형 충돌체와 벽의 충돌 해결
   * 충돌 시 밀어낼 위치 반환
   */
  resolveCircleCollision(
    centerX: number,
    centerY: number,
    radius: number
  ): { x: number; y: number; collided: boolean } {
    let newX = centerX;
    let newY = centerY;
    let collided = false;

    const tileSize = this.map.tileSize;

    // 충돌 검사할 타일 범위
    const startTileX = Math.floor((centerX - radius) / tileSize);
    const endTileX = Math.floor((centerX + radius) / tileSize);
    const startTileY = Math.floor((centerY - radius) / tileSize);
    const endTileY = Math.floor((centerY + radius) / tileSize);

    for (let ty = startTileY; ty <= endTileY; ty++) {
      for (let tx = startTileX; tx <= endTileX; tx++) {
        const tile = this.getTileAtGrid(tx, ty);
        const props = TILE_PROPERTIES[tile];

        if (props.collision !== 0 && !(tile === TileType.DOOR && this.isDoorOpen(tx, ty))) {
          // 타일 AABB
          const tileLeft = tx * tileSize;
          const tileRight = (tx + 1) * tileSize;
          const tileTop = ty * tileSize;
          const tileBottom = (ty + 1) * tileSize;

          // 원과 AABB 충돌 검사
          const closestX = Math.max(tileLeft, Math.min(newX, tileRight));
          const closestY = Math.max(tileTop, Math.min(newY, tileBottom));

          const distX = newX - closestX;
          const distY = newY - closestY;
          const distSq = distX * distX + distY * distY;

          if (distSq < radius * radius) {
            collided = true;

            // 밀어내기
            const dist = Math.sqrt(distSq);
            if (dist > 0) {
              const overlap = radius - dist;
              const nx = distX / dist;
              const ny = distY / dist;
              newX += nx * overlap;
              newY += ny * overlap;
            } else {
              // 원 중심이 타일 안에 있는 경우
              // 가장 가까운 방향으로 밀어내기
              const centerTileX = (tileLeft + tileRight) / 2;
              const centerTileY = (tileTop + tileBottom) / 2;

              const dx = newX - centerTileX;
              const dy = newY - centerTileY;

              if (Math.abs(dx) > Math.abs(dy)) {
                newX = dx > 0 ? tileRight + radius : tileLeft - radius;
              } else {
                newY = dy > 0 ? tileBottom + radius : tileTop - radius;
              }
            }
          }
        }
      }
    }

    return { x: newX, y: newY, collided };
  }

  /** 랜덤 스폰 포인트 가져오기 */
  getRandomSpawn(): { x: number; y: number } {
    const spawns = this.map.playerSpawns;
    const index = Math.floor(Math.random() * spawns.length);
    return spawns[index];
  }

  /** 특정 위치가 시야를 차단하는지 확인 */
  blocksVision(worldX: number, worldY: number): boolean {
    const tile = this.getTileAt(worldX, worldY);
    if (tile === TileType.DOOR) {
      const { x, y } = worldToTile(worldX, worldY, this.map.tileSize);
      return !this.isDoorOpen(x, y);
    }
    const props = TILE_PROPERTIES[tile];
    return props.blocksVision;
  }

  /**
   * 레이캐스팅으로 시야 끝점 계산
   * 시야를 차단하는 벽까지의 거리 또는 최대 거리 반환
   */
  castVisionRay(
    startX: number,
    startY: number,
    angle: number,
    maxDistance: number
  ): { x: number; y: number; distance: number } {
    const stepSize = 4; // 4px 간격으로 체크
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    
    let distance = 0;
    let x = startX;
    let y = startY;
    
    while (distance < maxDistance) {
      distance += stepSize;
      x = startX + dx * distance;
      y = startY + dy * distance;
      
      // 맵 밖 체크
      if (x < 0 || x >= this.getPixelWidth() || y < 0 || y >= this.getPixelHeight()) {
        return { x, y, distance };
      }
      
      // 시야 차단 체크
      if (this.blocksVision(x, y)) {
        return { x, y, distance };
      }
    }
    
    return { x, y, distance: maxDistance };
  }
}
