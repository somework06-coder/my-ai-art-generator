'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GeneratedShader } from '@/types';
import ArtCanvas, { ArtCanvasRef } from './ArtCanvas';

interface ArtGridProps {
    shaders: GeneratedShader[];
}

export default function ArtGrid({ shaders }: ArtGridProps) {
    if (shaders.length === 0) {
        return (
            <div className="art-grid-empty">
                <span className="material-symbols-outlined empty-icon" style={{ fontSize: '64px' }}>palette</span>
                <p>Your generated art will appear here</p>
                <p className="empty-hint">Enter a prompt or generate random art to begin</p>
            </div>
        );
    }

    return (
        <div className={`art-grid ${shaders.length === 1 ? 'single' : shaders.length === 2 ? 'double' : 'multi'}`}>
            {shaders.map((shader) => (
                <ArtItem key={shader.id} shader={shader} />
            ))}
        </div>
    );
}

// Individual Art Item with Modal
function ArtItem({ shader }: { shader: GeneratedShader }) {
    const canvasRef = useRef<ArtCanvasRef | null>(null);
    const [exporting, setExporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('');
    const [showModal, setShowModal] = useState(false);

    // Export Configuration State
    const [quality, setQuality] = useState('HD');
    // Default to the shader's native loop duration (or 10s if missing)
    const duration = shader.duration || 10;
    const [fps, setFps] = useState(30);
    const [format, setFormat] = useState('mp4'); // 'mp4' or 'mov'

    const handleDownloadClick = () => {
        setShowModal(true);
    }

    const startExport = async () => {
        setShowModal(false);
        if (exporting) return;

        setExporting(true);
        setProgress(0);
        setStatus('Preparing...');

        try {
            setStatus(`Rendering ${quality} (${duration}s)...`);
            setProgress(10);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutes timeout

            const response = await fetch('/api/export-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    shaderCode: shader.fragmentCode,
                    aspectRatio: shader.aspectRatio || '16:9',
                    quality,
                    duration,
                    fps,
                    format
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Export failed');
            }

            setStatus('Downloading...');
            setProgress(90);

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ai-art-${quality}-${duration}s-${shader.id}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);

            setProgress(100);
            setStatus('Done!');

        } catch (err) {
            console.error('Export failed:', err);
            setStatus('Failed');
            alert(`Download failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setTimeout(() => {
                setExporting(false);
                setProgress(0);
                setStatus('');
            }, 1500);
        }
    };

    return (
        <div className="art-item">
            <ArtCanvas
                ref={canvasRef}
                shaderCode={shader.fragmentCode}
                aspectRatio={shader.aspectRatio}
            />

            <div className="art-item-info">
                <p className="art-prompt">
                    {shader.prompt.length > 60 ? shader.prompt.substring(0, 60) + '...' : shader.prompt}
                </p>
                <span className="art-ratio">{shader.aspectRatio}</span>
                <span className="art-duration">{shader.duration || 10}s Loop</span>
            </div>

            <div className="art-item-actions">
                {exporting ? (
                    <div className="download-progress">
                        <div className="progress-bar-mini">
                            <div className="progress-fill" style={{ width: `${progress}%` }} />
                        </div>
                        <span>{status || `${progress}%`}</span>
                    </div>
                ) : (
                    <button className="download-btn" onClick={handleDownloadClick}>
                        <span className="material-symbols-outlined">download</span> Download
                    </button>
                )}
            </div>

            {/* Export Settings Modal - Portaled to Body to avoid Z-index/Transform issues */}
            {showModal && createPortal(
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(5,5,5,0.85)', backdropFilter: 'blur(10px)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div className="modal-content" style={{
                        background: '#141414', padding: '24px', borderRadius: '16px',
                        border: '1px solid #333', width: '360px', maxWidth: '90%',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
                        animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: 700 }}>Export Video</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '20px' }}>✕</button>
                        </div>

                        <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label className="section-label">Quality</label>
                            <div className="custom-select-wrapper">
                                <select
                                    value={quality}
                                    onChange={(e) => setQuality(e.target.value)}
                                    className="custom-select"
                                >
                                    <option value="HD">HD (720p)</option>
                                    <option value="FHD">Full HD (1080p)</option>
                                    <option value="4K">4K (Ultra HD)</option>
                                </select>
                                <span className="material-symbols-outlined select-icon">expand_more</span>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label className="section-label">Format</label>
                            <div className="custom-select-wrapper">
                                <select
                                    value={format}
                                    onChange={(e) => setFormat(e.target.value)}
                                    className="custom-select"
                                >
                                    <option value="mp4">MP4 (H.264)</option>
                                    <option value="mov">MOV (ProRes Compatible)</option>
                                </select>
                                <span className="material-symbols-outlined select-icon">expand_more</span>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label className="section-label">Duration</label>
                            <div style={{
                                width: '100%', padding: '12px', background: '#0a0a0a',
                                color: '#888', borderRadius: '8px', border: '1px solid #333',
                                fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px'
                            }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>lock_clock</span>
                                {duration} Seconds (Fixed Loop)
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '24px' }}>
                            <label className="section-label">Framerate</label>
                            <div className="custom-select-wrapper">
                                <select
                                    value={fps}
                                    onChange={(e) => setFps(Number(e.target.value))}
                                    className="custom-select"
                                >
                                    <option value="30">30 FPS (Standard)</option>
                                    <option value="60">60 FPS (Smooth)</option>
                                </select>
                                <span className="material-symbols-outlined select-icon">expand_more</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    flex: 1, padding: '14px', background: 'transparent',
                                    border: '1px solid #333', borderRadius: '8px', color: '#888',
                                    cursor: 'pointer', fontWeight: 600, fontSize: '13px'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={startExport}
                                className="generate-btn"
                                style={{ flex: 1 }}
                            >
                                Start Export
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
