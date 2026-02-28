'use client';

import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { ShaderRenderer } from '@/lib/shaderRenderer';
import { AspectRatio } from '@/types';

interface ArtCanvasProps {
    shaderCode: string;
    aspectRatio?: AspectRatio;
    isSelected?: boolean;
    onClick?: () => void;
    showLabel?: string;
}

export interface ArtCanvasRef {
    recordVideo: (duration: number, onProgress?: (progress: number) => void) => Promise<{ blob: Blob; extension: string } | null>;
    getAspectRatio: () => AspectRatio;
    toggleFullscreen: () => void;
}

const ArtCanvas = forwardRef<ArtCanvasRef, ArtCanvasProps>(({
    shaderCode,
    aspectRatio = '16:9',
    isSelected = false,
    onClick,
    showLabel
}, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<ShaderRenderer | null>(null);
    const aspectRef = useRef<AspectRatio>(aspectRatio);
    const [isVisible, setIsVisible] = useState(false);

    useImperativeHandle(ref, () => ({
        recordVideo: async (duration: number, onProgress?: (progress: number) => void) => {
            if (!rendererRef.current) return null;
            return rendererRef.current.recordVideo(duration, onProgress);
        },
        getAspectRatio: () => aspectRef.current,
        toggleFullscreen: () => {
            const container = canvasRef.current?.parentElement;
            if (!container) return;
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                container.requestFullscreen().catch(() => { });
            }
        }
    }));

    // --- PERF: True WebGL Virtualization ---
    // Only maintain WebGL contexts for canvases near the viewport (browsers hard limit contexts to ~16)
    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsVisible(entry.isIntersecting);
            },
            { threshold: 0, rootMargin: '300px' } // Pre-warm 300px before entering viewport
        );
        observer.observe(containerRef.current);

        return () => observer.disconnect();
    }, []);

    // Initialize/Dispose renderer based on visibility
    useEffect(() => {
        if (!isVisible) {
            // Aggressive teardown: delete WebGL context to free up browser slots
            if (rendererRef.current) {
                rendererRef.current.dispose();
                rendererRef.current = null;
            }
            return;
        }

        // We are visible (or near it), create the context
        if (!canvasRef.current) return;

        rendererRef.current = new ShaderRenderer();
        rendererRef.current.init(canvasRef.current, aspectRatio);
        aspectRef.current = aspectRatio;

        // Load the actual shader if we have it
        if (shaderCode) {
            rendererRef.current.loadShader(shaderCode);
        }

        // --- PERF: Pause shader when browser tab is hidden ---
        const handleVisibilityChange = () => {
            if (!rendererRef.current) return;
            if (document.hidden) {
                rendererRef.current.pause();
            } else {
                rendererRef.current.resume();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (rendererRef.current) {
                rendererRef.current.dispose();
                rendererRef.current = null;
            }
        };
    }, [isVisible, aspectRatio, shaderCode]); // Include shaderCode so we can load it on true mount

    // Remove the separate loadShader effect as it's now handled by the visibility effect directly

    // Get aspect ratio class
    const getAspectClass = () => {
        switch (aspectRatio) {
            case '9:16': return 'aspect-portrait';
            case '1:1': return 'aspect-square';
            default: return 'aspect-landscape';
        }
    };

    return (
        <div
            ref={containerRef}
            className={`art-canvas-container ${getAspectClass()} ${isSelected ? 'selected' : ''} ${onClick ? 'clickable' : ''}`}
            onClick={onClick}
        >
            {isVisible ? (
                <canvas ref={canvasRef} className="art-canvas fade-in" />
            ) : (
                <div className="art-canvas placeholder-bg" />
            )}
            {showLabel && (
                <div className="art-label">{showLabel}</div>
            )}
            {isSelected && (
                <div className="selected-badge">✓</div>
            )}
        </div>
    );
});

ArtCanvas.displayName = 'ArtCanvas';

export default ArtCanvas;
