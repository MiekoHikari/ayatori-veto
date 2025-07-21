import { createClient } from "@supabase/supabase-js";
import { env } from "~/env";

// Server-side Supabase client with service role key (for admin operations)
export const supabaseAdmin = env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY as string,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    )
    : null;

// Regular client-side Supabase client (can also be used server-side)
export const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
        realtime: {
            // Configure realtime settings
            params: {
                eventsPerSecond: 10,
            },
        },
    }
);
