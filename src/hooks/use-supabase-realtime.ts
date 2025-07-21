import { useEffect, useState, useRef, useCallback } from 'react';
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
    clientId?: string;
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
    const [latency, setLatency] = useState<number>(-1); // Initialize to -1 to distinguish from actual 0ms latency
    const [shouldShowRefreshPrompt, setShouldShowRefreshPrompt] = useState(false);
    const [connectionFailureCount, setConnectionFailureCount] = useState(0);
    const lastPingTimestampRef = useRef<number | null>(null);
    const missedPingsRef = useRef<number>(0);
    const onUpdateRef = useRef(onUpdate);

    // Keep the callback ref up to date
    onUpdateRef.current = onUpdate;

    const [clientId] = useState<string>(() => {
        // Try to get clientId from sessionStorage
        const storedClientId = typeof window !== "undefined" ? sessionStorage.getItem("supabaseClientId") : null;
        if (storedClientId) {
            return storedClientId;
        }
        // Generate new clientId and store it
        const newClientId = `client_${Math.random().toString(36).substring(2)}_${Date.now()}`;
        if (typeof window !== "undefined") {
            sessionStorage.setItem("supabaseClientId", newClientId);
        }
        return newClientId;
    });

    useEffect(() => {
        if (!enabled || !roomId) {
            return;
        }

        console.log(`🔌 Setting up Supabase channel for room: ${roomId}`);

        // Create a channel for this specific room
        const channel = supabase.channel(`room:${roomId}`, {
            config: {
                broadcast: { self: true, ack: true }, // Allow self messages for ping latency
                presence: { key: clientId },
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

            onUpdateRef.current?.(update);
        };

        // Subscribe to broadcast messages for room updates
        channel
            .on('broadcast', { event: 'room-update' }, (payload) => {
                // Skip our own room updates to avoid duplicate processing
                const broadcastPayload = payload.payload as BroadcastPayload;
                if (broadcastPayload?.clientId === clientId) {
                    console.log('📨 Skipping own room update');
                    return;
                }
                console.log('📨 Received room update:', payload);
                handleUpdate({ payload: payload.payload as BroadcastPayload });
            })
            .on('broadcast', { event: 'veto-update' }, (payload) => {
                // Skip our own veto updates to avoid duplicate processing
                const broadcastPayload = payload.payload as BroadcastPayload;
                if (broadcastPayload?.clientId === clientId) {
                    console.log('🎮 Skipping own veto update');
                    return;
                }
                console.log('🎮 Received veto update:', payload);
                handleUpdate({ payload: payload.payload as BroadcastPayload });
            })
            .on('broadcast', { event: 'ping' }, (payload) => {
                // Handle ping responses for latency calculation
                const pingPayload = payload?.payload as { clientId?: string; timestamp?: number };
                if (pingPayload?.clientId === clientId && typeof pingPayload.timestamp === 'number') {
                    const currentTime = Date.now();
                    const pingLatency = currentTime - pingPayload.timestamp;

                    console.log(`🏓 Setting latency state to: ${pingLatency}ms`);
                    setLatency(pingLatency);
                    console.log(`🏓 Ping latency: ${pingLatency}ms`);

                    // Reset missed pings counter on successful ping response
                    missedPingsRef.current = 0;
                    lastPingTimestampRef.current = currentTime;

                    // If latency is very high, increment connection failure count
                    if (pingLatency > 5000) { // 5 seconds
                        setConnectionFailureCount(prev => {
                            const newCount = prev + 1;
                            if (newCount >= 3) {
                                setShouldShowRefreshPrompt(true);
                            }
                            return newCount;
                        });
                    } else if (pingLatency < 1000) {
                        // Reset failure count on good connection
                        setConnectionFailureCount(0);
                        setShouldShowRefreshPrompt(false);
                    }
                }
            })
            .subscribe((status) => {
                console.log(`📡 Supabase channel status for room:${roomId}:`, status);

                const statusStr = status as string;

                if (statusStr === 'SUBSCRIBED') {
                    setIsConnected(true);
                    setError(null);
                    setConnectionFailureCount(0);
                    setShouldShowRefreshPrompt(false);
                    console.log(`✅ Successfully subscribed to room:${roomId}`);
                } else if (statusStr === 'CHANNEL_ERROR') {
                    setIsConnected(false);
                    setError('Failed to connect to realtime updates');
                    setConnectionFailureCount(prev => {
                        const newCount = prev + 1;
                        if (newCount >= 2) {
                            setShouldShowRefreshPrompt(true);
                        }
                        return newCount;
                    });
                    console.error(`❌ Channel error for room:${roomId}`);
                } else if (statusStr === 'TIMED_OUT') {
                    setIsConnected(false);
                    setError('Connection timed out');
                    setConnectionFailureCount(prev => {
                        const newCount = prev + 1;
                        if (newCount >= 2) {
                            setShouldShowRefreshPrompt(true);
                        }
                        return newCount;
                    });
                    console.error(`⏰ Timeout for room:${roomId}`);
                } else if (statusStr === 'CLOSED') {
                    setIsConnected(false);
                    console.log(`🔒 Channel closed for room:${roomId}`);
                }
            });

        // Set up latency monitoring with ping every second
        const latencyInterval = setInterval(() => {
            if (channelRef.current) {
                const pingTimestamp = Date.now();

                // Check for missed pings (no response for more than 5 seconds)
                if (lastPingTimestampRef.current && pingTimestamp - lastPingTimestampRef.current > 5000) {
                    missedPingsRef.current += 1;
                    console.warn(`⚠️ Missed ping detected. Count: ${missedPingsRef.current}`);

                    if (missedPingsRef.current >= 3) {
                        console.error(`❌ Multiple missed pings detected for room:${roomId}`);
                        setShouldShowRefreshPrompt(true);
                        setError('Connection appears to be unstable');
                    }
                }

                console.log(`🏓 Sending ping for room: ${roomId}`);
                void channelRef.current.send({
                    type: 'broadcast',
                    event: 'ping',
                    payload: { clientId: clientId, timestamp: pingTimestamp },
                });

                // Set the timestamp for this ping attempt
                lastPingTimestampRef.current ??= pingTimestamp;
            }
        }, 1000);

        return () => {
            console.log(`🧹 Cleaning up Supabase channel for room:${roomId}`);
            clearInterval(latencyInterval);
            if (channelRef.current) {
                void supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
            setIsConnected(false);
            setShouldShowRefreshPrompt(false);
            setConnectionFailureCount(0);
            missedPingsRef.current = 0;
            lastPingTimestampRef.current = null;
        };
    }, [roomId, enabled, clientId]);

    // Method to send updates (for when this client makes changes)
    const broadcastRoomUpdate = useCallback(async (type: string, data?: Record<string, unknown>) => {
        if (!channelRef.current) {
            console.warn(`Cannot broadcast room update: channel not available for room:${roomId}`);
            return;
        }

        const payload = {
            type,
            room: roomId,
            data,
            timestamp: Date.now(),
            clientId, // Include clientId for filtering
        };

        console.log('📤 Broadcasting room update:', payload);

        await channelRef.current.send({
            type: 'broadcast',
            event: 'room-update',
            payload,
        });
    }, [roomId, clientId]);

    const broadcastVetoUpdate = useCallback(async (type: string, data?: Record<string, unknown>) => {
        if (!channelRef.current) {
            console.warn(`Cannot broadcast veto update: channel not available for room:${roomId}`);
            return;
        }

        const payload = {
            type,
            room: roomId,
            data,
            timestamp: Date.now(),
            clientId, // Include clientId for filtering
        };

        console.log('🎮 Broadcasting veto update:', payload);

        await channelRef.current.send({
            type: 'broadcast',
            event: 'veto-update',
            payload,
        });
    }, [roomId, clientId]);

    return {
        isConnected,
        error,
        latency,
        shouldShowRefreshPrompt,
        connectionFailureCount,
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