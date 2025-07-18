'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group';
import { Label } from '~/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible';
import { ChevronDown, Settings, Zap } from 'lucide-react';
import {
    getPresetsForRoundType,
    getPresetById,
    generateDynamicSequence,
    isPresetAvailable,
    getAvailablePresets,
    getUnavailablePresets,
    getPresetRequirementText
} from '~/constants/veto-presets';
import type { VetoPreset } from '~/constants/veto-presets';

interface VetoPresetSelectorProps {
    roundType: 'bo1' | 'bo3' | 'bo5';
    mapCount: number;
    selectedPresetId?: string;
    onPresetSelectAction: (presetId: string | null, sequence: Array<{ team: 'team-a' | 'team-b'; action: 'ban' | 'pick' | 'side' }>) => void;
    onCustomizeAction: () => void;
}

export function VetoPresetSelector({
    roundType,
    mapCount,
    selectedPresetId,
    onPresetSelectAction,
    onCustomizeAction
}: VetoPresetSelectorProps) {
    const [isOpen, setIsOpen] = useState(true);

    const allPresets = getPresetsForRoundType(roundType);
    const availablePresets = getAvailablePresets(roundType, mapCount);
    const unavailablePresets = getUnavailablePresets(roundType, mapCount);

    const handlePresetChange = (presetId: string) => {
        if (presetId === 'custom') {
            onCustomizeAction();
            return;
        }

        const preset = getPresetById(presetId);
        if (preset && isPresetAvailable(preset, mapCount)) {
            onPresetSelectAction(presetId, preset.sequence);
        }
    };

    const handleQuickStart = () => {
        const sequence = generateDynamicSequence(roundType, mapCount, false);
        onPresetSelectAction(null, sequence);
    };

    const getSequencePreview = (preset: VetoPreset) => {
        return preset.sequence.map((step, index) => (
            <Badge
                key={index}
                variant={
                    step.action === 'ban' ? 'destructive' :
                        step.action === 'pick' ? 'default' :
                            'secondary'
                }
                className="text-xs"
            >
                {step.team === 'team-a' ? 'A' : 'B'}-{step.action === 'side' ? 'SIDE' : step.action.toUpperCase()}
            </Badge>
        ));
    };

    return (
        <Card>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Zap className="w-5 h-5" />
                                    Veto Format
                                </CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Choose a predefined veto sequence or customize your own
                                </p>
                            </div>
                            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </div>
                    </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Quick Start Option */}
                            <div className="p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium text-blue-900 dark:text-blue-100">Quick Start</h3>
                                        <p className="text-sm text-blue-700 dark:text-blue-300">
                                            Use the standard format for {roundType.toUpperCase()} with {mapCount} maps
                                        </p>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {generateDynamicSequence(roundType, mapCount, false).map((step, index) => (
                                                <Badge
                                                    key={index}
                                                    variant={
                                                        step.action === 'ban' ? 'destructive' :
                                                            step.action === 'pick' ? 'default' :
                                                                'secondary'
                                                    }
                                                    className="text-xs"
                                                >
                                                    {step.team === 'team-a' ? 'A' : 'B'}-{step.action === 'side' ? 'SIDE' : step.action.toUpperCase()}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <Button onClick={handleQuickStart} className="bg-blue-600 hover:bg-blue-700">
                                        Use Standard
                                    </Button>
                                </div>
                            </div>

                            {/* Preset Selection */}
                            {allPresets.length > 0 && (
                                <div>
                                    <h3 className="font-medium mb-3">Preset Formats</h3>
                                    <RadioGroup
                                        value={selectedPresetId ?? ''}
                                        onValueChange={handlePresetChange}
                                        className="space-y-3"
                                    >
                                        {/* Available Presets */}
                                        {availablePresets.map((preset) => (
                                            <div key={preset.id} className="flex items-start space-x-3 space-y-0">
                                                <RadioGroupItem
                                                    value={preset.id}
                                                    id={preset.id}
                                                    className="mt-1"
                                                />
                                                <div className="flex-1">
                                                    <Label htmlFor={preset.id} className="cursor-pointer">
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium">{preset.name}</span>
                                                                <Badge variant="outline" className="text-xs">
                                                                    {preset.roundType.toUpperCase()}
                                                                </Badge>
                                                                <Badge variant="default" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                                                    Available
                                                                </Badge>
                                                            </div>
                                                            <p className="text-sm text-muted-foreground">
                                                                {preset.description}
                                                            </p>
                                                            <div className="flex flex-wrap gap-1">
                                                                {getSequencePreview(preset)}
                                                            </div>
                                                        </div>
                                                    </Label>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Unavailable Presets */}
                                        {unavailablePresets.map((preset) => (
                                            <div key={preset.id} className="flex items-start space-x-3 space-y-0 opacity-60">
                                                <RadioGroupItem
                                                    value={preset.id}
                                                    id={preset.id}
                                                    className="mt-1"
                                                    disabled
                                                />
                                                <div className="flex-1">
                                                    <Label htmlFor={preset.id} className="cursor-not-allowed">
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-muted-foreground">{preset.name}</span>
                                                                <Badge variant="outline" className="text-xs">
                                                                    {preset.roundType.toUpperCase()}
                                                                </Badge>
                                                                <Badge variant="destructive" className="text-xs">
                                                                    {getPresetRequirementText(preset)}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-sm text-muted-foreground">
                                                                {preset.description}
                                                            </p>
                                                            <div className="flex flex-wrap gap-1">
                                                                {getSequencePreview(preset)}
                                                            </div>
                                                        </div>
                                                    </Label>
                                                </div>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>
                            )}

                            {/* Custom Option */}
                            <div className="pt-4 border-t">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium">Custom Format</h3>
                                        <p className="text-sm text-muted-foreground">
                                            Build your own veto sequence with drag and drop
                                        </p>
                                    </div>
                                    <Button variant="outline" onClick={onCustomizeAction}>
                                        <Settings className="w-4 h-4 mr-2" />
                                        Customize
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
