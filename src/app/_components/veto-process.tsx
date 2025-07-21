'use client';

import { Card, CardHeader, CardTitle } from '~/components/ui/card';
import { useVetoLogic } from '~/hooks/use-veto-logic';
import { CurrentTurnIndicator } from './veto/current-turn-indicator';
import { SideSelection } from './veto/side-selection';
import { AvailableMaps } from './veto/available-maps';
import { VetoCompleted } from './veto/veto-completed';
import { MapPoolOverview } from './veto/map-pool-overview';
import { VetoProgress } from './veto/veto-progress';
import { ConnectionRefreshPrompt } from '~/components/ui/connection-refresh-prompt';
import type { VetoProcessProps } from '~/types/veto';

export default function VetoProcess({
    masterRoomId,
    teamRoomId,
    teamRole,
    isSpectator = false,
    teamAName,
    teamBName,
    roundType,
    onVetoComplete
}: VetoProcessProps) {
    const {
        // State
        showSideSelection,
        pendingMapId,

        // Computed values
        vetoState,
        currentSequenceItem,
        isMyTurn,
        vetoStarted,
        vetoCompleted,
        isLoading,

        // Helper functions
        shouldShowOppositeSideSelection,
        getMapForSideSelection,

        // Action handlers
        handleMapAction,
        handleSideSelection,
        handleCancelSideSelection,

        // Mutation states
        isActionPending,

        // Realtime connection info
        realtimeLatency,
        realtimeRefreshPrompt,
        realtimeFailureCount,
    } = useVetoLogic({
        masterRoomId,
        teamRoomId,
        teamRole,
        isSpectator,
        roundType,
        onVetoComplete
    });

    const handleRefreshPage = () => {
        // Force a hard page refresh to restore connection
        window.location.reload();
    };

    const handleDismissRefreshPrompt = () => {
        // This could be enhanced to temporarily dismiss but we'll keep it simple
        // The prompt will reappear if connection issues persist
        console.log('User dismissed veto connection refresh prompt');
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Loading Veto Process...</CardTitle>
                </CardHeader>
            </Card>
        );
    }

    if (!vetoStarted) {
        return <MapPoolOverview />;
    }

    if (vetoCompleted && vetoState) {
        return (
            <VetoCompleted
                vetoState={vetoState}
                teamAName={teamAName}
                teamBName={teamBName}
            />
        );
    }

    if (!vetoState) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Error: Unable to load veto state</CardTitle>
                </CardHeader>
            </Card>
        );
    }

    const canInteract = isMyTurn &&
        currentSequenceItem &&
        !showSideSelection &&
        !shouldShowOppositeSideSelection();

    const shouldShowSideSelectionModal = showSideSelection ||
        shouldShowOppositeSideSelection() ||
        (isMyTurn && currentSequenceItem?.action === 'side');

    const sideSelectionMapId = pendingMapId ??
        getMapForSideSelection() ??
        (currentSequenceItem?.action === 'side' ?
            vetoState?.pickedMaps.find(map => !map.side)?.mapId :
            null);

    return (
        <div className="space-y-6">
            {/* Current Turn Indicator */}
            <CurrentTurnIndicator
                currentSequenceItem={currentSequenceItem}
                isMyTurn={isMyTurn}
                teamRole={teamRole}
                teamAName={teamAName}
                teamBName={teamBName}
                shouldShowOppositeSideSelection={shouldShowOppositeSideSelection()}
            />

            {/* Side Selection Modal */}
            {shouldShowSideSelectionModal && sideSelectionMapId && (
                <SideSelection
                    mapId={sideSelectionMapId}
                    isOpponentMap={shouldShowOppositeSideSelection()}
                    isFinalMap={vetoState && (vetoState.currentStep + 1) >= vetoState.vetoSequence.length}
                    onSelectSide={handleSideSelection}
                    onCancel={!shouldShowOppositeSideSelection() ? handleCancelSideSelection : undefined}
                    isLoading={isActionPending}
                    showCancel={!shouldShowOppositeSideSelection()}
                />
            )}

            {/* Available Maps - Only show for ban/pick actions, not side actions */}
            {vetoState.availableMaps.length > 0 && currentSequenceItem?.action !== 'side' && (
                <AvailableMaps
                    availableMaps={vetoState.availableMaps}
                    isMyTurn={isMyTurn}
                    currentAction={currentSequenceItem?.action}
                    onMapAction={handleMapAction}
                    canInteract={!!canInteract}
                />
            )}

            {/* Veto Progress */}
            <VetoProgress
                vetoState={vetoState}
                teamAName={teamAName}
                teamBName={teamBName}
            />

            {/* Connection Refresh Prompt - Only during active veto */}
            <ConnectionRefreshPrompt
                isVisible={realtimeRefreshPrompt && vetoStarted && !vetoCompleted}
                onRefresh={handleRefreshPage}
                onDismiss={handleDismissRefreshPrompt}
                connectionFailureCount={realtimeFailureCount}
                latency={realtimeLatency}
            />
        </div>
    );
}
