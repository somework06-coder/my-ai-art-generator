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

// Fallback fragment shader
const FALLBACK_FRAGMENT = `
uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

void main() {
    vec2 uv = vUv;
    vec3 color = 0.5 + 0.5 * cos(uTime + uv.xyx + vec3(0, 2, 4));
    gl_FragColor = vec4(color, 1.0);
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
            this.createMaterial(FALLBACK_FRAGMENT);
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
        }
    };

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
