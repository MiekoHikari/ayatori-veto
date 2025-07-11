import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { EventEmitter } from "events";
import { observable } from "@trpc/server/observable";
import { TRPCError } from "@trpc/server";
import {
    roomCreationLimiter,
    globalRoomCreationLimiter,
    ipBasedLimiter
} from "~/lib/rate-limiter";
import { RoomValidation, SecurityUtils } from "~/lib/room-validation";

// Helper function to determine team roles based on side selection
const determineTeamRoles = (pickedBy: 'team-a' | 'team-b', selectedSide: 'attack' | 'defense') => {
    if (selectedSide === 'attack') {
        return {
            attackingTeam: pickedBy,
            defendingTeam: pickedBy === 'team-a' ? 'team-b' as const : 'team-a' as const
        };
    } else {
        return {
            attackingTeam: pickedBy === 'team-a' ? 'team-b' as const : 'team-a' as const,
            defendingTeam: pickedBy
        };
    }
};

// Global event emitter for room updates
const roomEventEmitter = new EventEmitter();

const createRoomSchema = z.object({
    maps: z.array(z.string()).min(3).max(8),
    roundType: z.enum(['bo1', 'bo3', 'bo5']),
    clientIp: z.string().optional(),
});

// Veto action types
const VetoActionSchema = z.object({
    type: z.enum(['ban', 'pick']),
    mapId: z.string(),
    side: z.enum(['attack', 'defense']).optional(), // Only for picks on Ranked/Demolition maps
    team: z.enum(['team-a', 'team-b']),
    timestamp: z.string(),
});

// Veto state structure
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const VetoStateSchema = z.object({
    actions: z.array(VetoActionSchema),
    availableMaps: z.array(z.string()),
    pickedMaps: z.array(z.object({
        mapId: z.string(),
        pickedBy: z.enum(['team-a', 'team-b']),
        side: z.enum(['attack', 'defense']).optional(),
        attackingTeam: z.enum(['team-a', 'team-b']).optional(),
        defendingTeam: z.enum(['team-a', 'team-b']).optional(),
    })),
    bannedMaps: z.array(z.string()),
    vetoSequence: z.array(z.object({
        team: z.enum(['team-a', 'team-b']),
        action: z.enum(['ban', 'pick']),
        completed: z.boolean(),
    })),
    currentStep: z.number(),
});

// TypeScript types
type VetoAction = z.infer<typeof VetoActionSchema>;
type VetoState = z.infer<typeof VetoStateSchema>;

// Extended room type to include veto fields
interface RoomWithVeto {
    id: string;
    masterRoomId: string;
    teamAId: string;
    teamBId: string;
    teamALink: string;
    teamBLink: string;
    spectatorLink: string;
    createdAt: Date;
    expiresAt: Date;
    maps: string[];
    roundType: string;
    teamAReady: boolean;
    teamBReady: boolean;
    teamAName: string | null;
    teamBName: string | null;
    status: string;
    vetoState?: VetoState | null;
    currentTurn?: string | null;
    vetoStarted?: boolean;
    vetoCompleted?: boolean;
}

// Helper function to get human-readable team role information for a picked map
export const getTeamRolesForMap = (
    pickedMap: {
        mapId: string;
        pickedBy: 'team-a' | 'team-b';
        side?: 'attack' | 'defense';
        attackingTeam?: 'team-a' | 'team-b';
        defendingTeam?: 'team-a' | 'team-b';
    },
    teamAName?: string | null,
    teamBName?: string | null
) => {
    if (!pickedMap.attackingTeam || !pickedMap.defendingTeam) {
        return {
            attacking: 'Pending side selection',
            defending: 'Pending side selection',
            sideSelected: false
        };
    }

    const attackingName = pickedMap.attackingTeam === 'team-a'
        ? (teamAName ?? 'Team A')
        : (teamBName ?? 'Team B');

    const defendingName = pickedMap.defendingTeam === 'team-a'
        ? (teamAName ?? 'Team A')
        : (teamBName ?? 'Team B');

    return {
        attacking: attackingName,
        defending: defendingName,
        sideSelected: true,
        attackingTeam: pickedMap.attackingTeam,
        defendingTeam: pickedMap.defendingTeam
    };
};

