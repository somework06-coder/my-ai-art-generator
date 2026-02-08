// Gemini AI Client for Dynamic Shader Generation
import { GoogleGenAI } from '@google/genai';

const genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || ''
});

// Common GLSL helper functions that AI might use
const GLSL_HELPER_FUNCTIONS = `
// Helper: HSV to RGB conversion
#define PI 3.14159265359
#define TAU 6.28318530718

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Helper: RGB to HSV conversion
vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

// Helper: 2D rotation matrix
mat2 rotate2D(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
}

// Helper: Hash functions
float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec2 hash2(vec2 p) {
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
    );
}

// Helper: Fractal Brownian Motion
float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

// Helper: Smooth min for metaballs
float smin(float a, float b, float k) {
    float h = max(k - abs(a - b), 0.0) / k;
    return min(a, b) - h * h * k * 0.25;
}

// Helper: Palette function for colorful gradients
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}
`;

// System prompt for shader generation
// System prompt for shader generation
const SHADER_SYSTEM_PROMPT = `You are an expert Generative Artist and GLSL shader coder. Your goal is to create STUNNING, HIGH-END, PROFESSIONAL abstract art.

Context:
- The output will be rendered on a full-screen canvas.
- It must look like premium motion graphics or high-quality digital art.
- AVOID: Simple shapes, basic static noise, jarring colors, amateurish geometry.
- PREFER: Smooth flowing gradients, ethereal mists, complex fractal patterns, domain warping, neon pulses, glass/liquid effects.

PRE-DEFINED VARIABLES (Do NOT declare these):
uniform float uTime;       // Time in seconds
uniform vec2 uResolution;  // Canvas resolution (pixels)
varying vec2 vUv;         // Texture coordinates (0.0 to 1.0)

AVAILABLE HELPER FUNCTIONS (Do NOT declare these, just use them):
- vec3 hsv2rgb(vec3 c)
- float hash(float n)
- float hash(vec2 p)
- vec2 hash2(vec2 p)
- float noise(vec2 p)      // Value noise
- float fbm(vec2 p)        // Fractal Brownian Motion (5 octaves)
- mat2 rotate2D(float a)
- vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) // IQ style palette

DESIGN RULES:
1. **Color Harmony**: ALWAYS use the \`palette()\` function or \`hsv2rgb\` to create rich, harmonious color gradients. Avoid hardcoded static colors like \`vec3(1,0,0)\`.
2. **Movement**: Use \`uTime\` to drive animation. Keep it slow, hypnotic, and elegant.
3. **Complexity**: Use \`fbm\` and domain warping (warping coordinates with noise) to create organic, non-repeating detail.
4. **Composition**: Center the action or create a balanced field of view. Ensure it looks good at any aspect ratio.

OUTPUT FORMAT:
- ONLY write the \`void main()\` function.
- Do NOT include comments or markdown outside the code.
- Do NOT re-declare uniforms or varyings.

EXAMPLE STRUCTURE:
void main() {
    vec2 uv = (vUv - 0.5) * 2.0;
    uv.x *= uResolution.x / uResolution.y; // Correct aspect ratio
    
    // Domain warping example
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);
    
    for (float i = 0.0; i < 3.0; i++) {
        uv = fract(uv * 1.5) - 0.5;
        
        float d = length(uv) * exp(-length(uv0));
        
        vec3 col = palette(length(uv0) + i*.4 + uTime*.4, 
                          vec3(0.5, 0.5, 0.5),
                          vec3(0.5, 0.5, 0.5),
                          vec3(1.0, 1.0, 1.0),
                          vec3(0.263,0.416,0.557));
                          
        d = sin(d*8. + uTime)/8.;
        d = abs(d);
        d = pow(0.01 / d, 1.2);
        
        finalColor += col * d;
    }
    
    gl_FragColor = vec4(finalColor, 1.0);
}`;

