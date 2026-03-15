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

// High-quality Fallback fragment shader (Neon Hex Grid Pulse)
const FALLBACK_FRAGMENT = `
uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.263, 0.416, 0.557);
    return a + b * cos(6.28318 * (c * t + d));
}

void main() {
    // Normalize coordinates and center
    vec2 uv = (vUv - 0.5) * 2.0;
    uv.x *= uResolution.x / uResolution.y;
    
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);
    
    // Fractal iterations
    for (float i = 0.0; i < 3.0; i++) {
        uv = fract(uv * 1.5) - 0.5;
        float d = length(uv) * exp(-length(uv0));
        
        vec3 col = palette(length(uv0) + i*.4 + uTime*.4);
        
        d = sin(d*8. + uTime)/8.;
        d = abs(d);
        
        // Glow effect
        d = pow(0.01 / d, 1.2);
        
        finalColor += col * d;
    }
    
    // Vignette
    finalColor *= 1.2 - length(uv0) * 0.5;

    gl_FragColor = vec4(finalColor, 1.0);
}
`;

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
    private _isPaused: boolean = false;
    private pausedElapsed: number = 0;

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

    init(canvas: HTMLCanvasElement, aspectRatio: AspectRatio = '16:9', isPreview: boolean = true, quality: string = '720p'): void {
        this.canvas = canvas;

        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: false,   // Generative shaders don't benefit from AA
            alpha: false,
            preserveDrawingBuffer: true
        });

        // Cap pixel ratio to 1 — prevents 4x overhead on Retina displays
        this.renderer.setPixelRatio(1);

        // Use lower resolution for preview grid, full res only for export
        const { width, height } = isPreview
            ? this.getPreviewResolution(aspectRatio)
            : this.getResolution(aspectRatio, quality);
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
        if (!this.renderer || !this.mesh) return { success: false, error: 'Not initialized' };

        try {
            // Save current material in case of failure
            const oldMaterial = this.material;

            const testMaterial = new THREE.ShaderMaterial({
                vertexShader: DEFAULT_VERTEX,
                fragmentShader: fragmentCode,
                uniforms: this.uniforms
            });

            this.material = testMaterial;
            this.mesh.material = this.material;

            // Force compilation synchronously and spy on console.error
            let hasError = false;
            let errorMessage = '';
            const originalConsoleError = console.error;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            console.error = (...args: any[]) => {
                const msg = args.join(' ');
                // Three.js logs WebGL shader errors with "THREE.WebGLProgram"
                if (msg.includes('THREE.WebGLProgram') || msg.includes('shader') || msg.includes('error')) {
                    hasError = true;
                    errorMessage = msg;
                    // Log as a warning instead of error to prevent Next.js from throwing the red dev overlay
                    console.warn('[Shader Compilation Failed - Loading Fallback]', msg);
                    return; // Crucial: skip calling originalConsoleError
                }
                originalConsoleError.apply(console, args);
            };

            // Force Three.js to render immediately, which synchronously triggers WebGLProgram compilation errors
            this.renderer.render(this.scene, this.camera);

            // Restore console.error immediately after render
            console.error = originalConsoleError;

            if (hasError) {
                console.warn('Shader syntax error detected by renderer. Using beautiful fallback!');

                // Revert to old material or load a beautiful fallback shader dynamically
                this.material.dispose();

                // We need to import getRandomFallbackShader at the top, but we can do it inline or just use the existing FALLBACK_FRAGMENT if we can't.
                // Actually, let's just use the built-in fallback fragment, but make it prettier!
                this.createMaterial(FALLBACK_FRAGMENT);
                this.currentFragmentCode = FALLBACK_FRAGMENT;

                return {
                    success: false,
                    error: errorMessage || 'Shader syntax error'
                };
            }

            // Success! Dispose the old material
            if (oldMaterial) oldMaterial.dispose();
            this.currentFragmentCode = fragmentCode;
            return { success: true };

        } catch (error) {
            console.error('Shader loading threw an unexpected error:', error);
            this.createMaterial(FALLBACK_FRAGMENT);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown exception'
            };
        }
    }

    private getResolution(aspectRatio: AspectRatio, quality: string = '720p'): { width: number; height: number } {
        // Base resolutions for 16:9
        let baseW = 1280;
        let baseH = 720;

        if (quality === 'FHD' || quality === '1080p') {
            baseW = 1920;
            baseH = 1080;
        } else if (quality === '4K') {
            baseW = 3840;
            baseH = 2160;
        }

        switch (aspectRatio) {
            case '16:9':
                return { width: baseW, height: baseH };
            case '9:16':
                return { width: baseH, height: baseW };
            case '1:1':
                return { width: baseH, height: baseH };
            default:
                return { width: baseW, height: baseH };
        }
    }

    private getPreviewResolution(aspectRatio: AspectRatio): { width: number; height: number } {
        // Half resolution for gallery preview — 75% less GPU work per canvas
        switch (aspectRatio) {
            case '16:9':
                return { width: 640, height: 360 };
            case '9:16':
                return { width: 360, height: 640 };
            case '1:1':
                return { width: 360, height: 360 };
            default:
                return { width: 640, height: 360 };
        }
    }

    private animate = (): void => {
        this.animationId = requestAnimationFrame(this.animate);

        const elapsed = (performance.now() - this.startTime) / 1000;
        this.uniforms.uTime.value = elapsed;

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    };

    // --- PERFORMANCE: Pause/Resume lifecycle ---
    pause(): void {
        if (this._isPaused) return;
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.pausedElapsed = (performance.now() - this.startTime) / 1000;
        this._isPaused = true;
    }

    resume(): void {
        if (!this._isPaused) return;
        this._isPaused = false;
        // Adjust startTime so animation continues seamlessly from where it froze
        this.startTime = performance.now() - (this.pausedElapsed * 1000);
        this.animate();
    }

    get isPaused(): boolean {
        return this._isPaused;
    }

    updateAspectRatio(aspectRatio: AspectRatio): void {
        if (!this.renderer) return;

        const { width, height } = this.getResolution(aspectRatio);
        this.renderer.setSize(width, height);
        this.uniforms.uResolution.value.set(width, height);
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

                const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';

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
