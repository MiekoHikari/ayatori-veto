'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Clock, Ban, Target, CheckCircle, Swords } from 'lucide-react';
import { api } from '~/trpc/react';

interface VetoAction {
    type: 'ban' | 'pick';
    mapId: string;
    side?: 'attack' | 'defense';
    team: 'team-a' | 'team-b';
    timestamp: string;
}

interface VetoState {
    actions: VetoAction[];
    availableMaps: string[];
    pickedMaps: Array<{
        mapId: string;
        pickedBy: 'team-a' | 'team-b';
        side?: 'attack' | 'defense';
    }>;
    bannedMaps: string[];
    vetoSequence: Array<{
        team: 'team-a' | 'team-b';
        action: 'ban' | 'pick';
        completed: boolean;
    }>;
    currentStep: number;
}

interface VetoProcessProps {
    roomId: string;
    teamRole?: 'team-a' | 'team-b';
    isSpectator?: boolean;
    teamAName: string | null;
    teamBName: string | null;
    onVetoComplete?: () => void;
}

const MAP_DISPLAY_NAMES: Record<string, string> = {
    'area88': 'Area 88',
    'base404': 'Base 404',
    'port_euler': 'Port Euler',
    'space_lab': 'Space Lab',
    'windy_town': 'Windy Town',
    'cauchy_street': 'Cauchy Street',
    'cosmite': 'Cosmite',
    'ocarnus': 'Ocarnus',
};

