import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { MapCard } from './map-card';
import type { ActionType } from '~/types/veto';

interface AvailableMapsProps {
    availableMaps: string[];
    isMyTurn: boolean;
    currentAction?: ActionType;
    onMapAction: (mapId: string, action: ActionType) => void;
    canInteract: boolean;
}

export const AvailableMaps = ({
    availableMaps,
    isMyTurn,
    currentAction,
    onMapAction,
    canInteract
}: AvailableMapsProps) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Available Maps</CardTitle>
                <CardDescription>
                    {isMyTurn && currentAction
                        ? `Click a map to ${currentAction} it`
                        : 'Maps still in the pool'
                    }
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {availableMaps.map((mapId) => (
                        <MapCard
                            key={mapId}
                            mapId={mapId}
                            canInteract={canInteract}
                            action={currentAction}
                            onClick={() => canInteract && currentAction && onMapAction(mapId, currentAction)}
                        />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};
