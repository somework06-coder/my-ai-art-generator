// Google Gemini AI Client for Dynamic Shader Generation
// Using native fetch to call Gemini REST API directly

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Common GLSL helper functions that AI might use (reused from gemini.ts for consistency)
const GLSL_HELPER_FUNCTIONS = `
// Helper: HSV to RGB conversion
#define PI 3.14159265359
#define TAU 6.28318530718

// --- SHADERTOY COMPATIBILITY (For Gemini/DeepSeek) ---
#define iResolution uResolution
#define iTime uTime
#define iMouse vec4(0.0) // Placeholder
#define resolution uResolution // Additional aliasing
// -----------------------------------------------------

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

// --- CONSTANTS ---
#define PI 3.14159265359
#define TAU 6.28318530718

// --- 2D SDF PRIMITIVES (Required for "Maestro" Code) ---
float sdCircle(vec2 p, float r) {
    return length(p) - r;
}

float sdBox2D(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float sdHexagon(vec2 p, float r) {
    const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
    p = abs(p);
    p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
    p -= vec2(clamp(p.x, -k.z*r, k.z*r), r);
    return length(p) * sign(p.y);
}

float sdEquilateralTriangle(vec2 p, float r) {
    const float k = sqrt(3.0);
    p.x = abs(p.x) - r;
    p.y = p.y + r / k;
    if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
    p.x -= clamp(p.x, -2.0 * r, 0.0);
    return -length(p) * sign(p.y);
}
// -----------------------------------------------------------

// --- OPERATIONS ---
// Helper: Smooth min for metaballs
float smin(float a, float b, float k) {
    float h = max(k - abs(a - b), 0.0) / k;
    return min(a, b) - h * h * k * 0.25;
}
// Aliases for smin
float opSmoothUnion(float d1, float d2, float k) { return smin(d1, d2, k); }

// Helper: Smooth max (needed for some SDF operations)
float smax(float a, float b, float k) {
    return smin(a, b, -k);
}

// Helper: 2D rotation matrix
mat2 rotate2D(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
}

// Helper: Rotation alias (Common in Demoscene)
mat2 rot(float a) {
    return rotate2D(a);
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

// Aliases for Hash (Demoscene Standard)
float hash12(vec2 p) { return hash(p); }
vec2 hash22(vec2 p) { return hash2(p); }
float random(vec2 p) { return hash(p); }
vec2 random2(vec2 p) { return hash2(p); }

// Helper: Value noise (2D)
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i.x + i.y * 57.0);
    float b = hash(i.x + 1.0 + i.y * 57.0);
    float c = hash(i.x + i.y * 57.0 + 57.0);
    float d = hash(i.x + 1.0 + i.y * 57.0 + 57.0);
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Helper: Value noise (3D)
float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n = i.x + i.y * 57.0 + i.z * 113.0;
    return mix(mix(mix(hash(n + 0.0), hash(n + 1.0), f.x),
                   mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y),
               mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
                   mix(hash(n + 170.0), hash(n + 171.0), f.x), f.y), f.z);
}

// Helper: Fractal Brownian Motion (2D)
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

// Helper: FBM 2D with explicit octaves
float fbm(vec2 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 10; i++) {
        if (i >= octaves) break;
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

// Helper: FBM 3D (Standard 5 octaves)
float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

// Helper: FBM 3D with explicit octaves
float fbm(vec3 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 10; i++) {
        if (i >= octaves) break;
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

// Helper: FBM 2D + Time (Treats as 3D)
float fbm(vec2 p, float t) {
    return fbm(vec3(p, t));
}

// Helper: Noise 2D + Time (Treats as 3D)
float noise(vec2 p, float t) {
    return noise(vec3(p, t));
}
// -----------------------------------------------------------

// Helper: Palette function for colorful gradients
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}
`;

