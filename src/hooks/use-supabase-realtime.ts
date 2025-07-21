import { useEffect, useState, useRef } from 'react';
import { supabase } from '~/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

type RoomUpdateType = 'team-ready-updated' | 'veto-started' | 'veto-action' | 'side-selected' | 'team-name-updated';

interface RoomRealtimeUpdate {
    type: RoomUpdateType;
    room: string;
    data?: Record<string, unknown>;
    timestamp?: number;
}

interface BroadcastPayload {
    type?: string;
    room?: string;
    data?: Record<string, unknown>;
    timestamp?: number;
}

interface UseSupabaseRoomUpdatesOptions {
    roomId: string;
    enabled: boolean;
    onUpdate?: (update: RoomRealtimeUpdate) => void;
}

export const useSupabaseRoomUpdates = ({ roomId, enabled, onUpdate }: UseSupabaseRoomUpdatesOptions) => {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);
    const [latency, setLatency] = useState<number>(0);

    // Generate a simple client ID using Math.random and timestamp
    const clientId = useRef(`client_${Math.random().toString(36).substring(2)}_${Date.now()}`);

    useEffect(() => {
        if (!enabled || !roomId) {
            return;
        }

        console.log(`🔌 Setting up Supabase channel for room: ${roomId}`);

        // Create a channel for this specific room
        const channel = supabase.channel(`room:${roomId}`, {
            config: {
                broadcast: { self: false },
                presence: { key: clientId.current },
            },
        });

        channelRef.current = channel;

        const handleUpdate = (payload: { payload: BroadcastPayload }) => {
            const broadcastPayload = payload.payload;
            const updateType = broadcastPayload?.type;

            if (!updateType || !isValidRoomUpdateType(updateType)) {
                console.warn('Invalid update type received:', updateType);
                return;
            }

            const update: RoomRealtimeUpdate = {
                type: updateType,
                room: broadcastPayload?.room ?? roomId,
                data: broadcastPayload?.data,
                timestamp: broadcastPayload?.timestamp ?? Date.now(),
            };

            onUpdate?.(update);
        };

        // Subscribe to broadcast messages for room updates
        channel
            .on('broadcast', { event: 'room-update' }, (payload) => {
                console.log('📨 Received room update:', payload);
                handleUpdate({ payload: payload.payload as BroadcastPayload });
            })
            .on('broadcast', { event: 'veto-update' }, (payload) => {
                console.log('🎮 Received veto update:', payload);
                handleUpdate({ payload: payload.payload as BroadcastPayload });
            })
            .on('broadcast', { event: 'ping' }, (payload) => {
                // Handle ping responses for latency calculation
                const pingPayload = payload.payload as { timestamp?: number };
                if (pingPayload?.timestamp) {
                    const currentTime = Date.now();
                    const pingLatency = currentTime - pingPayload.timestamp;
                    setLatency(pingLatency);
                    console.log(`🏓 Ping latency: ${pingLatency}ms`);
                }
            })
            .subscribe((status) => {
                console.log(`📡 Supabase channel status for room:${roomId}:`, status);

                const statusStr = status as string;

                if (statusStr === 'SUBSCRIBED') {
                    setIsConnected(true);
                    setError(null);
                    console.log(`✅ Successfully subscribed to room:${roomId}`);
                } else if (statusStr === 'CHANNEL_ERROR') {
                    setIsConnected(false);
                    setError('Failed to connect to realtime updates');
                    console.error(`❌ Channel error for room:${roomId}`);
                } else if (statusStr === 'TIMED_OUT') {
                    setIsConnected(false);
                    setError('Connection timed out');
                    console.error(`⏰ Timeout for room:${roomId}`);
                } else if (statusStr === 'CLOSED') {
                    setIsConnected(false);
                    console.log(`🔒 Channel closed for room:${roomId}`);
                }
            });

        // Set up latency monitoring with ping every 10 seconds
        const latencyInterval = setInterval(() => {
            if (channelRef.current) {
                const pingTimestamp = Date.now();
                console.log(`🏓 Sending ping for room:${roomId}`);
                void channelRef.current.send({
                    type: 'broadcast',
                    event: 'ping',
                    payload: { timestamp: pingTimestamp },
                });
            }
        }, 10000);

        return () => {
            console.log(`🧹 Cleaning up Supabase channel for room:${roomId}`);
            clearInterval(latencyInterval);
            if (channelRef.current) {
                void supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
            setIsConnected(false);
        };
    }, [roomId, enabled, onUpdate]);

    // Method to send updates (for when this client makes changes)
    const broadcastRoomUpdate = async (type: string, data?: Record<string, unknown>) => {
        if (!channelRef.current) {
            console.warn(`Cannot broadcast room update: channel not available for room:${roomId}`);
            return;
        }

        const payload = {
            type,
            room: roomId,
            data,
            timestamp: Date.now(),
        };

        console.log('📤 Broadcasting room update:', payload);

        await channelRef.current.send({
            type: 'broadcast',
            event: 'room-update',
            payload,
        });
    };

    const broadcastVetoUpdate = async (type: string, data?: Record<string, unknown>) => {
        if (!channelRef.current) {
            console.warn(`Cannot broadcast veto update: channel not available for room:${roomId}`);
            return;
        }

        const payload = {
            type,
            room: roomId,
            data,
            timestamp: Date.now(),
        };

        console.log('🎮 Broadcasting veto update:', payload);

        await channelRef.current.send({
            type: 'broadcast',
            event: 'veto-update',
            payload,
        });
    };

    return {
        isConnected,
        error,
        latency,
        broadcastRoomUpdate,
        broadcastVetoUpdate,
    };
};

// Helper function to validate update types
function isValidRoomUpdateType(type: string): type is RoomUpdateType {
    const validTypes: RoomUpdateType[] = [
        'team-ready-updated',
        'veto-started',
        'veto-action',
        'side-selected',
        'team-name-updated'
    ];
    return validTypes.includes(type as RoomUpdateType);
}