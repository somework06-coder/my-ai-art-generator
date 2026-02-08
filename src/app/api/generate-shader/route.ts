// API Route for AI Shader Generation
import { NextRequest, NextResponse } from 'next/server';
import { generateShaderFromPrompt, generateRandomShaders } from '@/lib/openrouter';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { mode, prompt, count, vibe, complexity, speed, duration = 10 } = body;

        if (mode === 'prompt') {
            // Generate shader from user prompt
            if (!prompt || typeof prompt !== 'string') {
                return NextResponse.json(
                    { error: 'Prompt is required' },
                    { status: 400 }
                );
            }

            const result = await generateShaderFromPrompt(prompt, vibe, complexity, speed, duration);
            return NextResponse.json({ success: true, shaders: [result] });

        } else if (mode === 'random') {
            // Generate random shaders
            const shaderCount = Math.min(Math.max(count || 1, 1), 8);
            const results = await generateRandomShaders(shaderCount, vibe, complexity, speed, duration);
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
