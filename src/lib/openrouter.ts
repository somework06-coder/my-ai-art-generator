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
    return -length(p) * sign(p.y);
}

// Star polygon SDF (Inigo Quilez)
float sdStarPolygon(vec2 p, float r, int n, float m) {
    float an = 3.141593 / float(n);
    float en = 3.141593 / m;
    vec2 acs = vec2(cos(an), sin(an));
    vec2 ecs = vec2(cos(en), sin(en));
    float bn = mod(atan(p.x, p.y), 2.0 * an) - an;
    p = length(p) * vec2(cos(bn), abs(sin(bn)));
    p -= r * acs;
    p += ecs * clamp(-dot(p, ecs), 0.0, r * acs.y / ecs.y);
    return length(p) * sign(p.x);
}

// OVERLOADS for sdStarPolygon (AI often uses wrong arg counts)
float sdStarPolygon(vec2 p, float r, float n) { return sdStarPolygon(p, r, int(n), 3.0); }
float sdStarPolygon(vec2 p, float n, float sharpness, float angle) {
    float c = cos(angle); float s = sin(angle);
    p = mat2(c, -s, s, c) * p;
    return sdStarPolygon(p, 0.5, int(max(n, 3.0)), max(sharpness * 6.0, 2.0));
}

// Simple star SDF
float sdStar(vec2 p, float r) { return sdStarPolygon(p, r, 5, 2.5); }

// Cross SDF
float sdCross(vec2 p, vec2 b) {
    p = abs(p);
    if (p.y > p.x) p = p.yx;
    vec2 q = p - b;
    float k = max(q.y, q.x);
    vec2 w = (k > 0.0) ? q : vec2(b.y - p.x, -k);
    return sign(k) * length(max(w, 0.0));
}

// Ring SDF
float sdRing(vec2 p, float r, float w) {
    return abs(length(p) - r) - w;
}

// ALIAS: sdBox (Standard Inigo Quilez naming)
float sdBox(vec2 p, vec2 b) { return sdBox2D(p, b); }

// OVERLOAD: sdHexagon(vec2 radius) - Use X component
float sdHexagon(vec2 p, vec2 r) { return sdHexagon(p, r.x); }
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

// Hash returning vec3 (AI frequently expects this)
vec3 hash3(vec2 p) {
    return vec3(hash(p), hash(p + vec2(37.0, 17.0)), hash(p + vec2(59.0, 83.0)));
}
vec3 hash3(float n) {
    return vec3(hash(n), hash(n + 37.0), hash(n + 59.0));
}
// OVERLOAD: hash(vec2) returning vec3 (AI often expects this)
vec3 hash33(vec2 p) { return hash3(p); }

// --- ADDITIONAL SDF PRIMITIVES (Common AI hallucinations) ---
// Capsule/Line SDF
float sdCapsule(vec2 p, vec2 a, vec2 b, float r) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - r;
}
// Segment alias
float sdSegment(vec2 p, vec2 a, vec2 b, float r) { return sdCapsule(p, a, b, r); }
float sdLine(vec2 p, vec2 a, vec2 b) { return sdCapsule(p, a, b, 0.01); }

// OVERLOAD: sdCircle(vec2 p, vec2 center, float r) — center-offset version
float sdCircle(vec2 p, vec2 center, float r) { return length(p - center) - r; }

// OVERLOAD: sdBox(vec2 p, vec2 center, vec2 size) — 3-arg version (wrong but common)
// Note: can't overload with same types, so we add sdBoxCentered
float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 d = abs(p) - b + r;
    return length(max(d, 0.0)) - r + min(max(d.x, d.y), 0.0);
}
// ALIAS: sdBox2D (AI often uses this)
float sdBox2D(vec2 p, vec2 center, vec2 b) { return sdBox(p - center, b); } 
float sdBox2D(vec2 p, vec2 b, mat2 m) { return sdBox(p * m, b); }
// OVERLOAD: sdBox 3-args (p, center, size)
float sdBox(vec2 p, vec2 center, vec2 b) { return sdBox(p - center, b); }

