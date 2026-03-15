import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import type {
  PlayerRecord,
  RoundRecord,
  RoomLifecycleStore,
  RoomRecord,
} from "../domain/room-lifecycle";

if (getApps().length === 0) {
  initializeApp();
}

export class FirestoreRoomStore implements RoomLifecycleStore {
  private readonly db = getFirestore();

  private roomRef(roomId: string) {
    return this.db.collection("rooms").doc(roomId);
  }

  private playerRef(roomId: string, playerId: string) {
    return this.roomRef(roomId).collection("players").doc(playerId);
  }

  private roundRef(roomId: string, roundIndex: number) {
    return this.roomRef(roomId).collection("rounds").doc(String(roundIndex));
  }

  async createRoom(record: RoomRecord): Promise<boolean> {
    try {
      await this.roomRef(record.roomId).create(record);
      return true;
    } catch (error) {
      if (this.isAlreadyExistsError(error)) {
        return false;
      }
      throw error;
    }
  }

  async getRoom(roomId: string): Promise<RoomRecord | null> {
    const snapshot = await this.roomRef(roomId).get();
    if (!snapshot.exists) {
      return null;
    }
    return snapshot.data() as RoomRecord;
  }

  async updateRoom(roomId: string, patch: Partial<RoomRecord>): Promise<void> {
    await this.roomRef(roomId).set(patch, { merge: true });
  }

  async getRound(roomId: string, roundIndex: number): Promise<RoundRecord | null> {
    const snapshot = await this.roundRef(roomId, roundIndex).get();
    if (!snapshot.exists) {
      return null;
    }
    return snapshot.data() as RoundRecord;
  }

  async setRound(roomId: string, round: RoundRecord): Promise<void> {
    await this.roundRef(roomId, round.roundIndex).set(round);
  }

  async updateRound(
    roomId: string,
    roundIndex: number,
    patch: Partial<RoundRecord>,
  ): Promise<void> {
    await this.roundRef(roomId, roundIndex).set(patch, { merge: true });
  }

  async updateRoundChoice(
    roomId: string,
    roundIndex: number,
    playerId: string,
    side: RoundRecord["choicesByPlayer"][string],
  ): Promise<void> {
    await this.roundRef(roomId, roundIndex).update(
      {
        [`choicesByPlayer.${playerId}`]: side,
      },
    );
  }

  async updateRoundVerdict(
    roomId: string,
    roundIndex: number,
    playerId: string,
    verdict: RoundRecord["verdictsByPlayer"][string],
  ): Promise<void> {
    await this.roundRef(roomId, roundIndex).update(
      {
        [`verdictsByPlayer.${playerId}`]: verdict,
      },
    );
  }

  async getPlayer(roomId: string, playerId: string): Promise<PlayerRecord | null> {
    const snapshot = await this.playerRef(roomId, playerId).get();
    if (!snapshot.exists) {
      return null;
    }
    return snapshot.data() as PlayerRecord;
  }

  async setPlayer(roomId: string, player: PlayerRecord): Promise<void> {
    await this.playerRef(roomId, player.playerId).set(player);
  }

  async listPlayers(roomId: string): Promise<PlayerRecord[]> {
    const snapshot = await this.roomRef(roomId).collection("players").get();
    return snapshot.docs.map((doc) => doc.data() as PlayerRecord);
  }

  async deletePlayer(roomId: string, playerId: string): Promise<void> {
    await this.playerRef(roomId, playerId).delete();
  }

  private isAlreadyExistsError(error: unknown): boolean {
    return Boolean(
      error &&
        typeof error === "object" &&
        "code" in error &&
        (error as { code?: number }).code === 6,
    );
  }
}
