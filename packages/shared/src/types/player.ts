/** 플레이어 상태 */
export interface Player {
  id: string;
  name: string;
  x: number;
  y: number;
  rotation: number;
  velocityX: number;
  velocityY: number;
  hp: number;
  maxHp: number;
  isAlive: boolean;
  isBot: boolean;
}

/** 플레이어 입력 */
export interface PlayerInput {
  seq: number;
  timestamp: number;
  moveX: number;  // -1, 0, 1
  moveY: number;  // -1, 0, 1
  rotation: number;
  fire: boolean;
  reload: boolean;
}

/** 방어구 */
export interface Armor {
  type: 'helmet' | 'vest' | 'boots';
  tier: 1 | 2 | 3;
  durability: number;
  maxDurability: number;
}
