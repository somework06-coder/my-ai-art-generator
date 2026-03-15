// Fallback Shader Templates
// These are hand-crafted GLSL shaders used when AI generation fails.
// Each provides the `palette(float t)` and `art(vec2 uv, float t)` functions
// that plug directly into the existing buildFullShader() engine.

export interface FallbackShader {
    title: string;
    prompt: string;
    code: string;
}

export const FALLBACK_SHADERS: FallbackShader[] = [
    // ─────────────────────────────────────────────
    // 1. Rainbow Spiral
    // ─────────────────────────────────────────────
    {
        title: "Rainbow Spiral",
        prompt: "Vibrant rainbow spiral vortex with smooth color transitions",
        code: `
vec3 palette(float t) {
    return vec3(0.5) + 0.5 * cos(6.28318 * (vec3(1.0) * t + vec3(0.0, 0.33, 0.67)));
}

vec3 art(vec2 uv, float t) {
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    float spiral = sin(angle * 5.0 - radius * 10.0 + t * 2.0);
    float wave = sin(radius * 8.0 - t * 3.0) * 0.5 + 0.5;
    vec3 col = palette(spiral * 0.5 + wave * 0.5 + t * 0.1);
    col *= smoothstep(2.5, 0.0, radius);
    col += vec3(0.05) * smoothstep(0.02, 0.0, abs(spiral)) * wave;
    return col;
}
        `
    },

    // ─────────────────────────────────────────────
    // 2. Neon Grid Pulse
    // ─────────────────────────────────────────────
    {
        title: "Neon Grid Pulse",
        prompt: "Futuristic neon grid with pulsing energy lines",
        code: `
vec3 palette(float t) {
    return vec3(0.5, 0.2, 0.8) + 0.5 * cos(6.28318 * (vec3(0.8, 0.5, 1.0) * t + vec3(0.0, 0.1, 0.2)));
}

vec3 art(vec2 uv, float t) {
    vec2 grid = fract(uv * 4.0) - 0.5;
    vec2 id = floor(uv * 4.0);
    float pulse = sin(t + hash(id) * 6.28) * 0.5 + 0.5;
    float lineX = smoothstep(0.02, 0.0, abs(grid.x)) * pulse;
    float lineY = smoothstep(0.02, 0.0, abs(grid.y)) * pulse;
    float glow = smoothstep(0.3, 0.0, length(grid)) * pulse * 0.3;
    vec3 col = palette(hash(id) + t * 0.2) * (lineX + lineY + glow);
    col += vec3(0.02, 0.01, 0.04);
    return col;
}
        `
    },

    // ─────────────────────────────────────────────
    // 3. Liquid Aurora
    // ─────────────────────────────────────────────
    {
        title: "Liquid Aurora",
        prompt: "Flowing aurora borealis with undulating color waves",
        code: `
vec3 palette(float t) {
    return vec3(0.2, 0.5, 0.4) + 0.5 * cos(6.28318 * (vec3(0.5, 0.8, 0.6) * t + vec3(0.0, 0.25, 0.5)));
}

vec3 art(vec2 uv, float t) {
    float n1 = fbm(vec2(uv.x * 2.0 + sin(t) * 0.5, uv.y * 1.5 + t * 0.3));
    float n2 = fbm(vec2(uv.x * 1.5 - t * 0.2, uv.y * 2.0 + cos(t) * 0.4));
    float wave = sin(uv.y * 3.0 + n1 * 4.0 + t) * 0.5 + 0.5;
    vec3 col = mix(palette(n1 + t * 0.1), palette(n2 - t * 0.15), wave);
    col *= 0.7 + 0.3 * sin(uv.y * 6.0 + t);
    col = mix(col, vec3(0.0), smoothstep(1.5, 2.0, abs(uv.y)));
    return col;
}
        `
    },

    // ─────────────────────────────────────────────
    // 4. Fractal Mandala
    // ─────────────────────────────────────────────
    {
        title: "Fractal Mandala",
        prompt: "Sacred geometry mandala with rotating fractal patterns",
        code: `
vec3 palette(float t) {
    return vec3(0.5, 0.3, 0.2) + 0.5 * cos(6.28318 * (vec3(1.0, 0.7, 0.4) * t + vec3(0.0, 0.15, 0.2)));
}

vec3 art(vec2 uv, float t) {
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    float segments = 8.0;
    float a = mod(angle, 6.28318 / segments);
    a = abs(a - 3.14159 / segments);
    vec2 p = vec2(cos(a), sin(a)) * radius;
    p *= rot(t * 0.3);
    float d = sdCircle(p - vec2(0.5, 0.0), 0.15);
    d = min(d, sdBox2D(p * rot(t * 0.5) - vec2(0.3, 0.0), vec2(0.08)));
    float pattern = sin(d * 30.0 + t * 2.0) * 0.5 + 0.5;
    vec3 col = palette(pattern + radius * 0.5);
    col *= smoothstep(0.01, 0.0, abs(d) - 0.01) * 0.5 + 0.5;
    col *= smoothstep(1.8, 0.5, radius);
    return col;
}
        `
    },

    // ─────────────────────────────────────────────
    // 5. Plasma Waves
    // ─────────────────────────────────────────────
    {
        title: "Plasma Waves",
        prompt: "Classic plasma effect with vivid color oscillations",
        code: `
vec3 palette(float t) {
    return vec3(0.5) + 0.5 * cos(6.28318 * (vec3(1.0, 0.7, 0.4) * t + vec3(0.0, 0.15, 0.2)));
}

vec3 art(vec2 uv, float t) {
    float v1 = sin(uv.x * 5.0 + t);
    float v2 = sin(uv.y * 5.0 + t * 1.3);
    float v3 = sin((uv.x + uv.y) * 5.0 + t * 0.7);
    float v4 = sin(length(uv * 5.0) + t * 1.5);
    float plasma = (v1 + v2 + v3 + v4) * 0.25;
    vec3 col = palette(plasma + t * 0.05);
    col = pow(col, vec3(0.8));
    return col;
}
        `
    },

    // ─────────────────────────────────────────────
    // 6. Geometric Kaleidoscope
    // ─────────────────────────────────────────────
    {
        title: "Geometric Kaleidoscope",
        prompt: "Kaleidoscopic geometric patterns with rotating symmetry",
        code: `
vec3 palette(float t) {
    return vec3(0.5, 0.5, 0.5) + 0.5 * cos(6.28318 * (vec3(1.0, 1.0, 1.0) * t + vec3(0.0, 0.1, 0.2)));
}

vec3 art(vec2 uv, float t) {
    float angle = atan(uv.y, uv.x) + t * 0.3;
    float radius = length(uv);
    float k = 6.0;
    angle = mod(angle, 6.28318 / k);
    angle = abs(angle - 3.14159 / k);
    vec2 p = vec2(cos(angle), sin(angle)) * radius;
    float hex = sdHexagon(p * 3.0 - vec2(1.0, 0.0), 0.3);
    float circle = sdCircle(p * 4.0 - vec2(2.0, 0.0), 0.2);
    float d = min(hex, circle);
    float pattern = sin(d * 20.0 - t * 3.0) * 0.5 + 0.5;
    vec3 col = palette(pattern + radius);
    col *= smoothstep(0.02, 0.0, abs(d)) * 0.6 + 0.4;
    return col;
}
        `
    },

    // ─────────────────────────────────────────────
    // 7. Cyberpunk Rain
    // ─────────────────────────────────────────────
    {
        title: "Cyberpunk Rain",
        prompt: "Digital rain matrix effect with neon cyberpunk aesthetics",
        code: `
vec3 palette(float t) {
    return vec3(0.0, 0.8, 0.4) + 0.3 * cos(6.28318 * (vec3(0.3, 1.0, 0.5) * t + vec3(0.0, 0.2, 0.5)));
}

vec3 art(vec2 uv, float t) {
    vec3 col = vec3(0.0);
    for (int i = 0; i < 12; i++) {
        float fi = float(i);
        float x = hash(vec2(fi, 0.0)) * 4.0 - 2.0;
        float speed = 0.5 + hash(vec2(fi, 1.0)) * 1.5;
        float y = mod(uv.y + t * speed + hash(vec2(fi, 2.0)) * 10.0, 4.0) - 2.0;
        float brightness = smoothstep(0.04, 0.0, abs(uv.x - x));
        brightness *= smoothstep(0.0, -1.5, y - uv.y);
        float flicker = sin(t * 5.0 + fi * 3.0) * 0.3 + 0.7;
        col += palette(fi * 0.1 + t * 0.05) * brightness * flicker * 0.4;
    }
    col += vec3(0.0, 0.02, 0.01);
    return col;
}
        `
    },

    // ─────────────────────────────────────────────
    // 8. Ocean Waves
    // ─────────────────────────────────────────────
    {
        title: "Ocean Waves",
        prompt: "Serene ocean surface with rolling wave patterns",
        code: `
vec3 palette(float t) {
    return vec3(0.1, 0.3, 0.5) + 0.4 * cos(6.28318 * (vec3(0.3, 0.5, 0.8) * t + vec3(0.5, 0.6, 0.7)));
}

vec3 art(vec2 uv, float t) {
    float wave1 = sin(uv.x * 3.0 + t + noise(uv * 3.0 + t * 0.5) * 2.0);
    float wave2 = sin(uv.x * 5.0 - t * 1.3 + noise(uv * 5.0 - t * 0.3) * 1.5);
    float wave3 = sin(uv.x * 8.0 + t * 0.7 + uv.y * 2.0);
    float surface = (wave1 + wave2 * 0.5 + wave3 * 0.25) * 0.3;
    float depth = smoothstep(0.5, -1.0, uv.y + surface);
    vec3 deep = vec3(0.02, 0.05, 0.15);
    vec3 shallow = palette(surface + t * 0.1);
    vec3 col = mix(shallow, deep, depth);
    float foam = smoothstep(0.02, 0.0, abs(uv.y + surface * 0.8)) * 0.5;
    col += vec3(foam);
    return col;
}
        `
    },

    // ─────────────────────────────────────────────
    // 9. Fire Embers
    // ─────────────────────────────────────────────
    {
        title: "Fire Embers",
        prompt: "Glowing fire particles rising with warm ember colors",
        code: `
vec3 palette(float t) {
    return vec3(1.0, 0.4, 0.1) + 0.4 * cos(6.28318 * (vec3(0.5, 0.3, 0.1) * t + vec3(0.0, 0.1, 0.3)));
}

vec3 art(vec2 uv, float t) {
    vec3 col = vec3(0.02, 0.01, 0.0);
    for (int i = 0; i < 15; i++) {
        float fi = float(i);
        vec2 pos;
        pos.x = hash(vec2(fi, 0.0)) * 3.0 - 1.5;
        pos.y = mod(hash(vec2(fi, 1.0)) * 4.0 - t * (0.3 + hash(vec2(fi, 2.0)) * 0.5), 4.0) - 2.0;
        float size = 0.02 + hash(vec2(fi, 3.0)) * 0.03;
        float d = length(uv - pos);
        float glow = smoothstep(size * 3.0, 0.0, d);
        float flicker = sin(t * 8.0 + fi * 5.0) * 0.2 + 0.8;
        col += palette(fi * 0.07 + t * 0.05) * glow * flicker * 0.3;
    }
    float heat = smoothstep(1.5, -0.5, uv.y) * 0.15;
    col += vec3(heat * 0.8, heat * 0.2, 0.0);
    return col;
}
        `
    },

    // ─────────────────────────────────────────────
    // 10. Nebula Cloud
    // ─────────────────────────────────────────────
    {
        title: "Nebula Cloud",
        prompt: "Cosmic nebula with swirling interstellar gas clouds",
        code: `
vec3 palette(float t) {
    return vec3(0.3, 0.1, 0.5) + 0.5 * cos(6.28318 * (vec3(0.6, 0.4, 0.8) * t + vec3(0.0, 0.33, 0.67)));
}

vec3 art(vec2 uv, float t) {
    vec2 p = uv * 2.0;
    p += vec2(sin(t * 0.3), cos(t * 0.2)) * 0.5;
    float n1 = fbm(p + fbm(p + t * 0.1));
    float n2 = fbm(p * 1.5 - vec2(t * 0.15, 0.0));
    float n3 = fbm(p * 0.5 + vec2(0.0, t * 0.1));
    vec3 col1 = palette(n1);
    vec3 col2 = palette(n2 + 0.33);
    vec3 col3 = palette(n3 + 0.67);
    vec3 col = mix(col1, col2, n2) * 0.7 + col3 * 0.3;
    float stars = smoothstep(0.97, 1.0, hash(floor(uv * 50.0)));
    col += vec3(stars * 0.8);
    col *= 0.8 + 0.2 * n1;
    return col;
}
        `
    },

    // ─────────────────────────────────────────────
    // 11. Voronoi Glass
    // ─────────────────────────────────────────────
    {
        title: "Voronoi Glass",
        prompt: "Stained glass voronoi mosaic with glowing edges",
        code: `
vec3 palette(float t) {
    return vec3(0.5) + 0.5 * cos(6.28318 * (vec3(1.0, 0.8, 0.6) * t + vec3(0.3, 0.2, 0.0)));
}

vec3 art(vec2 uv, float t) {
    uv *= 3.0;
    vec2 cellId = floor(uv);
    vec2 cellUv = fract(uv) - 0.5;
    float minDist = 1.0;
    vec2 closestId = cellId;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = hash2(cellId + neighbor);
            point = 0.5 + 0.4 * sin(t + point * 6.28);
            float d = length(cellUv - neighbor - point + 0.5);
            if (d < minDist) {
                minDist = d;
                closestId = cellId + neighbor;
            }
        }
    }
    vec3 col = palette(hash(closestId) + t * 0.1);
    float edge = smoothstep(0.05, 0.08, minDist);
    col *= edge;
    col += vec3(1.0) * smoothstep(0.08, 0.05, minDist) * 0.3;
    return col;
}
        `
    },

    // ─────────────────────────────────────────────
    // 12. Light Tunnel
    // ─────────────────────────────────────────────
    {
        title: "Light Tunnel",
        prompt: "Infinite light tunnel with concentric rings of energy",
        code: `
vec3 palette(float t) {
    return vec3(0.5, 0.5, 0.8) + 0.5 * cos(6.28318 * (vec3(0.8, 0.6, 1.0) * t + vec3(0.0, 0.1, 0.3)));
}

vec3 art(vec2 uv, float t) {
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    float tunnel = 1.0 / (radius + 0.1);
    float rings = sin(tunnel * 5.0 - t * 3.0 + angle * 2.0) * 0.5 + 0.5;
    float twist = sin(angle * 6.0 + tunnel * 3.0 + t * 2.0) * 0.3;
    vec3 col = palette(rings + twist + t * 0.1);
    col *= smoothstep(0.0, 0.3, radius);
    col *= 0.5 + tunnel * 0.15;
    float glow = smoothstep(0.05, 0.0, radius) * 2.0;
    col += palette(t * 0.3) * glow;
    return col;
}
        `
    },

    // ─────────────────────────────────────────────
    // 13. Electric Storm
    // ─────────────────────────────────────────────
    {
        title: "Electric Storm",
        prompt: "Electric lightning storm with crackling energy bolts",
        code: `
vec3 palette(float t) {
    return vec3(0.3, 0.7, 1.0) + 0.4 * cos(6.28318 * (vec3(0.5, 0.8, 1.0) * t + vec3(0.1, 0.2, 0.3)));
}

vec3 art(vec2 uv, float t) {
    vec3 col = vec3(0.02, 0.02, 0.05);
    for (int i = 0; i < 5; i++) {
        float fi = float(i);
        vec2 p = uv;
        p.x += sin(p.y * (3.0 + fi) + t * (1.0 + fi * 0.3)) * 0.3;
        p.y += cos(p.x * (2.0 + fi) + t * 0.7) * 0.2;
        float n = noise(p * (5.0 + fi * 2.0) + t);
        float bolt = smoothstep(0.03, 0.0, abs(p.x + n * 0.5 - sin(t + fi) * 0.5));
        float flicker = sin(t * 10.0 + fi * 7.0);
        flicker = smoothstep(0.3, 1.0, flicker);
        col += palette(fi * 0.2 + t * 0.1) * bolt * flicker * 0.5;
    }
    float ambient = fbm(uv * 3.0 + t * 0.2) * 0.1;
    col += vec3(ambient * 0.3, ambient * 0.4, ambient * 0.8);
    return col;
}
        `
    },

    // ─────────────────────────────────────────────
    // 14. Crystal Lattice
    // ─────────────────────────────────────────────
    {
        title: "Crystal Lattice",
        prompt: "Crystalline lattice structure with prismatic light refractions",
        code: `
vec3 palette(float t) {
    return vec3(0.8, 0.9, 1.0) + 0.3 * cos(6.28318 * (vec3(0.3, 0.5, 1.0) * t + vec3(0.0, 0.1, 0.2)));
}

vec3 art(vec2 uv, float t) {
    uv *= rot(t * 0.2);
    uv *= 3.0;
    vec2 grid = fract(uv) - 0.5;
    vec2 id = floor(uv);
    float d1 = sdBox2D(grid, vec2(0.3 + sin(t + hash(id) * 6.28) * 0.1));
    float d2 = sdCircle(grid, 0.2 + cos(t * 1.3 + hash(id + vec2(1.0, 0.0)) * 6.28) * 0.05);
    float d = min(d1, d2);
    float facets = sin(d * 40.0 + t * 2.0) * 0.5 + 0.5;
    vec3 col = palette(hash(id) * 2.0 + facets * 0.5 + t * 0.1);
    float edge = smoothstep(0.02, 0.0, abs(d));
    col = mix(col * 0.6, vec3(1.0), edge * 0.4);
    float sparkle = smoothstep(0.98, 1.0, sin(hash(id) * 100.0 + t * 5.0));
    col += vec3(sparkle * 0.5);
    return col;
}
        `
    },

    // ─────────────────────────────────────────────
    // 15. Digital Bloom
    // ─────────────────────────────────────────────
    {
        title: "Digital Bloom",
        prompt: "Blooming digital flower patterns with radial symmetry",
        code: `
vec3 palette(float t) {
    return vec3(0.8, 0.3, 0.5) + 0.5 * cos(6.28318 * (vec3(0.6, 0.8, 0.4) * t + vec3(0.1, 0.0, 0.3)));
}

vec3 art(vec2 uv, float t) {
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);
    float petals = 5.0;
    float petalShape = sin(angle * petals + t) * 0.5 + 0.5;
    petalShape *= smoothstep(0.8, 0.2, radius);
    float innerRing = smoothstep(0.15, 0.12, radius) * smoothstep(0.05, 0.1, radius);
    float layers = sin(radius * 15.0 - t * 2.0 + angle * 2.0) * 0.5 + 0.5;
    vec3 petalCol = palette(petalShape + t * 0.1);
    vec3 centerCol = palette(t * 0.3 + 0.5);
    vec3 col = petalCol * petalShape * 0.8;
    col += centerCol * innerRing * 1.2;
    col += palette(layers + angle * 0.3) * layers * 0.15;
    col *= smoothstep(1.5, 0.3, radius);
    float glow = smoothstep(0.2, 0.0, radius) * 0.3;
    col += palette(t * 0.2) * glow;
    return col;
}
        `
    }
];

/**
 * Returns a random fallback shader from the collection.
 * Uses an optional index to avoid repeating the same fallback.
 */
export function getRandomFallbackShader(excludeIndex?: number): { shader: FallbackShader; index: number } {
    let index: number;
    do {
        index = Math.floor(Math.random() * FALLBACK_SHADERS.length);
    } while (index === excludeIndex && FALLBACK_SHADERS.length > 1);

    return { shader: FALLBACK_SHADERS[index], index };
}
