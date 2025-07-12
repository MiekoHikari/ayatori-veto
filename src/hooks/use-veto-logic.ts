import { useState } from 'react';
import { api } from '~/trpc/react';
import type { VetoState, TeamType, ActionType, SideType } from '~/types/veto';
import { MAP_DATA } from '~/constants/maps';

interface UseVetoLogicProps {
    roomId: string;
    teamRole?: TeamType;
    isSpectator?: boolean;
    roundType?: string;
    onVetoComplete?: () => void;
}

export const useVetoLogic = ({
    roomId,
    teamRole,
    isSpectator = false,
    roundType,
    onVetoComplete
}: UseVetoLogicProps) => {
    const [showSideSelection, setShowSideSelection] = useState(false);
    const [pendingMapId, setPendingMapId] = useState<string | null>(null);

    // Queries
    const vetoStateQuery = api.room.getVetoState.useQuery(
        { roomId },
        { refetchInterval: 2000 }
    );

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

    // Computed values
    const vetoData = vetoStateQuery.data;
    const roomData = roomUpdatesQuery.data;
    const vetoState = vetoData?.vetoState as VetoState | null;
    const currentSequenceItem = vetoState?.vetoSequence[vetoState.currentStep];
    const isMyTurn = !isSpectator && teamRole === vetoData?.currentTurn;
    const vetoStarted = roomData?.vetoStarted ?? vetoData?.vetoStarted ?? false;
    const vetoCompleted = roomData?.vetoCompleted ?? vetoData?.vetoCompleted ?? false;

    // Helper functions
    const shouldShowOppositeSideSelection = (): boolean => {
        if (!vetoState || vetoState.pickedMaps.length === 0) return false;

        const mapWithoutSide = vetoState.pickedMaps.find(
            pick => !pick.side && pick.pickedBy !== teamRole
        );

        return !!mapWithoutSide &&
            !vetoCompleted &&
            vetoData?.currentTurn === teamRole;
    };

    const getMapForSideSelection = (): string | null => {
        if (!vetoState || vetoState.pickedMaps.length === 0) return null;

        const mapWithoutSide = vetoState.pickedMaps.find(
            pick => !pick.side && pick.pickedBy !== teamRole
        );

        return mapWithoutSide?.mapId ?? null;
    };

    // Action handlers
    const handleMapAction = async (mapId: string, action: ActionType): Promise<void> => {
        if (!teamRole || !isMyTurn) return;

        const mapData = MAP_DATA[mapId];

        if (action === 'pick' && mapData?.isDemolition) {
            const isFinalPick = vetoState &&
                (vetoState.currentStep + 1) >= vetoState.vetoSequence.length;

            if (isFinalPick) {
                const isBo5 = roundType === 'bo5';

                if (isBo5) {
                    // Bo5 final map: opposing team chooses side
                    try {
                        await makeVetoActionMutation.mutateAsync({
                            teamId: roomId,
                            action,
                            mapId,
                        });
                    } catch (error) {
                        console.error('Failed to make veto action:', error);
                    }
                } else {
                    // Bo1/Bo3 final map: picking team selects side
                    setPendingMapId(mapId);
                    setShowSideSelection(true);
                }
            } else {
                // Non-final demolition maps: opposing team chooses side
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
        } else if (action === 'pick') {
            // Non-demolition maps: require side selection
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

    const handleSideSelection = async (side: SideType): Promise<void> => {
        if (!teamRole) return;

        try {
            const mapForSideSelection = getMapForSideSelection();

            if (mapForSideSelection && shouldShowOppositeSideSelection()) {
                await selectSideForMapMutation.mutateAsync({
                    teamId: roomId,
                    mapId: mapForSideSelection,
                    side,
                });
            } else if (pendingMapId) {
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

    const handleCancelSideSelection = (): void => {
        setShowSideSelection(false);
        setPendingMapId(null);
    };

    return {
        // State
        showSideSelection,
        pendingMapId,

        // Computed values
        vetoState,
        currentSequenceItem,
        isMyTurn,
        vetoStarted,
        vetoCompleted,
        isLoading: vetoStateQuery.isLoading,

        // Helper functions
        shouldShowOppositeSideSelection,
        getMapForSideSelection,

        // Action handlers
        handleMapAction,
        handleSideSelection,
        handleCancelSideSelection,

        // Mutation states
        isActionPending: makeVetoActionMutation.isPending || selectSideForMapMutation.isPending,
    };
};