// System prompt for shader generation (2D Maestro Strategy)
const SHADER_SYSTEM_PROMPT = `
Role: Generative Art Maestro & GLSL Shader Architect.

Mission:
Create world-class, museum-quality 2D Generative Art using pure WebGL (GLSL).
The style should be "Sophisticated", "Mathematical", and "Hypnotic".

CRITICAL INSTRUCTION:
Do **NOT** write the 'void main()' function.
Do **NOT** write uniforms.
Do **NOT** use 'iChannel0', 'texture()', or external images. All art must be procedural (Math only).
Do **NOT** implement custom noise functions (e.g. snoise, cnoise, pnoise). USE MY PROVIDED HELPERS: 'noise()', 'fbm()', 'hash()'.
I will provide the 'main()' engine. You only need to provide the **ART LOGIC**.

REQUIRED OUTPUT:
1. 'vec3 palette(float t)' -> Define your color scheme (Cosine based).
2. 'vec3 art(vec2 uv, float t)' -> Define the pattern. Return the final RGB color.

RULES for 'vec3 art(vec2 uv, float t)':
- Input: 'uv' (Corrected aspect ratio, centered 0,0), 't' (0 to 2*PI). Do NOT redefine 't'.
- Output: Final RGB color (vec3).
- Use provided helpers: sdCircle, sdBox2D, sdHexagon, rot(a), fbm, noise.
- Use 'smoothstep' for AA (Anti-Aliasing). NEVER use 'if' or 'step'.
- Mix colors using patterns: 'mix(colA, colB, pattern)'.
- STRICT TYPING: 'dot', 'reflect', 'cross' require arguments of the SAME type (e.g. both vec3). Do NOT mix vec2 and vec3.
- STRICT TYPING: 'dot', 'reflect', 'cross' require arguments of the SAME type (e.g. both vec3). Do NOT mix vec2 and vec3.
- 'rot(angle)' returns mat2. Usage: 'uv * rot(t)'. Do NOT call 'rot(uv, t)'.
- STRICT CONSTRUCTORS: 'vec3' takes EXACTLY 3 arguments. Do NOT format as 'vec3(r, g, b, a, ...)' or 'vec3(6 arguments)'.
- STRICT TYPES: Do NOT assign a 'vec3' to a 'float'. Example: 'float a = vec3(...)' is WRONG. Use 'vec3 a = ...'.

EXAMPLE OUTPUT:
\`\`\`glsl
// My Palette
vec3 palette(float t) {
    return vec3(0.5) + 0.5 * cos(6.28318 * (vec3(1.0) * t + vec3(0.0, 0.33, 0.67)));
}

// My Art Function
vec3 art(vec2 uv, float t) {
    // 1. Space Warp
    uv *= 2.0;
    uv.x += sin(t + uv.y) * 0.2;
    
    // 2. Pattern
    float d = sdHexagon(uv, 0.5);
    d = sin(d * 10.0 + t);
    
    // 3. Color
    vec3 col = palette(d + t * 0.2);
    
    // 4. Glow/AA
    col *= smoothstep(0.1, 0.0, abs(d)); // Outline
    
    return col;
}
\`\`\`
`;

// --- ELITE PROMPT SYSTEM (Stock Footage Ready) ---
const RANDOM_PROMPTS = [
    // 1. TECH & FUTURISTIC (High Demand)
    "Cyberpunk data stream matrix, flowing binary code rain with neon green digital artifacts, high-tech interface background, glowing HUD elements.",
    "Abstract futuristic HUD interface, spinning holographic radar and data rings, clean sci-fi blue aesthetic, detailed technical schematics.",
    "Digital network connections, glowing nodes and plexus lines connecting in 3D space, deep blue technology background, data visualization style.",
    "Quantum computing visualization, qubit interference patterns, glowing electric arcs, dark futuristic laboratory vibe, energy fields pulsing.",

    // 2. ABSTRACT & ARTISTIC (Creative Projects)
    "Ethereal liquid metal flow, chrome mercury fluid simulation with iridescent reflections, smooth slow motion, cinematic lighting.",
    "Hypnotic optical illusion tunnel, black and white op-art spiral, perfectly looping geometric trance, sophisticated motion graphics.",
    "Elegant silk fabric simulation, waving golden cloth with soft shadows and luxury lighting, premium abstract background.",
    "Abstract ink in water, colorful smoke dispersion, slow motion fluid dynamics, artistic macro photography style, vibrant colors.",

    // 3. MOTION GRAPHIC LOOPS (General Backgrounds)
    "Soft gradient bokeh background, floating light orbs out of focus, calm and zen meditation atmosphere, dreamlike quality.",
    "Minimalist geometric motion, slowly rotating isometric cubes and shapes, clean white and grey architectural style, shadows and depth.",
    "Neon retro synthwave grid, moving laser landscape with 80s sun, vibrant purple and cyan colors, retro-futuristic vibes.",
    "Abstract particle dust floating in light beam, cinematic dust motes, magical fantasy atmosphere, volumetric lighting effects."
];

