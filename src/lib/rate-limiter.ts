// In-memory rate limiter for development
// In production, replace with Redis or similar persistent store
class InMemoryStore {
    private store = new Map<string, { count: number; resetTime: number }>();

    async get(key: string): Promise<{ count: number; resetTime: number } | null> {
        const data = this.store.get(key);
        if (!data) return null;

        // Clean up expired entries
        if (Date.now() > data.resetTime) {
            this.store.delete(key);
            return null;
        }

        return data;
    }

    async set(key: string, value: { count: number; resetTime: number }): Promise<void> {
        this.store.set(key, value);
    }

    async delete(key: string): Promise<void> {
        this.store.delete(key);
    }

    // Cleanup expired entries periodically
    cleanup(): void {
        const now = Date.now();
        for (const [key, data] of this.store.entries()) {
            if (now > data.resetTime) {
                this.store.delete(key);
            }
        }
    }
}

// Global store instance
const store = new InMemoryStore();

// Cleanup every 5 minutes
setInterval(() => store.cleanup(), 5 * 60 * 1000);

export interface RateLimitConfig {
    windowMs: number; // Time window in milliseconds
    maxRequests: number; // Max requests per window
    keyGenerator?: (identifier: string) => string;
}

export class RateLimiter {
    private config: RateLimitConfig;

    constructor(config: RateLimitConfig) {
        this.config = config;
    }

    async checkLimit(identifier: string): Promise<{
        allowed: boolean;
        remaining: number;
        resetTime: number;
        totalRequests: number;
    }> {
        const key = this.config.keyGenerator
            ? this.config.keyGenerator(identifier)
            : `ratelimit:${identifier}`;

        const now = Date.now();

        // Get current data
        const current = await store.get(key);

        let count = 0;
        let resetTime = now + this.config.windowMs;

        if (current && current.resetTime > now) {
            // Within the current window
            count = current.count;
            resetTime = current.resetTime;
        } else {
            // New window or expired
            resetTime = now + this.config.windowMs;
        }

        const newCount = count + 1;
        const allowed = newCount <= this.config.maxRequests;

        if (allowed) {
            // Update the count
            await store.set(key, { count: newCount, resetTime });
        }

        return {
            allowed,
            remaining: Math.max(0, this.config.maxRequests - newCount),
            resetTime,
            totalRequests: newCount,
        };
    }

    async reset(identifier: string): Promise<void> {
        const key = this.config.keyGenerator
            ? this.config.keyGenerator(identifier)
            : `ratelimit:${identifier}`;

        await store.delete(key);
    }
}

// Predefined rate limiters for different use cases
export const roomCreationLimiter = new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 3, // 3 rooms per 15 minutes
    keyGenerator: (identifier) => `room_creation:${identifier}`,
});

export const globalRoomCreationLimiter = new RateLimiter({
    windowMs: 60 * 1000, // 1 minute  
    maxRequests: 10, // 10 rooms per minute globally
    keyGenerator: () => 'global_room_creation',
});

export const ipBasedLimiter = new RateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 5, // 5 rooms per 5 minutes per IP
    keyGenerator: (ip) => `ip_room_creation:${ip}`,
});
