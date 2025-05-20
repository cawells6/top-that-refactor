import { Socket } from 'socket.io-client';
export declare const socket: Socket;
export declare let myId: string | null;
export declare let currentRoom: string | null;
export declare let pileTransition: boolean;
export declare let specialEffectsQueue: any[];
export declare let processingEffects: boolean;
export declare const stateHistory: any[];
export declare let stateIndex: number;
export declare function loadSession(): void;
export declare function saveSession(): void;
export declare function setMyId(id: string | null): void;
export declare function setCurrentRoom(room: string | null): void;
export declare function setPileTransition(value: boolean): void;
export declare function setProcessingEffects(value: boolean): void;
export declare function addSpecialEffect(effect: any): void;
export declare function clearSpecialEffects(): void;
export declare function setStateIndex(index: number): void;
//# sourceMappingURL=state.d.ts.map