// Random art prompts for variety - Focusing on Abstract & Professional
const RANDOM_PROMPTS = [
    "nebula of liquid gold and obsidian flowing in slow motion",
    "ethereal heavy silk fabric floating in zero gravity, iridescent colors",
    "bioluminescent deep sea network pulsing with data and light",
    "abstract architectural geometry made of glass and refraction",
    "hypnotic mandala of neon laser light, vaporwave aesthetic",
    "living oil painting, thick brushstrokes morphing and melting",
    "crystalline growth structures with chromatic aberration",
    "mathematical topological surface, smooth and metallic",
    "cosmic storm with electric tendrils and volumetric fog",
    "quantum field visualization, probability waves and particles",
    "retro-futuristic grid landscape, glowing horizon, synthesizer music vibe",
    "organic cellular automata, dividing and evolving in pastel colors",
    "ferrofluid magnetism simulation, spikey and smooth transitions",
    "digital rain of light, falling through a prism",
    "abstract emotion visualizer, soft gradients of calm and energy"
];

export interface GeneratedShader {
    id: string;
    prompt: string;
    fragmentCode: string;
    timestamp: number;
}

// Generate shader from user prompt
export async function generateShaderFromPrompt(prompt: string): Promise<GeneratedShader> {
    try {
        const model = genAI.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [
                {
                    role: 'user',
                    parts: [{ text: `${SHADER_SYSTEM_PROMPT}\n\nCreate a shader for: ${prompt}` }]
                }
            ],
            config: {
                temperature: 0.8,
                maxOutputTokens: 2000,
            }
        });

        const response = await model;
        const text = response.text || '';

        // Extract and process GLSL code
        const mainCode = extractGLSLCode(text);
        const fragmentCode = buildFullShader(mainCode);

        return {
            id: generateId(),
            prompt,
            fragmentCode,
            timestamp: Date.now()
        };
    } catch (error) {
        console.error('Failed to generate shader:', error);
        throw new Error('Failed to generate shader from AI');
    }
}

// Generate multiple random shaders
export async function generateRandomShaders(count: number): Promise<GeneratedShader[]> {
    const selectedPrompts = getRandomItems(RANDOM_PROMPTS, count);

    const results = await Promise.all(
        selectedPrompts.map(prompt => generateShaderFromPrompt(prompt))
    );

    return results;
}

// Build full shader with uniforms and helpers
function buildFullShader(mainCode: string): string {
    return `
uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

${GLSL_HELPER_FUNCTIONS}

${mainCode}
`.trim();
}

// Extract GLSL code from AI response
function extractGLSLCode(text: string): string {
    // Remove markdown code blocks if present
    let code = text;

    // Try to extract code between ```glsl and ```
    const glslMatch = text.match(/```glsl\s*([\s\S]*?)```/);
    if (glslMatch) {
        code = glslMatch[1];
    } else {
        // Try generic code block
        const codeMatch = text.match(/```\s*([\s\S]*?)```/);
        if (codeMatch) {
            code = codeMatch[1];
        }
    }

    code = code.trim();

    // Remove any duplicate uniform/varying declarations that AI might have included
    code = code.replace(/^\s*uniform\s+float\s+uTime\s*;.*$/gm, '');
    code = code.replace(/^\s*uniform\s+vec2\s+uResolution\s*;.*$/gm, '');
    code = code.replace(/^\s*varying\s+vec2\s+vUv\s*;.*$/gm, '');

    // Remove helper functions if AI included them (simplified patterns)
    code = code.replace(/vec3\s+hsv2rgb\s*\([^)]*\)\s*\{[\s\S]*?\}/g, '');
    code = code.replace(/vec3\s+rgb2hsv\s*\([^)]*\)\s*\{[\s\S]*?\}/g, '');
    code = code.replace(/mat2\s+rotate2D\s*\([^)]*\)\s*\{[\s\S]*?\}/g, '');
    code = code.replace(/float\s+hash\s*\([^)]*\)\s*\{[\s\S]*?\}/g, '');
    code = code.replace(/float\s+noise\s*\([^)]*\)\s*\{[\s\S]*?\}/g, '');

    return code.trim();
}

// Generate unique ID
function generateId(): string {
    return `art_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get random items from array
function getRandomItems<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, array.length));
}
