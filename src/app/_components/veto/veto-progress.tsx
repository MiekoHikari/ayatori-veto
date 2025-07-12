import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Ban, Target, CheckCircle, Shield, Zap } from 'lucide-react';
import { MAP_DATA } from '~/constants/maps';
import { getMapDisplayName, getTeamDisplayName, formatTimestamp } from '~/lib/veto-utils';
import type { VetoState } from '~/types/veto';

interface VetoProgressProps {
    vetoState: VetoState;
    teamAName: string | null;
    teamBName: string | null;
}

export const VetoProgress = ({ vetoState, teamAName, teamBName }: VetoProgressProps) => {
    return (
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
                                    {getTeamDisplayName(step.team, teamAName, teamBName)} {step.action}
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
                                                        {getTeamDisplayName(action.team, teamAName, teamBName)}
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
                                                {formatTimestamp(action.timestamp)}
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
    );
};
