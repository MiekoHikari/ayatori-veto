export interface VetoAction {
    type: 'ban' | 'pick' | 'side';
    mapId?: string; // Optional for side actions, which may not be associated with a specific map initially
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
        action: 'ban' | 'pick' | 'side';
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
export type ActionType = 'ban' | 'pick' | 'side';
export type SideType = 'attack' | 'defense';
