'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '~/components/ui/tooltip';
import { Eye, Crown, Clock, CheckCircle, XCircle, Edit, Wifi, WifiOff } from 'lucide-react';
import { api } from '~/trpc/react';
import VetoProcess from '../_components/veto-process';
import { type RoomData } from '~/types/room';
import { MAP_DATA, getRoundLabel } from '~/constants/maps';
import { useSupabaseRoomUpdates } from '~/hooks/use-supabase-realtime';

export default function RoomPage() {
    const params = useParams();
    const roomId = params.roomId as string;
    const [roomData, setRoomData] = useState<RoomData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [teamName, setTeamName] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);

    // Try to get room by master room ID first
    const masterRoomQuery = api.room.getByMasterRoomId.useQuery(
        { masterRoomId: roomId },
        { enabled: !!roomId }
    );

    // Try to get room by team ID if master room query fails
    const teamRoomQuery = api.room.getByTeamId.useQuery(
        { teamId: roomId },
        { enabled: !!roomId && !masterRoomQuery.data && !masterRoomQuery.isPending }
    );

    // Supabase realtime updates for the room
    const handleRealtimeUpdate = useCallback((update: { type: string; data?: Record<string, unknown> }) => {
        console.log('Received realtime update:', update);

        if (update.type === 'team-ready-updated' || update.type === 'team-name-updated') {
            // Refetch room data to get latest state
            void masterRoomQuery.refetch();
            void teamRoomQuery.refetch();
        }
    }, [masterRoomQuery, teamRoomQuery]);

    const { isConnected: realtimeConnected, latency, broadcastRoomUpdate } = useSupabaseRoomUpdates({
        roomId,
        enabled: !!roomData,
        onUpdate: handleRealtimeUpdate,
    });

    const updateTeamReadyMutation = api.room.updateTeamReady.useMutation({
        onSuccess: (updatedRoom) => {
            setRoomData(updatedRoom);
            // Broadcast the update to other clients
            void broadcastRoomUpdate('team-ready-updated', {
                teamAReady: updatedRoom.teamAReady,
                teamBReady: updatedRoom.teamBReady,
                status: updatedRoom.status,
                vetoStarted: updatedRoom.vetoStarted,
            });
        },
    });

    const updateTeamNameMutation = api.room.updateTeamName.useMutation({
        onSuccess: (updatedRoom) => {
            setRoomData(updatedRoom);
            setIsEditingName(false);
            // Broadcast the update to other clients
            void broadcastRoomUpdate('team-name-updated', {
                teamAName: updatedRoom.teamAName,
                teamBName: updatedRoom.teamBName,
            });
        },
    });

    useEffect(() => {
        if (masterRoomQuery.data) {
            setRoomData(masterRoomQuery.data);
            setIsLoading(false);
        } else if (teamRoomQuery.data) {
            setRoomData(teamRoomQuery.data);
            const currentTeamName = teamRoomQuery.data.teamRole === 'team-a'
                ? teamRoomQuery.data.teamAName
                : teamRoomQuery.data.teamBName;
            setTeamName(currentTeamName ?? '');
            setIsLoading(false);
        } else if (masterRoomQuery.isError && teamRoomQuery.isError) {
            setError('Room not found');
            setIsLoading(false);
        }
    }, [masterRoomQuery.data, teamRoomQuery.data, masterRoomQuery.isError, teamRoomQuery.isError]);

    const handleTeamReady = async (ready: boolean) => {
        if (!roomData?.teamRole) return;

        try {
            const updatedRoom = await updateTeamReadyMutation.mutateAsync({
                teamId: roomId,
                ready,
            });
            setRoomData(updatedRoom);
        } catch (error) {
            console.error('Error updating team ready status:', error);
        }
    };

    const handleTeamNameSave = async () => {
        if (!roomData?.teamRole || teamName.trim() === '') return;

        try {
            const updatedRoom = await updateTeamNameMutation.mutateAsync({
                teamId: roomId,
                teamName: teamName.trim(),
            });
            setRoomData(updatedRoom);
            setIsEditingName(false);
        } catch (error) {
            console.error('Error updating team name:', error);
        }
    };

    const getCurrentTeamName = () => {
        if (!roomData?.teamRole) return '';
        return roomData.teamRole === 'team-a' ? (roomData.teamAName ?? '') : (roomData.teamBName ?? '');
    };

    const isCurrentTeamReady = () => {
        if (!roomData?.teamRole) return false;
        return roomData.teamRole === 'team-a' ? roomData.teamAReady : roomData.teamBReady;
    };

    const getTimeRemaining = (expiresAt: string): string => {
        const now = new Date();
        const expiry = new Date(expiresAt);
        const diff = expiry.getTime() - now.getTime();

        if (diff <= 0) return 'Expired';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `${hours}h ${minutes}m remaining`;
        } else {
            return `${minutes}m remaining`;
        }
    };

    const getLatencyDisplay = (latency: number): string => {
        if (latency < 0) return 'Error';
        if (latency < 100) return `${latency}ms`;
        if (latency < 1000) return `${latency}ms`;
        return `${(latency / 1000).toFixed(1)}s`;
    };

    const getLatencyColor = (latency: number): 'default' | 'secondary' | 'destructive' => {
        if (latency < 0) return 'destructive';
        if (latency < 100) return 'default';
        if (latency < 300) return 'secondary';
        return 'destructive';
    };

    const isSpectator = !roomData?.teamRole;
    const isTeamA = roomData?.teamRole === 'team-a';

    if (isLoading) {
        return (
            <div className="w-full max-w-4xl mx-auto p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Loading...</CardTitle>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (error || !roomData) {
        return (
            <div className="w-full max-w-4xl mx-auto p-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Room Not Found</CardTitle>
                        <CardDescription>
                            The room you&apos;re looking for doesn&apos;t exist or has expired.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto p-4">
            <TooltipProvider>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {isSpectator ? (
                                <>
                                    <Eye className="w-5 h-5" />
                                    Spectating Room: {roomData.id}
                                </>
                            ) : (
                                <>
                                    <Crown className="w-5 h-5" />
                                    {isTeamA ? 'Team A' : 'Team B'} - Room: {roomData.id}
                                </>
                            )}
                        </CardTitle>
                        <CardDescription>
                            {isSpectator
                                ? 'Watch the map veto process between Team A and Team B.'
                                : `You are ${isTeamA ? 'Team A' : 'Team B'}. Wait for both teams to be ready to start the veto process.`
                            }
                        </CardDescription>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {getTimeRemaining(roomData.expiresAt)}
                            </Badge>
                            <Badge variant="secondary">
                                {getRoundLabel(roomData.roundType)}
                            </Badge>
                            <Badge variant="secondary">
                                {roomData.maps.length} maps
                            </Badge>
                            <Badge variant={roomData.status === 'waiting' ? 'default' : 'outline'}>
                                {roomData.status}
                            </Badge>
                            {/* Realtime connection status */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    {realtimeConnected ? (
                                        <Badge variant={getLatencyColor(latency)} className="flex items-center gap-1 cursor-help">
                                            <Wifi className="w-3 h-3" />
                                            Live ({getLatencyDisplay(latency)})
                                        </Badge>
                                    ) : (
                                        <Badge variant="destructive" className="flex items-center gap-1 cursor-help">
                                            <WifiOff className="w-3 h-3" />
                                            Offline
                                        </Badge>
                                    )}
                                </TooltipTrigger>
                                <TooltipContent>
                                    <div className="text-sm">
                                        <div className="font-semibold">
                                            {realtimeConnected ? 'Real-time Connected' : 'Real-time Disconnected'}
                                        </div>
                                        {realtimeConnected && (
                                            <div className="space-y-1 text-xs">
                                                <div>Latency: {getLatencyDisplay(latency)}</div>
                                                <div>Channel: room:{roomData.id.substring(0, 12)}...</div>
                                                <div>
                                                    Quality: {latency < 100 ? 'Excellent' : latency < 300 ? 'Good' : 'Poor'}
                                                </div>
                                            </div>
                                        )}
                                        {!realtimeConnected && (
                                            <div className="text-xs text-muted-foreground">
                                                Updates may be delayed
                                            </div>
                                        )}
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {/* Team Status */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-muted/50 rounded-lg p-4">
                                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                        {roomData.teamAName ?? 'Team A'}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        {roomData.teamAReady ? (
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <XCircle className="w-4 h-4 text-red-500" />
                                        )}
                                        <span className="text-sm">
                                            {roomData.teamAReady ? 'Ready' : 'Not Ready'}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-4">
                                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                        {roomData.teamBName ?? 'Team B'}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        {roomData.teamBReady ? (
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <XCircle className="w-4 h-4 text-red-500" />
                                        )}
                                        <span className="text-sm">
                                            {roomData.teamBReady ? 'Ready' : 'Not Ready'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Team Name Setting */}
                            {!isSpectator && (
                                <div className="border-t pt-4">
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="team-name" className="text-sm font-medium">
                                                {isTeamA ? 'Team A' : 'Team B'} Name
                                            </Label>
                                            <div className="flex gap-2 mt-1">
                                                {isEditingName ? (
                                                    <>
                                                        <Input
                                                            id="team-name"
                                                            value={teamName}
                                                            onChange={(e) => setTeamName(e.target.value)}
                                                            placeholder="Enter team name"
                                                            maxLength={50}
                                                            disabled={isCurrentTeamReady()}
                                                        />
                                                        <Button
                                                            variant="outline"
                                                            onClick={handleTeamNameSave}
                                                            disabled={teamName.trim() === '' || updateTeamNameMutation.isPending}
                                                        >
                                                            {updateTeamNameMutation.isPending ? 'Saving...' : 'Save'}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            onClick={() => {
                                                                setIsEditingName(false);
                                                                setTeamName(getCurrentTeamName());
                                                            }}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Input
                                                            value={getCurrentTeamName() || 'No team name set'}
                                                            readOnly
                                                            className="bg-muted"
                                                        />
                                                        {!isCurrentTeamReady() && (
                                                            <Button
                                                                variant="outline"
                                                                onClick={() => {
                                                                    setIsEditingName(true);
                                                                    setTeamName(getCurrentTeamName());
                                                                }}
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                            {!getCurrentTeamName() && (
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    You must set a team name before marking ready.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Team Actions - Hide when veto started */}
                            {!isSpectator && !roomData.vetoStarted && (
                                <div className="border-t pt-4">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-muted-foreground">
                                            {isTeamA ? 'Team A' : 'Team B'} Actions
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant={isTeamA ? (roomData.teamAReady ? 'default' : 'outline') : (roomData.teamBReady ? 'default' : 'outline')}
                                                onClick={() => handleTeamReady(!(isTeamA ? roomData.teamAReady : roomData.teamBReady))}
                                                disabled={updateTeamReadyMutation.isPending || (!getCurrentTeamName() && !(isTeamA ? roomData.teamAReady : roomData.teamBReady))}
                                            >
                                                {updateTeamReadyMutation.isPending ? 'Updating...' :
                                                    (isTeamA ? roomData.teamAReady : roomData.teamBReady) ? 'Mark Not Ready' : 'Mark Ready'
                                                }
                                            </Button>
                                        </div>
                                    </div>
                                    {!getCurrentTeamName() && !(isTeamA ? roomData.teamAReady : roomData.teamBReady) && (
                                        <p className="text-sm text-muted-foreground mt-2">
                                            Set a team name before marking ready.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Maps - Hide when veto started */}
                            {!roomData.vetoStarted && (
                                <div className="border-t pt-4">
                                    <h3 className="font-semibold mb-4">Maps in Pool</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {roomData.maps.map((mapId) => {
                                            const mapData = MAP_DATA[mapId];
                                            return (
                                                <div key={mapId} className="group relative">
                                                    <div className="relative w-full aspect-video rounded-lg overflow-hidden border-2 border-muted transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
                                                        <Image
                                                            src={mapData?.image ?? '/maps/placeholder.png'}
                                                            alt={mapData?.name ?? mapId}
                                                            fill
                                                            className="object-cover transition-all duration-200 group-hover:brightness-110"
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                                                        {/* Map name overlay */}
                                                        <div className="absolute bottom-0 left-0 right-0 p-3">
                                                            <h4 className="text-white font-semibold text-sm mb-1">
                                                                {mapData?.name ?? mapId}
                                                            </h4>
                                                            {mapData?.isDemolition && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    Demolition
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

                            {/* Veto Process */}
                            {roomData.teamAReady && roomData.teamBReady && (
                                <div className="border-t pt-6">
                                    <VetoProcess
                                        roomId={roomId}
                                        teamRole={roomData.teamRole}
                                        isSpectator={isSpectator}
                                        teamAName={roomData.teamAName ?? null}
                                        teamBName={roomData.teamBName ?? null}
                                        roundType={roomData.roundType}
                                    />
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Footer with room creation info */}
                <div className="mt-4 space-y-2">
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">
                            Room created on {new Date(roomData.createdAt).toLocaleDateString()} at {new Date(roomData.createdAt).toLocaleTimeString()}
                        </p>
                    </div>

                    {/* Connection Status Debug Info */}
                    <div className="text-center">
                        <div className="inline-flex items-center gap-4 text-xs text-muted-foreground bg-muted/30 px-3 py-1 rounded-full">
                            <span className="flex items-center gap-1">
                                {realtimeConnected ? (
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                ) : (
                                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                                )}
                                {realtimeConnected ? 'Connected' : 'Disconnected'}
                            </span>

                            {realtimeConnected && (
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {getLatencyDisplay(latency)}
                                    {latency > 0 && latency < 100 && <span className="text-green-600">●</span>}
                                    {latency >= 100 && latency < 300 && <span className="text-yellow-600">●</span>}
                                    {latency >= 300 && <span className="text-red-600">●</span>}
                                </span>
                            )}

                            <span>
                                Channel: room:{roomData.id.substring(0, 8)}...
                            </span>
                        </div>
                    </div>
                </div>
            </TooltipProvider>
        </div>
    );
}
