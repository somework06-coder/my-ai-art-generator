import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log("Testing Service Role Key on profiles...");
    const { data: targetProfile, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('credits, full_name')
        .eq('id', '1eca128c-4f4f-4cd2-a0b5-4bbc218b155c')
        .single();

    console.log("Profile Result:", { targetProfile, fetchError });

    console.log("Testing topup_orders bypass RLS...");
    const { data: orders, error: ordersError } = await supabaseAdmin
        .from('topup_orders')
        .select('*');

    console.log("Orders Result:", { orders: orders?.length, ordersError });
}

test();
