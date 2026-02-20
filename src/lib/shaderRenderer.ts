// Three.js Shader Renderer for Dynamic AI-Generated Shaders

import * as THREE from 'three';
import { AspectRatio } from '@/types';

// Default vertex shader
const DEFAULT_VERTEX = `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Pool of diverse fallback fragment shaders (picked randomly on error)
const FALLBACK_POOL: string[] = [

    // 1. Aurora Waves
    `uniform float uTime; uniform vec2 uResolution; varying vec2 vUv;
void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    uv.x *= uResolution.x / uResolution.y;
    float t = uTime * 0.5;
    vec3 col = vec3(0.0);
    for (float i = 1.0; i < 6.0; i++) {
        uv.y += sin(uv.x * i * 1.5 + t * i * 0.3) * 0.15 / i;
        float d = abs(uv.y);
        col += vec3(0.1, 0.4, 0.7) / (d * 40.0 + 0.5) * (1.0 + 0.5 * sin(t + i));
    }
    col = pow(col, vec3(0.8));
    gl_FragColor = vec4(col, 1.0);
}`,

    // 2. Liquid Metal
    `uniform float uTime; uniform vec2 uResolution; varying vec2 vUv;
void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    uv.x *= uResolution.x / uResolution.y;
    float t = uTime * 0.4;
    float r = length(uv);
    float a = atan(uv.y, uv.x);
    float wave = sin(r * 10.0 - t * 3.0) * cos(a * 3.0 + t);
    vec3 col = 0.5 + 0.5 * cos(vec3(wave * 3.0 + t, wave * 2.0 + 1.0, wave + 2.0));
    col *= 1.0 - r * 0.4;
    col = pow(col, vec3(0.9));
    gl_FragColor = vec4(col, 1.0);
}`,

    // 3. Neon Grid
    `uniform float uTime; uniform vec2 uResolution; varying vec2 vUv;
void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    uv.x *= uResolution.x / uResolution.y;
    float t = uTime * 0.3;
    vec2 grid = fract(uv * 4.0 + t * 0.2) - 0.5;
    float d = min(abs(grid.x), abs(grid.y));
    float glow = 0.02 / (d + 0.02);
    vec3 col = glow * vec3(0.9, 0.2, 0.8) * 0.4;
    col += 0.01 / (abs(sin(uv.y * 8.0 + t * 2.0)) + 0.02) * vec3(0.2, 0.6, 1.0) * 0.3;
    col *= 1.0 - length(uv) * 0.3;
    gl_FragColor = vec4(col, 1.0);
}`,

    // 4. Cosmic Dust
    `uniform float uTime; uniform vec2 uResolution; varying vec2 vUv;
void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    uv.x *= uResolution.x / uResolution.y;
    float t = uTime * 0.2;
    vec3 col = vec3(0.0);
    for (float i = 0.0; i < 5.0; i++) {
        vec2 p = uv * (1.0 + i * 0.3);
        p += vec2(sin(t + i), cos(t * 0.7 + i)) * 0.5;
        float d = length(fract(p) - 0.5);
        col += vec3(0.3, 0.1, 0.5) / (d * 20.0 + 0.3) * 0.15;
    }
    col += vec3(0.05, 0.0, 0.1);
    gl_FragColor = vec4(col, 1.0);
}`,

    // 5. Crystal Prism
    `uniform float uTime; uniform vec2 uResolution; varying vec2 vUv;
void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    uv.x *= uResolution.x / uResolution.y;
    float t = uTime * 0.6;
    float angle = atan(uv.y, uv.x) + t;
    float r = length(uv);
    float facets = floor(angle / 0.524 + 0.5) * 0.524;
    vec3 col = 0.5 + 0.5 * cos(vec3(facets * 6.0, facets * 4.0 + 2.0, facets * 2.0 + 4.0) + t);
    col *= smoothstep(1.2, 0.0, r);
    col += vec3(1.0) * smoothstep(0.02, 0.0, abs(fract(angle / 0.524) - 0.5) - 0.48) * 0.3;
    gl_FragColor = vec4(col, 1.0);
}`,

    // 6. Ocean Depth
    `uniform float uTime; uniform vec2 uResolution; varying vec2 vUv;
void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    uv.x *= uResolution.x / uResolution.y;
    float t = uTime * 0.3;
    vec3 col = vec3(0.0, 0.05, 0.15);
    for (float i = 1.0; i < 8.0; i++) {
        float wave = sin(uv.x * i * 2.0 + t * i * 0.5 + i) * 0.1 / i;
        uv.y += wave;
    }
    float caustic = sin(uv.x * 15.0 + t) * sin(uv.y * 15.0 + t * 0.7);
    col += vec3(0.0, 0.3, 0.5) * (caustic * 0.3 + 0.3);
    col *= 1.0 - length(vUv - 0.5) * 0.8;
    gl_FragColor = vec4(col, 1.0);
}`,

    // 7. Plasma Orb
    `uniform float uTime; uniform vec2 uResolution; varying vec2 vUv;
