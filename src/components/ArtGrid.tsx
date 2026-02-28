'use client';

import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GeneratedShader } from '@/types';
import ArtCanvas, { ArtCanvasRef } from './ArtCanvas';
import { useDownloadQueue } from './DownloadQueueProvider';

interface ArtGridProps {
    shaders: GeneratedShader[];
    onDelete?: (ids: string[]) => void;
}

// -------------------------------------------------------------------------------- //
// CSV Generator Helper
// -------------------------------------------------------------------------------- //
function downloadCSV(shaders: GeneratedShader[], format: string) {
    let csvContent = "";

    // Add BOM for UTF-8 Excel compatibility
    const BOM = "\uFEFF";

    if (format === 'Shutterstock') {
        csvContent = BOM + "Filename,Description,Keywords,Categories\n";
        shaders.forEach((s) => {
            const m = s.metadata;
            const filename = `${s.prompt.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`;
            const desc = m ? `"${m.description.replace(/"/g, '""')}"` : `""`;
            const keywords = m ? `"${m.keywords.join(',').replace(/"/g, '""')}"` : `""`;
            const category = m ? `"${m.category.replace(/"/g, '""')}"` : `""`;
            csvContent += `${filename},${desc},${keywords},${category}\n`;
        });
    } else if (format === 'Adobe Stock') {
        csvContent = BOM + "Filename,Title,Keywords,Category\n";
        shaders.forEach((s) => {
            const m = s.metadata;
            const filename = `${s.prompt.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`;
            const title = m ? `"${m.title.replace(/"/g, '""')}"` : `""`;
            const keywords = m ? `"${m.keywords.join(',').replace(/"/g, '""')}"` : `""`;
            const category = m ? `"${m.category.replace(/"/g, '""')}"` : `""`;
            csvContent += `${filename},${title},${keywords},${category}\n`;
        });
    } else { // Generic
        csvContent = BOM + "Filename,Title,Description,Keywords\n";
        shaders.forEach((s) => {
            const m = s.metadata;
            const filename = `${s.prompt.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`;
            const title = m ? `"${m.title.replace(/"/g, '""')}"` : `""`;
            const desc = m ? `"${m.description.replace(/"/g, '""')}"` : `""`;
            const keywords = m ? `"${m.keywords.join(',').replace(/"/g, '""')}"` : `""`;
            csvContent += `${filename},${title},${desc},${keywords}\n`;
        });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `metadata_${format.replace(/\s+/g, '_').toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export default function ArtGrid({ shaders, onDelete }: ArtGridProps) {
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [exportShaders, setExportShaders] = useState<GeneratedShader[] | null>(null);
    const [visibleCount, setVisibleCount] = useState(12);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Reset visible count when new shaders are generated
    useEffect(() => {
        setVisibleCount(12);
    }, [shaders.length]);

    const visibleShaders = shaders.slice(0, visibleCount);
    const hasMore = shaders.length > visibleCount;

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

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
        <div style={{ paddingBottom: selectedIds.size > 0 ? '80px' : '0' }}>
            <div className="flex justify-end mb-4 px-4">
                <button
                    onClick={() => {
                        setSelectionMode(!selectionMode);
                        if (selectionMode) setSelectedIds(new Set()); // Clear when disabling
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectionMode ? 'bg-[#E1B245] text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
                >
                    {selectionMode ? 'Cancel' : 'Select'}
                </button>
            </div>

            <div className={`art-grid ${visibleShaders.length === 1 ? 'single' : visibleShaders.length === 2 ? 'double' : 'multi'}`}>
                {visibleShaders.map((shader) => (
                    <ArtItem
                        key={shader.id}
                        shader={shader}
                        selectionMode={selectionMode}
                        isSelected={selectedIds.has(shader.id)}
                        onToggleSelect={() => toggleSelection(shader.id)}
                        onExportSingle={(shader) => setExportShaders([shader])}
                    />
                ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
                <div className="flex justify-center mt-6 mb-4">
                    <button
                        onClick={() => setVisibleCount(prev => prev + 12)}
                        className="px-6 py-3 rounded-xl text-sm font-semibold text-white/80 bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>expand_more</span>
                        Load More ({shaders.length - visibleCount} remaining)
                    </button>
                </div>
            )}

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-[#121212] border-t border-white/10 p-4 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]" style={{ paddingLeft: 'max(16px, env(safe-area-inset-left))', paddingRight: 'max(16px, env(safe-area-inset-right))' }}>
                    <div className="max-w-[1200px] mx-auto w-full flex justify-between items-center">
                        <div className="text-white text-sm">
                            <span className="text-[#E1B245] font-bold text-lg">{selectedIds.size}</span> artwork{selectedIds.size > 1 ? 's' : ''} selected
                        </div>
                        <div className="flex gap-3">
                            {/* Delete Button */}
                            <button
                                className="bg-red-500/10 text-red-400 border border-red-500/20 px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 hover:bg-red-500/20 transition-all active:scale-95"
                                onClick={() => setShowDeleteConfirm(true)}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                                Delete
                            </button>
                            {/* Export Button */}
                            <button
                                className="bg-[#E1B245] text-black px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 hover:brightness-110 shadow-lg shadow-[#E1B245]/20 transition-all active:scale-95"
                                onClick={() => {
                                    setExportShaders(shaders.filter(s => selectedIds.has(s.id)));
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>movie</span>
                                Export
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div className="relative bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-red-400 text-3xl">delete_forever</span>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Delete Artworks?</h3>
                            <p className="text-sm text-white/60 mb-6 leading-relaxed">
                                Are you sure you want to delete {selectedIds.size} selected artwork{selectedIds.size > 1 ? 's' : ''}? This will remove them from your gallery and offline storage. This action cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-white/5 hover:bg-white/10 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (onDelete) {
                                            onDelete(Array.from(selectedIds));
                                        }
                                        setSelectedIds(new Set());
                                        setSelectionMode(false);
                                        setShowDeleteConfirm(false);
                                    }}
                                    className="flex-1 py-3 px-4 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                                    Delete ({selectedIds.size})
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* Export Settings Modal - Handles single and bulk combinations */}
            {exportShaders && (
                <ExportModal
                    shaders={exportShaders}
                    onClose={() => {
                        setExportShaders(null);
                        setSelectionMode(false);
                        setSelectedIds(new Set());
                    }}
                />
            )}
        </div>
    );
}

// -------------------------------------------------------------------------------- //
// Global Export Modal Component (Handles Single & Bulk)
// -------------------------------------------------------------------------------- //
function ExportModal({ shaders, onClose }: { shaders: GeneratedShader[], onClose: () => void }) {
    const { addJob } = useDownloadQueue();
    const [quality, setQuality] = useState('HD');
    const [compression, setCompression] = useState('Medium');
    const [fps, setFps] = useState(30);
    const [format, setFormat] = useState('mp4');

    // For bulk, we just display the duration of the first item as a rough guide, 
    // but the actual duration dispatched is per-shader.
    const guideDuration = shaders[0]?.duration || 10;
    const isBulk = shaders.length > 1;

    const estimateFileSize = () => {
        let baseBitrate = 5;
        if (quality === '4K') baseBitrate = 40;
        else if (quality === 'FHD') baseBitrate = 12;

        let compressionMulti = 1;
        if (compression === 'Medium') compressionMulti = 0.55;
        else if (compression === 'Low') compressionMulti = 0.3;

        const bitrateMbps = baseBitrate * compressionMulti * (fps / 30);
        // Estimate size for all selected shaders combined
        const totalDuration = shaders.reduce((acc, s) => acc + (s.duration || 10), 0);
        const sizeMB = (bitrateMbps * totalDuration) / 8;

        return Math.max(0.5, sizeMB).toFixed(1);
    };

    const startBulkExport = () => {
        // Formulate base estimates
        const baseTime = quality === '4K' ? 4000 : quality === 'FHD' ? 1500 : 700;
        const crfMulti = compression === 'High' ? 1.5 : compression === 'Medium' ? 1.0 : 0.8;

        const crfValue =
            compression === 'High' ? 18
                : compression === 'Medium' ? 23
                    : 28;

        // Dispatch a queued job to the persistent Download Queue for EACH shader
        shaders.forEach((shader, index) => {
            const shaderDuration = shader.duration || 10;
            const estimatedTimeMs = baseTime * shaderDuration * (fps / 30) * crfMulti;
            const jobId = `local-${Date.now()}-${index}`;

            addJob({
                jobId,
                artworkId: shader.id,
                status: 'queued',
                format,
                title: shader.prompt.substring(0, 30) + '...',
                progress: 0,
                statusText: `Waiting to render...`,
                estimatedTimeMs,
                startTimeMs: Date.now(),
                shaderCode: shader.fragmentCode,
                aspectRatio: shader.aspectRatio || '16:9',
                quality,
                crf: crfValue,
                duration: shaderDuration,
                fps,
                metadata: shader.metadata
            });
        });

        onClose(); // Close immediately so the user can continue using the dashboard
    };

    return createPortal(
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: 700 }}>{isBulk ? 'Bulk Export' : 'Export Video'}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '20px' }}>✕</button>
                </div>
                {isBulk && (
                    <p className="text-sm text-[#E1B245] mb-4">You are queueing {shaders.length} artworks for background rendering.</p>
                )}

                <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="section-label">Resolution</label>
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
                    <label className="section-label">Quality</label>
                    <div className="custom-select-wrapper">
                        <select
                            value={compression}
                            onChange={(e) => setCompression(e.target.value)}
                            className="custom-select"
                        >
                            <option value="High">High Quality (Larger File)</option>
                            <option value="Medium">Medium Quality (Balanced)</option>
                            <option value="Low">Low Quality (Smallest File)</option>
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
                            <option value="mov">MOV (H.264)</option>
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
                        {isBulk ? 'Using Original Loop Durations' : `${guideDuration} Seconds (Fixed Loop)`}
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

                <div className="form-group" style={{ marginBottom: '24px' }}>
                    <label className="section-label">Estimated File Size</label>
                    <div style={{
                        width: '100%', padding: '12px', background: 'rgba(255, 215, 0, 0.1)',
                        color: '#ffd700', borderRadius: '8px', border: '1px solid rgba(255, 215, 0, 0.2)',
                        fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
                        fontWeight: 500
                    }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>sd_storage</span>
                        ~{estimateFileSize()} MB
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1, padding: '14px', background: 'transparent',
                            border: '1px solid #333', borderRadius: '8px', color: '#888',
                            cursor: 'pointer', fontWeight: 600, fontSize: '13px'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={startBulkExport}
                        className="generate-btn"
                        style={{ flex: 1 }}
                    >
                        {isBulk ? 'Export' : 'Start Export'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

// Individual Art Item with Modal
function ArtItem({
    shader,
    selectionMode,
    isSelected,
    onToggleSelect,
    onExportSingle
}: {
    shader: GeneratedShader,
    selectionMode?: boolean,
    isSelected?: boolean,
    onToggleSelect?: () => void,
    onExportSingle: (shader: GeneratedShader) => void
}) {
    const { jobs } = useDownloadQueue();
    const canvasRef = useRef<ArtCanvasRef | null>(null);

    const activeJob = jobs.find(j => j.artworkId === shader.id && (j.status === 'queued' || j.status === 'processing'));

    const [justFinished, setJustFinished] = useState(false);
    const [showMeta, setShowMeta] = useState(false);
    const prevActiveJobRef = useRef(activeJob);

    useEffect(() => {
        if (prevActiveJobRef.current && !activeJob) {
            // Job finished or failed
            const latestJob = jobs.slice().reverse().find(j => j.artworkId === shader.id);
            if (latestJob?.status === 'completed') {
                setJustFinished(true);
                const timer = setTimeout(() => setJustFinished(false), 3000);
                return () => clearTimeout(timer);
            }
        }
        prevActiveJobRef.current = activeJob;
    }, [activeJob, jobs, shader.id]);



    return (
        <div className="art-item">
            <div className="art-item-visual relative" onClick={() => !selectionMode && canvasRef.current && canvasRef.current.toggleFullscreen()}>
                <ArtCanvas
                    ref={canvasRef}
                    shaderCode={shader.fragmentCode}
                    aspectRatio={shader.aspectRatio}
                />

                {/* Selection Overlay */}
                {selectionMode && (
                    <div
                        className="absolute inset-0 z-30 flex items-start justify-end p-4 cursor-pointer bg-black/10 hover:bg-black/20 transition-colors"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onToggleSelect?.();
                        }}
                    >
                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors shadow-lg ${isSelected ? 'bg-[#E1B245] border-[#E1B245]' : 'border-white/80 bg-black/40 backdrop-blur-sm hover:border-[#E1B245]'}`}>
                            {isSelected && <span className="material-symbols-outlined text-black font-bold" style={{ fontSize: '18px' }}>check</span>}
                        </div>
                    </div>
                )}
            </div>

            <div className="art-item-info flex-col items-start gap-1">
                <div className="flex justify-between w-full items-center">
                    <p className="art-prompt truncate pr-2">
                        {shader.prompt.length > 50 ? shader.prompt.substring(0, 50) + '...' : shader.prompt}
                    </p>
                    <div className="flex gap-2 shrink-0">
                        <span className="art-ratio">{shader.aspectRatio}</span>
                        <span className="art-duration">{shader.duration || 10}s Loop</span>
                    </div>
                </div>

                {/* Metadata Panel Toggle */}
                {shader.metadata && (
                    <div className="w-full mt-2">
                        <button
                            onClick={() => setShowMeta(!showMeta)}
                            className="text-xs flex items-center gap-1 text-[#E1B245] hover:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                                {showMeta ? 'expand_less' : 'expand_more'}
                            </span>
                            {showMeta ? 'Hide Metadata' : 'Show Stock Metadata'}
                        </button>

                        {showMeta && (
                            <div className="mt-2 p-3 bg-black/40 rounded-lg border border-white/5 text-xs text-white/70 space-y-2">
                                <div><strong className="text-white/90">Title:</strong> {shader.metadata.title}</div>
                                <div><strong className="text-white/90">Desc:</strong> {shader.metadata.description}</div>
                                <div><strong className="text-white/90">Cat:</strong> {shader.metadata.category}</div>

                                <div className="pt-1">
                                    <strong className="text-white/90 block mb-1">Keywords ({shader.metadata.keywords.length}):</strong>
                                    <div className="flex flex-wrap gap-1">
                                        {shader.metadata.keywords.slice(0, 10).map((k: string, i: number) => (
                                            <span key={i} className="bg-white/10 px-1.5 py-0.5 rounded text-[10px]">{k}</span>
                                        ))}
                                        {shader.metadata.keywords.length > 10 && <span className="text-white/40">+{shader.metadata.keywords.length - 10} more</span>}
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2 mt-2 border-t border-white/10">
                                    <button
                                        onClick={() => {
                                            const txt = `${shader.metadata!.title}\n${shader.metadata!.description}\n\n${shader.metadata!.keywords.join(', ')}`;
                                            navigator.clipboard.writeText(txt);
                                            alert("Metadata copied!");
                                        }}
                                        className="flex-1 bg-white/10 hover:bg-white/20 py-1.5 rounded flex items-center justify-center gap-1 transition-colors text-white"
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>content_copy</span>
                                        Copy All
                                    </button>
                                    <button
                                        onClick={() => downloadCSV([shader], 'Generic')}
                                        className="flex-1 bg-[#E1B245]/20 hover:bg-[#E1B245]/30 text-[#E1B245] py-1.5 rounded flex items-center justify-center gap-1 transition-colors"
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>download</span>
                                        CSV
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="art-item-actions">
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className="download-btn"
                        onClick={justFinished ? undefined : () => onExportSingle(shader)}
                        style={{
                            flex: 1,
                            cursor: activeJob ? 'wait' : justFinished ? 'default' : 'pointer',
                            ...(activeJob ? {
                                backgroundColor: 'rgba(225, 178, 69, 0.15)',
                                borderColor: '#E1B245',
                                color: '#E1B245',
                                boxShadow: '0 0 10px rgba(225, 178, 69, 0.3)'
                            } : justFinished ? {
                                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                borderColor: '#10b981',
                                color: '#10b981'
                            } : {})
                        }}
                        disabled={!!activeJob}
                    >
                        {activeJob ? (
                            <>
                                <span className="material-symbols-outlined animate-spin text-[#E1B245]" style={{ fontSize: '18px' }}>progress_activity</span>
                                Rendering...
                            </>
                        ) : justFinished ? (
                            <>
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                                Saved
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">download</span> Export
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Ensure the ArtGrid also maps this prop when looping through items!
