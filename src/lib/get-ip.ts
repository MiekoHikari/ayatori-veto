import { type NextRequest } from 'next/server';

export function getClientIp(request: NextRequest): string {
    // Try various headers in order of preference
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare

    if (forwardedFor) {
        // x-forwarded-for can contain multiple IPs, get the first one
        return forwardedFor.split(',')[0]?.trim() ?? 'unknown';
    }

    if (realIp) {
        return realIp;
    }

    if (cfConnectingIp) {
        return cfConnectingIp;
    }

    // Fallback for unknown cases
    return 'unknown';
}
