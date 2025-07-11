export interface RoomData {
    id: string;
    teamAId: string;
    teamBId: string;
    teamALink: string;
    teamBLink: string;
    spectatorLink: string;
    createdAt: string;
    expiresAt: string;
    maps: string[];
    roundType: string;
    teamAReady: boolean;
    teamBReady: boolean;
    teamAName?: string | null;
    teamBName?: string | null;
    status: 'waiting' | 'active' | 'completed' | 'expired';
    masterRoomId?: string;
    teamRole?: 'team-a' | 'team-b';
    vetoStarted?: boolean;
    vetoCompleted?: boolean;
    currentTurn?: string | null;
    vetoState?: unknown;
}
