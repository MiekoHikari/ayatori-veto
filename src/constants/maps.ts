// Map data with all properties needed across the application
export interface MapInfo {
    id: string;
    name: string;
    image: string;
    categories: string[];
    isDemolition: boolean;
}

// All available maps in the game
export const ALL_MAPS: MapInfo[] = [
    { id: 'area88', name: 'Area 88', categories: ['Demolition', 'Ranked'], image: '/maps/Area88.png', isDemolition: true },
    { id: 'base404', name: 'Base 404', categories: ['Demolition', 'Ranked'], image: '/maps/Base404.png', isDemolition: true },
    { id: 'port_euler', name: 'Port Euler', categories: ['Demolition'], image: '/maps/PortEuler.png', isDemolition: true },
    { id: 'space_lab', name: 'Space Lab', categories: ['Demolition', 'Ranked'], image: '/maps/SpaceLab.png', isDemolition: true },
    { id: 'windy_town', name: 'Windy Town', categories: ['Demolition', 'Ranked'], image: '/maps/WindyTown.png', isDemolition: true },
    { id: 'cauchy_street', name: 'Cauchy Street', categories: ['Demolition', 'Ranked'], image: '/maps/CauchyStreet.png', isDemolition: true },
    { id: 'cosmite', name: 'Cosmite', categories: ['Demolition', 'Ranked'], image: '/maps/Cosmite.png', isDemolition: true },
    { id: 'ocarnus', name: 'Ocarnus', categories: ['Demolition', 'Ranked'], image: '/maps/Ocarnus.png', isDemolition: true },
];

// Map data as a Record for quick lookups (used by veto-process and room page)
export const MAP_DATA: Record<string, { name: string; image: string; isDemolition: boolean }> =
    ALL_MAPS.reduce((acc, map) => {
        acc[map.id] = {
            name: map.name,
            image: map.image,
            isDemolition: map.isDemolition
        };
        return acc;
    }, {} as Record<string, { name: string; image: string; isDemolition: boolean }>);

// Round options for match types
export interface RoundOption {
    value: string;
    label: string;
    maps: number;
}

export const ROUND_OPTIONS: RoundOption[] = [
    { value: 'bo1', label: 'Best of 1', maps: 1 },
    { value: 'bo3', label: 'Best of 3', maps: 3 },
    { value: 'bo5', label: 'Best of 5', maps: 5 },
];

// Utility functions

/**
 * Get all unique categories from maps
 */
export const getAllCategories = (): string[] => {
    const categories = new Set<string>();
    ALL_MAPS.forEach(map => {
        map.categories.forEach(category => categories.add(category));
    });
    return ['All', ...Array.from(categories).sort()];
};

/**
 * Get map info by ID
 */
export const getMapById = (mapId: string): MapInfo | undefined => {
    return ALL_MAPS.find(map => map.id === mapId);
};

/**
 * Get map name by ID (fallback to ID if not found)
 */
export const getMapName = (mapId: string): string => {
    return MAP_DATA[mapId]?.name ?? mapId;
};

/**
 * Get round option by value
 */
export const getRoundOption = (value: string): RoundOption | undefined => {
    return ROUND_OPTIONS.find(option => option.value === value);
};

/**
 * Get round label by value (fallback to value if not found)
 */
export const getRoundLabel = (value: string): string => {
    return getRoundOption(value)?.label ?? value;
};

/**
 * Filter maps by category
 */
export const filterMapsByCategory = (category: string): MapInfo[] => {
    if (category === 'All') {
        return ALL_MAPS;
    }
    return ALL_MAPS.filter(map => map.categories.includes(category));
};

/**
 * Validate if map IDs exist in the map pool
 */
export const validateMapIds = (mapIds: string[]): string[] => {
    return mapIds.filter(mapId => MAP_DATA[mapId]);
};

/**
 * Check if a round type is valid
 */
export const isValidRoundType = (roundType: string): boolean => {
    return ROUND_OPTIONS.some(option => option.value === roundType);
};
