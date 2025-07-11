import { db } from "~/server/db";

/**
 * Cleanup expired rooms and maintain database health
 * This should be run periodically (e.g., via cron job or scheduled task)
 */
export async function cleanupExpiredRooms() {
    try {
        const now = new Date();

        // Delete expired rooms
        const deletedRooms = await db.room.deleteMany({
            where: {
                expiresAt: {
                    lt: now,
                },
            },
        });

        console.log(`Cleaned up ${deletedRooms.count} expired rooms`);

        // Optional: Clean up very old rooms (older than 7 days) regardless of expiration
        const veryOldDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const deletedOldRooms = await db.room.deleteMany({
            where: {
                createdAt: {
                    lt: veryOldDate,
                },
            },
        });

        console.log(`Cleaned up ${deletedOldRooms.count} very old rooms`);

        return {
            expiredRoomsDeleted: deletedRooms.count,
            oldRoomsDeleted: deletedOldRooms.count,
            timestamp: now.toISOString(),
        };
    } catch (error) {
        console.error('Error during room cleanup:', error);
        throw error;
    }
}

/**
 * Get statistics about room usage for monitoring
 */
export async function getRoomStatistics() {
    try {
        const now = new Date();
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [
            activeRooms,
            roomsLast24h,
            roomsLastWeek,
            totalRooms,
        ] = await Promise.all([
            db.room.count({
                where: {
                    expiresAt: { gt: now },
                    status: { in: ['waiting', 'active'] },
                },
            }),
            db.room.count({
                where: {
                    createdAt: { gte: last24Hours },
                },
            }),
            db.room.count({
                where: {
                    createdAt: { gte: lastWeek },
                },
            }),
            db.room.count(),
        ]);

        return {
            activeRooms,
            roomsCreatedLast24h: roomsLast24h,
            roomsCreatedLastWeek: roomsLastWeek,
            totalRoomsAllTime: totalRooms,
            timestamp: now.toISOString(),
        };
    } catch (error) {
        console.error('Error getting room statistics:', error);
        throw error;
    }
}

// Export a function that can be called via API route for manual cleanup
export async function handleCleanupRequest() {
    try {
        const cleanupResult = await cleanupExpiredRooms();
        const stats = await getRoomStatistics();

        return {
            success: true,
            cleanup: cleanupResult,
            statistics: stats,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
