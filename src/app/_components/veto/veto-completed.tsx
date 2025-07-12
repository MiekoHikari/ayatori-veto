import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { CheckCircle, Clock, Shield, Swords } from 'lucide-react';
import { MAP_DATA } from '~/constants/maps';
import { getMapDisplayName, getTeamDisplayName } from '~/lib/veto-utils';
import { MapCard } from './map-card';
import type { VetoState } from '~/types/veto';

interface VetoCompletedProps {
    vetoState: VetoState;
    teamAName: string | null;
    teamBName: string | null;
}

export const VetoCompleted = ({ vetoState, teamAName, teamBName }: VetoCompletedProps) => {
    return (
        <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Veto Process Complete
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {vetoState.pickedMaps && vetoState.pickedMaps.length > 0 && (
                        <div>
                            <h3 className="font-semibold mb-4 text-lg">Final Map Selection:</h3>
                            <div className="grid gap-4">
                                {vetoState.pickedMaps.map((pick, index) => {
                                    const mapData = MAP_DATA[pick.mapId];
                                    return (
                                        <div key={index} className="relative group">
                                            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg border hover:shadow-md transition-all duration-200">
                                                <div className="relative w-24 h-16 rounded-md overflow-hidden flex-shrink-0">
                                                    <Image
                                                        src={mapData?.image ?? '/maps/placeholder.png'}
                                                        alt={mapData?.name ?? pick.mapId}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-medium text-lg">{getMapDisplayName(pick.mapId)}</span>
                                                        <Badge variant="outline" className="text-xs">
                                                            Map {index + 1}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-sm text-muted-foreground mb-2">
                                                        Picked by {getTeamDisplayName(pick.pickedBy, teamAName, teamBName)}
                                                    </div>
                                                    {pick.attackingTeam && pick.defendingTeam && (
                                                        <div className="flex items-center gap-4 text-xs">
                                                            <div className="flex items-center gap-1 text-red-600">
                                                                <Swords className="w-3 h-3" />
                                                                <span className="font-medium">ATK:</span>
                                                                <span>{getTeamDisplayName(pick.attackingTeam, teamAName, teamBName)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 text-blue-600">
                                                                <Shield className="w-3 h-3" />
                                                                <span className="font-medium">DEF:</span>
                                                                <span>{getTeamDisplayName(pick.defendingTeam, teamAName, teamBName)}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {!pick.attackingTeam && !pick.defendingTeam && pick.side && (
                                                        <div className="text-xs text-muted-foreground">
                                                            Side selection pending...
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    {pick.side && pick.attackingTeam && pick.defendingTeam && (
                                                        <Badge
                                                            variant="default"
                                                            className="flex items-center gap-1 bg-green-600"
                                                        >
                                                            <CheckCircle className="w-3 h-3" />
                                                            Sides Set
                                                        </Badge>
                                                    )}
                                                    {pick.side && (!pick.attackingTeam || !pick.defendingTeam) && (
                                                        <Badge
                                                            variant="outline"
                                                            className="flex items-center gap-1 border-yellow-500 text-yellow-600"
                                                        >
                                                            <Clock className="w-3 h-3" />
                                                            Pending
                                                        </Badge>
                                                    )}
                                                    {!pick.side && (
                                                        <Badge
                                                            variant="outline"
                                                            className="flex items-center gap-1 border-gray-500 text-gray-600"
                                                        >
                                                            <Clock className="w-3 h-3" />
                                                            No Side
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {vetoState.bannedMaps && vetoState.bannedMaps.length > 0 && (
                        <div>
                            <h3 className="font-semibold mb-3">Banned Maps:</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {vetoState.bannedMaps.map((mapId) => (
                                    <div key={mapId}>
                                        <MapCard
                                            mapId={mapId}
                                            showBannedOverlay={true}
                                        />
                                        <p className="text-center text-sm font-medium mt-2">
                                            {getMapDisplayName(mapId)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
