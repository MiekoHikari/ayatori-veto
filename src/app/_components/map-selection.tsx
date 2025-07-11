'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Checkbox } from '~/components/ui/checkbox';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';

const ALL_MAPS = [
    { id: 'area88', name: 'Area 88', categories: ['Demolition', 'Ranked'], image: '/maps/Area88.png' },
    { id: 'base404', name: 'Base 404', categories: ['Demolition', 'Ranked'], image: '/maps/Base404.png' },
    { id: 'port_euler', name: 'Port Euler', categories: ['Demolition'], image: '/maps/PortEuler.png' },
    { id: 'space_lab', name: 'Space Lab', categories: ['Demolition', 'Ranked'], image: '/maps/SpaceLab.png' },
    { id: 'windy_town', name: 'Windy Town', categories: ['Demolition', 'Ranked'], image: '/maps/WindyTown.png' },
    { id: 'cauchy_street', name: 'Cauchy Street', categories: ['Demolition', 'Ranked'], image: '/maps/CauchyStreet.png' },
    { id: 'cosmite', name: 'Cosmite', categories: ['Demolition', 'Ranked'], image: '/maps/Cosmite.png' },
    { id: 'ocarnus', name: 'Ocarnus', categories: ['Demolition', 'Ranked'], image: '/maps/Ocarnus.png' },

];

// Get all unique categories from maps
const getAllCategories = () => {
    const categories = new Set<string>();
    ALL_MAPS.forEach(map => {
        map.categories.forEach(category => categories.add(category));
    });
    return ['All', ...Array.from(categories).sort()];
};

const CATEGORIES = getAllCategories();

const ROUND_OPTIONS = [
    { value: 'bo1', label: 'Best of 1', maps: 1 },
    { value: 'bo3', label: 'Best of 3', maps: 3 },
    { value: 'bo5', label: 'Best of 5', maps: 5 },
];

interface MapSelectionProps {
    onMapsSelectedAction: (maps: string[], roundType: string) => void;
}

function MapSelectionContent({ onMapsSelectedAction: onMapsSelected }: MapSelectionProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [selectedMaps, setSelectedMaps] = useState<string[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<string>('All');
    const [roundType, setRoundType] = useState<string>('bo1');

    // Initialize selected maps and round type from URL params
    useEffect(() => {
        const mapsFromUrl = searchParams.get('maps');
        const roundFromUrl = searchParams.get('round');

        if (mapsFromUrl) {
            const maps = mapsFromUrl.split(',').filter(map =>
                ALL_MAPS.some(m => m.id === map)
            );
            setSelectedMaps(maps);
        }

        if (roundFromUrl && ROUND_OPTIONS.some(option => option.value === roundFromUrl)) {
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

    const filteredMaps = categoryFilter === 'All'
        ? ALL_MAPS
        : ALL_MAPS.filter(map => map.categories.includes(categoryFilter));

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
        onMapsSelected(selectedMaps, roundType);
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
                            {ROUND_OPTIONS.find(opt => opt.value === roundType)?.maps} map(s) needed
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

                <div className="flex justify-end gap-2">
                    <div className="flex flex-col items-end gap-2">
                        {selectedMaps.length > 0 && (
                            <p className="text-sm text-muted-foreground">
                                Selected: {selectedMaps.length} maps for {ROUND_OPTIONS.find(opt => opt.value === roundType)?.label}
                            </p>
                        )}
                        <Button
                            onClick={handleConfirm}
                            disabled={selectedMaps.length === 0}
                            className="min-w-24"
                        >
                            Continue with {ROUND_OPTIONS.find(opt => opt.value === roundType)?.label}
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