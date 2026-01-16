import type { MessageType, NetworkMessage } from '../types/network.js';

/** 메시지 생성 헬퍼 */
export function createMessage<T>(type: MessageType, payload: T): NetworkMessage<T> {
  return {
    type,
    timestamp: Date.now(),
    payload,
  };
}

/** 메시지 파싱 */
export function parseMessage(data: string): NetworkMessage | null {
  try {
    return JSON.parse(data) as NetworkMessage;
  } catch {
    return null;
  }
}

/** 메시지 직렬화 */
export function serializeMessage(message: NetworkMessage): string {
  return JSON.stringify(message);
}
