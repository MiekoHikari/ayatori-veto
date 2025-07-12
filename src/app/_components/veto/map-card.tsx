import Image from 'next/image';
import { Badge } from '~/components/ui/badge';
import { Ban, Target } from 'lucide-react';
import { MAP_DATA } from '~/constants/maps';
import { getMapDisplayName } from '~/lib/veto-utils';
import type { ActionType } from '~/types/veto';

interface MapCardProps {
    mapId: string;
    onClick?: () => void;
    canInteract?: boolean;
    action?: ActionType;
    className?: string;
    showBannedOverlay?: boolean;
}

export const MapCard = ({
    mapId,
    onClick,
    canInteract = false,
    action,
    className = '',
    showBannedOverlay = false
}: MapCardProps) => {
    const mapData = MAP_DATA[mapId];

    return (
        <div
            className={`group relative cursor-pointer transition-all duration-300 ${canInteract
                    ? 'hover:scale-105 hover:shadow-lg transform-gpu'
                    : 'opacity-75'
                } ${className}`}
            onClick={canInteract ? onClick : undefined}
        >
            <div
                className={`relative w-full aspect-video rounded-lg overflow-hidden border-2 transition-all duration-200 ${canInteract
                        ? action === 'ban'
                            ? 'hover:border-red-500 border-transparent'
                            : 'hover:border-green-500 border-transparent'
                        : 'border-muted'
                    }`}
            >
                <Image
                    src={mapData?.image ?? '/maps/placeholder.png'}
                    alt={mapData?.name ?? mapId}
                    fill
                    className={`object-cover transition-all duration-200 group-hover:brightness-110 ${showBannedOverlay ? 'grayscale opacity-60' : ''
                        }`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Banned overlay */}
                {showBannedOverlay && (
                    <>
                        <div className="absolute inset-0 bg-red-500/20" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Ban className="w-8 h-8 text-red-500" />
                        </div>
                        <Badge variant="destructive" className="absolute -top-2 -right-2 text-xs">
                            Banned
                        </Badge>
                    </>
                )}

                {/* Map name overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="text-white font-semibold text-sm mb-1">
                        {getMapDisplayName(mapId)}
                    </h3>
                    {mapData?.isDemolition && (
                        <Badge variant="secondary" className="text-xs">
                            Demolition
                        </Badge>
                    )}
                </div>

                {/* Action overlay */}
                {canInteract && action && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Badge
                                variant={action === 'ban' ? 'destructive' : 'default'}
                                className="text-sm px-3 py-1 animate-in zoom-in-50 duration-200"
                            >
                                {action === 'ban' ? (
                                    <>
                                        <Ban className="w-3 h-3 mr-1" />
                                        Ban
                                    </>
                                ) : (
                                    <>
                                        <Target className="w-3 h-3 mr-1" />
                                        Pick
                                    </>
                                )}
                            </Badge>
                        </div>
                    </div>
                )}

                {/* Disabled overlay */}
                {!canInteract && !showBannedOverlay && (
                    <div className="absolute inset-0 bg-black/40" />
                )}
            </div>
        </div>
    );
};