export interface GeneratedShader {
    id: string;
    prompt: string;
    fragmentCode: string;
    timestamp: number;
    duration: number;
}

// Generate shader from user prompt using Gemini API
export async function generateShaderFromPrompt(
    prompt: string,
    vibe: string = 'Random',
    complexity: string = 'Medium',
    speed: string = 'Medium',
    duration: number = 10
): Promise<GeneratedShader> {
    try {
        if (!GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not defined in environment variables');
        }

        // --- Speed Logic ---
        let speedValue = "0.5"; // Default Medium
        switch (speed) {
            case 'Slow': speedValue = "0.1"; break;
            case 'Medium': speedValue = "0.5"; break;
            case 'Fast': speedValue = "1.5"; break;
            case 'Hyper': speedValue = "3.0"; break;
            default: speedValue = "0.5";
        }

        // --- Vibe & Complexity Logic (2D Focused) ---
        let vibeInstruction = "";
        switch (vibe) {
            case 'Cyberpunk': vibeInstruction = "STYLE: Cyberpunk. Use Neon colors (Pink, Cyan, Purple), digital grids, circuit patterns, and glitch effects."; break;
            case 'Luxury': vibeInstruction = "STYLE: Luxury. Use Gold and Black gradients, symmetrical mandalas, silky smooth movement, and premium atmosphere."; break;
            case 'Nature': vibeInstruction = "STYLE: Organic Nature. Use Earth tones, cellular Voronoi patterns, flowing liquid shapes, and floral symmetry."; break;
            case 'Zen': vibeInstruction = "STYLE: Zen Meditative. Use Pastel colors, very slow expanding circles, soft gradients, and minimal geometry."; break;
            case 'Retro': vibeInstruction = "STYLE: Retro 80s/90s. Use Synthwave colors, wireframe landscapes, scanlines, and pixelated logic."; break;
            case 'Mystic': vibeInstruction = "STYLE: Mystic/Magic. Use Deep Purples, glowing symbols, rotating sacred geometry, and ethereal smoke layers."; break;
            case 'Random': default: vibeInstruction = "STYLE: Artistic Freedom. Create a unique, cohesive 2D pattern."; break;
        }

        let complexityInstruction = "";
        switch (complexity) {
            case 'Minimalist': complexityInstruction = "COMPLEXITY: Minimalist. Use simple shapes (Circles, Squares), negative space, and clean lines."; break;
            case 'Medium': complexityInstruction = "COMPLEXITY: Balanced. Create a detailed pattern with some layering."; break;
            case 'High': complexityInstruction = "COMPLEXITY: High Detail. Use complex fractals, multiple layers of noise (FBM), and intricate details."; break;
            case 'Insane': complexityInstruction = "COMPLEXITY: INSANE. Use extreme domain warping, 10+ octaves of FBM, micro-details, and heavy texture layering. Push the GPU."; break;
            default: complexityInstruction = "COMPLEXITY: Balanced."; break;
        }

        // Inject speed instruction
        const speedInstruction = `ANIMATION SPEED: Must use 'uTime * ${speedValue}' for all time-based animations to ensure correct speed.`;

        // Inject Perfect Loop Instruction (Based on User's Polar Logic)
        const loopInstruction = `PERFECT LOOPING REQUIRED:
        1. The animation MUST loop seamlessly every ${duration}.0 seconds.
        2. Do NOT use naked 'uTime'. Instead, calculate a localized phase 't' that resets every ${duration} seconds:
           'float t = (mod(uTime, ${duration}.0) / ${duration}.0) * 6.2831853;'
        3. Use 't' (which goes from 0 to 2*PI) for ALL motion using Sine/Cosine:
           'float angle = t;'
           'vec2 pos = vec2(sin(t), cos(t)) * 0.5;'
        4. If using Noise or FBM, you MUST sample it in a loop (Polar Noise):
           'float val = noise(vec2(sin(t)*3.0, cos(t)*3.0) + uv * 3.0);'
        5. CHECK: At t=0.0 and t=2*PI, the output MUST be visually identical.`;

        const fullSystemPrompt = `${SHADER_SYSTEM_PROMPT}\n\n${vibeInstruction}\n${complexityInstruction}\n${speedInstruction}\n${loopInstruction}`;

        const userMessage = `Create a shader for: ${prompt}. Ensure it loops every ${duration} seconds.`;

        // Gemini API request body
        const requestBody = {
            system_instruction: {
                parts: [{ text: fullSystemPrompt }]
            },
            contents: [
                {
                    role: 'user',
                    parts: [{ text: userMessage }]
                }
            ],
            generationConfig: {
                maxOutputTokens: 2000,
                temperature: 0.8,
            }
        };

        const response = await fetch(`${GEMINI_BASE_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Gemini API Error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // ... existing extraction ...
        const mainCode = extractGLSLCode(text);
        const fragmentCode = buildFullShader(mainCode, duration);

        return {
            id: generateId(),
            prompt,
            fragmentCode,
            timestamp: Date.now(),
            duration
        };
    } catch (error) {
        console.error('Failed to generate shader (Gemini):', error);
        throw new Error('Failed to generate shader from AI');
    }
}

// Generate multiple random shaders
export async function generateRandomShaders(
    count: number,
    vibe: string = 'Random',
    complexity: string = 'Medium',
    speed: string = 'Medium',
    duration: number = 10
): Promise<GeneratedShader[]> {
    const selectedPrompts = getRandomItems(RANDOM_PROMPTS, count);

    const results = await Promise.all(
        // Ensure duration is passed correctly here too
        selectedPrompts.map(prompt => generateShaderFromPrompt(prompt, vibe, complexity, speed, duration))
    );

    return results;
}

// Build full shader with uniforms and helpers (2D Canvas Engine)
function buildFullShader(aiCode: string, duration: number = 10): string {
    // Ensure duration has a decimal for GLSL float (e.g. 10.0)
    const durationFloat = duration.toFixed(1);

    const fixedMain = `
    // --- FIXED 2D ENGINE (DO NOT TOUCH) ---
    // HELPER: Rotate vector (Overload for AI mistakes)
    vec2 rot(vec2 v, float a) {
        float s = sin(a);
        float c = cos(a);
        return mat2(c, -s, s, c) * v;
    }

    void main() {
        // 1. Standardize UV (Aspect Ratio Corrected)

        vec2 uv = vUv * 2.0 - 1.0;
        uv.x *= uResolution.x / uResolution.y;

        // 2. Perfect Loop Time (0 to 2PI)
        float duration = ${durationFloat};
        float t = (mod(uTime, duration) / duration) * 6.2831853; 

        // 3. Call AI Art Logic
        vec3 col = art(uv, t);

        // 4. Post-Processing (Gamma & Grain)
        // Gamma Correction
        col = pow(col, vec3(0.4545)); 
        // Subtle Dithering to prevent banding
        col += (hash(uv.x + uv.y * t) - 0.5) * 0.02;

        gl_FragColor = vec4(col, 1.0);
    }
    `;

    return `
        uniform float uTime;
        uniform vec2 uResolution;
        varying vec2 vUv;
        
        // --- HELPERS ---
        ${GLSL_HELPER_FUNCTIONS}

        // --- FORWARD DECLARATIONS ---
        vec3 palette(float t);
        vec3 art(vec2 uv, float t);

        // --- AI CODE ---
        ${aiCode}

        // --- MAIN ENGINE ---
        ${fixedMain}
    `.trim();
}

// Helper to extract GLSL code from response
function extractGLSLCode(text: string): string {
    // 1. Try to find code inside ```glsl ... ```
    const glslMatch = text.match(/```glsl\s*([\s\S]*?)\s*```/);
    if (glslMatch && glslMatch[1]) {
        return cleanCode(glslMatch[1]);
    }

    // 2. Try to find code inside generic ``` ... ```
    const genericMatch = text.match(/```\s*([\s\S]*?)\s*```/);
    if (genericMatch && genericMatch[1]) {
        return cleanCode(genericMatch[1]);
    }

    // 3. Fallback: Use the whole text
    return cleanCode(text);
}

// Helper to clean up code artifacts
function cleanCode(code: string): string {
    code = code.trim();

    // Remove any remaining markdown backticks (just in case)
    code = code.replace(/```glsl/g, '');
    code = code.replace(/```/g, '');

    // Clean up common AI mistakes (declarations that should be hidden)
    code = code.replace(/^\s*uniform\s+float\s+uTime\s*;.*$/gm, '');
    code = code.replace(/^\s*uniform\s+vec2\s+uResolution\s*;.*$/gm, '');
    code = code.replace(/^\s*varying\s+vec2\s+vUv\s*;.*$/gm, '');

    // Prevent 't' redefinition error (float t = ...)
    // Prevent 't' redefinition error (float t = ... -> t = ...)
    // This allows the AI to update the time variable without valid redefinition error.
    code = code.replace(/float\s+t\s*=/g, 't =');

    // Force strict function signature (in case AI renames arguments or uses newlines)
    code = code.replace(/vec3\s+art\s*\([\s\S]*?\)\s*{/g, 'vec3 art(vec2 uv, float t) {');

    // Fix specific 'reflect' type mismatch error (vec2 vs vec3) often produced by AI
    // Pattern: reflect(lightDir, normalize(vec3(...))) where lightDir might be vec2
    // We force lightDir to vec3 just in case, and result to vec3.
    code = code.replace(/vec2\s+(\w+)\s*=\s*reflect\s*\(\s*(\w+)\s*,\s*normalize\s*\(\s*vec3/g, 'vec3 $1 = reflect(vec3($2, 0.0), normalize(vec3');

    // Fix 'float *= rot(...)' — rot() returns mat2, can't multiply with float
    // Pattern: d *= rot(angle); → REMOVE the line (nonsensical operation)
    code = code.replace(/^\s*\w+\s*\*=\s*rot\s*\([^)]*\)\s*;/gm, '// [AUTO-FIX] Removed invalid float *= rot() (mat2)');
    // Pattern: d = d * rot(angle); → REMOVE
    code = code.replace(/^\s*\w+\s*=\s*\w+\s*\*\s*rot\s*\([^)]*\)\s*;/gm, '// [AUTO-FIX] Removed invalid float * rot() (mat2)');
    // Pattern: float d = ... * rot(angle); → strip the * rot(...) part
    code = code.replace(/\*\s*rot\s*\(\s*[^)]*\s*\)/g, '/* rot removed */');

    // Fix 'hash' returning float when assigned to vec2 (AI mistake)
    // Pattern: vec2 p = hash(uv); -> vec2 p = hash2(uv);
    code = code.replace(/vec2\s+(\w+)\s*=\s*hash\s*\(/g, 'vec2 $1 = hash2(');

    // Fix 'float' assigned to 'vec3' (AI mistake)
    // Pattern: float a = ... vec3(...); -> vec3 a = ... vec3(...);
    // This looks for 'float var =' followed by 'vec3' or 'palette' (which returns vec3)
    code = code.replace(/float\s+(\w+)\s*=\s*(.*(?:vec3|palette)\s*\(.*)/g, 'vec3 $1 = $2');

    // Fix 'vec3' assigned from SDF (AI mistake, SDF returns float)
    // Pattern: vec3 d = sdBox(...); -> float d = sdBox(...);
    code = code.replace(/vec3\s+(\w+)\s*=\s*sd/g, 'float $1 = sd');

    // Fix 'vec3' with too many arguments (common AI hallucination of 6 args for palettes)
    // Pattern: vec3(a, b, c, d, e, f) -> vec3(a, b, c)
    // Uses callback to handle ANY number of arguments > 3 (safe for non-nested parens)
    code = code.replace(/vec3\s*\(([^()]+)\)/g, (match: string, args: string) => {
        const parts = args.split(',');
        if (parts.length > 3) {
            return `vec3(${parts.slice(0, 3).join(',')})`;
        }
        return match;
    });

    // Fix 'vec3 x = dot(...)' — dot() ALWAYS returns float, never vec3
    // This is a very common AI mistake. Catch ALL variable names.
    code = code.replace(/vec3\s+(\w+)\s*=\s*dot\s*\(/g, 'float $1 = dot(');

    // Fix 'vec3 x = clamp(dot(...))' or 'vec3 x = clamp(float_expr, ...)'
    code = code.replace(/vec3\s+(\w+)\s*=\s*clamp\s*\(\s*dot\s*\(/g, 'float $1 = clamp(dot(');

    // Fix 'specularIntensity' or similar dot-product results assigned to vec3 (should be float)
    // Pattern: vec3 var = pow(max(dot(...)...)...); -> float var = ...
    // Case 1: vec3 specularIntensity = pow... (Direct match)
    code = code.replace(/vec3\s+(specularIntensity|specular|highlight|diffuse)\s*=\s*(pow|max|dot|clamp|abs|min|length|distance|step|smoothstep)/g, 'float $1 = $2');

    // Case 2: General vec3 = pow(max(dot...  (Already covered but reinforcing)
    code = code.replace(/vec3\s+(\w+)\s*=\s*pow\s*\(\s*max\s*\(\s*dot/g, 'float $1 = pow(max(dot');

    // 4. UNSUPPORTED FEATURES (Textures/Channels)
    // Comment out lines attempting to use textures (to prevent crash)
    code = code.replace(/.*texture\s*\(.*/gi, '// Texture sampling removed (Unsupported)');
    code = code.replace(/.*iChannel.*/gi, '// iChannel removed (Unsupported)');

    // Remove helper functions using robust brace counting
    // 1. Math/Color Helpers
    code = removeGLSLFunction(code, 'hsv2rgb');
    code = removeGLSLFunction(code, 'rgb2hsv');
    code = removeGLSLFunction(code, 'rotate2D');
    code = removeGLSLFunction(code, 'rot');
    code = removeGLSLFunction(code, 'hash');
    code = removeGLSLFunction(code, 'hash12');
    code = removeGLSLFunction(code, 'hash22');
    code = removeGLSLFunction(code, 'random');
    code = removeGLSLFunction(code, 'random2');

    // 2. Noise & FBM (Aggressive strip because of overloads)
    code = removeGLSLFunction(code, 'noise');
    code = removeGLSLFunction(code, 'fbm');
    code = removeGLSLFunction(code, 'snoise');
    code = removeGLSLFunction(code, 'cnoise');
    code = removeGLSLFunction(code, 'pnoise');
    code = removeGLSLFunction(code, 'perlin');
    code = removeGLSLFunction(code, 'simplex');
    code = removeGLSLFunction(code, 'valueNoise');
    code = removeGLSLFunction(code, 'gradientNoise');
    code = removeGLSLFunction(code, 'vnoise');
    code = removeGLSLFunction(code, 'gnoise');
    code = removeGLSLFunction(code, 'unoise'); // Unsigned Noise

    // Custom Noise Helpers (Permutations, Gradients)
    code = removeGLSLFunction(code, 'permute');
    code = removeGLSLFunction(code, 'taylorInvSqrt');
    code = removeGLSLFunction(code, 'fade');
    code = removeGLSLFunction(code, 'mod289');
    code = removeGLSLFunction(code, 'grad4');
    code = removeGLSLFunction(code, 'grad');

    // 3. SDF Primitives (AI often re-defines these)
    code = removeGLSLFunction(code, 'sdCircle');
    code = removeGLSLFunction(code, 'sdBox2D');
    code = removeGLSLFunction(code, 'sdHexagon');
    code = removeGLSLFunction(code, 'sdEquilateralTriangle');

    // SCRUB 'void main()' completely
    code = removeGLSLFunction(code, 'main');

    // Validation
    if (code.trim().length === 0) {
        return `
        vec3 palette(float t) { return vec3(0.5); }
        vec3 art(vec2 uv, float t) { return vec3(1.0, 0.0, 1.0); } // Error Fallback
        `;
    }

    return code.trim();
}

/**
 * Robustly removes a GLSL function definition by finding its start and end (balanced braces).
 * Handles:
 * - `type name(...) { ... }`
 * - `void name() { ... }`
 * - Nested braces (if/for/while/structs)
 */
function removeGLSLFunction(code: string, functionName: string): string {
    // Regex to find the start of the function:
    // "type name ( args ) {"
    // We look for: <return_type> <space> <functionName> <space*> ( <args> ) <anything_before_brace> {
    // Return type can be multi-word (e.g. "highp float", "const vec3")
    const startRegex = new RegExp(`(?:\\b\\w+\\b\\s+){1,3}${functionName}\\s*\\([^)]*\\)[^{]*\\{`, 'g');

    let match;
    while ((match = startRegex.exec(code)) !== null) {
        const startIndex = match.index;
        const braceStartIndex = match.index + match[0].length - 1; // Index of the opening '{'

        // Scan forward to find balancing closing brace '}'
        let braceCount = 1;
        let endIndex = -1;

        for (let i = braceStartIndex + 1; i < code.length; i++) {
            if (code[i] === '{') {
                braceCount++;
            } else if (code[i] === '}') {
                braceCount--;
                if (braceCount === 0) {
                    endIndex = i;
                    break;
                }
            }
        }

        if (endIndex !== -1) {
            // Remove the function including the closing brace
            const before = code.substring(0, startIndex);
            const after = code.substring(endIndex + 1);
            code = before + "\n" + after; // Join with newline to avoid merging lines

            // Reset regex search since string changed
            startRegex.lastIndex = 0;
        } else {
            // Malformed function (no closing brace found), stop
            break;
        }
    }
    return code;
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
