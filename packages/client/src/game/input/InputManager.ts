/**
 * 현재 입력 상태
 */
export interface InputState {
  keys: Set<string>;
  mouseX: number;
  mouseY: number;
  mouseDown: boolean;
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
  
  private boundHandlers = {
    keydown: this.handleKeyDown.bind(this),
    keyup: this.handleKeyUp.bind(this),
    mousemove: this.handleMouseMove.bind(this),
    mousedown: this.handleMouseDown.bind(this),
    mouseup: this.handleMouseUp.bind(this),
    contextmenu: this.handleContextMenu.bind(this),
    blur: this.handleBlur.bind(this),
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
  }

  /** 정리 */
  destroy(): void {
    this.stop();
    this.keys.clear();
  }

  /** 현재 입력 상태 가져오기 */
  getInput(): InputState {
    return {
      keys: new Set(this.keys),
      mouseX: this.mouseX,
      mouseY: this.mouseY,
      mouseDown: this.mouseDown,
    };
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // 브라우저 기본 동작 방지 (WASD, 화살표, 스페이스)
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
      e.preventDefault();
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

  private handleBlur(): void {
    // 창 포커스 잃으면 모든 키 해제
    this.keys.clear();
    this.mouseDown = false;
  }
}
