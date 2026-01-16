import { GameLoop } from './GameLoop';
import { Renderer } from './Renderer';
import { Camera } from '../world/Camera';
import { TileMap } from '../world/TileMap';
import { InputManager } from '../input/InputManager';
import { Player } from '../entities/Player';
import { Projectile, generateProjectileId } from '../entities/Projectile';
import { 
  PLAYER_CONFIG,
  RENDER_CONFIG,
  TILE_SIZE,
  WEAPONS,
  DEFAULT_WEAPON_ID,
  PROJECTILE_CONFIG,
  type WeaponDef,
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

  // 투사체
  private projectiles: Projectile[] = [];
  private lastFireTime = 0;
  private wasMouseDown = false;

  // 무기 슬롯 시스템 (5슬롯)
  private weaponSlots: (WeaponDef | null)[] = [null, null, null, null, null];
  private currentSlotIndex = 0;
  
  // 탄약 상태 (슬롯별)
  private ammoInMagazine: number[] = [0, 0, 0, 0, 0];  // 현재 장탄수
  private ammoReserve: Map<string, number> = new Map(); // 탄약 타입별 보유량
  
  // 재장전 상태
  private isReloading = false;
  private reloadStartTime = 0;
  private reloadDuration = 0;

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

    // 기본 무기 슬롯 설정
    // 슬롯 1: 권총 (기본)
    // 슬롯 2-3: 주무기
    // 슬롯 4-5: 빈 슬롯
    this.weaponSlots[0] = WEAPONS['pistol_proto'];
    this.weaponSlots[1] = WEAPONS['rifle_assault'];
    this.weaponSlots[2] = WEAPONS['shotgun_pump'];
    this.currentSlotIndex = 0;
    
    // 초기 탄약 설정
    this.ammoInMagazine[0] = WEAPONS['pistol_proto'].magazineSize;
    this.ammoInMagazine[1] = WEAPONS['rifle_assault'].magazineSize;
    this.ammoInMagazine[2] = WEAPONS['shotgun_pump'].magazineSize;
    
    // 탄약 보유량 (테스트용)
    this.ammoReserve.set('4mm', 50);
    this.ammoReserve.set('9mm', 120);
    this.ammoReserve.set('shotgun', 24);
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

  /** 현재 무기 가져오기 */
  private getCurrentWeapon(): WeaponDef | null {
    return this.weaponSlots[this.currentSlotIndex];
  }

  /** 무기 슬롯 변경 (휠) */
  private changeWeaponSlot(delta: number): void {
    // 재장전 중이면 무기 변경 불가
    if (this.isReloading) return;
    
    // 다음/이전 무기 찾기 (비어있지 않은 슬롯)
    let newIndex = this.currentSlotIndex;
    const totalSlots = this.weaponSlots.length;
    
    for (let i = 0; i < totalSlots; i++) {
      newIndex = (newIndex + delta + totalSlots) % totalSlots;
      if (this.weaponSlots[newIndex] !== null) {
        this.currentSlotIndex = newIndex;
        this.lastFireTime = 0; // 무기 변경 시 발사 쿨다운 리셋
        return;
      }
    }
  }

  /** 무기 슬롯 직접 선택 (숫자 키) */
  private selectWeaponSlot(slotNumber: number): void {
    // 재장전 중이면 무기 변경 불가
    if (this.isReloading) return;
    
    const index = slotNumber - 1; // 1-5 -> 0-4
    if (index >= 0 && index < this.weaponSlots.length) {
      if (this.weaponSlots[index] !== null) {
        this.currentSlotIndex = index;
        this.lastFireTime = 0;
      }
    }
  }

  /** 재장전 시작 */
  private startReload(): void {
    // 이미 재장전 중이면 무시 (취소는 cancelReload에서)
    if (this.isReloading) return;
    
    const weapon = this.getCurrentWeapon();
    if (!weapon) return;
    
    const currentAmmo = this.ammoInMagazine[this.currentSlotIndex];
    const maxAmmo = weapon.magazineSize;
    const reserveAmmo = this.ammoReserve.get(weapon.ammoType) ?? 0;
    
    // 이미 최대 장탄수이거나 보유 탄약이 없으면 재장전 불가
    if (currentAmmo >= maxAmmo || reserveAmmo <= 0) return;
    
    this.isReloading = true;
    this.reloadStartTime = performance.now();
    
    // 샷건은 한 발당 reloadTime, 다른 무기는 전체 재장전
    this.reloadDuration = weapon.reloadTime;
  }

  /** 재장전 취소 */
  private cancelReload(): void {
    if (!this.isReloading) return;
    this.isReloading = false;
  }

  /** 재장전 완료 처리 */
  private completeReload(): void {
    const weapon = this.getCurrentWeapon();
    if (!weapon) {
      this.isReloading = false;
      return;
    }
    
    const currentAmmo = this.ammoInMagazine[this.currentSlotIndex];
    const maxAmmo = weapon.magazineSize;
    const reserveAmmo = this.ammoReserve.get(weapon.ammoType) ?? 0;
    
    // 샷건: 한 발만 장전
    if (weapon.category === 'shotgun') {
      if (currentAmmo < maxAmmo && reserveAmmo > 0) {
        this.ammoInMagazine[this.currentSlotIndex] += 1;
        this.ammoReserve.set(weapon.ammoType, reserveAmmo - 1);
        
        // 아직 더 장전할 수 있으면 계속 재장전
        const newAmmo = this.ammoInMagazine[this.currentSlotIndex];
        const newReserve = this.ammoReserve.get(weapon.ammoType) ?? 0;
        if (newAmmo < maxAmmo && newReserve > 0) {
          // 다음 탄 재장전 시작
          this.reloadStartTime = performance.now();
          this.reloadDuration = weapon.reloadTime;
          return; // 재장전 계속
        }
      }
      this.isReloading = false;
    } else {
      // 일반 무기: 한 번에 전체 장전
      const neededAmmo = maxAmmo - currentAmmo;
      const ammoToLoad = Math.min(neededAmmo, reserveAmmo);
      
      this.ammoInMagazine[this.currentSlotIndex] += ammoToLoad;
      this.ammoReserve.set(weapon.ammoType, reserveAmmo - ammoToLoad);
      
      this.isReloading = false;
    }
  }

  /** 재장전 업데이트 */
  private updateReload(): void {
    if (!this.isReloading) return;
    
    const now = performance.now();
    if (now - this.reloadStartTime >= this.reloadDuration) {
      this.completeReload();
    }
  }

  /** 재장전 진행률 (0~1) */
  private getReloadProgress(): number {
    if (!this.isReloading) return 0;
    const elapsed = performance.now() - this.reloadStartTime;
    return Math.min(1, elapsed / this.reloadDuration);
  }

  /** 매 틱 업데이트 (고정 시간) */
  private update(dt: number): void {
    // 입력 처리
    const input = this.inputManager.getInput();
    
    // 재장전 업데이트
    this.updateReload();
    
    // 재장전 입력 (R키)
    if (input.reloadPressed) {
      if (this.isReloading) {
        // 재장전 중이면 취소
        this.cancelReload();
      } else {
        // 재장전 시작
        this.startReload();
      }
    }
    
    // 무기 선택 처리 (재장전 중이면 changeWeaponSlot/selectWeaponSlot 내부에서 무시)
    if (input.weaponScrollDelta !== 0) {
      this.changeWeaponSlot(input.weaponScrollDelta);
    }
    if (input.weaponSlotKey !== 0) {
      this.selectWeaponSlot(input.weaponSlotKey);
    }
    
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
    
    // 발사 처리 (재장전 중이면 handleFiring 내부에서 무시)
    this.handleFiring(input.mouseDown);
    
    // 플레이어 업데이트
    for (const player of this.players.values()) {
      player.update(dt);
    }
    
    // 벽 충돌 처리
    this.handlePlayerCollision(this.localPlayer);
    
    // 투사체 업데이트
    this.updateProjectiles(dt);
  }

  /** 발사 처리 */
  private handleFiring(mouseDown: boolean): void {
    // 재장전 중이면 발사 불가
    if (this.isReloading) {
      this.wasMouseDown = mouseDown;
      return;
    }
    
    const weapon = this.getCurrentWeapon();
    if (!weapon) {
      this.wasMouseDown = mouseDown;
      return;
    }
    
    // 탄약이 없으면 발사 불가 (자동 재장전 없음)
    if (this.ammoInMagazine[this.currentSlotIndex] <= 0) {
      this.wasMouseDown = mouseDown;
      return;
    }
    
    const now = performance.now();
    const fireInterval = 60000 / weapon.fireRate; // ms per shot
    
    // 발사 가능 여부 체크
    const canFire = now - this.lastFireTime >= fireInterval;
    
    // 단발 모드: 클릭 시작할 때만 발사
    if (weapon.fireMode.includes('single')) {
      if (mouseDown && !this.wasMouseDown && canFire) {
        this.fire();
        this.lastFireTime = now;
      }
    }
    // 자동 모드: 홀드 시 연속 발사
    else if (weapon.fireMode.includes('auto')) {
      if (mouseDown && canFire) {
        this.fire();
        this.lastFireTime = now;
      }
    }
    
    this.wasMouseDown = mouseDown;
  }

  /** 발사 */
  private fire(): void {
    const weapon = this.getCurrentWeapon();
    if (!weapon) return;
    
    // 탄약 소모
    this.ammoInMagazine[this.currentSlotIndex]--;
    
    if (this.projectiles.length >= PROJECTILE_CONFIG.maxProjectiles) {
      // 가장 오래된 투사체 제거
      this.projectiles.shift();
    }

    const player = this.localPlayer;
    
    // 총구 위치 (플레이어 앞)
    const muzzleOffset = PLAYER_CONFIG.radius + 10;
    const startX = player.x + Math.cos(player.rotation) * muzzleOffset;
    const startY = player.y + Math.sin(player.rotation) * muzzleOffset;
    
    // 투사체 생성
    for (let i = 0; i < weapon.projectileCount; i++) {
      // 스프레드 계산
      let spreadOffset = 0;
      if (weapon.projectileCount > 1) {
        // 여러 발: 균등 분포
        const spreadRange = weapon.spreadAngle;
        spreadOffset = -spreadRange / 2 + (spreadRange / (weapon.projectileCount - 1)) * i;
      } else {
        // 단발: 랜덤 스프레드
        spreadOffset = (Math.random() - 0.5) * weapon.spreadAngle;
      }
      
      const projectile = new Projectile(
        generateProjectileId(),
        player.id,
        weapon,
        startX,
        startY,
        player.rotation,
        spreadOffset
      );
      
      this.projectiles.push(projectile);
    }
  }

  /** 투사체 업데이트 */
  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      
      if (!proj.isActive) {
        this.projectiles.splice(i, 1);
        continue;
      }
      
      // 이전 위치 저장
      const prevX = proj.x;
      const prevY = proj.y;
      
      // 업데이트
      proj.update(dt);
      
      // 벽 충돌 체크 (레이캐스트 스타일)
      if (this.checkProjectileWallCollision(prevX, prevY, proj.x, proj.y)) {
        proj.deactivate();
        this.projectiles.splice(i, 1);
        continue;
      }
      
      // 맵 경계 체크
      if (!this.isInMap(proj.x, proj.y)) {
        proj.deactivate();
        this.projectiles.splice(i, 1);
      }
    }
  }

  /** 투사체-벽 충돌 체크 */
  private checkProjectileWallCollision(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): boolean {
    // 간단한 샘플링 방식 (레이캐스트 대신)
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(dist / 8); // 8px 간격으로 체크
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = fromX + dx * t;
      const y = fromY + dy * t;
      
      if (!this.tileMap.isWalkable(x, y)) {
        return true;
      }
    }
    
    return false;
  }

  /** 맵 내부 체크 */
  private isInMap(x: number, y: number): boolean {
    return x >= 0 && x < this.tileMap.getPixelWidth() &&
           y >= 0 && y < this.tileMap.getPixelHeight();
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
    
    // 투사체 그리기
    for (const proj of this.projectiles) {
      this.renderer.drawProjectile(proj, alpha);
    }
    
    // 플레이어들 그리기
    for (const player of this.players.values()) {
      this.renderer.drawPlayer(player, alpha);
    }
    
    // 카메라 변환 해제
    this.renderer.endCamera();
    
    // HUD: 무기 슬롯 (하단 중앙)
    this.renderer.drawWeaponSlots(
      this.weaponSlots,
      this.currentSlotIndex,
      rect.width / 2,
      rect.height - 80
    );
    
    // HUD: 우측 하단 무기 상태
    const currentWeapon = this.getCurrentWeapon();
    const currentAmmo = this.ammoInMagazine[this.currentSlotIndex];
    const reserveAmmo = currentWeapon 
      ? (this.ammoReserve.get(currentWeapon.ammoType) ?? 0) 
      : 0;
    this.renderer.drawWeaponStatus(
      currentWeapon,
      currentAmmo,
      reserveAmmo,
      rect.width,
      rect.height
    );
    
    // 재장전 인디케이터 (화면 중앙)
    if (this.isReloading) {
      this.renderer.drawReloadIndicator(
        this.getReloadProgress(),
        rect.width,
        rect.height
      );
    }
    
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
