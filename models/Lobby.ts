import { Socket } from 'socket.io';

export interface LobbyPlayer {
  socket: Socket;
  name: string;
  ready: boolean;
}

export default class Lobby {
  public roomId: string;
  public players: Map<string, LobbyPlayer>;

  constructor(roomId: string) {
    this.roomId = roomId;
    this.players = new Map();
  }

  addPlayer(socket: Socket, name: string): void {
    socket.join(this.roomId);
    this.players.set(socket.id, { socket, name, ready: false });
  }

  removePlayer(socketId: string): void {
    this.players.delete(socketId);
  }

  setPlayerReady(socketId: string, ready: boolean): void {
    const player = this.players.get(socketId);
    if (player) {
      player.ready = ready;
    }
  }
}
