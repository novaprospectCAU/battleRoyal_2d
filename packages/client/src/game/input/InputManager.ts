/**
 * 현재 입력 상태
 */
export interface InputState {
  keys: Set<string>;
  mouseX: number;
  mouseY: number;
  mouseDown: boolean;
  /** 무기 슬롯 변경 (-1: 이전, 0: 없음, 1: 다음) */
  weaponScrollDelta: number;
  /** 숫자 키로 선택한 슬롯 (1-5, 없으면 0) */
  weaponSlotKey: number;
  /** 재장전 키 (R) 눌림 */
  reloadPressed: boolean;
  /** 아이템 사용 취소 키 (F) 눌림 */
  cancelItemPressed: boolean;
  /** 상호작용 키 (E) 눌림 */
  interactPressed: boolean;
  /** 발사 모드 전환 키 (B) 눌림 */
  fireModeSwitchPressed: boolean;
}

/**
 * 입력 관리자
 * 키보드와 마우스 입력을 관리합니다.
 */
export class InputManager {
  private canvas: HTMLCanvasElement;
  
  private keys = new Set<string>();
  private mouseX = 0;
  private mouseY = 0;
  private mouseDown = false;
  
  // 무기 선택
  private weaponScrollDelta = 0;
  private weaponSlotKey = 0;
  
  // 재장전
  private reloadPressed = false;
  
  // 아이템 사용 취소
  private cancelItemPressed = false;

  // 상호작용
  private interactPressed = false;

  // 발사 모드 전환
  private fireModeSwitchPressed = false;

  private boundHandlers = {
    keydown: this.handleKeyDown.bind(this),
    keyup: this.handleKeyUp.bind(this),
    mousemove: this.handleMouseMove.bind(this),
    mousedown: this.handleMouseDown.bind(this),
    mouseup: this.handleMouseUp.bind(this),
    contextmenu: this.handleContextMenu.bind(this),
    blur: this.handleBlur.bind(this),
    wheel: this.handleWheel.bind(this),
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  /** 입력 리스너 시작 */
  start(): void {
    // 키보드는 window에서
    window.addEventListener('keydown', this.boundHandlers.keydown);
    window.addEventListener('keyup', this.boundHandlers.keyup);
    window.addEventListener('blur', this.boundHandlers.blur);
    
    // 마우스는 canvas에서
    this.canvas.addEventListener('mousemove', this.boundHandlers.mousemove);
    this.canvas.addEventListener('mousedown', this.boundHandlers.mousedown);
    this.canvas.addEventListener('mouseup', this.boundHandlers.mouseup);
    this.canvas.addEventListener('contextmenu', this.boundHandlers.contextmenu);
    this.canvas.addEventListener('wheel', this.boundHandlers.wheel, { passive: false });
    
    // 캔버스 포커스
    this.canvas.focus();
  }

  /** 입력 리스너 중지 */
  stop(): void {
    window.removeEventListener('keydown', this.boundHandlers.keydown);
    window.removeEventListener('keyup', this.boundHandlers.keyup);
    window.removeEventListener('blur', this.boundHandlers.blur);
    
    this.canvas.removeEventListener('mousemove', this.boundHandlers.mousemove);
    this.canvas.removeEventListener('mousedown', this.boundHandlers.mousedown);
    this.canvas.removeEventListener('mouseup', this.boundHandlers.mouseup);
    this.canvas.removeEventListener('contextmenu', this.boundHandlers.contextmenu);
    this.canvas.removeEventListener('wheel', this.boundHandlers.wheel);
  }

  /** 정리 */
  destroy(): void {
    this.stop();
    this.keys.clear();
  }

  /** 현재 입력 상태 가져오기 */
  getInput(): InputState {
    const state: InputState = {
      keys: new Set(this.keys),
      mouseX: this.mouseX,
      mouseY: this.mouseY,
      mouseDown: this.mouseDown,
      weaponScrollDelta: this.weaponScrollDelta,
      weaponSlotKey: this.weaponSlotKey,
      reloadPressed: this.reloadPressed,
      cancelItemPressed: this.cancelItemPressed,
      interactPressed: this.interactPressed,
      fireModeSwitchPressed: this.fireModeSwitchPressed,
    };

    // 한 번 읽으면 리셋
    this.weaponScrollDelta = 0;
    this.weaponSlotKey = 0;
    this.reloadPressed = false;
    this.cancelItemPressed = false;
    this.interactPressed = false;
    this.fireModeSwitchPressed = false;
    
    return state;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // 브라우저 기본 동작 방지 (WASD, 화살표, 스페이스, 숫자, R, F)
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', '1', '2', '3', '4', '5', 'r', 'f', 'e', 'b'].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
    
    // 숫자 키 처리 (1-5)
    if (e.key >= '1' && e.key <= '5') {
      this.weaponSlotKey = parseInt(e.key);
    }
    
    // 재장전 키 (R)
    if (e.key.toLowerCase() === 'r') {
      this.reloadPressed = true;
    }
    
    // 아이템 사용 취소 키 (F)
    if (e.key.toLowerCase() === 'f') {
      this.cancelItemPressed = true;
    }

    // 상호작용 키 (E)
    if (e.key.toLowerCase() === 'e') {
      this.interactPressed = true;
    }

    // 발사 모드 전환 키 (B)
    if (e.key.toLowerCase() === 'b') {
      this.fireModeSwitchPressed = true;
    }

    this.keys.add(e.key.toLowerCase());
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.key.toLowerCase());
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this.mouseDown = true;
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (e.button === 0) {
      this.mouseDown = false;
    }
  }

  private handleContextMenu(e: MouseEvent): void {
    e.preventDefault();
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    // deltaY > 0: 아래로 스크롤 (다음 무기)
    // deltaY < 0: 위로 스크롤 (이전 무기)
    this.weaponScrollDelta = e.deltaY > 0 ? 1 : -1;
  }

  private handleBlur(): void {
    // 창 포커스 잃으면 모든 키 해제
    this.keys.clear();
    this.mouseDown = false;
  }
}