export const roomRouter = createTRPCRouter({
    create: publicProcedure
        .input(createRoomSchema)
        .mutation(async ({ ctx, input }) => {
            // 1. Validate input data
            const validation = RoomValidation.validateRoomCreation({
                maps: input.maps,
                roundType: input.roundType,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
            });

            if (!validation.isValid) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `Validation failed: ${validation.errors.join(', ')}`,
                });
            }

            // 2. Get user identifier for rate limiting
            const userId = ctx.session?.user?.id;
            const clientIp = input.clientIp ?? 'unknown';
            const userIdentifier = SecurityUtils.getUserIdentifier(userId, clientIp);

            // 3. Check rate limits
            const [userLimit, globalLimit, ipLimit] = await Promise.all([
                roomCreationLimiter.checkLimit(userIdentifier),
                globalRoomCreationLimiter.checkLimit('global'),
                ipBasedLimiter.checkLimit(clientIp),
            ]);

            if (!userLimit.allowed) {
                throw new TRPCError({
                    code: 'TOO_MANY_REQUESTS',
                    message: `Rate limit exceeded. Try again in ${Math.ceil((userLimit.resetTime - Date.now()) / 60000)} minutes.`,
                });
            }

            if (!globalLimit.allowed) {
                throw new TRPCError({
                    code: 'TOO_MANY_REQUESTS',
                    message: 'Service is currently busy. Please try again later.',
                });
            }

            if (!ipLimit.allowed) {
                throw new TRPCError({
                    code: 'TOO_MANY_REQUESTS',
                    message: `Too many requests from your IP. Try again in ${Math.ceil((ipLimit.resetTime - Date.now()) / 60000)} minutes.`,
                });
            }

            // 4. Clean up expired rooms before creating new one
            await ctx.db.room.deleteMany({
                where: {
                    expiresAt: {
                        lt: new Date(),
                    },
                },
            });

            // 5. Check if user has too many active rooms
            if (userId) {
                const userActiveRooms = await ctx.db.room.count({
                    where: {
                        createdAt: {
                            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                        },
                        expiresAt: {
                            gt: new Date(),
                        },
                    },
                });

                if (userActiveRooms >= 5) { // Max 5 active rooms per user
                    throw new TRPCError({
                        code: 'TOO_MANY_REQUESTS',
                        message: 'You have too many active rooms. Please wait for some to expire or delete them.',
                    });
                }
            }

            // 6. Generate secure room data
            const baseUrl = "https://strinova-veto.vercel.app";
            const roomLinks = SecurityUtils.generateRoomLinks(baseUrl);
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            // 7. Create the room
            const roomData = {
                masterRoomId: roomLinks.masterRoomId,
                teamAId: roomLinks.teamAId,
                teamBId: roomLinks.teamBId,
                teamALink: roomLinks.teamALink,
                teamBLink: roomLinks.teamBLink,
                spectatorLink: roomLinks.spectatorLink,
                expiresAt,
                maps: input.maps,
                roundType: input.roundType,
                teamAReady: false,
                teamBReady: false,
                status: "waiting",
            };

            try {
                await ctx.db.room.create({ data: roomData });

                // Return the created room data
                return {
                    id: roomLinks.masterRoomId,
                    teamAId: roomLinks.teamAId,
                    teamBId: roomLinks.teamBId,
                    teamALink: roomLinks.teamALink,
                    teamBLink: roomLinks.teamBLink,
                    spectatorLink: roomLinks.spectatorLink,
                    createdAt: new Date().toISOString(),
                    expiresAt: expiresAt.toISOString(),
                    maps: input.maps,
                    roundType: input.roundType,
                    teamAReady: false,
                    teamBReady: false,
                    status: "waiting" as const,
                };
            } catch (error) {
                // If database creation fails, we should handle potential race conditions
                if (error instanceof Error && error.message.includes('unique constraint')) {
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: 'Room creation failed due to ID collision. Please try again.',
                    });
                }
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to create room. Please try again.',
                });
            }
        }),

    getByMasterRoomId: publicProcedure
        .input(z.object({ masterRoomId: z.string() }))
        .query(async ({ ctx, input }) => {
            const room = await ctx.db.room.findUnique({
                where: { masterRoomId: input.masterRoomId },
            }) as RoomWithVeto | null;

            if (!room) return null;

            return {
                id: room.masterRoomId,
                teamAId: room.teamAId,
                teamBId: room.teamBId,
                teamALink: room.teamALink,
                teamBLink: room.teamBLink,
                spectatorLink: room.spectatorLink,
                createdAt: room.createdAt.toISOString(),
                expiresAt: room.expiresAt.toISOString(),
                maps: room.maps,
                roundType: room.roundType,
                teamAReady: room.teamAReady,
                teamBReady: room.teamBReady,
                teamAName: room.teamAName,
                teamBName: room.teamBName,
                status: room.status as "waiting" | "active" | "completed" | "expired",
                vetoStarted: room.vetoStarted ?? false,
                vetoCompleted: room.vetoCompleted ?? false,
                currentTurn: room.currentTurn,
                vetoState: room.vetoState as VetoState | null,
            };
        }),

    getByTeamId: publicProcedure
        .input(z.object({ teamId: z.string() }))
        .query(async ({ ctx, input }) => {
            const room = await ctx.db.room.findFirst({
                where: {
                    OR: [
                        { teamAId: input.teamId },
                        { teamBId: input.teamId },
                    ],
                },
            }) as RoomWithVeto | null;

            if (!room) return null;

            const teamRole = room.teamAId === input.teamId ? ("team-a" as const) : ("team-b" as const);

            return {
                id: room.masterRoomId,
                teamAId: room.teamAId,
                teamBId: room.teamBId,
                teamALink: room.teamALink,
                teamBLink: room.teamBLink,
                spectatorLink: room.spectatorLink,
                createdAt: room.createdAt.toISOString(),
                expiresAt: room.expiresAt.toISOString(),
                maps: room.maps,
                roundType: room.roundType,
                teamAReady: room.teamAReady,
                teamBReady: room.teamBReady,
                teamAName: room.teamAName,
                teamBName: room.teamBName,
                status: room.status as "waiting" | "active" | "completed" | "expired",
                masterRoomId: room.masterRoomId,
                teamRole: teamRole,
                vetoStarted: room.vetoStarted ?? false,
                vetoCompleted: room.vetoCompleted ?? false,
                currentTurn: room.currentTurn,
                vetoState: room.vetoState as VetoState | null,
            };
        }),

    updateTeamReady: publicProcedure
        .input(z.object({
            teamId: z.string(),
            ready: z.boolean(),
        }))
        .mutation(async ({ ctx, input }) => {
            const room = await ctx.db.room.findFirst({
                where: {
                    OR: [
                        { teamAId: input.teamId },
                        { teamBId: input.teamId },
                    ],
                },
            }) as RoomWithVeto | null;

            if (!room) {
                throw new Error("Room not found");
            }

            const isTeamA = room.teamAId === input.teamId;

            // Prevent unready if veto has started
            if (!input.ready && room.vetoStarted) {
                throw new Error("Cannot mark as unready after veto process has started");
            }

            // If team is trying to mark ready, ensure they have set a team name
            if (input.ready) {
                const teamName = isTeamA ? room.teamAName : room.teamBName;
                if (!teamName || teamName.trim() === "") {
                    throw new Error("Team must set a name before marking ready");
                }
            }

            const updateData = isTeamA
                ? { teamAReady: input.ready }
                : { teamBReady: input.ready };

            const updatedRoom = await ctx.db.room.update({
                where: { id: room.id },
                data: updateData,
            }) as RoomWithVeto;

            // Check if both teams are now ready and auto-start veto
            const shouldAutoStartVeto = updatedRoom.teamAReady &&
                updatedRoom.teamBReady &&
                !updatedRoom.vetoStarted;

            let vetoState: VetoState | null = null;
            let currentTurn: string | null = null;

            if (shouldAutoStartVeto) {
                // Generate veto sequence
                const generateVetoSequence = (roundType: string, mapCount: number) => {
                    const sequence: Array<{ team: 'team-a' | 'team-b', action: 'ban' | 'pick', completed: boolean }> = [];

                    if (roundType === 'bo1') {
                        // Bo1: Teams ban maps until 1 map is left, then Team A picks the final map and chooses side
                        const bansNeeded = mapCount - 1;
                        for (let i = 0; i < bansNeeded; i++) {
                            sequence.push({
                                team: i % 2 === 0 ? 'team-a' : 'team-b',
                                action: 'ban',
                                completed: false,
                            });
                        }
                        // Team A picks the final remaining map and chooses the side
                        sequence.push({
                            team: 'team-a',
                            action: 'pick',
                            completed: false,
                        });
                    } else if (roundType === 'bo3') {
                        // Bo3: Need 3 maps total
                        // Dynamic sequence based on map count
                        if (mapCount < 3) {
                            throw new Error("Bo3 requires at least 3 maps");
                        }

                        const mapsNeeded = 3;
                        const bansNeeded = mapCount - mapsNeeded;

                        if (bansNeeded === 0) {
                            // Exactly 3 maps: Team A picks first, Team B picks second, Team A picks third
                            sequence.push({ team: 'team-a', action: 'pick', completed: false });
                            sequence.push({ team: 'team-b', action: 'pick', completed: false });
                            sequence.push({ team: 'team-a', action: 'pick', completed: false });
                        } else if (bansNeeded === 1) {
                            // 4 maps: Ban 1, then pick 3
                            sequence.push({ team: 'team-a', action: 'ban', completed: false });
                            sequence.push({ team: 'team-b', action: 'pick', completed: false });
                            sequence.push({ team: 'team-a', action: 'pick', completed: false });
                            sequence.push({ team: 'team-b', action: 'pick', completed: false });
                        } else if (bansNeeded === 2) {
                            // 5 maps: Ban 2, then pick 3
                            sequence.push({ team: 'team-a', action: 'ban', completed: false });
                            sequence.push({ team: 'team-b', action: 'ban', completed: false });
                            sequence.push({ team: 'team-a', action: 'pick', completed: false });
                            sequence.push({ team: 'team-b', action: 'pick', completed: false });
                            sequence.push({ team: 'team-a', action: 'pick', completed: false });
                        } else {
                            // More maps: Alternate bans until 3 maps left, then pick all 3
                            for (let i = 0; i < bansNeeded; i++) {
                                sequence.push({
                                    team: i % 2 === 0 ? 'team-a' : 'team-b',
                                    action: 'ban',
                                    completed: false,
                                });
                            }
                            // Pick the remaining 3 maps
                            sequence.push({ team: 'team-a', action: 'pick', completed: false });
                            sequence.push({ team: 'team-b', action: 'pick', completed: false });
                            sequence.push({ team: 'team-a', action: 'pick', completed: false });
                        }
                    } else if (roundType === 'bo5') {
                        // Bo5: Need 5 maps total
                        if (mapCount < 5) {
                            throw new Error("Bo5 requires at least 5 maps");
                        }

                        const mapsNeeded = 5;
                        const bansNeeded = mapCount - mapsNeeded;

                        if (bansNeeded === 0) {
                            // Exactly 5 maps: Pick all 5 alternating
                            for (let i = 0; i < 5; i++) {
                                sequence.push({
                                    team: i % 2 === 0 ? 'team-a' : 'team-b',
                                    action: 'pick',
                                    completed: false,
                                });
                            }
                        } else if (bansNeeded === 1) {
                            // 6 maps: Ban 1, then pick 5
                            sequence.push({ team: 'team-a', action: 'ban', completed: false });
                            for (let i = 0; i < 5; i++) {
                                sequence.push({
                                    team: i % 2 === 0 ? 'team-b' : 'team-a',
                                    action: 'pick',
                                    completed: false,
                                });
                            }
                        } else if (bansNeeded === 2) {
                            // 7 maps: Ban 2, then pick 5
                            sequence.push({ team: 'team-a', action: 'ban', completed: false });
                            sequence.push({ team: 'team-b', action: 'ban', completed: false });
                            for (let i = 0; i < 5; i++) {
                                sequence.push({
                                    team: i % 2 === 0 ? 'team-a' : 'team-b',
                                    action: 'pick',
                                    completed: false,
                                });
                            }
                        } else {
                            // More maps: Alternate bans until 5 maps left, then pick all 5
                            for (let i = 0; i < bansNeeded; i++) {
                                sequence.push({
                                    team: i % 2 === 0 ? 'team-a' : 'team-b',
                                    action: 'ban',
                                    completed: false,
                                });
                            }
                            // Pick the remaining 5 maps
                            for (let i = 0; i < 5; i++) {
                                sequence.push({
                                    team: i % 2 === 0 ? 'team-a' : 'team-b',
                                    action: 'pick',
                                    completed: false,
                                });
                            }
                        }
                    }

                    return sequence;
                };

                const vetoSequence = generateVetoSequence(updatedRoom.roundType, updatedRoom.maps.length);
                const initialVetoState: VetoState = {
                    actions: [],
                    availableMaps: [...updatedRoom.maps],
                    pickedMaps: [],
                    bannedMaps: [],
                    vetoSequence,
                    currentStep: 0,
                };

                currentTurn = vetoSequence[0]?.team ?? 'team-a';
                vetoState = initialVetoState;

                // Update room with veto started
                await ctx.db.room.update({
                    where: { id: room.id },
                    data: {
                        vetoStarted: true,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
                        vetoState: initialVetoState as any,
                        currentTurn,
                        status: 'active',
                    },
                });

                // Emit room update event
                roomEventEmitter.emit(`room:${updatedRoom.masterRoomId}:update`, {
                    type: 'veto-started',
                    room: updatedRoom.masterRoomId,
                });
            }

            // Emit room update event
            roomEventEmitter.emit(`room:${updatedRoom.masterRoomId}:update`, {
                type: 'team-ready-updated',
                room: updatedRoom.masterRoomId,
            });

            return {
                id: updatedRoom.masterRoomId,
                teamAId: updatedRoom.teamAId,
                teamBId: updatedRoom.teamBId,
                teamALink: updatedRoom.teamALink,
                teamBLink: updatedRoom.teamBLink,
                spectatorLink: updatedRoom.spectatorLink,
                createdAt: updatedRoom.createdAt.toISOString(),
                expiresAt: updatedRoom.expiresAt.toISOString(),
                maps: updatedRoom.maps,
                roundType: updatedRoom.roundType,
                teamAReady: updatedRoom.teamAReady,
                teamBReady: updatedRoom.teamBReady,
                teamAName: updatedRoom.teamAName,
                teamBName: updatedRoom.teamBName,
                status: shouldAutoStartVeto ? 'active' : updatedRoom.status as "waiting" | "active" | "completed" | "expired",
                masterRoomId: updatedRoom.masterRoomId,
                teamRole: isTeamA ? ("team-a" as const) : ("team-b" as const),
                vetoStarted: shouldAutoStartVeto || updatedRoom.vetoStarted,
                vetoCompleted: updatedRoom.vetoCompleted ?? false,
                currentTurn,
                vetoState,
            };
        }),

    updateStatus: publicProcedure
        .input(z.object({
            masterRoomId: z.string(),
            status: z.enum(["waiting", "active", "completed", "expired"]),
        }))
        .mutation(async ({ ctx, input }) => {
            const updatedRoom = await ctx.db.room.update({
                where: { masterRoomId: input.masterRoomId },
                data: { status: input.status },
            });

            return {
                id: updatedRoom.masterRoomId,
                teamAId: updatedRoom.teamAId,
                teamBId: updatedRoom.teamBId,
                teamALink: updatedRoom.teamALink,
                teamBLink: updatedRoom.teamBLink,
                spectatorLink: updatedRoom.spectatorLink,
                createdAt: updatedRoom.createdAt.toISOString(),
                expiresAt: updatedRoom.expiresAt.toISOString(),
                maps: updatedRoom.maps,
                roundType: updatedRoom.roundType,
                teamAReady: updatedRoom.teamAReady,
                teamBReady: updatedRoom.teamBReady,
                status: updatedRoom.status as "waiting" | "active" | "completed" | "expired",
            };
        }),

    deleteExpired: publicProcedure
        .mutation(async ({ ctx }) => {
            const result = await ctx.db.room.deleteMany({
                where: {
                    expiresAt: {
                        lt: new Date(),
                    },
                },
            });

            return { deletedCount: result.count };
        }),

    updateTeamName: publicProcedure
        .input(z.object({
            teamId: z.string(),
            teamName: z.string().min(1).max(50),
        }))
        .mutation(async ({ ctx, input }) => {
            const room = await ctx.db.room.findFirst({
                where: {
                    OR: [
                        { teamAId: input.teamId },
                        { teamBId: input.teamId },
                    ],
                },
            });

            if (!room) {
                throw new Error("Room not found");
            }

            const isTeamA = room.teamAId === input.teamId;

            // Check if team is already ready - if so, don't allow name change
            if ((isTeamA && room.teamAReady) || (!isTeamA && room.teamBReady)) {
                throw new Error("Cannot change team name after marking ready");
            }

            const updateData = isTeamA
                ? { teamAName: input.teamName }
                : { teamBName: input.teamName };

            const updatedRoom = await ctx.db.room.update({
                where: { id: room.id },
                data: updateData,
            });

            return {
                id: updatedRoom.masterRoomId,
                teamAId: updatedRoom.teamAId,
                teamBId: updatedRoom.teamBId,
                teamALink: updatedRoom.teamALink,
                teamBLink: updatedRoom.teamBLink,
                spectatorLink: updatedRoom.spectatorLink,
                createdAt: updatedRoom.createdAt.toISOString(),
                expiresAt: updatedRoom.expiresAt.toISOString(),
                maps: updatedRoom.maps,
                roundType: updatedRoom.roundType,
                teamAReady: updatedRoom.teamAReady,
                teamBReady: updatedRoom.teamBReady,
                teamAName: updatedRoom.teamAName,
                teamBName: updatedRoom.teamBName,
                status: updatedRoom.status as "waiting" | "active" | "completed" | "expired",
                masterRoomId: updatedRoom.masterRoomId,
                teamRole: isTeamA ? ("team-a" as const) : ("team-b" as const),
            };
        }),

    // Real-time subscription for room updates
    onRoomUpdate: publicProcedure
        .input(z.object({
            roomId: z.string(),
        }))
        .subscription(({ input }) => {
            return observable<{
                type: string;
                room: string;
                data?: unknown;
            }>((emit) => {
                const onUpdate = (data: { type: string; room: string;[key: string]: unknown }) => {
                    if (data.room === input.roomId) {
                        emit.next(data);
                    }
                };

                roomEventEmitter.on(`room:${input.roomId}:update`, onUpdate);

                return () => {
                    roomEventEmitter.off(`room:${input.roomId}:update`, onUpdate);
                };
            });
        }),

    // Real-time room updates using polling (fallback for when subscriptions aren't available)
    getRoomUpdates: publicProcedure
        .input(z.object({
            roomId: z.string(),
            lastUpdate: z.number().optional(),
        }))
        .query(async ({ ctx, input }) => {
            const room = await ctx.db.room.findFirst({
                where: {
                    OR: [
                        { masterRoomId: input.roomId },
                        { teamAId: input.roomId },
                        { teamBId: input.roomId },
                    ],
                },
            }) as RoomWithVeto | null;

            if (!room) {
                return null;
            }

            const teamRole = room.teamAId === input.roomId ? 'team-a' :
                room.teamBId === input.roomId ? 'team-b' : undefined;

            return {
                id: room.masterRoomId,
                teamAId: room.teamAId,
                teamBId: room.teamBId,
                teamALink: room.teamALink,
                teamBLink: room.teamBLink,
                spectatorLink: room.spectatorLink,
                createdAt: room.createdAt.toISOString(),
                expiresAt: room.expiresAt.toISOString(),
                maps: room.maps,
                roundType: room.roundType,
                teamAReady: room.teamAReady,
                teamBReady: room.teamBReady,
                teamAName: room.teamAName,
                teamBName: room.teamBName,
                status: room.status as "waiting" | "active" | "completed" | "expired",
                masterRoomId: room.masterRoomId,
                teamRole,
                vetoStarted: room.vetoStarted ?? false,
                vetoCompleted: room.vetoCompleted ?? false,
                currentTurn: room.currentTurn,
                vetoState: room.vetoState as VetoState | null,
                timestamp: Date.now(),
            };
        }),

    makeVetoAction: publicProcedure
        .input(z.object({
            teamId: z.string(),
            action: z.enum(['ban', 'pick']),
            mapId: z.string(),
            side: z.enum(['attack', 'defense']).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const room = await ctx.db.room.findFirst({
                where: {
                    OR: [
                        { teamAId: input.teamId },
                        { teamBId: input.teamId },
                    ],
                },
            }) as RoomWithVeto | null;

            if (!room) {
                throw new Error("Room not found");
            }

            if (!room.vetoStarted || room.vetoCompleted) {
                throw new Error("Veto process is not active");
            }

            const teamRole = room.teamAId === input.teamId ? 'team-a' : 'team-b';

            if (room.currentTurn !== teamRole) {
                throw new Error("Not your turn");
            }

            const vetoState = room.vetoState!;
            if (!vetoState || !Array.isArray(vetoState.vetoSequence)) {
                throw new Error("Invalid veto state");
            }

            const currentStep = vetoState.currentStep ?? 0;
            const currentSequenceItem = vetoState.vetoSequence[currentStep];

            if (!currentSequenceItem || currentSequenceItem.action !== input.action) {
                throw new Error(`Expected ${currentSequenceItem?.action} action, got ${input.action}`);
            }

            // Validate map is available
            if (!vetoState.availableMaps.includes(input.mapId)) {
                throw new Error("Map is not available for selection");
            }

            // For demolition maps, determine who should choose the side
            const isDemolitionMap = true; // All maps are demolition maps in this game
            const isLastMapInSequence = (currentStep + 1) >= vetoState.vetoSequence.length;
            const isLastPickAction = input.action === 'pick' && isLastMapInSequence;

            // For the last pick in the sequence, determine side selection based on round type
            // For other picks, the opposing team chooses the side for fairness
            if (input.action === 'pick' && isDemolitionMap && isLastPickAction) {
                // Check if this is a Bo5 final map
                const isBo5 = room.roundType === 'bo5';

                if (isBo5) {
                    // Bo5 final map: The team that DIDN'T pick the final map chooses the side
                    // This should be handled by the opposing team, not the picking team
                    if (input.side) {
                        throw new Error("For Bo5 final map, the opposing team should choose the side");
                    }
                } else {
                    // Bo1/Bo3 final map: The team making the pick selects the side
                    if (!input.side) {
                        throw new Error("Side selection is required for the final map pick");
                    }
                }
            } else if (input.action === 'pick' && isDemolitionMap && !isLastPickAction) {
                // For other demolition maps, opposing team chooses side
                if (input.side) {
                    throw new Error("Side selection should be done by the opposing team for fairness");
                }
            }

            // For non-demolition maps (if any), require side selection from the picking team
            if (input.action === 'pick' && !isDemolitionMap && !input.side) {
                throw new Error("Side selection is required for map picks");
            }

            // Create the action
            const newAction: VetoAction = {
                type: input.action,
                mapId: input.mapId,
                side: input.side,
                team: teamRole,
                timestamp: new Date().toISOString(),
            };

            // Update veto state
            const newVetoState: VetoState = {
                ...vetoState,
                actions: [...vetoState.actions, newAction],
                availableMaps: vetoState.availableMaps.filter((m) => m !== input.mapId),
                bannedMaps: input.action === 'ban'
                    ? [...vetoState.bannedMaps, input.mapId]
                    : vetoState.bannedMaps,
                pickedMaps: input.action === 'pick'
                    ? (() => {
                        const pickedMapSide = (isDemolitionMap && isLastPickAction && room.roundType !== 'bo5') ? input.side : undefined;

                        const pickedMap: {
                            mapId: string;
                            pickedBy: 'team-a' | 'team-b';
                            side?: 'attack' | 'defense';
                            attackingTeam?: 'team-a' | 'team-b';
                            defendingTeam?: 'team-a' | 'team-b';
                        } = {
                            mapId: input.mapId,
                            pickedBy: teamRole,
                            side: pickedMapSide,
                        };

                        // If side is selected, determine team roles
                        if (pickedMapSide) {
                            const teamRoles = determineTeamRoles(teamRole, pickedMapSide);
                            pickedMap.attackingTeam = teamRoles.attackingTeam;
                            pickedMap.defendingTeam = teamRoles.defendingTeam;
                        }

                        return [...vetoState.pickedMaps, pickedMap];
                    })()
                    : vetoState.pickedMaps,
                vetoSequence: vetoState.vetoSequence.map((step, index) =>
                    index === currentStep ? { ...step, completed: true } : step
                ),
                currentStep: currentStep + 1,
            };

            // Check if we need to let the opposite team choose side for the picked map
            let vetoCompleted = newVetoState.currentStep >= newVetoState.vetoSequence.length;
            let nextTurn: string | null = null;

            if (input.action === 'pick' && isDemolitionMap && !isLastPickAction) {
                // For non-final demolition maps, the opposing team chooses the side
                const opposingTeam = teamRole === 'team-a' ? 'team-b' : 'team-a';
                vetoCompleted = false;
                nextTurn = opposingTeam;
            } else if (input.action === 'pick' && isDemolitionMap && isLastPickAction) {
                // Final map picked - check if this is Bo5
                const isBo5 = room.roundType === 'bo5';

                if (isBo5) {
                    // Bo5 final map: The opposing team chooses the side
                    const opposingTeam = teamRole === 'team-a' ? 'team-b' : 'team-a';
                    vetoCompleted = false;
                    nextTurn = opposingTeam;
                } else {
                    // Bo1/Bo3 final map: Side was selected by picking team - veto is complete
                    vetoCompleted = true;
                    nextTurn = null;
                }
            } else if (vetoCompleted) {
                nextTurn = null;
            } else {
                nextTurn = newVetoState.vetoSequence[newVetoState.currentStep]?.team ?? null;
            }

            await ctx.db.room.update({
                where: { id: room.id },
                data: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
                    vetoState: newVetoState as any,
                    currentTurn: nextTurn,
                    vetoCompleted,
                    status: vetoCompleted ? 'completed' : 'active',
                },
            });

            // Emit real-time update
            roomEventEmitter.emit(`room:${room.masterRoomId}:update`, {
                type: 'veto-action',
                room: room.masterRoomId,
                action: newAction,
                vetoCompleted,
            });

            return {
                success: true,
                vetoState: newVetoState,
                currentTurn: nextTurn,
                vetoCompleted,
            };
        }),

    getVetoState: publicProcedure
        .input(z.object({
            roomId: z.string(),
        }))
        .query(async ({ ctx, input }) => {
            const room = await ctx.db.room.findFirst({
                where: {
                    OR: [
                        { masterRoomId: input.roomId },
                        { teamAId: input.roomId },
                        { teamBId: input.roomId },
                    ],
                },
            }) as RoomWithVeto | null;

            if (!room) {
                return null;
            }

            return {
                vetoStarted: room.vetoStarted ?? false,
                vetoCompleted: room.vetoCompleted ?? false,
                currentTurn: room.currentTurn,
                vetoState: room.vetoState as VetoState | null,
            };
        }),

    selectSideForMap: publicProcedure
        .input(z.object({
            teamId: z.string(),
            mapId: z.string(),
            side: z.enum(['attack', 'defense']),
        }))
        .mutation(async ({ ctx, input }) => {
            const room = await ctx.db.room.findFirst({
                where: {
                    OR: [
                        { teamAId: input.teamId },
                        { teamBId: input.teamId },
                    ],
                },
            }) as RoomWithVeto | null;

            if (!room) {
                throw new Error("Room not found");
            }

            if (!room.vetoStarted || room.vetoCompleted) {
                throw new Error("Veto process is not active");
            }

            const teamRole = room.teamAId === input.teamId ? 'team-a' : 'team-b';

            if (room.currentTurn !== teamRole) {
                throw new Error("Not your turn to select side");
            }

            const vetoState = room.vetoState!;
            if (!vetoState) {
                throw new Error("Invalid veto state");
            }

            // Find the picked map without a side and update it
            const updatedPickedMaps = vetoState.pickedMaps.map((pick) => {
                if (pick.mapId === input.mapId && !pick.side) {
                    const teamRoles = determineTeamRoles(teamRole, input.side);
                    return {
                        ...pick,
                        side: input.side,
                        attackingTeam: teamRoles.attackingTeam,
                        defendingTeam: teamRoles.defendingTeam
                    };
                }
                return pick;
            });

            const newVetoState: VetoState = {
                ...vetoState,
                pickedMaps: updatedPickedMaps,
            };

            // Check if veto is completed after side selection
            const vetoCompleted = newVetoState.currentStep >= newVetoState.vetoSequence.length;
            const nextTurn = vetoCompleted ? null : newVetoState.vetoSequence[newVetoState.currentStep]?.team ?? null;

            await ctx.db.room.update({
                where: { id: room.id },
                data: {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
                    vetoState: newVetoState as any,
                    currentTurn: nextTurn,
                    vetoCompleted,
                    status: vetoCompleted ? 'completed' : 'active',
                },
            });

            // Emit real-time update
            roomEventEmitter.emit(`room:${room.masterRoomId}:update`, {
                type: 'side-selected',
                room: room.masterRoomId,
                mapId: input.mapId,
                side: input.side,
                vetoCompleted,
            });

            return {
                success: true,
                vetoState: newVetoState,
                vetoCompleted,
                currentTurn: nextTurn,
            };
        }),
});
