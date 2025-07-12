'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Checkbox } from '~/components/ui/checkbox';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { ALL_MAPS, ROUND_OPTIONS, getAllCategories, getRoundOption, filterMapsByCategory, validateMapIds, isValidRoundType } from '~/constants/maps';
import { VetoPresetSelector } from './veto/veto-preset-selector';
import { VetoOrderBuilder } from './veto/veto-order-builder';

const CATEGORIES = getAllCategories();

interface MapSelectionProps {
    onMapsSelectedAction: (maps: string[], roundType: string, vetoSequence?: Array<{ team: 'team-a' | 'team-b'; action: 'ban' | 'pick' | 'side' }>) => void;
}

function MapSelectionContent({ onMapsSelectedAction: onMapsSelected }: MapSelectionProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [selectedMaps, setSelectedMaps] = useState<string[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<string>('All');
    const [roundType, setRoundType] = useState<string>('bo1');
    const [showVetoCustomization, setShowVetoCustomization] = useState(false);
    const [selectedPresetId, setSelectedPresetId] = useState<string>();
    const [customVetoSequence, setCustomVetoSequence] = useState<Array<{ team: 'team-a' | 'team-b'; action: 'ban' | 'pick' | 'side' }>>();

    // Initialize selected maps and round type from URL params
    useEffect(() => {
        const mapsFromUrl = searchParams.get('maps');
        const roundFromUrl = searchParams.get('round');

        if (mapsFromUrl) {
            const maps = validateMapIds(mapsFromUrl.split(','));
            setSelectedMaps(maps);
        }

        if (roundFromUrl && isValidRoundType(roundFromUrl)) {
            setRoundType(roundFromUrl);
        }
    }, [searchParams]);

    // Update URL when maps or round type change
    useEffect(() => {
        const params = new URLSearchParams(searchParams);

        if (selectedMaps.length > 0) {
            params.set('maps', selectedMaps.join(','));
        } else {
            params.delete('maps');
        }

        params.set('round', roundType);

        router.push(`?${params.toString()}`, { scroll: false });
    }, [selectedMaps, roundType, router, searchParams]);

    const toggleMap = (mapId: string) => {
        setSelectedMaps(prev =>
            prev.includes(mapId)
                ? prev.filter(id => id !== mapId)
                : [...prev, mapId]
        );
    };

    const filteredMaps = filterMapsByCategory(categoryFilter);

    const selectAll = () => {
        setSelectedMaps(filteredMaps.map(map => map.id));
    };

    const selectAllVisible = () => {
        const visibleMapIds = filteredMaps.map(map => map.id);
        setSelectedMaps(prev => {
            const newSelected = [...prev];
            visibleMapIds.forEach(id => {
                if (!newSelected.includes(id)) {
                    newSelected.push(id);
                }
            });
            return newSelected;
        });
    };

    const clearAll = () => {
        setSelectedMaps([]);
    };

    const handleConfirm = () => {
        onMapsSelected(selectedMaps, roundType, customVetoSequence);
    };

    const handlePresetSelectAction = (presetId: string | null, sequence: Array<{ team: 'team-a' | 'team-b'; action: 'ban' | 'pick' | 'side' }>) => {
        setSelectedPresetId(presetId ?? undefined);
        setCustomVetoSequence(sequence);
        setShowVetoCustomization(false);
    };

    const handleCustomizeAction = () => {
        setShowVetoCustomization(true);
    };

    const handleVetoSequenceChangeAction = (sequence: Array<{ team: 'team-a' | 'team-b'; action: 'ban' | 'pick' | 'side' }>) => {
        setCustomVetoSequence(sequence);
    };

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Select Map Pool & Round Type</CardTitle>
                <CardDescription>
                    Choose which maps to include in your veto pool and select the round format. Maps can belong to multiple categories. All settings will be saved in the URL for easy sharing.
                </CardDescription>

                {/* Round Type Selection */}
                <div className="flex flex-col gap-4 mt-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Round Type:</span>
                            <Select value={roundType} onValueChange={setRoundType}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ROUND_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                            {getRoundOption(roundType)?.maps} map(s) needed
                        </Badge>
                    </div>

                    {/* Map Selection Controls */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline">
                                {selectedMaps.length} of {ALL_MAPS.length} maps selected
                            </Badge>
                            <Badge variant="secondary">
                                {filteredMaps.length} visible
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Filter by category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORIES.map((category) => (
                                        <SelectItem key={category} value={category}>
                                            {category}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-2 ml-auto">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={categoryFilter === 'All' ? selectAll : selectAllVisible}
                                disabled={
                                    categoryFilter === 'All'
                                        ? selectedMaps.length === ALL_MAPS.length
                                        : filteredMaps.every(map => selectedMaps.includes(map.id))
                                }
                            >
                                Select {categoryFilter === 'All' ? 'All' : 'Visible'}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={clearAll}
                                disabled={selectedMaps.length === 0}
                            >
                                Clear All
                            </Button>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {filteredMaps.map((map) => (
                        <div
                            key={map.id}
                            className={`group relative overflow-hidden rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-lg hover:scale-[1.02] ${selectedMaps.includes(map.id)
                                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                : 'border-border hover:border-primary/50'
                                }`}
                            onClick={() => toggleMap(map.id)}
                        >
                            <div className="relative h-32 w-full overflow-hidden">
                                <Image
                                    src={map.image}
                                    alt={`${map.name} map preview`}
                                    fill
                                    className="object-cover transition-transform duration-200 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                                <div className="absolute top-2 right-2">
                                    <Checkbox
                                        id={map.id}
                                        checked={selectedMaps.includes(map.id)}
                                        onChange={() => toggleMap(map.id)}
                                        className="bg-white/90 border-white/50 shadow-lg"
                                    />
                                </div>
                            </div>
                            <div className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                                            {map.name}
                                        </h3>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {map.categories.map((category, _index) => (
                                                <Badge
                                                    key={category}
                                                    variant="outline"
                                                    className="text-xs px-1 py-0"
                                                >
                                                    {category}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <Badge
                                        variant={selectedMaps.includes(map.id) ? "default" : "secondary"}
                                        className="text-xs"
                                    >
                                        {selectedMaps.includes(map.id) ? 'Selected' : 'Available'}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredMaps.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">No maps found for the selected category.</p>
                    </div>
                )}

                {/* Veto Order Configuration */}
                {selectedMaps.length > 0 && (
                    <div className="mt-8 space-y-4">
                        {!showVetoCustomization ? (
                            <VetoPresetSelector
                                roundType={roundType as 'bo1' | 'bo3' | 'bo5'}
                                mapCount={selectedMaps.length}
                                selectedPresetId={selectedPresetId}
                                onPresetSelectAction={handlePresetSelectAction}
                                onCustomizeAction={handleCustomizeAction}
                            />
                        ) : (
                            <VetoOrderBuilder
                                roundType={roundType as 'bo1' | 'bo3' | 'bo5'}
                                mapCount={selectedMaps.length}
                                initialSequence={customVetoSequence}
                                onSequenceChangeAction={handleVetoSequenceChangeAction}
                            />
                        )}
                    </div>
                )}

                <div className="flex justify-between gap-2 mt-6">
                    {showVetoCustomization && (
                        <Button
                            variant="outline"
                            onClick={() => setShowVetoCustomization(false)}
                        >
                            Back to Presets
                        </Button>
                    )}
                    <div className="flex flex-col items-end gap-2 ml-auto">
                        {selectedMaps.length > 0 && (
                            <p className="text-sm text-muted-foreground">
                                Selected: {selectedMaps.length} maps for {getRoundOption(roundType)?.label}
                                {customVetoSequence && (
                                    <span className="text-green-600 ml-2">
                                        • Veto order configured
                                    </span>
                                )}
                            </p>
                        )}
                        <Button
                            onClick={handleConfirm}
                            disabled={selectedMaps.length === 0}
                            className="min-w-24"
                        >
                            Create Room
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function MapSelection({ onMapsSelectedAction }: MapSelectionProps) {
    return (
        <Suspense fallback={
            <Card className="w-full max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>Loading Map Selection...</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">Loading maps...</p>
                    </div>
                </CardContent>
            </Card>
        }>
            <MapSelectionContent onMapsSelectedAction={onMapsSelectedAction} />
        </Suspense>
    );
}