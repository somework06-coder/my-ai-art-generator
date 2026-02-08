// Types for AI Art Generator

export interface GeneratedShader {
    id: string;
    prompt: string;
    fragmentCode: string;
    timestamp: number;
    aspectRatio: AspectRatio;
    duration: number; // Native loop duration in seconds
}

export type GenerationMode = 'prompt' | 'random';
export type AspectRatio = '16:9' | '9:16' | '1:1';

export interface GenerationRequest {
    mode: GenerationMode;
    prompt?: string;
    count?: number;
    aspectRatio: AspectRatio;
}

export interface GenerationResponse {
    success: boolean;
    shaders: GeneratedShader[];
    error?: string;
}
