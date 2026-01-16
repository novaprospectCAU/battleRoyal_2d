import { GameLoop } from './GameLoop';
import { Renderer } from './Renderer';
import { Camera } from '../world/Camera';
import { TileMap } from '../world/TileMap';
import { Zone } from '../world/Zone';
import { InputManager } from '../input/InputManager';
import { Player } from '../entities/Player';
import { Projectile, generateProjectileId } from '../entities/Projectile';
import { BotAI } from '../ai/BotAI';
import { 
  PLAYER_CONFIG,
  RENDER_CONFIG,
  TILE_SIZE,
  WEAPONS,
  DEFAULT_WEAPON_ID,
  PROJECTILE_CONFIG,
  BotDifficulty,
  USABLE_ITEMS,
  HEAL_OVER_TIME_CONFIG,
  UsableItemType,
  type WeaponDef,
  type UsableItemDef,
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
  private zone: Zone;

  // 플레이어
  private localPlayer: Player;
  private players: Map<string, Player> = new Map();
  
  // AI 봇
  private botAIs: Map<string, BotAI> = new Map();

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
  
  // 아이템 슬롯 (4,5번 슬롯)
  private itemSlots: (UsableItemDef | null)[] = [null, null]; // 슬롯 3,4 (0-indexed)
  private itemCounts: number[] = [0, 0]; // 아이템 수량
  
  // 아이템 사용 상태
  private isUsingItem = false;
  private itemUseStartTime = 0;
  private itemUseDuration = 0;
  private usingItemIndex = -1; // 사용 중인 아이템 슬롯 인덱스 (3 or 4)
  
  // 지속 회복 게이지
  private healOverTimeGauge = 0;

  // 상태
  private isRunning = false;
  private currentFps = 0;
  
  // 데미지 표시
  private damageNumbers: { x: number; y: number; damage: number; time: number }[] = [];
  
  // 킬로그
  private killLogs: { killer: string; victim: string; weapon: string; time: number }[] = [];
  
  // 전체 플레이어 수 (게임 시작 시 고정)
  private totalPlayerCount = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // 캔버스 초기화
    this.setupCanvas();

    // 타일맵 생성 (먼저)
    this.tileMap = new TileMap();
    
    // 자기장 생성
    this.zone = new Zone(
      this.tileMap.getPixelWidth(),
      this.tileMap.getPixelHeight()
    );

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
    
    // 초기 아이템 설정 (4,5번 슬롯)
    this.itemSlots[0] = USABLE_ITEMS['health_kit'];
    this.itemSlots[1] = USABLE_ITEMS['heal_over_time'];
    this.itemCounts[0] = 2; // 구급상자 2개
    this.itemCounts[1] = 3; // 진통제 3개
    
    // 테스트용 AI 봇 생성
    this.spawnTestEnemies(5);
  }

  /** 테스트용 AI 봇 생성 */
  private spawnTestEnemies(count: number): void {
    // 난이도 분배: Easy 40%, Normal 40%, Hard 20%
    const difficulties = [
      BotDifficulty.EASY,
      BotDifficulty.EASY,
      BotDifficulty.NORMAL,
      BotDifficulty.NORMAL,
      BotDifficulty.HARD,
    ];
    
    for (let i = 0; i < count; i++) {
      const spawn = this.tileMap.getRandomSpawn();
      const enemy = new Player(
        `bot-${i}`,
        spawn.x,
        spawn.y,
        false
      );
      
      // 난이도 선택
      const difficulty = difficulties[i % difficulties.length];
      
      // AI 생성 및 연결
      const botAI = new BotAI(enemy, difficulty);
      
      this.players.set(enemy.id, enemy);
      this.botAIs.set(enemy.id, botAI);
    }
    
    // 전체 플레이어 수 설정 (로컬 플레이어 + 봇)
    this.totalPlayerCount = this.players.size;
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
    // 재장전 중이거나 아이템 사용 중이면 불가
    if (this.isReloading || this.isUsingItem) return;
    
    const index = slotNumber - 1; // 1-5 -> 0-4
    
    // 4,5번 키는 아이템 슬롯 (인덱스 3,4 -> 아이템 슬롯 0,1)
    if (index === 3 || index === 4) {
      this.startUseItem(index - 3); // 0 또는 1
      return;
    }
    
    // 무기 슬롯 (1-3번)
    if (index >= 0 && index < 3) {
      if (this.weaponSlots[index] !== null) {
        this.currentSlotIndex = index;
        this.lastFireTime = 0;
      }
    }
  }

  /** 아이템 사용 시작 */
  private startUseItem(itemSlotIndex: number): void {
    // 이미 사용 중이면 무시
    if (this.isUsingItem) return;
    
    const item = this.itemSlots[itemSlotIndex];
    const count = this.itemCounts[itemSlotIndex];
    
    // 아이템이 없거나 수량이 0이면 사용 불가
    if (!item || count <= 0) return;
    
    // 체력 아이템: 이미 풀피면 사용 불가
    if (item.type === UsableItemType.HEALTH_KIT) {
      if (this.localPlayer.hp >= this.localPlayer.maxHp) return;
    }
    
    // 지속 회복 아이템: 이미 게이지 풀이면 사용 불가
    if (item.type === UsableItemType.HEAL_OVER_TIME) {
      if (this.healOverTimeGauge >= HEAL_OVER_TIME_CONFIG.maxGauge) return;
    }
    
    this.isUsingItem = true;
    this.itemUseStartTime = performance.now();
    this.itemUseDuration = item.useTime;
    this.usingItemIndex = itemSlotIndex;
  }
  
  /** 아이템 사용 취소 */
  private cancelItemUse(): void {
    this.isUsingItem = false;
    this.usingItemIndex = -1;
  }
  
  /** 아이템 사용 업데이트 */
  private updateItemUse(): void {
    if (!this.isUsingItem) return;
    
    const now = performance.now();
    if (now - this.itemUseStartTime >= this.itemUseDuration) {
      this.completeItemUse();
    }
  }
  
  /** 아이템 사용 완료 */
  private completeItemUse(): void {
    const item = this.itemSlots[this.usingItemIndex];
    if (!item) {
      this.cancelItemUse();
      return;
    }
    
    // 효과 적용
    if (item.type === UsableItemType.HEALTH_KIT) {
      // 즉시 체력 회복
      const newHp = Math.min(this.localPlayer.maxHp, this.localPlayer.hp + item.amount);
      this.localPlayer.hp = newHp;
    } else if (item.type === UsableItemType.HEAL_OVER_TIME) {
      // 지속 회복 게이지 충전
      const newGauge = Math.min(HEAL_OVER_TIME_CONFIG.maxGauge, this.healOverTimeGauge + item.amount);
      this.healOverTimeGauge = newGauge;
    }
    
    // 아이템 수량 감소
    this.itemCounts[this.usingItemIndex]--;
    
    this.isUsingItem = false;
    this.usingItemIndex = -1;
  }
  
  /** 아이템 사용 진행률 */
  private getItemUseProgress(): number {
    if (!this.isUsingItem) return 0;
    const elapsed = performance.now() - this.itemUseStartTime;
    return Math.min(1, elapsed / this.itemUseDuration);
  }
  
  /** 지속 회복 게이지 업데이트 */
  private updateHealOverTime(dt: number): void {
    if (this.healOverTimeGauge <= 0) return;
    if (!this.localPlayer.isAlive) return;
    
    const dtSec = dt / 1000;
    
    // 게이지 소모
    this.healOverTimeGauge = Math.max(0, this.healOverTimeGauge - HEAL_OVER_TIME_CONFIG.gaugePerSecond * dtSec);
    
    // 체력 회복 (풀피 아닐 때만)
    if (this.localPlayer.hp < this.localPlayer.maxHp) {
      const heal = HEAL_OVER_TIME_CONFIG.healPerSecond * dtSec;
      this.localPlayer.hp = Math.min(this.localPlayer.maxHp, this.localPlayer.hp + heal);
    }
  }

  /** 재장전 시작 */
  private startReload(): void {
    // 이미 재장전 중이거나 아이템 사용 중이면 무시
    if (this.isReloading || this.isUsingItem) return;
    
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
    
    // 플레이어가 죽었으면 대부분의 행동 불가
    if (!this.localPlayer.isAlive) {
      // 죽은 상태에서도 카메라 조준은 가능
      const worldMouseX = input.mouseX + this.camera.x;
      const worldMouseY = input.mouseY + this.camera.y;
      this.localPlayer.lookAt(worldMouseX, worldMouseY);
      
      // 봇 AI/투사체/자기장은 계속 업데이트
      this.updateBotAIs(dt);
      for (const player of this.players.values()) {
        player.update(dt);
        if (player.isBot && player.isAlive) {
          this.handlePlayerCollision(player);
        }
      }
      this.updateProjectiles(dt);
      this.zone.update();
      this.applyZoneDamage(dt);
      return;
    }
    
    // 아이템 사용 업데이트
    this.updateItemUse();
    
    // 지속 회복 게이지 업데이트
    this.updateHealOverTime(dt);
    
    // 아이템 사용 중이면 다른 행동 불가
    if (this.isUsingItem) {
      // 아이템 사용 취소 입력 (F키)
      if (input.cancelItemPressed) {
        this.cancelItemUse();
        // 취소 후 일반 로직 진행
      } else {
        // 이동 불가 (정지)
        this.localPlayer.setMovement(0, 0);
        // 마우스 조준은 가능
        const worldMouseX = input.mouseX + this.camera.x;
        const worldMouseY = input.mouseY + this.camera.y;
        this.localPlayer.lookAt(worldMouseX, worldMouseY);
        // 플레이어 업데이트만 하고 나머지는 건너뜀
        this.localPlayer.update(dt);
        this.handlePlayerCollision(this.localPlayer);
        
        // 봇 AI/투사체/자기장은 계속 업데이트
        this.updateBotAIs(dt);
        for (const player of this.players.values()) {
          player.update(dt);
          if (player.isBot && player.isAlive) {
            this.handlePlayerCollision(player);
          }
        }
        this.updateProjectiles(dt);
        this.zone.update();
        this.applyZoneDamage(dt);
        return;
      }
    }
    
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
    
    // 봇 AI 업데이트
    this.updateBotAIs(dt);
    
    // 플레이어 업데이트
    for (const player of this.players.values()) {
      player.update(dt);
    }
    
    // 벽 충돌 처리
    this.handlePlayerCollision(this.localPlayer);
    for (const player of this.players.values()) {
      if (player.isBot && player.isAlive) {
        this.handlePlayerCollision(player);
      }
    }
    
    // 투사체 업데이트
    this.updateProjectiles(dt);
    
    // 자기장 업데이트
    this.zone.update();
    
    // 자기장 밖 데미지 적용
    this.applyZoneDamage(dt);
  }
  
  /** 봇 AI 업데이트 */
  private updateBotAIs(dt: number): void {
    const currentZone = this.zone.getCurrentZone();
    const zoneState = this.zone.getState();
    
    for (const [botId, botAI] of this.botAIs) {
      const bot = this.players.get(botId);
      if (!bot || !bot.isAlive) continue;
      
      // 자기장 정보 업데이트
      botAI.updateZoneInfo(
        currentZone.x,
        currentZone.y,
        currentZone.radius,
        zoneState === 'shrinking'
      );
      
      // AI 업데이트 및 사격 결정
      const aiResult = botAI.update(
        dt,
        this.tileMap,
        this.players,
        this.localPlayer
      );
      
      // 봇 사격 처리
      if (aiResult.wantsFire) {
        this.fireBotWeapon(bot, aiResult.targetAngle);
      }
    }
  }
  
  /** 봇 무기 발사 */
  private fireBotWeapon(bot: Player, angle: number): void {
    // 봇은 기본 무기 사용
    const weapon = WEAPONS['pistol_proto'];
    if (!weapon) return;
    
    // 총구 위치
    const muzzleOffset = PLAYER_CONFIG.radius + 10;
    let startX = bot.x + Math.cos(angle) * muzzleOffset;
    let startY = bot.y + Math.sin(angle) * muzzleOffset;
    
    // 시작 위치가 벽 안에 있으면 봇 위치에서 시작
    if (!this.tileMap.isWalkable(startX, startY)) {
      startX = bot.x;
      startY = bot.y;
    }
    
    // 투사체 생성
    const projectile = new Projectile(
      generateProjectileId(),
      bot.id,
      weapon,
      startX,
      startY,
      angle,
      (Math.random() - 0.5) * weapon.spreadAngle
    );
    
    this.projectiles.push(projectile);
  }

  /** 자기장 밖 데미지 적용 */
  private applyZoneDamage(dt: number): void {
    const dps = this.zone.getDamagePerSecond();
    if (dps <= 0) return;
    
    const damage = dps * (dt / 1000);
    
    for (const player of this.players.values()) {
      if (!player.isAlive) continue;
      
      if (!this.zone.isInSafeZone(player.x, player.y)) {
        const wasAlive = player.isAlive;
        player.takeDamage(damage);
        
        // 자기장으로 사망 시 킬로그 추가
        if (wasAlive && !player.isAlive) {
          this.killLogs.push({
            killer: '자기장',
            victim: player.name,
            weapon: '⚡',
            time: performance.now(),
          });
        }
      }
    }
  }
  
  /** 생존자 수 계산 */
  private getAliveCount(): number {
    let count = 0;
    for (const player of this.players.values()) {
      if (player.isAlive) count++;
    }
    return count;
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
    let startX = player.x + Math.cos(player.rotation) * muzzleOffset;
    let startY = player.y + Math.sin(player.rotation) * muzzleOffset;
    
    // 시작 위치가 벽 안에 있으면 플레이어 위치에서 시작
    if (!this.tileMap.isWalkable(startX, startY)) {
      startX = player.x;
      startY = player.y;
    }
    
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
      
      // 플레이어 충돌 체크 (이동 경로 전체에서 체크)
      const hitPlayer = this.checkProjectilePlayerCollisionPath(proj, prevX, prevY);
      if (hitPlayer) {
        // 데미지 적용
        const weapon = WEAPONS[proj.weaponId];
        const damage = weapon 
          ? Math.floor(proj.damage * proj.getDamageMultiplier(weapon))
          : proj.damage;
        
        const wasAlive = hitPlayer.isAlive;
        hitPlayer.takeDamage(damage);
        
        // 킬 발생 시 킬로그 추가
        if (wasAlive && !hitPlayer.isAlive) {
          const killer = this.players.get(proj.ownerId);
          this.killLogs.push({
            killer: killer ? killer.name : 'Unknown',
            victim: hitPlayer.name,
            weapon: weapon ? weapon.name : 'Unknown',
            time: performance.now(),
          });
        }
        
        // 데미지 숫자 표시 추가
        this.damageNumbers.push({
          x: hitPlayer.x,
          y: hitPlayer.y - PLAYER_CONFIG.radius - 10,
          damage,
          time: performance.now(),
        });
        
        // 투사체 제거
        proj.deactivate();
        this.projectiles.splice(i, 1);
        continue;
      }
      
      // 벽 충돌 체크 (레이캐스트 스타일)
      const wallHit = this.checkProjectileWallCollision(prevX, prevY, proj.x, proj.y);
      if (wallHit.hit) {
        // 충돌 직전 위치로 이동 후 제거 (렌더링 시 벽 가까이에서 사라지도록)
        proj.x = wallHit.x;
        proj.y = wallHit.y;
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

  /** 투사체-플레이어 충돌 체크 (경로 기반) */
  private checkProjectilePlayerCollisionPath(
    proj: Projectile,
    fromX: number,
    fromY: number
  ): Player | null {
    const projRadius = PROJECTILE_CONFIG.radius;
    const toX = proj.x;
    const toY = proj.y;
    
    // 이동 거리 계산
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // 경로를 따라 샘플링 (8px 간격 또는 최소 시작/끝 체크)
    const steps = Math.max(1, Math.ceil(dist / 8));
    
    for (const player of this.players.values()) {
      // 자기 자신의 투사체는 무시
      if (player.id === proj.ownerId) continue;
      
      // 죽은 플레이어는 무시
      if (!player.isAlive) continue;
      
      const minDist = PLAYER_CONFIG.radius + projRadius;
      
      // 경로 상의 모든 점에서 충돌 체크
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const checkX = fromX + dx * t;
        const checkY = fromY + dy * t;
        
        const pdx = player.x - checkX;
        const pdy = player.y - checkY;
        const distance = Math.sqrt(pdx * pdx + pdy * pdy);
        
        if (distance < minDist) {
          return player;
        }
      }
    }
    
    return null;
  }

  /** 투사체-벽 충돌 체크 */
  private checkProjectileWallCollision(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ): { hit: boolean; x: number; y: number } {
    // 간단한 샘플링 방식 (레이캐스트 대신)
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(1, Math.ceil(dist / 4)); // 4px 간격으로 체크 (더 정밀하게)
    
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = fromX + dx * t;
      const y = fromY + dy * t;
      
      if (!this.tileMap.isWalkable(x, y)) {
        // 충돌 직전 위치 반환 (벽 바로 앞)
        const prevT = (i - 1) / steps;
        return {
          hit: true,
          x: fromX + dx * prevT,
          y: fromY + dy * prevT,
        };
      }
    }
    
    return { hit: false, x: toX, y: toY };
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
    
    // 자기장 그리기
    this.renderer.drawZone(
      this.zone.getCurrentZone(),
      this.zone.getTargetZone(),
      mapWidth,
      mapHeight
    );
    
    // 투사체 그리기
    for (const proj of this.projectiles) {
      this.renderer.drawProjectile(proj, alpha);
    }
    
    // 플레이어들 그리기
    for (const player of this.players.values()) {
      this.renderer.drawPlayer(player, alpha);
    }
    
    // 데미지 숫자 그리기
    const now = performance.now();
    const damageDuration = 800; // 0.8초간 표시
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      const elapsed = now - dn.time;
      const progress = elapsed / damageDuration;
      
      if (progress >= 1) {
        this.damageNumbers.splice(i, 1);
      } else {
        this.renderer.drawDamageNumber(dn.x, dn.y, dn.damage, progress);
      }
    }
    
    // 카메라 변환 해제
    this.renderer.endCamera();
    
    // HUD: 무기/아이템 슬롯 (하단 중앙)
    this.renderer.drawWeaponSlots(
      this.weaponSlots,
      this.itemSlots,
      this.itemCounts,
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
    
    // HUD: 좌하단 체력/회복 게이지
    this.renderer.drawHealthHUD(
      this.localPlayer.hp,
      this.localPlayer.maxHp,
      this.healOverTimeGauge,
      HEAL_OVER_TIME_CONFIG.maxGauge,
      rect.height
    );
    
    // 아이템 사용 인디케이터 (화면 중앙)
    if (this.isUsingItem) {
      const item = this.itemSlots[this.usingItemIndex];
      const itemName = item ? item.name : '';
      this.renderer.drawItemUseIndicator(
        this.getItemUseProgress(),
        itemName,
        rect.width,
        rect.height
      );
    }
    
    // 재장전 인디케이터 (화면 중앙)
    if (this.isReloading) {
      this.renderer.drawReloadIndicator(
        this.getReloadProgress(),
        rect.width,
        rect.height
      );
    }
    
    // HUD: 자기장 상태 (상단 중앙)
    this.renderer.drawZoneHUD(
      this.zone.getCurrentPhase(),
      this.zone.getState(),
      this.zone.getTimeRemaining(),
      rect.width
    );
    
    // HUD: 미니맵 (우측 상단)
    this.renderer.drawMinimap(
      this.localPlayer.x,
      this.localPlayer.y,
      this.zone.getCurrentZone(),
      this.zone.getTargetZone(),
      mapWidth,
      mapHeight,
      rect.width,
      map.tiles,
      map.tileSize
    );
    
    // HUD: 생존자 수 (좌상단)
    this.renderer.drawSurvivorCount(this.getAliveCount(), this.totalPlayerCount);
    
    // HUD: 킬로그 (우측 미니맵 아래)
    this.renderer.drawKillFeed(this.killLogs, rect.width);
    
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
