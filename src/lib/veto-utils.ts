import { getMapName } from '~/constants/maps';
import type { TeamType } from '~/types/veto';

export const getMapDisplayName = (mapId: string): string => {
    return getMapName(mapId);
};

export const getTeamDisplayName = (
    team: TeamType,
    teamAName: string | null,
    teamBName: string | null
): string => {
    return team === 'team-a' ? (teamAName ?? 'Team A') : (teamBName ?? 'Team B');
};

export const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString();
};
