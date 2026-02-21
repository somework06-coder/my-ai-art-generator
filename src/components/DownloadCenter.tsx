'use client';
import { useState, useRef, useEffect } from 'react';
import { useDownloadQueue } from '@/components/DownloadQueueProvider';

export default function DownloadCenter() {
    const { jobs, clearCompleted } = useDownloadQueue();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const activeJobsCount = jobs.filter(j => j.status === 'pending' || j.status === 'processing').length;
    const completedJobsCount = jobs.filter(j => j.status === 'completed').length;
    const badgeCount = activeJobsCount + completedJobsCount;

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => window.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleDownload = (videoUrl: string, title?: string, format?: string) => {
        const a = document.createElement('a');
        a.href = videoUrl;
        a.download = `${title || 'MotionStudio_Export'}.${format || 'mp4'}`.replace(/[^a-z0-9_.-]/gi, '_');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10 relative"
                onClick={() => setIsOpen(!isOpen)}
                title="Download Center"
            >
                <span className="material-symbols-outlined text-white" style={{ fontSize: '20px' }}>download</span>
                {badgeCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-accent text-black text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                        {badgeCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-[#121212] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl">
                    <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40">
                        <h3 className="font-semibold text-white text-sm">Export Queue</h3>
                        {jobs.length > 0 && (
                            <button onClick={clearCompleted} className="text-xs text-white/50 hover:text-white transition-colors">
                                Clear Done
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {jobs.length === 0 ? (
                            <div className="p-8 text-center text-white/50 text-sm">
                                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">inbox</span>
                                <p>No active exports.</p>
                                <p className="text-xs mt-1">Export an artwork to see it here.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-white/5">
                                {jobs.slice().reverse().map(job => (
                                    <li key={job.jobId} className="p-4 hover:bg-white/5 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1 pr-4 min-w-0">
                                                <p className="text-sm font-medium text-white truncate" title={job.title}>{job.title || 'Untitled Video'}</p>
                                                <p className="text-xs text-white/50 uppercase mt-0.5">{job.format || 'MP4'}</p>
                                            </div>

                                            {job.status === 'completed' && job.videoUrl ? (
                                                <button
                                                    onClick={() => handleDownload(job.videoUrl as string, job.title, job.format)}
                                                    className="bg-accent text-black p-1.5 rounded hover:brightness-110 flex-shrink-0 transition-transform active:scale-95"
                                                    title="Save to device"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">save_alt</span>
                                                </button>
                                            ) : job.status === 'failed' ? (
                                                <span className="material-symbols-outlined text-red-500 text-[18px]" title="Export failed">error</span>
                                            ) : (
                                                <span className="material-symbols-outlined text-accent animate-spin text-[18px]">progress_activity</span>
                                            )}
                                        </div>

                                        {(job.status === 'pending' || job.status === 'processing') && (
                                            <div className="w-full bg-white/10 rounded-full h-1 mt-3 overflow-hidden">
                                                <div
                                                    className="bg-accent h-full rounded-full transition-all duration-1000 ease-out"
                                                    style={{ width: `${job.progress || (job.status === 'processing' ? 50 : 10)}%` }}
                                                />
                                            </div>
                                        )}
                                        {job.status === 'processing' && <p className="text-[10px] text-white/60 mt-1.5">{job.statusText || 'Rendering on server...'}</p>}
                                        {job.status === 'pending' && <p className="text-[10px] text-white/60 mt-1.5">{job.statusText || 'In queue...'}</p>}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

