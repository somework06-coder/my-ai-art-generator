import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface ExportRequest {
    shaderCode: string;
    aspectRatio: '16:9' | '9:16' | '1:1';
    quality: 'HD' | 'FHD' | '4K';
    duration: number;
    fps?: number;
    format?: 'mp4' | 'mov';
}

function getResolution(aspectRatio: string, quality: string): { width: number; height: number } {
    let baseWidth, baseHeight;

    // Base resolution logic (HD 720p base)
    switch (aspectRatio) {
        case '16:9': baseWidth = 1280; baseHeight = 720; break;
        case '9:16': baseWidth = 720; baseHeight = 1280; break;
        case '1:1': baseWidth = 720; baseHeight = 720; break;
        default: baseWidth = 1280; baseHeight = 720;
    }

    // Scale based on quality
    let scale = 1;
    if (quality === 'FHD') scale = 1.5; // 1080p (approx 1920x1080)
    if (quality === '4K') scale = 3;    // 4K (approx 3840x2160)

    return {
        width: Math.round(baseWidth * scale),
        height: Math.round(baseHeight * scale)
    };
}


export async function POST(request: NextRequest) {
    try {
        const body: ExportRequest = await request.json();
        const { shaderCode, aspectRatio = '16:9', quality = 'HD', duration = 5, fps = 30, format = 'mp4' } = body;

        if (!shaderCode) {
            return NextResponse.json({ error: 'Shader code is required' }, { status: 400 });
        }

        // 1. Get User
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. We can deduct credits here if we want to charge for video exports
        // Currently, we'll assume generation costs credits, but export could be free or cost extra.
        // Assuming free for now, or you can add deduct_credits logic here.

        // 3. Create Job in Database
        const settings = { aspectRatio, quality, duration, fps, format };

        const { data: job, error: dbError } = await supabase
            .from('export_jobs')
            .insert({
                user_id: user.id,
                shader_code: shaderCode,
                status: 'pending',
                settings: settings
            })
            .select()
            .single();

        if (dbError || !job) {
            console.error('DB Insert Error:', dbError);
            return NextResponse.json({ error: 'Failed to create export job in database' }, { status: 500 });
        }

        // 4. Enqueue to BullMQ (Redis)
        try {
            const { videoExportQueue } = await import('@/lib/queue');

            // The job data matches what server.js expects
            await videoExportQueue.add('export-job', {
                jobDbId: job.id,
                shaderCode: shaderCode,
                aspectRatio: aspectRatio,
                quality: quality,
                duration: duration,
                fps: fps,
                format: format
            }, {
                // BullMQ options
                attempts: 3,
                backoff: { type: 'exponential', delay: 2000 },
                removeOnComplete: 100, // Keep last 100 jobs
                removeOnFail: 500
            });

            console.log(`Job ${job.id} enqueued successfully.`);

        } catch (queueErr) {
            console.error('Failed to enqueue job:', queueErr);
            // Optionally update DB to 'failed' if queue isn't available
            await supabase.from('export_jobs').update({ status: 'failed', error_msg: 'Queue unavailable' }).eq('id', job.id);
            return NextResponse.json({ error: 'Queue service is currently unavailable. Please try again later.' }, { status: 503 });
        }

        // 5. Return success and Job ID immediately! (No waiting for render)
        return NextResponse.json({ success: true, jobId: job.id });

    } catch (error) {
        console.error('Video export error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Video export failed' },
            { status: 500 }
        );
    }
}
