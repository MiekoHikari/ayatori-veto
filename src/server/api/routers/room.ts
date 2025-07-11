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
            });

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
            });

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
});
