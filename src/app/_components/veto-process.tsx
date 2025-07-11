'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Clock, Ban, Target, CheckCircle, Swords, Shield, Zap } from 'lucide-react';
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

interface VetoProcessProps {
    roomId: string;
    teamRole?: 'team-a' | 'team-b';
    isSpectator?: boolean;
    teamAName: string | null;
    teamBName: string | null;
    roundType?: string;
    onVetoComplete?: () => void;
}

const MAP_DATA: Record<string, { name: string; image: string; isDemolition: boolean }> = {
    'area88': { name: 'Area 88', image: '/maps/Area88.png', isDemolition: true },
    'base404': { name: 'Base 404', image: '/maps/Base404.png', isDemolition: true },
    'port_euler': { name: 'Port Euler', image: '/maps/PortEuler.png', isDemolition: true },
    'space_lab': { name: 'Space Lab', image: '/maps/SpaceLab.png', isDemolition: true },
    'windy_town': { name: 'Windy Town', image: '/maps/WindyTown.png', isDemolition: true },
    'cauchy_street': { name: 'Cauchy Street', image: '/maps/CauchyStreet.png', isDemolition: true },
    'cosmite': { name: 'Cosmite', image: '/maps/Cosmite.png', isDemolition: true },
    'ocarnus': { name: 'Ocarnus', image: '/maps/Ocarnus.png', isDemolition: true },
};

