'use client';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDownloadQueue, ExportJob } from '@/components/DownloadQueueProvider';
import type { StockMetadata } from '@/types';
import { save, message } from '@tauri-apps/plugin-dialog';
import { writeFile, readFile } from '@tauri-apps/plugin-fs';

function JobProgress({ job }: { job: ExportJob }) {
    const [simulatedProgress, setSimulatedProgress] = useState(job.progress || 0);
    const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

    useEffect(() => {
        // Only run simulation if it's processing and has tracking fields
        if (job.status !== 'processing' || !job.startTimeMs || !job.estimatedTimeMs) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSimulatedProgress(job.progress || 0);
            setTimeRemaining(null);
            return;
        }

        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = now - job.startTimeMs!;
            let pct = (elapsed / job.estimatedTimeMs!) * 100;

            if (pct > 95) pct = 95; // Cap at 95% until server actually finishes

            setSimulatedProgress(pct);

            const msRemaining = Math.max(0, job.estimatedTimeMs! - elapsed);
            if (msRemaining > 0) {
                const secs = Math.ceil(msRemaining / 1000);
                if (secs > 60) {
                    setTimeRemaining(`~${Math.floor(secs / 60)}m ${secs % 60}s left`);
                } else {
                    setTimeRemaining(`~${secs}s left`);
                }
            } else {
                setTimeRemaining(`Finishing up...`);
            }
        }, 500);

        return () => clearInterval(interval);
    }, [job.status, job.startTimeMs, job.estimatedTimeMs, job.progress]);

    // Ensure it immediately hits 100% when server done
    const displayProgress = job.status === 'completed' ? 100 : Math.max(simulatedProgress, job.progress || 0);

    return (
        <div className="w-full mt-3">
            <div className="flex justify-between items-end mb-1.5 px-0.5">
                <p className="text-[10px] text-white/60">{job.statusText || 'Rendering...'}</p>
                {timeRemaining && job.status === 'processing' && (
                    <p className="text-[10px] text-[#E1B245] font-medium animate-pulse">{timeRemaining}</p>
                )}
            </div>
            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div
                    className="bg-[#E1B245] h-full rounded-full transition-all duration-500 ease-linear shadow-[0_0_8px_rgba(225,178,69,0.5)]"
                    style={{ width: `${displayProgress}%` }}
                />
            </div>
        </div>
    );
}

// Generate CSV content for multiple jobs' metadata
function generateConsolidatedCSV(entries: { metadata: StockMetadata, filename: string }[], format: string): string {
    const BOM = "\uFEFF";
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;

    if (format === 'Shutterstock') {
        const header = "Filename,Description,Keywords,Categories\n";
        const rows = entries.map(e => `${e.filename},${esc(e.metadata.description)},${esc(e.metadata.keywords.join(','))},${esc(e.metadata.category)}\n`);
        return BOM + header + rows.join('');
    } else if (format === 'Adobe Stock') {
        const header = "Filename,Title,Keywords,Category\n";
        const rows = entries.map(e => `${e.filename},${esc(e.metadata.title)},${esc(e.metadata.keywords.join(','))},${esc(e.metadata.category)}\n`);
        return BOM + header + rows.join('');
    } else {
        const header = "Filename,Title,Description,Keywords\n";
        const rows = entries.map(e => `${e.filename},${esc(e.metadata.title)},${esc(e.metadata.description)},${esc(e.metadata.keywords.join(','))}\n`);
        return BOM + header + rows.join('');
    }
}

