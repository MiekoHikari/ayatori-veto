import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const createRoomSchema = z.object({
    masterRoomId: z.string(),
    teamAId: z.string(),
    teamBId: z.string(),
    teamALink: z.string(),
    teamBLink: z.string(),
    spectatorLink: z.string(),
    expiresAt: z.string(),
    maps: z.array(z.string()),
    roundType: z.string(),
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
const VetoStateSchema = z.object({
    actions: z.array(VetoActionSchema),
    availableMaps: z.array(z.string()),
    pickedMaps: z.array(z.object({
        mapId: z.string(),
        pickedBy: z.enum(['team-a', 'team-b']),
        side: z.enum(['attack', 'defense']).optional(),
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

export const roomRouter = createTRPCRouter({
    create: publicProcedure
        .input(createRoomSchema)
        .mutation(async ({ ctx, input }) => {
            const roomData = {
                masterRoomId: input.masterRoomId,
                teamAId: input.teamAId,
                teamBId: input.teamBId,
                teamALink: input.teamALink,
                teamBLink: input.teamBLink,
                spectatorLink: input.spectatorLink,
                expiresAt: new Date(input.expiresAt),
                maps: input.maps,
                roundType: input.roundType,
                teamAReady: false,
                teamBReady: false,
                status: "waiting",
            }

            await ctx.db.room.create({ data: roomData })

            return roomData;
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
            });

            if (!room) {
                throw new Error("Room not found");
            }

            const isTeamA = room.teamAId === input.teamId;

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

    startVeto: publicProcedure
        .input(z.object({
            teamId: z.string(),
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

            // Check if both teams are ready
            if (!room.teamAReady || !room.teamBReady) {
                throw new Error("Both teams must be ready before starting veto");
            }

            // Check if veto already started
            if (room.vetoStarted) {
                throw new Error("Veto process has already started");
            }

            // Generate veto sequence based on round type
            const generateVetoSequence = (roundType: string, mapCount: number) => {
                const sequence: Array<{ team: 'team-a' | 'team-b', action: 'ban' | 'pick', completed: boolean }> = [];

                if (roundType === 'bo1') {
                    // BO1: Ban until 1 map remains, then pick sides
                    const bansNeeded = mapCount - 1;
                    for (let i = 0; i < bansNeeded; i++) {
                        sequence.push({
                            team: i % 2 === 0 ? 'team-a' : 'team-b',
                            action: 'ban',
                            completed: false,
                        });
                    }
                    // The remaining map is automatically picked, no explicit pick action needed
                } else if (roundType === 'bo3') {
                    // BO3: Ban until 3 maps remain, then pick them
                    const bansNeeded = Math.max(0, mapCount - 3);
                    const picksNeeded = 3;

                    // Alternating bans
                    for (let i = 0; i < bansNeeded; i++) {
                        sequence.push({
                            team: i % 2 === 0 ? 'team-a' : 'team-b',
                            action: 'ban',
                            completed: false,
                        });
                    }

                    // Alternating picks for the remaining maps
                    for (let i = 0; i < picksNeeded; i++) {
                        sequence.push({
                            team: i % 2 === 0 ? 'team-a' : 'team-b',
                            action: 'pick',
                            completed: false,
                        });
                    }
                } else if (roundType === 'bo5') {
                    // BO5: Ban until 5 maps remain, then pick them
                    const bansNeeded = Math.max(0, mapCount - 5);
                    const picksNeeded = 5;

                    // Alternating bans
                    for (let i = 0; i < bansNeeded; i++) {
                        sequence.push({
                            team: i % 2 === 0 ? 'team-a' : 'team-b',
                            action: 'ban',
                            completed: false,
                        });
                    }

                    // Alternating picks for the remaining maps
                    for (let i = 0; i < picksNeeded; i++) {
                        sequence.push({
                            team: i % 2 === 0 ? 'team-a' : 'team-b',
                            action: 'pick',
                            completed: false,
                        });
                    }
                }

                return sequence;
            };

            const vetoSequence = generateVetoSequence(room.roundType, room.maps.length);
            const initialVetoState: VetoState = {
                actions: [],
                availableMaps: [...room.maps],
                pickedMaps: [],
                bannedMaps: [],
                vetoSequence,
                currentStep: 0,
            };

            await ctx.db.room.update({
                where: { id: room.id },
                data: {
                    vetoStarted: true,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
                    vetoState: initialVetoState as any,
                    currentTurn: vetoSequence[0]?.team ?? 'team-a',
                    status: 'active',
                },
            });

            return {
                success: true,
                vetoState: initialVetoState,
                currentTurn: vetoSequence[0]?.team ?? 'team-a',
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

            const vetoState = room.vetoState! as VetoState;
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

            // For picks, side selection is required for Ranked/Demolition maps
            if (input.action === 'pick' && !input.side) {
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
                    ? [...vetoState.pickedMaps, {
                        mapId: input.mapId,
                        pickedBy: teamRole,
                        side: input.side,
                    }]
                    : vetoState.pickedMaps,
                vetoSequence: vetoState.vetoSequence.map((step, index) =>
                    index === currentStep ? { ...step, completed: true } : step
                ),
                currentStep: currentStep + 1,
            };

            // Check if veto is completed
            const vetoCompleted = newVetoState.currentStep >= newVetoState.vetoSequence.length;
            const nextTurn = vetoCompleted ? null : newVetoState.vetoSequence[newVetoState.currentStep]?.team;

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
});
