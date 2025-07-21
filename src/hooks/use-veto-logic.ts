import { useState, useCallback } from 'react';
import { api } from '~/trpc/react';
import type { VetoState, TeamType, ActionType, SideType } from '~/types/veto';
import { MAP_DATA } from '~/constants/maps';
import { useSupabaseRoomUpdates } from '~/hooks/use-supabase-realtime';

interface UseVetoLogicProps {
    masterRoomId: string; // For realtime subscriptions
    teamRoomId: string;   // For API calls
    teamRole?: TeamType;
    isSpectator?: boolean;
    roundType?: string;
    onVetoComplete?: () => void;
}

export const useVetoLogic = ({
    masterRoomId,
    teamRoomId,
    teamRole,
    isSpectator = false,
    roundType,
    onVetoComplete
}: UseVetoLogicProps) => {
    const [showSideSelection, setShowSideSelection] = useState(false);
    const [pendingMapId, setPendingMapId] = useState<string | null>(null);

    // Queries - use masterRoomId to get shared veto state
    const vetoStateQuery = api.room.getVetoState.useQuery(
        { roomId: masterRoomId },
        { refetchInterval: 2000 }
    );

    // Supabase realtime updates for veto actions - use masterRoomId for shared updates
    const handleVetoUpdate = useCallback((update: { type: string; data?: Record<string, unknown> }) => {
        console.log('Received veto update:', update);

        if (update.type === 'veto-action' || update.type === 'side-selected' || update.type === 'veto-started') {
            // Refetch veto state when veto actions occur
            void vetoStateQuery.refetch();
        }
    }, [vetoStateQuery]);

    const { broadcastVetoUpdate, latency: realtimeLatency, isConnected: realtimeConnected } = useSupabaseRoomUpdates({
        roomId: masterRoomId, // Use masterRoomId for shared realtime channel
        enabled: !isSpectator,
        onUpdate: handleVetoUpdate,
    });

    // Mutations
    const makeVetoActionMutation = api.room.makeVetoAction.useMutation({
        onSuccess: (result) => {
            void vetoStateQuery.refetch();
            setShowSideSelection(false);
            setPendingMapId(null);

            // Broadcast the veto action to other clients
            void broadcastVetoUpdate('veto-action', {
                vetoState: result.vetoState,
                currentTurn: result.currentTurn,
                vetoCompleted: result.vetoCompleted,
            });

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
            setShowSideSelection(false);
            setPendingMapId(null);

            // Broadcast the side selection to other clients
            void broadcastVetoUpdate('side-selected', {
                vetoState: result.vetoState,
                currentTurn: result.currentTurn,
                vetoCompleted: result.vetoCompleted,
            });

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
    const vetoState = vetoData?.vetoState as VetoState | null;
    const currentSequenceItem = vetoState?.vetoSequence[vetoState.currentStep];
    const isMyTurn = !isSpectator && teamRole === vetoData?.currentTurn;
    const vetoStarted = vetoData?.vetoStarted ?? false;
    const vetoCompleted = vetoData?.vetoCompleted ?? false;

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

        // Handle side action type
        if (action === 'side') {
            // For side actions, we need to trigger side selection for the most recently picked map
            const mostRecentPickedMap = vetoState?.pickedMaps[vetoState.pickedMaps.length - 1];
            if (mostRecentPickedMap) {
                setPendingMapId(mostRecentPickedMap.mapId);
                setShowSideSelection(true);
            }
            return;
        }

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
                            teamId: teamRoomId, // Use teamRoomId for API calls
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
                        teamId: teamRoomId, // Use teamRoomId for API calls
                        action,
                        mapId,
                    });
                } catch (error) {
                    console.error('Failed to make veto action:', error);
                }
            }
        } else if (action === 'pick') {
            // Check if the next action in sequence is a side action by the same or different team
            const nextSequenceItem = vetoState?.vetoSequence[vetoState.currentStep + 1];
            const shouldTriggerSideSelection = !nextSequenceItem || nextSequenceItem.action !== 'side';

            if (shouldTriggerSideSelection && !mapData?.isDemolition) {
                // Non-demolition maps: require side selection
                setPendingMapId(mapId);
                setShowSideSelection(true);
            } else {
                // Direct pick action (either demolition map or side will be handled separately)
                try {
                    await makeVetoActionMutation.mutateAsync({
                        teamId: teamRoomId, // Use teamRoomId for API calls
                        action,
                        mapId,
                    });
                } catch (error) {
                    console.error('Failed to make veto action:', error);
                }
            }
        } else {
            // Direct ban action
            try {
                await makeVetoActionMutation.mutateAsync({
                    teamId: teamRoomId, // Use teamRoomId for API calls
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
                    teamId: teamRoomId, // Use teamRoomId for API calls
                    mapId: mapForSideSelection,
                    side,
                });
            } else if (pendingMapId) {
                // Check if current action is a 'side' action in the sequence
                const currentAction = currentSequenceItem?.action;

                if (currentAction === 'side') {
                    // This is a dedicated side action step
                    await makeVetoActionMutation.mutateAsync({
                        teamId: teamRoomId, // Use teamRoomId for API calls
                        action: 'side',
                        mapId: pendingMapId,
                        side,
                    });
                } else {
                    // This is a side selection after a pick
                    await makeVetoActionMutation.mutateAsync({
                        teamId: teamRoomId, // Use teamRoomId for API calls
                        action: 'pick',
                        mapId: pendingMapId,
                        side,
                    });
                }
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

        // Realtime connection info
        realtimeLatency,
        realtimeConnected,
    };
};
