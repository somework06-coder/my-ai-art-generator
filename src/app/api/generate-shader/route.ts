// API Route for AI Shader Generation
import { NextRequest, NextResponse } from 'next/server';
import { generateShaderFromPrompt, generateRandomShaders } from '@/lib/openrouter';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { mode, prompt, count, vibe, complexity, speed, duration = 10, palette, motionStyle } = body;

        // --- CREDIT CHECK ---
        const cost = mode === 'random' ? (count || 1) : 1;
        // In 'random' mode, user can request multiple via 'count', usually 1 or 4.
        // In 'prompt' mode, it's always 1.

        const supabase = await createClient(); // Helper from utils/supabase/server
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized: Please login to generate.' }, { status: 401 });
        }

        // Check if user has enough credits
        // We use the 'deduct_credits' RPC function which handles the check atomicallly
        // OR we check manualy first for better UI feedback
        // Ideally: RPC returns false if not enough credits.

        // Let's rely on RPC 'deduct_credits' (defined in SQL) which returns boolean
        // If it returns FALSE, it means insufficient funds.

        // Transaction Description
        const desc = mode === 'prompt' ? `Generated "${prompt?.substring(0, 20)}..."` : `Generated ${cost} Random Shaders`;

        const { data: success, error: deductionError } = await supabase.rpc('deduct_credits', {
            p_user_id: user.id,
            p_amount: cost,
            p_description: desc
        });

        if (deductionError) {
            console.error('Credit deduction error:', deductionError);
            // Fallback: If RPC fails (e.g. not created), maybe allow generation? 
            // NO, we should block to prevent abuse.
            return NextResponse.json({ error: 'System Error: Could not process credits.' }, { status: 500 });
        }

        if (!success) {
            return NextResponse.json({
                error: 'Insufficient Credits. Please Top Up.',
                code: 'INSUFFICENT_CREDITS'
            }, { status: 402 }); // 402 Payment Required
        }
        // --- END CREDIT CHECK ---

        if (mode === 'prompt') {
            const result = await generateShaderFromPrompt(prompt, vibe, complexity, speed, duration, false, palette, motionStyle);
            return NextResponse.json({ success: true, shaders: [result] });

        } else if (mode === 'random') {
            const shaderCount = Math.min(Math.max(count || 1, 1), 8);
            const results = await generateRandomShaders(shaderCount, vibe, complexity, speed, duration, palette, motionStyle);
            return NextResponse.json({ success: true, shaders: results });

        } else {
            return NextResponse.json(
                { error: 'Invalid mode. Use "prompt" or "random"' },
                { status: 400 }
            );
        }

    } catch (error) {
        console.error('Shader generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate shader' },
            { status: 500 }
        );
    }
}