// OVERLOAD: sdStar 4-args (p, radius1, radius2, ?) -> AI usage: sdStar(p, r1, r2, r3)
// We map to standard 5-point star or generic n-star
float sdStar(vec2 p, float r1, float r2, float r3) {
    // Assuming r1=scale, r2=radius, r3=inner_radius? 
    // Just mapping to standard star 5 points
    return sdStarPolygon(p, max(r1, r2), 5, 3.0); 
}

// Ellipse SDF (uses 't' as local — must not conflict with art() parameter)
float sdEllipse(vec2 p, vec2 ab) {
    p = abs(p);
    if (p.x > p.y) { p = p.yx; ab = ab.yx; }
    float l = ab.y * ab.y - ab.x * ab.x;
    float m = ab.x * p.x / l;
    float n = ab.y * p.y / l;
    float tVal = clamp((m + n) / 2.0, 0.0, 1.0);
    float x = ab.x * tVal;
    float y = ab.y * sqrt(1.0 - tVal * tVal);
    return length(vec2(x, y) - p);
}
// OVERLOAD: sdEllipse(p, center, radii)
float sdEllipse(vec2 p, vec2 center, vec2 r) { return sdEllipse(p - center, r); }

// OVERLOAD: sdSegment(p, a, b) — 3 args
float sdSegment(vec2 p, vec2 a, vec2 b) { return sdSegment(p, a, b, 0.0); }
// -----------------------------------------------------------

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

