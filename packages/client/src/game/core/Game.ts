import { GameLoop } from './GameLoop';
import { Renderer } from './Renderer';
import { Camera } from '../world/Camera';
import { TileMap } from '../world/TileMap';
import { Zone } from '../world/Zone';
import { InputManager, type InputState } from '../input/InputManager';
import { Player } from '../entities/Player';
import { Projectile, generateProjectileId } from '../entities/Projectile';
import { ThrownGrenade, generateGrenadeId } from '../entities/ThrownGrenade';
import { BotAI } from '../ai/BotAI';
import {
  PLAYER_CONFIG,
  RENDER_CONFIG,
  WEAPONS,
  PROJECTILE_CONFIG,
  BotDifficulty,
  USABLE_ITEMS,
  HEAL_OVER_TIME_CONFIG,
  UsableItemType,
  FOV_CONFIG,
  TileType,
  THROWABLES,
  ThrowableType,
  ITEM_SPAWN_CONFIG,
  SPAWN_WEIGHTS,
  SPAWN_WEAPON_POOL,
  SPAWN_AMMO_RANGES,
  ARMOR_ITEMS,
  ARMOR_TIERS,
  ARMOR_TIER_WEIGHTS,
  type SnapshotPayload,
  type WeaponDef,
  type FireMode,
  type UsableItemDef,
  type ThrowableDef,
  type GroundItem,
  type GroundItemKind,
  type Armor,
  type ArmorType,
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

  // 발사 모드 (무기 슬롯별 현재 선택된 모드 인덱스)
  private currentFireModeIndex: number[] = [0, 0, 0];

  // 버스트 상태
  private burstShotsRemaining = 0;
  private lastBurstShotTime = 0;
  private burstWeaponSlot = -1;

  // 6슬롯 인벤토리 시스템
  // 슬롯 0,1: 주무기(primary) / 슬롯 2: 보조무기(secondary)
  // 슬롯 3,4: 치료 아이템 / 슬롯 5: 투척 무기
  private weaponSlots: (WeaponDef | null)[] = [null, null, null]; // 무기 3슬롯
  private currentSlotIndex = 0; // 0-5 전체 슬롯 인덱스

  // 탄약 상태 (무기 슬롯별)
  private ammoInMagazine: number[] = [0, 0, 0];  // 현재 장탄수
  private ammoReserve: Map<string, number> = new Map(); // 탄약 타입별 보유량

  // 재장전 상태
  private isReloading = false;
  private reloadStartTime = 0;
  private reloadDuration = 0;

  // 아이템 슬롯 (4,5번 키 = 인덱스 3,4)
  private itemSlots: (UsableItemDef | null)[] = [null, null];
  private itemCounts: number[] = [0, 0];

  // 투척 슬롯 (6번 키 = 인덱스 5)
  private throwableSlot: ThrowableDef | null = null;
  private throwableCount = 0;

  // 아이템 사용 상태
  private isUsingItem = false;
  private itemUseStartTime = 0;
  private itemUseDuration = 0;
  private usingItemIndex = -1;

  // 지속 회복 게이지
  private healOverTimeGauge = 0;

  // 바닥 아이템
  private groundItems: GroundItem[] = [];

  // 투척 엔티티
  private thrownGrenades: ThrownGrenade[] = [];
  private smokeZones: { x: number; y: number; radius: number; endTime: number }[] = [];
  private explosionEffects: { x: number; y: number; radius: number; time: number }[] = [];

  // 상태
  private isRunning = false;
  private currentFps = 0;
  
  // 데미지 표시
  private damageNumbers: { x: number; y: number; damage: number; time: number }[] = [];
  
  // 킬로그
  private killLogs: { killer: string; victim: string; weapon: string; time: number }[] = [];
  
  // 전체 플레이어 수 (게임 시작 시 고정)
  private totalPlayerCount = 0;

  // 캐시된 캔버스 크기 (매 프레임 getBoundingClientRect 방지)
  private canvasWidth = 0;
  private canvasHeight = 0;
  private readonly isMultiplayerMode: boolean;
  private localServerPlayerId: string | null = null;
  private networkRemotePlayerIds: Set<string> = new Set();
  private multiplayerPhase: 'waiting' | 'countdown' | 'playing' | 'ended' = 'waiting';

  constructor(canvas: HTMLCanvasElement, options: { multiplayer?: boolean } = {}) {
    this.canvas = canvas;
    this.isMultiplayerMode = options.multiplayer ?? false;

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

    // 빈 손 시작 — 무기/아이템/탄약 없음
    this.currentSlotIndex = 0;

    // 바닥 아이템 생성
    this.generateGroundItems();

    if (!this.isMultiplayerMode) {
      // 테스트용 AI 봇 생성
      this.spawnTestEnemies(19);
    } else {
      this.totalPlayerCount = this.players.size;
    }
  }

  /** 멀티플레이 로컬 플레이어 식별 */
  setLocalServerPlayer(playerId: string): void {
    this.localServerPlayerId = playerId;
  }

  /** 멀티플레이 현재 페이즈 반영 */
  setMultiplayerPhase(phase: 'waiting' | 'countdown' | 'playing' | 'ended'): void {
    this.multiplayerPhase = phase;
  }

  /** 서버 스냅샷 적용 (멀티플레이 전용) */
  applyMultiplayerSnapshot(snapshot: SnapshotPayload): void {
    if (!this.isMultiplayerMode) return;

    const activeRemoteIds = new Set<string>();

    for (const snapshotPlayer of snapshot.players) {
      if (snapshotPlayer.id === this.localServerPlayerId) {
        continue;
      }

      const remoteId = `net-${snapshotPlayer.id}`;
      activeRemoteIds.add(remoteId);
      this.networkRemotePlayerIds.add(remoteId);

      let player = this.players.get(remoteId);

      if (!player) {
        player = new Player(remoteId, snapshotPlayer.x, snapshotPlayer.y, false);
        this.players.set(remoteId, player);
      }

      player.isLocalPlayer = false;
      player.isBot = snapshotPlayer.id.startsWith('bot-');
      player.name = snapshotPlayer.name;
      player.setMovement(0, 0);
      player.update(0);
      player.x = snapshotPlayer.x;
      player.y = snapshotPlayer.y;
      player.rotation = snapshotPlayer.rotation;
      player.hp = snapshotPlayer.hp;
      player.isAlive = snapshotPlayer.isAlive;
    }

    for (const playerId of this.networkRemotePlayerIds) {
      if (activeRemoteIds.has(playerId)) continue;
      this.players.delete(playerId);
      this.networkRemotePlayerIds.delete(playerId);
    }
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

      // AI 생성 (빈 손 시작 — 아이템은 바닥에서 주워야 함)
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

    this.canvasWidth = rect.width;
    this.canvasHeight = rect.height;

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

  /** 화면 좌표 기준 조준 각도 계산 (멀티 입력 전송용) */
  getAimRotationFromScreen(screenX: number, screenY: number): number {
    const world = this.camera.screenToWorld(screenX, screenY);
    return Math.atan2(world.y - this.localPlayer.y, world.x - this.localPlayer.x);
  }

  /** 현재 무기 가져오기 (무기 슬롯일 때만) */
  private getCurrentWeapon(): WeaponDef | null {
    if (this.currentSlotIndex > 2) return null;
    return this.weaponSlots[this.currentSlotIndex];
  }

  /** 현재 발사 모드 가져오기 */
  private getCurrentFireMode(): FireMode | null {
    const weapon = this.getCurrentWeapon();
    if (!weapon) return null;
    const modeIndex = this.currentFireModeIndex[this.currentSlotIndex];
    return weapon.fireMode[modeIndex] ?? weapon.fireMode[0];
  }

  /** 발사 모드 전환 */
  private switchFireMode(): void {
    const weapon = this.getCurrentWeapon();
    if (!weapon || weapon.fireMode.length <= 1) return;
    // 버스트 중이면 전환 불가
    if (this.burstShotsRemaining > 0) return;
    const slot = this.currentSlotIndex;
    this.currentFireModeIndex[slot] = (this.currentFireModeIndex[slot] + 1) % weapon.fireMode.length;
  }

  /** 슬롯이 비어있지 않은지 체크 (6슬롯 통합) */
  private isSlotOccupied(index: number): boolean {
    if (index < 3) return this.weaponSlots[index] !== null;
    if (index < 5) return this.itemSlots[index - 3] !== null && this.itemCounts[index - 3] > 0;
    if (index === 5) return this.throwableSlot !== null && this.throwableCount > 0;
    return false;
  }

  /** 무기 슬롯 변경 (휠) */
  private changeWeaponSlot(delta: number): void {
    // 재장전 중이면 무기 변경 불가
    if (this.isReloading) return;
    // 버스트 진행 중이면 무기 변경 불가
    if (this.burstShotsRemaining > 0) return;

    // 다음/이전 슬롯 찾기 (비어있지 않은 슬롯, 6슬롯)
    let newIndex = this.currentSlotIndex;
    const totalSlots = 6;

    for (let i = 0; i < totalSlots; i++) {
      newIndex = (newIndex + delta + totalSlots) % totalSlots;
      if (this.isSlotOccupied(newIndex)) {
        this.currentSlotIndex = newIndex;
        this.lastFireTime = 0;
        this.burstShotsRemaining = 0;
        return;
      }
    }
  }

  /** 무기 슬롯 직접 선택 (숫자 키 1-6) */
  private selectWeaponSlot(slotNumber: number): void {
    // 재장전 중이거나 아이템 사용 중이면 불가
    if (this.isReloading || this.isUsingItem) return;

    const index = slotNumber - 1; // 1-6 -> 0-5

    // 무기 슬롯 (1-3번, 인덱스 0-2)
    if (index >= 0 && index < 3) {
      if (this.weaponSlots[index] !== null) {
        this.currentSlotIndex = index;
        this.lastFireTime = 0;
        this.burstShotsRemaining = 0;
      }
      return;
    }

    // 아이템 슬롯 (4,5번 키 = 인덱스 3,4 -> 아이템 슬롯 0,1)
    if (index === 3 || index === 4) {
      this.startUseItem(index - 3);
      return;
    }

    // 투척 슬롯 (6번 키 = 인덱스 5)
    if (index === 5) {
      if (this.throwableSlot && this.throwableCount > 0) {
        this.currentSlotIndex = 5;
        this.lastFireTime = 0;
        this.burstShotsRemaining = 0;
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
    // 문 애니메이션 업데이트 (죽어도 계속 진행)
    this.tileMap.updateDoorAnimations(dt);

    // 입력 처리
    const input = this.inputManager.getInput();

    if (this.isMultiplayerMode && this.multiplayerPhase !== 'playing') {
      const worldMouseX = input.mouseX + this.camera.x;
      const worldMouseY = input.mouseY + this.camera.y;
      this.localPlayer.lookAt(worldMouseX, worldMouseY);
      return;
    }

    // 플레이어가 죽었으면 대부분의 행동 불가
    if (!this.localPlayer.isAlive) {
      // 죽은 상태에서도 카메라 조준은 가능
      const worldMouseX = input.mouseX + this.camera.x;
      const worldMouseY = input.mouseY + this.camera.y;
      this.localPlayer.lookAt(worldMouseX, worldMouseY);
      
      // 봇 AI/투사체/수류탄/자기장은 계속 업데이트
      this.updateBotAIs(dt);
      for (const player of this.players.values()) {
        player.update(dt);
        if (player.isBot && player.isAlive) {
          this.handlePlayerCollision(player);
        }
      }
      this.updateProjectiles(dt);
      this.updateGrenades(dt);
      this.updateEffects();
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
        
        // 봇 AI/투사체/수류탄/자기장은 계속 업데이트
        this.updateBotAIs(dt);
        for (const player of this.players.values()) {
          player.update(dt);
          if (player.isBot && player.isAlive) {
            this.handlePlayerCollision(player);
          }
        }
        this.updateProjectiles(dt);
        this.updateGrenades(dt);
        this.updateEffects();
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

    // 발사 모드 전환 (B키)
    if (input.fireModeSwitchPressed) {
      this.switchFireMode();
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

    // 상호작용 (아이템 줍기 / 문)
    this.handleInteraction(input);

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

    // 투척 수류탄 업데이트
    this.updateGrenades(dt);

    // 이펙트 정리
    this.updateEffects();

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
        this.localPlayer,
        this.groundItems
      );
      
      // 봇 사격 처리
      if (aiResult.wantsFire) {
        this.fireBotWeapon(bot, aiResult.targetAngle, botAI.getWeaponId());
      }
    }
  }
  
  /** 봇 무기 발사 */
  private fireBotWeapon(bot: Player, angle: number, weaponId: string): void {
    const weapon = WEAPONS[weaponId];
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
    
    // 투사체 생성 (다중 투사체 지원)
    for (let i = 0; i < weapon.projectileCount; i++) {
      let spreadOffset: number;
      if (weapon.projectileCount > 1) {
        const spreadRange = weapon.spreadAngle;
        spreadOffset = -spreadRange / 2 + (spreadRange / (weapon.projectileCount - 1)) * i;
      } else {
        spreadOffset = (Math.random() - 0.5) * weapon.spreadAngle;
      }

      const projectile = new Projectile(
        generateProjectileId(),
        bot.id,
        weapon,
        startX,
        startY,
        angle,
        spreadOffset
      );

      this.projectiles.push(projectile);
    }
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

  /** 상호작용 처리 (E키: 바닥 아이템 줍기 > 문 열기/닫기) */
  private handleInteraction(input: InputState): void {
    if (!input.interactPressed) return;

    // 1순위: 가장 가까운 바닥 아이템 줍기
    const nearestItem = this.getNearestGroundItem();
    if (nearestItem) {
      this.pickupItem(nearestItem);
      return;
    }

    // 2순위: 문 열기/닫기
    const door = this.tileMap.getNearbyDoor(this.localPlayer.x, this.localPlayer.y, 48);
    if (door) this.tileMap.toggleDoor(door.gridX, door.gridY);
  }

  /** 가장 가까운 바닥 아이템 찾기 */
  private getNearestGroundItem(): GroundItem | null {
    const px = this.localPlayer.x;
    const py = this.localPlayer.y;
    const radius = ITEM_SPAWN_CONFIG.pickupRadius;
    let best: GroundItem | null = null;
    let bestDist = radius * radius;

    for (const item of this.groundItems) {
      if (!item.isActive) continue;
      const dx = item.x - px;
      const dy = item.y - py;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDist) {
        bestDist = d2;
        best = item;
      }
    }
    return best;
  }

  /** 바닥 아이템 줍기 */
  private pickupItem(item: GroundItem): void {
    switch (item.kind) {
      case 'weapon': {
        const weapon = WEAPONS[item.itemId];
        if (!weapon) break;

        if (weapon.slot === 'primary') {
          // 주무기: 1번 비면→1번, 1번 차고 2번 비면→2번, 둘 다 차면→현재 선택 슬롯 스왑
          if (this.weaponSlots[0] === null) {
            this.equipWeapon(0, weapon);
          } else if (this.weaponSlots[1] === null) {
            this.equipWeapon(1, weapon);
          } else {
            // 현재 선택이 주무기 슬롯(0,1)이면 그 슬롯, 아니면 0번
            const swapIdx = (this.currentSlotIndex === 0 || this.currentSlotIndex === 1)
              ? this.currentSlotIndex : 0;
            this.dropWeaponToGround(swapIdx, this.localPlayer.x, this.localPlayer.y);
            this.equipWeapon(swapIdx, weapon);
          }
        } else {
          // 보조무기: 3번 비면 장착, 차면 기존 버리고 장착
          if (this.weaponSlots[2] !== null) {
            this.dropWeaponToGround(2, this.localPlayer.x, this.localPlayer.y);
          }
          this.equipWeapon(2, weapon);
        }
        item.isActive = false;
        break;
      }

      case 'ammo': {
        const current = this.ammoReserve.get(item.itemId) ?? 0;
        this.ammoReserve.set(item.itemId, current + item.quantity);
        item.isActive = false;
        break;
      }

      case 'healing': {
        const def = USABLE_ITEMS[item.itemId];
        if (!def) break;

        // 같은 종류 아이템이 있는 슬롯 → 스택
        for (let i = 0; i < 2; i++) {
          if (this.itemSlots[i]?.id === item.itemId) {
            if (this.itemCounts[i] < def.maxStack) {
              this.itemCounts[i] = Math.min(def.maxStack, this.itemCounts[i] + item.quantity);
              item.isActive = false;
              return;
            }
          }
        }
        // 빈 슬롯에 배치
        for (let i = 0; i < 2; i++) {
          if (this.itemSlots[i] === null || this.itemCounts[i] <= 0) {
            this.itemSlots[i] = def;
            this.itemCounts[i] = Math.min(def.maxStack, item.quantity);
            item.isActive = false;
            return;
          }
        }
        break; // 슬롯 꽉 참
      }

      case 'throwable': {
        const def = THROWABLES[item.itemId];
        if (!def) break;

        if (!this.throwableSlot || this.throwableCount <= 0) {
          // 빈 슬롯 → 장착
          this.throwableSlot = def;
          this.throwableCount = Math.min(def.maxStack, item.quantity);
        } else {
          // 차있으면 기존 버리고 새것 장착
          this.dropThrowableToGround(this.localPlayer.x, this.localPlayer.y);
          this.throwableSlot = def;
          this.throwableCount = Math.min(def.maxStack, item.quantity);
        }
        item.isActive = false;
        break;
      }

      case 'armor': {
        const armorDef = ARMOR_ITEMS[item.itemId];
        if (!armorDef) break;
        const newArmor = this.createArmorFromDef(armorDef);
        const slotKey = armorDef.type as 'helmet' | 'vest' | 'boots';
        const current = this.localPlayer[slotKey];

        if (!current) {
          // 빈 슬롯 → 장착
          this.localPlayer[slotKey] = newArmor;
          item.isActive = false;
        } else if (armorDef.tier < current.tier) {
          // 상위 티어(숫자 낮음 = 성능 좋음) → 기존 드랍 후 장착
          this.dropArmorToGround(slotKey, this.localPlayer.x, this.localPlayer.y);
          this.localPlayer[slotKey] = newArmor;
          item.isActive = false;
        } else if (armorDef.tier === current.tier && newArmor.durability > current.durability) {
          // 동일 티어 + 높은 내구도 → 교체
          this.dropArmorToGround(slotKey, this.localPlayer.x, this.localPlayer.y);
          this.localPlayer[slotKey] = newArmor;
          item.isActive = false;
        }
        // 하위 티어 → 무시 (줍지 않음)
        break;
      }
    }
  }

  /** 투척 무기를 바닥에 드랍 */
  private dropThrowableToGround(x: number, y: number): void {
    if (!this.throwableSlot || this.throwableCount <= 0) return;

    this.groundItems.push({
      id: `drop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      x,
      y,
      kind: 'throwable',
      itemId: this.throwableSlot.id,
      quantity: this.throwableCount,
      isActive: true,
    });

    this.throwableSlot = null;
    this.throwableCount = 0;
  }

  /** ArmorItemDef → Armor 인스턴스 생성 */
  private createArmorFromDef(def: { type: ArmorType; tier: 1 | 2 | 3 }): Armor {
    const tierConfig = ARMOR_TIERS[def.tier];
    return {
      type: def.type as Armor['type'],
      tier: def.tier,
      durability: tierConfig.maxDurability,
      maxDurability: tierConfig.maxDurability,
    };
  }

  /** 아머를 바닥에 드랍 */
  private dropArmorToGround(slotKey: 'helmet' | 'vest' | 'boots', x: number, y: number): void {
    const armor = this.localPlayer[slotKey];
    if (!armor) return;
    const itemId = `${armor.type}_t${armor.tier}`;
    this.groundItems.push({
      id: `drop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      x,
      y,
      kind: 'armor',
      itemId,
      quantity: 1,
      isActive: true,
    });
    this.localPlayer[slotKey] = null;
  }

  /** 무기 장착 (슬롯에 배치, 탄창 0발 — 탄약은 별도 줍기) */
  private equipWeapon(slotIndex: number, weapon: WeaponDef): void {
    this.weaponSlots[slotIndex] = weapon;
    this.ammoInMagazine[slotIndex] = 0;
    this.currentFireModeIndex[slotIndex] = 0;

    // 자동으로 해당 슬롯 선택
    this.currentSlotIndex = slotIndex;
    this.lastFireTime = 0;
    this.burstShotsRemaining = 0;
    if (this.isReloading) this.cancelReload();
  }

  /** 무기를 바닥에 드랍 */
  private dropWeaponToGround(slotIndex: number, x: number, y: number): void {
    const weapon = this.weaponSlots[slotIndex];
    if (!weapon) return;

    this.groundItems.push({
      id: `drop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      x,
      y,
      kind: 'weapon',
      itemId: weapon.id,
      quantity: 1,
      isActive: true,
    });

    this.weaponSlots[slotIndex] = null;
    this.ammoInMagazine[slotIndex] = 0;
  }

  /** 발사 처리 */
  private handleFiring(mouseDown: boolean): void {
    // 투척 슬롯이면 투척 처리
    if (this.currentSlotIndex === 5) {
      if (mouseDown && !this.wasMouseDown) {
        this.throwGrenade();
      }
      this.wasMouseDown = mouseDown;
      return;
    }

    // 재장전 중이면 발사 불가 (버스트 진행 중인 경우도 중단)
    if (this.isReloading) {
      this.burstShotsRemaining = 0;
      this.wasMouseDown = mouseDown;
      return;
    }

    const weapon = this.getCurrentWeapon();
    if (!weapon) {
      this.wasMouseDown = mouseDown;
      return;
    }

    const now = performance.now();

    // 버스트 연사 진행 중
    if (this.burstShotsRemaining > 0 && this.burstWeaponSlot === this.currentSlotIndex) {
      const burstInterval = weapon.burstInterval ?? 75;
      if (now - this.lastBurstShotTime >= burstInterval) {
        if (this.ammoInMagazine[this.currentSlotIndex] <= 0) {
          this.burstShotsRemaining = 0;
        } else {
          this.fire();
          this.lastBurstShotTime = now;
          this.burstShotsRemaining--;
          if (this.burstShotsRemaining <= 0) {
            // 버스트 완료 후 쿨다운 시작
            this.lastFireTime = now;
          }
        }
      }
      this.wasMouseDown = mouseDown;
      return;
    }

    // 탄약이 없으면 발사 불가
    if (this.ammoInMagazine[this.currentSlotIndex] <= 0) {
      this.wasMouseDown = mouseDown;
      return;
    }

    const fireInterval = 60000 / weapon.fireRate;
    const canFire = now - this.lastFireTime >= fireInterval;
    const fireMode = this.getCurrentFireMode();

    switch (fireMode) {
      case 'single':
        // 클릭 시작할 때만 1발
        if (mouseDown && !this.wasMouseDown && canFire) {
          this.fire();
          this.lastFireTime = now;
        }
        break;

      case 'burst':
        // 클릭 시작할 때 버스트 시작
        if (mouseDown && !this.wasMouseDown && canFire) {
          const burstCount = weapon.burstCount ?? 3;
          this.fire();
          this.lastBurstShotTime = now;
          this.burstShotsRemaining = burstCount - 1; // 첫 발은 이미 발사
          this.burstWeaponSlot = this.currentSlotIndex;
        }
        break;

      case 'auto':
        // 홀드 시 연속 발사
        if (mouseDown && canFire) {
          this.fire();
          this.lastFireTime = now;
        }
        break;
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

  /** 투척 */
  private throwGrenade(): void {
    if (!this.throwableSlot || this.throwableCount <= 0) return;

    const player = this.localPlayer;
    const muzzleOffset = PLAYER_CONFIG.radius + 10;
    const startX = player.x + Math.cos(player.rotation) * muzzleOffset;
    const startY = player.y + Math.sin(player.rotation) * muzzleOffset;

    const grenade = new ThrownGrenade(
      generateGrenadeId(),
      player.id,
      this.throwableSlot,
      startX,
      startY,
      player.rotation
    );
    this.thrownGrenades.push(grenade);

    this.throwableCount--;
    if (this.throwableCount <= 0) {
      this.throwableSlot = null;
      // 자동으로 이전 무기 슬롯으로 전환
      for (let i = 0; i < 3; i++) {
        if (this.weaponSlots[i] !== null) {
          this.currentSlotIndex = i;
          return;
        }
      }
      this.currentSlotIndex = 0;
    }
  }

  /** 투척 수류탄 업데이트 */
  private updateGrenades(dt: number): void {
    for (let i = this.thrownGrenades.length - 1; i >= 0; i--) {
      const g = this.thrownGrenades[i];
      const prevX = g.x;
      const prevY = g.y;

      g.update(dt);

      // 벽 충돌 → 정지
      if (!this.tileMap.isWalkable(g.x, g.y)) {
        g.x = prevX;
        g.y = prevY;
        g.stop();
      }

      // 폭발 체크
      if (g.shouldExplode()) {
        this.explodeGrenade(g);
        this.thrownGrenades.splice(i, 1);
      }
    }
  }

  /** 수류탄 폭발 처리 */
  private explodeGrenade(g: ThrownGrenade): void {
    const def = g.def;
    const now = performance.now();

    if (def.type === ThrowableType.GRENADE) {
      // 폭발 이펙트
      this.explosionEffects.push({
        x: g.x,
        y: g.y,
        radius: def.explosionRadius,
        time: now,
      });

      // 반경 내 플레이어에 거리 기반 데미지
      for (const player of this.players.values()) {
        if (!player.isAlive) continue;
        const dx = player.x - g.x;
        const dy = player.y - g.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < def.explosionRadius) {
          const ratio = 1 - dist / def.explosionRadius;
          const damage = Math.floor(def.damage * ratio);
          if (damage > 0) {
            const wasAlive = player.isAlive;
            const actualDamage = player.takeDamageWithArmor(damage);

            this.damageNumbers.push({
              x: player.x,
              y: player.y - PLAYER_CONFIG.radius - 10,
              damage: actualDamage,
              time: now,
            });

            if (wasAlive && !player.isAlive) {
              const killer = this.players.get(g.ownerId);
              this.killLogs.push({
                killer: killer ? killer.name : 'Unknown',
                victim: player.name,
                weapon: def.name,
                time: now,
              });
            }
          }
        }
      }
    } else if (def.type === ThrowableType.SMOKE_GRENADE) {
      // 연막 구역 추가 (8초 지속)
      this.smokeZones.push({
        x: g.x,
        y: g.y,
        radius: def.explosionRadius,
        endTime: now + 8000,
      });
    }
  }

  /** 연막/폭발 이펙트 정리 */
  private updateEffects(): void {
    const now = performance.now();
    // 연막 만료 제거
    for (let i = this.smokeZones.length - 1; i >= 0; i--) {
      if (now >= this.smokeZones[i].endTime) {
        this.smokeZones.splice(i, 1);
      }
    }
    // 폭발 이펙트 제거 (300ms 후)
    for (let i = this.explosionEffects.length - 1; i >= 0; i--) {
      if (now - this.explosionEffects[i].time > 300) {
        this.explosionEffects.splice(i, 1);
      }
    }
  }

  /** 바닥 아이템 생성 (맵 FLOOR 타일 기반) */
  private generateGroundItems(): void {
    const map = this.tileMap.getMap();
    const tileSize = map.tileSize;
    let itemIdCounter = 0;

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        if (map.tiles[y][x] !== TileType.FLOOR) continue;

        // 문 앞에는 아이템 배치 금지
        if (this.hasAdjacentTile(map, x, y, TileType.DOOR)) continue;

        // 인접 WALL 체크 → 실내 여부
        const hasAdjacentWall = this.hasAdjacentTile(map, x, y, TileType.WALL);
        const chance = hasAdjacentWall
          ? ITEM_SPAWN_CONFIG.spawnChance
          : ITEM_SPAWN_CONFIG.spawnChance * ITEM_SPAWN_CONFIG.outdoorMultiplier;

        if (Math.random() > chance) continue;

        // 가중치 기반 종류 선택
        const kind = this.pickWeightedKind();
        const worldX = x * tileSize + tileSize / 2;
        const worldY = y * tileSize + tileSize / 2;

        const groundItem = this.createGroundItem(
          `item-${itemIdCounter++}`,
          worldX,
          worldY,
          kind
        );
        if (groundItem) {
          this.groundItems.push(groundItem);

          // 무기 옆에 해당 탄약 추가 배치 (2~4개)
          if (kind === 'weapon') {
            const weapon = WEAPONS[groundItem.itemId];
            if (weapon) {
              const ammoCount = 2 + Math.floor(Math.random() * 3); // 2~4개
              for (let a = 0; a < ammoCount; a++) {
                const ammoPos = this.findNearbyFloor(map, x, y);
                if (ammoPos && !this.hasAdjacentTile(map, ammoPos.x, ammoPos.y, TileType.DOOR)) {
                  const ax = ammoPos.x * tileSize + tileSize / 2;
                  const ay = ammoPos.y * tileSize + tileSize / 2;
                  const range = SPAWN_AMMO_RANGES[weapon.ammoType];
                  const qty = range
                    ? range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1))
                    : 15;
                  this.groundItems.push({
                    id: `item-${itemIdCounter++}`,
                    x: ax,
                    y: ay,
                    kind: 'ammo',
                    itemId: weapon.ammoType,
                    quantity: qty,
                    isActive: true,
                  });
                }
              }
            }
          }
        }
      }
    }
  }

  /** 주변 FLOOR 타일 찾기 (랜덤 인접) */
  private findNearbyFloor(
    map: { width: number; height: number; tiles: number[][] },
    cx: number,
    cy: number
  ): { x: number; y: number } | null {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
    // 셔플
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx > 0 && nx < map.width - 1 && ny > 0 && ny < map.height - 1) {
        if (map.tiles[ny][nx] === TileType.FLOOR) {
          return { x: nx, y: ny };
        }
      }
    }
    return null;
  }

  /** 근처 바닥 무기의 탄약 타입 반환 */
  private findNearbyWeaponAmmoType(x: number, y: number, radius: number): string | null {
    for (const item of this.groundItems) {
      if (!item.isActive || item.kind !== 'weapon') continue;
      const dx = item.x - x;
      const dy = item.y - y;
      if (dx * dx + dy * dy <= radius * radius) {
        const weapon = WEAPONS[item.itemId];
        if (weapon) return weapon.ammoType;
      }
    }
    return null;
  }

  /** 인접 타일 존재 여부 */
  private hasAdjacentTile(
    map: { width: number; height: number; tiles: number[][] },
    x: number,
    y: number,
    tileType: number
  ): boolean {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < map.width && ny >= 0 && ny < map.height) {
        if (map.tiles[ny][nx] === tileType) return true;
      }
    }
    return false;
  }

  /** 가중치 기반 아이템 종류 선택 */
  private pickWeightedKind(): GroundItemKind {
    const total = SPAWN_WEIGHTS.weapon + SPAWN_WEIGHTS.ammo + SPAWN_WEIGHTS.healing + SPAWN_WEIGHTS.throwable + SPAWN_WEIGHTS.armor;
    const r = Math.random() * total;
    let cum = 0;
    cum += SPAWN_WEIGHTS.weapon;  if (r < cum) return 'weapon';
    cum += SPAWN_WEIGHTS.ammo;    if (r < cum) return 'ammo';
    cum += SPAWN_WEIGHTS.healing; if (r < cum) return 'healing';
    cum += SPAWN_WEIGHTS.throwable; if (r < cum) return 'throwable';
    return 'armor';
  }

  /** 바닥 아이템 생성 */
  private createGroundItem(id: string, x: number, y: number, kind: GroundItemKind): GroundItem | null {
    switch (kind) {
      case 'weapon': {
        const weaponId = SPAWN_WEAPON_POOL[Math.floor(Math.random() * SPAWN_WEAPON_POOL.length)];
        return { id, x, y, kind, itemId: weaponId, quantity: 1, isActive: true };
      }
      case 'ammo': {
        let ammoType: string;
        // 근처(96px) 무기가 있으면 70% 확률로 해당 무기 탄약 배치
        const nearbyWeapon = this.findNearbyWeaponAmmoType(x, y, 96);
        if (nearbyWeapon && Math.random() < 0.7) {
          ammoType = nearbyWeapon;
        } else {
          const ammoTypes = Object.keys(SPAWN_AMMO_RANGES);
          ammoType = ammoTypes[Math.floor(Math.random() * ammoTypes.length)];
        }
        const range = SPAWN_AMMO_RANGES[ammoType];
        const [min, max] = range ?? [10, 20];
        const qty = min + Math.floor(Math.random() * (max - min + 1));
        return { id, x, y, kind, itemId: ammoType, quantity: qty, isActive: true };
      }
      case 'healing': {
        const items = Object.keys(USABLE_ITEMS);
        const itemId = items[Math.floor(Math.random() * items.length)];
        return { id, x, y, kind, itemId, quantity: 1, isActive: true };
      }
      case 'throwable': {
        const throwables = Object.keys(THROWABLES);
        const throwableId = throwables[Math.floor(Math.random() * throwables.length)];
        return { id, x, y, kind, itemId: throwableId, quantity: 1, isActive: true };
      }
      case 'armor': {
        const tier = this.pickArmorTier();
        const types: ArmorType[] = ['helmet', 'vest', 'boots'];
        const armorType = types[Math.floor(Math.random() * types.length)];
        const itemId = `${armorType}_t${tier}`;
        return { id, x, y, kind, itemId, quantity: 1, isActive: true };
      }
    }
  }

  /** 아머 티어 가중치 기반 선택 */
  private pickArmorTier(): 1 | 2 | 3 {
    const total = ARMOR_TIER_WEIGHTS[1] + ARMOR_TIER_WEIGHTS[2] + ARMOR_TIER_WEIGHTS[3];
    const r = Math.random() * total;
    if (r < ARMOR_TIER_WEIGHTS[1]) return 1;
    if (r < ARMOR_TIER_WEIGHTS[1] + ARMOR_TIER_WEIGHTS[2]) return 2;
    return 3;
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
        // 데미지 적용 (아머 경감 포함)
        const weapon = WEAPONS[proj.weaponId];
        const rawDamage = weapon
          ? Math.floor(proj.damage * proj.getDamageMultiplier(weapon))
          : proj.damage;

        const wasAlive = hitPlayer.isAlive;
        const actualDamage = hitPlayer.takeDamageWithArmor(rawDamage, proj.distanceTraveled);

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
          damage: actualDamage,
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
    const viewW = this.canvasWidth;
    const viewH = this.canvasHeight;
    const map = this.tileMap.getMap();
    const mapWidth = this.tileMap.getPixelWidth();
    const mapHeight = this.tileMap.getPixelHeight();

    // 카메라 업데이트 (렌더링 단계에서 보간된 위치 따라가기)
    this.camera.updateSmooth(alpha);
    this.camera.clampToMap(mapWidth, mapHeight);

    // 배경 클리어
    this.renderer.clear(viewW, viewH);
    
    // 카메라 변환 적용
    this.renderer.beginCamera(this.camera);
    
    // 타일맵 그리기
    this.renderer.drawTileMap(
      map, this.camera, viewW, viewH,
      (gx, gy) => this.tileMap.getDoorOpacity(gx, gy)
    );

    // 바닥 아이템 그리기
    this.renderer.drawGroundItems(this.groundItems, this.camera, viewW, viewH);

    // 상호작용 프롬프트 (아이템 줍기 > 문)
    if (this.localPlayer.isAlive) {
      const nearestItem = this.getNearestGroundItem();
      if (nearestItem) {
        this.renderer.drawPickupPrompt(nearestItem);
      } else {
        const nearbyDoor = this.tileMap.getNearbyDoor(this.localPlayer.x, this.localPlayer.y, 48);
        if (nearbyDoor) {
          this.renderer.drawDoorPrompt(
            nearbyDoor.gridX,
            nearbyDoor.gridY,
            map.tileSize,
            this.tileMap.isDoorOpen(nearbyDoor.gridX, nearbyDoor.gridY)
          );
        }
      }
    }

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

    // 투척 수류탄 그리기
    for (const g of this.thrownGrenades) {
      this.renderer.drawThrownGrenade(g, alpha);
    }

    // 폭발 이펙트 그리기
    this.renderer.drawExplosions(this.explosionEffects);

    // 연막 구역 그리기
    this.renderer.drawSmokeZones(this.smokeZones);

    // 시야(FOV) 계산 (플레이어 가시성 체크용)
    const playerPos = this.localPlayer.getInterpolatedPosition(alpha);
    const playerRot = this.localPlayer.getInterpolatedRotation(alpha);
    const visionPoints = this.calculateFOV(playerPos.x, playerPos.y, playerRot);
    
    // 플레이어들 그리기 (시야 안에 있는 플레이어만)
    for (const player of this.players.values()) {
      // 로컬 플레이어는 항상 표시
      if (player.id === this.localPlayer.id) {
        this.renderer.drawPlayer(player, alpha);
        continue;
      }
      
      // 다른 플레이어는 시야 안에 있을 때만 표시
      const otherPos = player.getInterpolatedPosition(alpha);
      if (this.isInFOV(playerPos.x, playerPos.y, playerRot, otherPos.x, otherPos.y)) {
        this.renderer.drawPlayer(player, alpha);
      }
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
    
    // 시야(FOV) 그리기 - 시야 밖 영역 어둡게
    this.renderer.drawFOV(
      playerPos.x,
      playerPos.y,
      playerRot,
      visionPoints,
      viewW,
      viewH
    );

    // 자기장 다시 그리기 (FOV 위에, 더 밝게)
    this.renderer.drawZoneOverFOV(
      this.zone.getCurrentZone(),
      this.zone.getTargetZone(),
      mapWidth,
      mapHeight
    );

    // 카메라 변환 해제
    this.renderer.endCamera();

    // HUD: 무기/아이템/투척 슬롯 (하단 중앙, 6슬롯)
    this.renderer.drawWeaponSlots(
      this.weaponSlots,
      this.itemSlots,
      this.itemCounts,
      this.throwableSlot,
      this.throwableCount,
      this.currentSlotIndex,
      viewW / 2,
      viewH - 80
    );

    // HUD: 우측 하단 무기/투척 상태
    if (this.currentSlotIndex === 5 && this.throwableSlot) {
      this.renderer.drawThrowableStatus(
        this.throwableSlot,
        this.throwableCount,
        viewW,
        viewH
      );
    } else {
      const currentWeapon = this.getCurrentWeapon();
      const currentAmmo = this.currentSlotIndex < 3 ? this.ammoInMagazine[this.currentSlotIndex] : 0;
      const reserveAmmo = currentWeapon
        ? (this.ammoReserve.get(currentWeapon.ammoType) ?? 0)
        : 0;
      const currentFireMode = this.getCurrentFireMode();
      this.renderer.drawWeaponStatus(
        currentWeapon,
        currentAmmo,
        reserveAmmo,
        viewW,
        viewH,
        currentFireMode
      );
    }

    // HUD: 좌하단 체력/회복 게이지
    this.renderer.drawHealthHUD(
      this.localPlayer.hp,
      this.localPlayer.maxHp,
      this.healOverTimeGauge,
      HEAL_OVER_TIME_CONFIG.maxGauge,
      viewH
    );

    // HUD: 좌하단 아머 표시 (체력 위)
    this.renderer.drawArmorHUD(
      this.localPlayer.helmet,
      this.localPlayer.vest,
      this.localPlayer.boots,
      viewH
    );

    // 아이템 사용 인디케이터 (화면 중앙)
    if (this.isUsingItem) {
      const item = this.itemSlots[this.usingItemIndex];
      const itemName = item ? item.name : '';
      this.renderer.drawItemUseIndicator(
        this.getItemUseProgress(),
        itemName,
        viewW,
        viewH
      );
    }

    // 재장전 인디케이터 (화면 중앙)
    if (this.isReloading) {
      this.renderer.drawReloadIndicator(
        this.getReloadProgress(),
        viewW,
        viewH
      );
    }

    // HUD: 자기장 상태 (상단 중앙)
    this.renderer.drawZoneHUD(
      this.zone.getCurrentPhase(),
      this.zone.getState(),
      this.zone.getTimeRemaining(),
      viewW
    );

    // HUD: 미니맵 (우측 상단)
    this.renderer.drawMinimap(
      this.localPlayer.x,
      this.localPlayer.y,
      this.zone.getCurrentZone(),
      this.zone.getTargetZone(),
      mapWidth,
      mapHeight,
      viewW,
      map.tiles,
      map.tileSize
    );

    // HUD: 생존자 수 (좌상단)
    this.renderer.drawSurvivorCount(this.getAliveCount(), this.totalPlayerCount);

    // HUD: 킬로그 (우측 미니맵 아래)
    this.renderer.drawKillFeed(this.killLogs, viewW);

    // HUD: FPS (좌상단)
    this.currentFps = this.gameLoop.getCurrentFps();
    this.renderer.drawFps(this.currentFps);
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

  /**
   * FOV 계산 - 레이캐스팅으로 시야 영역 계산
   * @returns 시야 영역의 끝점들 (다각형 형태)
   */
  private calculateFOV(
    playerX: number,
    playerY: number,
    rotation: number
  ): { x: number; y: number }[] {
    const { fovAngle, viewDistance, rayCount } = FOV_CONFIG;
    const halfFov = fovAngle / 2;
    const startAngle = rotation - halfFov;
    const angleStep = fovAngle / rayCount;
    
    const points: { x: number; y: number }[] = [];
    
    for (let i = 0; i <= rayCount; i++) {
      const angle = startAngle + angleStep * i;
      const result = this.tileMap.castVisionRay(
        playerX,
        playerY,
        angle,
        viewDistance
      );
      points.push({ x: result.x, y: result.y });
    }
    
    return points;
  }

  /**
   * 대상이 플레이어의 시야 안에 있는지 확인
   * 각도 + 거리 + 벽 차단 체크
   */
  private isInFOV(
    playerX: number,
    playerY: number,
    playerRot: number,
    targetX: number,
    targetY: number
  ): boolean {
    const { fovAngle, viewDistance } = FOV_CONFIG;
    const halfFov = fovAngle / 2;
    
    // 거리 체크
    const dx = targetX - playerX;
    const dy = targetY - playerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > viewDistance) {
      return false;
    }
    
    // 각도 체크
    const angleToTarget = Math.atan2(dy, dx);
    let angleDiff = angleToTarget - playerRot;
    
    // 각도 정규화 (-π ~ π)
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    
    if (Math.abs(angleDiff) > halfFov) {
      return false;
    }
    
    // 벽 차단 체크 (레이캐스팅)
    const result = this.tileMap.castVisionRay(
      playerX,
      playerY,
      angleToTarget,
      distance
    );
    
    // 벽에 먼저 도달하면 시야에서 안 보임
    if (result.distance < distance - 10) return false;

    // 연막 차단 체크 — 시선이 연막 구역을 통과하면 안 보임
    for (const smoke of this.smokeZones) {
      if (this.lineIntersectsCircle(playerX, playerY, targetX, targetY, smoke.x, smoke.y, smoke.radius)) {
        return false;
      }
    }

    return true;
  }

  /** 선분-원 교차 체크 */
  private lineIntersectsCircle(
    x1: number, y1: number,
    x2: number, y2: number,
    cx: number, cy: number,
    r: number
  ): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const fx = x1 - cx;
    const fy = y1 - cy;

    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - r * r;

    let discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return false;

    discriminant = Math.sqrt(discriminant);
    const t1 = (-b - discriminant) / (2 * a);
    const t2 = (-b + discriminant) / (2 * a);

    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1);
  }
}
