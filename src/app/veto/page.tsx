"use client";
import { ArrowLeft } from 'lucide-react';
import React, { useState } from 'react'
import { Button } from '~/components/ui/button';
import RoomCreation from './_components/room-creation';
import MapSelection from './_components/map-selection';

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
    status: 'waiting' | 'active' | 'completed' | 'expired';
}

function Veto() {
    const [showVeto, setShowVeto] = useState(false);
    const [roomData, setRoomData] = useState<RoomData | null>(null);
    const [showRoomCreation, setShowRoomCreation] = useState(false);
    const [selectedMaps, setSelectedMaps] = useState<string[]>([]);
    const [roundType, setRoundType] = useState<string>('');

    const handleBackToSelection = () => {
        setShowVeto(false);
        setShowRoomCreation(false);
        setRoomData(null);
    };

    const handleRoomCreated = (newRoomData: RoomData) => {
        setRoomData(newRoomData);
        setShowVeto(true);
    };

    const handleMapsSelected = (maps: string[], round: string) => {
        setSelectedMaps(maps);
        setRoundType(round);
        setShowRoomCreation(true);
    };

    if (!showRoomCreation && !showVeto) {
        return (
            <div className="container mx-auto p-6">
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold mb-4">Map Veto Tool</h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Start by selecting which maps you want to include in your veto pool and choose your round format.
                        All settings will be saved in the URL so you can easily share your preset with others.
                    </p>
                </div>
                <MapSelection onMapsSelected={handleMapsSelected} />
            </div>
        );
    }

    if (showRoomCreation && !showVeto) {
        return (
            <div className="container mx-auto p-6">
                <div className="mb-6">
                    <Button
                        variant="outline"
                        onClick={handleBackToSelection}
                        className="mb-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Map Selection
                    </Button>
                    <h1 className="text-4xl font-bold mb-2">Create Veto Room</h1>
                    <p className="text-muted-foreground">
                        Set up a room for teams to join and participate in the veto process.
                    </p>
                </div>
                <RoomCreation
                    maps={selectedMaps}
                    roundType={roundType}
                    onRoomCreated={handleRoomCreated}
                />
            </div>
        );
    }

    // Show room links/management screen
    if (showVeto && roomData) {
        return (
            <div className="container mx-auto p-6">
                <div className="mb-6">
                    <Button
                        variant="outline"
                        onClick={handleBackToSelection}
                        className="mb-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Map Selection
                    </Button>
                    <h1 className="text-4xl font-bold mb-2">Room Ready</h1>
                    <p className="text-muted-foreground">
                        Your veto room has been created successfully. Share the links with teams and spectators.
                    </p>
                </div>
                <RoomCreation
                    maps={selectedMaps}
                    roundType={roundType}
                    onRoomCreated={handleRoomCreated}
                />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <div className="text-center">
                <p>Loading...</p>
            </div>
        </div>
    )
}

export default Veto