// --- ELITE PROMPT SYSTEM (Stock Footage Ready) — 52 Prompts ---
const RANDOM_PROMPTS = [
    // 🌌 SPACE & COSMIC (6)
    "Aurora borealis curtain, shimmering green and purple light ribbons dancing across a dark polar sky, magnetic field visualization.",
    "Supernova shockwave expansion, radiant energy rings pulsing outward from a stellar core, deep space nebula backdrop.",
    "Nebula gas clouds, swirling cosmic dust in violet and magenta, distant star formation, Hubble telescope aesthetic.",
    "Wormhole tunnel, spiraling spacetime distortion with gravitational lensing, light bending into hypnotic vortex, interstellar travel.",
    "Asteroid field flythrough, tumbling rocks with rim lighting, distant planet horizon glow, cinematic space exploration.",
    "Star formation nursery, glowing hydrogen clouds collapsing into protostars, cosmic filaments, deep field astronomy.",

    // 🌊 WATER & FLUID (7)
    "Deep ocean caustics, dancing light patterns on sandy seafloor, sun rays filtering through turquoise water, peaceful underwater.",
    "Tropical coral reef light, bioluminescent organisms gently pulsing in dark water, ethereal underwater glow, marine biology.",
    "Rain on glass surface, water droplets sliding down with refracted city lights behind, moody atmospheric bokeh, cinematic.",
    "Lava flow meeting ocean, molten rock cooling with steam clouds, orange and teal contrast, volcanic power, extreme nature.",
    "Mercury droplets dancing, liquid metal cohesion and surface tension, chrome reflections, micro photography style.",
    "Ink drop explosion in water, colorful pigment dispersing in slow motion, artistic fluid dynamics, macro photography.",
    "Abstract waterfall mist, cascading light particles through fog layers, zen atmosphere, dreamy nature visualization.",

    // 🔥 ENERGY & PARTICLES (6)
    "Plasma ball lightning, electric tendrils reaching outward from a core sphere, purple and blue energy arcs, Tesla coil inspired.",
    "Solar flare eruption, magnetic field lines whipping from a star surface, extreme close-up, NASA visualization style.",
    "Electric arc Tesla coil discharge, branching lightning in a dark laboratory, high voltage beauty, science aesthetic.",
    "Firefly swarm at twilight, hundreds of bioluminescent dots floating in warm summer air, magical forest atmosphere.",
    "Sparkler trail long exposure, golden particle streams tracing circular arcs, celebration fireworks, festive motion.",
    "Nuclear fusion plasma, superheated hydrogen contained in magnetic field, tokamak reactor visualization, clean energy future.",

    // 💎 ABSTRACT GEOMETRIC (7)
    "Voronoi glass mosaic, shattered crystal pattern with light refracting through colored cells, architectural stained glass.",
    "Kaleidoscope mandala, infinite symmetrical reflections creating intricate sacred patterns, meditation visual, psychedelic art.",
    "Fractal zoom, infinite Mandelbrot set exploration with custom color mapping, mathematical beauty, deep zoom animation.",
    "Moiré interference patterns, overlapping geometric grids creating optical illusions, minimalist black and white op-art.",
    "Impossible geometry, Escher-inspired impossible architecture with infinite staircases, paradoxical 3D space in 2D.",
    "Sacred geometry bloom, flower of life pattern expanding with golden ratio spirals, spiritual consciousness visualization.",
    "Penrose tiling animation, non-repeating aperiodic pattern growing outward, crystallography meets art, mathematical precision.",

    // 🏙 TECH & DIGITAL (7)
    "Circuit board traces, glowing copper pathways on dark PCB, data flowing through components, micro-technology visualization.",
    "Cyberpunk data stream matrix, flowing binary code rain with neon green digital artifacts, high-tech interface background.",
    "Holographic display, flickering translucent data panels floating in 3D space, sci-fi command center, blue interface.",
    "Radar scan sweep, rotating detection beam revealing targets on dark grid, military HUD interface, green phosphor CRT.",
    "Digital network connections, glowing nodes and plexus lines connecting in space, deep blue technology, data visualization.",
    "Blockchain network, interconnected cryptographic blocks with hash chains, decentralized web visualization, futuristic finance.",
    "Quantum computing qubits, interference patterns of probability waves, superposition visualization, next-gen technology.",

    // 🌿 ORGANIC & NATURE (6)
    "Cell division microscope, mitosis time-lapse with chromosomes separating, biology visualization, fluorescence microscopy.",
    "Tree ring growth pattern, concentric wood grain expanding outward, time passing through nature, botanical art.",
    "Butterfly wing scales, iridescent nano-structures creating structural color, extreme macro photography, nature's engineering.",
    "Coral polyp bloom, tiny marine organisms extending and retracting tentacles, underwater macro, bioluminescent tips.",
    "Mycelium network spreading, fungal threads connecting forest floor, underground internet of nature, bio-network.",
    "DNA double helix rotation, nucleotide base pairs illuminated, molecular biology visualization, life's blueprint.",

    // 🎵 MUSIC & AUDIO (6)
    "Audio waveform visualizer, sound amplitude oscillating with bass and treble, music production interface, beat visualization.",
    "Frequency spectrum analyzer, colorful bars rising and falling to rhythm, equalizer display, electronic music atmosphere.",
    "Bass drop shockwave, concentric pressure rings expanding from impact point, dubstep visualization, concert visual.",
    "Vinyl record groove, microscopic needle tracking through spiral pattern, analog warmth, lo-fi aesthetic, retro audio.",
    "Sound cymatics, sand patterns forming geometric shapes on vibrating plate, physics made visible, Chladni figures.",
    "Music equalizer landscape, terrain generated from audio frequencies, synthwave colors, immersive sound visualization.",

    // ✨ LUXURY & PREMIUM (7)
    "Liquid gold flow, molten 24-karat metal flowing in slow motion, luxury brand aesthetic, premium product backdrop.",
    "Diamond light dispersion, rainbow prism effect through cut gemstone facets, extreme brilliance, jewelry commercial.",
    "Marble texture veins, flowing mineral patterns in Carrara white stone, luxury interior design, architectural beauty.",
    "Silk fabric wave, premium cloth billowing in invisible wind, soft shadows and specular highlights, fashion editorial.",
    "Crystal refraction, light splitting through geometric glass prism, rainbow caustics, scientific elegance.",
    "Pearl iridescence, nacre surface shimmering with orientation-dependent color, organic luxury, subtle beauty.",
    "Champagne bubbles rising, golden effervescence in warm backlight, celebration atmosphere, premium beverage commercial."
];

export interface GeneratedShader {
    id: string;
    prompt: string;
    fragmentCode: string;
    timestamp: number;
    duration: number;
}

