export interface VetoAction {
    type: 'ban' | 'pick';
    mapId: string;
    side?: 'attack' | 'defense';
    team: 'team-a' | 'team-b';
    timestamp: string;
}

export interface VetoState {
    actions: VetoAction[];
    availableMaps: string[];
    pickedMaps: Array<{
        mapId: string;
        pickedBy: 'team-a' | 'team-b';
        side?: 'attack' | 'defense';
        attackingTeam?: 'team-a' | 'team-b';
        defendingTeam?: 'team-a' | 'team-b';
    }>;
    bannedMaps: string[];
    vetoSequence: Array<{
        team: 'team-a' | 'team-b';
        action: 'ban' | 'pick';
        completed: boolean;
    }>;
    currentStep: number;
}

export interface VetoProcessProps {
    roomId: string;
    teamRole?: 'team-a' | 'team-b';
    isSpectator?: boolean;
    teamAName: string | null;
    teamBName: string | null;
    roundType?: string;
    onVetoComplete?: () => void;
}

export type TeamType = 'team-a' | 'team-b';
export type ActionType = 'ban' | 'pick';
export type SideType = 'attack' | 'defense';
