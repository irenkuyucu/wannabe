import { HttpsError } from "firebase-functions/v2/https";

import type {
  PlayerRecord,
  RoundRecord,
  RoomLifecycleStore,
  RoomRecord,
} from "../src/domain/room-lifecycle";

export class InMemoryRoomStore implements RoomLifecycleStore {
  private readonly rooms = new Map<string, RoomRecord>();
  private readonly rounds = new Map<string, Map<number, RoundRecord>>();
  private readonly players = new Map<string, Map<string, PlayerRecord>>();

  async createRoom(record: RoomRecord): Promise<boolean> {
    if (this.rooms.has(record.roomId)) {
      return false;
    }

    this.rooms.set(record.roomId, { ...record });
    return true;
  }

  async getRoom(roomId: string): Promise<RoomRecord | null> {
    const room = this.rooms.get(roomId);
    return room ? { ...room } : null;
  }

  async updateRoom(roomId: string, patch: Partial<RoomRecord>): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    this.rooms.set(roomId, { ...room, ...patch });
  }

  async getRound(roomId: string, roundIndex: number): Promise<RoundRecord | null> {
    const round = this.rounds.get(roomId)?.get(roundIndex);
    return round ? { ...round } : null;
  }

  async setRound(roomId: string, round: RoundRecord): Promise<void> {
    const roomRounds = this.rounds.get(roomId) ?? new Map<number, RoundRecord>();
    roomRounds.set(round.roundIndex, { ...round });
    this.rounds.set(roomId, roomRounds);
  }

  async updateRound(
    roomId: string,
    roundIndex: number,
    patch: Partial<RoundRecord>,
  ): Promise<void> {
    const roomRounds = this.rounds.get(roomId);
    const round = roomRounds?.get(roundIndex);
    if (!roomRounds || !round) {
      return;
    }

    roomRounds.set(roundIndex, { ...round, ...patch });
  }

  async updateRoundChoice(
    roomId: string,
    roundIndex: number,
    playerId: string,
    side: RoundRecord["choicesByPlayer"][string],
  ): Promise<void> {
    const roomRounds = this.rounds.get(roomId);
    const round = roomRounds?.get(roundIndex);
    if (!roomRounds || !round) {
      return;
    }

    roomRounds.set(roundIndex, {
      ...round,
      choicesByPlayer: {
        ...round.choicesByPlayer,
        [playerId]: side,
      },
    });
  }

  async updateRoundVerdict(
    roomId: string,
    roundIndex: number,
    playerId: string,
    verdict: RoundRecord["verdictsByPlayer"][string],
  ): Promise<void> {
    const roomRounds = this.rounds.get(roomId);
    const round = roomRounds?.get(roundIndex);
    if (!roomRounds || !round) {
      return;
    }

    roomRounds.set(roundIndex, {
      ...round,
      verdictsByPlayer: {
        ...round.verdictsByPlayer,
        [playerId]: verdict,
      },
    });
  }

  async getPlayer(roomId: string, playerId: string): Promise<PlayerRecord | null> {
    const roomPlayers = this.players.get(roomId);
    const player = roomPlayers?.get(playerId);
    return player ? { ...player } : null;
  }

  async setPlayer(roomId: string, player: PlayerRecord): Promise<void> {
    const roomPlayers = this.players.get(roomId) ?? new Map<string, PlayerRecord>();
    roomPlayers.set(player.playerId, { ...player });
    this.players.set(roomId, roomPlayers);
  }

  async listPlayers(roomId: string): Promise<PlayerRecord[]> {
    const roomPlayers = this.players.get(roomId);
    if (!roomPlayers) {
      return [];
    }

    return [...roomPlayers.values()].map((player) => ({ ...player }));
  }

  async deletePlayer(roomId: string, playerId: string): Promise<void> {
    this.players.get(roomId)?.delete(playerId);
  }
}

export function assertHttpsErrorCode(error: unknown, code: HttpsError["code"]): boolean {
  return error instanceof HttpsError && error.code === code;
}