// --- COLOR PALETTE INJECTION ---
function getPaletteInstruction(palette: string): string {
    const palettes: Record<string, string> = {
        'Sunset': 'COLOR PALETTE: Use warm sunset colors — deep orange #FF6B35, coral #FF4444, golden yellow #FFD700, purple dusk #4A0E4E. Your palette() function MUST use these hues.',
        'Ocean': 'COLOR PALETTE: Use cool ocean colors — deep blue #003366, cyan #00CED1, seafoam #20B2AA, white foam #F0F8FF. Your palette() function MUST use these hues.',
        'Neon': 'COLOR PALETTE: Use electric neon colors — hot pink #FF1493, electric blue #00BFFF, lime green #39FF14, violet #8B00FF. Your palette() function MUST use these vibrant hues.',
        'Pastel': 'COLOR PALETTE: Use soft pastel colors — baby pink #FFB6C1, lavender #E6E6FA, mint #98FB98, peach #FFDAB9. Your palette() function MUST use these soft hues.',
        'Monochrome': 'COLOR PALETTE: Use ONLY shades of white, grey, and black. NO color hue. Your palette() MUST return greyscale values only.',
        'Fire': 'COLOR PALETTE: Use fire colors — deep red #8B0000, orange #FF4500, yellow #FFD700, white-hot #FFFFF0. Your palette() function MUST use these hues.',
        'Forest': 'COLOR PALETTE: Use forest colors — dark green #006400, moss #8FBC8F, brown bark #8B4513, golden light #DAA520. Your palette() function MUST use these hues.',
    };
    return palettes[palette] || ''; // 'Auto' returns empty (AI chooses freely)
}

// --- MOTION STYLE INJECTION ---
function getMotionInstruction(motionStyle: string): string {
    const styles: Record<string, string> = {
        'Flow': 'MOTION STYLE: Use flowing sine waves, fluid dynamics, smooth organic curves. No sharp edges, no sudden changes. Think: liquid, silk, wind.',
        'Rotate': 'MOTION STYLE: Use rotating geometry, spinning patterns, orbital motion around center point. Use rot(t) and polar coordinates extensively.',
        'Pulse': 'MOTION STYLE: Use expanding/contracting shapes, breathing rhythm, concentric waves radiating from center. Think: heartbeat, ripples, sonar.',
        'Morph': 'MOTION STYLE: Use shape-shifting, smooth metamorphosis between forms, interpolation between different SDF shapes using mix(). Think: transformation, evolution.',
        'Glitch': 'MOTION STYLE: Use digital glitch effects — random displacements, pixelation, UV distortion, RGB channel splitting, and sudden jumps. Think: broken screen, data corruption.',
    };
    return styles[motionStyle] || ''; // 'Random' returns empty (AI chooses freely)
}

