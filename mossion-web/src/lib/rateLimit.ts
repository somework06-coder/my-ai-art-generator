import { createClient } from './supabase/server';

// Very simple rate limit counter stored in memory for Edge/Serverless
// In production with high traffic, use Redis (Upstash) instead.
// For this MVP, a simple Map works well enough per-instance.

const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();
export const RATE_LIMIT_MAX = 20; // 20 requests
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // per 1 minute

export async function checkRateLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
    const record = rateLimitMap.get(userId);

    if (!record || now > record.expiresAt) {
        // First request or window expired
        rateLimitMap.set(userId, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
        return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
    }

    if (record.count >= RATE_LIMIT_MAX) {
        // Rate limit exceeded
        return { allowed: false, remaining: 0 };
    }

    // Increment count
    record.count += 1;
    rateLimitMap.set(userId, record);
    return { allowed: true, remaining: RATE_LIMIT_MAX - record.count };
}

// Helper to authenticate requests from the desktop app
export async function authenticateRequest(authHeader: string | null) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { user: null, error: 'Missing or invalid Authorization header' };
    }

    const token = authHeader.split(' ')[1];
    const supabase = await createClient();

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
        return { user: null, error: 'Invalid token' };
    }

    return { user: data.user, error: null };
}
