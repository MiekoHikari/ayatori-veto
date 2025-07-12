import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Clock, Swords } from 'lucide-react';
import { MAP_DATA } from '~/constants/maps';

export const MapPoolOverview = () => {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Swords className="w-5 h-5" />
                        Map Pool Overview
                    </CardTitle>
                    <CardDescription>
                        The veto process will automatically start when both teams are ready. Here are the maps in the pool:
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Object.entries(MAP_DATA).map(([mapId, mapData]) => (
                            <div key={mapId} className="map-grid-item group relative map-pool-card map-pool-glow">
                                <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-muted shadow-lg transition-all duration-300 group-hover:border-primary/50 group-hover:shadow-xl map-pool-shimmer">
                                    <Image
                                        src={mapData.image}
                                        alt={mapData.name}
                                        fill
                                        className="object-cover transition-all duration-300 group-hover:brightness-110 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                                    {/* Map info overlay */}
                                    <div className="absolute bottom-0 left-0 right-0 p-4 transform transition-all duration-300 group-hover:translate-y-0 translate-y-1">
                                        <h3 className="text-white font-bold text-lg mb-2 drop-shadow-lg">
                                            {mapData.name}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            {mapData.isDemolition && (
                                                <Badge variant="secondary" className="text-xs backdrop-blur-sm bg-white/20">
                                                    Demolition
                                                </Badge>
                                            )}
                                            <Badge variant="outline" className="text-xs bg-white/10 text-white border-white/20 backdrop-blur-sm">
                                                Available
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Hover effect overlay */}
                                    <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-all duration-300" />

                                    {/* Subtle corner decoration */}
                                    <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-white/30 transition-all duration-300 group-hover:border-white/60"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                        <Clock className="w-5 h-5" />
                        Waiting for Veto Process
                    </CardTitle>
                    <CardDescription className="text-amber-600 dark:text-amber-400">
                        The veto process will begin automatically once both teams are ready. Make sure your team is prepared!
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-4">
                        <div className="flex items-center gap-3 text-amber-700 dark:text-amber-300">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500"></div>
                            <span className="font-medium">Veto will begin automatically...</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