// Generate shader from user prompt using Gemini API
export async function generateShaderFromPrompt(
    prompt: string,
    vibe: string = 'Random',
    complexity: string = 'Medium',
    speed: string = 'Medium',
    duration: number = 10,
    isRandom: boolean = false,
    palette: string = 'Auto',
    motionStyle: string = 'Random'
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

        const fullSystemPrompt = `${SHADER_SYSTEM_PROMPT}\n\n${vibeInstruction}\n${complexityInstruction}\n${getPaletteInstruction(palette)}\n${getMotionInstruction(motionStyle)}\n${speedInstruction}\n${loopInstruction}`;

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
                temperature: isRandom ? 1.1 : 0.7,
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
    duration: number = 10,
    palette: string = 'Auto',
    motionStyle: string = 'Random'
): Promise<GeneratedShader[]> {
    const selectedPrompts = getRandomItems(RANDOM_PROMPTS, count);

    if (count <= 1) {
        // Single shader — normal generation
        const result = await generateShaderFromPrompt(selectedPrompts[0], vibe, complexity, speed, duration, true, palette, motionStyle);
        return [result];
    }

    // BATCH COHESIVE MODE: Generate first shader, then create variations
    const firstResult = await generateShaderFromPrompt(selectedPrompts[0], vibe, complexity, speed, duration, true, palette, motionStyle);

    // For remaining shaders, create variations of the first prompt's style
    const variationPromises = selectedPrompts.slice(1).map((_, i) => {
        const variationPrompt = `Create a VARIATION #${i + 2} of this concept: "${selectedPrompts[0]}". Keep the same mood and energy, but use DIFFERENT shapes, a different composition layout, and different motion patterns. Make it clearly distinct but stylistically cohesive.`;
        return generateShaderFromPrompt(variationPrompt, vibe, complexity, speed, duration, true, palette, motionStyle);
    });

    const variationResults = await Promise.all(variationPromises);
    return [firstResult, ...variationResults];
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

        // 4. POST-PROCESSING (Cinematic)
        // Bloom (bright areas glow)
        vec3 bloom = max(col - 0.6, 0.0) * 1.5;
        col += bloom * 0.25;

        // Vignette (cinematic dark edges)
        float vig = 1.0 - dot(uv * 0.4, uv * 0.4);
        col *= smoothstep(0.0, 0.8, vig);

        // Chromatic Aberration (subtle RGB split — UV-based, no extra art() calls)
        float caOffset = 0.003;
        vec2 caR = uv + vec2(caOffset, 0.0);
        vec2 caB = uv - vec2(caOffset, 0.0);
        vec3 colR = art(caR, t);
        vec3 colB = art(caB, t);
        col = vec3(colR.r, col.g, colB.b) * 0.5 + col * 0.5;

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

    // Fix bare PI constants (AI sometimes uses undefined constants)
    // Replace PI, M_PI, TWO_PI with their numeric values
    code = code.replace(/\bM_PI\b/g, '3.14159265359');
    code = code.replace(/\bTWO_PI\b/g, '6.28318530718');
    // Remove #define PI/TAU if AI redefines them (we already have them in helpers)
    code = code.replace(/^#define\s+(PI|TAU|TWO_PI)\b.*$/gm, '// [AUTO-FIX] Removed duplicate #define');
    // Fix bare float constants that cause syntax errors (e.g. stray ';3.14...')  
    code = code.replace(/;\s*([\d]+\.[\d]+)\s*\n/g, '; // $1\n');

    // Clean up common AI mistakes (declarations that should be hidden)
    code = code.replace(/^\s*uniform\s+float\s+uTime\s*;.*$/gm, '');
    code = code.replace(/^\s*uniform\s+vec2\s+uResolution\s*;.*$/gm, '');
    code = code.replace(/^\s*varying\s+vec2\s+vUv\s*;.*$/gm, '');

    // Prevent 't' redefinition error ONLY inside art() function
    // The 'float t =' replacement was too aggressive — it broke helper functions
    // that use 't' as a local variable. Now we only apply inside the art function body.
    code = fixFloatT_InArtFunction(code);

    // Force strict function signature (in case AI renames arguments or uses newlines)
    code = code.replace(/vec3\s+art\s*\([\s\S]*?\)\s*{/g, 'vec3 art(vec2 uv, float t) {');

    // Fix duplicate PI declaration (we already define PI via #define)
    // Pattern: float PI = 3.14159...; -> // PI already defined
    code = code.replace(/^\s*(?:const\s+)?float\s+PI\s*=\s*[0-9.]+\s*;/gm, '// [AUTO-FIX] Removed duplicate PI declaration');

    // Fix specific 'reflect' type mismatch error (vec2 vs vec3) often produced by AI
    // Pattern: reflect(lightDir, normalize(vec3(...))) where lightDir might be vec2
    // We force lightDir to vec3 just in case, and result to vec3.
    code = code.replace(/vec2\s+(\w+)\s*=\s*reflect\s*\(\s*(\w+)\s*,\s*normalize\s*\(\s*vec3/g, 'vec3 $1 = reflect(vec3($2, 0.0), normalize(vec3');

    // Fix 'float *= rot(...)' — rot() returns mat2, can't multiply with float
    // Pattern: d *= rot(angle); → REMOVE the line (nonsensical operation)
    code = code.replace(/^\s*\w+\s*\*=\s*rot\s*\([^)]*\)\s*;/gm, '// [AUTO-FIX] Removed invalid float *= rot() (mat2)');
    // Pattern: d = d * rot(angle); → REMOVE
    code = code.replace(/^\s*\w+\s*=\s*\w+\s*\*\s*rot\s*\([^)]*\)\s*;/gm, '// [AUTO-FIX] Removed invalid float * rot() (mat2)');
    // Pattern: float d = ... * rot(angle); -> strip the * rot(...) part
    // [DISABLED] This was too aggressive and broke valid 'vec2 * mat2' coordinate rotations
    // code = code.replace(/\*\s*rot\s*\(\s*[^)]*\s*\)/g, '/* rot removed */');

    // Fix 'hash' returning float when assigned to vec2 (AI mistake)
    // Pattern: vec2 p = hash(uv); -> vec2 p = hash2(uv);
    code = code.replace(/vec2\s+(\w+)\s*=\s*hash\s*\(/g, 'vec2 $1 = hash2(');

    // Fix 'hash' returning float when assigned to vec3 (AI mistake)
    // Pattern: vec3 h = hash(uv); -> vec3 h = hash3(uv);
    code = code.replace(/vec3\s+(\w+)\s*=\s*hash\s*\(/g, 'vec3 $1 = hash3(');

    // Fix 'hash(p).x' or .y or .z access implies vector return
    // Pattern: hash(...).x -> hash3(...).x
    code = code.replace(/hash\s*\(([^)]+)\)\.([xyz])/g, 'hash3($1).$2');
    // Pattern: hash(...).rg -> hash3(...).rg
    code = code.replace(/hash\s*\(([^)]+)\)\.([rgb])/g, 'hash3($1).$2');

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
    // Added: shadowFactor, shadow, light
    code = code.replace(/vec3\s+(specularIntensity|specular|highlight|diffuse|shadowFactor|shadow|light)\s*=\s*(pow|max|dot|clamp|abs|min|length|distance|step|smoothstep)/g, 'float $1 = $2');

    // Case 2: Broad fix for vec3 = max(0.0, ...) which is always a float lighting calculation
    code = code.replace(/vec3\s+(\w+)\s*=\s*max\s*\(\s*0\.0/g, 'float $1 = max(0.0');

    // Case 3: General vec3 = pow(max(dot...  (Already covered but reinforcing)
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

    // 3. SDF Primitives (AI often re-defines these — we provide all in helpers)
    code = removeGLSLFunction(code, 'sdCircle');
    code = removeGLSLFunction(code, 'sdBox2D');
    code = removeGLSLFunction(code, 'sdBox');
    code = removeGLSLFunction(code, 'sdHexagon');
    code = removeGLSLFunction(code, 'sdEquilateralTriangle');
    code = removeGLSLFunction(code, 'sdStarPolygon');
    code = removeGLSLFunction(code, 'sdStar');
    code = removeGLSLFunction(code, 'sdCross');
    code = removeGLSLFunction(code, 'sdRing');
    code = removeGLSLFunction(code, 'sdCapsule');
    code = removeGLSLFunction(code, 'sdSegment');
    code = removeGLSLFunction(code, 'sdLine');
    code = removeGLSLFunction(code, 'sdRoundedBox');
    code = removeGLSLFunction(code, 'sdEllipse');
    code = removeGLSLFunction(code, 'hash2');
    code = removeGLSLFunction(code, 'hash3');
    code = removeGLSLFunction(code, 'hash33');

    // SCRUB 'void main()' completely
    code = removeGLSLFunction(code, 'main');

    // Validation: ensure art() function exists
    if (!code.includes('vec3 art(') && !code.includes('vec3 art (')) {
        // AI completely failed to generate art() — pick a random fallback
        const artFallbacks = [
            // 1. Pulsing circles
            `vec3 art(vec2 uv, float t) {
                float d = length(uv) - 0.5 + 0.2 * sin(t * 2.0);
                vec3 col = palette(d * 3.0 + t);
                col *= smoothstep(0.02, 0.0, abs(d));
                col += palette(length(uv) + t) * 0.3;
                return col;
            }`,
            // 2. Spiral galaxy
            `vec3 art(vec2 uv, float t) {
                float a = atan(uv.y, uv.x);
                float r = length(uv);
                float spiral = sin(a * 3.0 + r * 8.0 - t * 2.0);
                vec3 col = palette(spiral * 0.5 + t * 0.3) * smoothstep(1.5, 0.0, r);
                col += vec3(1.0, 0.9, 0.7) * 0.02 / (r + 0.02);
                return col;
            }`,
            // 3. Wave interference
            `vec3 art(vec2 uv, float t) {
                float w1 = sin(uv.x * 8.0 + t * 2.0) * sin(uv.y * 6.0 + t);
                float w2 = sin(length(uv) * 12.0 - t * 3.0);
                float w = (w1 + w2) * 0.5;
                vec3 col = palette(w + t * 0.2);
                col *= 0.8 + 0.2 * w;
                return col;
            }`,
            // 4. Geometric kaleidoscope
            `vec3 art(vec2 uv, float t) {
                float a = atan(uv.y, uv.x) + t * 0.5;
                a = mod(a, 1.047) - 0.524;
                vec2 p = length(uv) * vec2(cos(a), sin(a));
                float d = abs(p.x) + abs(p.y) - 0.3;
                vec3 col = palette(d * 4.0 + t);
                col *= smoothstep(0.02, 0.0, abs(d)) + 0.3;
                return col;
            }`,
            // 5. Electric field
            `vec3 art(vec2 uv, float t) {
                vec3 col = vec3(0.0);
                for (float i = 0.0; i < 4.0; i++) {
                    vec2 p = vec2(sin(t + i * 1.57), cos(t * 0.7 + i * 1.57)) * 0.5;
                    float d = length(uv - p);
                    col += palette(d * 5.0 + i + t) / (d * 15.0 + 0.3);
                }
                return col;
            }`,
            // 6. Nebula clouds
            `vec3 art(vec2 uv, float t) {
                float n = 0.0;
                vec2 p = uv * 3.0;
                for (float i = 1.0; i < 5.0; i++) {
                    p += vec2(sin(t * 0.3 + p.y * i), cos(t * 0.2 + p.x * i)) * 0.3 / i;
                    n += sin(p.x * i + t) * sin(p.y * i - t) / i;
                }
                vec3 col = palette(n * 2.0 + t * 0.1) * (0.5 + n * 0.5);
                return col;
            }`
        ];
        const pick = artFallbacks[Math.floor(Math.random() * artFallbacks.length)];
        code += '\n' + pick + '\n';
    }

    // If palette() is missing, add a default one
    if (!code.includes('vec3 palette(') && !code.includes('vec3 palette (')) {
        code = `
        vec3 palette(float t) {
            return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
        }
        ` + code;
    }

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

/**
 * Fix 'float t =' only inside the art() function body.
 * In helper functions, 't' is a valid local variable and should NOT be stripped.
 */
function fixFloatT_InArtFunction(code: string): string {
    // Find the art() function
    const artMatch = code.match(/vec3\s+art\s*\(\s*vec2\s+\w+\s*,\s*float\s+\w+\s*\)\s*\{/);
    if (!artMatch || artMatch.index === undefined) return code;

    const artStart = artMatch.index;
    // Find the matching closing brace for art()
    const openBrace = code.indexOf('{', artStart);
    if (openBrace === -1) return code;

    let braceCount = 1;
    let artEnd = -1;
    for (let i = openBrace + 1; i < code.length; i++) {
        if (code[i] === '{') braceCount++;
        if (code[i] === '}') braceCount--;
        if (braceCount === 0) { artEnd = i; break; }
    }
    if (artEnd === -1) return code;

    // Only replace 'float t =' inside the art() function body
    const before = code.substring(0, openBrace + 1);
    let artBody = code.substring(openBrace + 1, artEnd);
    const after = code.substring(artEnd);

    artBody = artBody.replace(/float\s+t\s*=/g, 't =');

    return before + artBody + after;
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
