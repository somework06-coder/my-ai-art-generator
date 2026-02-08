'use client';

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
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
}

const ArtCanvas = forwardRef<ArtCanvasRef, ArtCanvasProps>(({
    shaderCode,
    aspectRatio = '16:9',
    isSelected = false,
    onClick,
    showLabel
}, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rendererRef = useRef<ShaderRenderer | null>(null);
    const aspectRef = useRef<AspectRatio>(aspectRatio);

    useImperativeHandle(ref, () => ({
        recordVideo: async (duration: number, onProgress?: (progress: number) => void) => {
            if (!rendererRef.current) return null;
            return rendererRef.current.recordVideo(duration, onProgress);
        },
        getAspectRatio: () => aspectRef.current
    }));

    // Initialize renderer
    useEffect(() => {
        if (!canvasRef.current) return;

        rendererRef.current = new ShaderRenderer();
        rendererRef.current.init(canvasRef.current, aspectRatio);
        aspectRef.current = aspectRatio;

        return () => {
            rendererRef.current?.dispose();
            rendererRef.current = null;
        };
    }, [aspectRatio]);

    // Load shader when code changes
    useEffect(() => {
        if (!rendererRef.current || !shaderCode) return;

        const result = rendererRef.current.loadShader(shaderCode);
        if (!result.success) {
            console.error('Shader error:', result.error);
        }
    }, [shaderCode]);

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
            className={`art-canvas-container ${getAspectClass()} ${isSelected ? 'selected' : ''} ${onClick ? 'clickable' : ''}`}
            onClick={onClick}
        >
            <canvas ref={canvasRef} className="art-canvas" />
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
