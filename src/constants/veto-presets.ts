// Veto sequence presets for different round types and scenarios
export interface VetoStep {
    team: 'team-a' | 'team-b';
    action: 'ban' | 'pick' | 'side';
    completed: boolean;
}

export interface VetoPreset {
    id: string;
    name: string;
    description: string;
    roundType: 'bo1' | 'bo3' | 'bo5';
    minMaps: number;
    maxMaps?: number;
    exactMaps?: number; // If set, this preset requires exactly this many maps
    sequence: Omit<VetoStep, 'completed'>[];
}

// Predefined veto presets
export const VETO_PRESETS: VetoPreset[] = [
    // BO1 Presets
    {
        id: 'bo1-ayatori',
        name: 'Ayatori BO1',
        description: 'Map Veto based on Ayatori\'s Rules and Regulations - Requires exactly 7 maps',
        roundType: 'bo1',
        minMaps: 7,
        exactMaps: 7,
        sequence: [
            { team: 'team-a', action: 'ban' },
            { team: 'team-b', action: 'ban' },
            { team: 'team-a', action: 'ban' },
            { team: 'team-b', action: 'ban' },
            { team: 'team-a', action: 'ban' },
            { team: 'team-b', action: 'ban' },
            { team: 'team-b', action: 'pick' },
            { team: 'team-a', action: 'side' }
        ]
    },
    {
        id: 'bo1-mightymeow',
        name: 'Mighty Meow BO1',
        description: 'Map Veto based on Mighty Meow\'s Rules and Regulations - Requires exactly 7 maps',
        roundType: 'bo1',
        minMaps: 7,
        exactMaps: 7,
        sequence: [
            { team: 'team-a', action: 'ban' },
            { team: 'team-b', action: 'ban' },
            { team: 'team-a', action: 'ban' },
            { team: 'team-b', action: 'ban' },
            { team: 'team-a', action: 'ban' },
            { team: 'team-b', action: 'ban' },
            { team: 'team-b', action: 'pick' },
            { team: 'team-a', action: 'side' }
        ]
    },
    // BO3 Presets
    {
        id: 'bo3-ayatori',
        name: 'Ayatori BO3',
        description: 'Map Veto based on Ayatori\'s Rules and Regulations - Requires exactly 7 maps',
        roundType: 'bo3',
        minMaps: 7,
        exactMaps: 7,
        sequence: [
            { team: 'team-a', action: 'ban' },
            { team: 'team-b', action: 'ban' },
            { team: 'team-a', action: 'pick' },
            { team: 'team-b', action: 'side' },
            { team: 'team-b', action: 'pick' },
            { team: 'team-a', action: 'side' },
            { team: 'team-a', action: 'ban' },
            { team: 'team-b', action: 'ban' },
            { team: 'team-b', action: 'pick' },
            { team: 'team-a', action: 'side' }
        ]
    },
    {
        id: 'bo3-mightymeow',
        name: 'Mighty Meow BO3',
        description: 'Map Veto based on Mighty Meow\'s Rules and Regulations - Requires exactly 7 maps',
        roundType: 'bo3',
        minMaps: 7,
        exactMaps: 7,
        sequence: [
            { team: 'team-a', action: 'ban' },
            { team: 'team-b', action: 'ban' },
            { team: 'team-a', action: 'pick' },
            { team: 'team-b', action: 'side' },
            { team: 'team-b', action: 'pick' },
            { team: 'team-a', action: 'side' },
            { team: 'team-a', action: 'ban' },
            { team: 'team-b', action: 'ban' },
            { team: 'team-b', action: 'pick' },
            { team: 'team-a', action: 'side' }
        ]
    },

    // BO5 Presets
    {
        id: 'bo5-ayatori',
        name: 'Ayatori BO5',
        description: 'Map Veto based on Ayatori\'s Rules and Regulations - Requires exactly 7 maps',
        roundType: 'bo5',
        minMaps: 7,
        exactMaps: 7,
        sequence: [
            { team: 'team-a', action: 'ban' },
            { team: 'team-b', action: 'ban' },

            { team: 'team-a', action: 'pick' },
            { team: 'team-b', action: 'side' },

            { team: 'team-b', action: 'pick' },
            { team: 'team-a', action: 'side' },

            { team: 'team-a', action: 'pick' },
            { team: 'team-b', action: 'side' },

            { team: 'team-b', action: 'pick' },
            { team: 'team-a', action: 'side' },

            { team: 'team-b', action: 'pick' },
            { team: 'team-a', action: 'side' }
        ]
    },
    {
        id: 'bo5-mightymeow',
        name: 'Mighty Meow BO5',
        description: 'Map Veto based on Mighty Meow\'s Rules and Regulations - Requires exactly 7 maps',
        roundType: 'bo5',
        minMaps: 7,
        exactMaps: 7,
        sequence: [
            { team: 'team-a', action: 'ban' },
            { team: 'team-b', action: 'ban' },

            { team: 'team-a', action: 'pick' },
            { team: 'team-b', action: 'side' },

            { team: 'team-b', action: 'pick' },
            { team: 'team-a', action: 'side' },

            { team: 'team-a', action: 'pick' },
            { team: 'team-b', action: 'side' },

            { team: 'team-b', action: 'pick' },
            { team: 'team-a', action: 'side' },

            { team: 'team-b', action: 'pick' },
            { team: 'team-a', action: 'side' }
        ]
    }
];

