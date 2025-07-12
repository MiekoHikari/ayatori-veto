'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Trash2, Plus, GripVertical, RotateCcw, Save } from 'lucide-react';
import {
    getPresetsForRoundType,
    getPresetById,
    validateVetoSequence,
    generateDynamicSequence
} from '~/constants/veto-presets';
import type { VetoPreset } from '~/constants/veto-presets';

interface VetoOrderBuilderProps {
    roundType: 'bo1' | 'bo3' | 'bo5';
    mapCount: number;
    initialSequence?: Array<{ team: 'team-a' | 'team-b'; action: 'ban' | 'pick' | 'side' }>;
    onSequenceChangeAction: (sequence: Array<{ team: 'team-a' | 'team-b'; action: 'ban' | 'pick' | 'side' }>) => void;
    onPresetSaveAction?: (preset: Omit<VetoPreset, 'id'>) => void;
}

export function VetoOrderBuilder({
    roundType,
    mapCount,
    initialSequence,
    onSequenceChangeAction,
    onPresetSaveAction
}: VetoOrderBuilderProps) {
    const [sequence, setSequence] = useState<Array<{ team: 'team-a' | 'team-b'; action: 'ban' | 'pick' | 'side' }>>(
        initialSequence ?? generateDynamicSequence(roundType, mapCount, true)
    );
    const [selectedPreset, setSelectedPreset] = useState<string>('');
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    const presets = getPresetsForRoundType(roundType);

    // Validate sequence whenever it changes
    useEffect(() => {
        const validation = validateVetoSequence(sequence, roundType, mapCount);
        setValidationErrors(validation.errors);

        if (validation.isValid) {
            onSequenceChangeAction(sequence);
        }
    }, [sequence, roundType, mapCount, onSequenceChangeAction]);

    // Reset sequence when round type or map count changes
    useEffect(() => {
        if (!initialSequence) {
            const newSequence = generateDynamicSequence(roundType, mapCount, true);
            setSequence(newSequence);
        }
    }, [roundType, mapCount, initialSequence]);

    const handlePresetSelect = (presetId: string) => {
        setSelectedPreset(presetId);
        const preset = getPresetById(presetId);
        if (preset && mapCount >= preset.minMaps) {
            setSequence([...preset.sequence]);
        }
    };

    const handleAddStep = () => {
        const newStep: { team: 'team-a' | 'team-b'; action: 'ban' | 'pick' | 'side' } = {
            team: 'team-a',
            action: 'ban'
        };
        setSequence([...sequence, newStep]);
    };

    const handleRemoveStep = (index: number) => {
        const newSequence = sequence.filter((_, i) => i !== index);
        setSequence(newSequence);
    };

    const handleStepChange = (index: number, field: 'team' | 'action', value: string) => {
        const newSequence = [...sequence];
        if (field === 'team') {
            newSequence[index] = {
                ...newSequence[index]!,
                team: value as 'team-a' | 'team-b'
            };
        } else {
            newSequence[index] = {
                ...newSequence[index]!,
                action: value as 'ban' | 'pick' | 'side'
            };
        }
        setSequence(newSequence);
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();

        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            return;
        }

        const newSequence = [...sequence];
        const draggedItem = newSequence[draggedIndex];

        if (!draggedItem) {
            setDraggedIndex(null);
            return;
        }

        // Remove dragged item
        newSequence.splice(draggedIndex, 1);

        // Insert at new position
        const adjustedDropIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
        newSequence.splice(adjustedDropIndex, 0, draggedItem);

        setSequence(newSequence);
        setDraggedIndex(null);
    };

    const handleReset = () => {
        const defaultSequence = generateDynamicSequence(roundType, mapCount, true);
        setSequence(defaultSequence);
        setSelectedPreset('');
    };

    const getStepSummary = () => {
        const bans = sequence.filter(step => step.action === 'ban').length;
        const picks = sequence.filter(step => step.action === 'pick').length;
        const sides = sequence.filter(step => step.action === 'side').length;
        const teamAActions = sequence.filter(step => step.team === 'team-a').length;
        const teamBActions = sequence.filter(step => step.team === 'team-b').length;

        return { bans, picks, sides, teamAActions, teamBActions };
    };

    const summary = getStepSummary();

    return (
        <Card className="w-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Veto Order Builder</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Customize the veto sequence for {roundType.toUpperCase()} with {mapCount} maps
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleReset}>
                            <RotateCcw className="w-4 h-4 mr-1" />
                            Reset
                        </Button>
                        {onPresetSaveAction && validationErrors.length === 0 && (
                            <Button variant="outline" size="sm">
                                <Save className="w-4 h-4 mr-1" />
                                Save Preset
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Preset Selection */}
                <div>
                    <label className="text-sm font-medium mb-2 block">Choose a Preset</label>
                    <Select value={selectedPreset} onValueChange={handlePresetSelect}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a veto preset" />
                        </SelectTrigger>
                        <SelectContent>
                            {presets
                                .filter(preset => mapCount >= preset.minMaps)
                                .map(preset => (
                                    <SelectItem key={preset.id} value={preset.id}>
                                        <div>
                                            <div className="font-medium">{preset.name}</div>
                                            <div className="text-xs text-muted-foreground">{preset.description}</div>
                                        </div>
                                    </SelectItem>
                                ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                    <Alert variant="destructive">
                        <AlertDescription>
                            <ul className="list-disc list-inside">
                                {validationErrors.map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Summary */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{summary.bans}</div>
                        <div className="text-sm text-muted-foreground">Bans</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{summary.picks}</div>
                        <div className="text-sm text-muted-foreground">Picks</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{summary.sides}</div>
                        <div className="text-sm text-muted-foreground">Sides</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{summary.teamAActions}</div>
                        <div className="text-sm text-muted-foreground">Team A</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{summary.teamBActions}</div>
                        <div className="text-sm text-muted-foreground">Team B</div>
                    </div>
                </div>

                {/* Sequence Builder */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium">Veto Sequence</label>
                        <Button variant="outline" size="sm" onClick={handleAddStep}>
                            <Plus className="w-4 h-4 mr-1" />
                            Add Step
                        </Button>
                    </div>

                    <div className="space-y-2">
                        {sequence.map((step, index) => (
                            <div
                                key={index}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, index)}
                                className={`
                                    flex items-center gap-3 p-3 bg-muted/30 rounded-lg border 
                                    cursor-move hover:bg-muted/50 transition-colors
                                    ${draggedIndex === index ? 'opacity-50' : ''}
                                `}
                            >
                                <GripVertical className="w-4 h-4 text-muted-foreground" />

                                <div className="flex items-center gap-2 text-sm font-medium min-w-16">
                                    <span className="text-muted-foreground">#{index + 1}</span>
                                </div>

                                <Select
                                    value={step.team}
                                    onValueChange={(value) => handleStepChange(index, 'team', value)}
                                >
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="team-a">Team A</SelectItem>
                                        <SelectItem value="team-b">Team B</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={step.action}
                                    onValueChange={(value) => handleStepChange(index, 'action', value)}
                                >
                                    <SelectTrigger className="w-24">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ban">Ban</SelectItem>
                                        <SelectItem value="pick">Pick</SelectItem>
                                        <SelectItem value="side">Side</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Badge
                                    variant={
                                        step.action === 'ban' ? 'destructive' :
                                            step.action === 'pick' ? 'default' :
                                                'secondary'
                                    }
                                    className="min-w-12"
                                >
                                    {step.action === 'ban' ? 'BAN' : step.action === 'pick' ? 'PICK' : 'SIDE'}
                                </Badge>

                                <Badge
                                    variant="outline"
                                    className={step.team === 'team-a' ? 'border-blue-500 text-blue-600' : 'border-purple-500 text-purple-600'}
                                >
                                    {step.team === 'team-a' ? 'Team A' : 'Team B'}
                                </Badge>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveStep(index)}
                                    className="ml-auto text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sequence Preview */}
                <div>
                    <label className="text-sm font-medium mb-2 block">Sequence Preview</label>
                    <div className="flex flex-wrap gap-1">
                        {sequence.map((step, index) => (
                            <Badge
                                key={index}
                                variant={step.action === 'ban' ? 'destructive' : 'default'}
                                className="text-xs"
                            >
                                {step.team === 'team-a' ? 'A' : 'B'}-{step.action.toUpperCase()}
                            </Badge>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