void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    uv.x *= uResolution.x / uResolution.y;
    float t = uTime * 0.5;
    float r = length(uv);
    float plasma = sin(uv.x * 10.0 + t) + sin(uv.y * 10.0 + t * 1.1);
    plasma += sin((uv.x + uv.y) * 7.0 + t * 0.7);
    plasma += sin(r * 12.0 - t * 2.0);
    plasma *= 0.25;
    vec3 col = 0.5 + 0.5 * cos(vec3(plasma + t, plasma + 2.1, plasma + 4.2));
    col *= smoothstep(1.0, 0.2, r);
    gl_FragColor = vec4(col, 1.0);
}`,

    // 8. Digital Rain
    `uniform float uTime; uniform vec2 uResolution; varying vec2 vUv;
void main() {
    vec2 uv = vUv;
    uv.x *= uResolution.x / uResolution.y;
    float t = uTime * 0.4;
    vec3 col = vec3(0.0);
    for (float i = 0.0; i < 12.0; i++) {
        float x = fract(sin(i * 127.1) * 43758.5453);
        float speed = 0.3 + fract(sin(i * 311.7) * 43758.5453) * 0.7;
        float y = fract(t * speed + fract(sin(i * 269.5) * 43758.5453));
        vec2 p = vec2(x * (uResolution.x / uResolution.y), 1.0 - y);
        float d = length(uv - p);
        float trail = smoothstep(0.3, 0.0, abs(uv.x - p.x) * 30.0) * smoothstep(0.0, 0.3, uv.y - p.y + 0.3) * smoothstep(0.5, 0.0, uv.y - p.y);
        col += vec3(0.1, 0.8, 0.3) * (0.005 / (d + 0.005) + trail * 0.1);
    }
    gl_FragColor = vec4(col, 1.0);
}`

];

// Get a random fallback shader
function getRandomFallback(): string {
    return FALLBACK_POOL[Math.floor(Math.random() * FALLBACK_POOL.length)];
}

// Default fallback (first one for initialization)
const FALLBACK_FRAGMENT = FALLBACK_POOL[0];

export class ShaderRenderer {
    private renderer: THREE.WebGLRenderer | null = null;
    private scene: THREE.Scene;
    private camera: THREE.OrthographicCamera;
    private mesh: THREE.Mesh | null = null;
    private material: THREE.ShaderMaterial | null = null;
    private uniforms: Record<string, THREE.IUniform>;
    private animationId: number | null = null;
    private startTime: number = 0;
    private canvas: HTMLCanvasElement | null = null;
    private currentFragmentCode: string = FALLBACK_FRAGMENT;
    private shaderChecked: boolean = false;
    private hasShaderError: boolean = false;

    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.uniforms = this.createUniforms();
    }

    private createUniforms(): Record<string, THREE.IUniform> {
        return {
            uTime: { value: 0 },
            uResolution: { value: new THREE.Vector2(1920, 1080) }
        };
    }

    init(canvas: HTMLCanvasElement, aspectRatio: AspectRatio = '16:9'): void {
        this.canvas = canvas;

        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: false,
            preserveDrawingBuffer: true
        });

        const { width, height } = this.getResolution(aspectRatio);
        this.renderer.setSize(width, height);
        this.uniforms.uResolution.value.set(width, height);

        // Create geometry (fullscreen quad)
        const geometry = new THREE.PlaneGeometry(2, 2);

        // Create material with fallback shader
        this.createMaterial(FALLBACK_FRAGMENT);

        // Create mesh
        this.mesh = new THREE.Mesh(geometry, this.material!);
        this.scene.add(this.mesh);

        // Start animation
        this.startTime = performance.now();
        this.animate();
    }

    private createMaterial(fragmentCode: string): boolean {
        try {
            if (this.material) {
                this.material.dispose();
            }

            this.material = new THREE.ShaderMaterial({
                vertexShader: DEFAULT_VERTEX,
                fragmentShader: fragmentCode,
                uniforms: this.uniforms
            });

            if (this.mesh) {
                this.mesh.material = this.material;
            }

            this.currentFragmentCode = fragmentCode;
            return true;
        } catch (error) {
            console.error('Failed to create shader material:', error);
            return false;
        }
    }

    // Load custom shader code (from AI generation)
    loadShader(fragmentCode: string): { success: boolean; error?: string } {
        try {
            // Reset shader check flag so we re-validate after next render
            this.shaderChecked = false;
            this.hasShaderError = false;

            // Create a test material to check for compilation errors
            const testMaterial = new THREE.ShaderMaterial({
                vertexShader: DEFAULT_VERTEX,
                fragmentShader: fragmentCode,
                uniforms: this.uniforms
            });

            // Apply the shader
            if (this.material) {
                this.material.dispose();
            }
            this.material = testMaterial;

            if (this.mesh) {
                this.mesh.material = this.material;
            }

            this.currentFragmentCode = fragmentCode;
            return { success: true };

        } catch (error) {
            console.error('Shader compilation failed, using fallback:', error);
            // Use fallback shader on error
            this.shaderChecked = true;
            this.hasShaderError = true;
            this.createMaterial(getRandomFallback());
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown shader error'
            };
        }
    }

    private getResolution(aspectRatio: AspectRatio): { width: number; height: number } {
        // Using 720p to avoid AVC level codec errors (max ~921600 pixels)
        switch (aspectRatio) {
            case '16:9':
                return { width: 1280, height: 720 };
            case '9:16':
                return { width: 720, height: 1280 };
            case '1:1':
                return { width: 720, height: 720 };
            default:
                return { width: 1280, height: 720 };
        }
    }

    private animate = (): void => {
        this.animationId = requestAnimationFrame(this.animate);

        const elapsed = (performance.now() - this.startTime) / 1000;
        this.uniforms.uTime.value = elapsed;

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);

            // Check for WebGL shader compilation errors AFTER first render
            // (Three.js only compiles shaders on first use)
            if (!this.shaderChecked && this.material) {
                this.shaderChecked = true;
                const gl = this.renderer.getContext();
                const glError = gl.getError();

                // Also check program info log for shader errors
                if (glError !== gl.NO_ERROR || this.checkShaderErrors(gl)) {
                    console.warn('[ShaderRenderer] Shader compile error detected, switching to fallback.');
                    this.hasShaderError = true;
                    this.createMaterial(getRandomFallback());
                }
            }
        }
    };

    // Check for shader compilation errors via WebGL program diagnostics
    private checkShaderErrors(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
        try {
            // Intercept console.error temporarily to detect Three.js shader errors
            const program = (this.material as any)?.program;
            if (program && program.diagnostics && !program.diagnostics.runnable) {
                return true; // Shader is not runnable
            }
        } catch {
            // Ignore — some Three.js versions don't expose diagnostics
        }
        return false;
    }

    updateAspectRatio(aspectRatio: AspectRatio): void {
        if (!this.renderer) return;

        const { width, height } = this.getResolution(aspectRatio);
        this.renderer.setSize(width, height);
        this.uniforms.uResolution.value.set(width, height);
    }

    pause(): void {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    resume(): void {
        if (this.animationId === null) {
            this.animate();
        }
    }

    reset(): void {
        this.startTime = performance.now();
    }

    getCanvas(): HTMLCanvasElement | null {
        return this.canvas;
    }

    getCurrentShaderCode(): string {
        return this.currentFragmentCode;
    }

    // Record video using MediaRecorder (standard HTML5 API)
    async recordVideo(
        durationSeconds: number = 5,
        onProgress?: (progress: number) => void
    ): Promise<{ blob: Blob; extension: string } | null> {
        if (!this.canvas || !this.renderer) return null;

        return new Promise((resolve, reject) => {
            try {
                const stream = this.canvas!.captureStream(30); // 30 FPS

                // Prefer H.264 (MP4) if available, otherwise WebM
                const mimeTypes = [
                    'video/mp4; codecs="avc1.42E01E, mp4a.40.2"', // H.264 constrained baseline
                    'video/mp4',
                    'video/webm; codecs="vp9"',
                    'video/webm'
                ];

                let mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';

                if (!mimeType) {
                    throw new Error('No supported video mime type found');
                }

                const recorder = new MediaRecorder(stream, {
                    mimeType,
                    videoBitsPerSecond: 5000000 // 5 Mbps
                });

                const chunks: Blob[] = [];
                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunks.push(e.data);
                };

                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: mimeType });
                    const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
                    resolve({ blob, extension });

                    // Restore original animation loop state if needed
                    this.resume();
                };

                recorder.onerror = (e) => {
                    console.error('Recorder error:', e);
                    reject(e);
                };

                // Start recording
                recorder.start();
                this.resume(); // Ensure animation is running

                // Progress simulation (since MediaRecorder is real-time)
                let elapsed = 0;
                const progressInterval = setInterval(() => {
                    elapsed += 0.1;
                    const p = Math.min(100, Math.round((elapsed / durationSeconds) * 100));
                    onProgress?.(p);

                    if (elapsed >= durationSeconds) {
                        clearInterval(progressInterval);
                        recorder.stop();
                    }
                }, 100);

            } catch (error) {
                console.error('Recording failed:', error);
                reject(error);
            }
        });
    }

    dispose(): void {
        this.pause();

        if (this.material) {
            this.material.dispose();
        }
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.scene.remove(this.mesh);
        }
        if (this.renderer) {
            this.renderer.dispose();
        }

        this.renderer = null;
        this.mesh = null;
        this.material = null;
        this.canvas = null;
    }
}