export default function VetoProcess({
    roomId,
    teamRole,
    isSpectator = false,
    teamAName,
    teamBName,
    onVetoComplete
}: VetoProcessProps) {
    const [showSideSelection, setShowSideSelection] = useState(false);
    const [pendingMapId, setPendingMapId] = useState<string | null>(null);

    // Get veto state
    const vetoStateQuery = api.room.getVetoState.useQuery(
        { roomId },
        { refetchInterval: 2000 }
    );

    // Also poll room updates for better real-time experience
    const roomUpdatesQuery = api.room.getRoomUpdates.useQuery(
        { roomId },
        {
            refetchInterval: 1000,
            refetchIntervalInBackground: true,
        }
    );

    // Mutations
    const makeVetoActionMutation = api.room.makeVetoAction.useMutation({
        onSuccess: (result) => {
            void vetoStateQuery.refetch();
            void roomUpdatesQuery.refetch();
            setShowSideSelection(false);
            setPendingMapId(null);

            if (result.vetoCompleted && onVetoComplete) {
                onVetoComplete();
            }
        },
        onError: (error) => {
            console.error('Veto action failed:', error);
            setShowSideSelection(false);
            setPendingMapId(null);
        },
    });

    const vetoData = vetoStateQuery.data;
    const roomData = roomUpdatesQuery.data;
    const vetoState = vetoData?.vetoState as VetoState | null;
    const currentSequenceItem = vetoState?.vetoSequence[vetoState.currentStep];
    const isMyTurn = !isSpectator && teamRole === vetoData?.currentTurn;

    // Use room data if available, fallback to veto data
    const vetoStarted = roomData?.vetoStarted ?? vetoData?.vetoStarted ?? false;
    const vetoCompleted = roomData?.vetoCompleted ?? vetoData?.vetoCompleted ?? false;

    const handleMapAction = async (mapId: string, action: 'ban' | 'pick') => {
        if (!teamRole || !isMyTurn) return;

        if (action === 'pick') {
            // Show side selection for picks
            setPendingMapId(mapId);
            setShowSideSelection(true);
        } else {
            // Direct ban action
            try {
                await makeVetoActionMutation.mutateAsync({
                    teamId: roomId,
                    action,
                    mapId,
                });
            } catch (error) {
                console.error('Failed to make veto action:', error);
            }
        }
    };

    const handleSideSelection = async (side: 'attack' | 'defense') => {
        if (!pendingMapId || !teamRole) return;

        try {
            await makeVetoActionMutation.mutateAsync({
                teamId: roomId,
                action: 'pick',
                mapId: pendingMapId,
                side,
            });
        } catch (error) {
            console.error('Failed to make veto action:', error);
        }
    };

    const getMapDisplayName = (mapId: string) => {
        return MAP_DISPLAY_NAMES[mapId] ?? mapId;
    };

    const getTeamDisplayName = (team: 'team-a' | 'team-b') => {
        return team === 'team-a' ? (teamAName ?? 'Team A') : (teamBName ?? 'Team B');
    };

    if (vetoStateQuery.isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Loading Veto Process...</CardTitle>
                </CardHeader>
            </Card>
        );
    }

    if (!vetoStarted) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Swords className="w-5 h-5" />
                        Waiting for Veto Process
                    </CardTitle>
                    <CardDescription>
                        The veto process will automatically start when both teams are ready.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground">
                        Veto will begin automatically once both teams are ready...
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (vetoCompleted) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        Veto Process Complete
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {vetoState?.pickedMaps && vetoState.pickedMaps.length > 0 && (
                            <div>
                                <h3 className="font-semibold mb-2">Final Map Selection:</h3>
                                <div className="space-y-2">
                                    {vetoState.pickedMaps.map((pick, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                            <div>
                                                <span className="font-medium">{getMapDisplayName(pick.mapId)}</span>
                                                <Badge variant="outline" className="ml-2">
                                                    Map {index + 1}
                                                </Badge>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-medium">
                                                    Picked by {getTeamDisplayName(pick.pickedBy)}
                                                </div>
                                                {pick.side && (
                                                    <Badge variant="secondary" className="mt-1">
                                                        {pick.side === 'attack' ? 'Attacking' : 'Defending'}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {vetoState?.bannedMaps && vetoState.bannedMaps.length > 0 && (
                            <div>
                                <h3 className="font-semibold mb-2">Banned Maps:</h3>
                                <div className="flex flex-wrap gap-2">
                                    {vetoState.bannedMaps.map((mapId) => (
                                        <Badge key={mapId} variant="destructive">
                                            {getMapDisplayName(mapId)}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Current Turn Indicator */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Veto in Progress
                    </CardTitle>
                    <CardDescription>
                        {currentSequenceItem && (
                            <div className="flex items-center gap-2 mt-2">
                                <span>
                                    {getTeamDisplayName(currentSequenceItem.team)}&apos;s turn to{' '}
                                    <strong>{currentSequenceItem.action}</strong> a map
                                </span>
                                {currentSequenceItem.action === 'ban' ? (
                                    <Ban className="w-4 h-4 text-red-500" />
                                ) : (
                                    <Target className="w-4 h-4 text-green-500" />
                                )}
                            </div>
                        )}
                        {isMyTurn && (
                            <Badge variant="default" className="mt-2">
                                Your Turn
                            </Badge>
                        )}
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Side Selection Modal */}
            {showSideSelection && pendingMapId && (
                <Card className="border-primary">
                    <CardHeader>
                        <CardTitle>Choose Starting Side</CardTitle>
                        <CardDescription>
                            Select which side you want to start on for {getMapDisplayName(pendingMapId)}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4">
                            <Button
                                variant="outline"
                                onClick={() => handleSideSelection('attack')}
                                disabled={makeVetoActionMutation.isPending}
                                className="flex-1"
                            >
                                Attack Side
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handleSideSelection('defense')}
                                disabled={makeVetoActionMutation.isPending}
                                className="flex-1"
                            >
                                Defense Side
                            </Button>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setShowSideSelection(false);
                                setPendingMapId(null);
                            }}
                            className="w-full mt-2"
                        >
                            Cancel
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Available Maps */}
            {vetoState && vetoState.availableMaps.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Available Maps</CardTitle>
                        <CardDescription>
                            {isMyTurn && currentSequenceItem
                                ? `Click a map to ${currentSequenceItem.action} it`
                                : 'Maps still in the pool'
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {vetoState.availableMaps.map((mapId) => (
                                <Button
                                    key={mapId}
                                    variant={isMyTurn ? "outline" : "ghost"}
                                    className={`h-auto p-4 ${isMyTurn && currentSequenceItem
                                        ? currentSequenceItem.action === 'ban'
                                            ? 'hover:border-red-500 hover:text-red-500'
                                            : 'hover:border-green-500 hover:text-green-500'
                                        : ''
                                        }`}
                                    onClick={() => currentSequenceItem && handleMapAction(mapId, currentSequenceItem.action)}
                                    disabled={!isMyTurn || makeVetoActionMutation.isPending || showSideSelection}
                                >
                                    <div className="text-center">
                                        <div className="font-medium">{getMapDisplayName(mapId)}</div>
                                        {isMyTurn && currentSequenceItem && (
                                            <Badge
                                                variant={currentSequenceItem.action === 'ban' ? 'destructive' : 'default'}
                                                className="mt-1"
                                            >
                                                {currentSequenceItem.action === 'ban' ? 'Ban' : 'Pick'}
                                            </Badge>
                                        )}
                                    </div>
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Veto Progress */}
            {vetoState && (
                <Card>
                    <CardHeader>
                        <CardTitle>Veto Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Sequence Progress */}
                            <div>
                                <h4 className="font-medium mb-2">Veto Sequence:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {vetoState.vetoSequence.map((step, index) => (
                                        <Badge
                                            key={index}
                                            variant={
                                                step.completed
                                                    ? 'default'
                                                    : index === vetoState.currentStep
                                                        ? 'secondary'
                                                        : 'outline'
                                            }
                                            className="flex items-center gap-1"
                                        >
                                            {step.action === 'ban' ? (
                                                <Ban className="w-3 h-3" />
                                            ) : (
                                                <Target className="w-3 h-3" />
                                            )}
                                            {getTeamDisplayName(step.team)} {step.action}
                                            {step.completed && <CheckCircle className="w-3 h-3" />}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            {/* Actions History */}
                            {vetoState.actions.length > 0 && (
                                <div>
                                    <h4 className="font-medium mb-2">Recent Actions:</h4>
                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                        {vetoState.actions.slice().reverse().map((action, index) => (
                                            <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                                                <div className="flex items-center gap-2">
                                                    {action.type === 'ban' ? (
                                                        <Ban className="w-4 h-4 text-red-500" />
                                                    ) : (
                                                        <Target className="w-4 h-4 text-green-500" />
                                                    )}
                                                    <span className="font-medium">
                                                        {getTeamDisplayName(action.team)}
                                                    </span>
                                                    <span>{action.type}ned</span>
                                                    <Badge variant="outline">
                                                        {getMapDisplayName(action.mapId)}
                                                    </Badge>
                                                    {action.side && (
                                                        <Badge variant="secondary">
                                                            {action.side}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(action.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
