import { DEBUG_COLORS, PLAYER_CONFIG } from '@battle-royal/shared';
import type { Camera } from '../world/Camera';
import type { Player } from '../entities/Player';

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

  /** 그리드 그리기 */
  drawGrid(mapWidth: number, mapHeight: number, cellSize: number): void {
    this.ctx.strokeStyle = DEBUG_COLORS.grid;
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
    this.ctx.strokeStyle = DEBUG_COLORS.wall;
    this.ctx.lineWidth = 4;
    this.ctx.strokeRect(0, 0, mapWidth, mapHeight);
  }

  /** 플레이어 그리기 */
  drawPlayer(player: Player, alpha: number): void {
    // 보간된 위치 계산
    const pos = player.getInterpolatedPosition(alpha);
    const rotation = player.getInterpolatedRotation(alpha);
    const radius = PLAYER_CONFIG.radius;
    
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
}
