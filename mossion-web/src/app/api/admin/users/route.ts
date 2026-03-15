import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function GET() {
    try {
        // 1. Verify the requester is an admin using their cookie session
        const supabaseUser = await createServerClient();
        const { data: { user }, error: authError } = await supabaseUser.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabaseUser
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (!profile?.is_admin) {
            return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
        }

        // 2. Initialize Admin Client to bypass RLS and read auth.users
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Fetch auth users (up to 1000 for now, can support pagination later)
        const { data: authUsers, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers({
            perPage: 1000
        });

        if (listUsersError) {
            return NextResponse.json({ error: listUsersError.message }, { status: 500 });
        }

        // Fetch public profiles (excluding admins to match previous logic)
        const { data: profiles, error: profilesError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('is_admin', false)
            .order('created_at', { ascending: false });

        if (profilesError) {
            return NextResponse.json({ error: profilesError.message }, { status: 500 });
        }

        // Merge email into profile
        const mergedUsers = profiles.map(p => {
            const authUser = authUsers.users.find(u => u.id === p.id);
            return {
                ...p,
                email: authUser?.email || 'No email'
            };
        });

        return NextResponse.json({ users: mergedUsers });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
