# Veto System Documentation

## Overview
The veto system handles map selection for different match formats (Bo1, Bo3, Bo5) with fair side selection for demolition maps.

## Key Features

### 🎯 **Fair Side Selection for Demolition Maps**
- When a team picks a demolition map, the **opposing team** chooses the starting side
- This ensures fairness since the team that doesn't get to pick the map gets to choose their preferred side
- All maps in this game are currently configured as demolition maps

### 🔄 **Pick/Ban Orders**

#### **Bo1 (Best of 1)**
- Teams alternate banning maps until only 1 map remains
- Pattern: `Ban → Ban → Ban → Ban → ...` (until 1 map left)
- The remaining map is played

#### **Bo3 (Best of 3)**
- **Phase 1**: Each team bans 1 map
- **Phase 2**: Each team picks 1 map  
- **Phase 3**: Each team bans 1 map
- **Phase 4**: Team A picks the final map (Team B chooses side)
- Pattern: `Team A Ban → Team B Ban → Team A Pick → Team B Pick → Team A Ban → Team B Ban → Team A Pick`

#### **Bo5 (Best of 5)**
- **Phase 1**: Each team bans 1 map
- **Phase 2**: Teams alternate picking 5 maps
- Pattern: `Team A Ban → Team B Ban → Team A Pick → Team B Pick → Team A Pick → Team B Pick → Team A Pick`

## Code Location

### 📁 **Where to Modify Pick/Ban Orders**

The pick/ban sequence generation is located in:
**File**: `src/server/api/routers/room.ts`
**Function**: `generateVetoSequence(roundType: string, mapCount: number)`
**Lines**: ~227-284

```typescript
const generateVetoSequence = (roundType: string, mapCount: number) => {
    const sequence: Array<{ team: 'team-a' | 'team-b', action: 'ban' | 'pick', completed: boolean }> = [];

    if (roundType === 'bo1') {
        // Bo1 logic here
    } else if (roundType === 'bo3') {
        // Bo3 logic here  
    } else if (roundType === 'bo5') {
        // Bo5 logic here
    }

    return sequence;
};
```

### 🛠 **How to Modify**

1. **Add New Match Format**:
   ```typescript
   } else if (roundType === 'bo7') {
       // Custom Bo7 logic
       sequence.push({ team: 'team-a', action: 'ban', completed: false });
       // ... more steps
   ```

2. **Change Existing Format**:
   - Modify the sequence array for the desired format
   - Each step is an object with `team`, `action`, and `completed` properties
   - `team`: 'team-a' or 'team-b'
   - `action`: 'ban' or 'pick'

3. **Example Custom Bo3**:
   ```typescript
   } else if (roundType === 'bo3') {
       // Custom: Ban-Ban-Pick-Pick-Pick format
       sequence.push({ team: 'team-a', action: 'ban', completed: false });
       sequence.push({ team: 'team-b', action: 'ban', completed: false });
       sequence.push({ team: 'team-a', action: 'pick', completed: false });
       sequence.push({ team: 'team-b', action: 'pick', completed: false });
       sequence.push({ team: 'team-a', action: 'pick', completed: false });
   ```

## Side Selection Logic

### 📍 **Current Implementation**
- **File**: `src/server/api/routers/room.ts`
- **Function**: `makeVetoAction` (handles map picks)
- **Function**: `selectSideForMap` (handles side selection)

### 🔄 **Flow for Demolition Maps**
1. Team picks a map (no side selection required)
2. System automatically switches turn to opposing team
3. Opposing team selects attack/defense side
4. Veto continues with next step in sequence

### ⚙️ **Configuration**
- All maps are currently marked as demolition maps (`isDemolitionMap = true`)
- To add non-demolition maps, modify the `MAP_DATA` object in `veto-process.tsx`

## Frontend Components

### 📱 **Main Component**
**File**: `src/app/veto/_components/veto-process.tsx`
- Handles the UI for map selection and side selection
- Shows different states: waiting, in-progress, and completed
- Implements real-time updates via tRPC

### 🎨 **Visual Features**
- Map images with hover effects
- Animated progress indicators  
- Side selection modal with attack/defense options
- Real-time turn indicators
- Action history with map thumbnails

## API Endpoints

### 🔌 **tRPC Procedures**
1. `makeVetoAction` - Handle map bans/picks
2. `selectSideForMap` - Handle side selection for picked maps
3. `getVetoState` - Get current veto state
4. `onRoomUpdate` - Real-time subscription for updates

## Testing Different Formats

To test different match formats:
1. Create a room with desired format (bo1/bo3/bo5)
2. Both teams mark ready to auto-start veto
3. Follow the generated sequence
4. Observe side selection prompts for picked maps

## Customization Examples

### Example 1: Swiss System Bo3
```typescript
} else if (roundType === 'swiss-bo3') {
    // Team A ban, Team B ban, Team A pick, Team B pick, Team B pick
    sequence.push({ team: 'team-a', action: 'ban', completed: false });
    sequence.push({ team: 'team-b', action: 'ban', completed: false });
    sequence.push({ team: 'team-a', action: 'pick', completed: false });
    sequence.push({ team: 'team-b', action: 'pick', completed: false });
    sequence.push({ team: 'team-b', action: 'pick', completed: false });
```

### Example 2: Knife Round Format
```typescript
} else if (roundType === 'knife') {
    // Only bans, last map gets knife round
    const bansNeeded = mapCount - 1;
    for (let i = 0; i < bansNeeded; i++) {
        sequence.push({
            team: i % 2 === 0 ? 'team-a' : 'team-b',
            action: 'ban',
            completed: false,
        });
    }
    // Winner of knife round chooses side
```

This system is highly flexible and can accommodate various competitive formats used in different esports scenes.
