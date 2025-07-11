'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Eye, Crown, Clock, CheckCircle, XCircle, Edit } from 'lucide-react';
import { api } from '~/trpc/react';
import VetoProcess from '../../_components/veto-process';

interface RoomData {
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
    teamAName: string | null;
    teamBName: string | null;
    status: 'waiting' | 'active' | 'completed' | 'expired';
    masterRoomId?: string;
    teamRole?: 'team-a' | 'team-b';
    vetoStarted?: boolean;
    vetoCompleted?: boolean;
    currentTurn?: string | null;
    vetoState?: unknown;
}

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

    const updateTeamReadyMutation = api.room.updateTeamReady.useMutation();
    const updateTeamNameMutation = api.room.updateTeamName.useMutation();

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

    const getRoundLabel = (roundValue: string) => {
        const roundOptions = [
            { value: 'bo1', label: 'Best of 1' },
            { value: 'bo3', label: 'Best of 3' },
            { value: 'bo5', label: 'Best of 5' },
        ];
        return roundOptions.find(opt => opt.value === roundValue)?.label ?? roundValue;
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

                        {/* Team Actions */}
                        {!isSpectator && (
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

                        {/* Maps */}
                        <div className="border-t pt-4">
                            <h3 className="font-semibold mb-3">Maps in Pool</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {roomData.maps.map((map) => (
                                    <Badge key={map} variant="outline" className="justify-center py-2">
                                        {map}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {/* Room Info */}
                        <div className="border-t pt-4">
                            <div className="text-sm text-muted-foreground">
                                Room created on {new Date(roomData.createdAt).toLocaleDateString()} at {new Date(roomData.createdAt).toLocaleTimeString()}
                            </div>
                        </div>

                        {/* Veto Process */}
                        {roomData.teamAReady && roomData.teamBReady && (
                            <div className="border-t pt-6">
                                <VetoProcess
                                    roomId={roomId}
                                    teamRole={roomData.teamRole}
                                    isSpectator={isSpectator}
                                    teamAName={roomData.teamAName}
                                    teamBName={roomData.teamBName}
                                />
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
