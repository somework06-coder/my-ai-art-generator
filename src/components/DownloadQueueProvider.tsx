'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { writeFile, mkdir } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';
import { ShaderRenderer } from '@/lib/shaderRenderer';

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
    autoClearOnClose: boolean;
    setAutoClearOnClose: (val: boolean) => void;
};

const DownloadQueueContext = createContext<DownloadQueueContextType | undefined>(undefined);

export function DownloadQueueProvider({ children }: { children: React.ReactNode }) {
    const [jobs, setJobs] = useState<ExportJob[]>([]);
    const [autoClearOnClose, setAutoClearOnClose] = useState<boolean>(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // React state updates are async, so we need a ref to prevent race conditions
    // where multiple jobs start rendering before the first one's state updates
    const isProcessingRef = useRef(false);

    // Initial Load from localStorage
    useEffect(() => {
        const savedAutoClear = localStorage.getItem('mossion_auto_clear');
        if (savedAutoClear === 'true') {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setAutoClearOnClose(true);
        }

        const savedJobs = localStorage.getItem('mossion_download_queue');
        if (savedJobs && savedAutoClear !== 'true') {
            try {
                const parsed = JSON.parse(savedJobs) as ExportJob[];
                // Mark any interrupted jobs as failed so they don't get stuck processing forever
                const validJobs = parsed.map(j =>
                    (j.status === 'processing' || j.status === 'queued')
                        ? { ...j, status: 'failed' as JobStatus, statusText: 'Interrupted by reload' }
                        : j
                );
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setJobs(validJobs);
            } catch (e) {
                console.error("Failed to parse saved download queue");
            }
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLoaded(true);
    }, []);

    // Sync to localStorage
    useEffect(() => {
        if (!isLoaded) return;

        localStorage.setItem('mossion_auto_clear', String(autoClearOnClose));

        if (!autoClearOnClose) {
            localStorage.setItem('mossion_download_queue', JSON.stringify(jobs));
        } else {
            localStorage.removeItem('mossion_download_queue');
        }
    }, [jobs, autoClearOnClose, isLoaded]);

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
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        // If we are already processing one in memory, wait. 
        if (isProcessingRef.current) return;

        // Double check state just in case
        const isProcessingState = jobs.some(j => j.status === 'processing' && j.jobId.startsWith('local-'));
        if (isProcessingState) {
            isProcessingRef.current = true;
            return;
        }

        // Find the next pending local job in the queue
        const nextJob = jobs.find(j => (j.status === 'queued' || j.status === 'queued-offline') && j.jobId.startsWith('local-'));
        if (!nextJob) return;

        // Prevent infinite loops by creating an inner async function
        const processJob = async () => {
            // LOCK immediately
            isProcessingRef.current = true;

            // Immediately mark as processing so the UI updates
            setJobs(prev => prev.map(j => j.jobId === nextJob.jobId ? { ...j, status: 'processing', statusText: `Rendering ${nextJob.quality}...` } : j));

            try {
                // 1. Get OS Temp Directory from Tauri Backend
                const baseTempDir = await invoke<string>('get_temp_dir');
                // Tauri join returns string directly
                const jobTempDir = await join(baseTempDir, `mossion_export_${nextJob.jobId}`);

                // Create directory
                await mkdir(jobTempDir, { recursive: true });

                // 2. Setup Offscreen Canvas & Renderer
                const canvas = document.createElement('canvas');
                const renderer = new ShaderRenderer();

                // Init with requested aspect ratio, but NOT as preview (full res)
                renderer.init(canvas, (nextJob.aspectRatio as '16:9' | '9:16' | '1:1') || '16:9', false, nextJob.quality || '720p');

                // Inject the AI Shader
                if (nextJob.shaderCode) {
                    renderer.loadShader(nextJob.shaderCode);
                }

                // Wait a tiny bit for Shader to compile
                await new Promise(r => setTimeout(r, 500));

                const fps = nextJob.fps || 30;
                const duration = nextJob.duration || 10;
                const totalFrames = Math.floor(duration * fps);

                // 3. Frame Capture Loop
                for (let i = 0; i < totalFrames; i++) {
                    const time = i / fps;
                    // Force render specific time
                    renderer['uniforms'].uTime.value = time;
                    renderer['renderer']?.render(renderer['scene'], renderer['camera']);

                    // Extract JPEG payload from canvas
                    const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
                    // Remove "data:image/jpeg;base64," prefix
                    const base64Data = dataUrl.split(',')[1];
                    const binaryString = atob(base64Data);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let j = 0; j < binaryString.length; j++) {
                        bytes[j] = binaryString.charCodeAt(j);
                    }

                    // Save to Tauri FS
                    const frameName = `frame_${String(i).padStart(5, '0')}.jpg`;
                    const framePath = await join(jobTempDir, frameName);
                    await writeFile(framePath, bytes);

                    // Update UI Progress (0% to 50% for rendering frames)
                    if (i % 5 === 0) {
                        const progress = Math.round((i / totalFrames) * 50);
                        setJobs(prev => prev.map(j => j.jobId === nextJob.jobId ? { ...j, progress, statusText: 'Extracting Frames...' } : j));
                    }
                }

                // Cleanup renderer memory
                renderer.dispose();

                setJobs(prev => prev.map(j => j.jobId === nextJob.jobId ? { ...j, progress: 50, statusText: `Encoding ${nextJob.format ? nextJob.format.toUpperCase() : 'MP4'}...` } : j));

                // 4. Invoke Rust FFmpeg Sidecar
                const formatExt = nextJob.format || 'mp4';
                const outputPath = await join(jobTempDir, `output_${nextJob.jobId}.${formatExt}`);

                let baseW = 1280;
                let baseH = 720;
                const q = nextJob.quality || 'HD';
                const ar = nextJob.aspectRatio || '16:9';

                if (q === 'FHD' || q === '1080p') {
                    baseW = 1920;
                    baseH = 1080;
                } else if (q === '4K') {
                    baseW = 3840;
                    baseH = 2160;
                }

                let finalW = baseW;
                let finalH = baseH;
                if (ar === '9:16') { finalW = baseH; finalH = baseW; }
                else if (ar === '1:1') { finalW = baseH; finalH = baseH; }

                await invoke('export_video', {
                    inputFramesDir: jobTempDir,
                    fps: fps,
                    crf: nextJob.crf || 18,
                    outputPath: outputPath,
                    width: finalW,
                    height: finalH
                });

                // 5. Done! The video is sitting in the temp folder. 
                // We'll pass this absolute path to the DownloadCenter.

                setJobs(prev => prev.map(j => j.jobId === nextJob.jobId ? {
                    ...j,
                    status: 'completed',
                    progress: 100,
                    statusText: 'Done',
                    videoUrl: outputPath // Storing raw local path
                } : j));

            } catch (error) {
                console.error("Local export failed:", error);
                setJobs(prev => prev.map(j => j.jobId === nextJob.jobId ? {
                    ...j,
                    status: 'failed',
                    statusText: 'Export Failed'
                } : j));
            } finally {
                // UNLOCK so the next job can be picked up by the effect
                isProcessingRef.current = false;
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
        <DownloadQueueContext.Provider value={{
            jobs, addJob, removeJob, updateJob, clearCompleted,
            autoClearOnClose, setAutoClearOnClose
        }}>
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