export default function DownloadCenter() {
    const { jobs, clearCompleted, autoClearOnClose, setAutoClearOnClose } = useDownloadQueue();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const activeJobsCount = jobs.filter(j => j.status === 'queued' || j.status === 'queued-offline' || j.status === 'processing').length;
    const completedJobsCount = jobs.filter(j => j.status === 'completed').length;
    const badgeCount = activeJobsCount + completedJobsCount;

    const [totalProgress, setTotalProgress] = useState(0);

    useEffect(() => {
        const processingJobs = jobs.filter(j => j.status === 'processing' && j.startTimeMs && j.estimatedTimeMs);

        if (processingJobs.length === 0) {
            setTotalProgress(0);
            return;
        }

        const interval = setInterval(() => {
            let totalPct = 0;
            const now = Date.now();

            processingJobs.forEach(job => {
                const elapsed = now - job.startTimeMs!;
                let pct = (elapsed / job.estimatedTimeMs!) * 100;
                if (pct > 95) pct = 95; // Cap at 95%
                totalPct += pct;
            });

            setTotalProgress(totalPct / processingJobs.length);
        }, 100); // Fast interval for smooth water rising

        return () => clearInterval(interval);
    }, [jobs]);

    const [justCompleted, setJustCompleted] = useState(false);
    const prevCompletedCountRef = useRef(completedJobsCount);

    useEffect(() => {
        if (completedJobsCount > prevCompletedCountRef.current) {
            setJustCompleted(true);
            const timer = setTimeout(() => setJustCompleted(false), 2500);
            prevCompletedCountRef.current = completedJobsCount;
            return () => clearTimeout(timer);
        } else {
            prevCompletedCountRef.current = completedJobsCount;
        }
    }, [completedJobsCount]);

    // Auto-open side panel when a new job is queued
    const prevJobsLengthRef = useRef(jobs.length);
    useEffect(() => {
        if (jobs.length > prevJobsLengthRef.current) {
            setIsOpen(true);
        }
        prevJobsLengthRef.current = jobs.length;
    }, [jobs.length]);

    // Removed handleClickOutside because Portal elements trigger as outside the dropdownRef

    const [isZipping, setIsZipping] = useState(false);
    const [showConfirmPopup, setShowConfirmPopup] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());

    // Metadata toggle (persisted in localStorage)
    const [includeMetadata, setIncludeMetadata] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('metadataToggle') === 'true';
    });
    const [csvFormat, setCsvFormat] = useState(() => {
        if (typeof window === 'undefined') return 'Shutterstock';
        return localStorage.getItem('csvFormat') || 'Shutterstock';
    });

    useEffect(() => {
        localStorage.setItem('metadataToggle', String(includeMetadata));
    }, [includeMetadata]);
    useEffect(() => {
        localStorage.setItem('csvFormat', csvFormat);
    }, [csvFormat]);

    useEffect(() => {
        if (!isOpen) {
            setIsSelectMode(false);
            setSelectedJobIds(new Set());
            setShowConfirmPopup(false);
            setShowClearConfirm(false);
        }
    }, [isOpen]);

    const toggleJobSelection = (jobId: string) => {
        const newSet = new Set(selectedJobIds);
        if (newSet.has(jobId)) newSet.delete(jobId);
        else newSet.add(jobId);
        setSelectedJobIds(newSet);
    };

    const handleSelectAll = () => {
        if (selectedJobIds.size === completedJobsCount) {
            setSelectedJobIds(new Set());
        } else {
            const allCompleted = jobs.filter(j => j.status === 'completed' && j.videoUrl).map(j => j.jobId);
            setSelectedJobIds(new Set(allCompleted));
        }
    };

    const getDimensionString = (job: ExportJob) => {
        let baseW = 1280;
        let baseH = 720;
        const q = job.quality || 'HD';
        const ar = job.aspectRatio || '16:9';

        if (q === 'FHD' || q === '1080p') {
            baseW = 1920;
            baseH = 1080;
        } else if (q === '4K') {
            baseW = 3840;
            baseH = 2160;
        }

        if (ar === '9:16') return `${baseH}x${baseW}`;
        if (ar === '1:1') return `${baseH}x${baseH}`;
        return `${baseW}x${baseH}`;
    };

    const handleDownloadAllZip = async () => {
        if (isZipping) return;
        setIsZipping(true);
        try {
            const JSZip = (await import('jszip')).default;

            const zip = new JSZip();
            const itemsToZip = jobs.filter(j => selectedJobIds.has(j.jobId) && j.status === 'completed' && j.videoUrl);

            const metadataEntries: { metadata: StockMetadata; filename: string }[] = [];

            await Promise.all(itemsToZip.map(async (job) => {
                // job.videoUrl is now a local file path
                const fileBytes = await readFile(job.videoUrl as string);

                // Add dimensions mapping e.g., Title_1920x1080_e4d2.mp4
                const safeName = `${job.title || 'Video'}_${job.jobId.slice(-4)}.${job.format || 'mp4'}`.replace(/[^a-z0-9_.-]/gi, '_');

                zip.file(safeName, fileBytes);

                // Collect metadata for consolidated CSV if toggle is ON
                if (includeMetadata && job.metadata) {
                    metadataEntries.push({ metadata: job.metadata, filename: safeName });
                }
            }));

            // Add single consolidated CSV after all videos
            if (metadataEntries.length > 0) {
                const csvContent = generateConsolidatedCSV(metadataEntries, csvFormat);
                zip.file('Mossion_metadata.csv', csvContent);
            }

            const content = await zip.generateAsync({ type: 'uint8array', compression: 'STORE' });

            const filePath = await save({
                filters: [{
                    name: 'ZIP Archive',
                    extensions: ['zip']
                }],
                defaultPath: `Mossion_Exports_${Date.now()}.zip`
            });

            if (filePath) {
                await writeFile(filePath, content);
                setShowConfirmPopup(false);
                setIsOpen(false);

                await message(`Successfully downloaded to:\n${filePath}`, {
                    title: 'Download Complete',
                    kind: 'info'
                });
            } else {
                setShowConfirmPopup(false);
            }
        } catch (error) {
            console.error('Failed to create ZIP:', error);
            await message('Failed to generate ZIP file.', { title: 'Error', kind: 'error' });
            setShowConfirmPopup(false);
        } finally {
            setIsZipping(false);
        }
    };

    const handleDownload = async (job: ExportJob) => {
        const videoLocalPath = job.videoUrl!;
        const title = job.title || 'Mossion_Export';
        const fmt = job.format || 'mp4';

        const safeTitle = `${title}.${fmt}`.replace(/[^a-z0-9_.-]/gi, '_');

        // If metadata toggle ON and this job has metadata → bundle into ZIP
        if (includeMetadata && job.metadata) {
            try {
                const JSZip = (await import('jszip')).default;
                const zip = new JSZip();

                const fileBytes = await readFile(videoLocalPath);
                zip.file(safeTitle, fileBytes);

                const csvContent = generateConsolidatedCSV([{ metadata: job.metadata, filename: safeTitle }], csvFormat);
                const csvName = safeTitle.replace(/\.[^.]+$/, '_metadata.csv');
                zip.file(csvName, csvContent);

                const content = await zip.generateAsync({ type: 'uint8array', compression: 'STORE' });

                const filePath = await save({
                    filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
                    defaultPath: safeTitle.replace(/\.[^.]+$/, '.zip')
                });

                if (filePath) {
                    await writeFile(filePath, content);
                    setIsOpen(false);

                    await message(`Successfully downloaded to:\n${filePath}`, {
                        title: 'Download Complete',
                        kind: 'info'
                    });
                }
                return;
            } catch (e) {
                console.error('Failed to create metadata ZIP:', e);
                await message('Failed to generate ZIP file.', { title: 'Error', kind: 'error' });
            }
        }

        // Default: raw download (copy from temp path to user chosen path)
        try {
            const filePath = await save({
                filters: [{ name: 'Video', extensions: [fmt] }],
                defaultPath: safeTitle
            });

            if (filePath) {
                const fileBytes = await readFile(videoLocalPath);
                await writeFile(filePath, fileBytes);
                setIsOpen(false);

                await message(`Successfully downloaded to:\n${filePath}`, {
                    title: 'Download Complete',
                    kind: 'info'
                });
            }
        } catch (e) {
            console.error('Failed to save file:', e);
            await message('Failed to save video file.', { title: 'Error', kind: 'error' });
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                className={`flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-all duration-500 relative ${justCompleted
                    ? 'border-[#E1B245] shadow-[0_0_20px_rgba(225,178,69,0.6)] scale-110 -translate-y-1'
                    : 'border-white/10 border bg-white/5'
                    }`}
                onClick={() => setIsOpen(!isOpen)}
                title="Download Center"
            >
                {/* Liquid Fill Container -> Keeps overflow hidden away from the badge */}
                <div
                    className="absolute inset-0 rounded-full overflow-hidden"
                    style={{
                        background: activeJobsCount > 0
                            ? `linear-gradient(to top, rgba(225,178,69,0.35) ${totalProgress}%, rgba(255,255,255,0.0) ${totalProgress}%)`
                            : 'transparent'
                    }}
                >
                    {/* Simulated wavy top for the water effect */}
                    {activeJobsCount > 0 && (
                        <div
                            className="absolute inset-x-0 bg-[#E1B245]/40 opacity-50 wobble-animation"
                            style={{ bottom: `${totalProgress}%`, height: '2px', filter: 'blur(1px)' }}
                        />
                    )}
                </div>

                <span className={`material-symbols-outlined transition-colors duration-500 z-10 ${justCompleted ? 'text-[#E1B245]' : activeJobsCount > 0 ? 'text-[#E1B245] animate-pulse' : 'text-white'}`} style={{ fontSize: '20px' }}>download</span>
                {badgeCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#E1B245] text-black text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full z-20 shadow-md">
                        {badgeCount}
                    </span>
                )}
            </button>

            {isOpen && typeof document !== 'undefined' && createPortal(
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9990]"
                        onClick={() => setIsOpen(false)}
                        style={{ animation: 'fadeIn 0.2s ease-out' }}
                    />

                    {/* Side Panel */}
                    <div
                        className="fixed top-0 right-0 h-[100dvh] min-h-[100dvh] max-h-screen w-[400px] max-w-[90vw] bg-[#121212] border-l border-white/10 shadow-2xl z-[9991] flex flex-col"
                        style={{ animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
                    >
                        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/40 flex-shrink-0">
                            <h3 className="font-semibold text-white text-base">
                                {isSelectMode ? `${selectedJobIds.size} Selected` : 'Export Queue'}
                            </h3>
                            <div className="flex gap-2 items-center">
                                {isSelectMode ? (
                                    <>
                                        <button onClick={handleSelectAll} className="text-xs text-white/50 hover:text-white transition-colors mr-2">
                                            {selectedJobIds.size === completedJobsCount ? 'Deselect All' : 'Select All'}
                                        </button>
                                        <button onClick={() => setIsSelectMode(false)} className="text-xs border border-white/20 text-white px-3 py-1.5 rounded hover:bg-white/5 transition-colors">
                                            Cancel
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {completedJobsCount > 1 && (
                                            <button
                                                onClick={() => setIsSelectMode(true)}
                                                className="text-xs font-medium bg-[#E1B245] text-black border border-transparent px-3 py-1.5 rounded hover:bg-[#F2C94C] transition-colors flex items-center gap-1 shadow-sm"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">checklist</span>
                                                Select
                                            </button>
                                        )}
                                        {jobs.length > 0 && (
                                            <button onClick={() => setShowClearConfirm(true)} className="text-xs text-white/50 hover:text-white transition-colors ml-2">
                                                Clear
                                            </button>
                                        )}
                                    </>
                                )}
                                <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white transition-colors grid place-items-center ml-2 border-l border-white/10 pl-2">
                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                </button>
                            </div>
                        </div>

                        {/* Options Toggles */}
                        <div className="px-5 py-3 border-b border-white/5 bg-black/20 flex-shrink-0 flex flex-col gap-3">
                            <label className="flex items-center justify-between cursor-pointer group">
                                <span className="text-sm text-white/80 group-hover:text-white transition-colors">Auto-Clear Queue on Close</span>
                                <div className={`w-8 h-4 rounded-full transition-colors duration-300 relative ${autoClearOnClose ? 'bg-[#E1B245]' : 'bg-white/20'}`}>
                                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-black transition-all duration-300 ${autoClearOnClose ? 'left-[18px]' : 'left-1'}`} />
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={autoClearOnClose}
                                    onChange={(e) => setAutoClearOnClose(e.target.checked)}
                                />
                            </label>

                            <label className="flex items-center justify-between cursor-pointer group">
                                <span className="text-sm text-white/80 group-hover:text-white transition-colors">Include Metadata CSV File</span>
                                <div className={`w-8 h-4 rounded-full transition-colors duration-300 relative ${includeMetadata ? 'bg-[#E1B245]' : 'bg-white/20'}`}>
                                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-black transition-all duration-300 ${includeMetadata ? 'left-[18px]' : 'left-1'}`} />
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={includeMetadata}
                                    onChange={(e) => setIncludeMetadata(e.target.checked)}
                                />
                            </label>

                            {includeMetadata && (
                                <select
                                    value={csvFormat}
                                    onChange={(e) => setCsvFormat(e.target.value)}
                                    className="mt-1 w-full bg-black/40 text-white/70 text-xs border border-white/10 rounded px-2 py-1.5 focus:outline-none focus:border-[#E1B245]/50 transition-colors cursor-pointer"
                                >
                                    <option value="Shutterstock">Shutterstock Format</option>
                                    <option value="Adobe Stock">Adobe Stock Format</option>
                                    <option value="Generic">Generic Format</option>
                                </select>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-0 h-full w-full">
                            {jobs.length === 0 ? (
                                <div className="p-10 text-center text-white/50 text-sm flex flex-col items-center justify-center h-full pt-32">
                                    <span className="material-symbols-outlined text-5xl mb-3 opacity-30">inbox</span>
                                    <p>No active exports.</p>
                                    <p className="text-xs mt-1 text-white/30">Export an artwork to see it here.</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-white/5 w-full h-full flex flex-col">
                                    {jobs.slice().reverse().map(job => (
                                        <li
                                            key={job.jobId}
                                            className={`p-5 transition-colors cursor-pointer ${isSelectMode && job.status === 'completed' ? 'hover:bg-white/10 active:bg-white/5' : 'hover:bg-white/5'}`}
                                            onClick={() => {
                                                if (isSelectMode && job.status === 'completed') {
                                                    toggleJobSelection(job.jobId);
                                                }
                                            }}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                {isSelectMode && job.status === 'completed' && (
                                                    <div className="mr-3 mt-0.5 flex-shrink-0">
                                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedJobIds.has(job.jobId) ? 'bg-[#E1B245] border-[#E1B245]' : 'border-white/30 bg-black/20'}`}>
                                                            {selectedJobIds.has(job.jobId) && <span className="material-symbols-outlined text-[14px] text-black font-bold">check</span>}
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex-1 pr-4 min-w-0">
                                                    <p className="text-sm font-medium text-white truncate" title={job.title}>{job.title || 'Untitled Video'}</p>
                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/70 uppercase border border-white/5">
                                                            {job.format || 'MP4'}
                                                        </span>
                                                        {job.quality && (
                                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#E1B245]/20 text-[#E1B245] uppercase border border-[#E1B245]/20">
                                                                {job.quality === 'FHD' ? '1080p' : job.quality === 'HD' ? '720p' : job.quality}
                                                            </span>
                                                        )}
                                                        {job.fps && (
                                                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-white/10 text-white/60">
                                                                {job.fps}fps
                                                            </span>
                                                        )}

                                                        <div className="flex-1 min-w-4 flex justify-end">
                                                            {job.startTimeMs && (
                                                                <span className="text-[10px] text-white/40 flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-full border border-white/5">
                                                                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>schedule</span>
                                                                    {new Intl.DateTimeFormat('id-ID', {
                                                                        weekday: 'short',
                                                                        day: '2-digit',
                                                                        month: 'short',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    }).format(new Date(job.startTimeMs))}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {!isSelectMode && (
                                                    <>
                                                        {job.status === 'completed' && job.videoUrl ? (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDownload(job); }}
                                                                className="bg-[#E1B245] text-black w-8 h-8 rounded hover:brightness-110 flex-shrink-0 transition-transform active:scale-95 flex items-center justify-center shadow-lg shadow-[#E1B245]/20"
                                                                title="Save to device"
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">save_alt</span>
                                                            </button>
                                                        ) : job.status === 'failed' ? (
                                                            <span className="material-symbols-outlined text-red-500 text-[18px]" title="Export failed">error</span>
                                                        ) : (
                                                            <span className="material-symbols-outlined text-[#E1B245] animate-spin text-[18px]">progress_activity</span>
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            {(job.status === 'queued' || job.status === 'queued-offline' || job.status === 'processing') && (
                                                <JobProgress job={job} />
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Footer Download Action */}
                        {isSelectMode && selectedJobIds.size > 0 && (
                            <div className="p-5 border-t border-white/10 flex-shrink-0 bg-black/40">
                                <button
                                    onClick={() => setShowConfirmPopup(true)}
                                    className="w-full py-3 px-4 rounded-xl text-sm font-bold text-black bg-[#E1B245] hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(225,178,69,0.3)]"
                                >
                                    <span className="material-symbols-outlined text-[18px]">download</span>
                                    Download All ({selectedJobIds.size})
                                </button>
                            </div>
                        )}
                    </div>
                </>,
                document.body
            )}

            {/* Premium Confirmation Popup for Zip All */}
            {showConfirmPopup && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl" style={{ animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-[#E1B245]/10 flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-[#E1B245] text-3xl">download</span>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Confirm Download</h3>
                            <p className="text-sm text-white/60 mb-6 leading-relaxed">
                                Are you sure you want to download the selected {selectedJobIds.size} file(s) as a ZIP archive?
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirmPopup(false)}
                                    className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-white/5 hover:bg-white/10 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDownloadAllZip}
                                    disabled={isZipping}
                                    className="flex-1 py-3 px-4 rounded-xl text-sm font-bold text-black bg-[#E1B245] hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(225,178,69,0.3)] disabled:opacity-70 disabled:cursor-wait"
                                >
                                    {isZipping ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : <span className="material-symbols-outlined text-[18px]">download</span>}
                                    {isZipping ? 'Downloading...' : 'Download All'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Clear Confirmation Popup */}
            {showClearConfirm && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl" style={{ animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-red-400 text-3xl">delete_sweep</span>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Clear Export History?</h3>
                            <p className="text-sm text-white/60 mb-6 leading-relaxed">
                                Are you sure you want to clear your download queue? This will remove {completedJobsCount} completed item(s).
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowClearConfirm(false)}
                                    className="flex-1 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-white/5 hover:bg-white/10 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        clearCompleted();
                                        setShowClearConfirm(false);
                                    }}
                                    className="flex-1 py-3 px-4 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                    Clear History
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