export default function VetoProcess({
    roomId,
    teamRole,
    isSpectator = false,
    teamAName,
    teamBName,
    roundType,
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

    const selectSideForMapMutation = api.room.selectSideForMap.useMutation({
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
            console.error('Side selection failed:', error);
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

    // Check if we need to show side selection for the opposing team
    const shouldShowOppositeSideSelection = () => {
        if (!vetoState || vetoState.pickedMaps.length === 0) return false;

        // Check if there's any picked map without a side assigned and it's our turn to choose
        const mapWithoutSide = vetoState.pickedMaps.find(pick => !pick.side && pick.pickedBy !== teamRole);

        return mapWithoutSide &&
            !vetoCompleted &&
            vetoData?.currentTurn === teamRole;
    };

    const getMapForSideSelection = () => {
        if (!vetoState || vetoState.pickedMaps.length === 0) return null;

        // Find the picked map without a side that was picked by the opposing team
        const mapWithoutSide = vetoState.pickedMaps.find(pick => !pick.side && pick.pickedBy !== teamRole);

        return mapWithoutSide?.mapId ?? null;
    };

    const handleMapAction = async (mapId: string, action: 'ban' | 'pick') => {
        if (!teamRole || !isMyTurn) return;

        const mapData = MAP_DATA[mapId];

        if (action === 'pick' && mapData?.isDemolition) {
            // Check if this is the final pick in the sequence
            const isFinalPick = vetoState &&
                (vetoState.currentStep + 1) >= vetoState.vetoSequence.length;

            if (isFinalPick) {
                // For the final pick, check if this is Bo5
                const isBo5 = roundType === 'bo5';

                if (isBo5) {
                    // Bo5 final map: The opposing team chooses the side, not the picking team
                    // Pick the map without side selection, the opposing team will choose later
                    try {
                        await makeVetoActionMutation.mutateAsync({
                            teamId: roomId,
                            action,
                            mapId,
                            // No side selection for Bo5 final map - opposing team will choose
                        });
                    } catch (error) {
                        console.error('Failed to make veto action:', error);
                    }
                } else {
                    // Bo1/Bo3 final map: The picking team selects the side
                    setPendingMapId(mapId);
                    setShowSideSelection(true);
                }
            } else {
                // For non-final demolition maps, pick without side selection
                // The opposing team will choose the side
                try {
                    await makeVetoActionMutation.mutateAsync({
                        teamId: roomId,
                        action,
                        mapId,
                        // No side selection for non-final demolition maps
                    });
                } catch (error) {
                    console.error('Failed to make veto action:', error);
                }
            }
        } else if (action === 'pick') {
            // For non-demolition maps, require side selection
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
        if (!teamRole) return;

        try {
            // Check if this is for side selection of an opponent's picked map
            const mapForSideSelection = getMapForSideSelection();

            if (mapForSideSelection && shouldShowOppositeSideSelection()) {
                // Selecting side for opponent's picked map
                await selectSideForMapMutation.mutateAsync({
                    teamId: roomId,
                    mapId: mapForSideSelection,
                    side,
                });
            } else if (pendingMapId) {
                // Normal pick with side selection (for non-demolition maps)
                await makeVetoActionMutation.mutateAsync({
                    teamId: roomId,
                    action: 'pick',
                    mapId: pendingMapId,
                    side,
                });
            }
        } catch (error) {
            console.error('Failed to make veto action:', error);
        }
    };

    const getMapDisplayName = (mapId: string) => {
        return MAP_DATA[mapId]?.name ?? mapId;
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
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Swords className="w-5 h-5" />
                            Map Pool Overview
                        </CardTitle>
                        <CardDescription>
                            The veto process will automatically start when both teams are ready. Here are the maps in the pool:
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {Object.entries(MAP_DATA).map(([mapId, mapData]) => (
                                <div key={mapId} className={`map-grid-item group relative map-pool-card map-pool-glow`}>
                                    <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-muted shadow-lg transition-all duration-300 group-hover:border-primary/50 group-hover:shadow-xl map-pool-shimmer">
                                        <Image
                                            src={mapData.image}
                                            alt={mapData.name}
                                            fill
                                            className="object-cover transition-all duration-300 group-hover:brightness-110 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                                        {/* Map info overlay */}
                                        <div className="absolute bottom-0 left-0 right-0 p-4 transform transition-all duration-300 group-hover:translate-y-0 translate-y-1">
                                            <h3 className="text-white font-bold text-lg mb-2 drop-shadow-lg">
                                                {mapData.name}
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                {mapData.isDemolition && (
                                                    <Badge variant="secondary" className="text-xs backdrop-blur-sm bg-white/20">
                                                        Demolition
                                                    </Badge>
                                                )}
                                                <Badge variant="outline" className="text-xs bg-white/10 text-white border-white/20 backdrop-blur-sm">
                                                    Available
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* Hover effect overlay */}
                                        <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-all duration-300" />

                                        {/* Subtle corner decoration */}
                                        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-white/30 transition-all duration-300 group-hover:border-white/60"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                            <Clock className="w-5 h-5" />
                            Waiting for Veto Process
                        </CardTitle>
                        <CardDescription className="text-amber-600 dark:text-amber-400">
                            The veto process will begin automatically once both teams are ready. Make sure your team is prepared!
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center py-4">
                            <div className="flex items-center gap-3 text-amber-700 dark:text-amber-300">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div>
                                <span className="font-medium">Veto will begin automatically...</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (vetoCompleted) {
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
                        {vetoState?.pickedMaps && vetoState.pickedMaps.length > 0 && (
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
                                                    </div>                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-medium text-lg">{getMapDisplayName(pick.mapId)}</span>
                                                            <Badge variant="outline" className="text-xs">
                                                                Map {index + 1}
                                                            </Badge>
                                                        </div>
                                                        <div className="text-sm text-muted-foreground mb-2">
                                                            Picked by {getTeamDisplayName(pick.pickedBy)}
                                                        </div>
                                                        {pick.attackingTeam && pick.defendingTeam && (
                                                            <div className="flex items-center gap-4 text-xs">
                                                                <div className="flex items-center gap-1 text-red-600">
                                                                    <Swords className="w-3 h-3" />
                                                                    <span className="font-medium">ATK:</span>
                                                                    <span>{getTeamDisplayName(pick.attackingTeam)}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1 text-blue-600">
                                                                    <Shield className="w-3 h-3" />
                                                                    <span className="font-medium">DEF:</span>
                                                                    <span>{getTeamDisplayName(pick.defendingTeam)}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {!pick.attackingTeam && !pick.defendingTeam && pick.side && (
                                                            <div className="text-xs text-muted-foreground">
                                                                Side selection pending...
                                                            </div>
                                                        )}
                                                    </div>                                    <div className="flex flex-col items-end gap-2">
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

                        {vetoState?.bannedMaps && vetoState.bannedMaps.length > 0 && (
                            <div>
                                <h3 className="font-semibold mb-3">Banned Maps:</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {vetoState.bannedMaps.map((mapId) => {
                                        const mapData = MAP_DATA[mapId];
                                        return (
                                            <div key={mapId} className="relative group">
                                                <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                                                    <Image
                                                        src={mapData?.image ?? '/maps/placeholder.png'}
                                                        alt={mapData?.name ?? mapId}
                                                        fill
                                                        className="object-cover grayscale opacity-60"
                                                    />
                                                    <div className="absolute inset-0 bg-red-500/20" />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Ban className="w-8 h-8 text-red-500" />
                                                    </div>
                                                </div>
                                                <Badge variant="destructive" className="absolute -top-2 -right-2 text-xs">
                                                    Banned
                                                </Badge>
                                                <p className="text-center text-sm font-medium mt-2">{getMapDisplayName(mapId)}</p>
                                            </div>
                                        );
                                    })}
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
            <Card className={`transition-all duration-300 ${isMyTurn ? 'ring-2 ring-primary/50 shadow-lg' : ''}`}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className={`w-5 h-5 ${isMyTurn ? 'animate-pulse' : ''}`} />
                        Veto in Progress
                    </CardTitle>
                    <CardDescription>
                        {currentSequenceItem && (
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-base">
                                    <span className={`font-bold ${currentSequenceItem.team === teamRole ? 'text-primary' : ''}`}>
                                        {getTeamDisplayName(currentSequenceItem.team)}
                                    </span>&apos;s turn to{' '}
                                    <strong className={currentSequenceItem.action === 'ban' ? 'text-red-500' : 'text-green-500'}>
                                        {currentSequenceItem.action}
                                    </strong> a map
                                </span>
                                {currentSequenceItem.action === 'ban' ? (
                                    <Ban className="w-4 h-4 text-red-500" />
                                ) : (
                                    <Target className="w-4 h-4 text-green-500" />
                                )}
                            </div>
                        )}
                        {isMyTurn && (
                            <Badge variant="default" className="mt-2 animate-pulse">
                                🎯 Your Turn
                            </Badge>
                        )}
                        {shouldShowOppositeSideSelection() && (
                            <Badge variant="secondary" className="mt-2 animate-bounce">
                                Choose Your Starting Side
                            </Badge>
                        )}
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Side Selection Modal */}
            {(showSideSelection || shouldShowOppositeSideSelection()) && (pendingMapId ?? getMapForSideSelection()) && (
                <Card className="border-primary shadow-xl animate-in slide-in-from-top-4 duration-300">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                {shouldShowOppositeSideSelection() ? <Shield className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                            </div>
                            Choose Starting Side
                        </CardTitle>
                        <CardDescription>
                            {shouldShowOppositeSideSelection() ? (
                                <>
                                    The opposing team picked{' '}
                                    <span className="font-medium text-foreground">
                                        {getMapDisplayName(getMapForSideSelection() ?? '')}
                                    </span>
                                    . Choose which side you want to start on.
                                </>
                            ) : (
                                <>
                                    {vetoState && (vetoState.currentStep + 1) >= vetoState.vetoSequence.length ? (
                                        <>
                                            Select which side you want to start on for the final map{' '}
                                            <span className="font-medium text-foreground">{getMapDisplayName(pendingMapId ?? '')}</span>
                                        </>
                                    ) : (
                                        <>
                                            Select which side you want to start on for{' '}
                                            <span className="font-medium text-foreground">{getMapDisplayName(pendingMapId ?? '')}</span>
                                        </>
                                    )}
                                </>
                            )}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <Button
                                variant="outline"
                                onClick={() => handleSideSelection('attack')}
                                disabled={makeVetoActionMutation.isPending || selectSideForMapMutation.isPending}
                                className="h-20 flex flex-col gap-2 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200"
                            >
                                <Zap className="w-6 h-6 text-red-500" />
                                <span className="font-medium">Attack</span>
                                <span className="text-xs text-muted-foreground">Aggressive playstyle</span>
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => handleSideSelection('defense')}
                                disabled={makeVetoActionMutation.isPending || selectSideForMapMutation.isPending}
                                className="h-20 flex flex-col gap-2 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all duration-200"
                            >
                                <Shield className="w-6 h-6 text-blue-500" />
                                <span className="font-medium">Defense</span>
                                <span className="text-xs text-muted-foreground">Defensive playstyle</span>
                            </Button>
                        </div>
                        {!shouldShowOppositeSideSelection() && (
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setShowSideSelection(false);
                                    setPendingMapId(null);
                                }}
                                className="w-full"
                                disabled={makeVetoActionMutation.isPending || selectSideForMapMutation.isPending}
                            >
                                Cancel
                            </Button>
                        )}
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {vetoState.availableMaps.map((mapId) => {
                                const mapData = MAP_DATA[mapId];
                                const canInteract = isMyTurn && currentSequenceItem && !showSideSelection && !shouldShowOppositeSideSelection();

                                return (
                                    <div
                                        key={mapId}
                                        className={`group relative cursor-pointer transition-all duration-300 ${canInteract
                                            ? 'hover:scale-105 hover:shadow-lg transform-gpu'
                                            : 'opacity-75'
                                            }`}
                                        onClick={() => canInteract && handleMapAction(mapId, currentSequenceItem.action)}
                                    >
                                        <div className={`relative w-full aspect-video rounded-lg overflow-hidden border-2 transition-all duration-200 ${canInteract
                                            ? currentSequenceItem.action === 'ban'
                                                ? 'hover:border-red-500 border-transparent'
                                                : 'hover:border-green-500 border-transparent'
                                            : 'border-muted'
                                            }`}>
                                            <Image
                                                src={mapData?.image ?? '/maps/placeholder.png'}
                                                alt={mapData?.name ?? mapId}
                                                fill
                                                className="object-cover transition-all duration-200 group-hover:brightness-110"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                                            {/* Map name overlay */}
                                            <div className="absolute bottom-0 left-0 right-0 p-3">
                                                <h3 className="text-white font-semibold text-sm mb-1">
                                                    {getMapDisplayName(mapId)}
                                                </h3>
                                                {mapData?.isDemolition && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        Demolition
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Action overlay */}
                                            {canInteract && (
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                        <Badge
                                                            variant={currentSequenceItem.action === 'ban' ? 'destructive' : 'default'}
                                                            className="text-sm px-3 py-1 animate-in zoom-in-50 duration-200"
                                                        >
                                                            {currentSequenceItem.action === 'ban' ? (
                                                                <>
                                                                    <Ban className="w-3 h-3 mr-1" />
                                                                    Ban
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Target className="w-3 h-3 mr-1" />
                                                                    Pick
                                                                </>
                                                            )}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Disabled overlay */}
                                            {!canInteract && !isSpectator && (
                                                <div className="absolute inset-0 bg-black/40" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
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
                        <div className="space-y-6">
                            {/* Sequence Progress */}
                            <div>
                                <h4 className="font-medium mb-3">Veto Sequence:</h4>
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
                                            className={`flex items-center gap-1 transition-all duration-200 ${index === vetoState.currentStep && !step.completed
                                                ? 'animate-pulse ring-2 ring-primary/30'
                                                : ''
                                                }`}
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
                                    <h4 className="font-medium mb-3">Recent Actions:</h4>
                                    <div className="space-y-3 max-h-60 overflow-y-auto">
                                        {vetoState.actions.slice().reverse().map((action, index) => {
                                            const mapData = MAP_DATA[action.mapId];
                                            return (
                                                <div
                                                    key={index}
                                                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border animate-in slide-in-from-left-2 duration-300"
                                                    style={{ animationDelay: `${index * 100}ms` }}
                                                >
                                                    <div className="relative w-12 h-8 rounded-md overflow-hidden flex-shrink-0">
                                                        <Image
                                                            src={mapData?.image ?? '/maps/placeholder.png'}
                                                            alt={mapData?.name ?? action.mapId}
                                                            fill
                                                            className={`object-cover ${action.type === 'ban' ? 'grayscale' : ''}`}
                                                        />
                                                        {action.type === 'ban' && (
                                                            <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                                                                <Ban className="w-3 h-3 text-red-500" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            {action.type === 'ban' ? (
                                                                <Ban className="w-4 h-4 text-red-500 flex-shrink-0" />
                                                            ) : (
                                                                <Target className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                            )}
                                                            <span className="font-medium text-sm">
                                                                {getTeamDisplayName(action.team)}
                                                            </span>
                                                            <span className="text-sm text-muted-foreground">
                                                                {action.type}ned
                                                            </span>
                                                            <Badge variant="outline" className="text-xs">
                                                                {getMapDisplayName(action.mapId)}
                                                            </Badge>
                                                        </div>
                                                        {action.side && (
                                                            <Badge
                                                                variant={action.side === 'attack' ? 'destructive' : 'secondary'}
                                                                className="text-xs flex items-center gap-1 w-fit"
                                                            >
                                                                {action.side === 'attack' ? <Zap className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                                                                {action.side}
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    <span className="text-xs text-muted-foreground flex-shrink-0">
                                                        {new Date(action.timestamp).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                            );
                                        })}
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
