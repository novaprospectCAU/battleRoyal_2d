import { GameLoop } from './GameLoop';
import { Renderer } from './Renderer';
import { Camera } from '../world/Camera';
import { TileMap } from '../world/TileMap';
import { InputManager } from '../input/InputManager';
import { Player } from '../entities/Player';
import { 
  PLAYER_CONFIG,
  RENDER_CONFIG,
  TILE_SIZE,
} from '@battle-royal/shared';

/**
 * 게임 메인 클래스
 * 모든 게임 시스템을 관리하고 조율합니다.
 */
export class Game {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private gameLoop: GameLoop;
  private camera: Camera;
  private inputManager: InputManager;
  private tileMap: TileMap;

  // 플레이어
  private localPlayer: Player;
  private players: Map<string, Player> = new Map();

  // 상태
  private isRunning = false;
  private currentFps = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // 캔버스 초기화
    this.setupCanvas();

    // 타일맵 생성 (먼저)
    this.tileMap = new TileMap();

    // 시스템 초기화
    this.renderer = new Renderer(canvas);
    this.camera = new Camera(
      RENDER_CONFIG.viewportWidth,
      RENDER_CONFIG.viewportHeight
    );
    this.inputManager = new InputManager(canvas);
    this.gameLoop = new GameLoop(
      this.update.bind(this),
      this.render.bind(this)
    );

    // 로컬 플레이어 생성 (랜덤 스폰)
    const spawn = this.tileMap.getRandomSpawn();
    this.localPlayer = new Player(
      'local-player',
      spawn.x,
      spawn.y,
      true
    );
    this.players.set(this.localPlayer.id, this.localPlayer);

    // 카메라가 플레이어 따라가도록
    this.camera.follow(this.localPlayer);
  }

  /** 캔버스 크기 설정 */
  private setupCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }

  /** 창 리사이즈 처리 */
  resize(): void {
    this.setupCanvas();
    this.camera.setViewport(
      this.canvas.getBoundingClientRect().width,
      this.canvas.getBoundingClientRect().height
    );
  }

  /** 게임 시작 */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.inputManager.start();
    this.gameLoop.start();
  }

  /** 게임 중지 */
  stop(): void {
    this.isRunning = false;
    this.gameLoop.stop();
    this.inputManager.stop();
  }

  /** 게임 정리 */
  destroy(): void {
    this.stop();
    this.inputManager.destroy();
  }

  /** FPS 가져오기 */
  getFps(): number {
    return this.currentFps;
  }

  /** 매 틱 업데이트 (고정 시간) */
  private update(dt: number): void {
    // 입력 처리
    const input = this.inputManager.getInput();
    
    // 마우스 위치를 월드 좌표로 변환
    const worldMouseX = input.mouseX + this.camera.x;
    const worldMouseY = input.mouseY + this.camera.y;
    
    // 플레이어 회전 (마우스 방향)
    this.localPlayer.lookAt(worldMouseX, worldMouseY);
    
    // 이동 방향 설정
    let moveX = 0;
    let moveY = 0;
    
    if (input.keys.has('w') || input.keys.has('arrowup')) moveY -= 1;
    if (input.keys.has('s') || input.keys.has('arrowdown')) moveY += 1;
    if (input.keys.has('a') || input.keys.has('arrowleft')) moveX -= 1;
    if (input.keys.has('d') || input.keys.has('arrowright')) moveX += 1;
    
    // 이동 적용
    this.localPlayer.setMovement(moveX, moveY);
    
    // 플레이어 업데이트
    for (const player of this.players.values()) {
      player.update(dt);
    }
    
    // 벽 충돌 처리
    this.handlePlayerCollision(this.localPlayer);
  }

  /** 매 프레임 렌더링 (가변 시간) */
  private render(alpha: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const map = this.tileMap.getMap();
    const mapWidth = this.tileMap.getPixelWidth();
    const mapHeight = this.tileMap.getPixelHeight();
    
    // 카메라 업데이트 (렌더링 단계에서 보간된 위치 따라가기)
    this.camera.updateSmooth(alpha);
    this.camera.clampToMap(mapWidth, mapHeight);
    
    // 배경 클리어
    this.renderer.clear(rect.width, rect.height);
    
    // 카메라 변환 적용
    this.renderer.beginCamera(this.camera);
    
    // 타일맵 그리기
    this.renderer.drawTileMap(map, this.camera, rect.width, rect.height);
    
    // 그리드 (타일 단위, 옵션)
    this.renderer.drawGrid(mapWidth, mapHeight, TILE_SIZE);
    
    // 맵 경계 그리기
    this.renderer.drawMapBorder(mapWidth, mapHeight);
    
    // 플레이어들 그리기
    for (const player of this.players.values()) {
      this.renderer.drawPlayer(player, alpha);
    }
    
    // 카메라 변환 해제
    this.renderer.endCamera();
    
    // FPS 업데이트
    this.currentFps = this.gameLoop.getCurrentFps();
  }

  /** 플레이어 벽 충돌 처리 */
  private handlePlayerCollision(player: Player): void {
    const radius = PLAYER_CONFIG.radius;
    
    // 타일맵 충돌 해결
    const result = this.tileMap.resolveCircleCollision(
      player.x,
      player.y,
      radius
    );
    
    if (result.collided) {
      player.x = result.x;
      player.y = result.y;
    }
  }
}
