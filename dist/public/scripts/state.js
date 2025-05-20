// public/scripts/state.ts
import { io } from 'socket.io-client'; // Corrected import quote style
export const socket = io({
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
});
export let myId = null;
export let currentRoom = null;
export let pileTransition = false;
export let specialEffectsQueue = []; // Consider defining a type for effects
export let processingEffects = false;
export const stateHistory = []; // Consider defining a type for state history items
export let stateIndex = -1;
export function loadSession() {
    setMyId(sessionStorage.getItem('myId'));
    setCurrentRoom(sessionStorage.getItem('currentRoom'));
}
export function saveSession() {
    if (myId)
        sessionStorage.setItem('myId', myId);
    if (currentRoom)
        sessionStorage.setItem('currentRoom', currentRoom);
}
export function setMyId(id) {
    myId = id;
}
export function setCurrentRoom(room) {
    currentRoom = room;
}
export function setPileTransition(value) {
    pileTransition = value;
}
export function setProcessingEffects(value) {
    processingEffects = value;
}
export function addSpecialEffect(effect) {
    specialEffectsQueue.push(effect);
}
export function clearSpecialEffects() {
    specialEffectsQueue = [];
}
export function setStateIndex(index) {
    stateIndex = index;
}
