import { supabase } from '~/lib/supabase-server';

interface BroadcastRoomUpdate {
    type: 'team-ready-updated' | 'veto-started' | 'veto-action' | 'side-selected' | 'team-name-updated';
    room: string;
    data?: Record<string, unknown>;
    timestamp?: number;
}

export const broadcastRoomUpdate = async (update: BroadcastRoomUpdate) => {
    try {
        const payload = {
            type: update.type,
            room: update.room,
            data: update.data,
            timestamp: update.timestamp ?? Date.now(),
        };

        console.log('Broadcasting room update from server:', payload);

        // Broadcast to the specific room channel
        const result = await supabase.channel(`room:${update.room}`).send({
            type: 'broadcast',
            event: 'room-update',
            payload,
        });

        console.log('Broadcast result:', result);

        return result;
    } catch (error) {
        console.error('Failed to broadcast room update:', error);
        throw error;
    }
};

export const broadcastVetoUpdate = async (update: BroadcastRoomUpdate) => {
    try {
        const payload = {
            type: update.type,
            room: update.room,
            data: update.data,
            timestamp: update.timestamp ?? Date.now(),
        };

        console.log('Broadcasting veto update from server:', payload);

        // Broadcast to the specific room channel
        const result = await supabase.channel(`room:${update.room}`).send({
            type: 'broadcast',
            event: 'veto-update',
            payload,
        });

        console.log('Veto broadcast result:', result);

        return result;
    } catch (error) {
        console.error('Failed to broadcast veto update:', error);
        throw error;
    }
};
