'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type ExportJob = {
    jobId: string;
    artworkId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number;
    statusText?: string;
    videoUrl?: string;
    format: string;
    thumbnailUrl?: string;
    title?: string;
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
            (j.status === 'pending' || j.status === 'processing') &&
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
