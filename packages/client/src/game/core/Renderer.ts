import { 
  DEBUG_COLORS, 
  PLAYER_CONFIG,
  PROJECTILE_CONFIG,
  TileType,
  TILE_COLORS,
  ZONE_CONFIG,
  type GameMap,
  type WeaponDef,
} from '@battle-royal/shared';
import type { Camera } from '../world/Camera';
import type { Player } from '../entities/Player';
import type { Projectile } from '../entities/Projectile';
import type { ZoneState } from '../world/Zone';

/**
 * Canvas 2D 렌더러
 * 디버그 모드에서는 도형으로 렌더링합니다.
 */
export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private debugMode = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not supported');
    }
    this.ctx = ctx;
  }

  /** 디버그 모드 설정 */
  setDebugMode(debug: boolean): void {
    this.debugMode = debug;
  }

  /** 디버그 모드 여부 */
  isDebugMode(): boolean {
    return this.debugMode;
  }

  /** 화면 클리어 */
  clear(width: number, height: number): void {
    this.ctx.fillStyle = DEBUG_COLORS.background;
    this.ctx.fillRect(0, 0, width, height);
  }

  /** 카메라 변환 시작 */
  beginCamera(camera: Camera): void {
    this.ctx.save();
    this.ctx.translate(-camera.x, -camera.y);
  }

  /** 카메라 변환 종료 */
  endCamera(): void {
    this.ctx.restore();
  }

  /** 타일맵 그리기 (카메라 범위만) */
  drawTileMap(map: GameMap, camera: Camera, viewWidth: number, viewHeight: number): void {
    const tileSize = map.tileSize;
    
    // 카메라 범위 내 타일만 렌더링 (최적화)
    const startX = Math.max(0, Math.floor(camera.x / tileSize));
    const startY = Math.max(0, Math.floor(camera.y / tileSize));
    const endX = Math.min(map.width, Math.ceil((camera.x + viewWidth) / tileSize) + 1);
    const endY = Math.min(map.height, Math.ceil((camera.y + viewHeight) / tileSize) + 1);
    
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = map.tiles[y][x];
        this.drawTile(x, y, tile, tileSize);
      }
    }
  }

  /** 개별 타일 그리기 */
  private drawTile(gridX: number, gridY: number, tile: TileType, tileSize: number): void {
    const x = gridX * tileSize;
    const y = gridY * tileSize;
    
    // 바닥 색상
    this.ctx.fillStyle = TILE_COLORS[TileType.FLOOR];
    this.ctx.fillRect(x, y, tileSize, tileSize);
    
    // 타일별 그리기
    switch (tile) {
      case TileType.WALL:
        this.ctx.fillStyle = TILE_COLORS[TileType.WALL];
        this.ctx.fillRect(x, y, tileSize, tileSize);
        // 입체감을 위한 테두리
        this.ctx.strokeStyle = '#5a5a7e';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
        break;
        
      case TileType.HALF_WALL:
        // 반벽은 절반 높이로 표현
        this.ctx.fillStyle = TILE_COLORS[TileType.HALF_WALL];
        this.ctx.fillRect(x + 4, y + 4, tileSize - 8, tileSize - 8);
        this.ctx.strokeStyle = '#7a7a9e';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x + 4, y + 4, tileSize - 8, tileSize - 8);
        break;
        
      case TileType.DOOR:
        // 문 (갈색)
        this.ctx.fillStyle = TILE_COLORS[TileType.DOOR];
        this.ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
        // 문 손잡이
        this.ctx.fillStyle = '#654321';
        this.ctx.beginPath();
        this.ctx.arc(x + tileSize - 8, y + tileSize / 2, 3, 0, Math.PI * 2);
        this.ctx.fill();
        break;
        
      case TileType.WINDOW:
        // 창문 (하늘색 + 테두리)
        this.ctx.fillStyle = TILE_COLORS[TileType.WINDOW];
        this.ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
        // 창문 격자
        this.ctx.strokeStyle = '#3a6a7a';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x + tileSize / 2, y + 2);
        this.ctx.lineTo(x + tileSize / 2, y + tileSize - 2);
        this.ctx.moveTo(x + 2, y + tileSize / 2);
        this.ctx.lineTo(x + tileSize - 2, y + tileSize / 2);
        this.ctx.stroke();
        break;
        
      case TileType.FLOOR:
      case TileType.EMPTY:
        // 이미 바닥으로 그렸음
        break;
    }
  }

  /** 그리드 그리기 (옵션) */
  drawGrid(mapWidth: number, mapHeight: number, cellSize: number): void {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;
    
    // 세로선
    for (let x = 0; x <= mapWidth; x += cellSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, mapHeight);
      this.ctx.stroke();
    }
    
    // 가로선
    for (let y = 0; y <= mapHeight; y += cellSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(mapWidth, y);
      this.ctx.stroke();
    }
  }

  /** 맵 경계 그리기 */
  drawMapBorder(mapWidth: number, mapHeight: number): void {
    this.ctx.strokeStyle = '#ff4444';
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(0, 0, mapWidth, mapHeight);
  }

  /** 플레이어 그리기 */
  drawPlayer(player: Player, alpha: number): void {
    // 보간된 위치 계산
    const pos = player.getInterpolatedPosition(alpha);
    const rotation = player.getInterpolatedRotation(alpha);
    const radius = PLAYER_CONFIG.radius;
    
    // 죽은 플레이어는 다르게 표시
    if (!player.isAlive) {
      this.drawDeadPlayer(pos.x, pos.y, radius, player.name);
      return;
    }
    
    // 색상 결정
    const color = player.isLocalPlayer 
      ? DEBUG_COLORS.localPlayer 
      : DEBUG_COLORS.otherPlayer;
    
    this.ctx.save();
    this.ctx.translate(pos.x, pos.y);
    this.ctx.rotate(rotation);
    
    // 몸체 (원)
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();
    
    // 외곽선
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // 방향 표시 (삼각형)
    this.ctx.beginPath();
    this.ctx.moveTo(radius + 8, 0);
    this.ctx.lineTo(radius - 4, -6);
    this.ctx.lineTo(radius - 4, 6);
    this.ctx.closePath();
    this.ctx.fillStyle = 'white';
    this.ctx.fill();
    
    this.ctx.restore();
    
    // 플레이어 이름 (위에)
    this.ctx.fillStyle = 'white';
    this.ctx.font = '12px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(player.name, pos.x, pos.y - radius - 8);
    
    // 체력바
    this.drawHealthBar(pos.x, pos.y + radius + 8, player.hp, player.maxHp);
  }

  /** 죽은 플레이어 그리기 */
  private drawDeadPlayer(x: number, y: number, radius: number, name: string): void {
    this.ctx.save();
    this.ctx.globalAlpha = 0.5;
    
    // 회색 원
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = DEBUG_COLORS.deadPlayer;
    this.ctx.fill();
    
    // X 표시
    this.ctx.strokeStyle = '#ff0000';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    const offset = radius * 0.6;
    this.ctx.moveTo(x - offset, y - offset);
    this.ctx.lineTo(x + offset, y + offset);
    this.ctx.moveTo(x + offset, y - offset);
    this.ctx.lineTo(x - offset, y + offset);
    this.ctx.stroke();
    
    this.ctx.restore();
    
    // 이름 (희미하게)
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.font = '12px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(name, x, y - radius - 8);
  }

  /** 데미지 숫자 그리기 */
  drawDamageNumber(x: number, y: number, damage: number, progress: number): void {
    if (progress >= 1) return;
    
    // 위로 떠오르면서 사라짐
    const offsetY = -20 * progress;
    const alpha = 1 - progress;
    
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = '#ff4444';
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // 외곽선
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.lineWidth = 3;
    this.ctx.strokeText(`-${damage}`, x, y + offsetY);
    this.ctx.fillText(`-${damage}`, x, y + offsetY);
    
    this.ctx.restore();
  }

  /** 체력바 그리기 */
  private drawHealthBar(
    x: number, 
    y: number, 
    hp: number, 
    maxHp: number
  ): void {
    const width = 40;
    const height = 4;
    const ratio = hp / maxHp;
    
    // 배경
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(x - width / 2, y, width, height);
    
    // 체력
    const hpColor = ratio > 0.5 ? '#4ade80' : ratio > 0.25 ? '#facc15' : '#ef4444';
    this.ctx.fillStyle = hpColor;
    this.ctx.fillRect(x - width / 2, y, width * ratio, height);
  }

  /** 원 그리기 */
  drawCircle(x: number, y: number, radius: number, color: string): void {
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();
  }

  /** 사각형 그리기 */
  drawRect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  }

  /** 투사체 그리기 */
  drawProjectile(projectile: Projectile, alpha: number): void {
    if (!projectile.isActive) return;
    
    const pos = projectile.getInterpolatedPosition(alpha);
    const radius = PROJECTILE_CONFIG.radius;
    
    this.ctx.save();
    this.ctx.translate(pos.x, pos.y);
    this.ctx.rotate(projectile.rotation);
    
    // 탄환 모양 (길쭉한 타원)
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, radius * 2, radius, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = PROJECTILE_CONFIG.color;
    this.ctx.fill();
    
    // 글로우 효과
    this.ctx.shadowColor = PROJECTILE_CONFIG.color;
    this.ctx.shadowBlur = 8;
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
    
    this.ctx.restore();
    
    // 트레일 효과 (간단한 선)
    const trailLength = 15;
    const trailX = pos.x - Math.cos(projectile.rotation) * trailLength;
    const trailY = pos.y - Math.sin(projectile.rotation) * trailLength;
    
    const gradient = this.ctx.createLinearGradient(trailX, trailY, pos.x, pos.y);
    gradient.addColorStop(0, 'rgba(255, 200, 0, 0)');
    gradient.addColorStop(1, 'rgba(255, 200, 0, 0.6)');
    
    this.ctx.beginPath();
    this.ctx.moveTo(trailX, trailY);
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = radius * 1.5;
    this.ctx.lineCap = 'round';
    this.ctx.stroke();
  }

  /** 무기 HUD 그리기 (단일 무기) */
  drawWeaponHUD(weapon: WeaponDef, x: number, y: number): void {
    // 배경
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(x, y, 180, 30);
    
    // 무기 이름
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 14px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(weapon.name, x + 10, y + 15);
    
    // 탄약 타입 표시
    this.ctx.fillStyle = '#aaaaaa';
    this.ctx.font = '12px sans-serif';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`[${weapon.ammoType}]`, x + 170, y + 15);
  }

  /** 무기 슬롯 HUD 그리기 (5슬롯) */
  drawWeaponSlots(
    slots: (WeaponDef | null)[],
    currentSlot: number,
    x: number,
    y: number
  ): void {
    const slotWidth = 60;
    const slotHeight = 50;
    const gap = 4;
    const totalWidth = slots.length * slotWidth + (slots.length - 1) * gap;
    
    // 중앙 정렬을 위해 시작 위치 조정 (x가 중앙 기준)
    const startX = x - totalWidth / 2;
    
    for (let i = 0; i < slots.length; i++) {
      const slotX = startX + i * (slotWidth + gap);
      const weapon = slots[i];
      const isActive = i === currentSlot;
      
      // 슬롯 배경
      this.ctx.fillStyle = isActive 
        ? 'rgba(255, 200, 0, 0.3)' 
        : 'rgba(0, 0, 0, 0.5)';
      this.ctx.fillRect(slotX, y, slotWidth, slotHeight);
      
      // 슬롯 테두리
      this.ctx.strokeStyle = isActive ? '#ffcc00' : '#555555';
      this.ctx.lineWidth = isActive ? 2 : 1;
      this.ctx.strokeRect(slotX, y, slotWidth, slotHeight);
      
      // 슬롯 번호
      this.ctx.fillStyle = isActive ? '#ffcc00' : '#888888';
      this.ctx.font = 'bold 10px sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(`${i + 1}`, slotX + 4, y + 4);
      
      if (weapon) {
        // 무기 이름
        this.ctx.fillStyle = isActive ? '#ffffff' : '#aaaaaa';
        this.ctx.font = 'bold 11px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // 이름이 길면 줄이기
        const displayName = weapon.name.length > 6 
          ? weapon.name.substring(0, 6) + '..'
          : weapon.name;
        this.ctx.fillText(displayName, slotX + slotWidth / 2, y + slotHeight / 2);
        
        // 카테고리 아이콘 (작은 텍스트)
        this.ctx.fillStyle = isActive ? '#ffcc00' : '#666666';
        this.ctx.font = '9px sans-serif';
        this.ctx.textBaseline = 'bottom';
        this.ctx.fillText(weapon.category, slotX + slotWidth / 2, y + slotHeight - 4);
      } else {
        // 빈 슬롯
        this.ctx.fillStyle = '#444444';
        this.ctx.font = '10px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('—', slotX + slotWidth / 2, y + slotHeight / 2);
      }
    }
    
    // 조작 안내
    this.ctx.fillStyle = '#666666';
    this.ctx.font = '10px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText('1-5 또는 마우스 휠로 선택', x, y + slotHeight + 6);
  }

  /** 우측 하단 무기 상태 UI (투명 배경, 텍스트만) */
  drawWeaponStatus(
    weapon: WeaponDef | null,
    ammoInMag: number,
    ammoReserve: number,
    viewWidth: number,
    viewHeight: number
  ): void {
    if (!weapon) return;
    
    const padding = 20;
    const x = viewWidth - padding;
    const y = viewHeight - padding;
    
    // 무기 이름 (사용 탄환) - 볼드체 크게
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 18px sans-serif';
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'bottom';
    this.ctx.fillText(`${weapon.name} (${weapon.ammoType})`, x, y - 35);
    
    // 장탄수 / 보유 탄약
    const ammoColor = ammoInMag > 0 ? '#ffffff' : '#ff4444';
    this.ctx.fillStyle = ammoColor;
    this.ctx.font = 'bold 24px sans-serif';
    this.ctx.fillText(`${ammoInMag}`, x - 60, y);
    
    this.ctx.fillStyle = '#888888';
    this.ctx.font = '16px sans-serif';
    this.ctx.fillText(`/ ${ammoReserve}`, x, y);
  }

  /** 재장전 인디케이터 (화면 정중앙, 희미한 원형 프로그레스) */
  drawReloadIndicator(
    progress: number,
    viewWidth: number,
    viewHeight: number
  ): void {
    if (progress <= 0 || progress >= 1) return;
    
    const centerX = viewWidth / 2;
    const centerY = viewHeight / 2;
    const radius = 30;
    const lineWidth = 4;
    
    this.ctx.save();
    
    // 배경 원 (희미한 회색)
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.lineWidth = lineWidth;
    this.ctx.stroke();
    
    // 진행률 원 (희미한 흰색)
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2 * progress);
    
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.lineWidth = lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.stroke();
    
    // 재장전 텍스트
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.font = '12px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('재장전', centerX, centerY);
    
    this.ctx.restore();
  }

  /** 자기장 그리기 (월드 좌표계) */
  drawZone(
    currentZone: { x: number; y: number; radius: number },
    targetZone: { x: number; y: number; radius: number },
    mapWidth: number,
    mapHeight: number
  ): void {
    // 자기장 외부 (빨간색 영역) - 사각형에서 원을 빼는 방식
    this.ctx.save();
    
    // 맵 전체를 빨간색으로
    this.ctx.fillStyle = ZONE_CONFIG.zoneColor;
    this.ctx.beginPath();
    this.ctx.rect(0, 0, mapWidth, mapHeight);
    // 안전 구역 원을 빼기
    this.ctx.arc(currentZone.x, currentZone.y, currentZone.radius, 0, Math.PI * 2, true);
    this.ctx.fill();
    
    // 현재 안전 구역 테두리
    this.ctx.beginPath();
    this.ctx.arc(currentZone.x, currentZone.y, currentZone.radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = ZONE_CONFIG.zoneBorderColor;
    this.ctx.lineWidth = ZONE_CONFIG.borderWidth;
    this.ctx.stroke();
    
    // 다음 안전 구역 (축소 예고)
    if (targetZone.radius < currentZone.radius) {
      this.ctx.beginPath();
      this.ctx.arc(targetZone.x, targetZone.y, targetZone.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = ZONE_CONFIG.nextZoneBorderColor;
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([10, 5]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }
    
    this.ctx.restore();
  }

  /** 자기장 HUD (화면 상단) */
  drawZoneHUD(
    phase: number,
    state: ZoneState,
    timeRemaining: number,
    viewWidth: number
  ): void {
    const x = viewWidth / 2;
    const y = 30;
    
    // 상태 텍스트
    let stateText = '';
    let stateColor = '#ffffff';
    
    if (state === 'waiting') {
      stateText = `다음 자기장까지`;
      stateColor = '#ffffff';
    } else if (state === 'shrinking') {
      stateText = `자기장 축소 중`;
      stateColor = '#ff4444';
    } else {
      stateText = '최종 구역';
      stateColor = '#ff0000';
    }
    
    // 남은 시간
    const seconds = Math.ceil(timeRemaining / 1000);
    
    this.ctx.save();
    
    // 배경
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(x - 80, y - 15, 160, 35);
    
    // 페이즈
    this.ctx.fillStyle = '#888888';
    this.ctx.font = '10px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(`Phase ${phase + 1}`, x, y - 12);
    
    // 상태
    this.ctx.fillStyle = stateColor;
    this.ctx.font = 'bold 14px sans-serif';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`${stateText} ${seconds}초`, x, y + 8);
    
    this.ctx.restore();
  }

  /** 미니맵 그리기 */
  drawMinimap(
    playerX: number,
    playerY: number,
    currentZone: { x: number; y: number; radius: number },
    targetZone: { x: number; y: number; radius: number },
    mapWidth: number,
    mapHeight: number,
    viewWidth: number,
    tiles?: TileType[][],
    tileSize?: number
  ): void {
    const size = 120;
    const margin = 10;
    const x = viewWidth - size - margin;
    const y = margin;
    
    // 스케일 계산
    const scale = size / Math.max(mapWidth, mapHeight);
    
    this.ctx.save();
    
    // 배경
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(x, y, size, size);
    
    // 클리핑 영역 설정 (미니맵 경계 안에서만 그림)
    this.ctx.beginPath();
    this.ctx.rect(x, y, size, size);
    this.ctx.clip();
    
    // 벽 그리기 (지형)
    if (tiles && tileSize) {
      this.ctx.fillStyle = 'rgba(150, 150, 150, 0.8)';
      const tileScaleSize = tileSize * scale;
      
      for (let ty = 0; ty < tiles.length; ty++) {
        for (let tx = 0; tx < tiles[ty].length; tx++) {
          const tileType = tiles[ty][tx];
          // WALL 또는 HALF_WALL인 경우 그리기
          if (tileType === TileType.WALL || tileType === TileType.HALF_WALL) {
            const miniX = x + tx * tileScaleSize;
            const miniY = y + ty * tileScaleSize;
            // 최소 1px로 그리기
            const drawSize = Math.max(1, tileScaleSize);
            this.ctx.fillRect(miniX, miniY, drawSize, drawSize);
          }
        }
      }
    }
    
    // 자기장 (현재)
    const zoneX = x + currentZone.x * scale;
    const zoneY = y + currentZone.y * scale;
    const zoneR = currentZone.radius * scale;
    
    // 위험 구역 (빨간색)
    this.ctx.fillStyle = 'rgba(255, 80, 80, 0.4)';
    this.ctx.beginPath();
    this.ctx.rect(x, y, size, size);
    this.ctx.arc(zoneX, zoneY, zoneR, 0, Math.PI * 2, true);
    this.ctx.fill();
    
    // 안전 구역 테두리
    this.ctx.beginPath();
    this.ctx.arc(zoneX, zoneY, zoneR, 0, Math.PI * 2);
    this.ctx.strokeStyle = '#ff4444';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    
    // 다음 구역 (점선)
    if (targetZone.radius < currentZone.radius) {
      const targetX = x + targetZone.x * scale;
      const targetY = y + targetZone.y * scale;
      const targetR = targetZone.radius * scale;
      
      this.ctx.beginPath();
      this.ctx.arc(targetX, targetY, targetR, 0, Math.PI * 2);
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.setLineDash([3, 2]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }
    
    // 플레이어 위치
    const playerMiniX = x + playerX * scale;
    const playerMiniY = y + playerY * scale;
    
    this.ctx.beginPath();
    this.ctx.arc(playerMiniX, playerMiniY, 3, 0, Math.PI * 2);
    this.ctx.fillStyle = DEBUG_COLORS.localPlayer;
    this.ctx.fill();
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    
    this.ctx.restore();
    
    // 테두리 (클리핑 영역 밖에서 그림)
    this.ctx.strokeStyle = '#444444';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, size, size);
  }
}
