import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Shield, Zap } from 'lucide-react';
import { getMapDisplayName } from '~/lib/veto-utils';
import type { SideType } from '~/types/veto';

interface SideSelectionProps {
    mapId: string;
    isOpponentMap?: boolean;
    isFinalMap?: boolean;
    onSelectSide: (side: SideType) => void;
    onCancel?: () => void;
    isLoading?: boolean;
    showCancel?: boolean;
}

export const SideSelection = ({
    mapId,
    isOpponentMap = false,
    isFinalMap = false,
    onSelectSide,
    onCancel,
    isLoading = false,
    showCancel = true
}: SideSelectionProps) => {
    return (
        <Card className="border-primary shadow-xl animate-in slide-in-from-top-4 duration-300">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Shield className="w-4 h-4" />
                    </div>
                    Choose Starting Side
                </CardTitle>
                <CardDescription>
                    {isOpponentMap ? (
                        <>
                            The opposing team picked{' '}
                            <span className="font-medium text-foreground">
                                {getMapDisplayName(mapId)}
                            </span>
                            . Choose which side you want to start on.
                        </>
                    ) : (
                        <>
                            {isFinalMap ? (
                                <>
                                    Select which side you want to start on for the final map{' '}
                                    <span className="font-medium text-foreground">
                                        {getMapDisplayName(mapId)}
                                    </span>
                                </>
                            ) : (
                                <>
                                    Select which side you want to start on for{' '}
                                    <span className="font-medium text-foreground">
                                        {getMapDisplayName(mapId)}
                                    </span>
                                </>
                            )}
                        </>
                    )}
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <Button
                        variant="outline"
                        onClick={() => onSelectSide('attack')}
                        disabled={isLoading}
                        className="h-20 flex flex-col gap-2 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-200"
                    >
                        <Zap className="w-6 h-6 text-red-500" />
                        <span className="font-medium">Attack</span>
                        <span className="text-xs text-muted-foreground">Aggressive playstyle</span>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => onSelectSide('defense')}
                        disabled={isLoading}
                        className="h-20 flex flex-col gap-2 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all duration-200"
                    >
                        <Shield className="w-6 h-6 text-blue-500" />
                        <span className="font-medium">Defense</span>
                        <span className="text-xs text-muted-foreground">Defensive playstyle</span>
                    </Button>
                </div>
                {showCancel && onCancel && (
                    <Button
                        variant="ghost"
                        onClick={onCancel}
                        className="w-full"
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                )}
            </CardContent>
        </Card>
    );
};
