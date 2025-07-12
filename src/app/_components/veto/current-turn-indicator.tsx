import { Card, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Clock, Ban, Target, Shield } from 'lucide-react';
import { getTeamDisplayName } from '~/lib/veto-utils';
import type { VetoState, TeamType } from '~/types/veto';

interface CurrentTurnIndicatorProps {
    currentSequenceItem?: VetoState['vetoSequence'][0];
    isMyTurn: boolean;
    teamRole?: TeamType;
    teamAName: string | null;
    teamBName: string | null;
    shouldShowOppositeSideSelection: boolean;
}

export const CurrentTurnIndicator = ({
    currentSequenceItem,
    isMyTurn,
    teamRole,
    teamAName,
    teamBName,
    shouldShowOppositeSideSelection
}: CurrentTurnIndicatorProps) => {
    return (
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
                                    {getTeamDisplayName(currentSequenceItem.team, teamAName, teamBName)}
                                </span>&apos;s turn to{' '}
                                <strong className={
                                    currentSequenceItem.action === 'ban' ? 'text-red-500' :
                                        currentSequenceItem.action === 'pick' ? 'text-green-500' :
                                            'text-blue-500'
                                }>
                                    {currentSequenceItem.action === 'side' ? 'choose side for' : currentSequenceItem.action}
                                </strong>{' '}
                                {currentSequenceItem.action === 'side' ? 'the map' : 'a map'}
                            </span>
                            {currentSequenceItem.action === 'ban' ? (
                                <Ban className="w-4 h-4 text-red-500" />
                            ) : currentSequenceItem.action === 'pick' ? (
                                <Target className="w-4 h-4 text-green-500" />
                            ) : (
                                <Shield className="w-4 h-4 text-blue-500" />
                            )}
                        </div>
                    )}
                    {isMyTurn && (
                        <Badge variant="default" className="mt-2 animate-pulse">
                            🎯 Your Turn
                        </Badge>
                    )}
                    {shouldShowOppositeSideSelection && (
                        <Badge variant="secondary" className="mt-2 animate-bounce">
                            Choose Your Starting Side
                        </Badge>
                    )}
                </CardDescription>
            </CardHeader>
        </Card>
    );
};
