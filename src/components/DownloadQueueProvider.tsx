'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'queued-offline';

export type ExportJob = {
    jobId: string;
    artworkId: string;
    status: JobStatus;
    progress?: number;
    statusText?: string;
    videoUrl?: string;
    format: string;
    thumbnailUrl?: string;
    title?: string;
    estimatedTimeMs?: number;
    startTimeMs?: number;
    // Export Configuration for Background Worker
    shaderCode?: string;
    aspectRatio?: string;
    quality?: string;
    crf?: number;
    duration?: number;
    fps?: number;
    metadata?: import('@/types').StockMetadata;
};

type DownloadQueueContextType = {
    jobs: ExportJob[];
    addJob: (job: ExportJob) => void;
    removeJob: (jobId: string) => void;
    updateJob: (jobId: string, updates: Partial<ExportJob>) => void;
    clearCompleted: () => void;
};

const DownloadQueueContext = createContext<DownloadQueueContextType | undefined>(undefined);

export function DownloadQueueProvider({ children }: { children: React.ReactNode }) {
    const [jobs, setJobs] = useState<ExportJob[]>([]);

    useEffect(() => {
        const activeJobs = jobs.filter(j =>
            (j.status === 'queued' || j.status === 'processing') &&
            !j.jobId.startsWith('local-') &&
            !j.jobId.startsWith('bulk-')
        );
        if (activeJobs.length === 0) return;

        const interval = setInterval(async () => {
            const updatedJobs = await Promise.all(activeJobs.map(async (job) => {
                try {
                    const res = await fetch(`/api/export-status/${job.jobId}`);
                    if (!res.ok) return job;

                    const pollData = await res.json();
                    return {
                        ...job,
                        status: pollData.status,
                        progress: pollData.progress,
                        videoUrl: pollData.videoUrl
                    };
                } catch (e) {
                    return job;
                }
            }));

            setJobs(prev => prev.map(p => {
                const updated = updatedJobs.find(u => u.jobId === p.jobId);
                return updated ? updated : p;
            }));

        }, 3000);

        return () => clearInterval(interval);
    }, [jobs]);

    // Sequential Processor for Local Renders
    useEffect(() => {
        // Find if we are currently processing a local job
        const isProcessing = jobs.some(j => j.status === 'processing' && j.jobId.startsWith('local-'));

        // If we are already processing one, wait. We only do ONE at a time sequentially.
        if (isProcessing) return;

        // Find the next pending local job in the queue
        const nextJob = jobs.find(j => (j.status === 'queued' || j.status === 'queued-offline') && j.jobId.startsWith('local-'));
        if (!nextJob) return;

        // Prevent infinite loops by creating an inner async function
        const processJob = async () => {
            // --- OFFLINE DETECTION & BACKGROUND SYNC ---
            if (!navigator.onLine) {
                setJobs(prev => prev.map(j => j.jobId === nextJob.jobId ? {
                    ...j,
                    status: 'queued-offline',
                    statusText: 'Waiting for network...'
                } : j));

                // Try applying true SW Background Sync if supported (Chrome/Android)
                if ('serviceWorker' in navigator && 'SyncManager' in window) {
                    try {
                        const registration = await navigator.serviceWorker.ready;
                        await (registration as any).sync.register('export-video-sync');
                        console.log('Background sync registered');
                    } catch (err) {
                        console.log('Background sync could not be registered', err);
                    }
                }
                return;
            }

            // Immediately mark as processing so the next effect tick doesn't pick it up again
            setJobs(prev => prev.map(j => j.jobId === nextJob.jobId ? { ...j, status: 'processing', statusText: `Rendering ${nextJob.quality}...` } : j));

            try {
                // We use a fake progress interval just to show UI movement
                let simulatedProgress = 0;
                const progressInterval = setInterval(() => {
                    simulatedProgress += 5;
                    if (simulatedProgress < 90) {
                        setJobs(prev => prev.map(j => j.jobId === nextJob.jobId ? { ...j, progress: simulatedProgress } : j));
                    }
                }, 1000);

                const response = await fetch('/api/export-video', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        shaderCode: nextJob.shaderCode,
                        aspectRatio: nextJob.aspectRatio || '16:9',
                        quality: nextJob.quality || 'HD',
                        crf: nextJob.crf || 23,
                        duration: nextJob.duration || 10,
                        fps: nextJob.fps || 30,
                        format: nextJob.format || 'mp4',
                        metadata: nextJob.metadata
                    })
                });

                clearInterval(progressInterval);

                if (!response.ok) {
                    throw new Error('Export failed');
                }

                setJobs(prev => prev.map(j => j.jobId === nextJob.jobId ? { ...j, progress: 95, statusText: 'Downloading...' } : j));

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);

                setJobs(prev => prev.map(j => j.jobId === nextJob.jobId ? {
                    ...j,
                    status: 'completed',
                    progress: 100,
                    statusText: 'Done',
                    videoUrl: url
                } : j));

            } catch (error) {
                console.error("Local export failed:", error);
                setJobs(prev => prev.map(j => j.jobId === nextJob.jobId ? {
                    ...j,
                    status: 'failed',
                    statusText: 'Export Failed'
                } : j));
            }
        };

        processJob();

    }, [jobs]); // Trigger whenever jobs list changes

    // --- FALLBACK SYNC LISTENER (For iOS / Safari without SyncManager) ---
    useEffect(() => {
        const handleOnline = () => {
            // Resume any offline jobs
            setJobs(prev => prev.map(j => (j.status === 'queued-offline') ? {
                ...j,
                status: 'queued',
                statusText: 'Resuming...'
            } : j));
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, []);

    const addJob = (job: ExportJob) => {
        setJobs(prev => [...prev, job]);
    };

    const removeJob = (jobId: string) => {
        setJobs(prev => prev.filter(j => j.jobId !== jobId));
    };

    const updateJob = (jobId: string, updates: Partial<ExportJob>) => {
        setJobs(prev => prev.map(j => j.jobId === jobId ? { ...j, ...updates } : j));
    };

    const clearCompleted = () => {
        setJobs(prev => prev.filter(j => j.status !== 'completed' && j.status !== 'failed'));
    };

    return (
        <DownloadQueueContext.Provider value={{ jobs, addJob, removeJob, updateJob, clearCompleted }}>
            {children}
        </DownloadQueueContext.Provider>
    );
}

export function useDownloadQueue() {
    const context = useContext(DownloadQueueContext);
    if (context === undefined) {
        throw new Error('useDownloadQueue must be used within a DownloadQueueProvider');
    }
    return context;
}
