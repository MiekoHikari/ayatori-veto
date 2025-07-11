'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Copy, Users, Eye, Crown, Clock } from 'lucide-react';
import { api } from '~/trpc/react';

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
    teamAName?: string;
    teamBName?: string;
    status: 'waiting' | 'active' | 'completed' | 'expired';
}

interface RoomCreationProps {
    maps: string[];
    roundType: string;
    onRoomCreatedAction: (roomData: RoomData) => void;
}

export default function RoomCreation({ maps, roundType, onRoomCreatedAction: onRoomCreated }: RoomCreationProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [roomData, setRoomData] = useState<RoomData | null>(null);

    const createRoomMutation = api.room.create.useMutation();

    const createRoom = async () => {
        setIsCreating(true);

        try {
            // Generate room IDs
            const masterRoomId = generateRoomId();
            const teamAId = generateRoomId();
            const teamBId = generateRoomId();
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now

            // Create room links with separate IDs for teams
            const baseUrl = window.location.origin;
            const teamALink = `${baseUrl}/${teamAId}`;
            const teamBLink = `${baseUrl}/${teamBId}`;
            const spectatorLink = `${baseUrl}/${masterRoomId}`;

            // Create room using tRPC
            await createRoomMutation.mutateAsync({
                masterRoomId,
                teamAId,
                teamBId,
                teamALink,
                teamBLink,
                spectatorLink,
                expiresAt,
                maps,
                roundType,
            });

            // Transform the mutation result to match RoomData interface
            const newRoomData: RoomData = {
                id: masterRoomId,
                teamAId,
                teamBId,
                teamALink,
                teamBLink,
                spectatorLink,
                createdAt: new Date().toISOString(),
                expiresAt,
                maps,
                roundType,
                teamAReady: false,
                teamBReady: false,
                status: 'waiting' as const,
            };

            setRoomData(newRoomData);
            onRoomCreated(newRoomData);

        } catch (error) {
            console.error('Error creating room:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const generateRoomId = (): string => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const copyToClipboard = async (text: string, _label: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (error) {
            console.error('Failed to copy:', error);
            // Fallback for browsers that don't support clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
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

    if (!roomData) {
        return (
            <Card className="w-full max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>Create Veto Room</CardTitle>
                    <CardDescription>
                        Create a room for teams to participate in the map veto process.
                        Each team will receive a unique secure link that prevents role spoofing.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-muted/50 rounded-lg p-4">
                                <h3 className="font-semibold mb-2">Configuration</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Round Type:</span>
                                        <span className="font-medium">{getRoundLabel(roundType)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Maps Selected:</span>
                                        <span className="font-medium">{maps.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Room Duration:</span>
                                        <span className="font-medium">24 hours</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-4">
                                <h3 className="font-semibold mb-2">Room Features</h3>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        <span>Team A & B private links</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Eye className="w-4 h-4" />
                                        <span>Spectator viewing link</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        <span>24-hour expiration</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <Button
                                onClick={createRoom}
                                disabled={isCreating}
                                size="lg"
                                className="min-w-48"
                            >
                                {isCreating ? 'Creating Room...' : 'Create Room'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5" />
                    Room Created: {roomData.id}
                </CardTitle>
                <CardDescription>
                    Share these links with the teams and spectators. Each team gets a unique secure link that prevents role spoofing.
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
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Team A Link */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            Team A Link
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                value={roomData.teamALink}
                                readOnly
                                className="font-mono text-sm"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(roomData.teamALink, 'Team A')}
                            >
                                <Copy className="w-4 h-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Valid for 24 hours. Each team gets a unique secure link.
                        </p>
                    </div>

                    {/* Team B Link */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            Team B Link
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                value={roomData.teamBLink}
                                readOnly
                                className="font-mono text-sm"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(roomData.teamBLink, 'Team B')}
                            >
                                <Copy className="w-4 h-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Valid for 24 hours. Each team gets a unique secure link.
                        </p>
                    </div>

                    {/* Spectator Link */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            Spectator Link
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                value={roomData.spectatorLink}
                                readOnly
                                className="font-mono text-sm"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(roomData.spectatorLink, 'Spectator')}
                            >
                                <Copy className="w-4 h-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Always open for viewing unless the room has expired.
                        </p>
                    </div>

                    <div className="pt-4 border-t">
                        <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
                            <div className="text-sm text-muted-foreground">
                                Room will expire on {new Date(roomData.expiresAt).toLocaleDateString()} at {new Date(roomData.expiresAt).toLocaleTimeString()}
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => window.open(roomData.spectatorLink, '_blank')}
                            >
                                <Eye className="w-4 h-4 mr-2" />
                                View as Spectator
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
