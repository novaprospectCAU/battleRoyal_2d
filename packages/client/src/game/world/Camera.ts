import { clamp, Vector2 } from '@battle-royal/shared';
import type { Player } from '../entities/Player';

/**
 * 카메라 클래스
 * 플레이어를 따라가며 뷰포트를 관리합니다.
 * 렌더링 단계에서 보간된 위치를 따라가 부드러운 이동을 제공합니다.
 */
export class Camera {
  x = 0;
  y = 0;
  
  private viewportWidth: number;
  private viewportHeight: number;
  
  private target: Player | null = null;
  
  // 부드러운 카메라 이동 (낮을수록 부드러움)
  private smoothing = 0.08;
  
  // 마지막 프레임 시간 (델타 기반 lerp용)
  private lastFrameTime = 0;

  constructor(viewportWidth: number, viewportHeight: number) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.lastFrameTime = performance.now();
  }

  /** 뷰포트 크기 설정 */
  setViewport(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  /** 타겟 설정 (플레이어 따라가기) */
  follow(player: Player): void {
    this.target = player;
    // 초기 위치를 타겟에 즉시 맞춤
    if (player) {
      this.x = player.x - this.viewportWidth / 2;
      this.y = player.y - this.viewportHeight / 2;
    }
  }

  /** 
   * 카메라 업데이트 (렌더링 단계에서 호출)
   * @param alpha 보간 계수 (0~1)
   */
  updateSmooth(alpha: number): void {
    if (!this.target) return;
    
    // 플레이어의 보간된 위치 가져오기
    const playerPos = this.target.getInterpolatedPosition(alpha);
    
    // 타겟 중앙에 오도록 목표 위치 계산
    const targetX = playerPos.x - this.viewportWidth / 2;
    const targetY = playerPos.y - this.viewportHeight / 2;
    
    // 시간 기반 부드러운 이동
    const currentTime = performance.now();
    const deltaTime = Math.min(currentTime - this.lastFrameTime, 100); // 최대 100ms 제한
    this.lastFrameTime = currentTime;
    
    // 프레임 독립적인 lerp (60fps 기준으로 정규화)
    const lerpFactor = 1 - Math.pow(1 - this.smoothing, deltaTime / 16.67);
    
    this.x += (targetX - this.x) * lerpFactor;
    this.y += (targetY - this.y) * lerpFactor;
  }

  /** 맵 경계 안으로 제한 */
  clampToMap(mapWidth: number, mapHeight: number): void {
    this.x = clamp(this.x, 0, Math.max(0, mapWidth - this.viewportWidth));
    this.y = clamp(this.y, 0, Math.max(0, mapHeight - this.viewportHeight));
  }

  /** 화면 좌표를 월드 좌표로 변환 */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX + this.x,
      y: screenY + this.y,
    };
  }

  /** 월드 좌표를 화면 좌표로 변환 */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX - this.x,
      y: worldY - this.y,
    };
  }

  /** 현재 뷰포트 중심 좌표 */
  getCenter(): Vector2 {
    return new Vector2(
      this.x + this.viewportWidth / 2,
      this.y + this.viewportHeight / 2
    );
  }
}
