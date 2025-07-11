import { type NextRequest, NextResponse } from 'next/server';
import { handleCleanupRequest, getRoomStatistics } from '~/lib/room-cleanup';
// import { auth } from '~/server/auth'; // Uncomment for admin authentication

export async function GET(request: NextRequest) {
    try {
        // Optional: Add authentication check for admin routes
        // const session = await auth();
        // if (!session?.user?.email?.endsWith('@yourdomain.com')) {
        //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        // }

        const url = new URL(request.url);
        const action = url.searchParams.get('action');

        if (action === 'cleanup') {
            const result = await handleCleanupRequest();
            return NextResponse.json(result);
        } else if (action === 'stats') {
            const stats = await getRoomStatistics();
            return NextResponse.json(stats);
        } else {
            return NextResponse.json(
                { error: 'Invalid action. Use ?action=cleanup or ?action=stats' },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('Admin API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        // Optional: Add authentication check for admin routes
        // const session = await auth();
        // if (!session?.user?.email?.endsWith('@yourdomain.com')) {
        //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        // }

        const body = await request.json() as { action: string };

        if (body.action === 'cleanup') {
            const result = await handleCleanupRequest();
            return NextResponse.json(result);
        } else {
            return NextResponse.json(
                { error: 'Invalid action' },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('Admin API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
