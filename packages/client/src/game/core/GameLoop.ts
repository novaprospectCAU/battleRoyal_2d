import { TICK_INTERVAL } from '@battle-royal/shared';

type UpdateFn = (dt: number) => void;
type RenderFn = (alpha: number) => void;

/**
 * 게임 루프 클래스
 * 고정 시간 업데이트 + 가변 시간 렌더링
 */
export class GameLoop {
  private running = false;
  private lastTime = 0;
  private accumulator = 0;
  
  private updateFn: UpdateFn;
  private renderFn: RenderFn;
  
  private frameId: number | null = null;
  
  // FPS 측정
  private frameCount = 0;
  private lastFpsTime = 0;
  private currentFps = 0;

  constructor(update: UpdateFn, render: RenderFn) {
    this.updateFn = update;
    this.renderFn = render;
  }

  /** 루프 시작 */
  start(): void {
    if (this.running) return;
    
    this.running = true;
    this.lastTime = performance.now();
    this.lastFpsTime = this.lastTime;
    this.frameCount = 0;
    
    this.loop(this.lastTime);
  }

  /** 루프 중지 */
  stop(): void {
    this.running = false;
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  /** 현재 FPS */
  getCurrentFps(): number {
    return this.currentFps;
  }

  /** 메인 루프 */
  private loop = (currentTime: number): void => {
    if (!this.running) return;

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.accumulator += deltaTime;

    // FPS 계산
    this.frameCount++;
    if (currentTime - this.lastFpsTime >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = currentTime;
    }

    // Spiral of death 방지: accumulator 최대 200ms (4틱)로 제한
    if (this.accumulator > TICK_INTERVAL * 4) {
      this.accumulator = TICK_INTERVAL * 4;
    }

    // 고정 시간 업데이트 (20 Hz)
    while (this.accumulator >= TICK_INTERVAL) {
      this.updateFn(TICK_INTERVAL);
      this.accumulator -= TICK_INTERVAL;
    }

    // 보간된 렌더링
    const alpha = this.accumulator / TICK_INTERVAL;
    this.renderFn(alpha);

    // 다음 프레임 예약
    this.frameId = requestAnimationFrame(this.loop);
  };
}
