'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GeneratedShader } from '@/types';
import ArtCanvas, { ArtCanvasRef } from './ArtCanvas';

import { saveArtwork, deleteArtwork } from '@/app/library/actions';

interface ArtGridProps {
    shaders: GeneratedShader[];
    isLibrary?: boolean;
    selectedIds?: string[];
    onToggleSelect?: (id: string) => void;
    onRemix?: (prompt: string) => void;
}


export default function ArtGrid({ shaders, isLibrary = false, selectedIds = [], onToggleSelect, onRemix }: ArtGridProps) {
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
                <ArtItem
                    key={shader.id}
                    shader={shader}
                    isLibrary={isLibrary}
                    isSelected={selectedIds.includes(shader.id)}
                    onToggleSelect={onToggleSelect}
                    onRemix={onRemix}
                />
            ))}
        </div>
    );
}

// Individual Art Item with Modal
function ArtItem({ shader, isLibrary, isSelected, onToggleSelect, onRemix }: {
    shader: GeneratedShader,
    isLibrary: boolean,
    isSelected?: boolean,
    onToggleSelect?: (id: string) => void,
    onRemix?: (prompt: string) => void
}) {
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
            setStatus('Sending to Queue...');
            setProgress(5);

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
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success || !data.jobId) {
                throw new Error(data.error || 'Failed to enqueue export job');
            }

            // Start polling function
            const pollStatus = async (jobId: string) => {
                try {
                    const res = await fetch(`/api/export-status/${jobId}`);
                    const pollData = await res.json();

                    if (!res.ok) throw new Error(pollData.error || 'Failed to check status');

                    if (pollData.status === 'completed' && pollData.videoUrl) {
                        setStatus('Downloading...');
                        setProgress(90);

                        // Download the remote URL
                        const a = document.createElement('a');
                        a.href = pollData.videoUrl;
                        a.target = '_blank';
                        a.download = `video-${Date.now()}.${pollData.format || format}`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);

                        setProgress(100);
                        setStatus('Done!');

                        setTimeout(() => {
                            setExporting(false);
                            setProgress(0);
                            setStatus('');
                        }, 1500);

                    } else if (pollData.status === 'failed') {
                        throw new Error(pollData.errorMsg || 'Export failed on server');
                    } else {
                        // Pending or Processing
                        if (pollData.status === 'processing') {
                            setStatus('Rendering on Server...');
                            setProgress(prev => prev < 85 ? prev + 5 : 85); // fake progress
                        } else {
                            setStatus('Queued...');
                            setProgress(10);
                        }
                        // Poll again in 3 seconds
                        setTimeout(() => pollStatus(jobId), 3000);
                    }
                } catch (err) {
                    console.error('Polling error:', err);
                    alert(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
                    setStatus('Failed');
                    setTimeout(() => {
                        setExporting(false);
                        setProgress(0);
                        setStatus('');
                    }, 1500);
                }
            };

            // Initiate the polling loop
            pollStatus(data.jobId);

        } catch (err) {
            console.error('Export start details:', err);
            if (err instanceof TypeError && err.message === 'Failed to fetch') {
                alert('Connection Error: Could not reach the server. Is it running?');
            } else {
                alert(`Export request failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
            setStatus('Failed');
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

            {/* Selection Checkbox Overlay */}
            {isLibrary && onToggleSelect && (
                <div
                    className={`selection-overlay ${isSelected ? 'selected' : ''}`}
                    onClick={() => onToggleSelect(shader.id)}
                    style={{
                        position: 'absolute', top: '10px', left: '10px', zIndex: 10,
                        width: '24px', height: '24px', borderRadius: '50%',
                        border: isSelected ? 'none' : '2px solid rgba(255,255,255,0.5)',
                        background: isSelected ? 'var(--accent)' : 'rgba(0,0,0,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'all 0.2s ease'
                    }}
                >
                    {isSelected && <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#000', fontWeight: 'bold' }}>check</span>}
                </div>
            )}


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
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="download-btn" onClick={handleDownloadClick} style={{ flex: 1 }}>
                            <span className="material-symbols-outlined">download</span> Download
                        </button>

                        {isLibrary ? (
                            <button
                                className="download-btn"
                                onClick={async () => {
                                    if (confirm('Are you sure you want to remove this from your library?')) {
                                        await deleteArtwork(shader.id);
                                    }
                                }}
                                style={{ flex: 0, padding: '0 12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}
                                title="Remove from Library"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#ff4444' }}>delete</span>
                            </button>
                        ) : (
                            <button
                                className="download-btn"
                                onClick={async (e) => {
                                    const btn = e.currentTarget;
                                    const icon = btn.querySelector('.material-symbols-outlined') as HTMLElement;

                                    // Optimistic UI interaction
                                    icon.textContent = 'check';
                                    btn.style.background = 'rgba(255,215,0,0.2)';
                                    btn.style.borderColor = 'var(--accent)';

                                    const result = await saveArtwork({
                                        title: 'Untitled',
                                        prompt: shader.prompt,
                                        shader_code: shader.fragmentCode,
                                        aspect_ratio: shader.aspectRatio || '16:9',
                                        duration: shader.duration
                                    });

                                    if (result.error) {
                                        alert(result.error);
                                        icon.textContent = 'bookmark_add';
                                    }
                                }}
                                style={{ flex: 0, padding: '0 12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}
                                title="Save to Library"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>bookmark_add</span>
                            </button>
                        )}

                        {/* Remix Button (only in generator, not library) */}
                        {!isLibrary && onRemix && (
                            <button
                                className="download-btn"
                                onClick={() => onRemix(shader.prompt)}
                                style={{ flex: 0, padding: '0 12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)' }}
                                title="Remix: Generate a variation of this art"
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--accent)' }}>replay</span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Export Settings Modal - Portaled to Body to avoid Z-index/Transform issues */}
            {
                showModal && createPortal(
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
                )
            }
        </div >
    );
}