// Utility functions
export const getPresetsForRoundType = (roundType: 'bo1' | 'bo3' | 'bo5'): VetoPreset[] => {
    return VETO_PRESETS.filter(preset => preset.roundType === roundType);
};

export const getPresetById = (id: string): VetoPreset | undefined => {
    return VETO_PRESETS.find(preset => preset.id === id);
};

export const isPresetAvailable = (preset: VetoPreset, mapCount: number): boolean => {
    if (preset.exactMaps) {
        return mapCount === preset.exactMaps;
    }
    return mapCount >= preset.minMaps && (!preset.maxMaps || mapCount <= preset.maxMaps);
};

export const getAvailablePresets = (roundType: 'bo1' | 'bo3' | 'bo5', mapCount: number): VetoPreset[] => {
    return getPresetsForRoundType(roundType).filter(preset => isPresetAvailable(preset, mapCount));
};

export const getUnavailablePresets = (roundType: 'bo1' | 'bo3' | 'bo5', mapCount: number): VetoPreset[] => {
    return getPresetsForRoundType(roundType).filter(preset => !isPresetAvailable(preset, mapCount));
};

export const getPresetRequirementText = (preset: VetoPreset): string => {
    if (preset.exactMaps) {
        return `Requires exactly ${preset.exactMaps} maps`;
    }
    return `Requires ${preset.minMaps}+ maps`;
};

export const validateVetoSequence = (
    sequence: Omit<VetoStep, 'completed'>[],
    roundType: 'bo1' | 'bo3' | 'bo5',
    mapCount: number
): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (sequence.length === 0) {
        errors.push('Veto sequence cannot be empty');
        return { isValid: false, errors };
    }

    const bans = sequence.filter(step => step.action === 'ban').length;
    const picks = sequence.filter(step => step.action === 'pick').length;
    const sides = sequence.filter(step => step.action === 'side').length;

    // Validate picks match round type
    const expectedPicks = roundType === 'bo1' ? 1 : roundType === 'bo3' ? 3 : 5;
    if (picks !== expectedPicks) {
        errors.push(`${roundType.toUpperCase()} requires exactly ${expectedPicks} picks, but sequence has ${picks}`);
    }

    // Validate side actions don't exceed picks (can't have more side choices than maps)
    if (sides > picks) {
        errors.push(`Cannot have more side choices (${sides}) than picked maps (${picks})`);
    }

    // Validate total map-related steps don't exceed map count (sides don't consume maps)
    if (bans + picks > mapCount) {
        errors.push(`Sequence requires ${bans + picks} maps but only ${mapCount} available`);
    }

    // Validate minimum maps available
    if (mapCount - bans < picks) {
        errors.push(`Not enough maps remain after bans to complete picks`);
    }

    // Special validation for Ayatori and Mighty Meow presets
    // These presets are designed specifically for 7 maps and break with other counts
    const isAyatoriOrMightyMeow = (
        bans === 6 && picks === 1 && roundType === 'bo1' // BO1 Ayatori/Mighty Meow pattern
    ) || (
            bans === 4 && picks === 3 && roundType === 'bo3' // BO3 Ayatori/Mighty Meow pattern
        ) || (
            bans === 2 && picks === 5 && roundType === 'bo5' // BO5 Ayatori/Mighty Meow pattern
        );

    if (isAyatoriOrMightyMeow && mapCount !== 7) {
        errors.push(`This veto format is designed for exactly 7 maps (Ayatori/Mighty Meow rules)`);
    }

    // Validate side actions come after their corresponding picks
    const pickIndices: number[] = [];
    const sideIndices: number[] = [];

    sequence.forEach((step, index) => {
        if (step.action === 'pick') {
            pickIndices.push(index);
        } else if (step.action === 'side') {
            sideIndices.push(index);
        }
    });

    // Basic validation: each side action should come after at least one pick
    if (sides > 0 && pickIndices.length === 0) {
        errors.push('Side actions require at least one map to be picked first');
    }

    return { isValid: errors.length === 0, errors };
};

export const generateDynamicSequence = (
    roundType: 'bo1' | 'bo3' | 'bo5',
    mapCount: number,
    includeSidePicks = true
): Omit<VetoStep, 'completed'>[] => {
    const sequence: Omit<VetoStep, 'completed'>[] = [];

    const expectedPicks = roundType === 'bo1' ? 1 : roundType === 'bo3' ? 3 : 5;
    const bansNeeded = mapCount - expectedPicks;

    // Add alternating bans
    for (let i = 0; i < bansNeeded; i++) {
        sequence.push({
            team: i % 2 === 0 ? 'team-a' : 'team-b',
            action: 'ban'
        });
    }

    // Add alternating picks with optional side choices
    for (let i = 0; i < expectedPicks; i++) {
        const pickingTeam = i % 2 === 0 ? 'team-a' : 'team-b';

        // Add pick action
        sequence.push({
            team: pickingTeam,
            action: 'pick'
        });

        // Add side choice action if enabled
        if (includeSidePicks) {
            // For fairness, alternate who chooses sides, or let the non-picking team choose
            const sideChoosingTeam = roundType === 'bo1'
                ? pickingTeam  // In BO1, picker chooses side
                : pickingTeam === 'team-a' ? 'team-b' : 'team-a'; // In BO3/BO5, opposing team chooses side

            sequence.push({
                team: sideChoosingTeam,
                action: 'side'
            });
        }
    }

    return sequence;
};
